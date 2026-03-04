<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Database\Query\Expression;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Seed API providers
        $this->call([
            ApiProviderSeeder::class,
        ]);

        // Create admin user (approved by default)
        $admin = User::firstOrCreate(
            ['email' => 'admin@gwydecrypt.com'],
            [
                'name' => 'Admin User',
                'password' => Hash::make('password'), // Change in production!
                'role' => 'admin',
                'is_approved' => new Expression('TRUE'),
                'approved_at' => now(),
            ]
        );

        // If it's a new admin, set approved_by to null (self-approved)
        if (!$admin->approved_by) {
            $admin->update(['approved_by' => null]);
        }

        $this->command->info('Admin user created (admin@gwydecrypt.com / password)');

        // Optional: Create test user (pending approval)
        User::firstOrCreate(
            ['email' => 'test@example.com'],
            [
                'name' => 'Test User',
                'password' => Hash::make('password'),
                'role' => 'user',
                'is_approved' => new Expression('FALSE'),
            ]
        );

        $this->command->info('Database seeded successfully!');
    }
}

