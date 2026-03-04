<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\AdminPanelService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ProviderController extends Controller
{
    public function __construct(
        protected AdminPanelService $adminService
    ) {
        // Middleware will be applied in routes
    }

    /**
     * List all providers.
     */
    public function index(): JsonResponse
    {
        $providers = $this->adminService->listProviders();

        return response()->json([
            'providers' => $providers,
        ]);
    }

    /**
     * Store new provider.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|in:coingecko,zerion,jupiter',
            'base_url' => 'required|string|url',
            'api_key' => 'nullable|string',
            'is_active' => 'boolean',
            'priority' => 'integer|min:1',
            'rate_limit_per_minute' => 'integer|min:1',
            'rate_limit_per_day' => 'integer|min:1',
        ]);

        $provider = $this->adminService->addProvider($validated);

        return response()->json([
            'message' => 'Provider created successfully',
            'provider' => $provider,
        ], 201);
    }

    /**
     * Get provider details.
     */
    public function show(string $id): JsonResponse
    {
        $stats = $this->adminService->getProviderStats($id);

        return response()->json([
            'provider' => $stats,
        ]);
    }

    /**
     * Update provider.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|in:coingecko,zerion,jupiter',
            'base_url' => 'sometimes|string|url',
            'api_key' => 'nullable|string',
            'is_active' => 'sometimes|boolean',
            'priority' => 'sometimes|integer|min:1',
            'rate_limit_per_minute' => 'sometimes|integer|min:1',
            'rate_limit_per_day' => 'sometimes|integer|min:1',
        ]);

        $provider = $this->adminService->updateProvider($id, $validated);

        return response()->json([
            'message' => 'Provider updated successfully',
            'provider' => $provider,
        ]);
    }

    /**
     * Delete provider.
     */
    public function destroy(string $id): JsonResponse
    {
        $this->adminService->deleteProvider($id);

        return response()->json([
            'message' => 'Provider deleted successfully',
        ]);
    }

    /**
     * Toggle provider active status.
     */
    public function toggle(string $id): JsonResponse
    {
        $isActive = $this->adminService->toggleProvider($id);

        return response()->json([
            'message' => 'Provider status updated',
            'is_active' => $isActive,
        ]);
    }

    /**
     * Set provider priority.
     */
    public function setPriority(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'priority' => 'required|integer|min:1',
        ]);

        $this->adminService->setProviderPriority($id, $validated['priority']);

        return response()->json([
            'message' => 'Provider priority updated',
        ]);
    }

    /**
     * Get provider success rate.
     */
    public function successRate(Request $request, string $id): JsonResponse
    {
        $days = min($request->get('days', 7), 90);
        $rate = $this->adminService->getFetchSuccessRate($id, $days);

        return response()->json([
            'success_rate' => $rate,
            'period_days' => $days,
        ]);
    }

    /**
     * Get provider average response time.
     */
    public function avgResponseTime(Request $request, string $id): JsonResponse
    {
        $days = min($request->get('days', 7), 90);
        $time = $this->adminService->getAverageResponseTime($id, $days);

        return response()->json([
            'avg_response_time_ms' => $time,
            'period_days' => $days,
        ]);
    }

    /**
     * Get failed fetches.
     */
    public function failedFetches(Request $request, string $id): JsonResponse
    {
        $limit = min($request->get('limit', 50), 500);
        $logs = $this->adminService->getFailedFetches($id, $limit);

        return response()->json([
            'logs' => $logs,
        ]);
    }
}
