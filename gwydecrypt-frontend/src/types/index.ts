export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  is_approved: boolean;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  address: string;
  chain: 'eth' | 'sol' | 'polygon' | 'sui';
  label?: string;
  is_active: boolean;
  last_synced_at?: string;
  total_value?: number;
  created_at: string;
  updated_at: string;
}

export interface Token {
  id: string;
  symbol: string;
  name: string;
  chain: 'eth' | 'sol' | 'polygon' | 'sui';
  contract_address?: string;
  decimals: number;
  logo_url?: string;
  is_popular: boolean;
}

export interface Portfolio {
  total_value_usd: number;
  total_value_change_24h?: number;
  wallet_count: number;
  token_count: number;
  chains: string[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface CreateWalletRequest {
  address: string;
  chain: 'eth' | 'sol' | 'polygon' | 'sui';
  label?: string;
}

export interface TokenBalance {
  token_id: string;
  wallet_address: string;
  balance: string;
  value_usd: number;
  price_usd: number;
  last_updated: string;
  token: Token;
}

export interface Pool {
  id: string;
  chain: 'eth' | 'sol' | 'polygon' | 'sui';
  pool_address: string;
  name: string;
  tokens: string[];
  tvl_usd: number;
  apy?: number;
  user_staked_usd?: number;
}

export interface NewsItem {
  id: string;
  title: string;
  description: string;
  url: string;
  source: string;
  published_at: string;
  image_url?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
}

export interface PortfolioSnapshot {
  id: string;
  user_id: string;
  total_value_usd: number;
  snapshot_at: string;
  created_at: string;
}

export type PeriodType = '1d' | '3d' | '1w' | '1m' | '3m' | '6m' | '1y' | 'all';

export type ChainType = 'eth' | 'sol' | 'polygon' | 'sui' | 'base' | 'op' | 'bnb' | 'btc' | 'arb' | 'linea' | 'fiat' | 'commodities';

export type RefreshInterval = 'off' | '5m' | '15m' | '30m' | '1h';
