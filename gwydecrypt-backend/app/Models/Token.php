<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Token extends Model
{
    protected $fillable = [
        'id',
        'coingecko_id',
        'zerion_id',
        'jupiter_id',
        'symbol',
        'name',
        'logo_url',
        'is_popular',
        'primary_provider',
        'show_on_dashboard',
        'sort_order',
    ];

    protected $casts = [
        'is_popular' => 'boolean',
        'show_on_dashboard' => 'boolean',
    ];

    /**
     * Set the is_popular attribute - ensure proper boolean type for PostgreSQL
     */
    protected function setIsPopularAttribute($value): void
    {
        $this->attributes['is_popular'] = $value ? 'true' : 'false';
    }

    /**
     * Set the show_on_dashboard attribute - ensure proper boolean type for PostgreSQL
     */
    protected function setShowOnDashboardAttribute($value): void
    {
        $this->attributes['show_on_dashboard'] = $value ? 'true' : 'false';
    }

    /**
     * Get the wallets that have this token.
     */
    public function wallets(): BelongsToMany
    {
        return $this->belongsToMany(Wallet::class, 'wallet_tokens')
            ->withPivot('balance', 'balance_usd', 'first_seen_at', 'last_updated_at')
            ->withTimestamps();
    }

    /**
     * Get the chains where this token exists.
     */
    public function tokenChains(): HasMany
    {
        return $this->hasMany(\App\Models\TokenChain::class);
    }

    /**
     * Get the wallet tokens records.
     */
    public function walletTokens(): HasMany
    {
        return $this->hasMany(WalletToken::class);
    }

    /**
     * Get the price history for the token.
     */
    public function priceHistory(): HasMany
    {
        return $this->hasMany(PriceHistory::class);
    }

    /**
     * Get the price fetch logs.
     */
    public function priceFetchLogs(): HasMany
    {
        return $this->hasMany(PriceFetchLog::class);
    }

    /**
     * Get the latest price for the token.
     */
    public function latestPrice(): ?PriceHistory
    {
        return $this->priceHistory()->latest('timestamp')->first();
    }

    /**
     * Scope to get only popular tokens.
     */
    public function scopePopular($query)
    {
        return $query->where('is_popular', true);
    }

    /**
     * Scope to get tokens that should be shown on dashboard.
     */
    public function scopeForDashboard($query)
    {
        return $query->where('show_on_dashboard', true);
    }

    /**
     * Scope to filter by chain.
     */
    public function scopeByChain($query, string $chain)
    {
        return $query->whereHas('tokenChains', function ($q) use ($chain) {
            $q->where('chain', $chain);
        });
    }

    /**
     * Get chain data for a specific chain.
     */
    public function getChainData(string $chain): ?\App\Models\TokenChain
    {
        return $this->tokenChains()->where('chain', $chain)->first();
    }

    /**
     * Get all chains where this token exists.
     */
    public function getChains(): array
    {
        return $this->tokenChains->pluck('chain')->toArray();
    }

    /**
     * Get provider ID based on provider name.
     */
    public function getProviderId(string $provider): ?string
    {
        return match($provider) {
            'coingecko' => $this->coingecko_id,
            'zerion' => $this->zerion_id,
            'jupiter' => $this->jupiter_id,
            default => null,
        };
    }

    /**
     * Set provider ID based on provider name.
     */
    public function setProviderId(string $provider, ?string $id): void
    {
        match($provider) {
            'coingecko' => $this->coingecko_id = $id,
            'zerion' => $this->zerion_id = $id,
            'jupiter' => $this->jupiter_id = $id,
            default => null,
        };
    }
}
