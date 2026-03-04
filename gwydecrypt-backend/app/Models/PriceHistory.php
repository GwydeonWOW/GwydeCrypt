<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PriceHistory extends Model
{
    protected $fillable = [
        'id',
        'token_id',
        'price_usd',
        'market_cap',
        'volume_24h',
        'price_change_24h',
        'timestamp',
    ];

    protected $casts = [
        'price_usd' => 'decimal:8',
        'market_cap' => 'decimal:2',
        'volume_24h' => 'decimal:2',
        'price_change_24h' => 'decimal:4',
        'timestamp' => 'datetime',
    ];

    /**
     * Get the token that owns the price history.
     */
    public function token(): BelongsTo
    {
        return $this->belongsTo(Token::class);
    }

    /**
     * Scope to get history for a date range.
     */
    public function scopeInPeriod($query, string $period)
    {
        $now = now();

        return match($period) {
            '1d' => $query->where('timestamp', '>=', $now->subDay()),
            '1w' => $query->where('timestamp', '>=', $now->subWeek()),
            '1m' => $query->where('timestamp', '>=', $now->subMonth()),
            '3m' => $query->where('timestamp', '>=', $now->subMonths(3)),
            '6m' => $query->where('timestamp', '>=', $now->subMonths(6)),
            '1y' => $query->where('timestamp', '>=', $now->subYear()),
            'all' => $query,
            default => $query->where('timestamp', '>=', $now->subWeek()),
        };
    }
}
