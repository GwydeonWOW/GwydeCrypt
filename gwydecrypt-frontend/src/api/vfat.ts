import { api } from './axios';

export interface PoolPosition {
  id: number;
  wallet_address: string;
  pool: {
    id: number;
    name: string;
    protocol: string;
    chain: string;
    chain_id: number;
    pool_address: string;
    farm_address: string | null;
    farm_type: string | null;
    pool_type: string;
    tvl_usd: number;
    apy: number;
    apy_base: number;
    apy_reward: number;
  };
  user_balance: string;
  user_balance_usd: number;
  pool_share: number;
  user_tokens: Array<{
    symbol: string;
    amount: string;
    value_usd: number;
  }>;
  pending_rewards: Array<{
    symbol: string;
    amount: string;
    value_usd: number;
  }>;
  tick_low: number | null;
  tick_up: number | null;
  current_tick: number | null;
  in_range: boolean | null;
  position_since: string | null;
  age_in_days: number | null;
  last_action: string | null;
  last_synced_at: string;
}

export interface UserPositionsResponse {
  positions: PoolPosition[];
  positions_by_wallet: {
    [walletAddress: string]: {
      count: number;
      total_value_usd: number;
    };
  };
  stats: {
    total_positions: number;
    total_value_usd: number;
    wallets_checked: number;
    wallets_with_positions: number;
  };
  last_sync_at: string;
  data_source: string;
}

// Get user positions from pools
export const getUserPoolPositions = async (): Promise<UserPositionsResponse> => {
  const response = await api.get('/vfat/user/positions');
  return response.data;
};

// Sync user positions from vfat.io
export const syncUserPoolPositions = async (): Promise<{
  message: string;
  total_synced: number;
  wallets_synced: number;
  results: any;
  synced_at: string;
}> => {
  const response = await api.post('/vfat/user/positions/sync');
  return response.data;
};

// React Query keys
export const vfatKeys = {
  all: ['vfat'] as const,
  positions: () => [...vfatKeys.all, 'positions'] as const,
  closedPositions: () => [...vfatKeys.all, 'closed-positions'] as const,
  sync: () => [...vfatKeys.all, 'sync'] as const,
  syncClosed: () => [...vfatKeys.all, 'sync-closed'] as const,
};

// Closed Position interface
export interface ClosedPosition {
  id: number;
  wallet_address: string;
  pool: {
    id: number;
    name: string;
    protocol: string;
    chain: string;
    chain_id: number;
    pool_address: string;
    farm_address: string | null;
  };
  token_id: string;
  original_token_id: string | null;
  nft_id_chain: string[] | null;
  oldest_action_timestamp: string | null;
  closed_timestamp: string | null;
  age_in_days: number | null;
  realized_pnl_usd: number;
  initial_balance_usd: number;
  total_pnl_usd: number;
  roi: number;
  underlying: Array<{
    symbol: string;
    name: string;
    address: string;
    balance: string;
    price: number;
  }> | null;
  last_action: string | null;
  is_migrated: boolean;
  chain_length: number;
}

export interface ClosedPositionsResponse {
  positions: ClosedPosition[];
  stats: {
    total_positions: number;
    total_pnl_usd: number;
    total_initial_usd: number;
    avg_roi: number;
    profitable_count: number;
    unprofitable_count: number;
  };
  data_source: string;
}

// Get user closed positions
export const getClosedPositions = async (params?: {
  pool_id?: number;
  chain_id?: number;
  sort_by?: string;
  sort_order?: string;
}): Promise<ClosedPositionsResponse> => {
  const response = await api.get('/vfat/closed-positions', { params });
  return response.data;
};

// Sync closed positions from vfat.io
export const syncClosedPositions = async (): Promise<{
  message: string;
  total_synced: number;
  wallets_synced: number;
  results: any;
  synced_at: string;
}> => {
  const response = await api.post('/vfat/closed-positions/sync');
  return response.data;
};

