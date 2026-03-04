/**
 * Application Constants
 * Centralized configuration values
 */

export const APP_NAME = 'GwydeCrypt';

export const APP_DESCRIPTION = 'Multi-Chain Crypto Portfolio Tracker';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Supported blockchain networks
export const SUPPORTED_CHAINS = {
  ETH: 'eth',
  SOL: 'sol',
  POLYGON: 'polygon',
  SUI: 'sui',
  BASE: 'base',
  OPTIMISM: 'op',
  BNB: 'bnb',
  BTC: 'btc',
  ARBITRUM: 'arb',
  LINEA: 'linea',
  COMMODITIES: 'commodities',
  FIAT: 'fiat'
} as const;

export type SupportedChain = typeof SUPPORTED_CHAINS[keyof typeof SUPPORTED_CHAINS];

// Chain display names
export const CHAIN_DISPLAY_NAMES: Record<SupportedChain, string> = {
  eth: 'Ethereum',
  sol: 'Solana',
  polygon: 'Polygon',
  sui: 'SUI',
  base: 'Base',
  op: 'Optimism',
  bnb: 'BNB Chain',
  btc: 'Bitcoin',
  arb: 'Arbitrum',
  linea: 'Linea',
  commodities: 'Metales Preciosos',
  fiat: 'Monedas Fiat'
};

// Chain colors
export const CHAIN_COLORS: Record<SupportedChain, string> = {
  eth: '#627EEA',
  sol: '#14F195',
  polygon: '#8247E5',
  sui: '#4DA2FF',
  base: '#0052FF',
  op: '#FF0420',
  bnb: '#F3BA2F',
  btc: '#F7931A',
  arb: '#28A0F0', // Arbitrum blue
  linea: '#66E5BF',
  commodities: '#D4AF37', // Gold color
  fiat: '#10B981' // Emerald green
};

// Chain badge colors for Mantine Badge component
export const CHAIN_BADGE_COLORS: Record<SupportedChain, string> = {
  eth: 'blue',
  sol: 'grape',
  polygon: 'cyan',
  sui: 'blue',
  base: 'indigo',
  op: 'red',
  bnb: 'yellow',
  btc: 'orange',
  arb: 'sky',
  linea: 'lime',
  commodities: 'amber',
  fiat: 'teal'
};

// Chain options for Select components
export const CHAIN_OPTIONS = Object.entries(CHAIN_DISPLAY_NAMES).map(([value, label]) => ({
  value,
  label
}));

// Refresh intervals in milliseconds
export const REFRESH_INTERVALS = {
  '5m': 5 * 60 * 1000,
  '15m': 15 * 60 * 1000,
  '30m': 30 * 60 * 1000,
  '1h': 60 * 60 * 1000
} as const;

export type RefreshInterval = keyof typeof REFRESH_INTERVALS;

// Period options
export const PERIOD_OPTIONS = [
  { value: '1d', label: '24h' },
  { value: '3d', label: '3d' },
  { value: '1w', label: '1w' },
  { value: '1m', label: '1m' },
  { value: '3m', label: '3m' },
  { value: '6m', label: '6m' },
  { value: '1y', label: '1y' },
  { value: 'all', label: 'All' }
] as const;

export type PeriodType = typeof PERIOD_OPTIONS[number]['value'];

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

// Number formatting
export const CURRENCY_DECIMALS = 2;
export const CRYPTO_DECIMALS = 6;
export const PERCENTAGE_DECIMALS = 2;

// Local storage keys
export const STORAGE_KEYS = {
  AUTO_REFRESH: 'auto-refresh-storage',
  DASHBOARD_PERIOD: 'dashboard-period',
  PORTFOLIO_PERIOD: 'portfolio-period',
  PRIVACY_MODE: 'privacy-mode'
} as const;

// Error messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'Unauthorized. Please login again.',
  SERVER_ERROR: 'Server error. Please try again later.',
  NOT_FOUND: 'Resource not found.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  UNKNOWN_ERROR: 'An unexpected error occurred.'
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  WALLET_ADDED: 'Wallet added successfully',
  WALLET_UPDATED: 'Wallet updated successfully',
  WALLET_DELETED: 'Wallet deleted successfully',
  USER_APPROVED: 'User approved successfully',
  USER_REJECTED: 'User rejected successfully',
  SETTINGS_SAVED: 'Settings saved successfully'
} as const;
