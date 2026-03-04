<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Investment extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'user_id',
        'token_id',
        'chain',
        'amount_purchased',
        'amount_remaining',
        'purchase_price_per_token',
        'original_purchase_price',
        'purchase_total_usd',
        'purchase_date',
        'notes',
    ];

    protected $casts = [
        'amount_purchased' => 'decimal:18',
        'amount_remaining' => 'decimal:18',
        'purchase_price_per_token' => 'decimal:6',
        'original_purchase_price' => 'decimal:6',
        'purchase_total_usd' => 'decimal:2',
        'purchase_date' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function token(): BelongsTo
    {
        return $this->belongsTo(Token::class);
    }

    public function sales(): HasMany
    {
        return $this->hasMany(Sale::class);
    }

    /**
     * Calculate current value based on latest token price
     */
    public function getCurrentValueAttribute(): float
    {
        $priceService = app(\App\Services\PriceAggregatorService::class);

        // Get the chain-specific data for this token
        $tokenChain = $this->token->tokenChains()->where('chain', $this->chain)->first();

        if (!$tokenChain) {
            return 0;
        }

        $currentPrice = $priceService->fetchPrice($this->token, $this->chain);

        return $currentPrice !== null
            ? (float) $this->amount_purchased * $currentPrice
            : 0;
    }

    /**
     * Calculate PnL in USD
     */
    public function getPnlUsdAttribute(): float
    {
        return $this->current_value - (float) $this->purchase_total_usd;
    }

    /**
     * Calculate PnL percentage
     */
    public function getPnlPercentAttribute(): float
    {
        if ($this->purchase_total_usd == 0) return 0;
        return (($this->current_value - (float) $this->purchase_total_usd) / (float) $this->purchase_total_usd) * 100;
    }

    /**
     * Scope to filter by user
     */
    public function scopeForUser($query, $user)
    {
        return $query->where('user_id', $user->id);
    }

    /**
     * Scope to filter by chain
     */
    public function scopeByChain($query, string $chain)
    {
        return $query->where('chain', $chain);
    }

    /**
     * Scope to order by purchase date
     */
    public function scopeOrderByPurchaseDate($query, string $direction = 'desc')
    {
        return $query->orderBy('purchase_date', $direction);
    }

    /**
     * Scope to get investments with remaining amount
     */
    public function scopeWithRemaining($query)
    {
        return $query->where('amount_remaining', '>', 0);
    }

    /**
     * Get total sold amount
     */
    public function getTotalSoldAttribute(): float
    {
        return (float) $this->amount_purchased - (float) ($this->amount_remaining ?? $this->amount_purchased);
    }

    /**
     * Get average buy price considering all purchases
     */
    public function getAverageBuyPriceAttribute(): float
    {
        return (float) ($this->original_purchase_price ?? $this->purchase_price_per_token);
    }
}
