<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PoolAsset extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'pool_id',
        'token_address',
        'token_symbol',
        'token_name',
        'token_decimals',
        'reserve',
        'price',
        'liquidity',
        'monthly_swap_fees',
        'vfat_synced_at',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'reserve' => 'decimal:0',
        'price' => 'decimal:10',
        'liquidity' => 'decimal:2',
        'monthly_swap_fees' => 'decimal:0',
        'vfat_synced_at' => 'datetime',
    ];

    /**
     * Get the pool that owns the asset.
     */
    public function pool(): BelongsTo
    {
        return $this->belongsTo(Pool::class);
    }
}
