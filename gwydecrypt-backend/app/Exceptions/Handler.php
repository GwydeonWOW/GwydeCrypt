<?php

namespace App\Exceptions;

use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Throwable;

class Handler extends ExceptionHandler
{
    /**
     * Render an exception into an HTTP response.
     */
    public function render($request, Throwable $e)
    {
        // Log all exceptions
        $this->report($e);

        // Validation exceptions
        if ($e instanceof ValidationException) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        }

        // Authentication exceptions
        if ($e instanceof \Illuminate\Auth\AuthenticationException) {
            return response()->json([
                'message' => 'Unauthenticated',
            ], 401);
        }

        // Authorization exceptions
        if ($e instanceof \Illuminate\Auth\Access\AuthorizationException) {
            return response()->json([
                'message' => 'Forbidden - You do not have permission to access this resource',
            ], 403);
        }

        // Model not found exceptions
        if ($e instanceof \Illuminate\Database\Eloquent\ModelNotFoundException) {
            return response()->json([
                'message' => 'Resource not found',
            ], 404);
        }

        // Default JSON response for API
        if ($request->expectsJson()) {
            $statusCode = $this->isHttpException($e) ? $e->getStatusCode() : 500;

            return response()->json([
                'message' => $statusCode === 500 ? 'Internal Server Error' : $e->getMessage(),
                'error' => config('app.debug') ? [
                    'exception' => get_class($e),
                    'message' => $e->getMessage(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                ] : null,
            ], $statusCode);
        }

        return parent::render($request, $e);
    }

    /**
     * Report or log an exception.
     */
    public function report(Throwable $e)
    {
        // Use parent's reporting mechanism
        parent::report($e);
    }
}
