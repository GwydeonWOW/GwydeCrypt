<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PriceFetchLog extends Model
{
    protected $fillable = [
        'id',
        'token_id',
        'provider_id',
        'attempt_number',
        'success',
        'price_usd',
        'error_message',
        'response_time_ms',
        'timestamp',
    ];

    protected $casts = [
        'price_usd' => 'decimal:8',
        'success' => 'boolean',
        'timestamp' => 'datetime',
    ];

    /**
     * Set the success attribute - ensure proper boolean type for PostgreSQL
     */
    protected function setSuccessAttribute($value): void
    {
        $this->attributes['success'] = $value ? 'true' : 'false';
    }

    /**
     * Get the token that owns the log.
     */
    public function token(): BelongsTo
    {
        return $this->belongsTo(Token::class);
    }

    /**
     * Get the provider that owns the log.
     */
    public function provider(): BelongsTo
    {
        return $this->belongsTo(ApiProvider::class);
    }

    /**
     * Scope to get successful logs.
     */
    public function scopeSuccessful($query)
    {
        return $query->where('success', true);
    }

    /**
     * Scope to get failed logs.
     */
    public function scopeFailed($query)
    {
        return $query->where('success', false);
    }

    /**
     * Scope to get logs for a period.
     */
    public function scopeInPeriod($query, string $period)
    {
        $now = now();

        return match($period) {
            '1d' => $query->where('timestamp', '>=', $now->subDay()),
            '1w' => $query->where('timestamp', '>=', $now->subWeek()),
            '1m' => $query->where('timestamp', '>=', $now->subMonth()),
            default => $query->where('timestamp', '>=', $now->subDay()),
        };
    }
}
