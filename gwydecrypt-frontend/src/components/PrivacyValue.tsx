import React from 'react';
import { usePrivacyStore } from '../store/privacyStore';
import { formatCurrency } from '../utils';

interface PrivacyValueProps {
  value: number | string;
  showCurrency?: boolean;
  className?: string;
}

export const PrivacyValue: React.FC<PrivacyValueProps> = ({ value, showCurrency = true, className }) => {
  const { hideValues } = usePrivacyStore();

  if (hideValues) {
    return (
      <span className={className}>
        {showCurrency && '$'}••••••
      </span>
    );
  }

  const numValue = typeof value === 'number' ? value : parseFloat(value);

  return (
    <span className={className}>
      {showCurrency ? formatCurrency(numValue) : formatCurrency(numValue).replace('$', '')}
    </span>
  );
};
