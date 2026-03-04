<?php

namespace App\Http\Controllers\Api;

use App\Models\Pool;
use App\Models\UserPosition;
use App\Repositories\PoolRepository;
use App\Services\VfatUserPositionsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Routing\Controller as BaseController;

class VfatController extends BaseController
{
    private PoolRepository $repository;
    private VfatUserPositionsService $positionsService;

    public function __construct(
        PoolRepository $repository,
        VfatUserPositionsService $positionsService
    ) {
        $this->repository = $repository;
        $this->positionsService = $positionsService;
    }

    /**
     * Get FARMS ONLY (pools con rewards) - Compatible con vfat.io
     * GET /api/vfat/farms
     */
    public function farms(Request $request): JsonResponse
    {
        try {
            // Forzar filtro de farms only
            $request->merge(['pool_type' => 'farm']);

            // Get pools con el filtro aplicado
            $filters = [
                'chain' => $request->get('chain'),
                'min_tvl' => $request->get('min_tvl', 10000), // $10k default para farms
                'min_apy' => $request->get('min_apy'),
                'stablecoin_only' => $request->boolean('stablecoin_only', false),
                'pool_type' => 'farm', // Solo farms
                'sort_by' => $request->get('sort_by', 'tvl_usd'),
                'sort_order' => $request->get('sort_order', 'desc'),
                'limit' => min($request->get('limit', 20), 50), // Max 50 para evitar memory issues
                'with_details' => $request->boolean('with_details', false), // No cargar assets/rewards por defecto
            ];

            $paginator = $this->repository->getFilteredPools($filters);

            // Transformar a formato vfat.io compatible
            $farms = collect($paginator->items())->map(function ($pool) {
                $data = [
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
                    'pool_type' => 'farm', // Siempre farm en este endpoint
                ];

                // Solo incluir assets/rewards si se cargaron explícitamente
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

            return response()->json([
                'data' => $farms,
                'pagination' => [
                    'total' => $paginator->total(),
                    'per_page' => $paginator->perPage(),
                    'current_page' => $paginator->currentPage(),
                    'last_page' => $paginator->lastPage(),
                ],
                'stats' => [
                    'total_farms' => $paginator->total(),
                    'total_tvl' => collect($farms)->sum('tvlUsd'),
                ],
                'data_source' => 'vfat.io (database)',
                'filter' => 'farms_only',
            ]);
        } catch (\Exception $e) {
            Log::error('VFAT farms API error', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'data' => [],
                'error' => 'Failed to fetch farms: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get POOLS (todos o solo los sin rewards según parámetro)
     * GET /api/vfat/pools
     */
    public function pools(Request $request): JsonResponse
    {
        try {
            $onlySimplePools = $request->boolean('simple_only', false);

            $filters = [
                'chain' => $request->get('chain'),
                'min_tvl' => $request->get('min_tvl', 1000), // $1k default para pools
                'min_apy' => $request->get('min_apy'),
                'stablecoin_only' => $request->boolean('stablecoin_only', false),
                'pool_type' => $onlySimplePools ? 'pool' : null, // null = todos
                'sort_by' => $request->get('sort_by', 'tvl_usd'),
                'sort_order' => $request->get('sort_order', 'desc'),
                'limit' => min($request->get('limit', 20), 50), // Max 50
                'with_details' => $request->boolean('with_details', false),
            ];

            $paginator = $this->repository->getFilteredPools($filters);

            // Transformar a formato vfat.io compatible
            $pools = collect($paginator->items())->map(function ($pool) {
                $data = [
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
                    'is_killed' => $pool->is_killed,
                    'timestamp_utc' => $pool->vfat_synced_at?->toIso8601String(),
                    'pool_type' => $pool->pool_type ?? 'pool',
                ];

                // Solo incluir assets si se cargaron explícitamente
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

                // Solo incluir rewards si se cargaron explícitamente
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
                }

                return $data;
            })->toArray();

            return response()->json([
                'data' => $pools,
                'pagination' => [
                    'total' => $paginator->total(),
                    'per_page' => $paginator->perPage(),
                    'current_page' => $paginator->currentPage(),
                    'last_page' => $paginator->lastPage(),
                ],
                'stats' => [
                    'total_pools' => $paginator->total(),
                ],
                'data_source' => 'vfat.io (database)',
                'filter' => $onlySimplePools ? 'simple_pools_only' : 'all_pools',
            ]);
        } catch (\Exception $e) {
            Log::error('VFAT pools API error', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'data' => [],
                'error' => 'Failed to fetch pools: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get yield (alias de farms para compatibilidad vfat.io)
     * GET /api/vfat/yield
     */
    public function yield(Request $request): JsonResponse
    {
        return $this->farms($request);
    }

    /**
     * Get user positions
     * GET /api/vfat/user/positions
     */
    public function userPositions(Request $request): JsonResponse
    {
        try {
            // Obtener usuario autenticado
            $user = Auth::user();

            if (!$user) {
                return response()->json([
                    'error' => 'Unauthorized',
                ], 401);
            }

            // Obtener todas las wallets activas del usuario
            $wallets = $user->wallets()->where('is_active', new \Illuminate\Database\Query\Expression('TRUE'))->pluck('address');

            if ($wallets->isEmpty()) {
                return response()->json([
                    'positions' => [],
                    'stats' => [
                        'total_positions' => 0,
                        'total_value_usd' => 0,
                        'wallets_checked' => 0,
                    ],
                    'message' => 'No active wallets found for this user',
                ]);
            }

            // Obtener posiciones para todas las wallets del usuario
            $positions = UserPosition::forUser($user->id)
                ->with('pool')
                ->whereHas('pool', fn ($q) => $q->where('is_active', new \Illuminate\Database\Query\Expression('TRUE'))->where('is_killed', new \Illuminate\Database\Query\Expression('FALSE')))
                ->recentlySynced(30) // Solo posiciones sincronizados en los últimos 30 min
                ->get();

            // Formatear respuesta
            $formattedPositions = $positions->map(function ($position) {
                return [
                    'id' => $position->id,
                    'wallet_address' => $position->wallet_address,
                    'pool' => [
                        'id' => $position->pool->id,
                        'name' => $position->pool->name,
                        'protocol' => $position->pool->protocol_name,
                        'chain' => $position->pool->chain_name,
                        'chain_id' => $position->pool->chain_id,
                        'pool_address' => $position->pool->pool_address,
                        'farm_address' => $position->pool->farm_address,
                        'farm_type' => $position->pool->farm_type,
                        'pool_type' => $position->pool->pool_type,
                        'tvl_usd' => (float) $position->pool->tvl_usd,
                        'apy' => (float) $position->pool->apy,
                        'apy_base' => (float) $position->pool->apy_base,
                        'apy_reward' => (float) $position->pool->apy_reward,
                    ],
                    'user_balance' => $position->user_balance,
                    'user_balance_usd' => (float) $position->user_balance_usd,
                    'pool_share' => (float) $position->pool_share,
                    'user_tokens' => $position->user_tokens ?? [],
                    'pending_rewards' => $position->pending_rewards ?? [],
                    'last_synced_at' => $position->last_synced_at?->toIso8601String(),
                ];
            });

            // Agrupar posiciones por wallet
            $positionsByWallet = $formattedPositions->groupBy('wallet_address');

            // Obtener estadísticas
            $totalValue = 0;
            foreach ($positions as $position) {
                $totalValue += (float) $position->user_balance_usd;
            }

            return response()->json([
                'positions' => $formattedPositions,
                'positions_by_wallet' => $positionsByWallet->map(function ($pos) {
                    return [
                        'count' => $pos->count(),
                        'total_value_usd' => $pos->sum('user_balance_usd'),
                    ];
                }),
                'stats' => [
                    'total_positions' => $positions->count(),
                    'total_value_usd' => $totalValue,
                    'wallets_checked' => $wallets->count(),
                    'wallets_with_positions' => $positionsByWallet->count(),
                ],
                'last_sync_at' => $positions->max('last_synced_at')?->toIso8601String(),
                'data_source' => 'vfat.io (open-positions-v2)',
            ]);
        } catch (\Exception $e) {
            Log::error('VFAT user positions error', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'positions' => [],
                'stats' => [
                    'total_positions' => 0,
                    'total_value_usd' => 0,
                ],
                'error' => 'Failed to fetch positions: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Sync user positions
     * POST /api/vfat/user/positions/sync
     */
    public function syncUserPositions(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();

            if (!$user) {
                return response()->json([
                    'error' => 'Unauthorized',
                ], 401);
            }

            // Obtener todas las wallets activas del usuario
            $wallets = $user->wallets()->where('is_active', new \Illuminate\Database\Query\Expression('TRUE'))->get();

            if ($wallets->isEmpty()) {
                return response()->json([
                    'error' => 'No active wallets found for this user',
                ], 400);
            }

            $totalSynced = 0;
            $results = [];

            // Sincronizar posiciones para cada wallet
            foreach ($wallets as $wallet) {
                try {
                    $positions = $this->positionsService->syncUserPositions(
                        $wallet->address,
                        $user->id
                    );

                    $results[$wallet->address] = [
                        'success' => true,
                        'count' => count($positions),
                        'chain' => $wallet->chain,
                        'label' => $wallet->label,
                    ];

                    $totalSynced += count($positions);
                } catch (\Exception $e) {
                    $results[$wallet->address] = [
                        'success' => false,
                        'error' => $e->getMessage(),
                    ];
                }
            }

            return response()->json([
                'message' => 'Positions synced successfully',
                'total_synced' => $totalSynced,
                'wallets_synced' => count($wallets),
                'results' => $results,
                'synced_at' => now()->toIso8601String(),
            ]);
        } catch (\Exception $e) {
            Log::error('VFAT sync user positions error', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'error' => 'Failed to sync positions: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get chains disponibles
     * GET /api/vfat/chains
     */
    public function chains(): JsonResponse
    {
        try {
            // Usar cache por 5 minutos para evitar queries lentas
            $cacheKey = 'vfat_chains_list';

            $chains = Cache::remember($cacheKey, 300, function () {
                // Query simplificado - solo contar por chain_name
                $results = DB::select('
                    SELECT
                        chain_id,
                        chain_name,
                        COUNT(*) as pool_count
                    FROM pools
                    WHERE is_active = TRUE
                      AND is_killed = FALSE
                    GROUP BY chain_id, chain_name
                    ORDER BY chain_name
                ');

                return collect($results)->map(function ($c) {
                    return [
                        'id' => $c->chain_id,
                        'name' => $c->chain_name,
                        'pools' => (int) $c->pool_count,
                        'farms' => 0,  // Se puede calcular después si es necesario
                        'simple_pools' => 0,  // Se puede calcular después si es necesario
                    ];
                })->values();
            });

            return response()->json([
                'chains' => $chains,
            ]);
        } catch (\Exception $e) {
            Log::error('VFAT chains error', [
                'message' => $e->getMessage(),
            ]);

            return response()->json([
                'chains' => [],
                'error' => 'Failed to fetch chains',
            ], 500);
        }
    }
}
