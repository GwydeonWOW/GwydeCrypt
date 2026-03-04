<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PortfolioSnapshot extends Model
{
    protected $fillable = [
        'id',
        'user_id',
        'total_value_usd',
        'wallet_count',
        'token_count',
        'chains_distribution',
        'snapshot_at',
    ];

    protected $casts = [
        'total_value_usd' => 'decimal:2',
        'chains_distribution' => 'array',
        'snapshot_at' => 'datetime',
    ];

    /**
     * Get the user that owns the snapshot.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Scope to get snapshots for a period.
     */
    public function scopeInPeriod($query, string $period)
    {
        $now = now();

        return match($period) {
            '1d' => $query->where('snapshot_at', '>=', $now->subDay()),
            '1w' => $query->where('snapshot_at', '>=', $now->subWeek()),
            '1m' => $query->where('snapshot_at', '>=', $now->subMonth()),
            '3m' => $query->where('snapshot_at', '>=', $now->subMonths(3)),
            '6m' => $query->where('snapshot_at', '>=', $now->subMonths(6)),
            '1y' => $query->where('snapshot_at', '>=', $now->subYear()),
            'all' => $query,
            default => $query->where('snapshot_at', '>=', $now->subWeek()),
        };
    }

    /**
     * Check if snapshot is profitable.
     */
    public function isProfitable(): bool
    {
        // This would require comparing with a previous snapshot
        return true;
    }
}
