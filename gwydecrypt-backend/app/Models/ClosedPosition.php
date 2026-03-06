<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClosedPosition extends Model
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
        'token_id',
        'original_token_id',
        'nft_id_chain',
        'oldest_action_timestamp',
        'closed_timestamp',
        'age_in_days',
        'realized_pnl_usd',
        'initial_balance_usd',
        'total_pnl_usd',
        'roi',
        'underlying',
        'last_action',
        'is_migrated',
        'chain_length',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'nft_id_chain' => 'array',
        'age_in_days' => 'decimal:4',
        'realized_pnl_usd' => 'decimal:6',
        'initial_balance_usd' => 'decimal:6',
        'total_pnl_usd' => 'decimal:6',
        'roi' => 'decimal:4',
        'underlying' => 'array',
        'is_migrated' => 'boolean',
        'oldest_action_timestamp' => 'datetime',
        'closed_timestamp' => 'datetime',
    ];

    /**
     * Get the pool that owns the closed position.
     */
    public function pool(): BelongsTo
    {
        return $this->belongsTo(Pool::class);
    }

    /**
     * Get the user that owns the closed position.
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
     * Scope to order by closed date (most recent first).
     */
    public function scopeOrderByClosed($query, string $direction = 'desc')
    {
        return $query->orderBy('closed_timestamp', $direction);
    }

    /**
     * Scope to filter by profitability.
     */
    public function scopeProfitable($query)
    {
        return $query->where('realized_pnl_usd', '>', 0);
    }

    public function scopeUnprofitable($query)
    {
        return $query->where('realized_pnl_usd', '<', 0);
    }
}
