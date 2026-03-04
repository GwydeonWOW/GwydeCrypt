<?php

namespace App\Repositories\Contracts;

use App\Models\User;
use Illuminate\Database\Eloquent\Collection;

interface UserRepositoryInterface
{
    /**
     * Find user by ID.
     */
    public function find(int $id): ?User;

    /**
     * Find user by email.
     */
    public function findByEmail(string $email): ?User;

    /**
     * Find user by email with verification status.
     */
    public function findByVerifiedEmail(string $email): ?User;

    /**
     * Get all users.
     */
    public function all(): Collection;

    /**
     * Get all users filtered by approval status.
     */
    public function getByApprovalStatus(bool $isApproved): Collection;

    /**
     * Get all users by role.
     */
    public function getByRole(string $role): Collection;

    /**
     * Create a new user.
     */
    public function create(array $data): User;

    /**
     * Update user.
     */
    public function update(int $id, array $data): bool;

    /**
     * Delete user.
     */
    public function delete(int $id): bool;

    /**
     * Approve user.
     */
    public function approve(int $userId, int $approvedByUserId): bool;

    /**
     * Reject user.
     */
    public function reject(int $userId): bool;

    /**
     * Get user statistics.
     */
    public function getStatistics(): array;
}
