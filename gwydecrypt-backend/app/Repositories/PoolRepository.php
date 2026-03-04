<?php

namespace App\Repositories;

use App\Models\Pool;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;

class PoolRepository
{
    /**
     * Get filtered pools with pagination.
     */
    public function getFilteredPools(array $filters): LengthAwarePaginator
    {
        $query = Pool::query()
            ->active();

        // Solo cargar assets y rewards si se solicitan explícitamente
        // Esto evita problemas de memoria con miles de pools
        if (!empty($filters['with_assets']) || !empty($filters['with_details'])) {
            $query->with(['assets', 'rewards']);
        }

        // Apply filters
        $this->applyFilters($query, $filters);

        // Apply sorting
        $sortBy = $filters['sort_by'] ?? 'tvl_usd';
        $sortOrder = $filters['sort_order'] ?? 'desc';
        $query->orderBy($sortBy, $sortOrder);

        // Paginate
        $perPage = min($filters['limit'] ?? 50, 100); // Max 100 per page

        return $query->paginate($perPage);
    }

    /**
     * Get top pools by APY.
     */
    public function getTopPoolsByApy(int $limit = 20): Collection
    {
        return Pool::query()
            ->active()
            ->with(['assets', 'rewards'])
            ->orderBy('apy', 'desc')
            ->limit($limit)
            ->get();
    }

    /**
     * Get pools by chain.
     */
    public function getPoolsByChain(string $chainName, int $limit = 50): Collection
    {
        return Pool::query()
            ->active()
            ->byChain($chainName)
            ->with(['assets', 'rewards'])
            ->orderBy('tvl_usd', 'desc')
            ->limit($limit)
            ->get();
    }

    /**
     * Find pool by address.
     */
    public function findByAddress(string $address): ?Pool
    {
        return Pool::query()
            ->with(['assets', 'rewards'])
            ->where('pool_address', $address)
            ->first();
    }

    /**
     * Get available chains.
     */
    public function getAvailableChains(): array
    {
        return Pool::query()
            ->active()
            ->select('chain_name')
            ->distinct()
            ->orderBy('chain_name')
            ->pluck('chain_name')
            ->toArray();
    }

    /**
     * Get pools statistics.
     */
    public function getStatistics(): array
    {
        $query = Pool::query()->active();

        return [
            'total_pools' => $query->count(),
            'total_tvl' => (float) $query->sum('tvl_usd'),
            'avg_apy' => (float) $query->avg('apy'),
            'by_chain' => $this->getChainsWithStats(),
            'best_apy' => $this->getBestApyPool(),
            'highest_tvl' => $this->getHighestTvlPool(),
        ];
    }

    /**
     * Get stats by chain.
     */
    public function getChainsWithStats(): array
    {
        $chains = Pool::query()
            ->active()
            ->selectRaw('
                chain_id,
                chain_name,
                COUNT(*) as pool_count,
                SUM(tvl_usd) as total_tvl,
                AVG(apy) as avg_apy
            ')
            ->groupBy('chain_id', 'chain_name')
            ->orderByDesc('total_tvl')
            ->get();

        $result = [];
        foreach ($chains as $chain) {
            $result[$chain->chain_name] = [
                'count' => $chain->pool_count,
                'total_tvl' => (float) $chain->total_tvl,
                'avg_apy' => round((float) $chain->avg_apy, 2),
            ];
        }

        return $result;
    }

    /**
     * Get pool with best APY.
     */
    protected function getBestApyPool(): ?array
    {
        $pool = Pool::query()
            ->active()
            ->orderByDesc('apy')
            ->first();

        if (!$pool) {
            return null;
        }

        return [
            'name' => $pool->name,
            'apy' => (float) $pool->apy,
            'chain' => $pool->chain_name,
        ];
    }

    /**
     * Get pool with highest TVL.
     */
    protected function getHighestTvlPool(): ?array
    {
        $pool = Pool::query()
            ->active()
            ->orderByDesc('tvl_usd')
            ->first();

        if (!$pool) {
            return null;
        }

        return [
            'name' => $pool->name,
            'tvlUsd' => (float) $pool->tvl_usd,
            'chain' => $pool->chain_name,
        ];
    }

    /**
     * Apply filters to query.
     */
    protected function applyFilters(Builder $query, array $filters): void
    {
        // Chain filter
        if (!empty($filters['chain'])) {
            $query->byChain($filters['chain']);
        }

        // TVL filter
        if (!empty($filters['min_tvl'])) {
            $query->minTvl((float) $filters['min_tvl']);
        }

        // APY filter
        if (!empty($filters['min_apy'])) {
            $query->minApy((float) $filters['min_apy']);
        }

        // Stablecoin filter
        if (!empty($filters['stablecoin_only'])) {
            $query->stablecoinsOnly();
        }

        // Pool type filter (vfat específico)
        if (!empty($filters['pool_type'])) {
            $query->where('pool_type', $filters['pool_type']);
        }
    }
}
