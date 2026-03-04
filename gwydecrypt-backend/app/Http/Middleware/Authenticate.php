<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class Authenticate
{
    /**
     * Get the path the user should be redirected to when they are not authenticated.
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (!Auth::check()) {
            // For API requests, return JSON 401 instead of redirecting
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json([
                    'message' => 'Unauthenticated',
                    'error' => 'authentication_required'
                ], 401);
            }

            // For web requests, you can redirect to login
            // return redirect()->route('login');
            abort(401, 'Unauthenticated');
        }

        return $next($request);
    }
}
