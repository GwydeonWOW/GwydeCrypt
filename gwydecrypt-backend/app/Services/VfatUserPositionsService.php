<?php

namespace App\Services;

use App\Models\Pool;
use App\Models\UserPosition;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class VfatUserPositionsService
{
    private string $positionsApiUrl = 'https://info-api.vf.at/open-positions-v2';

    /**
     * Obtener posiciones abiertas del usuario desde vfat.io API
     */
    public function fetchUserPositions(string $walletAddress): array
    {
        $url = $this->positionsApiUrl . '?admin_address=' . $walletAddress;

        Log::info("Fetching user positions from vfat.io", ['wallet' => $walletAddress]);

        $response = Http::timeout(30)
            ->withOptions(['verify' => false])
            ->get($url);

        if (!$response->successful()) {
            Log::warning('vfat.io positions API error', [
                'status' => $response->status(),
                'wallet' => $walletAddress,
            ]);
            throw new \Exception("API Error: " . $response->status());
        }

        $data = $response->json();

        if (!($data['success'] ?? false)) {
            throw new \Exception("API returned unsuccessful response");
        }

        Log::info('vfat.io user positions fetched', [
            'wallet' => $walletAddress,
            'count' => $data['count'] ?? 0,
        ]);

        return $data;
    }

    /**
     * Sincronizar posiciones de un usuario con la base de datos
     * Retorna las posiciones sincronizadas
     *
     * @param string $walletAddress Dirección de la wallet
     * @param int|null $userId ID del usuario (opcional)
     * @return array
     */
    public function syncUserPositions(string $walletAddress, ?int $userId = null): array
    {
        $data = $this->fetchUserPositions($walletAddress);

        // La API retorna count = 0 cuando no hay posiciones
        if (($data['count'] ?? 0) === 0) {
            // Marcar posiciones anteriores como obsoletas
            $query = UserPosition::where('wallet_address', $walletAddress);
            if ($userId) {
                $query->where('user_id', $userId);
            }
            $query->delete();
            return [];
        }

        // Las posiciones vienen en $data['data']
        $positionsData = $data['data'] ?? [];
        $synced = [];

        DB::transaction(function () use ($positionsData, $walletAddress, $userId, &$synced) {
            foreach ($positionsData as $position) {
                // Obtener direcciones de la API
                $farmAddress = $position['farm_address'] ?? null;
                $poolAddressFromApi = $position['nft']['pool_address'] ?? null;

                if (!$farmAddress) {
                    Log::warning('Farm address not found in position data', [
                        'wallet' => $walletAddress,
                    ]);
                    continue;
                }

                // Buscar el pool correspondiente - intentar primero por pool_address, luego por farm_address
                $pool = Pool::where('pool_address', $farmAddress)
                    ->orWhere('pool_address', $poolAddressFromApi)
                    ->orWhere('farm_address', $farmAddress)
                    ->first();

                if (!$pool) {
                    Log::warning('Pool not found for user position', [
                        'farm_address' => $farmAddress,
                        'pool_address_api' => $poolAddressFromApi,
                        'wallet' => $walletAddress,
                    ]);
                    continue; // Saltar si el pool no existe en nuestra BD
                }

                // Calcular user_balance_usd basado en el balance actual
                $balance = floatval($position['balance'] ?? 0);
                $userBalanceUsd = 0;

                // Sumar el valor de los tokens underlying
                if (!empty($position['underlying'])) {
                    foreach ($position['underlying'] as $underlying) {
                        $tokenBalance = floatval($underlying['balance'] ?? 0);
                        $tokenPrice = floatval($underlying['price'] ?? 0);
                        $userBalanceUsd += $tokenBalance * $tokenPrice;
                    }
                }

                // Preparar tokens del usuario
                $userTokens = [];
                if (!empty($position['underlying'])) {
                    foreach ($position['underlying'] as $underlying) {
                        $userTokens[] = [
                            'symbol' => $underlying['symbol'] ?? '',
                            'amount' => $underlying['balance'] ?? '0',
                            'value_usd' => (floatval($underlying['balance'] ?? 0) * floatval($underlying['price'] ?? 0)),
                        ];
                    }
                }

                // Preparar rewards pendientes
                $pendingRewards = [];
                if (!empty($position['pending_rewards'])) {
                    foreach ($position['pending_rewards'] as $reward) {
                        $decimals = intval($reward['token']['decimals'] ?? 18);
                        $amount = floatval($reward['amount'] ?? 0);
                        $price = floatval($reward['token']['price'] ?? 0);

                        // Dividir por 10^decimals para obtener el valor real (tokens usan 18 decimales)
                        $realAmount = $amount / pow(10, $decimals);

                        $pendingRewards[] = [
                            'symbol' => $reward['token']['symbol'] ?? '',
                            'amount' => number_format($realAmount, 6, '.', ''),
                            'value_usd' => round($realAmount * $price, 2),
                        ];
                    }
                }

                // Extraer datos de ticks para calcular rango (Uniswap V3, Thena V3, etc.)
                $tickLow = null;
                $tickUp = null;
                $currentTick = null;
                $inRange = null;

                if (isset($position['nft']['tick_low'], $position['nft']['tick_up'])) {
                    $tickLow = intval($position['nft']['tick_low']);
                    $tickUp = intval($position['nft']['tick_up']);

                    // Obtener el tick actual del pool
                    if (isset($position['farm']['pool']['tick'])) {
                        $currentTick = intval($position['farm']['pool']['tick']);
                    } elseif (isset($position['tick'])) {
                        $currentTick = intval($position['tick']);
                    }

                    // Calcular si está en rango
                    // En rango cuando: tick_low <= current_tick <= tick_up
                    if ($currentTick !== null) {
                        // Asegurar que el resultado sea true/false explícitamente
                        $inRange = (($tickLow <= $currentTick) && ($currentTick <= $tickUp)) ? true : false;
                    }
                }

                // Extraer datos de tiempo en la posición
                $positionSince = null;
                $ageInDays = null;
                $lastAction = null;

                if (isset($position['oldest_action_timestamp'])) {
                    try {
                        $positionSince = now()->parse($position['oldest_action_timestamp']);
                    } catch (\Exception $e) {
                        Log::warning('Invalid oldest_action_timestamp', [
                            'timestamp' => $position['oldest_action_timestamp'] ?? null,
                        ]);
                    }
                }

                if (isset($position['age_in_days'])) {
                    $ageInDays = floatval($position['age_in_days']);
                }

                if (isset($position['last_action'])) {
                    $lastAction = $position['last_action'];
                }

                // Crear o actualizar posición del usuario
                $userPosition = UserPosition::updateOrCreate(
                    [
                        'wallet_address' => $walletAddress,
                        'pool_id' => $pool->id,
                    ],
                    [
                        'user_id' => $userId,
                        'user_balance' => $balance,
                        'user_balance_usd' => $userBalanceUsd,
                        'pool_share' => 0, // Se calcularía si tenemos el TVL total del pool
                        'user_tokens' => $userTokens,
                        'pending_rewards' => $pendingRewards,
                        'tick_low' => $tickLow,
                        'tick_up' => $tickUp,
                        'current_tick' => $currentTick,
                        'in_range' => $inRange,
                        'position_since' => $positionSince,
                        'age_in_days' => $ageInDays,
                        'last_action' => $lastAction,
                        'last_synced_at' => now(),
                    ]
                );

                $synced[] = $userPosition;
            }

            // Eliminar posiciones que ya no existen (fueron cerradas)
            $currentPoolIds = collect($synced)->pluck('pool_id')->toArray();
            $query = UserPosition::where('wallet_address', $walletAddress);
            if ($userId) {
                $query->where('user_id', $userId);
            }
            $query->whereNotIn('pool_id', $currentPoolIds)->delete();
        });

        Log::info('User positions synced', [
            'wallet' => $walletAddress,
            'user_id' => $userId,
            'synced' => count($synced),
        ]);

        return $synced;
    }

    /**
     * Obtener estadísticas de posiciones de un usuario
     *
     * @param int $userId ID del usuario
     * @return array
     */
    public function getUserStats(int $userId): array
    {
        $positions = UserPosition::forUser($userId)
            ->with('pool')
            ->whereHas('pool', fn ($q) => $q->where('is_active', 'true')->where('is_killed', 'false'))
            ->recentlySynced(30)
            ->get();

        return [
            'total_positions' => $positions->count(),
            'total_value_usd' => $positions->sum('user_balance_usd'),
            'farms_count' => $positions->filter(fn ($p) => $p->pool && $p->pool->pool_type === 'farm')->count(),
            'pools_count' => $positions->filter(fn ($p) => $p->pool && $p->pool->pool_type === 'pool')->count(),
            'chains' => $positions->pluck('pool.chain_name')->unique()->sort()->values()->toArray(),
        ];
    }

    /**
     * Obtener estadísticas de posiciones por wallet address
     * (Para uso en comando de consola)
     *
     * @param string $walletAddress Dirección de wallet
     * @return array
     */
    public function getStatsByWallet(string $walletAddress): array
    {
        $positions = UserPosition::forWallet($walletAddress)
            ->with('pool')
            ->whereHas('pool', fn ($q) => $q->where('is_active', 'true')->where('is_killed', 'false'))
            ->recentlySynced(30)
            ->get();

        return [
            'total_positions' => $positions->count(),
            'total_value_usd' => $positions->sum('user_balance_usd'),
            'farms_count' => $positions->filter(fn ($p) => $p->pool && $p->pool->pool_type === 'farm')->count(),
            'pools_count' => $positions->filter(fn ($p) => $p->pool && $p->pool->pool_type === 'pool')->count(),
            'chains' => $positions->pluck('pool.chain_name')->unique()->sort()->values()->toArray(),
        ];
    }
}
