<?php

namespace App\Services\PriceProviders;

use App\Services\PriceProviders\Contracts\PriceProviderInterface;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;

class JupiterProvider implements PriceProviderInterface
{
    private const BASE_URL = 'https://price.jup.ag';
    private const CACHE_TTL = 60; // 1 minute - Solana prices change faster

    public function getName(): string
    {
        return 'Jupiter';
    }

    public function getPriority(): int
    {
        return 1;
    }

    public function isAvailable(): bool
    {
        try {
            $response = Http::timeout(5)->get(self::BASE_URL . '/v6/price');
            return $response->successful();
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Fetch token price from Jupiter (Solana only).
     */
    public function getTokenPrice(string $tokenSymbol, string $chain): ?float
    {
        if ($chain !== 'sol') {
            return null;
        }

        $cacheKey = "price:jupiter:{$tokenSymbol}";

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($tokenSymbol) {
            try {
                $response = Http::timeout(10)->get(self::BASE_URL . '/v6/price', [
                    'ids' => $tokenSymbol,
                ]);

                if (!$response->successful()) {
                    return null;
                }

                $data = $response->json();
                return $data['data'][$tokenSymbol]['price'] ?? null;
            } catch (\Exception $e) {
                \Log::error('Jupiter price fetch error', [
                    'token' => $tokenSymbol,
                    'error' => $e->getMessage(),
                ]);

                return null;
            }
        });
    }

    public function getMultipleTokenPrices(array $tokenSymbols, string $chain): array
    {
        if ($chain !== 'sol') {
            return [];
        }

        $cacheKey = 'prices:jupiter:multiple:' . md5(implode(',', $tokenSymbols));

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($tokenSymbols) {
            try {
                $response = Http::timeout(10)->get(self::BASE_URL . '/v6/price', [
                    'ids' => implode(',', $tokenSymbols),
                ]);

                if (!$response->successful()) {
                    return [];
                }

                $data = $response->json();

                return array_map(function ($price) {
                    return $price['price'];
                }, $data['data'] ?? []);
            } catch (\Exception $e) {
                \Log::error('Jupiter multiple prices error', [
                    'tokens' => $tokenSymbols,
                    'error' => $e->getMessage(),
                ]);

                return [];
            }
        });
    }

    public function getPriceHistory(string $tokenSymbol, string $chain, string $period = '1w'): array
    {
        // Jupiter doesn't provide historical data
        return [];
    }

    public function searchTokens(string $query, string $chain): array
    {
        if ($chain !== 'sol') {
            return [];
        }

        // Jupiter API doesn't have search endpoint
        return [];
    }
}
