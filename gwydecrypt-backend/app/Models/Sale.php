<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Sale extends Model
{
    protected $fillable = [
        'investment_id',
        'amount_sold',
        'sale_price_per_token',
        'sale_total_usd',
        'sale_date',
        'avg_buy_price',
        'pnl_usd',
        'pnl_percent',
        'notes',
    ];

    protected $casts = [
        'amount_sold' => 'decimal:18',
        'sale_price_per_token' => 'decimal:6',
        'sale_total_usd' => 'decimal:2',
        'sale_date' => 'datetime',
        'avg_buy_price' => 'decimal:6',
        'pnl_usd' => 'decimal:2',
        'pnl_percent' => 'decimal:2',
    ];

    public function investment(): BelongsTo
    {
        return $this->belongsTo(Investment::class);
    }

    /**
     * Scope to filter by user
     */
    public function scopeForUser($query, $user)
    {
        return $query->whereHas('investment', function ($q) use ($user) {
            $q->where('user_id', $user->id);
        });
    }

    /**
     * Scope to order by sale date
     */
    public function scopeOrderBySaleDate($query, string $direction = 'desc')
    {
        return $query->orderBy('sale_date', $direction);
    }
}
