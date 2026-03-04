<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WalletToken extends Model
{
    protected $fillable = [
        'id',
        'wallet_id',
        'token_id',
        'balance',
        'value_usd',
        'last_updated_at',
    ];

    protected $casts = [
        'balance' => 'decimal:18',
        'value_usd' => 'decimal:2',
        'last_updated_at' => 'datetime',
    ];

    /**
     * Get the wallet that owns the wallet token.
     */
    public function wallet(): BelongsTo
    {
        return $this->belongsTo(Wallet::class);
    }

    /**
     * Get the token for the wallet token.
     */
    public function token(): BelongsTo
    {
        return $this->belongsTo(Token::class);
    }

    /**
     * Recalculate USD value based on current balance and token price.
     */
    public function recalculateValue(float $currentPrice): void
    {
        $this->value_usd = $this->balance * $currentPrice;
        $this->save();
    }
}
