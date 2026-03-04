<?php

namespace App\Services;

use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletToken;

class WalletService
{
    /**
     * Add a new wallet for user.
     */
    public function addWallet(User $user, array $data): Wallet
    {
        // Check if wallet already exists for this user
        $existingWallet = $user->wallets()
            ->where('address', $data['address'])
            ->where('chain', $data['chain'])
            ->first();

        if ($existingWallet) {
            throw new \InvalidArgumentException('Wallet already added');
        }

        $wallet = Wallet::create([
            'user_id' => $user->id,
            'address' => $data['address'],
            'chain' => $data['chain'],
            'label' => $data['label'] ?? null,
            'is_active' => true,
        ]);

        return $wallet;
    }

    /**
     * Remove wallet.
     */
    public function removeWallet(User $user, string $walletId): void
    {
        $wallet = $user->wallets()->findOrFail($walletId);
        $wallet->delete();
    }

    /**
     * List user wallets.
     */
    public function listWallets(User $user): \Illuminate\Database\Eloquent\Collection
    {
        return $user->wallets()->with('walletTokens.token')->get();
    }

    /**
     * Add token to wallet manually.
     */
    public function addTokenToWallet(Wallet $wallet, int $tokenId, float $balance): WalletToken
    {
        // Check if token exists
        $token = \App\Models\Token::findOrFail($tokenId);

        // Check if wallet_token already exists
        $existingWalletToken = WalletToken::where('wallet_id', $wallet->id)
            ->where('token_id', $tokenId)
            ->first();

        if ($existingWalletToken) {
            throw new \InvalidArgumentException('Token already added to this wallet');
        }

        // Get current token price
        $priceService = app(PriceAggregatorService::class);
        $currentPrice = $priceService->fetchPrice($token);

        if ($currentPrice === null) {
            throw new \InvalidArgumentException('Could not fetch price for token');
        }

        $walletToken = WalletToken::create([
            'wallet_id' => $wallet->id,
            'token_id' => $tokenId,
            'balance' => $balance,
            'value_usd' => $balance * $currentPrice,
        ]);

        return $walletToken->load('token');
    }

    /**
     * Remove token from wallet.
     */
    public function removeTokenFromWallet(Wallet $wallet, int $tokenId): void
    {
        $walletToken = WalletToken::where('wallet_id', $wallet->id)
            ->where('token_id', $tokenId)
            ->firstOrFail();

        $walletToken->delete();
    }

    /**
     * Update token balance in wallet.
     */
    public function updateTokenInWallet(Wallet $wallet, int $tokenId, float $balance): WalletToken
    {
        $walletToken = WalletToken::where('wallet_id', $wallet->id)
            ->where('token_id', $tokenId)
            ->firstOrFail();

        // Get current token price
        $token = $walletToken->token;
        $priceService = app(PriceAggregatorService::class);
        $currentPrice = $priceService->fetchPrice($token);

        if ($currentPrice === null) {
            throw new \InvalidArgumentException('Could not fetch price for token');
        }

        $walletToken->update([
            'balance' => $balance,
            'value_usd' => $balance * $currentPrice,
        ]);

        return $walletToken->fresh()->load('token');
    }

    /**
     * Update wallet label.
     */
    public function updateLabel(Wallet $wallet, string $label): Wallet
    {
        $wallet->update(['label' => $label]);
        return $wallet->fresh();
    }

    /**
     * Toggle wallet active status.
     */
    public function toggleActive(Wallet $wallet): Wallet
    {
        $wallet->update(['is_active' => !$wallet->is_active]);
        return $wallet->fresh();
    }
}
