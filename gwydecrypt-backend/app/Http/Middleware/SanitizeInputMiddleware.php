<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class SanitizeInputMiddleware
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->isMethod('POST') || $request->isMethod('PUT') || $request->isMethod('PATCH')) {
            $request->merge($this->sanitizeInputs($request->all()));
        }

        // Sanitize query parameters
        if ($request->query()) {
            foreach ($request->query() as $key => $value) {
                if (is_string($value)) {
                    $request->query->set($key, $this->sanitizeString($value));
                }
            }
        }

        return $next($request);
    }

    /**
     * Sanitize input array.
     */
    protected function sanitizeInputs(array $inputs): array
    {
        return collect($inputs)->map(function ($value, $key) {
            if (is_string($value)) {
                // Skip password fields from sanitization
                if (str_contains($key, 'password')) {
                    return $value;
                }

                return $this->sanitizeString($value);
            }

            if (is_array($value)) {
                return $this->sanitizeInputs($value);
            }

            return $value;
        })->all();
    }

    /**
     * Sanitize string input.
     */
    protected function sanitizeString(string $value): string
    {
        // Trim whitespace
        $value = trim($value);

        // Remove tags
        $value = strip_tags($value);

        // Remove special characters that could be used for XSS
        $value = preg_replace('/[\x00-\x1F\x7F]/u', '', $value);

        // Remove potentially dangerous JavaScript
        $value = preg_replace('/javascript:/i', '', $value);
        $value = preg_replace('/on\w+\s*=/i', '', $value);

        return $value;
    }
}
