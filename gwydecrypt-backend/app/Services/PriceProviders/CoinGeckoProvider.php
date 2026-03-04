<?php

namespace App\Services\PriceProviders;

use App\Services\PriceProviders\Contracts\PriceProviderInterface;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;

class CoinGeckoProvider implements PriceProviderInterface
{
    private const BASE_URL = 'https://api.coingecko.com/api/v3';
    private const CACHE_TTL = 300; // 5 minutes

    /**
     * Get the provider name.
     */
    public function getName(): string
    {
        return 'CoinGecko';
    }

    /**
     * Get the provider priority.
     */
    public function getPriority(): int
    {
        return 1;
    }

    /**
     * Check if provider is available.
     */
    public function isAvailable(): bool
    {
        try {
            $response = Http::timeout(5)->get(self::BASE_URL . '/ping');
            return $response->successful();
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Fetch token price from provider.
     */
    public function getTokenPrice(string $tokenSymbol, string $chain): ?float
    {
        $cacheKey = "price:coingecko:{$tokenSymbol}:{$chain}";

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($tokenSymbol, $chain) {
            try {
                $response = Http::timeout(10)->get(self::BASE_URL . '/simple/price', [
                    'ids' => $this->getCoinGeckoId($tokenSymbol),
                    'vs_currencies' => 'usd',
                ]);

                if (!$response->successful()) {
                    return null;
                }

                $data = $response->json();
                $id = $this->getCoinGeckoId($tokenSymbol);

                return $data[$id]['usd'] ?? null;
            } catch (\Exception $e) {
                \Log::error('CoinGecko price fetch error', [
                    'token' => $tokenSymbol,
                    'chain' => $chain,
                    'error' => $e->getMessage(),
                ]);

                return null;
            }
        });
    }

    /**
     * Fetch multiple token prices from provider.
     */
    public function getMultipleTokenPrices(array $tokenSymbols, string $chain): array
    {
        $cacheKey = 'prices:coingecko:multiple:' . md5(implode(',', $tokenSymbols) . ":{$chain}");

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($tokenSymbols) {
            try {
                $ids = array_map([$this, 'getCoinGeckoId'], $tokenSymbols);
                $ids = array_filter($ids);

                $response = Http::timeout(10)->get(self::BASE_URL . '/simple/price', [
                    'ids' => implode(',', $ids),
                    'vs_currencies' => 'usd',
                ]);

                if (!$response->successful()) {
                    return [];
                }

                $data = $response->json();
                $prices = [];

                foreach ($tokenSymbols as $symbol) {
                    $id = $this->getCoinGeckoId($symbol);
                    if ($id && isset($data[$id]['usd'])) {
                        $prices[$symbol] = $data[$id]['usd'];
                    }
                }

                return $prices;
            } catch (\Exception $e) {
                \Log::error('CoinGecko multiple prices error', [
                    'tokens' => $tokenSymbols,
                    'error' => $e->getMessage(),
                ]);

                return [];
            }
        });
    }

    /**
     * Get price history for a token.
     */
    public function getPriceHistory(string $tokenSymbol, string $chain, string $period = '1w'): array
    {
        $cacheKey = "history:coingecko:{$tokenSymbol}:{$chain}:{$period}";

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($tokenSymbol, $period) {
            try {
                $days = match ($period) {
                    '1d' => 1,
                    '3d' => 3,
                    '1w' => 7,
                    '1m' => 30,
                    '3m' => 90,
                    '6m' => 180,
                    '1y' => 365,
                    default => 7,
                };

                $response = Http::timeout(10)->get(self::BASE_URL . "/coins/{$this->getCoinGeckoId($tokenSymbol)}/market_chart", [
                    'vs_currency' => 'usd',
                    'days' => $days,
                ]);

                if (!$response->successful()) {
                    return [];
                }

                $data = $response->json();

                return array_map(function ($item) {
                    return [
                        'timestamp' => $item[0] / 1000, // Convert to seconds
                        'price_usd' => (string) $item[1],
                    ];
                }, $data['prices'] ?? []);
            } catch (\Exception $e) {
                \Log::error('CoinGecko price history error', [
                    'token' => $tokenSymbol,
                    'period' => $period,
                    'error' => $e->getMessage(),
                ]);

                return [];
            }
        });
    }

    /**
     * Search for tokens by query.
     */
    public function searchTokens(string $query, string $chain): array
    {
        try {
            $response = Http::timeout(10)->get(self::BASE_URL . '/search', [
                'query' => $query,
            ]);

            if (!$response->successful()) {
                return [];
            }

            $data = $response->json();

            return array_map(function ($coin) {
                return [
                    'symbol' => strtoupper($coin['symbol']),
                    'name' => $coin['name'],
                    'coingecko_id' => $coin['id'],
                ];
            }, array_slice($data['coins'] ?? [], 0, 10));
        } catch (\Exception $e) {
            \Log::error('CoinGecko search error', [
                'query' => $query,
                'error' => $e->getMessage(),
            ]);

            return [];
        }
    }

    /**
     * Get CoinGecko ID for token symbol.
     */
    private function getCoinGeckoId(string $symbol): ?string
    {
        $mapping = [
            'BTC' => 'bitcoin',
            'ETH' => 'ethereum',
            'USDT' => 'tether',
            'USDC' => 'usd-coin',
            'SOL' => 'solana',
            'MATIC' => 'matic-network',
            'SUI' => 'sui',
        ];

        return $mapping[strtoupper($symbol)] ?? strtolower($symbol);
    }
}
