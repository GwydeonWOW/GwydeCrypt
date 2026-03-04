<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TokenChain extends Model
{
    protected $fillable = [
        'token_id',
        'chain',
        'contract_address',
        'decimals',
        'tradingview_symbol',
        'is_virtual',
    ];

    protected $casts = [
        'decimals' => 'integer',
    ];

    /**
     * Get the token that owns this chain data.
     */
    public function token(): BelongsTo
    {
        return $this->belongsTo(Token::class);
    }
}
