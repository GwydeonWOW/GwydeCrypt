<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ApiProvider extends Model
{
    protected $fillable = [
        'id',
        'name',
        'provider_type',
        'chain',
        'base_url',
        'api_key',
        'is_active',
        'priority',
        'rate_limit_per_minute',
        'rate_limit_per_day',
        'last_used_at',
        'success_count',
        'failure_count',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'last_used_at' => 'datetime',
    ];

    /**
     * Set the is_active attribute - ensure proper boolean type for PostgreSQL
     */
    protected function setIsActiveAttribute($value): void
    {
        $this->attributes['is_active'] = $value ? 'true' : 'false';
    }

    protected $hidden = [
        'api_key',
    ];

    /**
     * Get the price fetch logs for the provider.
     */
    public function priceFetchLogs(): HasMany
    {
        return $this->hasMany(PriceFetchLog::class, 'provider_id');
    }

    /**
     * Get success rate for the provider.
     */
    public function getSuccessRateAttribute(): float
    {
        $total = $this->success_count + $this->failure_count;
        if ($total === 0) {
            return 0.0;
        }
        return round(($this->success_count / $total) * 100, 2);
    }

    /**
     * Scope to get only active providers.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to get blockchain RPC providers.
     */
    public function scopeBlockchain($query)
    {
        return $query->where('provider_type', 'blockchain');
    }

    /**
     * Scope to get price providers.
     */
    public function scopePrice($query)
    {
        return $query->where('provider_type', 'price');
    }

    /**
     * Scope to filter by chain.
     */
    public function scopeForChain($query, string $chain)
    {
        return $query->where('chain', $chain);
    }

    /**
     * Scope to order by priority.
     */
    public function scopeOrderByPriority($query)
    {
        return $query->orderBy('priority', 'asc');
    }

    /**
     * Decrypt the API key.
     */
    public function getDecryptedApiKeyAttribute(): ?string
    {
        return $this->api_key ? decrypt($this->api_key) : null;
    }

    /**
     * Set the API key encrypted.
     */
    public function setApiKeyAttribute($value)
    {
        $this->attributes['api_key'] = $value ? encrypt($value) : null;
    }
}
