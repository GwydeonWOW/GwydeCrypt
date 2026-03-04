<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class UserManagementController extends Controller
{
    /**
     * List all users with filtering options.
     */
    public function index(Request $request): JsonResponse
    {
        $query = User::query()->with('approvedBy');

        // Filter by approval status
        if ($request->has('status')) {
            switch ($request->input('status')) {
                case 'pending':
                    $query->where('is_approved', false);
                    break;
                case 'approved':
                    $query->where('is_approved', true);
                    break;
            }
        }

        // Filter by role
        if ($request->has('role')) {
            $query->where('role', $request->input('role'));
        }

        // Search by name or email
        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                  ->orWhere('email', 'ilike', "%{$search}%");
            });
        }

        $users = $query->orderBy('created_at', 'desc')->paginate(20);

        return response()->json([
            'users' => $users,
        ]);
    }

    /**
     * Get a specific user.
     */
    public function show(string $id): JsonResponse
    {
        $user = User::with('approvedBy', 'wallets')->findOrFail($id);

        return response()->json([
            'user' => $user,
        ]);
    }

    /**
     * Approve a user.
     */
    public function approve(Request $request, string $id): JsonResponse
    {
        $user = User::findOrFail($id);

        if ($user->is_approved) {
            return response()->json([
                'message' => 'User is already approved',
            ], 400);
        }

        $user->approve($request->user());

        return response()->json([
            'message' => 'User approved successfully',
            'user' => $user->load('approvedBy'),
        ]);
    }

    /**
     * Reject (unapprove) a user.
     */
    public function reject(Request $request, string $id): JsonResponse
    {
        $user = User::findOrFail($id);

        if (!$user->is_approved) {
            return response()->json([
                'message' => 'User is not approved',
            ], 400);
        }

        $user->reject();

        return response()->json([
            'message' => 'User rejected successfully',
            'user' => $user,
        ]);
    }

    /**
     * Update user role.
     */
    public function updateRole(Request $request, string $id): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'role' => 'required|in:admin,user',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = User::findOrFail($id);

        // Prevent modifying own role
        if ($user->id === $request->user()->id) {
            return response()->json([
                'message' => 'You cannot modify your own role',
            ], 400);
        }

        $user->update([
            'role' => $request->input('role'),
        ]);

        return response()->json([
            'message' => 'User role updated successfully',
            'user' => $user,
        ]);
    }

    /**
     * Delete a user.
     */
    public function destroy(string $id): JsonResponse
    {
        $user = User::findOrFail($id);

        // Prevent deleting self
        if ($user->id === auth()->id()) {
            return response()->json([
                'message' => 'You cannot delete your own account',
            ], 400);
        }

        $user->delete();

        return response()->json([
            'message' => 'User deleted successfully',
        ]);
    }

    /**
     * Get user statistics.
     */
    public function stats(): JsonResponse
    {
        $stats = [
            'total_users' => User::count(),
            'approved_users' => User::where('is_approved', true)->count(),
            'pending_users' => User::where('is_approved', false)->count(),
            'admin_users' => User::where('role', 'admin')->count(),
            'regular_users' => User::count(),
        ];

        return response()->json([
            'stats' => $stats,
        ]);
    }
}
