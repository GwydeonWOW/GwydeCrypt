<?php

namespace App\Services;

use App\Models\User;
use App\Models\PortfolioSnapshot;
use App\Models\Wallet;
use Illuminate\Support\Facades\DB;

class PortfolioService
{
    public function __construct(
        protected PriceAggregatorService $priceService,
        protected CacheService $cacheService
    ) {}

    /**
     * Calculate total portfolio value.
     */
    public function calculateTotalValue(User $user): array
    {
        $wallets = $user->wallets()->active()->with('walletTokens.token')->get();

        $totalValue = 0;
        $tokens = [];
        $tokenIds = [];

        foreach ($wallets as $wallet) {
            foreach ($wallet->walletTokens as $walletToken) {
                $tokenValue = $walletToken->value_usd ?? 0;
                $totalValue += $tokenValue;

                // Collect token IDs for price update timestamp
                $tokenIds[] = $walletToken->token_id;

                // Agrupar por símbolo en lugar de token_id
                $tokenSymbol = $walletToken->token->symbol;

                if (!isset($tokens[$tokenSymbol])) {
                    $tokens[$tokenSymbol] = [
                        'tokens' => [],
                        'balance' => 0,
                        'value_usd' => 0,
                        'wallets' => [],
                    ];
                }

                $tokens[$tokenSymbol]['balance'] += $walletToken->balance;
                $tokens[$tokenSymbol]['value_usd'] += $tokenValue;
                $tokens[$tokenSymbol]['tokens'][] = [
                    'id' => $walletToken->token->id,
                    'symbol' => $walletToken->token->symbol,
                    'name' => $walletToken->token->name,
                    'chain' => $walletToken->token->chain,
                    'balance' => $walletToken->balance,
                    'value_usd' => $tokenValue,
                ];
                $tokens[$tokenSymbol]['wallets'][] = [
                    'wallet_id' => $wallet->id,
                    'wallet_label' => $wallet->label,
                    'wallet_chain' => $wallet->chain,
                    'balance' => $walletToken->balance,
                    'value_usd' => $tokenValue,
                ];
            }
        }

        // Get 24h change for each token
        $tokenChanges = [];
        if (!empty($tokenIds)) {
            $uniqueTokenIds = array_unique($tokenIds);
            $latestPriceChanges = \App\Models\PriceHistory::whereIn('token_id', $uniqueTokenIds)
                ->where('timestamp', '>=', now()->subHours(25))
                ->orderBy('timestamp', 'desc')
                ->get()
                ->groupBy('token_id');

            foreach ($latestPriceChanges as $tokenId => $histories) {
                if ($histories->isNotEmpty() && $histories->first()->price_change_24h !== null) {
                    $tokenChanges[$tokenId] = (float) $histories->first()->price_change_24h;
                }
            }
        }

        // Add 24h change to each token
        foreach ($tokens as &$tokenGroup) {
            if (!empty($tokenGroup['tokens'])) {
                $firstTokenId = $tokenGroup['tokens'][0]['id'];
                $tokenGroup['tokens'][0]['change_24h_percent'] = $tokenChanges[$firstTokenId] ?? 0;
            }
        }
        unset($tokenGroup);

        // Get the latest price update timestamp
        $latestPriceUpdate = null;
        if (!empty($tokenIds)) {
            $maxTimestamp = \App\Models\PriceHistory::whereIn('token_id', array_unique($tokenIds))
                ->max('timestamp');

            if ($maxTimestamp) {
                $latestPriceUpdate = \Carbon\Carbon::parse($maxTimestamp);
            }
        }

        return [
            'total_value_usd' => $totalValue,
            'wallets_count' => $wallets->count(),
            'tokens_count' => count($tokens),
            'tokens' => array_values($tokens),
            'last_price_update' => $latestPriceUpdate ? $latestPriceUpdate->toIso8601String() : null,
        ];
    }

    /**
     * Get portfolio distribution with caching.
     */
    public function getPortfolioDistribution(User $user): array
    {
        $cacheKey = $this->cacheService->generateKey('portfolio_distribution', ['user' => $user->id]);

        return $this->cacheService->rememberCalculation($cacheKey, function () use ($user) {
            $portfolio = $this->calculateTotalValue($user);
            $totalValue = $portfolio['total_value_usd'];

            if ($totalValue == 0) {
                return [
                    'by_token' => [],
                    'by_chain' => [],
                ];
            }

            // Distribution by token (agrupado por símbolo)
            $byToken = collect($portfolio['tokens'])->map(function ($tokenGroup) use ($totalValue) {
                $firstToken = $tokenGroup['tokens'][0];
                return [
                    'symbol' => $firstToken['symbol'],
                    'name' => $firstToken['name'],
                    'percentage' => round(($tokenGroup['value_usd'] / $totalValue) * 100, 2),
                    'value_usd' => $tokenGroup['value_usd'],
                ];
            })->sortByDesc('percentage')->values()->all();

            // Optimized distribution by chain using DB query
            $byChainData = DB::table('wallets as w')
                ->join('wallet_tokens as wt', 'w.id', '=', 'wt.wallet_id')
                ->select('w.chain', DB::raw('SUM(wt.value_usd) as total_value'))
                ->where('w.user_id', $user->id)
                ->where('w.is_active', true)
                ->groupBy('w.chain')
                ->get();

            $byChain = $byChainData->map(function ($item) use ($totalValue) {
                return [
                    'chain' => strtoupper($item->chain),
                    'percentage' => $totalValue > 0 ? round(($item->total_value / $totalValue) * 100, 2) : 0,
                    'value_usd' => $item->total_value,
                ];
            })->sortByDesc('percentage')->values()->all();

            return [
                'by_token' => $byToken,
                'by_chain' => $byChain,
            ];
        }, 600);
    }

    /**
     * Get portfolio history (one snapshot per day, the last one).
     */
    public function getPortfolioHistory(User $user, string $period = '1w'): \Illuminate\Database\Eloquent\Collection
    {
        // Get snapshots within period
        $snapshots = $user->portfolioSnapshots()
            ->inPeriod($period)
            ->get();

        // Group by date and keep only the last snapshot of each day
        $grouped = $snapshots->groupBy(function ($item) {
            return \Carbon\Carbon::parse($item->snapshot_at)->format('Y-m-d');
        });

        // Get the last snapshot of each day
        return $grouped->map(function ($group) {
            return $group->sortByDesc('snapshot_at')->first();
        })->sortBy('snapshot_at')->values();
    }

    /**
     * Get period start date based on period string.
     */
    private function getPeriodStartDate(string $period): \Carbon\Carbon
    {
        return match ($period) {
            '1d' => now()->subDay(),
            '3d' => now()->subDays(3),
            '1w' => now()->subWeek(),
            '1m' => now()->subMonth(),
            '3m' => now()->subMonths(3),
            '6m' => now()->subMonths(6),
            '1y' => now()->subYear(),
            default => now()->subWeek(),
        };
    }

    /**
     * Get token performance.
     */
    public function getTokenPerformance(User $user, string $tokenId): array
    {
        $wallets = $user->wallets()->active()->get();
        $token = \App\Models\Token::find($tokenId);

        if (!$token) {
            throw new \InvalidArgumentException('Token not found');
        }

        $totalBalance = 0;
        $totalValue = 0;

        foreach ($wallets as $wallet) {
            $walletToken = $wallet->walletTokens()->where('token_id', $tokenId)->first();
            if ($walletToken) {
                $totalBalance += $walletToken->balance;
                $totalValue += $walletToken->value_usd ?? 0;
            }
        }

        // Get historical prices
        $priceHistory = $token->priceHistory()->inPeriod('1w')->get();

        return [
            'token' => $token,
            'total_balance' => $totalBalance,
            'total_value_usd' => $totalValue,
            'current_price' => $token->latestPrice()?->price_usd,
            'price_history' => $priceHistory,
        ];
    }

    /**
     * Create portfolio snapshot.
     */
    public function createSnapshot(User $user): PortfolioSnapshot
    {
        $portfolio = $this->calculateTotalValue($user);

        // Calculate chains distribution
        $chainsDistribution = [];
        foreach ($user->wallets()->active()->with('walletTokens.token')->get() as $wallet) {
            $chainValue = $wallet->walletTokens->sum('value_usd');

            if (!isset($chainsDistribution[$wallet->chain])) {
                $chainsDistribution[$wallet->chain] = 0;
            }

            $chainsDistribution[$wallet->chain] += $chainValue;
        }

        return PortfolioSnapshot::create([
            'user_id' => $user->id,
            'total_value_usd' => $portfolio['total_value_usd'],
            'wallet_count' => $portfolio['wallets_count'],
            'token_count' => $portfolio['tokens_count'],
            'chains_distribution' => $chainsDistribution,
            'snapshot_at' => now(),
        ]);
    }

    /**
     * Compare with market.
     */
    public function compareWithMarket(User $user): array
    {
        try {
            $portfolio = $this->calculateTotalValue($user);
            $portfolioHistory = $this->getPortfolioHistory($user, '1w');

            if ($portfolioHistory->count() < 2) {
                return [
                    'portfolio_change_7d' => 0,
                    'market_change_7d' => 0,
                    'outperformance' => 0,
                ];
            }

            $portfolioStartValue = $portfolioHistory->first()->total_value_usd;

            if ($portfolioStartValue <= 0) {
                return [
                    'portfolio_change_7d' => 0,
                    'market_change_7d' => 0,
                    'outperformance' => 0,
                ];
            }

            $portfolioChange = (($portfolio['total_value_usd'] - $portfolioStartValue) / $portfolioStartValue) * 100;

            // Get market change (BTC + ETH average)
            $btc = \App\Models\Token::where('symbol', 'BTC')->first();
            $eth = \App\Models\Token::where('symbol', 'ETH')->first();

            $marketChange = 0;
            $marketTokens = 0;

            foreach ([$btc, $eth] as $token) {
                if ($token) {
                    try {
                        $history7dAgo = $token->priceHistory()
                            ->where('timestamp', '>=', now()->subDays(8))
                            ->where('timestamp', '<=', now()->subDays(7))
                            ->first();

                        $latestPrice = $token->latestPrice();

                        if ($history7dAgo && $latestPrice && $latestPrice->price_usd > 0) {
                            $tokenChange = (($latestPrice->price_usd - $history7dAgo->price_usd) / $history7dAgo->price_usd) * 100;
                            $marketChange += $tokenChange;
                            $marketTokens++;
                        }
                    } catch (\Exception $e) {
                        \Log::error('Error calculating market change for token: ' . $e->getMessage());
                    }
                }
            }

            if ($marketTokens > 0) {
                $marketChange = $marketChange / $marketTokens;
            }

            return [
                'portfolio_change_7d' => round($portfolioChange, 2),
                'market_change_7d' => round($marketChange, 2),
                'outperformance' => round($portfolioChange - $marketChange, 2),
            ];
        } catch (\Exception $e) {
            \Log::error('Error comparing with market: ' . $e->getMessage());
            return [
                'portfolio_change_7d' => 0,
                'market_change_7d' => 0,
                'outperformance' => 0,
            ];
        }
    }
}
