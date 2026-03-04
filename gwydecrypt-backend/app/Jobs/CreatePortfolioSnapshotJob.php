<?php

namespace App\Jobs;

use App\Models\User;
use App\Services\PortfolioService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class CreatePortfolioSnapshotJob implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public User $user
    ) {
        $this->onQueue('analytics');
    }

    /**
     * Execute the job.
     */
    public function handle(PortfolioService $portfolioService): void
    {
        try {
            // Create snapshot
            $snapshot = $portfolioService->createSnapshot($this->user);

            Log::info("Portfolio snapshot created for user {$this->user->id}", [
                'total_value' => $snapshot->total_value_usd,
                'change_24h_percent' => $snapshot->change_24h_percent,
            ]);

            // TODO: Dispatch websocket event to notify frontend
            // broadcast(new PortfolioUpdated($this->user->id, $snapshot))->toOthers();

        } catch (\Exception $e) {
            Log::error("Error creating portfolio snapshot for user {$this->user->id}: " . $e->getMessage());
        }
    }
}

