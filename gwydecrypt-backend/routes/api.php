<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\WalletController;
use App\Http\Controllers\Api\PortfolioController;
use App\Http\Controllers\Api\InvestmentController;
use App\Http\Controllers\Api\SaleController;
use App\Http\Controllers\Api\PolymarketController;
use App\Http\Controllers\Api\PoolsController;
use App\Http\Controllers\Api\Admin\ProviderController;
use App\Http\Controllers\Api\Admin\TokenController;
use App\Http\Controllers\Api\Admin\UserManagementController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

/*
|--------------------------------------------------------------------------
| PUBLIC ROUTES
|--------------------------------------------------------------------------
*/

// Health check (public, no auth required)
Route::get('/health', function () {
    return response()->json(['status' => 'ok', 'timestamp' => now()->toIso8601String()]);
});

/*
|--------------------------------------------------------------------------
| PUBLIC AUTH ROUTES (No authentication required)
|--------------------------------------------------------------------------
*/
Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
});

// Debug route - temporary
Route::get('/debug/investments', function () {
    $user = \App\Models\User::first();
    $investments = $user->investments()->with('token')->get();

    $data = [
        'user' => $user->email,
        'user_is_approved' => $user->is_approved,
        'user_is_admin' => $user->is_admin,
        'investments_count' => $investments->count(),
        'investments' => []
    ];

    foreach ($investments as $inv) {
        $data['investments'][] = [
            'id' => $inv->id,
            'token_id' => $inv->token_id,
            'token_symbol' => $inv->token ? $inv->token->symbol : 'NULL',
            'token_loaded' => $inv->token !== null,
            'chain' => $inv->chain,
            'amount' => $inv->amount_purchased,
            'price' => $inv->purchase_price_per_token,
        ];
    }

    return response()->json($data);
});

Route::middleware('auth:sanctum')->group(function () {

    /*
    |--------------------------------------------------------------------------
    | AUTH ROUTES (Authentication required)
    |--------------------------------------------------------------------------
    */
    Route::prefix('auth')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::post('/refresh', [AuthController::class, 'refresh']);
        Route::get('/me', [AuthController::class, 'me']);
        Route::put('/profile', [AuthController::class, 'updateProfile']);
        Route::put('/password', [AuthController::class, 'updatePassword']);
    });

    /*
    |--------------------------------------------------------------------------
    | WALLET ROUTES
    |--------------------------------------------------------------------------
    */
    Route::prefix('wallets')->group(function () {
        Route::get('/', [WalletController::class, 'index']);
        Route::post('/', [WalletController::class, 'store']);
        Route::get('/{id}', [WalletController::class, 'show']);
        Route::put('/{id}', [WalletController::class, 'update']);
        Route::delete('/{id}', [WalletController::class, 'destroy']);
        Route::post('/{id}/tokens', [WalletController::class, 'addToken']);
        Route::put('/{id}/tokens/{tokenId}', [WalletController::class, 'updateToken']);
        Route::delete('/{id}/tokens/{tokenId}', [WalletController::class, 'removeToken']);
        Route::post('/{id}/toggle', [WalletController::class, 'toggle']);
    });

    /*
    |--------------------------------------------------------------------------
    | PORTFOLIO ROUTES
    |--------------------------------------------------------------------------
    */
    Route::prefix('portfolio')->group(function () {
        Route::get('/', [PortfolioController::class, 'index']);
        Route::post('/update-prices', [PortfolioController::class, 'updatePrices']);
        Route::post('/create-snapshot', [PortfolioController::class, 'createSnapshot']);
        Route::get('/distribution', [PortfolioController::class, 'distribution']);
        Route::get('/history', [PortfolioController::class, 'history']);
        Route::get('/token/{tokenId}/performance', [PortfolioController::class, 'tokenPerformance']);
        Route::get('/performers/best', [PortfolioController::class, 'bestPerformers']);
        Route::get('/performers/worst', [PortfolioController::class, 'worstPerformers']);
        Route::get('/change/daily', [PortfolioController::class, 'dailyChange']);
        Route::get('/change/weekly', [PortfolioController::class, 'weeklyChange']);
        Route::get('/change/monthly', [PortfolioController::class, 'monthlyChange']);
        Route::get('/compare-market', [PortfolioController::class, 'compareMarket']);
    });

    /*
    |--------------------------------------------------------------------------
    | INVESTMENT ROUTES
    |--------------------------------------------------------------------------
    */
    Route::prefix('investments')->group(function () {
        Route::get('/', [InvestmentController::class, 'index']);
        Route::get('/summary', [InvestmentController::class, 'summary']);
        Route::get('/history', [InvestmentController::class, 'history']);
        Route::get('/positions', [InvestmentController::class, 'positions']);
        Route::post('/', [InvestmentController::class, 'store']);
        Route::get('/{id}', [InvestmentController::class, 'show']);
        Route::put('/{id}', [InvestmentController::class, 'update']);
        Route::delete('/{id}', [InvestmentController::class, 'destroy']);
    });

    /*
    |--------------------------------------------------------------------------
    | SALES ROUTES
    |--------------------------------------------------------------------------
    */
    Route::prefix('sales')->group(function () {
        Route::get('/', [SaleController::class, 'index']);
        Route::get('/available', [SaleController::class, 'available']);
        Route::get('/summary', [SaleController::class, 'summary']);
        Route::post('/', [SaleController::class, 'store']);
        Route::delete('/{id}', [SaleController::class, 'destroy']);
    });

    /*
    |--------------------------------------------------------------------------
    | ADMIN ROUTES (Requires admin role)
    |--------------------------------------------------------------------------
    */
    Route::middleware(['admin'])->prefix('admin')->group(function () {

        // Provider Management
        Route::prefix('providers')->group(function () {
            Route::get('/', [ProviderController::class, 'index']);
            Route::post('/', [ProviderController::class, 'store']);
            Route::get('/{id}', [ProviderController::class, 'show']);
            Route::put('/{id}', [ProviderController::class, 'update']);
            Route::delete('/{id}', [ProviderController::class, 'destroy']);
            Route::post('/{id}/toggle', [ProviderController::class, 'toggle']);
            Route::put('/{id}/priority', [ProviderController::class, 'setPriority']);
            Route::get('/{id}/success-rate', [ProviderController::class, 'successRate']);
            Route::get('/{id}/avg-response-time', [ProviderController::class, 'avgResponseTime']);
            Route::get('/{id}/failed-fetches', [ProviderController::class, 'failedFetches']);
        });

        // Token Management
        Route::prefix('tokens')->group(function () {
            Route::get('/', [TokenController::class, 'index']);
            Route::post('/', [TokenController::class, 'store']);
            Route::get('/{id}', [TokenController::class, 'show']);
            Route::put('/{id}', [TokenController::class, 'update']);
            Route::delete('/{id}', [TokenController::class, 'destroy']);
            Route::post('/{id}/coingecko-id', [TokenController::class, 'setCoinGeckoId']);
            Route::post('/{id}/sync-metadata', [TokenController::class, 'syncMetadata']);
            Route::post('/{id}/toggle-dashboard', [TokenController::class, 'toggleDashboard']);
            Route::post('/import', [TokenController::class, 'import']);
            Route::post('/reorder', [TokenController::class, 'reorder']);
        });

        // User Management
        Route::prefix('users')->group(function () {
            Route::get('/', [UserManagementController::class, 'index']);
            Route::get('/stats', [UserManagementController::class, 'stats']);
            Route::get('/{id}', [UserManagementController::class, 'show']);
            Route::post('/{id}/approve', [UserManagementController::class, 'approve']);
            Route::post('/{id}/reject', [UserManagementController::class, 'reject']);
            Route::put('/{id}/role', [UserManagementController::class, 'updateRole']);
            Route::delete('/{id}', [UserManagementController::class, 'destroy']);
        });

        // System Stats
        Route::get('/stats', function () {
            $adminService = app(\App\Services\AdminPanelService::class);
            return response()->json(['stats' => $adminService->getSystemStats()]);
        });
    });
});

/*
|--------------------------------------------------------------------------
| MARKET ROUTES (Public - no auth required)
|--------------------------------------------------------------------------
*/
Route::prefix('market')->group(function () {
    // Get all tokens
    // Get all tokens
    Route::get('/tokens', function (Request $request) {
        $query = \App\Models\Token::with('tokenChains')
            ->select('id', 'symbol', 'name', 'coingecko_id', 'show_on_dashboard', 'sort_order');

        // Filter for dashboard if requested
        if ($request->has('dashboard')) {
            $query->where('show_on_dashboard', true);
        }

        // Filter by chain if requested
        if ($request->has('chain')) {
            $chain = $request->get('chain');
            $query->whereHas('tokenChains', function ($q) use ($chain) {
                $q->where('chain', $chain);
            });
        }

        $tokens = $query->orderBy('sort_order')->orderBy('symbol')->get();

        return response()->json([
            'tokens' => $tokens,
        ]);
    });

    // Get popular tokens prices
    Route::get('/popular', function () {
        $priceService = app(\App\Services\PriceAggregatorService::class);
        $prices = $priceService->getPopularTokensPrices();

        return response()->json([
            'prices' => $prices,
        ]);
    });

    // Get token price history (public)
    Route::get('/token/{id}/history', function (Request $request, $id) {
        $token = \App\Models\Token::findOrFail($id);
        $period = $request->get('period', '1w');

        $priceService = app(\App\Services\PriceAggregatorService::class);
        $history = $priceService->fetchPriceHistory($token, $period);

        return response()->json([
            'history' => $history,
        ]);
    });
});

/*
|--------------------------------------------------------------------------
| POLYMARKET ROUTES (Public - no auth required)
|--------------------------------------------------------------------------
*/
Route::prefix('polymarket')->group(function () {
    Route::get('/trending', [PolymarketController::class, 'trending']);
});

/*
|--------------------------------------------------------------------------
| POOLS ROUTES (Public - no auth required)
|--------------------------------------------------------------------------
*/
Route::prefix('pools')->group(function () {
    Route::get('/', [PoolsController::class, 'index']);
    Route::get('/top', [PoolsController::class, 'topByApy']);
    Route::get('/chains', [PoolsController::class, 'chains']);
    Route::get('/{poolId}', [PoolsController::class, 'show']);
});

/*
|--------------------------------------------------------------------------
| VFAT ROUTES (Public - no auth required, user positions require auth)
|--------------------------------------------------------------------------
*/
use App\Http\Controllers\Api\VfatController;

Route::prefix('vfat')->group(function () {
    // Farms (con rewards) - Compatible con vfat.io
    Route::get('/farms', [VfatController::class, 'farms']);
    Route::get('/yield', [VfatController::class, 'yield']); // Alias para vfat.io

    // Pools (todos o simple según parámetro)
    Route::get('/pools', [VfatController::class, 'pools']);

    // Chains disponibles
    Route::get('/chains', [VfatController::class, 'chains']);
});

// User positions (requiere autenticación)
Route::middleware('auth:sanctum')->prefix('vfat/user')->group(function () {
    Route::get('/positions', [VfatController::class, 'userPositions']);
    Route::post('/positions/sync', [VfatController::class, 'syncUserPositions']);
});

// Closed positions (requiere autenticación)
Route::middleware('auth:sanctum')->prefix('vfat')->group(function () {
    Route::get('/closed-positions', [VfatController::class, 'closedPositions']);
    Route::post('/closed-positions/sync', [VfatController::class, 'syncClosedPositions']);
});

// Test vfat integration
Route::get('/test-vfat', function () {
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

        $vfatService = new \App\Services\VfatService();
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

        $vfatService = new \App\Services\VfatService();
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
