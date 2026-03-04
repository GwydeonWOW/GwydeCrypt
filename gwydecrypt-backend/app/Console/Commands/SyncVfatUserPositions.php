<?php

namespace App\Console\Commands;

use App\Services\VfatUserPositionsService;
use Illuminate\Console\Command;

class SyncVfatUserPositions extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'vfat:sync-positions {wallet_address}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sync user positions from vfat.io API';

    private VfatUserPositionsService $service;

    public function __construct(VfatUserPositionsService $service)
    {
        parent::__construct();
        $this->service = $service;
    }

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $walletAddress = $this->argument('wallet_address');

        // Validar formato de dirección
        if (!preg_match('/^0x[a-fA-F0-9]{40}$/', $walletAddress)) {
            $this->error('❌ Invalid wallet address format');
            $this->warn('Expected format: 0x followed by 40 hexadecimal characters');
            return self::FAILURE;
        }

        $this->info("🔄 Syncing vfat.io positions for: {$walletAddress}");
        $this->newLine();

        try {
            // Sincronizar posiciones
            $positions = $this->service->syncUserPositions($walletAddress);

            if (empty($positions)) {
                $this->warn('⚠️  No open positions found for this wallet');
                $this->newLine();
                $this->info('💡 Tip: The user needs to deposit liquidity into farms/pools first');
                return self::SUCCESS;
            }

            $this->info("✅ Synced " . count($positions) . " positions");
            $this->newLine();

            // Mostrar tabla de posiciones
            $this->table(
                ['Pool', 'Protocol', 'Chain', 'Balance USD', 'Pool Share', 'Type'],
                collect($positions)->map(function ($position) {
                    $pool = $position->pool;
                    return [
                        $pool->pool_symbol ?? $pool->protocol_name,
                        $pool->protocol_name,
                        $pool->chain_name,
                        '$' . number_format($position->user_balance_usd, 2),
                        number_format($position->pool_share * 100, 2) . '%',
                        strtoupper($pool->pool_type ?? 'pool'),
                    ];
                })->toArray()
            );

            // Mostrar estadísticas
            $this->newLine();
            $stats = $this->service->getStatsByWallet($walletAddress);

            $this->table(
                ['Metric', 'Value'],
                [
                    ['Total Positions', $stats['total_positions']],
                    ['Total Value', '$' . number_format($stats['total_value_usd'], 2)],
                    ['Farms', $stats['farms_count']],
                    ['Pools', $stats['pools_count']],
                    ['Chains', implode(', ', $stats['chains'])],
                ]
            );

            $this->newLine();
            $this->info('✅ Positions synced successfully!');
            $this->info('💾 Data stored in user_positions table');
            $this->info('🔄 Sync will auto-expire after 30 minutes');

            return self::SUCCESS;

        } catch (\Exception $e) {
            $this->error('❌ Error: ' . $e->getMessage());
            $this->error('File: ' . $e->getFile() . ':' . $e->getLine());

            Log::error('Vfat user positions sync error', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'wallet' => $walletAddress,
            ]);

            return self::FAILURE;
        }
    }
}
