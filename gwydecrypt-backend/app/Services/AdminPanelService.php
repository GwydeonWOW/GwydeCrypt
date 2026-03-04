<?php

namespace App\Services;

use App\Models\ApiProvider;
use App\Models\PriceFetchLog;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class AdminPanelService
{
    /**
     * List all providers.
     */
    public function listProviders(): \Illuminate\Database\Eloquent\Collection
    {
        return ApiProvider::orderBy('priority')->get();
    }

    /**
     * Add new provider.
     */
    public function addProvider(array $data): ApiProvider
    {
        return ApiProvider::create([
            'name' => $data['name'],
            'provider_type' => $data['provider_type'] ?? 'price',
            'chain' => $data['chain'] ?? null,
            'base_url' => $data['base_url'],
            'api_key' => $data['api_key'] ?? null,
            'is_active' => $data['is_active'] ?? true,
            'priority' => $data['priority'] ?? 999,
            'rate_limit_per_minute' => $data['rate_limit_per_minute'] ?? 100,
            'rate_limit_per_day' => $data['rate_limit_per_day'] ?? 10000,
        ]);
    }

    /**
     * Update provider.
     */
    public function updateProvider(string $providerId, array $data): ApiProvider
    {
        $provider = ApiProvider::findOrFail($providerId);

        if (isset($data['api_key'])) {
            $data['api_key'] = $data['api_key']; // Will be encrypted by model mutator
        }

        $provider->update($data);

        return $provider->fresh();
    }

    /**
     * Delete provider.
     */
    public function deleteProvider(string $providerId): void
    {
        $provider = ApiProvider::findOrFail($providerId);
        $provider->delete();
    }

    /**
     * Toggle provider active status.
     */
    public function toggleProvider(string $providerId): bool
    {
        $provider = ApiProvider::findOrFail($providerId);
        $provider->update(['is_active' => !$provider->is_active]);

        return $provider->is_active;
    }

    /**
     * Set provider priority.
     */
    public function setProviderPriority(string $providerId, int $priority): void
    {
        $provider = ApiProvider::findOrFail($providerId);
        $provider->update(['priority' => $priority]);
    }

    /**
     * Get provider stats.
     */
    public function getProviderStats(string $providerId): array
    {
        $provider = ApiProvider::findOrFail($providerId);

        return [
            'provider' => $provider,
            'success_rate' => $provider->success_rate,
            'success_count' => $provider->success_count,
            'failure_count' => $provider->failure_count,
            'last_used_at' => $provider->last_used_at,
        ];
    }

    /**
     * Get fetch success rate for a period.
     */
    public function getFetchSuccessRate(string $providerId, int $days = 7): float
    {
        $total = PriceFetchLog::where('provider_id', $providerId)
            ->where('timestamp', '>=', now()->subDays($days))
            ->count();

        if ($total === 0) {
            return 0.0;
        }

        $successful = PriceFetchLog::where('provider_id', $providerId)
            ->where('timestamp', '>=', now()->subDays($days))
            ->where('success', true)
            ->count();

        return round(($successful / $total) * 100, 2);
    }

    /**
     * Get average response time.
     */
    public function getAverageResponseTime(string $providerId, int $days = 7): int
    {
        return (int) PriceFetchLog::where('provider_id', $providerId)
            ->where('timestamp', '>=', now()->subDays($days))
            ->where('success', true)
            ->avg('response_time_ms') ?? 0;
    }

    /**
     * Get failed fetches.
     */
    public function getFailedFetches(string $providerId, int $limit = 50): \Illuminate\Database\Eloquent\Collection
    {
        return PriceFetchLog::where('provider_id', $providerId)
            ->where('success', false)
            ->with('token')
            ->latest('timestamp')
            ->limit($limit)
            ->get();
    }

    /**
     * Get system overview stats.
     */
    public function getSystemStats(): array
    {
        $activeProviders = ApiProvider::active()->count();
        $totalFetches24h = PriceFetchLog::where('timestamp', '>=', now()->subDay())->count();
        $successfulFetches24h = PriceFetchLog::where('timestamp', '>=', now()->subDay())
            ->where('success', true)
            ->count();

        return [
            'active_providers' => $activeProviders,
            'total_fetches_24h' => $totalFetches24h,
            'successful_fetches_24h' => $successfulFetches24h,
            'success_rate_24h' => $totalFetches24h > 0
                ? round(($successfulFetches24h / $totalFetches24h) * 100, 2)
                : 0,
        ];
    }
}
