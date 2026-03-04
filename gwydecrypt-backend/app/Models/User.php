<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'is_approved',
        'approved_by',
        'approved_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_approved' => 'boolean',
            'approved_at' => 'datetime',
        ];
    }

    /**
     * Set the is_approved attribute - ensure proper boolean type for PostgreSQL
     */
    protected function setIsApprovedAttribute($value): void
    {
        $this->attributes['is_approved'] = $value ? 'true' : 'false';
    }

    /**
     * Get the wallets for the user.
     */
    public function wallets(): HasMany
    {
        return $this->hasMany(Wallet::class);
    }

    /**
     * Get the portfolio snapshots for the user.
     */
    public function portfolioSnapshots(): HasMany
    {
        return $this->hasMany(PortfolioSnapshot::class);
    }

    /**
     * Get the investments for the user.
     */
    public function investments(): HasMany
    {
        return $this->hasMany(Investment::class);
    }

    /**
     * Get the user who approved this user.
     */
    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    /**
     * Get the users approved by this user.
     */
    public function approvedUsers()
    {
        return $this->hasMany(User::class, 'approved_by');
    }

    /**
     * Check if user is admin.
     */
    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    /**
     * Check if user is approved.
     */
    public function isApproved(): bool
    {
        return $this->is_approved;
    }

    /**
     * Approve the user.
     */
    public function approve(User $admin): void
    {
        $this->update([
            'is_approved' => true,
            'approved_by' => $admin->id,
            'approved_at' => now(),
        ]);
    }

    /**
     * Reject the user (set as not approved).
     */
    public function reject(): void
    {
        $this->update([
            'is_approved' => false,
            'approved_by' => null,
            'approved_at' => null,
        ]);
    }

    /**
     * Get the latest portfolio snapshot.
     */
    public function latestSnapshot(): ?PortfolioSnapshot
    {
        return $this->portfolioSnapshots()->latest('snapshot_at')->first();
    }

    /**
     * Get total portfolio value.
     */
    public function getTotalPortfolioValueAttribute(): float
    {
        $totalValue = 0;

        foreach ($this->wallets()->where('is_active', true)->with('walletTokens')->get() as $wallet) {
            foreach ($wallet->walletTokens as $walletToken) {
                $totalValue += $walletToken->value_usd ?? 0;
            }
        }

        return $totalValue;
    }
}
