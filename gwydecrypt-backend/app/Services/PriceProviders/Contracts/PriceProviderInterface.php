<?php

namespace App\Services\PriceProviders\Contracts;

interface PriceProviderInterface
{
    /**
     * Get the provider name.
     */
    public function getName(): string;

    /**
     * Get the provider priority (lower = higher priority).
     */
    public function getPriority(): int;

    /**
     * Check if provider is available.
     */
    public function isAvailable(): bool;

    /**
     * Fetch token price from provider.
     */
    public function getTokenPrice(string $tokenSymbol, string $chain): ?float;

    /**
     * Fetch multiple token prices from provider.
     */
    public function getMultipleTokenPrices(array $tokenSymbols, string $chain): array;

    /**
     * Get price history for a token.
     */
    public function getPriceHistory(string $tokenSymbol, string $chain, string $period = '1w'): array;

    /**
     * Search for tokens by query.
     */
    public function searchTokens(string $query, string $chain): array;
}
