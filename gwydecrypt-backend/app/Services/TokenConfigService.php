<?php

namespace App\Services;

use App\Models\Token;
use App\Models\ApiProvider;
use Illuminate\Support\Facades\Http;

class TokenConfigService
{
    /**
     * Add new token.
     */
    public function addToken(array $data): Token
    {
        // Create token without chain-specific data
        $token = Token::create([
            'coingecko_id' => $data['coingecko_id'] ?? null,
            'zerion_id' => $data['zerion_id'] ?? null,
            'jupiter_id' => $data['jupiter_id'] ?? null,
            'symbol' => strtoupper($data['symbol']),
            'name' => $data['name'],
            'logo_url' => $data['logo_url'] ?? null,
            'is_popular' => $data['is_popular'] ?? false,
            'primary_provider' => $data['primary_provider'] ?? 'coingecko',
        ]);

        // Add chain-specific data
        foreach ($data['chains'] as $chainData) {
            \App\Models\TokenChain::create([
                'token_id' => $token->id,
                'chain' => $chainData['chain'],
                'contract_address' => $chainData['contract_address'] ?? null,
                'decimals' => $chainData['decimals'] ?? 18,
                'tradingview_symbol' => $chainData['tradingview_symbol'] ?? null,
            ]);
        }

        return $token->fresh('tokenChains');
    }

    /**
     * Update token.
     */
    public function updateToken(string $tokenId, array $data): Token
    {
        $token = Token::findOrFail($tokenId);

        // Update token basic data
        $updateData = [
            'symbol' => $data['symbol'] ?? $token->symbol,
            'name' => $data['name'] ?? $token->name,
            'coingecko_id' => $data['coingecko_id'] ?? $token->coingecko_id,
            'zerion_id' => $data['zerion_id'] ?? $token->zerion_id,
            'jupiter_id' => $data['jupiter_id'] ?? $token->jupiter_id,
            'logo_url' => $data['logo_url'] ?? $token->logo_url,
            'is_popular' => $data['is_popular'] ?? $token->is_popular,
            'primary_provider' => $data['primary_provider'] ?? $token->primary_provider,
        ];

        $token->update($updateData);

        // Update chains if provided
        if (isset($data['chains'])) {
            // Delete existing chains
            \App\Models\TokenChain::where('token_id', $token->id)->delete();

            // Add new chains
            foreach ($data['chains'] as $chainData) {
                \App\Models\TokenChain::create([
                    'token_id' => $token->id,
                    'chain' => $chainData['chain'],
                    'contract_address' => $chainData['contract_address'] ?? null,
                    'decimals' => $chainData['decimals'] ?? 18,
                    'tradingview_symbol' => $chainData['tradingview_symbol'] ?? null,
                ]);
            }
        }

        return $token->fresh('tokenChains');
    }

    /**
     * Delete token.
     */
    public function deleteToken(string $tokenId): void
    {
        $token = Token::findOrFail($tokenId);
        $token->delete();
    }

    /**
     * List tokens with filters.
     */
    public function listTokens(array $filters = []): \Illuminate\Database\Eloquent\Collection
    {
        $query = Token::with('tokenChains');

        if (isset($filters['chain'])) {
            $query->byChain($filters['chain']);
        }

        if (isset($filters['popular'])) {
            $query->popular();
        }

        if (isset($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('symbol', 'ilike', "%{$search}%")
                  ->orWhere('name', 'ilike', "%{$search}%");
            });
        }

        return $query->get();
    }

    /**
     * Get token by symbol and chain.
     */
    public function getTokenBySymbolAndChain(string $symbol, string $chain): ?Token
    {
        return Token::where('symbol', strtoupper($symbol))
            ->where('chain', $chain)
            ->first();
    }

    /**
     * Set CoinGecko ID.
     */
    public function setCoinGeckoId(Token $token, string $coingeckoId): void
    {
        $token->update(['coingecko_id' => $coingeckoId]);
    }

    /**
     * Set Zerion ID.
     */
    public function setZerionId(Token $token, string $zerionId): void
    {
        $token->update(['zerion_id' => $zerionId]);
    }

    /**
     * Set Jupiter ID.
     */
    public function setJupiterId(Token $token, string $jupiterId): void
    {
        $token->update(['jupiter_id' => $jupiterId]);
    }

    /**
     * Set primary provider.
     */
    public function setPrimaryProvider(Token $token, string $provider): void
    {
        if (!in_array($provider, ['coingecko', 'zerion', 'jupiter'])) {
            throw new \InvalidArgumentException('Invalid provider');
        }

        $token->update(['primary_provider' => $provider]);
    }

    /**
     * Import tokens from API.
     */
    public function importTokensFromApi(string $provider, string $chain): \Illuminate\Support\Collection
    {
        return match($provider) {
            'coingecko' => $this->importFromCoinGecko($chain),
            'zerion' => $this->importFromZerion($chain),
            'jupiter' => $this->importFromJupiter($chain),
            default => collect(),
        };
    }

    /**
     * Sync token metadata.
     */
    public function syncTokenMetadata(Token $token): Token
    {
        // Fetch latest metadata from CoinGecko
        if ($token->coingecko_id) {
            $metadata = $this->fetchCoinGeckoMetadata($token->coingecko_id);

            if ($metadata) {
                $token->update([
                    'name' => $metadata['name'] ?? $token->name,
                    'symbol' => $metadata['symbol'] ?? $token->symbol,
                    'logo_url' => $metadata['image'] ?? $token->logo_url,
                ]);
            }
        }

        return $token->fresh();
    }

    /**
     * Import from CoinGecko.
     */
    protected function importFromCoinGecko(string $chain): \Illuminate\Support\Collection
    {
        $platformMap = [
            'eth' => 'ethereum',
            'polygon' => 'polygon-pos',
            'sol' => 'solana',
            'sui' => null, // CoinGecko doesn't have SUI platform
        ];

        $platform = $platformMap[$chain] ?? null;

        if (!$platform) {
            return collect();
        }

        $provider = ApiProvider::where('name', 'coingecko')->first();
        if (!$provider) {
            return collect();
        }

        try {
            $response = Http::get("{$provider->base_url}/coins/{$platform}/contract");

            if ($response->successful()) {
                $tokens = $response->json();
                return collect($tokens)->map(function ($token) use ($chain) {
                    return [
                        'coingecko_id' => $token['id'],
                        'symbol' => strtoupper($token['symbol']),
                        'name' => $token['name'],
                        'chain' => $chain,
                        'contract_address' => $token['contract_address'] ?? null,
                        'logo_url' => $token['image'] ?? null,
                    ];
                });
            }
        } catch (\Exception $e) {
            // Log error
        }

        return collect();
    }

    /**
     * Import from Zerion.
     */
    protected function importFromZerion(string $chain): \Illuminate\Support\Collection
    {
        $provider = ApiProvider::where('name', 'zerion')->first();
        if (!$provider || !$provider->is_active) {
            return collect();
        }

        try {
            $chainMap = [
                'eth' => 'ethereum',
                'polygon' => 'polygon',
                'sol' => 'solana',
            ];

            $chainId = $chainMap[$chain] ?? null;
            if (!$chainId) {
                return collect();
            }

            $response = Http::withToken($provider->decrypted_api_key)
                ->get("{$provider->base_url}/fungibles", [
                    'filter[chain_ids]' => $chainId,
                ]);

            if ($response->successful()) {
                $tokens = $response->json()['data'] ?? [];
                return collect($tokens)->map(function ($token) use ($chain) {
                    $attributes = $token['attributes'];
                    return [
                        'zerion_id' => $token['id'],
                        'symbol' => strtoupper($attributes['symbol']),
                        'name' => $attributes['name'],
                        'chain' => $chain,
                        'contract_address' => $attributes['address'] ?? null,
                        'logo_url' => $attributes['icon']['url'] ?? null,
                        'decimals' => $attributes['decimals'] ?? 18,
                    ];
                });
            }
        } catch (\Exception $e) {
            // Log error
        }

        return collect();
    }

    /**
     * Import from Jupiter.
     */
    protected function importFromJupiter(string $chain): \Illuminate\Support\Collection
    {
        if ($chain !== 'sol') {
            return collect();
        }

        $provider = ApiProvider::where('name', 'jupiter')->first();
        if (!$provider) {
            return collect();
        }

        try {
            $response = Http::get("{$provider->base_url}/list");

            if ($response->successful()) {
                $tokens = $response->json()['data'] ?? [];
                return collect($tokens)->map(function ($token) {
                    return [
                        'jupiter_id' => $token['id'],
                        'symbol' => $token['symbol'],
                        'name' => $token['name'] ?? $token['symbol'],
                        'chain' => 'sol',
                        'contract_address' => $token['address'],
                        'decimals' => $token['decimals'] ?? 9,
                        'logo_url' => $token['logoURI'] ?? null,
                    ];
                });
            }
        } catch (\Exception $e) {
            // Log error
        }

        return collect();
    }

    /**
     * Fetch metadata from CoinGecko.
     */
    protected function fetchCoinGeckoMetadata(string $coingeckoId): ?array
    {
        $provider = ApiProvider::where('name', 'coingecko')->first();
        if (!$provider) {
            return null;
        }

        try {
            $response = Http::get("{$provider->base_url}/coins/{$coingeckoId}");

            if ($response->successful()) {
                return $response->json();
            }
        } catch (\Exception $e) {
            // Log error
        }

        return null;
    }
}
