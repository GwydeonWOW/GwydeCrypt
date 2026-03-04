<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\WalletService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class WalletController extends Controller
{
    public function __construct(
        protected WalletService $walletService
    ) {}

    /**
     * List user wallets.
     */
    public function index(Request $request): JsonResponse
    {
        $wallets = $this->walletService->listWallets($request->user());

        return response()->json([
            'wallets' => $wallets,
        ]);
    }

    /**
     * Store new wallet.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'address' => 'required|string',
            'chain' => 'required|in:eth,sol,polygon,sui,base,op,bnb,btc,arb,linea,commodities,fiat',
            'label' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $wallet = $this->walletService->addWallet($request->user(), $request->all());

            return response()->json([
                'message' => 'Wallet added successfully',
                'wallet' => $wallet,
            ], 201);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Get wallet details.
     */
    public function show(Request $request, string $id): JsonResponse
    {
        $wallet = $request->user()->wallets()
            ->with('walletTokens.token')
            ->findOrFail($id);

        return response()->json([
            'wallet' => $wallet,
        ]);
    }

    /**
     * Update wallet.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'label' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $wallet = $request->user()->wallets()->findOrFail($id);

        if ($request->has('label')) {
            $wallet = $this->walletService->updateLabel($wallet, $request->label);
        }

        return response()->json([
            'message' => 'Wallet updated successfully',
            'wallet' => $wallet,
        ]);
    }

    /**
     * Delete wallet.
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        try {
            $this->walletService->removeWallet($request->user(), $id);

            return response()->json([
                'message' => 'Wallet removed successfully',
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Wallet not found',
            ], 404);
        }
    }

    /**
     * Toggle wallet active status.
     */
    public function toggle(Request $request, string $id): JsonResponse
    {
        $wallet = $request->user()->wallets()->findOrFail($id);
        $wallet = $this->walletService->toggleActive($wallet);

        return response()->json([
            'message' => 'Wallet status updated',
            'wallet' => $wallet,
        ]);
    }

    /**
     * Add token to wallet manually.
     */
    public function addToken(Request $request, string $id): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'token_id' => 'required|integer|exists:tokens,id',
            'balance' => 'required|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $wallet = $request->user()->wallets()->findOrFail($id);
            $result = $this->walletService->addTokenToWallet(
                $wallet,
                $request->input('token_id'),
                (float) $request->input('balance')
            );

            return response()->json([
                'message' => 'Token added to wallet successfully',
                'wallet_token' => $result,
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to add token to wallet',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Remove token from wallet.
     */
    public function removeToken(Request $request, string $id, string $tokenId): JsonResponse
    {
        try {
            $wallet = $request->user()->wallets()->findOrFail($id);
            $this->walletService->removeTokenFromWallet($wallet, $tokenId);

            return response()->json([
                'message' => 'Token removed from wallet successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to remove token from wallet',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update token balance in wallet.
     */
    public function updateToken(Request $request, string $id, string $tokenId): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'balance' => 'required|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $wallet = $request->user()->wallets()->findOrFail($id);
            $result = $this->walletService->updateTokenInWallet(
                $wallet,
                (int) $tokenId,
                (float) $request->input('balance')
            );

            return response()->json([
                'message' => 'Token balance updated successfully',
                'wallet_token' => $result,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to update token balance',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
