<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserPosition extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
        'wallet_address',
        'pool_id',
        'user_balance',
        'user_balance_usd',
        'pool_share',
        'user_tokens',
        'pending_rewards',
        'tick_low',
        'tick_up',
        'current_tick',
        'in_range',
        'last_synced_at',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'user_balance' => 'decimal:65',
        'user_balance_usd' => 'decimal:2',
        'pool_share' => 'decimal:6',
        'user_tokens' => 'array',
        'pending_rewards' => 'array',
        'tick_low' => 'integer',
        'tick_up' => 'integer',
        'current_tick' => 'integer',
        // in_range uses custom accessor/mutator for PostgreSQL boolean
        'last_synced_at' => 'datetime',
    ];

    /**
     * Get the pool that owns the user position.
     */
    public function pool(): BelongsTo
    {
        return $this->belongsTo(Pool::class);
    }

    /**
     * Set the in_range attribute - ensure boolean type for PostgreSQL
     */
    public function setInRangeAttribute($value): void
    {
        $this->attributes['in_range'] = $value ? 'true' : 'false';
    }

    /**
     * Get the in_range attribute - convert to boolean
     */
    public function getInRangeAttribute($value): ?bool
    {
        if ($value === null) {
            return null;
        }
        return $value === 'true' || $value === true || $value === 1 || $value === '1';
    }

    /**
     * Get the user that owns the position.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Scope to filter by user.
     */
    public function scopeForUser($query, int $userId)
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Scope to filter by wallet address.
     */
    public function scopeForWallet($query, string $walletAddress)
    {
        return $query->where('wallet_address', $walletAddress);
    }

    /**
     * Scope to filter by recently synced.
     */
    public function scopeRecentlySynced($query, int $minutes = 30)
    {
        return $query->where('last_synced_at', '>=', now()->subMinutes($minutes));
    }

    /**
     * Get total value in USD for all positions of a wallet.
     */
    public function scopeTotalValue($query, string $walletAddress): float
    {
        return $query->forWallet($walletAddress)
            ->sum('user_balance_usd');
    }
}
