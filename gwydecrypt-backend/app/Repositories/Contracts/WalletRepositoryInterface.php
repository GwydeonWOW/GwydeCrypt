<?php

namespace App\Repositories\Contracts;

use App\Models\Wallet;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;

interface WalletRepositoryInterface
{
    /**
     * Find wallet by ID.
     */
    public function find(int $id): ?Wallet;

    /**
     * Get all wallets for a user.
     */
    public function getAllForUser(int $userId): Collection;

    /**
     * Get wallets by chain for a user.
     */
    public function getByChainForUser(int $userId, string $chain): Collection;

    /**
     * Find wallet by address and chain.
     */
    public function findByAddressAndChain(string $address, string $chain): ?Wallet;

    /**
     * Create a new wallet.
     */
    public function createForUser(int $userId, array $data): Wallet;

    /**
     * Update wallet.
     */
    public function update(int $id, array $data): bool;

    /**
     * Delete wallet.
     */
    public function delete(int $id): bool;

    /**
     * Get wallet statistics for a user.
     */
    public function getUserStatistics(int $userId): array;
}
