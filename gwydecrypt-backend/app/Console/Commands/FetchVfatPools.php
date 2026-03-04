<?php

namespace App\Console\Commands;

use App\Services\VfatService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class FetchVfatPools extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'pools:fetch-vfat {--force : Force fetch even if recent data exists}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Fetch and process pools from vfat.io API';

    private VfatService $vfatService;

    public function __construct(VfatService $vfatService)
    {
        parent::__construct();
        $this->vfatService = $vfatService;
    }

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('Fetching pools from vfat.io...');

        try {
            // Check if we have recent data (within last 5 minutes)
            if (!$this->option('force')) {
                $lastUpdate = DB::table('pool_metadata')->where('key', 'last_vfat_update')->first();
                if ($lastUpdate && now()->subMinutes(5)->lt($lastUpdate->value)) {
                    $this->info('Data is recent (updated less than 5 minutes ago). Use --force to update anyway.');
                    return self::SUCCESS;
                }
            }

            // Clear cache to force fresh fetch
            $this->vfatService->clearCache();

            // Fetch farms directly without service to debug
            $this->info('Downloading farm data from vfat.io API (this may take 30-60 seconds)...');

            $ch = curl_init('https://info-api.vf.at/get-farms');
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 120);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $error = curl_error($ch);
            curl_close($ch);

            if ($httpCode !== 200) {
                $this->error("HTTP Error: $httpCode");
                if ($error) {
                    $this->error("Curl Error: $error");
                }
                return self::FAILURE;
            }

            $this->info('Downloaded ' . strlen($response) . ' bytes');

            $farms = json_decode($response, true);

            if (!is_array($farms)) {
                $this->error('Failed to decode JSON response');
                return self::FAILURE;
            }

            if (empty($farms)) {
                $this->error('Empty farms array received');
                return self::FAILURE;
            }

            $this->info('Received ' . count($farms) . ' farms');

            // Process and store in database/cache
            $this->info('Processing farms...');

            $bar = $this->output->createProgressBar(count($farms));
            $bar->start();

            $processedPools = [];
            $totalTvl = 0;
            $poolsWithTvl = 0;
            $minTvl = 100000; // Only pools with > $100k TVL

            foreach ($farms as $farm) {
                // Skip killed farms
                if ($farm['is_killed'] ?? false) {
                    $bar->advance();
                    continue;
                }

                // Normalize farm data
                $pool = $this->vfatService->normalizeFarm($farm);

                // Only store pools with TVL > $100k
                if ($pool['tvlUsd'] > $minTvl) {
                    $chain = $pool['chain'];
                    if (!isset($processedPools[$chain])) {
                        $processedPools[$chain] = [];
                    }

                    $processedPools[$chain][] = $pool;
                    $totalTvl += $pool['tvlUsd'];
                    $poolsWithTvl++;
                }

                $bar->advance();
            }

            $bar->finish();
            $this->newLine(2);

            $this->info('Found ' . $poolsWithTvl . ' pools with TVL > $' . number_format($minTvl) . '');
            $this->info('Total TVL: $' . number_format($totalTvl, 2));

            // Store in cache for quick access (by chain to reduce memory)
            $this->info('Storing in cache by chain...');
            foreach ($processedPools as $chain => $chainPools) {
                $cacheKey = 'vfat:pools:chain:' . md5($chain);
                cache()->put($cacheKey, $chainPools, 300); // 5 minutes
                $this->line("  - $chain: " . count($chainPools) . ' pools');
            }

            // Store metadata
            cache()->put('vfat:pools:chains', array_keys($processedPools), 300);
            cache()->put('vfat:pools:last_update', now()->toIso8601String(), 300);
            cache()->put('vfat:pools:stats', [
                'total_pools' => $poolsWithTvl,
                'total_tvl' => $totalTvl,
                'chains' => array_keys($processedPools),
            ], 300);

            // Update metadata
            DB::table('pool_metadata')->updateOrInsert(
                ['key' => 'last_vfat_update'],
                ['value' => now()->toIso8601String()]
            );

            $this->info('✓ Pools stored successfully in cache');
            $this->info('✓ Cache will expire in 5 minutes');
            $this->info('✓ Run this command every 3-5 minutes via scheduler');

            return self::SUCCESS;

        } catch (\Exception $e) {
            $this->error('Error: ' . $e->getMessage());
            $this->error('File: ' . $e->getFile() . ':' . $e->getLine());
            Log::error('Vfat fetch command error', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return self::FAILURE;
        }
    }
}
