<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\SaleService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class SaleController extends Controller
{
    public function __construct(
        protected SaleService $saleService
    ) {}

    /**
     * Get all sales for user
     */
    public function index(Request $request): JsonResponse
    {
        $sales = $this->saleService->getUserSales($request->user());
        return response()->json(['sales' => $sales]);
    }

    /**
     * Store new sale
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'investment_id' => 'required|integer|exists:investments,id',
            'amount_sold' => 'required|numeric|min:0',
            'sale_price_per_token' => 'required|numeric|min:0',
            'sale_date' => 'required|date',
            'notes' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $sale = $this->saleService->createSale(
                $request->user(),
                $request->all()
            );

            return response()->json([
                'message' => 'Sale recorded successfully',
                'sale' => $sale->load('investment.token'),
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to record sale',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete sale (and restore investment amount)
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        try {
            $sale = \App\Models\Sale::whereHas('investment', function ($query) use ($request) {
                $query->where('user_id', $request->user()->id);
            })->findOrFail($id);

            $this->saleService->deleteSale($sale);

            return response()->json([
                'message' => 'Sale deleted successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to delete sale',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update sale
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'amount_sold' => 'sometimes|required|numeric|min:0',
            'sale_price_per_token' => 'sometimes|required|numeric|min:0',
            'sale_date' => 'sometimes|required|date',
            'notes' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $sale = \App\Models\Sale::whereHas('investment', function ($query) use ($request) {
                $query->where('user_id', $request->user()->id);
            })->findOrFail($id);

            $updatedSale = $this->saleService->updateSale($sale, $request->all());

            return response()->json([
                'message' => 'Sale updated successfully',
                'sale' => $updatedSale->load('investment.token'),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to update sale',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get available investments for sale
     */
    public function available(Request $request): JsonResponse
    {
        $investments = $this->saleService->getAvailableInvestments($request->user());
        return response()->json(['investments' => $investments]);
    }

    /**
     * Get sales summary
     */
    public function summary(Request $request): JsonResponse
    {
        $summary = $this->saleService->getSalesSummary($request->user());
        return response()->json(['summary' => $summary]);
    }
}
