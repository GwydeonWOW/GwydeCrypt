<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class VfatService
{
    private string $apiUrl = 'https://info-api.vf.at/get-farms';

    /**
     * Chain ID mappings (vfat chain_id -> chain name)
     */
    private array $chainNames = [
        1 => 'Ethereum',
        56 => 'BSC',
        137 => 'Polygon',
        250 => 'Fantom',
        42161 => 'Arbitrum',
        43114 => 'Avalanche',
        10 => 'Optimism',
        8453 => 'Base',
        59144 => 'Linea',
        534352 => 'Scroll',
        100 => 'Gnosis',
        1313161554 => 'Aurora',
        1284 => 'Moonbeam',
        1285 => 'Moonriver',
        1088 => 'Metis',
        1666600000 => 'Harmony',
        122 => 'Fuse',
        42262 => 'Oasis',
        42220 => 'Celo',
        57 => 'Syscoin',
        8217 => 'Klaytn',
        40 => 'Telos',
    ];

    /**
     * Fetch all farms from vfat.io API
     * Uses caching to avoid repeated calls
     */
    public function fetchFarms(bool $useCache = true): array
    {
        $cacheKey = 'vfat:farms:all';

        if ($useCache && Cache::has($cacheKey)) {
            $cached = Cache::get($cacheKey, []);
            // Only return cached data if it's not empty (avoid returning failed attempts)
            if (!empty($cached)) {
                return $cached;
            }
        }

        try {
            Log::info('Fetching farms from vfat.io API');

            $response = Http::timeout(60)
                ->withOptions([
                    'verify' => false,
                ])
                ->get($this->apiUrl);

            if (!$response->successful()) {
                Log::warning('vfat.io API returned non-successful response: ' . $response->status());
                return [];
            }

            $farms = $response->json();

            if (!is_array($farms)) {
                Log::warning('vfat.io API returned unexpected format');
                return [];
            }

            if (empty($farms)) {
                Log::warning('vfat.io API returned empty array');
                return [];
            }

            Log::info('vfat.io farms fetched successfully: ' . count($farms) . ' farms');

            // Cache for 5 minutes (prices change frequently)
            Cache::put($cacheKey, $farms, 300);

            return $farms;
        } catch (\Exception $e) {
            Log::error('vfat.io API error: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Normalize vfat farm data to match DefiLlama format
     */
    public function normalizeFarm(array $farm): array
    {
        $chainId = $farm['chain_id'] ?? 0;
        $protocolName = $farm['protocol_name'] ?? 'Unknown';
        $poolSymbol = $farm['pool_symbol'] ?? '';

        // Calculate TVL from underlying assets
        $tvlUsd = $this->calculateTvl($farm);

        // Calculate APY from fees and rewards
        $apyData = $this->calculateApy($farm, $tvlUsd);

        // Get underlying tokens
        $underlyingTokens = [];
        if (isset($farm['underlying_assets']) && is_array($farm['underlying_assets'])) {
            foreach ($farm['underlying_assets'] as $asset) {
                $underlyingTokens[] = $asset['address'] ?? '';
            }
        }

        // Build symbol from underlying assets
        $symbol = $this->buildSymbol($farm);

        return [
            'chain' => $this->chainNames[$chainId] ?? 'Chain ' . $chainId,
            'chain_id' => $chainId,
            'project' => $protocolName,
            'symbol' => $symbol,
            'name' => $protocolName . ' - ' . $symbol,
            'tvlUsd' => $tvlUsd,
            'apy' => $apyData['total'],
            'apyBase' => $apyData['base'],
            'apyReward' => $apyData['reward'],
            'stablecoin' => $this->isStablecoin($farm),
            'ilRisk' => $this->getIlRisk($farm),
            'exposure' => $this->getExposure($farm),
            'pool' => $farm['pool_address'] ?? '',
            'pool_metadata' => [
                'farm_address' => $farm['farm_address'] ?? '',
                'farm_type' => $farm['farm_type'] ?? '',
                'pool_symbol' => $poolSymbol,
                'pool_is_stable' => $farm['pool_is_stable'] ?? false,
                'pool_fee' => $farm['pool_fee'] ?? null,
                'protocol_url' => $farm['protocol_url'] ?? '',
            ],
            'underlyingTokens' => $underlyingTokens,
            'underlying_assets' => $farm['underlying_assets'] ?? [],
            'rewards' => $farm['rewards'] ?? [],
            'reward_tokens' => $farm['reward_token'] ?? [],
            'is_killed' => $farm['is_killed'] ?? false,
            'balance' => $farm['balance'] ?? '0',
            'timestamp_utc' => $farm['timestamp_utc'] ?? null,
        ];
    }

    /**
     * Calculate TVL from underlying assets reserves
     */
    private function calculateTvl(array $farm): float
    {
        $tvl = 0;

        if (!isset($farm['underlying_assets']) || !is_array($farm['underlying_assets'])) {
            return 0;
        }

        foreach ($farm['underlying_assets'] as $asset) {
            $reserve = floatval($asset['reserve'] ?? 0);
            $price = floatval($asset['price'] ?? 0);

            // Convert from wei (assuming 18 decimals)
            // Some tokens might have different decimals, but this is a reasonable approximation
            $tvl += ($reserve * $price) / 1e18;
        }

        return max(0, $tvl);
    }

    /**
     * Calculate APY from swap fees and rewards
     */
    private function calculateApy(array $farm, float $tvlUsd): array
    {
        $result = [
            'base' => 0.0,
            'reward' => 0.0,
            'total' => 0.0,
        ];

        if ($tvlUsd <= 0) {
            return $result;
        }

        // Calculate base APY from swap fees (using monthly fees as a baseline)
        $baseApy = 0;
        if (isset($farm['underlying_assets']) && is_array($farm['underlying_assets'])) {
            $totalMonthlyFees = 0;

            foreach ($farm['underlying_assets'] as $asset) {
                $monthlyFees = floatval($asset['monthlySwapFees'] ?? 0);
                // Convert from wei
                $totalMonthlyFees += ($monthlyFees * floatval($asset['price'] ?? 0)) / 1e18;
            }

            // Annualize: monthlyFee * 12 / tvl * 100
            $baseApy = ($totalMonthlyFees * 12 / $tvlUsd) * 100;
        }

        // Calculate reward APY from rewards_per_second
        $rewardApy = 0;
        if (!empty($farm['rewards']) && is_array($farm['rewards'])) {
            $totalYearlyRewards = 0;

            foreach ($farm['rewards'] as $reward) {
                $rewardsPerSecond = floatval($reward['rewardsPerSecond'] ?? 0);
                $rewardPrice = floatval($reward['rewardToken']['price'] ?? 0);

                // rewardsPerSecond * seconds_in_year / decimals * price
                $yearlyReward = ($rewardsPerSecond * 31536000 / 1e18) * $rewardPrice;
                $totalYearlyRewards += $yearlyReward;
            }

            $rewardApy = ($totalYearlyRewards / $tvlUsd) * 100;
        }

        $result['base'] = round($baseApy, 2);
        $result['reward'] = round($rewardApy, 2);
        $result['total'] = round($baseApy + $rewardApy, 2);

        return $result;
    }

    /**
     * Build pool symbol from underlying assets
     */
    private function buildSymbol(array $farm): string
    {
        if (isset($farm['pool_symbol']) && !empty($farm['pool_symbol'])) {
            return $farm['pool_symbol'];
        }

        $symbols = [];
        if (isset($farm['underlying_assets']) && is_array($farm['underlying_assets'])) {
            foreach ($farm['underlying_assets'] as $asset) {
                $symbol = $asset['symbol'] ?? '';
                if ($symbol) {
                    $symbols[] = $symbol;
                }
            }
        }

        return count($symbols) > 0 ? implode('-', $symbols) : 'Unknown';
    }

    /**
     * Check if pool contains only stablecoins
     */
    private function isStablecoin(array $farm): bool
    {
        $stablecoins = [
            'USDT', 'USDC', 'DAI', 'TUSD', 'BUSD', 'USDD', 'FRAX', 'LUSD',
            'MIM', 'USDN', 'USTC', 'EURS', 'FEI', 'RAI', 'sUSD', 'USD Coin',
            'Tether USD', 'USD Coin', 'Dai Stablecoin', 'TrueUSD',
        ];

        if (!isset($farm['underlying_assets']) || !is_array($farm['underlying_assets'])) {
            return false;
        }

        if (empty($farm['underlying_assets'])) {
            return false;
        }

        foreach ($farm['underlying_assets'] as $asset) {
            $symbol = strtoupper($asset['symbol'] ?? '');
            $name = strtoupper($asset['name'] ?? '');

            $isStable = false;
            foreach ($stablecoins as $stablecoin) {
                if (str_contains($symbol, $stablecoin) || str_contains($name, $stablecoin)) {
                    $isStable = true;
                    break;
                }
            }

            if (!$isStable) {
                return false;
            }
        }

        return true;
    }

    /**
     * Determine impermanent loss risk
     */
    private function getIlRisk(array $farm): string
    {
        // Stable pools have low IL risk
        if ($farm['pool_is_stable'] ?? false) {
            return 'low';
        }

        // Check if it's a stablecoin pool
        if ($this->isStablecoin($farm)) {
            return 'low';
        }

        // V3/V4 pools have higher IL risk due to concentrated liquidity
        $farmType = $farm['farm_type'] ?? '';
        if (str_contains($farmType, 'V3') || str_contains($farmType, 'V4')) {
            return 'medium';
        }

        return 'medium';
    }

    /**
     * Get token exposure
     */
    private function getExposure(array $farm): string
    {
        $tokens = [];
        if (isset($farm['underlying_assets']) && is_array($farm['underlying_assets'])) {
            foreach ($farm['underlying_assets'] as $asset) {
                $symbol = $asset['symbol'] ?? '';
                if ($symbol && !in_array($symbol, $tokens)) {
                    $tokens[] = $symbol;
                }
            }
        }

        return implode(', ', $tokens);
    }

    /**
     * Get chain name from chain ID
     */
    public function getChainName(int $chainId): string
    {
        return $this->chainNames[$chainId] ?? 'Chain ' . $chainId;
    }

    /**
     * Get all available chains
     */
    public function getAvailableChains(): array
    {
        $farms = $this->fetchFarms();

        $chains = [];
        foreach ($farms as $farm) {
            $chainId = $farm['chain_id'] ?? 0;
            if ($chainId > 0 && !isset($chains[$chainId])) {
                $chains[$chainId] = [
                    'id' => $chainId,
                    'name' => $this->getChainName($chainId),
                ];
            }
        }

        return array_values($chains);
    }

    /**
     * Filter farms by various criteria
     */
    public function filterFarms(array $filters = []): array
    {
        $farms = $this->fetchFarms();
        $filtered = [];

        $minTvl = $filters['min_tvl'] ?? 100000; // Default $100k
        $chain = $filters['chain'] ?? null;
        $excludeKilled = $filters['exclude_killed'] ?? true;

        foreach ($farms as $farm) {
            // Filter out killed farms if requested
            if ($excludeKilled && ($farm['is_killed'] ?? false)) {
                continue;
            }

            // Filter by chain
            if ($chain !== null) {
                $farmChainId = $farm['chain_id'] ?? 0;
                $filterChainId = array_search($chain, $this->chainNames);

                if ($filterChainId !== false && $farmChainId != $filterChainId) {
                    continue;
                }
            }

            // Calculate TVL and filter
            $tvl = $this->calculateTvl($farm);
            if ($tvl < $minTvl) {
                continue;
            }

            $filtered[] = $this->normalizeFarm($farm);
        }

        // Sort by TVL descending
        usort($filtered, function ($a, $b) {
            return $b['tvlUsd'] <=> $a['tvlUsd'];
        });

        // Apply limit
        $limit = $filters['limit'] ?? null;
        if ($limit !== null && $limit > 0) {
            $filtered = array_slice($filtered, 0, $limit);
        }

        return $filtered;
    }

    /**
     * Clear the farms cache
     */
    public function clearCache(): void
    {
        Cache::forget('vfat:farms:all');
        Log::info('vfat.io farms cache cleared');
    }
}
