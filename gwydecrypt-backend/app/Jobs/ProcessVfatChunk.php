<?php

namespace App\Jobs;

use App\Models\Pool;
use App\Models\PoolAsset;
use App\Models\PoolReward;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ProcessVfatChunk implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $timeout = 300; // 5 minutes
    public $tries = 3;
    public $maxExceptions = 3;

    /**
     * Create a new job instance.
     */
    public function __construct(
        private array $farms,
        private int $chunkNumber
    ) {
        $this->onQueue('pools'); // Dedicated queue for pool processing
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        Log::info("Processing vfat chunk #{$this->chunkNumber} with " . count($this->farms) . " farms");

        DB::transaction(function () {
            foreach ($this->farms as $farm) {
                $this->processFarm($farm);
            }
        });

        Log::info("Completed vfat chunk #{$this->chunkNumber}");
    }

    /**
     * Process a single farm and save to database.
     */
    protected function processFarm(array $farm): void
    {
        // Skip killed farms
        if ($farm['is_killed'] ?? false) {
            $this->deactivatePool($farm['pool_address']);
            return;
        }

        // Calculate metrics
        $tvlUsd = $this->calculateTvl($farm);
        $apyData = $this->calculateApy($farm, $tvlUsd);

        // Determine categorization
        $isStablecoin = $this->isStablecoin($farm);
        $ilRisk = $this->getIlRisk($farm);

        // Get chain info
        $chainId = $farm['chain_id'] ?? 0;
        $chainName = $this->getChainName($chainId);

        // Upsert pool
        $pool = Pool::updateOrCreate(
            ['pool_address' => $farm['pool_address']],
            [
                'chain_id' => $chainId,
                'chain_name' => $chainName,
                'protocol_id' => $farm['protocol_id'] ?? 'unknown',
                'protocol_name' => $farm['protocol_name'] ?? 'Unknown',
                'protocol_url' => $farm['protocol_url'] ?? null,
                'farm_type' => $farm['farm_type'] ?? null,
                'farm_address' => $farm['farm_address'] ?? null,
                'pool_symbol' => $farm['pool_symbol'] ?? null,
                'pool_is_stable' => $farm['pool_is_stable'] ?? false,
                'pool_fee' => $farm['pool_fee'] ?? null,
                'tvl_usd' => $tvlUsd,
                'apy' => $apyData['total'],
                'apy_base' => $apyData['base'],
                'apy_reward' => $apyData['reward'],
                'is_stablecoin' => $isStablecoin,
                'il_risk' => $ilRisk,
                'is_active' => true,
                'is_killed' => false,
                'vfat_synced_at' => now(),
            ]
        );

        // Sync assets
        $this->syncAssets($pool, $farm);

        // Sync rewards
        $this->syncRewards($pool, $farm);
    }

    /**
     * Sync pool assets.
     */
    protected function syncAssets(Pool $pool, array $farm): void
    {
        if (!isset($farm['underlying_assets']) || !is_array($farm['underlying_assets'])) {
            return;
        }

        foreach ($farm['underlying_assets'] as $asset) {
            PoolAsset::updateOrCreate(
                [
                    'pool_id' => $pool->id,
                    'token_address' => $asset['address'] ?? '',
                ],
                [
                    'token_symbol' => $asset['symbol'] ?? '',
                    'token_name' => $asset['name'] ?? null,
                    'token_decimals' => $asset['decimals'] ?? null,
                    'reserve' => $asset['reserve'] ?? 0,
                    'price' => $asset['price'] ?? 0,
                    'liquidity' => $asset['liquidity'] ?? 0,
                    'monthly_swap_fees' => $asset['monthlySwapFees'] ?? 0,
                    'vfat_synced_at' => now(),
                ]
            );
        }

        // Delete assets that no longer exist
        $existingAddresses = collect($farm['underlying_assets'])->pluck('address')->filter();
        $pool->assets()
            ->whereNotIn('token_address', $existingAddresses)
            ->delete();
    }

    /**
     * Sync pool rewards.
     */
    protected function syncRewards(Pool $pool, array $farm): void
    {
        if (!isset($farm['rewards']) || !is_array($farm['rewards'])) {
            // Delete all rewards if none exist
            $pool->rewards()->delete();
            return;
        }

        foreach ($farm['rewards'] as $reward) {
            if (!isset($reward['rewardToken'])) {
                continue;
            }

            $token = $reward['rewardToken'];

            PoolReward::updateOrCreate(
                [
                    'pool_id' => $pool->id,
                    'reward_token_address' => $token['address'] ?? '',
                ],
                [
                    'reward_token_symbol' => $token['symbol'] ?? null,
                    'reward_token_name' => $token['name'] ?? null,
                    'reward_token_decimals' => $token['decimals'] ?? null,
                    'rewards_per_second' => $reward['rewardsPerSecond'] ?? 0,
                    'reward_token_price' => $token['price'] ?? 0,
                    'vfat_synced_at' => now(),
                ]
            );
        }

        // Delete rewards that no longer exist
        $existingAddresses = collect($farm['rewards'])
            ->pluck('rewardToken.address')
            ->filter();
        $pool->rewards()
            ->whereNotIn('reward_token_address', $existingAddresses)
            ->delete();
    }

    /**
     * Deactivate a pool (when farm is killed).
     */
    protected function deactivatePool(string $poolAddress): void
    {
        Pool::where('pool_address', $poolAddress)
            ->update([
                'is_active' => false,
                'is_killed' => true,
                'vfat_synced_at' => now(),
            ]);
    }

    /**
     * Calculate TVL from underlying assets.
     */
    protected function calculateTvl(array $farm): float
    {
        $tvl = 0;

        if (!isset($farm['underlying_assets']) || !is_array($farm['underlying_assets'])) {
            return 0;
        }

        foreach ($farm['underlying_assets'] as $asset) {
            $reserve = floatval($asset['reserve'] ?? 0);
            $price = floatval($asset['price'] ?? 0);
            $tvl += ($reserve * $price) / 1e18;
        }

        return max(0, $tvl);
    }

    /**
     * Calculate APY from fees and rewards.
     */
    protected function calculateApy(array $farm, float $tvlUsd): array
    {
        $result = ['base' => 0.0, 'reward' => 0.0, 'total' => 0.0];

        if ($tvlUsd <= 0) {
            return $result;
        }

        // Calculate base APY from swap fees
        $baseApy = 0;
        if (isset($farm['underlying_assets']) && is_array($farm['underlying_assets'])) {
            $totalMonthlyFees = 0;

            foreach ($farm['underlying_assets'] as $asset) {
                $monthlyFees = floatval($asset['monthlySwapFees'] ?? 0);
                $price = floatval($asset['price'] ?? 0);
                $totalMonthlyFees += ($monthlyFees * $price) / 1e18;
            }

            $baseApy = ($totalMonthlyFees * 12 / $tvlUsd) * 100;
        }

        // Calculate reward APY
        $rewardApy = 0;
        if (!empty($farm['rewards']) && is_array($farm['rewards'])) {
            $totalYearlyRewards = 0;

            foreach ($farm['rewards'] as $reward) {
                $rewardsPerSecond = floatval($reward['rewardsPerSecond'] ?? 0);
                $price = floatval($reward['rewardToken']['price'] ?? 0);
                $yearlyReward = ($rewardsPerSecond * 31536000 / 1e18) * $price;
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
     * Check if pool contains only stablecoins.
     */
    protected function isStablecoin(array $farm): bool
    {
        $stablecoins = [
            'USDT', 'USDC', 'DAI', 'TUSD', 'BUSD', 'USDD', 'FRAX', 'LUSD',
            'MIM', 'USDN', 'USTC', 'EURS', 'FEI', 'RAI', 'sUSD',
        ];

        if (!isset($farm['underlying_assets']) || !is_array($farm['underlying_assets'])) {
            return false;
        }

        foreach ($farm['underlying_assets'] as $asset) {
            $symbol = strtoupper($asset['symbol'] ?? '');
            $isStable = false;

            foreach ($stablecoins as $stablecoin) {
                if (str_contains($symbol, $stablecoin)) {
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
     * Determine impermanent loss risk.
     */
    protected function getIlRisk(array $farm): string
    {
        if ($farm['pool_is_stable'] ?? false) {
            return 'low';
        }

        if ($this->isStablecoin($farm)) {
            return 'low';
        }

        $farmType = $farm['farm_type'] ?? '';
        if (str_contains($farmType, 'V3') || str_contains($farmType, 'V4')) {
            return 'medium';
        }

        return 'medium';
    }

    /**
     * Get chain name from ID.
     */
    protected function getChainName(int $chainId): string
    {
        $chains = [
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
            42220 => 'Celo',
            1284 => 'Moonbeam',
        ];

        return $chains[$chainId] ?? "Chain {$chainId}";
    }

    /**
     * Handle job failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error("Failed to process vfat chunk #{$this->chunkNumber}", [
            'error' => $exception->getMessage(),
            'trace' => $exception->getTraceAsString(),
        ]);
    }
}
