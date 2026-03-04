<?php

namespace App\Console\Commands;

use App\Models\Pool;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Query\Expression;

class ReclassifyPoolTypes extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'pools:reclassify-types';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Reclassify pools as farm or pool based on rewards data in database';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('🔄 Reclassifying pool types based on rewards data...');

        $farmCount = 0;
        $poolCount = 0;
        $inactiveCount = 0;

        // Get all active pools
        $pools = Pool::where('is_active', new Expression('TRUE'))->get();

        $bar = $this->output->createProgressBar($pools->count());
        $bar->start();

        foreach ($pools as $pool) {
            $newType = $this->determinePoolType($pool);

            // Only update if type changed
            if ($pool->pool_type !== $newType) {
                $pool->pool_type = $newType;
                $pool->save();

                switch ($newType) {
                    case 'farm':
                        $farmCount++;
                        break;
                    case 'pool':
                        $poolCount++;
                        break;
                    case 'inactive':
                        $inactiveCount++;
                        break;
                }
            }

            $bar->advance();
        }

        $bar->finish();
        $this->newLine(2);

        $this->info("✓ Reclassification complete:");
        $this->info("  - Farms: {$farmCount}");
        $this->info("  - Pools: {$poolCount}");
        $this->info("  - Inactive: {$inactiveCount}");
        $this->newLine();

        // Show summary
        $this->info('📊 Current pool type distribution:');
        $this->table(
            ['Type', 'Count'],
            [
                ['Farms', Pool::where('pool_type', 'farm')->count()],
                ['Pools', Pool::where('pool_type', 'pool')->count()],
                ['Inactive', Pool::where('pool_type', 'inactive')->count()],
                ['Total', Pool::count()],
            ]
        );

        return Command::SUCCESS;
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
}
