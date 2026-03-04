/**
 * Custom hook for form validation with enhanced security
 */

import { useCallback, useState } from 'react';
import { validateAgainstRules, ValidationResult, ValidationRule } from '../utils/inputValidation';

interface UseFormValidationProps<T> {
  initialValues: T;
  validationRules: Partial<Record<keyof T, ValidationRule[]>>;
  onSubmit: (values: T) => Promise<void> | void;
}

export function useFormValidation<T extends Record<string, any>>({
  initialValues,
  validationRules,
  onSubmit
}: UseFormValidationProps<T>) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateField = useCallback((field: keyof T, value: string): boolean => {
    const rules = validationRules[field];
    if (!rules || rules.length === 0) return true;

    const result: ValidationResult = validateAgainstRules(value, rules);

    setErrors(prev => ({
      ...prev,
      [field]: result.errors[0] || ''
    }));

    return result.isValid;
  }, [validationRules]);

  const validateAll = useCallback((): boolean => {
    let isValid = true;

    const newErrors: Partial<Record<keyof T, string>> = {};

    (Object.keys(validationRules) as Array<keyof T>).forEach(field => {
      const rules = validationRules[field];
      if (!rules) return;

      const result = validateAgainstRules(String(values[field]), rules);

      if (!result.isValid) {
        isValid = false;
        newErrors[field] = result.errors[0] || '';
      }
    });

    setErrors(newErrors);
    setTouched(
      Object.keys(validationRules).reduce((acc, key) => ({
        ...acc,
        [key]: true
      }), {})
    );

    return isValid;
  }, [values, validationRules]);

  const handleChange = useCallback((field: keyof T, value: string) => {
    setValues(prev => ({ ...prev, [field]: value }));

    if (touched[field]) {
      validateField(field, value);
    }
  }, [touched, validateField]);

  const handleBlur = useCallback((field: keyof T) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    validateField(field, String(values[field]));
  }, [values, validateField]);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();

    const isValid = validateAll();

    if (!isValid) {
      return false;
    }

    setIsSubmitting(true);

    try {
      await onSubmit(values);
      return true;
    } catch (error) {
      console.error('Form submission error:', error);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [values, validateAll, onSubmit]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    validateField,
    validateAll,
    reset,
    setValues
  };
}
