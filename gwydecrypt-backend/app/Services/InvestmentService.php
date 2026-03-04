<?php

namespace App\Services;

use App\Models\User;
use App\Models\Investment;
use Illuminate\Support\Facades\DB;

class InvestmentService
{
    public function __construct(
        protected PriceAggregatorService $priceService
    ) {}

    /**
     * Create new investment
     */
    public function createInvestment(User $user, array $data): Investment
    {
        // Calculate purchase total
        $purchaseTotal = $data['amount_purchased'] * $data['purchase_price_per_token'];

        $investment = Investment::create([
            'user_id' => $user->id,
            'token_id' => $data['token_id'],
            'chain' => $data['chain'],
            'amount_purchased' => $data['amount_purchased'],
            'amount_remaining' => $data['amount_purchased'], // Initially, all purchased amount is remaining
            'purchase_price_per_token' => $data['purchase_price_per_token'],
            'purchase_total_usd' => $purchaseTotal,
            'purchase_date' => $data['purchase_date'],
            'notes' => $data['notes'] ?? null,
        ]);

        return $investment;
    }

    /**
     * Update investment
     */
    public function updateInvestment(Investment $investment, array $data): Investment
    {
        // Recalculate purchase total if amount or price changed
        if (isset($data['amount_purchased']) || isset($data['purchase_price_per_token'])) {
            $amount = $data['amount_purchased'] ?? $investment->amount_purchased;
            $price = $data['purchase_price_per_token'] ?? $investment->purchase_price_per_token;
            $data['purchase_total_usd'] = $amount * $price;
        }

        $investment->update($data);
        return $investment->fresh();
    }

    /**
     * Delete investment
     */
    public function deleteInvestment(Investment $investment): void
    {
        $investment->delete();
    }

    /**
     * Get user investments (grouped or individual)
     */
    public function getUserInvestments(User $user, string $view = 'grouped'): array
    {
        if ($view === 'individual') {
            return $this->getIndividualInvestments($user);
        }

        return $this->getGroupedInvestments($user);
    }

    /**
     * Get investments grouped by token
     */
    protected function getGroupedInvestments(User $user): array
    {
        $investments = $user->investments()
            ->with('token')
            ->orderByPurchaseDate()
            ->get();

        $grouped = [];

        foreach ($investments as $investment) {
            $tokenSymbol = $investment->token->symbol;
            $chain = $investment->chain;
            $key = "{$tokenSymbol}_{$chain}";

            if (!isset($grouped[$key])) {
                $grouped[$key] = [
                    'token' => $investment->token,
                    'chain' => $chain,
                    'investments' => [],
                    'total_invested_usd' => 0,
                    'total_amount' => 0,
                    'average_buy_price' => 0,
                    'current_value_usd' => 0,
                    'pnl_usd' => 0,
                    'pnl_percent' => 0,
                ];
            }

            $grouped[$key]['investments'][] = $investment;
            $grouped[$key]['total_invested_usd'] += (float) $investment->purchase_total_usd;
            $grouped[$key]['total_amount'] += (float) $investment->amount_purchased;
        }

        // Calculate current values and metrics
        foreach ($grouped as &$group) {
            // Get current price for this token on this chain
            $currentPrice = $this->priceService->fetchPrice($group['token']);

            $group['current_value_usd'] = $currentPrice !== null
                ? $group['total_amount'] * $currentPrice
                : 0;

            $group['average_buy_price'] = $group['total_amount'] > 0
                ? $group['total_invested_usd'] / $group['total_amount']
                : 0;

            $group['pnl_usd'] = $group['current_value_usd'] - $group['total_invested_usd'];
            $group['pnl_percent'] = $group['total_invested_usd'] > 0
                ? (($group['pnl_usd'] / $group['total_invested_usd']) * 100)
                : 0;
        }

        return array_values($grouped);
    }

    /**
     * Get individual investments
     */
    protected function getIndividualInvestments(User $user): array
    {
        $investments = $user->investments()
            ->with('token')
            ->orderByPurchaseDate()
            ->get();

        // Enrich with current values
        return $investments->map(function ($investment) {
            return [
                'id' => $investment->id,
                'token' => $investment->token,
                'chain' => $investment->chain,
                'amount_purchased' => (float) $investment->amount_purchased,
                'purchase_price_per_token' => (float) $investment->purchase_price_per_token,
                'purchase_total_usd' => (float) $investment->purchase_total_usd,
                'purchase_date' => $investment->purchase_date,
                'notes' => $investment->notes,
                'current_value_usd' => $investment->current_value,
                'pnl_usd' => $investment->pnl_usd,
                'pnl_percent' => $investment->pnl_percent,
            ];
        })->toArray();
    }

    /**
     * Get investment summary
     */
    public function getInvestmentSummary(User $user): array
    {
        $investments = $user->investments()->with('token')->get();

        $totalInvested = 0;
        $totalCurrentValue = 0;

        foreach ($investments as $investment) {
            $totalInvested += (float) $investment->purchase_total_usd;
            $currentPrice = $this->priceService->fetchPrice($investment->token);

            if ($currentPrice !== null) {
                $totalCurrentValue += (float) $investment->amount_purchased * $currentPrice;
            }
        }

        $totalPnL = $totalCurrentValue - $totalInvested;
        $totalPnLPercent = $totalInvested > 0
            ? (($totalPnL / $totalInvested) * 100)
            : 0;

        return [
            'total_invested_usd' => $totalInvested,
            'current_value_usd' => $totalCurrentValue,
            'pnl_usd' => $totalPnL,
            'pnl_percent' => $totalPnLPercent,
            'investment_count' => $investments->count(),
        ];
    }

    /**
     * Get historical PnL data
     * For now, returns empty array - will be implemented with snapshots later
     */
    public function getHistoricalPnL(User $user, string $period): array
    {
        // TODO: Implement with investment snapshots
        // For now, return empty array
        return [];
    }

    /**
     * Get user's current positions (investments minus sales)
     * Uses FIFO method to calculate cost basis correctly
     */
    public function getUserCurrentPositions(User $user): array
    {
        try {
            // Get all purchases and sales for each token/chain
            $allInvestments = $user->investments()
                ->with('token')
                ->orderBy('purchase_date', 'asc')
                ->get()
                ->groupBy(function ($item) {
                    return $item->token_id . '_' . $item->chain;
                });

            $positions = [];

            foreach ($allInvestments as $key => $investments) {
                $token = $investments->first()->token;
                $chain = $investments->first()->chain;

                // Build FIFO queue of purchases
                $purchaseQueue = [];
                foreach ($investments as $inv) {
                    $purchaseQueue[] = [
                        'id' => $inv->id,
                        'amount' => (float) $inv->amount_purchased,
                        'price' => (float) $inv->purchase_price_per_token,
                        'total' => (float) $inv->purchase_total_usd,
                        'date' => $inv->purchase_date,
                        'remaining' => (float) $inv->amount_purchased, // Track remaining amount
                    ];
                }

                // Get all sales for this token/chain
                $sales = DB::table('sales as s')
                    ->join('investments as i', 's.investment_id', '=', 'i.id')
                    ->where('i.user_id', $user->id)
                    ->where('i.token_id', $token->id)
                    ->where('i.chain', $chain)
                    ->orderBy('s.sale_date', 'asc')
                    ->get(['s.*']);

                // Process sales using FIFO
                foreach ($sales as $sale) {
                    $amountToSell = (float) $sale->amount_sold;

                    // Sell from oldest purchases first (FIFO)
                    foreach ($purchaseQueue as &$purchase) {
                        if ($amountToSell <= 0 || $purchase['remaining'] <= 0) {
                            continue;
                        }

                        $sellAmount = min($purchase['remaining'], $amountToSell);
                        $purchase['remaining'] -= $sellAmount;
                        $amountToSell -= $sellAmount;
                    }
                    unset($purchase);
                }

                // Calculate current position from remaining amounts
                $currentAmount = 0;
                $totalCostBasis = 0;
                $totalPurchased = 0;
                $totalSold = 0;
                $totalInvestedUsd = 0;

                foreach ($purchaseQueue as $purchase) {
                    $totalPurchased += $purchase['amount'];
                    $totalSold += ($purchase['amount'] - $purchase['remaining']);
                    $totalInvestedUsd += $purchase['total'];

                    // Only count remaining amount towards current position
                    if ($purchase['remaining'] > 0) {
                        $currentAmount += $purchase['remaining'];
                        $totalCostBasis += $purchase['remaining'] * $purchase['price'];
                    }
                }

                // Get current price
                $currentPrice = \App\Models\PriceHistory::where('token_id', $token->id)
                    ->latest('timestamp')
                    ->first()?->price_usd ?? 0;

                $currentValueUsd = $currentPrice > 0 ? $currentAmount * $currentPrice : 0;

                // PnL calculation
                // For closed positions: PnL = (Total sold value - Total cost)
                // For open positions: PnL = (Current value - Cost basis of remaining)
                $isClosedPosition = $currentAmount <= 0;

                if ($isClosedPosition) {
                    // Closed position - use total sales value
                    $totalSalesValue = $sales->sum('sale_total_usd') ?? 0;
                    $pnlUsd = $totalSalesValue - $totalInvestedUsd;
                    $pnlPercent = $totalInvestedUsd > 0 ? ($pnlUsd / $totalInvestedUsd) * 100 : 0;
                } else {
                    // Open position - use current value
                    $pnlUsd = $currentValueUsd - $totalCostBasis;
                    $pnlPercent = $totalCostBasis > 0 ? ($pnlUsd / $totalCostBasis) * 100 : 0;
                }

                // Load transactions for display
                $investmentRecords = $investments->map(function ($inv) {
                    return [
                        'type' => 'purchase',
                        'id' => $inv->id,
                        'amount' => (float) $inv->amount_purchased,
                        'price_usd' => (float) $inv->purchase_price_per_token,
                        'total_usd' => (float) $inv->purchase_total_usd,
                        'date' => $inv->purchase_date->toIso8601String(),
                        'notes' => $inv->notes,
                    ];
                })->toArray();

                $salesRecords = DB::table('sales as s')
                    ->join('investments as i', 's.investment_id', '=', 'i.id')
                    ->where('i.user_id', $user->id)
                    ->where('i.token_id', $token->id)
                    ->where('i.chain', $chain)
                    ->orderBy('s.sale_date', 'desc')
                    ->get(['s.*', 'i.token_id', 'i.chain'])
                    ->map(function ($sale) {
                        return [
                            'type' => 'sale',
                            'id' => $sale->id,
                            'amount' => (float) $sale->amount_sold,
                            'price_usd' => (float) $sale->sale_price_per_token,
                            'total_usd' => (float) $sale->sale_total_usd,
                            'date' => \Carbon\Carbon::parse($sale->sale_date)->toIso8601String(),
                        ];
                    })
                    ->toArray();

                $transactions = collect(array_merge($investmentRecords, $salesRecords))
                    ->sortByDesc('date')
                    ->values()
                    ->toArray();

                $averageBuyPrice = $currentAmount > 0 ? $totalCostBasis / $currentAmount : 0;

                $positions[] = [
                    'token' => $token,
                    'chain' => $chain,
                    'total_amount_purchased' => $totalPurchased,
                    'total_amount_sold' => $totalSold,
                    'current_amount' => $currentAmount,
                    'average_buy_price' => $averageBuyPrice,
                    'total_invested_usd' => $totalInvestedUsd, // Total invested for all purchases
                    'current_value_usd' => $currentValueUsd,
                    'pnl_usd' => $pnlUsd,
                    'pnl_percent' => $pnlPercent,
                    'purchase_count' => count($purchaseQueue),
                    'sale_count' => count($sales),
                    'transactions' => $transactions,
                    'is_closed' => $currentAmount <= 0, // Flag to identify closed positions
                ];
            }

            // Sort: open positions first by current value, then closed positions
            usort($positions, function ($a, $b) {
                // Closed positions go to the end
                $aClosed = $a['is_closed'] ?? false;
                $bClosed = $b['is_closed'] ?? false;

                if ($aClosed && !$bClosed) return 1;
                if (!$aClosed && $bClosed) return -1;

                // Both same status, sort by value
                return $b['current_value_usd'] <=> $a['current_value_usd'];
            });

            return $positions;
        } catch (\Exception $e) {
            \Log::error('Error in getUserCurrentPositions: ' . $e->getMessage());
            return [];
        }
    }
}
