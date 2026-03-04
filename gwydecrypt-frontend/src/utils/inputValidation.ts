/**
 * Input Validation Utilities
 * Centralized validation rules for form inputs
 */

import {
  isValidEmail,
  isValidWalletAddress,
  isValidURL,
  validatePassword,
  isValidTokenSymbol
} from './validation';

export interface ValidationRule {
  validate: (value: string) => boolean;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Email validation rule
 */
export const emailValidation: ValidationRule = {
  validate: isValidEmail,
  message: 'Please enter a valid email address'
};

/**
 * Password validation rule
 */
export const passwordValidation: ValidationRule = {
  validate: (password: string) => validatePassword(password).isValid,
  message: 'Password must be at least 8 characters with uppercase, lowercase, and numbers'
};

/**
 * Wallet address validation rule generator
 */
export function walletAddressValidation(chain: 'eth' | 'sol' | 'polygon' | 'sui' | 'arb' | 'base' | 'op' | 'bnb'): ValidationRule {
  return {
    validate: (address: string) => isValidWalletAddress(address, chain),
    message: `Please enter a valid ${chain.toUpperCase()} wallet address`
  };
}

/**
 * URL validation rule
 */
export const urlValidation: ValidationRule = {
  validate: isValidURL,
  message: 'Please enter a valid URL (http:// or https://)'
};

/**
 * Token symbol validation rule
 */
export const tokenSymbolValidation: ValidationRule = {
  validate: isValidTokenSymbol,
  message: 'Token symbol must be 2-10 uppercase letters or numbers'
};

/**
 * Required field validation rule
 */
export function requiredValidation(fieldName: string = 'This field'): ValidationRule {
  return {
    validate: (value: string) => value.trim().length > 0,
    message: `${fieldName} is required`
  };
}

/**
 * Min length validation rule generator
 */
export function minLengthValidation(min: number, fieldName: string = 'Value'): ValidationRule {
  return {
    validate: (value: string) => value.length >= min,
    message: `${fieldName} must be at least ${min} characters`
  };
}

/**
 * Max length validation rule generator
 */
export function maxLengthValidation(max: number, fieldName: string = 'Value'): ValidationRule {
  return {
    validate: (value: string) => value.length <= max,
    message: `${fieldName} must not exceed ${max} characters`
  };
}

/**
 * Pattern validation rule generator
 */
export function patternValidation(pattern: RegExp, message: string): ValidationRule {
  return {
    validate: (value: string) => pattern.test(value),
    message
  };
}

/**
 * Validate a value against multiple rules
 */
export function validateAgainstRules(value: string, rules: ValidationRule[]): ValidationResult {
  const errors: string[] = [];

  for (const rule of rules) {
    if (!rule.validate(value)) {
      errors.push(rule.message);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Common validation presets
 */
export const validationPresets = {
  email: [emailValidation, requiredValidation('Email')],
  password: [passwordValidation, requiredValidation('Password')],
  name: [
    requiredValidation('Name'),
    minLengthValidation(2, 'Name'),
    maxLengthValidation(50, 'Name')
  ],
  ethereumAddress: [
    requiredValidation('Wallet address'),
    walletAddressValidation('eth')
  ],
  solanaAddress: [
    requiredValidation('Wallet address'),
    walletAddressValidation('sol')
  ],
  polygonAddress: [
    requiredValidation('Wallet address'),
    walletAddressValidation('polygon')
  ],
  suiAddress: [
    requiredValidation('Wallet address'),
    walletAddressValidation('sui')
  ],
  tokenSymbol: [
    requiredValidation('Token symbol'),
    tokenSymbolValidation
  ],
  contractAddress: [
    requiredValidation('Contract address'),
    patternValidation(/^0x[a-fA-F0-9]{40}$/, 'Invalid contract address format')
  ]
};
