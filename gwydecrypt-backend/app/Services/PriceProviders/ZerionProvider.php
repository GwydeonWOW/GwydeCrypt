<?php

namespace App\Services\PriceProviders;

use App\Services\PriceProviders\Contracts\PriceProviderInterface;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;

class ZerionProvider implements PriceProviderInterface
{
    private const BASE_URL = 'https://api.zerion.io/v1';
    private const CACHE_TTL = 300;

    public function getName(): string
    {
        return 'Zerion';
    }

    public function getPriority(): int
    {
        return 2;
    }

    public function isAvailable(): bool
    {
        // Implement availability check
        return true;
    }

    public function getTokenPrice(string $tokenSymbol, string $chain): ?float
    {
        // Implementation
        return null;
    }

    public function getMultipleTokenPrices(array $tokenSymbols, string $chain): array
    {
        // Implementation
        return [];
    }

    public function getPriceHistory(string $tokenSymbol, string $chain, string $period = '1w'): array
    {
        // Implementation
        return [];
    }

    public function searchTokens(string $query, string $chain): array
    {
        // Implementation
        return [];
    }
}
