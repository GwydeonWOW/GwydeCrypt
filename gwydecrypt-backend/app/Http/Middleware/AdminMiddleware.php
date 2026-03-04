<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AdminMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Check if user is authenticated
        if (!auth()->check()) {
            return response()->json([
                'message' => 'Unauthenticated',
            ], 401);
        }

        $user = auth()->user();

        // Check if user is admin
        if (!$user->isAdmin()) {
            return response()->json([
                'message' => 'Forbidden - Admin access required',
            ], 403);
        }

        // Check if user is approved
        if (!$user->is_approved) {
            return response()->json([
                'message' => 'Forbidden - Account not approved',
            ], 403);
        }

        return $next($request);
    }
}
