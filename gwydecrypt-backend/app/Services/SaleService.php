<?php

namespace App\Services;

use App\Models\User;
use App\Models\Investment;
use App\Models\Sale;
use Illuminate\Support\Facades\DB;

class SaleService
{
    /**
     * Create a new sale and reduce investment amount
     */
    public function createSale(User $user, array $data): Sale
    {
        return DB::transaction(function () use ($user, $data) {
            $investment = $user->investments()->findOrFail($data['investment_id']);

            // Verify enough remaining amount
            if ($investment->amount_remaining < $data['amount_sold']) {
                throw new \Exception('Not enough tokens remaining in this investment');
            }

            // Calculate sale total
            $saleTotal = $data['amount_sold'] * $data['sale_price_per_token'];

            // Get average buy price (DCA)
            $avgBuyPrice = $investment->average_buy_price;

            // Calculate PnL
            $pnlUsd = ($data['sale_price_per_token'] - $avgBuyPrice) * $data['amount_sold'];
            $pnlPercent = $avgBuyPrice > 0 ? (($pnlUsd / ($avgBuyPrice * $data['amount_sold'])) * 100) : 0;

            // Create sale record
            $sale = Sale::create([
                'investment_id' => $investment->id,
                'amount_sold' => $data['amount_sold'],
                'sale_price_per_token' => $data['sale_price_per_token'],
                'sale_total_usd' => $saleTotal,
                'sale_date' => $data['sale_date'],
                'avg_buy_price' => $avgBuyPrice,
                'pnl_usd' => $pnlUsd,
                'pnl_percent' => $pnlPercent,
                'notes' => $data['notes'] ?? null,
            ]);

            // Reduce investment amount_remaining
            $investment->update([
                'amount_remaining' => $investment->amount_remaining - $data['amount_sold'],
            ]);

            return $sale;
        });
    }

    /**
     * Delete sale and restore investment amount
     */
    public function deleteSale(Sale $sale): void
    {
        DB::transaction(function () use ($sale) {
            $investment = $sale->investment;

            // Restore investment amount
            $investment->update([
                'amount_remaining' => $investment->amount_remaining + $sale->amount_sold,
            ]);

            // Delete sale record
            $sale->delete();
        });
    }

    /**
     * Update sale
     */
    public function updateSale(Sale $sale, array $data): Sale
    {
        return DB::transaction(function () use ($sale, $data) {
            $investment = $sale->investment;
            $oldAmountSold = $sale->amount_sold;

            // Calculate new sale total
            if (isset($data['amount_sold']) && isset($data['sale_price_per_token'])) {
                $saleTotal = $data['amount_sold'] * $data['sale_price_per_token'];
                $data['sale_total_usd'] = $saleTotal;
            } elseif (isset($data['amount_sold'])) {
                // Only amount changed, keep same price
                $saleTotal = $data['amount_sold'] * $sale->sale_price_per_token;
                $data['sale_total_usd'] = $saleTotal;
            } elseif (isset($data['sale_price_per_token'])) {
                // Only price changed, keep same amount
                $saleTotal = $sale->amount_sold * $data['sale_price_per_token'];
                $data['sale_total_usd'] = $saleTotal;
            }

            // Recalculate PnL
            if (isset($data['amount_sold']) || isset($data['sale_price_per_token'])) {
                $avgBuyPrice = $investment->average_buy_price;
                $newAmountSold = $data['amount_sold'] ?? $sale->amount_sold;
                $newPricePerToken = $data['sale_price_per_token'] ?? $sale->sale_price_per_token;

                $pnlUsd = ($newPricePerToken - $avgBuyPrice) * $newAmountSold;
                $pnlPercent = $avgBuyPrice > 0 ? (($pnlUsd / ($avgBuyPrice * $newAmountSold)) * 100) : 0;

                $data['pnl_usd'] = $pnlUsd;
                $data['pnl_percent'] = $pnlPercent;
            }

            // Update sale
            $sale->update($data);

            // Adjust investment amount_remaining if amount_sold changed
            if (isset($data['amount_sold'])) {
                $difference = $oldAmountSold - $data['amount_sold'];
                $newRemaining = $investment->amount_remaining + $difference;
                $investment->update(['amount_remaining' => $newRemaining]);
            }

            return $sale->fresh();
        });
    }

    /**
     * Get all sales for user with investment info
     */
    public function getUserSales(User $user): array
    {
        // Get sales through user's investments
        $sales = Sale::whereHas('investment', function ($query) use ($user) {
            $query->where('user_id', $user->id);
        })
            ->with('investment.token')
            ->orderBySaleDate()
            ->get();

        return $sales->map(function ($sale) {
            return [
                'id' => $sale->id,
                'investment' => [
                    'id' => $sale->investment->id,
                    'token' => $sale->investment->token,
                    'chain' => $sale->investment->chain,
                    'amount_purchased' => (float) $sale->investment->amount_purchased,
                    'amount_remaining' => (float) $sale->investment->amount_remaining,
                ],
                'amount_sold' => (float) $sale->amount_sold,
                'sale_price_per_token' => (float) $sale->sale_price_per_token,
                'sale_total_usd' => (float) $sale->sale_total_usd,
                'sale_date' => $sale->sale_date->format('Y-m-d H:i:s'),
                'avg_buy_price' => (float) $sale->avg_buy_price,
                'pnl_usd' => (float) $sale->pnl_usd,
                'pnl_percent' => (float) $sale->pnl_percent,
                'notes' => $sale->notes,
            ];
        })->toArray();
    }

    /**
     * Get available investments for sale (with remaining amount)
     */
    public function getAvailableInvestments(User $user): array
    {
        $investments = $user->investments()
            ->with('token')
            ->withRemaining()
            ->orderByPurchaseDate()
            ->get();

        return $investments->map(function ($investment) {
            return [
                'id' => $investment->id,
                'token' => $investment->token,
                'chain' => $investment->chain,
                'amount_purchased' => (float) $investment->amount_purchased,
                'amount_remaining' => (float) $investment->amount_remaining,
                'average_buy_price' => $investment->average_buy_price,
                'purchase_date' => $investment->purchase_date,
            ];
        })->toArray();
    }

    /**
     * Get sales summary
     */
    public function getSalesSummary(User $user): array
    {
        // Get sales through user's investments
        $sales = Sale::whereHas('investment', function ($query) use ($user) {
            $query->where('user_id', $user->id);
        })->get();

        $totalSold = 0;
        $totalRevenue = 0;
        $totalCost = 0;
        $totalPnL = 0;

        foreach ($sales as $sale) {
            $totalSold += (float) $sale->amount_sold;
            $totalRevenue += (float) $sale->sale_total_usd;
            $totalCost += (float) $sale->avg_buy_price * (float) $sale->amount_sold;
        }

        $totalPnL = $totalRevenue - $totalCost;
        $totalPnLPercent = $totalCost > 0 ? (($totalPnL / $totalCost) * 100) : 0;

        return [
            'total_sold' => $totalSold,
            'total_revenue_usd' => $totalRevenue,
            'total_cost_usd' => $totalCost,
            'total_pnl_usd' => $totalPnL,
            'total_pnl_percent' => $totalPnLPercent,
            'sales_count' => $sales->count(),
        ];
    }
}
