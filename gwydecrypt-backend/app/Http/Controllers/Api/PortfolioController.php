<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\PortfolioService;
use App\Services\AnalyticsService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class PortfolioController extends Controller
{
    public function __construct(
        protected PortfolioService $portfolioService,
        protected AnalyticsService $analyticsService
    ) {}

    /**
     * Get portfolio summary.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $portfolio = $this->portfolioService->calculateTotalValue($user);

        return response()->json([
            'portfolio' => $portfolio,
        ]);
    }

    /**
     * Update portfolio prices.
     */
    public function updatePrices(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            // Get all unique tokens from user's wallets
            $tokenIds = \DB::table('wallet_tokens')
                ->join('wallets', 'wallet_tokens.wallet_id', '=', 'wallets.id')
                ->where('wallets.user_id', $user->id)
                ->where('wallets.is_active', true)
                ->distinct()
                ->pluck('token_id');

            if ($tokenIds->isEmpty()) {
                return response()->json([
                    'message' => 'No tokens found in portfolio',
                ], 404);
            }

            // Fetch tokens
            $tokens = \App\Models\Token::whereIn('id', $tokenIds)->get()->all();

            // Fetch new prices using the price aggregator
            $priceService = app(\App\Services\PriceAggregatorService::class);
            $prices = $priceService->fetchBatchPrices($tokens);

            // Update wallet_tokens with new prices
            $updatedCount = 0;
            foreach ($user->wallets()->active()->with('walletTokens')->get() as $wallet) {
                foreach ($wallet->walletTokens as $walletToken) {
                    if (isset($prices[$walletToken->token_id])) {
                        $newPrice = $prices[$walletToken->token_id];
                        if ($newPrice !== null) {
                            $walletToken->update([
                                'value_usd' => $walletToken->balance * $newPrice,
                            ]);
                            $updatedCount++;
                        }
                    }
                }
            }

            return response()->json([
                'message' => 'Prices updated successfully',
                'updated_tokens' => $updatedCount,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to update prices',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Create portfolio snapshot manually.
     */
    public function createSnapshot(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $portfolioService = app(\App\Services\PortfolioService::class);

            $snapshot = $portfolioService->createSnapshot($user);

            return response()->json([
                'message' => 'Portfolio snapshot created successfully',
                'snapshot' => [
                    'id' => $snapshot->id,
                    'total_value_usd' => $snapshot->total_value_usd,
                    'snapshot_at' => $snapshot->snapshot_at->toIso8601String(),
                    'wallet_count' => $snapshot->wallet_count,
                    'token_count' => $snapshot->token_count,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to create snapshot',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get portfolio distribution.
     */
    public function distribution(Request $request): JsonResponse
    {
        $distribution = $this->portfolioService->getPortfolioDistribution($request->user());

        return response()->json([
            'distribution' => $distribution,
        ]);
    }

    /**
     * Get portfolio history.
     */
    public function history(Request $request): JsonResponse
    {
        $period = $request->get('period', '1w');

        if (!in_array($period, ['1d', '1w', '1m', '3m', '6m', '1y', 'all'])) {
            return response()->json([
                'message' => 'Invalid period',
            ], 422);
        }

        $history = $this->portfolioService->getPortfolioHistory($request->user(), $period);

        return response()->json([
            'history' => $history,
        ]);
    }

    /**
     * Get token performance.
     */
    public function tokenPerformance(Request $request, string $tokenId): JsonResponse
    {
        try {
            $performance = $this->portfolioService->getTokenPerformance($request->user(), $tokenId);

            return response()->json([
                'performance' => $performance,
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 404);
        }
    }

    /**
     * Get best performers.
     */
    public function bestPerformers(Request $request): JsonResponse
    {
        $limit = min($request->get('limit', 5), 20);
        $performers = $this->analyticsService->getBestPerformers($request->user(), $limit);

        return response()->json([
            'performers' => $performers,
        ]);
    }

    /**
     * Get worst performers.
     */
    public function worstPerformers(Request $request): JsonResponse
    {
        $limit = min($request->get('limit', 5), 20);
        $performers = $this->analyticsService->getWorstPerformers($request->user(), $limit);

        return response()->json([
            'performers' => $performers,
        ]);
    }

    /**
     * Get daily change.
     */
    public function dailyChange(Request $request): JsonResponse
    {
        $change = $this->analyticsService->getDailyChange($request->user());

        return response()->json([
            'change' => $change,
        ]);
    }

    /**
     * Get weekly change.
     */
    public function weeklyChange(Request $request): JsonResponse
    {
        $change = $this->analyticsService->getWeeklyChange($request->user());

        return response()->json([
            'change' => $change,
        ]);
    }

    /**
     * Get monthly change.
     */
    public function monthlyChange(Request $request): JsonResponse
    {
        $change = $this->analyticsService->getMonthlyChange($request->user());

        return response()->json([
            'change' => $change,
        ]);
    }

    /**
     * Compare with market.
     */
    public function compareMarket(Request $request): JsonResponse
    {
        $comparison = $this->portfolioService->compareWithMarket($request->user());

        return response()->json([
            'comparison' => $comparison,
        ]);
    }
}
