<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Wallet extends Model
{
    protected $fillable = [
        'id',
        'user_id',
        'address',
        'chain',
        'label',
        'is_active',
        'last_synced_at',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'last_synced_at' => 'datetime',
    ];

    /**
     * Set the is_active attribute - ensure proper boolean type for PostgreSQL
     */
    protected function setIsActiveAttribute($value): void
    {
        $this->attributes['is_active'] = $value ? 'true' : 'false';
    }

    /**
     * Get the user that owns the wallet.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the tokens for the wallet.
     */
    public function tokens(): BelongsToMany
    {
        return $this->belongsToMany(Token::class, 'wallet_tokens')
            ->withPivot('balance', 'balance_usd', 'first_seen_at', 'last_updated_at')
            ->withTimestamps();
    }

    /**
     * Get the wallet tokens records.
     */
    public function walletTokens(): HasMany
    {
        return $this->hasMany(WalletToken::class);
    }

    /**
     * Scope to get only active wallets.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to filter by chain.
     */
    public function scopeByChain($query, string $chain)
    {
        return $query->where('chain', $chain);
    }

    /**
     * Get total value in USD for this wallet.
     */
    public function getTotalValueAttribute(): float
    {
        return (float) $this->walletTokens()->sum('balance_usd');
    }
}
