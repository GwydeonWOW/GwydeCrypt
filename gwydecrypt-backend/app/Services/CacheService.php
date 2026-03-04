<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Redis;

class CacheService
{
    private const DEFAULT_TTL = 3600; // 1 hour
    private const PRICE_TTL = 300; // 5 minutes
    private const PORTFOLIO_TTL = 600; // 10 minutes

    /**
     * Cache portfolio data.
     */
    public function cachePortfolioData(int $userId, array $data): void
    {
        Cache::put(
            "portfolio:{$userId}",
            $data,
            self::PORTFOLIO_TTL
        );
    }

    /**
     * Get cached portfolio data.
     */
    public function getCachedPortfolioData(int $userId): ?array
    {
        return Cache::get("portfolio:{$userId}");
    }

    /**
     * Cache token price.
     */
    public function cacheTokenPrice(string $symbol, string $chain, float $price): void
    {
        Cache::put(
            "price:{$chain}:{$symbol}",
            $price,
            self::PRICE_TTL
        );
    }

    /**
     * Get cached token price.
     */
    public function getCachedTokenPrice(string $symbol, string $chain): ?float
    {
        return Cache::get("price:{$chain}:{$symbol}");
    }

    /**
     * Cache multiple token prices.
     */
    public function cacheMultiplePrices(string $chain, array $prices): void
    {
        foreach ($prices as $symbol => $price) {
            $this->cacheTokenPrice($symbol, $chain, $price);
        }
    }

    /**
     * Get multiple cached token prices.
     */
    public function getMultipleCachedPrices(string $chain, array $symbols): array
    {
        $prices = [];

        foreach ($symbols as $symbol) {
            $price = $this->getCachedTokenPrice($symbol, $chain);
            if ($price !== null) {
                $prices[$symbol] = $price;
            }
        }

        return $prices;
    }

    /**
     * Clear portfolio cache.
     */
    public function clearPortfolioCache(int $userId): void
    {
        Cache::forget("portfolio:{$userId}");
    }

    /**
     * Clear all price caches for a chain.
     */
    public function clearPriceCache(string $chain): void
    {
        $keys = Cache::get("prices:{$chain}:keys", []);

        foreach ($keys as $key) {
            Cache::forget($key);
        }

        Cache::forget("prices:{$chain}:keys");
    }

    /**
     * Cache calculation result.
     */
    public function cacheCalculation(string $key, $value, int $ttl = null): void
    {
        Cache::put(
            "calc:{$key}",
            $value,
            $ttl ?? self::DEFAULT_TTL
        );
    }

    /**
     * Get cached calculation.
     */
    public function getCachedCalculation(string $key): mixed
    {
        return Cache::get("calc:{$key}");
    }

    /**
     * Remember calculation result.
     */
    public function rememberCalculation(string $key, callable $callback, int $ttl = null): mixed
    {
        return Cache::remember(
            "calc:{$key}",
            $ttl ?? self::DEFAULT_TTL,
            $callback
        );
    }

    /**
     * Generate cache key with parameters.
     */
    public function generateKey(string $prefix, array $params = []): string
    {
        $paramsStr = empty($params) ? '' : ':' . md5(json_encode($params));
        return $prefix . $paramsStr;
    }
}
