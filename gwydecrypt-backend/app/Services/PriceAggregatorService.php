<?php

namespace App\Services;

use App\Models\ApiProvider;
use App\Models\PriceFetchLog;
use App\Models\PriceHistory;
use App\Models\Token;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Carbon\Carbon;

class PriceAggregatorService
{
    /** @var array Temporary storage for 24h change during fetch */
    protected array $lastChange24h = [];

    /**
     * Fetch price for a single token with fallback.
     */
    public function fetchPrice(Token $token): ?float
    {
        // Check cache first
        $cacheKey = "token_price_{$token->id}";
        if (Cache::has($cacheKey)) {
            return Cache::get($cacheKey);
        }

        // Get active providers ordered by priority
        $providers = ApiProvider::active()
            ->orderByPriority()
            ->get();

        $price = null;

        // Try each provider in priority order
        foreach ($providers as $provider) {
            $startTime = microtime(true);

            try {
                $price = $this->fetchFromProvider($token, $provider);

                $responseTime = (int) ((microtime(true) - $startTime) * 1000);

                if ($price !== null) {
                    // Log success
                    $this->logFetch($token, $provider, true, $price, null, $responseTime);

                    // Update provider stats
                    $provider->increment('success_count');
                    $provider->update(['last_used_at' => now()]);

                    // Cache the price
                    Cache::put($cacheKey, $price, 60); // 1 minute

                    // Get 24h change if available, otherwise null
                    $change24h = $this->lastChange24h[$token->id] ?? null;
                    unset($this->lastChange24h[$token->id]);

                    // Store in price history
                    $this->storePriceHistory($token, $price, $change24h);

                    return $price;
                }
            } catch (\Exception $e) {
                $responseTime = (int) ((microtime(true) - $startTime) * 1000);

                // Log failure
                $this->logFetch($token, $provider, false, null, $e->getMessage(), $responseTime);

                // Update provider stats
                $provider->increment('failure_count');

                // Try next provider
                continue;
            }
        }

        // All providers failed
        return null;
    }

    /**
     * Fetch prices for multiple tokens.
     */
    public function fetchBatchPrices(array $tokens): array
    {
        $prices = [];

        foreach ($tokens as $token) {
            $prices[$token->id] = $this->fetchPrice($token);
        }

        return $prices;
    }

    /**
     * Fetch historical price.
     */
    public function fetchHistoricalPrice(Token $token, Carbon $date): ?float
    {
        // Check database first
        $history = PriceHistory::where('token_id', $token->id)
            ->whereDate('timestamp', $date)
            ->first();

        if ($history) {
            return (float) $history->price_usd;
        }

        // If not in database, try to fetch from CoinGecko
        $coingeckoProvider = ApiProvider::where('name', 'coingecko')->first();
        if (!$coingeckoProvider || !$coingeckoProvider->is_active) {
            return null;
        }

        try {
            $apiKey = $coingeckoProvider->decrypted_api_key;
            $baseUrl = $coingeckoProvider->base_url;

            $response = Http::withoutVerifying()->withHeaders([
                'accept' => 'application/json',
            ])->when($apiKey, fn($http) => $http->withToken($apiKey))
            ->get("{$baseUrl}/coins/{$token->coingecko_id}/history", [
                'date' => $date->format('d-m-Y'),
            ]);

            if ($response->successful()) {
                $data = $response->json();
                return $data['market_data']['current_price']['usd'] ?? null;
            }
        } catch (\Exception $e) {
            // Log error if needed
        }

        return null;
    }

    /**
     * Fetch price history for charts.
     */
    public function fetchPriceHistory(Token $token, string $period = '1w'): \Illuminate\Database\Eloquent\Collection
    {
        // Check if we have enough data in database
        $history = PriceHistory::where('token_id', $token->id)
            ->inPeriod($period)
            ->orderBy('timestamp')
            ->get();

        // If we have data, return it
        if ($history->count() > 0) {
            return $history;
        }

        // If no data, try to fetch from CoinGecko and store it
        $this->fetchAndStorePriceHistoryFromCoinGecko($token, $period);

        // Try again after fetching
        return PriceHistory::where('token_id', $token->id)
            ->inPeriod($period)
            ->orderBy('timestamp')
            ->get();
    }

    /**
     * Fetch and store price history from CoinGecko.
     */
    protected function fetchAndStorePriceHistoryFromCoinGecko(Token $token, string $period = '1w'): void
    {
        if (!$token->coingecko_id) {
            return;
        }

        $coingeckoProvider = ApiProvider::where('name', 'coingecko')->first();
        if (!$coingeckoProvider || !$coingeckoProvider->is_active) {
            return;
        }

        try {
            $apiKey = $coingeckoProvider->decrypted_api_key;
            $baseUrl = $coingeckoProvider->base_url;

            // Map period to CoinGecko days
            $days = match($period) {
                '1d' => 1,
                '3d' => 3,
                '1w' => 7,
                '1m' => 30,
                '3m' => 90,
                '6m' => 180,
                '1y' => 365,
                default => 7,
            };

            $response = Http::withoutVerifying()->withHeaders([
                'accept' => 'application/json',
            ])->when($apiKey, fn($http) => $http->withToken($apiKey))
            ->get("{$baseUrl}/coins/{$token->coingecko_id}/market_chart", [
                'vs_currency' => 'usd',
                'days' => $days,
            ]);

            if ($response->successful()) {
                $data = $response->json();
                $prices = $data['prices'] ?? [];

                // Store each price point
                foreach ($prices as $pricePoint) {
                    [$timestamp, $price] = $pricePoint;

                    PriceHistory::updateOrCreate(
                        [
                            'token_id' => $token->id,
                            'timestamp' => Carbon::createFromTimestampMs($timestamp),
                        ],
                        [
                            'price_usd' => $price,
                        ]
                    );
                }
            }
        } catch (\Exception $e) {
            // Log error but don't throw - we'll return empty collection
            \Log::error("Error fetching price history for token {$token->symbol}: " . $e->getMessage());
        }
    }

    /**
     * Get prices for popular tokens.
     */
    public function getPopularTokensPrices(): array
    {
        $popularTokens = Token::popular()->get();
        return $this->fetchBatchPrices($popularTokens->all());
    }

    /**
     * Fetch from specific provider.
     */
    protected function fetchFromProvider(Token $token, ApiProvider $provider): ?float
    {
        return match($provider->name) {
            'coingecko' => $this->fetchFromCoinGecko($token, $provider),
            'zerion' => $this->fetchFromZerion($token, $provider),
            'jupiter' => $this->fetchFromJupiter($token, $provider),
            default => null,
        };
    }

    /**
     * Fetch from CoinGecko.
     */
    protected function fetchFromCoinGecko(Token $token, ApiProvider $provider): ?float
    {
        if (!$token->coingecko_id) {
            return null;
        }

        $apiKey = $provider->decrypted_api_key;
        $baseUrl = $provider->base_url;

        $response = Http::withoutVerifying()->withHeaders([
            'accept' => 'application/json',
        ])->when($apiKey, fn($http) => $http->withToken($apiKey))
        ->get("{$baseUrl}/simple/price", [
            'ids' => $token->coingecko_id,
            'vs_currencies' => 'usd',
            'include_24hr_change' => 'true',
        ]);

        if ($response->successful()) {
            $data = $response->json();
            $price = $data[$token->coingecko_id]['usd'] ?? null;
            $change24h = $data[$token->coingecko_id]['usd_24h_change'] ?? null;

            // Store the 24h change temporarily
            if ($price !== null) {
                $this->lastChange24h[$token->id] = $change24h;
            }

            return $price;
        }

        return null;
    }

    /**
     * Fetch from Zerion.
     */
    protected function fetchFromZerion(Token $token, ApiProvider $provider): ?float
    {
        if (!$token->zerion_id && !$token->contract_address) {
            return null;
        }

        $apiKey = $provider->decrypted_api_key;
        if (!$apiKey) {
            return null;
        }

        $baseUrl = $provider->base_url;
        $tokenAddress = $token->zerion_id ?: $token->contract_address;

        $response = Http::withHeaders([
            'accept' => 'application/json',
        ])->withToken($apiKey)
        ->get("{$baseUrl}/fungibles/{$tokenAddress}");

        if ($response->successful()) {
            $data = $response->json();
            return $data['attributes']['price']['value'] ?? null;
        }

        return null;
    }

    /**
     * Fetch from Jupiter (Solana).
     */
    protected function fetchFromJupiter(Token $token, ApiProvider $provider): ?float
    {
        if ($token->chain !== 'sol' || !$token->contract_address) {
            return null;
        }

        $baseUrl = $provider->base_url;

        $response = Http::get("{$baseUrl}/price", [
            'ids' => $token->contract_address,
        ]);

        if ($response->successful()) {
            $data = $response->json();
            return $data['data'][$token->contract_address]['price'] ?? null;
        }

        return null;
    }

    /**
     * Store price in history.
     */
    protected function storePriceHistory(Token $token, float $price, ?float $change24h = null): void
    {
        // Calculate 24h change if not provided
        if ($change24h === null) {
            $price24hAgo = PriceHistory::where('token_id', $token->id)
                ->where('timestamp', '>=', now()->subHours(25))
                ->where('timestamp', '<=', now()->subHours(23))
                ->orderBy('timestamp', 'desc')
                ->first();

            if ($price24hAgo && $price24hAgo->price_usd > 0) {
                $change24h = (($price - $price24hAgo->price_usd) / $price24hAgo->price_usd) * 100;
            } else {
                $change24h = 0;
            }
        }

        PriceHistory::create([
            'token_id' => $token->id,
            'price_usd' => $price,
            'price_change_24h' => $change24h,
            'timestamp' => now(),
        ]);
    }

    /**
     * Log price fetch attempt.
     */
    protected function logFetch(
        Token $token,
        ApiProvider $provider,
        bool $success,
        ?float $price,
        ?string $errorMessage,
        int $responseTime
    ): void {
        try {
            PriceFetchLog::create([
                'token_id' => $token->id,
                'provider_id' => $provider->id,
                'success' => $success,
                'price_usd' => $price,
                'error_message' => $errorMessage,
                'response_time_ms' => $responseTime,
                'timestamp' => now(),
            ]);
        } catch (\Exception $e) {
            // If logging fails, don't break the price fetching
            \Log::warning("Failed to log price fetch: " . $e->getMessage());
        }
    }

    /**
     * Cache prices from batch fetch.
     */
    public function cachePrices(array $prices): void
    {
        foreach ($prices as $tokenId => $price) {
            if ($price !== null) {
                Cache::put("token_price_{$tokenId}", $price, 60);
            }
        }
    }
}
