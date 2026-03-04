import { api } from './axios';

export interface Pool {
  chain: string;
  project: string;
  symbol: string;
  name: string;
  tvlUsd: number;
  apy: number;
  apyBase: number | null;
  apyReward: number | null;
  stablecoin: boolean;
  ilRisk: string;
  exposure: string;
  pool: string;
  apyPct1D: number | null;
  apyPct7D: number | null;
  apyPct30D: number | null;
  apyMean30d: number | null;
  predictions: {
    predictedClass: string;
    predictedProbability: number;
    binnedConfidence: number;
  } | null;
  underlyingTokens: string[];
  count: number;
  mu: number | null;
  sigma: number | null;
}

export interface PoolsResponse {
  pools: Pool[];
  stats: {
    total_pools: number;
    total_tvl: number;
    avg_apy: number;
    best_apy: {
      name: string;
      apy: number;
      chain: string;
    } | null;
    highest_tvl: {
      name: string;
      tvlUsd: number;
      chain: string;
    } | null;
  };
  by_chain: {
    [chain: string]: {
      count: number;
      total_tvl: number;
      avg_apy: number;
    };
  };
}

export interface PoolsParams {
  chain?: string;
  min_tvl?: number;
  limit?: number;
}

// Get all pools with optional filters
export const getPools = async (params?: PoolsParams): Promise<PoolsResponse> => {
  const response = await api.get('/pools', { params });
  return response.data;
};

// Get top pools by APY
export const getTopPools = async (params?: { limit?: number; chain?: string }): Promise<PoolsResponse> => {
  const response = await api.get('/pools/top', { params });
  return response.data;
};

// Get available chains
export const getPoolChains = async (): Promise<{ chains: string[] }> => {
  const response = await api.get('/pools/chains');
  return response.data;
};

// Get pool details by ID
export const getPoolDetails = async (poolId: string): Promise<{ pool: Pool }> => {
  const response = await api.get(`/pools/${poolId}`);
  return response.data;
};

// React Query hooks
export const poolsKeys = {
  all: ['pools'] as const,
  lists: () => [...poolsKeys.all, 'list'] as const,
  list: (params: PoolsParams = {}) => [...poolsKeys.lists(), params] as const,
  top: (params: { limit?: number; chain?: string } = {}) => [...poolsKeys.all, 'top', params] as const,
  chains: () => [...poolsKeys.all, 'chains'] as const,
  details: (poolId: string) => [...poolsKeys.all, 'detail', poolId] as const,
};
