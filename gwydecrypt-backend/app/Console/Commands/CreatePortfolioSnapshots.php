<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\PortfolioService;
use Illuminate\Console\Command;

class CreatePortfolioSnapshots extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'portfolio:create-snapshots';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Create portfolio snapshots for all users';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $portfolioService = app(PortfolioService::class);
        $users = User::all();

        foreach ($users as $user) {
            try {
                $snapshot = $portfolioService->createSnapshot($user);
                $this->info("Created snapshot for user {$user->id}: \${$snapshot->total_value_usd}");
            } catch (\Exception $e) {
                $this->error("Error creating snapshot for user {$user->id}: " . $e->getMessage());
            }
        }

        $this->info('Portfolio snapshots created successfully.');

        return 0;
    }
}
