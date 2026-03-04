<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Token;

class CreateInitialTokensSeeder extends Seeder
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
                'decimals' => 9,
                'coingecko_id' => 'solana',
                'show_on_dashboard' => true,
                'sort_order' => 1,
                'tradingview_symbol' => 'BINANCE:SOLUSDT',
            ],
            [
                'symbol' => 'RAY',
                'name' => 'Raydium',
                'chain' => 'sol',
                'decimals' => 9,
                'coingecko_id' => 'raydium',
                'show_on_dashboard' => true,
                'sort_order' => 2,
                'tradingview_symbol' => 'BINANCE:RAYUSDT',
            ],
            [
                'symbol' => 'SUI',
                'name' => 'Sui',
                'chain' => 'sui',
                'decimals' => 9,
                'coingecko_id' => 'sui',
                'show_on_dashboard' => true,
                'sort_order' => 3,
                'tradingview_symbol' => 'BINANCE:SUIUSDT',
            ],
            [
                'symbol' => 'CADC',
                'name' => 'CAD Coin',
                'chain' => 'eth',
                'decimals' => 18,
                'coingecko_id' => 'cad-coin',
                'show_on_dashboard' => true,
                'sort_order' => 4,
                'tradingview_symbol' => 'CRYPTOCAP:CADC',
            ],
        ];

        foreach ($tokens as $token) {
            Token::updateOrCreate(
                ['symbol' => $token['symbol'], 'chain' => $token['chain']],
                $token
            );
        }
    }
}
