<?php

namespace App\Console\Commands;

use App\Models\Pool;
use App\Models\PoolAsset;
use App\Models\PoolReward;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Database\Query\Expression;

class SyncVfatPools extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'pools:sync-vfat
        {--chunk=100 : Number of farms per chunk}
        {--force : Force full sync}
        {--min-tvl=10000 : Minimum TVL to store pool}
        {--stats : Show statistics only}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sync pools from vfat.io API (processes synchronously)';

    private string $apiUrl = 'https://info-api.vf.at/get-farms';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('🚀 Starting vfat.io sync...');
        $this->newLine();

        // Check if we have recent data
        if (!$this->option('force')) {
            $lastSync = DB::table('pool_metadata')
                ->where('key', 'last_vfat_sync')
                ->first();

            if ($lastSync && now()->subMinutes(240)->lt($lastSync->value)) {
                $this->warn('⏰ Data is recent (synced less than 4 hours ago).');
                $this->warn('   Use --force to sync anyway.');
                return self::SUCCESS;
            }
        }

        $this->info('📡 Downloading farm data from vfat.io...');
        $this->info('   (This may take 30-60 seconds for ~36MB)');

        // Download farms
        $farms = $this->downloadFarms();

        if (empty($farms)) {
            $this->error('✗ No farms received from vfat.io API');
            return self::FAILURE;
        }

        $this->info("✓ Downloaded " . count($farms) . " farms");
        $this->newLine();

        // Show stats if requested
        if ($this->option('stats')) {
            $this->showStatistics($farms);
            return self::SUCCESS;
        }

        // Process synchronously
        $this->processSynchronously($farms);

        return self::SUCCESS;
    }

    /**
     * Download farms from vfat.io API.
     */
    protected function downloadFarms(): array
    {
        $ch = curl_init($this->apiUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 120);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200) {
            $this->error("✗ HTTP Error: $httpCode");
            return [];
        }

        $this->info("   Downloaded " . number_format(strlen($response) / 1024 / 1024, 2) . " MB");

        $farms = json_decode($response, true);

        if (!is_array($farms)) {
            $this->error('✗ Failed to decode JSON response');
            return [];
        }

        return $farms;
    }

    /**
     * Process farms synchronously in chunks.
     */
    protected function processSynchronously(array $farms): void
    {
        $chunkSize = (int) $this->option('chunk', 100);
        $minTvl = (float) $this->option('min-tvl', 10000);

        $this->info("📦 Processing farms in chunks of {$chunkSize}...");
        $this->newLine();

        $chunks = [];
        $chunkNumber = 0;
        $totalProcessed = 0;
        $skipped = 0;
        $tvlFiltered = 0;
        $totalCreated = 0;
        $totalUpdated = 0;

        $bar = $this->output->createProgressBar(count($farms));
        $bar->start();

        foreach ($farms as $farm) {
            $bar->advance();

            // Skip killed farms
            if ($farm['is_killed'] ?? false) {
                $skipped++;
                $this->deactivatePool($farm['pool_address'] ?? '');
                continue;
            }

            // Calculate TVL
            $tvl = $this->calculateTvl($farm);

            // Filter by minimum TVL
            if ($tvl < $minTvl) {
                $tvlFiltered++;
                continue;
            }

            $chunks[] = $farm;
            $totalProcessed++;

            // Process when chunk is full
            if (count($chunks) >= $chunkSize) {
                $chunkNumber++;
                $result = $this->processChunk($chunks);
                $totalCreated += $result['created'];
                $totalUpdated += $result['updated'];
                $this->newLine();
                $this->line("✓ Chunk {$chunkNumber}: {$result['created']} created, {$result['updated']} updated");
                $chunks = [];
                $bar->display();
            }
        }

        $bar->finish();
        $this->newLine(2);

        // Process last chunk if not empty
        if (!empty($chunks)) {
            $chunkNumber++;
            $result = $this->processChunk($chunks);
            $totalCreated += $result['created'];
            $totalUpdated += $result['updated'];
            $this->line("✓ Chunk {$chunkNumber}: {$result['created']} created, {$result['updated']} updated");
        }

        // Update sync metadata
        DB::table('pool_metadata')->updateOrInsert(
            ['key' => 'last_vfat_sync'],
            ['value' => now()->toIso8601String()]
        );

        $this->newLine();
        $this->info("✓ Processed {$chunkNumber} chunks");
        $this->info("✓ {$totalCreated} pools created");
        $this->info("✓ {$totalUpdated} pools updated");
        $this->info("✓ {$totalProcessed} farms processed (TVL > \${$minTvl})");
        $this->info("✓ {$skipped} killed farms skipped");
        $this->info("✓ {$tvlFiltered} farms filtered below TVL threshold");
        $this->newLine();

        // Show final stats
        $finalStats = [
            'total_pools' => Pool::count(),
            'active_pools' => Pool::where('is_active', new Expression('TRUE'))->count(),
            'total_tvl' => Pool::sum('tvl_usd'),
        ];
        $this->table(
            ['Metric', 'Value'],
            [
                ['Total Pools in DB', number_format($finalStats['total_pools'])],
                ['Active Pools', number_format($finalStats['active_pools'])],
                ['Total TVL', '$' . number_format($finalStats['total_tvl'], 2)],
            ]
        );
        $this->newLine();

        // Reclassify pool types based on rewards data in database
        $this->info('🔄 Reclassifying pool types based on rewards...');
        $this->reclassifyPoolTypes();
        $this->newLine();

        $this->info('✅ Sync completed successfully!');
    }

    /**
     * Reclassify all pools based on rewards data in database.
     */
    protected function reclassifyPoolTypes(): void
    {
        $reclassified = 0;

        DB::transaction(function () use (&$reclassified) {
            // Get all active pools
            Pool::where('is_active', new Expression('TRUE'))
                ->chunk(100, function ($pools) use (&$reclassified) {
                    foreach ($pools as $pool) {
                        $newType = $this->determinePoolType($pool);

                        // Only update if type changed
                        if ($pool->pool_type !== $newType) {
                            $pool->pool_type = $newType;
                            $pool->save();
                            $reclassified++;
                        }
                    }
                });
        });

        if ($reclassified > 0) {
            $this->info("  ✓ Reclassified {$reclassified} pools");
        }
    }

    /**
     * Determine pool type based on rewards data in database.
     */
    protected function determinePoolType(Pool $pool): string
    {
        // If killed, it's inactive
        if ($pool->is_killed) {
            return 'inactive';
        }

        // Check if pool has rewards with rewards_per_second > 0
        $hasRewards = $pool->rewards()
            ->where('rewards_per_second', '>', 0)
            ->exists();

        // Also check apy_reward > 0 as backup
        if (!$hasRewards && $pool->apy_reward > 0) {
            $hasRewards = true;
        }

        return $hasRewards ? 'farm' : 'pool';
    }

    /**
     * Process a chunk of farms.
     */
    protected function processChunk(array $farms): array
    {
        $created = 0;
        $updated = 0;

        DB::transaction(function () use ($farms, &$created, &$updated) {
            foreach ($farms as $farm) {
                $pool = $this->upsertPool($farm);
                if ($pool->wasRecentlyCreated) {
                    $created++;
                } else {
                    $updated++;
                }

                $this->syncAssets($pool, $farm);
                $this->syncRewards($pool, $farm);
            }
        });

        return ['created' => $created, 'updated' => $updated];
    }

    /**
     * Upsert pool to database.
     */
    protected function upsertPool(array $farm): Pool
    {
        $tvlUsd = $this->calculateTvl($farm);
        $apyData = $this->calculateApy($farm, $tvlUsd);
        $isStablecoin = $this->isStablecoin($farm);
        $ilRisk = $this->getIlRisk($farm);

        $chainId = $farm['chain_id'] ?? 0;
        $chainName = $this->getChainName($chainId);

        // Clean text fields
        $protocolName = $this->cleanText($farm['protocol_name'] ?? 'Unknown');
        $poolSymbol = $this->cleanText($farm['pool_symbol'] ?? '');

        // Force boolean values for PostgreSQL
        $poolIsStable = ($farm['pool_is_stable'] ?? false) ? 'TRUE' : 'FALSE';
        $isStablecoinBool = $isStablecoin ? 'TRUE' : 'FALSE';

        // Get existing pool to preserve pool_type, otherwise default to 'pool'
        // Will be reclassified after sync based on rewards in database
        $existingPool = Pool::where('pool_address', $farm['pool_address'])->first();
        $poolType = $existingPool->pool_type ?? 'pool';

        return Pool::updateOrCreate(
            ['pool_address' => $farm['pool_address']],
            [
                'chain_id' => $chainId,
                'chain_name' => $chainName,
                'protocol_id' => $farm['protocol_id'] ?? 'unknown',
                'protocol_name' => $protocolName,
                'protocol_url' => $farm['protocol_url'] ?? null,
                'farm_type' => $farm['farm_type'] ?? null,
                'farm_address' => $farm['farm_address'] ?? null,
                'pool_symbol' => $poolSymbol,
                'pool_is_stable' => new Expression($poolIsStable),
                'pool_fee' => $farm['pool_fee'] ?? null,
                'pool_type' => $poolType,
                'tvl_usd' => $tvlUsd,
                'apy' => $apyData['total'],
                'apy_base' => $apyData['base'],
                'apy_reward' => $apyData['reward'],
                'is_stablecoin' => new Expression($isStablecoinBool),
                'il_risk' => $ilRisk,
                'is_active' => new Expression('TRUE'),
                'is_killed' => new Expression('FALSE'),
                'vfat_synced_at' => now(),
            ]
        );
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
            // Clean special characters from text fields, provide fallback
            $cleanSymbol = $this->cleanText($asset['symbol'] ?? '') ?: 'Unknown';
            $cleanName = $this->cleanText($asset['name'] ?? '');

            // Convert wei to normal units for reserve
            $reserve = floatval($asset['reserve'] ?? 0);

            // Convert monthly swap fees from wei to normal units
            $monthlySwapFees = floatval($asset['monthlySwapFees'] ?? 0);

            PoolAsset::updateOrCreate(
                [
                    'pool_id' => $pool->id,
                    'token_address' => $asset['address'] ?? '',
                ],
                [
                    'token_symbol' => $cleanSymbol,
                    'token_name' => $cleanName,
                    'token_decimals' => $asset['decimals'] ?? null,
                    'reserve' => $reserve,
                    'price' => floatval($asset['price'] ?? 0),
                    'liquidity' => floatval($asset['liquidity'] ?? 0),
                    'monthly_swap_fees' => $monthlySwapFees,
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
            $pool->rewards()->delete();
            return;
        }

        foreach ($farm['rewards'] as $reward) {
            if (!isset($reward['rewardToken'])) {
                continue;
            }

            $token = $reward['rewardToken'];

            // Clean text fields, provide fallback for symbol
            $rewardSymbol = $this->cleanText($token['symbol'] ?? '') ?: 'Unknown';
            $rewardName = $this->cleanText($token['name'] ?? '');

            PoolReward::updateOrCreate(
                [
                    'pool_id' => $pool->id,
                    'reward_token_address' => $token['address'] ?? '',
                ],
                [
                    'reward_token_symbol' => $rewardSymbol,
                    'reward_token_name' => $rewardName,
                    'reward_token_decimals' => $token['decimals'] ?? null,
                    'rewards_per_second' => floatval($reward['rewardsPerSecond'] ?? 0),
                    'reward_token_price' => floatval($token['price'] ?? 0),
                    'vfat_synced_at' => now(),
                ]
            );
        }

        // Delete rewards that no longer exist
        $existingAddresses = collect($farm['rewards'])->pluck('rewardToken.address')->filter();
        $pool->rewards()
            ->whereNotIn('reward_token_address', $existingAddresses)
            ->delete();
    }

    /**
     * Deactivate a pool.
     */
    protected function deactivatePool(string $poolAddress): void
    {
        if (empty($poolAddress)) {
            return;
        }

        // Use DB::statement with explicit boolean casting
        DB::statement(
            'UPDATE pools SET is_active = FALSE, is_killed = TRUE, vfat_synced_at = ? WHERE pool_address = ?',
            [now(), $poolAddress]
        );
    }

    /**
     * Calculate TVL.
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
     * Calculate APY.
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
     * Clean text to remove special characters that cause encoding issues.
     */
    protected function cleanText(?string $text): ?string
    {
        if ($text === null) {
            return null;
        }

        // Remove any non-ASCII characters (simple approach)
        $text = preg_replace('/[^\x20-\x7E]/', '', $text);

        return $text ?: null;
    }

    /**
     * Show statistics about farms.
     */
    protected function showStatistics(array $farms): void
    {
        $this->info('📊 vfat.io Statistics:');
        $this->newLine();

        $chains = [];
        $protocols = [];
        $farmTypes = [];
        $totalTvl = 0;
        $poolsWithTvl = 0;

        foreach ($farms as $farm) {
            $chainId = $farm['chain_id'] ?? 0;
            $protocol = $farm['protocol_name'] ?? 'Unknown';
            $farmType = $farm['farm_type'] ?? 'Unknown';

            if (!isset($chains[$chainId])) {
                $chains[$chainId] = 0;
            }
            $chains[$chainId]++;

            if (!isset($protocols[$protocol])) {
                $protocols[$protocol] = 0;
            }
            $protocols[$protocol]++;

            if (!isset($farmTypes[$farmType])) {
                $farmTypes[$farmType] = 0;
            }
            $farmTypes[$farmType]++;

            $tvl = $this->calculateTvl($farm);
            if ($tvl > 0) {
                $totalTvl += $tvl;
                $poolsWithTvl++;
            }
        }

        $this->table(
            ['Metric', 'Value'],
            [
                ['Total Farms', number_format(count($farms))],
                ['Pools with TVL', number_format($poolsWithTvl)],
                ['Total TVL', '$' . number_format($totalTvl, 2)],
                ['Unique Chains', count($chains)],
                ['Unique Protocols', count($protocols)],
                ['Farm Types', count($farmTypes)],
            ]
        );

        $this->newLine();
        $this->info('Top 10 Chains:');
        arsort($chains);
        $count = 0;
        foreach ($chains as $chainId => $farmCount) {
            if ($count++ >= 10) break;
            $chainName = $this->getChainName($chainId);
            $this->line("  - {$chainName} (ID: {$chainId}): {$farmCount} farms");
        }

        $this->newLine();
        $this->info('Top 10 Protocols:');
        arsort($protocols);
        $count = 0;
        foreach ($protocols as $protocol => $farmCount) {
            if ($count++ >= 10) break;
            $this->line("  - {$protocol}: {$farmCount} farms");
        }
    }
}
