/**
 * Security and Validation Utilities
 * Provides XSS protection and input validation for the application
 */

/**
 * Sanitize HTML to prevent XSS attacks
 * Removes dangerous tags and attributes while preserving safe HTML
 */
export function sanitizeHTML(html: string): string {
  const dangerousTags = [
    'script', 'iframe', 'object', 'embed', 'form', 'input', 'button',
    'textarea', 'select', 'option', 'link', 'style', 'meta'
  ];

  const dangerousAttributes = [
    'onload', 'onerror', 'onclick', 'onmouseover', 'onfocus', 'onblur',
    'onkeydown', 'onkeyup', 'onsubmit', 'onreset', 'onchange', 'javascript:',
    'data:', 'vbscript:', 'file://', 'about:'
  ];

  let sanitized = html;

  // Remove dangerous tags
  dangerousTags.forEach(tag => {
    const regex = new RegExp(`<${tag}[^>]*>.*?</${tag}>`, 'gis');
    sanitized = sanitized.replace(regex, '');
  });

  // Remove dangerous attributes
  dangerousAttributes.forEach(attr => {
    const regex = new RegExp(`\\s${attr}\\s*=\\s*["'][^"']*["']`, 'gis');
    sanitized = sanitized.replace(regex, '');
  });

  // Remove javascript: and data: protocols in href/src
  sanitized = sanitized.replace(/\s(href|src|action)=\s*["']\s*(javascript:|data:|vbscript:)/gi, ' $1="#"');

  return sanitized;
}

/**
 * Escape HTML special characters to prevent XSS
 */
export function escapeHTML(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  };

  return text.replace(/[&<>"'/]/g, char => map[char]);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate wallet address format based on chain
 */
export function isValidWalletAddress(address: string, chain: 'eth' | 'sol' | 'polygon' | 'sui' | 'arb' | 'base' | 'op' | 'bnb'): boolean {
  if (!address || address.length === 0) return false;

  switch (chain) {
    case 'eth':
    case 'polygon':
    case 'base':
    case 'op':
    case 'arb':
    case 'bnb':
      // EVM chains: 0x followed by 40 hex characters
      return /^0x[a-fA-F0-9]{40}$/.test(address);
    case 'sol':
      // Solana: Base58 encoded, typically 32-44 characters
      return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
    case 'sui':
      // Sui: 0x followed by 40+ hex characters
      return /^0x[a-fA-F0-9]{40,}$/.test(address);
    default:
      return false;
  }
}

/**
 * Validate URL format
 */
export function isValidURL(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Sanitize user input to prevent script injection
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
}

/**
 * Validate numeric string
 */
export function isNumeric(value: string): boolean {
  return !isNaN(parseFloat(value)) && isFinite(parseFloat(value));
}

/**
 * Truncate text to specified length
 */
export function truncateText(text: string, maxLength: number, suffix: string = '...'): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Validate password strength
 */
export interface PasswordStrength {
  isValid: boolean;
  strength: 'weak' | 'medium' | 'strong';
  errors: string[];
}

export function validatePassword(password: string): PasswordStrength {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  const strength: PasswordStrength['strength'] =
    errors.length >= 3 ? 'weak' :
    errors.length === 0 ? 'strong' : 'medium';

  return {
    isValid: errors.length === 0,
    strength,
    errors
  };
}

/**
 * Sanitize filename to prevent path traversal
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[\/\\]/g, '_')  // Replace path separators
    .replace(/\.\./g, '')      // Remove parent directory references
    .replace(/[<>:"|?*]/g, '') // Remove invalid characters
    .substring(0, 255);        // Limit length
}

/**
 * Validate crypto amount (positive number with optional decimals)
 */
export function isValidCryptoAmount(amount: string): boolean {
  return /^\d+(\.\d{1,18})?$/.test(amount);
}

/**
 * Format and validate token symbol
 */
export function isValidTokenSymbol(symbol: string): boolean {
  return /^[A-Z0-9]{2,10}$/.test(symbol);
}
