<?php

namespace App\Jobs;

use App\Models\Token;
use App\Services\PriceAggregatorService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class FetchPricesJob implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new job instance.
     */
    public function __construct(
        protected array $tokenIds = []
    ) {
        $this->onQueue('prices');
    }

    /**
     * Execute the job.
     */
    public function handle(PriceAggregatorService $priceService): void
    {
        // If no specific tokens provided, fetch all active tokens
        if (empty($this->tokenIds)) {
            $tokens = Token::whereHas('walletTokens')->get();
        } else {
            $tokens = Token::whereIn('id', $this->tokenIds)->get();
        }

        foreach ($tokens as $token) {
            try {
                // The service already handles multi-provider fallback
                $price = $priceService->fetchPrice($token);

                if ($price) {
                    Log::info("Price fetched for token {$token->symbol}: {$price}");
                } else {
                    Log::warning("Failed to fetch price for token {$token->symbol}");
                }
            } catch (\Exception $e) {
                Log::error("Error fetching price for token {$token->symbol}: " . $e->getMessage());
            }
        }
    }
}
