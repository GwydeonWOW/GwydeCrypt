<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class BaseCadcWethPoolSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $sickle = '0x1bbaf9578c9ce3ff6a938ecaeb9c3d9a18ab7961';

        // Check if pool already exists
        $exists = DB::table('pools')
            ->where('pool_address', $sickle)
            ->orWhere('farm_address', $sickle)
            ->first();

        if ($exists) {
            $this->command->info("Pool already exists with ID: {$exists->id}");
            return;
        }

        // Get next ID
        $maxId = DB::table('pools')->max('id') ?? 0;
        $newId = $maxId + 1;

        // Insert the pool
        DB::table('pools')->insert([
            'id' => $newId,
            'pool_address' => $sickle,
            'chain_id' => 8453,
            'chain_name' => 'Base',
            'protocol_id' => 0,
            'protocol_name' => 'Uniswap V3',
            'protocol_url' => 'https://uniswap.org',
            'farm_type' => 'concentrated',
            'farm_address' => $sickle,
            'pool_symbol' => 'CADC-WETH',
            'pool_is_stable' => 'false',
            'pool_fee' => 0.05,
            'tvl_usd' => 0,
            'apy' => 0,
            'apy_base' => 0,
            'apy_reward' => 0,
            'is_stablecoin' => 'false',
            'il_risk' => 'low',
            'is_active' => 'true',
            'is_killed' => 'false',
        ]);

        $this->command->info("Created pool with ID: $newId");
        $this->command->info("Pool: CADC-WETH on Uniswap V3 (Base)");
    }
}
