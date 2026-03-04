<?php

namespace App\Repositories\Contracts;

use App\Models\Token;
use Illuminate\Database\Eloquent\Collection;

interface TokenRepositoryInterface
{
    /**
     * Find token by ID.
     */
    public function find(int $id): ?Token;

    /**
     * Find token by symbol.
     */
    public function findBySymbol(string $symbol): ?Token;

    /**
     * Get all tokens.
     */
    public function all(): Collection;

    /**
     * Get tokens by chain.
     */
    public function getByChain(string $chain): Collection;

    /**
     * Get active tokens.
     */
    public function getActive(): Collection;

    /**
     * Create a new token.
     */
    public function create(array $data): Token;

    /**
     * Update token.
     */
    public function update(int $id, array $data): bool;

    /**
     * Delete token.
     */
    public function delete(int $id): bool;

    /**
     * Update token price.
     */
    public function updatePrice(int $id, float $priceUsd): bool;

    /**
     * Get token price history.
     */
    public function getPriceHistory(int $tokenId, string $period = '1w'): Collection;
}
