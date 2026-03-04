<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\InvestmentService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class InvestmentController extends Controller
{
    public function __construct(
        protected InvestmentService $investmentService
    ) {}

    /**
     * Get all investments for user (grouped by token)
     */
    public function index(Request $request): JsonResponse
    {
        $view = $request->get('view', 'grouped'); // 'grouped' or 'individual'
        $investments = $this->investmentService->getUserInvestments(
            $request->user(),
            $view
        );

        return response()->json(['investments' => $investments]);
    }

    /**
     * Get single investment
     */
    public function show(Request $request, string $id): JsonResponse
    {
        $investment = $request->user()->investments()->with('token')->findOrFail($id);
        return response()->json(['investment' => $investment]);
    }

    /**
     * Store new investment
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'token_id' => 'required|integer|exists:tokens,id',
            'chain' => 'required|in:eth,sol,polygon,sui,base,op,bnb,btc,arb,linea,commodities,fiat',
            'amount_purchased' => 'required|numeric|min:0',
            'purchase_price_per_token' => 'required|numeric|min:0',
            'purchase_date' => 'required|date',
            'notes' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $investment = $this->investmentService->createInvestment(
                $request->user(),
                $request->all()
            );

            return response()->json([
                'message' => 'Investment created successfully',
                'investment' => $investment->load('token'),
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to create investment',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update investment
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'amount_purchased' => 'nullable|numeric|min:0',
            'purchase_price_per_token' => 'nullable|numeric|min:0',
            'purchase_date' => 'nullable|date',
            'notes' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $investment = $request->user()->investments()->findOrFail($id);
            $updated = $this->investmentService->updateInvestment(
                $investment,
                $request->all()
            );

            return response()->json([
                'message' => 'Investment updated successfully',
                'investment' => $updated->load('token'),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to update investment',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete investment
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        try {
            $investment = $request->user()->investments()->findOrFail($id);
            $this->investmentService->deleteInvestment($investment);

            return response()->json([
                'message' => 'Investment deleted successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to delete investment',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get investment summary (total PnL, etc.)
     */
    public function summary(Request $request): JsonResponse
    {
        $summary = $this->investmentService->getInvestmentSummary($request->user());

        return response()->json(['summary' => $summary]);
    }

    /**
     * Get historical PnL data
     */
    public function history(Request $request): JsonResponse
    {
        $period = $request->get('period', '1w');

        if (!in_array($period, ['1d', '1w', '1m', '3m', '6m', '1y', 'all'])) {
            return response()->json(['message' => 'Invalid period'], 422);
        }

        $history = $this->investmentService->getHistoricalPnL(
            $request->user(),
            $period
        );

        return response()->json(['history' => $history]);
    }

    /**
     * Get current positions (investments minus sales)
     */
    public function positions(Request $request): JsonResponse
    {
        $positions = $this->investmentService->getUserCurrentPositions($request->user());

        return response()->json(['positions' => $positions]);
    }
}
