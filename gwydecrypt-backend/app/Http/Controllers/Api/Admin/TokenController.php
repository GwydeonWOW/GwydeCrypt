<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Token;
use App\Services\TokenConfigService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class TokenController extends Controller
{
    public function __construct(
        protected TokenConfigService $tokenService
    ) {
        // Middleware will be applied in routes
    }

    /**
     * List all tokens.
     */
    public function index(Request $request): JsonResponse
    {
        $filters = [
            'chain' => $request->get('chain'),
            'popular' => $request->get('popular'),
            'search' => $request->get('search'),
        ];

        $tokens = $this->tokenService->listTokens($filters);

        return response()->json([
            'tokens' => $tokens,
        ]);
    }

    /**
     * Store new token.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'symbol' => 'required|string|max:20',
            'name' => 'required|string|max:255',
            'chains' => 'required|array|min:1',
            'chains.*.chain' => 'required|in:eth,sol,polygon,sui,base,op,bnb,btc,arb,linea,commodities,fiat',
            'chains.*.contract_address' => 'nullable|string',
            'chains.*.decimals' => 'integer|min:0|max:18',
            'chains.*.tradingview_symbol' => 'nullable|string',
            'coingecko_id' => 'nullable|string',
            'zerion_id' => 'nullable|string',
            'jupiter_id' => 'nullable|string',
            'logo_url' => 'nullable|url',
            'is_popular' => 'boolean',
            'primary_provider' => 'in:coingecko,zerion,jupiter',
        ]);

        $token = $this->tokenService->addToken($validated);

        return response()->json([
            'message' => 'Token created successfully',
            'token' => $token,
        ], 201);
    }

    /**
     * Get token details.
     */
    public function show(string $id): JsonResponse
    {
        $token = Token::with('priceHistory', 'tokenChains')->findOrFail($id);

        return response()->json([
            'token' => $token,
        ]);
    }

    /**
     * Update token.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'symbol' => 'sometimes|string|max:20',
            'name' => 'sometimes|string|max:255',
            'chains' => 'sometimes|array|min:1',
            'chains.*.chain' => 'required|in:eth,sol,polygon,sui,base,op,bnb,btc,arb,linea,commodities,fiat',
            'chains.*.contract_address' => 'nullable|string',
            'chains.*.decimals' => 'sometimes|integer|min:0|max:18',
            'chains.*.tradingview_symbol' => 'sometimes|nullable|string',
            'coingecko_id' => 'nullable|string',
            'zerion_id' => 'nullable|string',
            'jupiter_id' => 'nullable|string',
            'logo_url' => 'nullable|url',
            'is_popular' => 'sometimes|boolean',
            'primary_provider' => 'sometimes|in:coingecko,zerion,jupiter',
        ]);

        $token = $this->tokenService->updateToken($id, $validated);

        return response()->json([
            'message' => 'Token updated successfully',
            'token' => $token,
        ]);
    }

    /**
     * Delete token.
     */
    public function destroy(string $id): JsonResponse
    {
        $this->tokenService->deleteToken($id);

        return response()->json([
            'message' => 'Token deleted successfully',
        ]);
    }

    /**
     * Set CoinGecko ID for token.
     */
    public function setCoinGeckoId(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'coingecko_id' => 'required|string',
        ]);

        $token = Token::findOrFail($id);
        $this->tokenService->setCoinGeckoId($token, $validated['coingecko_id']);

        return response()->json([
            'message' => 'CoinGecko ID updated',
            'token' => $token->fresh(),
        ]);
    }

    /**
     * Set Zerion ID for token.
     */
    public function setZerionId(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'zerion_id' => 'required|string',
        ]);

        $token = Token::findOrFail($id);
        $this->tokenService->setZerionId($token, $validated['zerion_id']);

        return response()->json([
            'message' => 'Zerion ID updated',
            'token' => $token->fresh(),
        ]);
    }

    /**
     * Set Jupiter ID for token.
     */
    public function setJupiterId(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'jupiter_id' => 'required|string',
        ]);

        $token = Token::findOrFail($id);
        $this->tokenService->setJupiterId($token, $validated['jupiter_id']);

        return response()->json([
            'message' => 'Jupiter ID updated',
            'token' => $token->fresh(),
        ]);
    }

    /**
     * Set primary provider for token.
     */
    public function setPrimaryProvider(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'provider' => 'required|in:coingecko,zerion,jupiter',
        ]);

        $token = Token::findOrFail($id);
        $this->tokenService->setPrimaryProvider($token, $validated['provider']);

        return response()->json([
            'message' => 'Primary provider updated',
            'token' => $token->fresh(),
        ]);
    }

    /**
     * Sync token metadata from API.
     */
    public function syncMetadata(string $id): JsonResponse
    {
        $token = Token::findOrFail($id);
        $token = $this->tokenService->syncTokenMetadata($token);

        return response()->json([
            'message' => 'Token metadata synced',
            'token' => $token,
        ]);
    }

    /**
     * Import tokens from API.
     */
    public function import(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'provider' => 'required|in:coingecko,zerion,jupiter',
            'chain' => 'required|in:eth,sol,polygon,sui',
        ]);

        try {
            $tokens = $this->tokenService->importTokensFromApi(
                $validated['provider'],
                $validated['chain']
            );

            return response()->json([
                'message' => 'Tokens imported successfully',
                'count' => $tokens->count(),
                'tokens' => $tokens->take(100), // Return first 100
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Import failed',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Toggle show_on_dashboard for token.
     */
    public function toggleDashboard(string $id): JsonResponse
    {
        $token = Token::findOrFail($id);
        $token->update(['show_on_dashboard' => !$token->show_on_dashboard]);

        return response()->json([
            'message' => 'Token dashboard visibility updated',
            'show_on_dashboard' => $token->show_on_dashboard,
        ]);
    }

    /**
     * Reorder tokens.
     */
    public function reorder(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'tokens' => 'required|array',
            'tokens.*.id' => 'required',
            'tokens.*.sort_order' => 'required|integer|min:0',
        ]);

        foreach ($validated['tokens'] as $tokenData) {
            $token = Token::find($tokenData['id']);
            if ($token) {
                $token->update(['sort_order' => $tokenData['sort_order']]);
            }
        }

        return response()->json([
            'message' => 'Tokens reordered successfully',
        ]);
    }
}
