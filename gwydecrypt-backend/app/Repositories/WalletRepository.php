<?php

namespace App\Repositories;

use App\Models\Wallet;
use App\Repositories\Contracts\WalletRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;

class WalletRepository implements WalletRepositoryInterface
{
    /**
     * Find wallet by ID.
     */
    public function find(int $id): ?Wallet
    {
        return Wallet::find($id);
    }

    /**
     * Get all wallets for a user.
     */
    public function getAllForUser(int $userId): Collection
    {
        return Wallet::where('user_id', $userId)
            ->with('tokens')
            ->get();
    }

    /**
     * Get wallets by chain for a user.
     */
    public function getByChainForUser(int $userId, string $chain): Collection
    {
        return Wallet::where('user_id', $userId)
            ->where('chain', $chain)
            ->with('tokens')
            ->get();
    }

    /**
     * Find wallet by address and chain.
     */
    public function findByAddressAndChain(string $address, string $chain): ?Wallet
    {
        return Wallet::where('address', $address)
            ->where('chain', $chain)
            ->first();
    }

    /**
     * Create a new wallet.
     */
    public function createForUser(int $userId, array $data): Wallet
    {
        $wallet = new Wallet();
        $wallet->user_id = $userId;
        $wallet->address = $data['address'];
        $wallet->chain = $data['chain'];
        $wallet->label = $data['label'] ?? null;
        $wallet->save();

        return $wallet;
    }

    /**
     * Update wallet.
     */
    public function update(int $id, array $data): bool
    {
        $wallet = $this->find($id);

        if (!$wallet) {
            return false;
        }

        return $wallet->update($data);
    }

    /**
     * Delete wallet.
     */
    public function delete(int $id): bool
    {
        $wallet = $this->find($id);

        if (!$wallet) {
            return false;
        }

        return $wallet->delete();
    }

    /**
     * Get wallet statistics for a user.
     */
    public function getUserStatistics(int $userId): array
    {
        $wallets = Wallet::where('user_id', $userId)->get();

        return [
            'total' => $wallets->count(),
            'by_chain' => $wallets->groupBy('chain')->map->count(),
        ];
    }
}
