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
