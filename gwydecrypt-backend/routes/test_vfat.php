<?php

use Illuminate\Support\Facades\Route;
use App\Services\VfatService;

Route::get('/api/test-vfat', function () {
    ini_set('memory_limit', '512M');

    $results = [];

    try {
        // Test 1: Direct HTTP request
        $results['test1'] = [
            'name' => 'Direct HTTP request',
            'start' => microtime(true),
        ];

        $response = \Illuminate\Support\Facades\Http::timeout(60)
            ->withOptions([
                'verify' => false,
            ])
            ->get('https://info-api.vf.at/get-farms');

        $results['test1']['status'] = $response->status();
        $results['test1']['body_length'] = strlen($response->body());
        $results['test1']['duration'] = microtime(true) - $results['test1']['start'];

        if ($response->successful()) {
            $data = $response->json();
            $results['test1']['farm_count'] = is_array($data) ? count($data) : 'ERROR';
            $results['test1']['success'] = true;
        } else {
            $results['test1']['success'] = false;
            $results['test1']['error'] = 'HTTP ' . $response->status();
        }

    } catch (\Exception $e) {
        $results['test1'] = [
            'name' => 'Direct HTTP request',
            'success' => false,
            'error' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
        ];
    }

    try {
        // Test 2: VfatService fetchFarms
        $results['test2'] = [
            'name' => 'VfatService::fetchFarms',
            'start' => microtime(true),
        ];

        $vfatService = new VfatService();
        $farms = $vfatService->fetchFarms(false); // Don't use cache

        $results['test2']['farm_count'] = count($farms);
        $results['test2']['duration'] = microtime(true) - $results['test2']['start'];
        $results['test2']['success'] = count($farms) > 0;

    } catch (\Exception $e) {
        $results['test2'] = [
            'name' => 'VfatService::fetchFarms',
            'success' => false,
            'error' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
        ];
    }

    try {
        // Test 3: VfatService filterFarms
        $results['test3'] = [
            'name' => 'VfatService::filterFarms',
            'start' => microtime(true),
        ];

        $vfatService = new VfatService();
        $filtered = $vfatService->filterFarms([
            'min_tvl' => 100000,
            'limit' => 5,
        ]);

        $results['test3']['pool_count'] = count($filtered);
        $results['test3']['duration'] = microtime(true) - $results['test3']['start'];
        $results['test3']['success'] = count($filtered) > 0;

        if (count($filtered) > 0) {
            $results['test3']['sample_pool'] = $filtered[0];
        }

    } catch (\Exception $e) {
        $results['test3'] = [
            'name' => 'VfatService::filterFarms',
            'success' => false,
            'error' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
        ];
    }

    return response()->json([
        'tests' => $results,
        'memory_usage' => memory_get_peak_usage(true),
    ]);
});
