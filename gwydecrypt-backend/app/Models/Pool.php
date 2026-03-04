<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Query\Expression;

class Pool extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'pool_address',
        'chain_id',
        'chain_name',
        'protocol_id',
        'protocol_name',
        'protocol_url',
        'farm_type',
        'farm_address',
        'pool_symbol',
        'pool_is_stable',
        'pool_fee',
        'tvl_usd',
        'apy',
        'apy_base',
        'apy_reward',
        'is_stablecoin',
        'il_risk',
        'is_active',
        'is_killed',
        'vfat_synced_at',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'pool_is_stable' => 'boolean',
        'tvl_usd' => 'decimal:2',
        'apy' => 'decimal:2',
        'apy_base' => 'decimal:2',
        'apy_reward' => 'decimal:2',
        'is_stablecoin' => 'boolean',
        'is_active' => 'boolean',
        'is_killed' => 'boolean',
        'vfat_synced_at' => 'datetime',
    ];

    /**
     * Set boolean attributes - ensure proper boolean type for PostgreSQL
     */
    protected function setPoolIsStableAttribute($value): void
    {
        $this->attributes['pool_is_stable'] = $value ? 'true' : 'false';
    }

    protected function setIsStablecoinAttribute($value): void
    {
        $this->attributes['is_stablecoin'] = $value ? 'true' : 'false';
    }

    protected function setIsActiveAttribute($value): void
    {
        $this->attributes['is_active'] = $value ? 'true' : 'false';
    }

    protected function setIsKilledAttribute($value): void
    {
        $this->attributes['is_killed'] = $value ? 'true' : 'false';
    }

    /**
     * Get the assets for the pool.
     */
    public function assets(): HasMany
    {
        return $this->hasMany(PoolAsset::class);
    }

    /**
     * Get the rewards for the pool.
     */
    public function rewards(): HasMany
    {
        return $this->hasMany(PoolReward::class);
    }

    /**
     * Scope to filter by active pools only.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', new Expression('TRUE'))
            ->where('is_killed', new Expression('FALSE'));
    }

    /**
     * Scope to filter by chain.
     */
    public function scopeByChain($query, string $chainName)
    {
        return $query->where('chain_name', $chainName);
    }

    /**
     * Scope to filter by minimum TVL.
     */
    public function scopeMinTvl($query, float $minTvl)
    {
        return $query->where('tvl_usd', '>=', $minTvl);
    }

    /**
     * Scope to filter by minimum APY.
     */
    public function scopeMinApy($query, float $minApy)
    {
        return $query->where('apy', '>=', $minApy);
    }

    /**
     * Scope to filter stablecoins only.
     */
    public function scopeStablecoinsOnly($query)
    {
        return $query->where('is_stablecoin', new Expression('TRUE'));
    }

    /**
     * Scope to filter by pool type.
     */
    public function scopeByType($query, string $type)
    {
        return $query->where('pool_type', $type);
    }

    /**
     * Scope to get only farms.
     */
    public function scopeFarms($query)
    {
        return $query->where('pool_type', 'farm');
    }

    /**
     * Scope to get only pools (without rewards).
     */
    public function scopePools($query)
    {
        return $query->where('pool_type', 'pool');
    }

    /**
     * Get pool name (protocol + symbol).
     */
    public function getNameAttribute(): string
    {
        return "{$this->protocol_name} - {$this->pool_symbol}";
    }

    /**
     * Get exposure (comma-separated token symbols).
     */
    public function getExposureAttribute(): string
    {
        // Only access assets if they're already loaded to prevent N+1 queries
        if ($this->relationLoaded('assets')) {
            return $this->assets->pluck('token_symbol')->implode(', ');
        }
        return '';
    }
}
