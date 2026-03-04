<?php

namespace App\Repositories;

use App\Models\User;
use App\Repositories\Contracts\UserRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Hash;

class UserRepository implements UserRepositoryInterface
{
    /**
     * Find user by ID.
     */
    public function find(int $id): ?User
    {
        return User::find($id);
    }

    /**
     * Find user by email.
     */
    public function findByEmail(string $email): ?User
    {
        return User::where('email', $email)->first();
    }

    /**
     * Find user by email with verification status.
     */
    public function findByVerifiedEmail(string $email): ?User
    {
        return User::where('email', $email)
            ->where('is_approved', true)
            ->first();
    }

    /**
     * Get all users.
     */
    public function all(): Collection
    {
        return User::all();
    }

    /**
     * Get all users filtered by approval status.
     */
    public function getByApprovalStatus(bool $isApproved): Collection
    {
        return User::where('is_approved', $isApproved)->get();
    }

    /**
     * Get all users by role.
     */
    public function getByRole(string $role): Collection
    {
        return User::where('role', $role)->get();
    }

    /**
     * Create a new user.
     */
    public function create(array $data): User
    {
        $user = new User();
        $user->name = $data['name'];
        $user->email = $data['email'];
        $user->password = Hash::make($data['password']);
        $user->role = $data['role'] ?? 'user';
        $user->is_approved = $data['is_approved'] ?? false;
        $user->save();

        return $user;
    }

    /**
     * Update user.
     */
    public function update(int $id, array $data): bool
    {
        $user = $this->find($id);

        if (!$user) {
            return false;
        }

        if (isset($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        }

        return $user->update($data);
    }

    /**
     * Delete user.
     */
    public function delete(int $id): bool
    {
        $user = $this->find($id);

        if (!$user) {
            return false;
        }

        return $user->delete();
    }

    /**
     * Approve user.
     */
    public function approve(int $userId, int $approvedByUserId): bool
    {
        $user = $this->find($id ?? $userId);

        if (!$user) {
            return false;
        }

        $user->update([
            'is_approved' => true,
            'approved_by' => $approvedByUserId,
            'approved_at' => now(),
        ]);

        return true;
    }

    /**
     * Reject user.
     */
    public function reject(int $userId): bool
    {
        $user = $this->find($userId);

        if (!$user) {
            return false;
        }

        $user->update([
            'is_approved' => false,
            'approved_by' => null,
            'approved_at' => null,
        ]);

        return true;
    }

    /**
     * Get user statistics.
     */
    public function getStatistics(): array
    {
        return [
            'total' => User::count(),
            'approved' => User::where('is_approved', true)->count(),
            'pending' => User::where('is_approved', false)->count(),
            'admins' => User::where('role', 'admin')->count(),
        ];
    }
}
