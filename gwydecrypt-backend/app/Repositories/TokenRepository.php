<?php

namespace App\Repositories;

use App\Models\Token;
use App\Repositories\Contracts\TokenRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;

class TokenRepository implements TokenRepositoryInterface
{
    /**
     * Find token by ID.
     */
    public function find(int $id): ?Token
    {
        return Token::find($id);
    }

    /**
     * Find token by symbol.
     */
    public function findBySymbol(string $symbol): ?Token
    {
        return Token::where('symbol', strtoupper($symbol))->first();
    }

    /**
     * Get all tokens.
     */
    public function all(): Collection
    {
        return Token::orderBy('symbol')->get();
    }

    /**
     * Get tokens by chain.
     */
    public function getByChain(string $chain): Collection
    {
        return Token::where('chain', $chain)
            ->orderBy('symbol')
            ->get();
    }

    /**
     * Get active tokens.
     */
    public function getActive(): Collection
    {
        return Token::where('is_active', true)
            ->orderBy('symbol')
            ->get();
    }

    /**
     * Create a new token.
     */
    public function create(array $data): Token
    {
        return Token::create($data);
    }

    /**
     * Update token.
     */
    public function update(int $id, array $data): bool
    {
        $token = $this->find($id);

        if (!$token) {
            return false;
        }

        return $token->update($data);
    }

    /**
     * Delete token.
     */
    public function delete(int $id): bool
    {
        $token = $this->find($id);

        if (!$token) {
            return false;
        }

        return $token->delete();
    }

    /**
     * Update token price.
     */
    public function updatePrice(int $id, float $priceUsd): bool
    {
        $token = $this->find($id);

        if (!$token) {
            return false;
        }

        $token->update([
            'price_usd' => $priceUsd,
            'last_price_update' => now(),
        ]);

        return true;
    }

    /**
     * Get token price history.
     */
    public function getPriceHistory(int $tokenId, string $period = '1w'): Collection
    {
        return Token::find($tokenId)
            ?->priceHistory()
            ->inPeriod($period)
            ->orderBy('timestamp', 'asc')
            ->get() ?? collect();
    }
}
