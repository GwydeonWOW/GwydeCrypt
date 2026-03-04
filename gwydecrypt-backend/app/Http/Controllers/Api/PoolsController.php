<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Repositories\PoolRepository;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PoolsController extends Controller
{
    private PoolRepository $repository;

    public function __construct(PoolRepository $repository)
    {
        $this->repository = $repository;
    }

    /**
     * Get yield pools from database (with pagination).
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $filters = [
                'chain' => $request->get('chain'),
                'min_tvl' => $request->get('min_tvl', 0),
                'min_apy' => $request->get('min_apy'),
                'stablecoin_only' => $request->boolean('stablecoin_only', false),
                'sort_by' => $request->get('sort_by', 'tvl_usd'),
                'sort_order' => $request->get('sort_order', 'desc'),
                'limit' => min($request->get('limit', 50), 100), // Max 100
                'with_details' => $request->boolean('with_details', false), // Don't load assets/rewards by default
            ];

            // Get paginated pools
            $paginator = $this->repository->getFilteredPools($filters);

            // Transform pools to response format
            $pools = collect($paginator->items())->map(function ($pool) {
                $data = [
                    'id' => $pool->id,
                    'chain' => $pool->chain_name,
                    'chain_id' => $pool->chain_id,
                    'project' => $pool->protocol_name,
                    'symbol' => $pool->pool_symbol,
                    'name' => $pool->name,
                    'tvlUsd' => (float) $pool->tvl_usd,
                    'apy' => (float) $pool->apy,
                    'apyBase' => (float) $pool->apy_base,
                    'apyReward' => (float) $pool->apy_reward,
                    'stablecoin' => $pool->is_stablecoin,
                    'ilRisk' => $pool->il_risk,
                    'exposure' => $pool->exposure,
                    'pool' => $pool->pool_address,
                    'pool_metadata' => [
                        'farm_address' => $pool->farm_address,
                        'farm_type' => $pool->farm_type,
                        'pool_symbol' => $pool->pool_symbol,
                        'pool_is_stable' => $pool->pool_is_stable,
                        'pool_fee' => $pool->pool_fee,
                        'protocol_url' => $pool->protocol_url,
                    ],
                    'is_killed' => $pool->is_killed,
                    'timestamp_utc' => $pool->vfat_synced_at?->toIso8601String(),
                ];

                // Only include assets if loaded
                if ($pool->relationLoaded('assets') && $pool->assets) {
                    $data['underlyingTokens'] = $pool->assets->pluck('token_address')->toArray();
                    $data['underlying_assets'] = $pool->assets->map(fn ($asset) => [
                        'address' => $asset->token_address,
                        'symbol' => $asset->token_symbol,
                        'name' => $asset->token_name,
                        'decimals' => $asset->token_decimals,
                        'reserve' => $asset->reserve,
                        'price' => (float) $asset->price,
                        'liquidity' => (float) $asset->liquidity,
                        'monthlySwapFees' => $asset->monthly_swap_fees,
                    ])->toArray();
                }

                // Only include rewards if loaded
                if ($pool->relationLoaded('rewards') && $pool->rewards) {
                    $data['rewards'] = $pool->rewards->map(fn ($reward) => [
                        'rewardToken' => [
                            'address' => $reward->reward_token_address,
                            'symbol' => $reward->reward_token_symbol,
                            'name' => $reward->reward_token_name,
                            'decimals' => $reward->reward_token_decimals,
                            'price' => (float) $reward->reward_token_price,
                        ],
                        'rewardsPerSecond' => $reward->rewards_per_second,
                    ])->toArray();
                    $data['reward_tokens'] = $pool->rewards->pluck('reward_token_address')->toArray();
                }

                return $data;
            })->toArray();

            // Get statistics
            $stats = $this->repository->getStatistics();

            return response()->json([
                'pools' => $pools,
                'pagination' => [
                    'total' => $paginator->total(),
                    'per_page' => $paginator->perPage(),
                    'current_page' => $paginator->currentPage(),
                    'last_page' => $paginator->lastPage(),
                    'from' => $paginator->firstItem(),
                    'to' => $paginator->lastItem(),
                ],
                'stats' => $stats,
                'data_source' => 'vfat.io (database)',
                'last_sync' => $this->getLastSyncTime(),
            ]);
        } catch (\Exception $e) {
            \Log::error('Pools controller error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);
            return response()->json([
                'data' => [],
                'stats' => [
                    'total_pools' => 0,
                    'total_tvl' => 0,
                    'avg_apy' => 0,
                ],
                'error' => 'Failed to fetch pools: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get pool details by pool address.
     */
    public function show(string $poolAddress): JsonResponse
    {
        try {
            $pool = $this->repository->findByAddress($poolAddress);

            if (!$pool) {
                return response()->json([
                    'error' => 'Pool not found',
                ], 404);
            }

            return response()->json([
                'data' => [
                    'id' => $pool->id,
                    'chain' => $pool->chain_name,
                    'project' => $pool->protocol_name,
                    'symbol' => $pool->pool_symbol,
                    'name' => $pool->name,
                    'tvlUsd' => (float) $pool->tvl_usd,
                    'apy' => (float) $pool->apy,
                    'pool' => $pool->pool_address,
                    'assets' => $pool->assets,
                    'rewards' => $pool->rewards,
                ],
            ]);
        } catch (\Exception $e) {
            \Log::error('Pool show error: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to fetch pool details',
            ], 500);
        }
    }

    /**
     * Get available chains.
     */
    public function chains(): JsonResponse
    {
        try {
            $chains = $this->repository->getAvailableChains();

            return response()->json([
                'chains' => $chains,
            ]);
        } catch (\Exception $e) {
            \Log::error('Pools chains error: ' . $e->getMessage());
            return response()->json([
                'chains' => [],
                'error' => 'Failed to fetch chains',
            ], 500);
        }
    }

    /**
     * Get top pools by APY.
     */
    public function topByApy(Request $request): JsonResponse
    {
        try {
            $limit = min($request->get('limit', 20), 100);
            $pools = $this->repository->getTopPoolsByApy($limit);

            $data = $pools->map(function ($pool) {
                return [
                    'id' => $pool->id,
                    'chain' => $pool->chain_name,
                    'project' => $pool->protocol_name,
                    'symbol' => $pool->pool_symbol,
                    'name' => $pool->name,
                    'tvlUsd' => (float) $pool->tvl_usd,
                    'apy' => (float) $pool->apy,
                    'pool' => $pool->pool_address,
                ];
            })->toArray();

            return response()->json([
                'data' => $data,
                'stats' => [
                    'total_pools' => count($data),
                    'total_tvl' => array_sum(array_column($data, 'tvlUsd')),
                    'avg_apy' => count($data) > 0
                        ? round(array_sum(array_column($data, 'apy')) / count($data), 2)
                        : 0,
                ],
                'data_source' => 'vfat.io (database)',
            ]);
        } catch (\Exception $e) {
            \Log::error('Top APY error: ' . $e->getMessage());
            return response()->json([
                'data' => [],
                'error' => 'Failed to fetch top pools',
            ], 500);
        }
    }

    /**
     * Get last sync time.
     */
    protected function getLastSyncTime(): ?string
    {
        $latestPool = \App\Models\Pool::orderByDesc('vfat_synced_at')->first();
        return $latestPool?->vfat_synced_at?->toIso8601String();
    }
}
