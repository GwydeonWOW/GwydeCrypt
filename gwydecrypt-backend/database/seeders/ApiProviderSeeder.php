<?php

namespace Database\Seeders;

use App\Models\ApiProvider;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Database\Query\Expression;
use Illuminate\Support\Facades\DB;

class ApiProviderSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Clear existing providers
        DB::table('api_providers')->truncate();

        $providers = [
            [
                'name' => 'coingecko',
                'provider_type' => 'price',
                'chain' => null,
                'base_url' => 'https://api.coingecko.com/api/v3',
                'api_key' => null, // CoinGecko free tier no requiere API key
                'is_active' => new Expression('TRUE'),
                'priority' => 1,
                'rate_limit_per_minute' => 50,
                'rate_limit_per_day' => 10000,
            ],
            [
                'name' => 'zerion',
                'provider_type' => 'price',
                'chain' => null,
                'base_url' => 'https://api.zerion.io/v1',
                'api_key' => null, // ⚠️  AÑADIR DESDE PANEL ADMIN - Requiere API key para funcionar
                'is_active' => new Expression('FALSE'), // Inactivo hasta que se añada API key desde panel admin
                'priority' => 2,
                'rate_limit_per_minute' => 100,
                'rate_limit_per_day' => 10000,
            ],
            [
                'name' => 'jupiter',
                'provider_type' => 'price',
                'chain' => null,
                'base_url' => 'https://price.jup.ag/v4',
                'api_key' => null, // Jupiter no requiere API key (free tier)
                'is_active' => new Expression('TRUE'),
                'priority' => 3,
                'rate_limit_per_minute' => 100,
                'rate_limit_per_day' => 100000,
            ],
        ];

        foreach ($providers as $provider) {
            ApiProvider::create($provider);
        }

        $this->command->info('API providers seeded successfully.');
    }
}
