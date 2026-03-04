<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PoolReward extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'pool_id',
        'reward_token_address',
        'reward_token_symbol',
        'reward_token_name',
        'reward_token_decimals',
        'rewards_per_second',
        'reward_token_price',
        'vfat_synced_at',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'rewards_per_second' => 'decimal:0',
        'reward_token_price' => 'decimal:10',
        'vfat_synced_at' => 'datetime',
    ];

    /**
     * Get the pool that owns the reward.
     */
    public function pool(): BelongsTo
    {
        return $this->belongsTo(Pool::class);
    }
}
