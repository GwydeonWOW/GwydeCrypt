<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class AuthService
{
    /**
     * Register a new user.
     */
    public function register(array $data): User
    {
        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
        ]);

        // Create API token
        $token = $user->createToken('auth-token')->plainTextToken;

        return $user;
    }

    /**
     * Login user and return token.
     */
    public function login(string $email, string $password): ?array
    {
        if (!Auth::attempt(['email' => $email, 'password' => $password])) {
            return null;
        }

        $user = Auth::user();
        $token = $user->createToken('auth-token')->plainTextToken;

        return [
            'user' => $user,
            'token' => $token,
        ];
    }

    /**
     * Logout user (revoke current token).
     */
    public function logout(User $user): void
    {
        $user->currentAccessToken()->delete();
    }

    /**
     * Refresh token (revoke current and create new).
     */
    public function refreshToken(User $user): string
    {
        // Revoke current token
        $user->currentAccessToken()->delete();

        // Create new token
        return $user->createToken('auth-token')->plainTextToken;
    }

    /**
     * Validate token.
     */
    public function validateToken(User $user): bool
    {
        return $user->tokens()->where('id', $user->currentAccessToken()->id)->exists();
    }
}
