<?php

namespace Database\Seeders;

use App\Models\ApiProvider;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class SolanaRpcProvidersSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $providers = [
            [
                'name' => 'solana-mainnet',
                'provider_type' => 'blockchain',
                'chain' => 'sol',
                'base_url' => 'https://api.mainnet-beta.solana.com',
                'is_active' => false, // Currently not working well
                'priority' => 999,
            ],
            [
                'name' => 'solana-devnet',
                'provider_type' => 'blockchain',
                'chain' => 'sol',
                'base_url' => 'https://api.devnet.solana.com',
                'is_active' => true, // More reliable but devnet only
                'priority' => 10,
            ],
            [
                'name' => 'triton-rpc',
                'provider_type' => 'blockchain',
                'chain' => 'sol',
                'base_url' => 'https://rpc.ankr.com/solana',
                'api_key' => env('ANKR_API_KEY'), // Requires API key
                'is_active' => false,
                'priority' => 5,
            ],
        ];

        foreach ($providers as $provider) {
            ApiProvider::updateOrCreate(
                [
                    'name' => $provider['name'],
                    'chain' => $provider['chain'],
                ],
                $provider
            );
        }

        $this->command->info('Solana RPC providers seeded successfully.');
    }
}
