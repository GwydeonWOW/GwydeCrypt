<?php

namespace Database\Seeders;

use App\Models\Token;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class MajorCryptosSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $tokens = [
            [
                'symbol' => 'SOL',
                'name' => 'Solana',
                'chain' => 'sol',
                'coingecko_id' => 'solana',
                'contract_address' => 'native',
                'decimals' => 9,
                'show_on_dashboard' => true,
            ],
            [
                'symbol' => 'SUI',
                'name' => 'SUI',
                'chain' => 'sui',
                'coingecko_id' => 'sui',
                'contract_address' => '0x2::sui::SUI',
                'decimals' => 9,
                'show_on_dashboard' => true,
            ],
            [
                'symbol' => 'ETH',
                'name' => 'Ethereum',
                'chain' => 'eth',
                'coingecko_id' => 'ethereum',
                'contract_address' => 'native',
                'decimals' => 18,
                'show_on_dashboard' => true,
            ],
            [
                'symbol' => 'MATIC',
                'name' => 'Polygon',
                'chain' => 'polygon',
                'coingecko_id' => 'matic-network',
                'contract_address' => 'native',
                'decimals' => 18,
                'show_on_dashboard' => true,
            ],
        ];

        foreach ($tokens as $token) {
            Token::updateOrCreate(
                [
                    'chain' => $token['chain'],
                    'symbol' => $token['symbol'],
                ],
                $token
            );
        }

        $this->command->info('Major crypto tokens seeded successfully.');
    }
}
