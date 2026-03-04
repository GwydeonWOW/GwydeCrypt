<?php

namespace App\Services;

use App\Models\User;
use App\Models\WalletToken;
use Illuminate\Support\Facades\DB;

class AnalyticsService
{
    /**
     * Calculate P&L for a specific token.
     */
    public function calculatePnL(User $user, string $tokenId): array
    {
        $walletTokens = WalletToken::whereHas('wallet', function ($query) use ($user) {
            return $query->where('user_id', $user->id);
        })
        ->where('token_id', $tokenId)
        ->with('token.priceHistory')
        ->get();

        if ($walletTokens->isEmpty()) {
            return [
                'total_invested' => 0,
                'current_value' => 0,
                'pnl_usd' => 0,
                'pnl_percent' => 0,
            ];
        }

        $totalInvested = 0;
        $currentValue = $walletTokens->sum('value_usd');
        $pnl = $currentValue - $totalInvested;
        $pnlPercent = $totalInvested > 0 ? ($pnl / $totalInvested) * 100 : 0;

        return [
            'total_invested' => $totalInvested,
            'current_value' => $currentValue,
            'pnl_usd' => $pnl,
            'pnl_percent' => round($pnlPercent, 2),
        ];
    }

    /**
     * Get best performing tokens.
     */
    public function getBestPerformers(User $user, int $limit = 5): \Illuminate\Support\Collection
    {
        try {
            $walletTokens = WalletToken::whereHas('wallet', function ($query) use ($user) {
                return $query->where('user_id', $user->id)->where('is_active', true);
            })
            ->with('token.priceHistory')
            ->get()
            ->groupBy('token_id');

            $performers = collect();

            foreach ($walletTokens as $tokenId => $tokens) {
                $totalValue = $tokens->sum('value_usd');
                $token = $tokens->first()->token;

                if (!$token) {
                    continue;
                }

                $history7d = $token->priceHistory()
                    ->where('timestamp', '>=', now()->subDays(8))
                    ->where('timestamp', '<=', now()->subDays(7))
                    ->first();

                $currentPrice = $token->latestPrice()?->price_usd ?? 0;

                if ($history7d && $currentPrice > 0) {
                    $change7d = (($currentPrice - $history7d->price_usd) / $history7d->price_usd) * 100;

                    $performers->push([
                        'token' => $token,
                        'value_usd' => $totalValue,
                        'change_percent' => round($change7d, 2),
                    ]);
                }
            }

            return $performers->sortByDesc('change_percent')->take($limit)->values();
        } catch (\Exception $e) {
            \Log::error('Error getting best performers: ' . $e->getMessage());
            return collect();
        }
    }

    /**
     * Get worst performing tokens.
     */
    public function getWorstPerformers(User $user, int $limit = 5): \Illuminate\Support\Collection
    {
        try {
            $performers = $this->getBestPerformers($user, 100);

            return $performers->sortBy('change_percent')->take($limit)->values();
        } catch (\Exception $e) {
            \Log::error('Error getting worst performers: ' . $e->getMessage());
            return collect();
        }
    }

    /**
     * Get daily change.
     */
    public function getDailyChange(User $user): float
    {
        try {
            $portfolioService = app(PortfolioService::class);
            $portfolio = $portfolioService->calculateTotalValue($user);
            $currentValue = $portfolio['total_value_usd'];

            // Try to get yesterday's snapshot
            $yesterdaySnapshot = $user->portfolioSnapshots()
                ->where('snapshot_at', '>=', now()->subDays(2))
                ->where('snapshot_at', '<=', now()->subDay())
                ->latest('snapshot_at')
                ->first();

            // If no yesterday snapshot, try to get the most recent snapshot from before today
            if (!$yesterdaySnapshot) {
                $yesterdaySnapshot = $user->portfolioSnapshots()
                    ->where('snapshot_at', '<', now()->startOfDay())
                    ->latest('snapshot_at')
                    ->first();
            }

            if (!$yesterdaySnapshot || $yesterdaySnapshot->total_value_usd <= 0) {
                return 0;
            }

            $change = $currentValue - $yesterdaySnapshot->total_value_usd;
            $changePercent = ($change / $yesterdaySnapshot->total_value_usd) * 100;

            return round($changePercent, 2);
        } catch (\Exception $e) {
            \Log::error('Error getting daily change: ' . $e->getMessage());
            return 0;
        }
    }

    /**
     * Get weekly change.
     */
    public function getWeeklyChange(User $user): float
    {
        try {
            $portfolioService = app(PortfolioService::class);
            $portfolio = $portfolioService->calculateTotalValue($user);
            $currentValue = $portfolio['total_value_usd'];

            $weekAgoSnapshot = $user->portfolioSnapshots()
                ->where('snapshot_at', '>=', now()->subDays(8))
                ->where('snapshot_at', '<=', now()->subDays(7))
                ->latest('snapshot_at')
                ->first();

            $weekAgoValue = $weekAgoSnapshot?->total_value_usd ?? $currentValue;
            $change = $currentValue - $weekAgoValue;
            $changePercent = $weekAgoValue > 0 ? ($change / $weekAgoValue) * 100 : 0;

            return round($changePercent, 2);
        } catch (\Exception $e) {
            \Log::error('Error getting weekly change: ' . $e->getMessage());
            return 0;
        }
    }

    /**
     * Get monthly change.
     */
    public function getMonthlyChange(User $user): float
    {
        try {
            $portfolioService = app(PortfolioService::class);
            $portfolio = $portfolioService->calculateTotalValue($user);
            $currentValue = $portfolio['total_value_usd'];

            $monthAgoSnapshot = $user->portfolioSnapshots()
                ->where('snapshot_at', '>=', now()->subDays(31))
                ->where('snapshot_at', '<=', now()->subDays(30))
                ->latest('snapshot_at')
                ->first();

            $monthAgoValue = $monthAgoSnapshot?->total_value_usd ?? $currentValue;
            $change = $currentValue - $monthAgoValue;
            $changePercent = $monthAgoValue > 0 ? ($change / $monthAgoValue) * 100 : 0;

            return round($changePercent, 2);
        } catch (\Exception $e) {
            \Log::error('Error getting monthly change: ' . $e->getMessage());
            return 0;
        }
    }
}
