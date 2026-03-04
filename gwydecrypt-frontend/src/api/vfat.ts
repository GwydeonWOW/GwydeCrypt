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
  sync: () => [...vfatKeys.all, 'sync'] as const,
};
