<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('price_fetch_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('token_id')->constrained('tokens')->onDelete('cascade');
            $table->foreignId('provider_id')->constrained('api_providers')->onDelete('cascade');
            $table->integer('attempt_number')->default(1);
            $table->boolean('success')->default(false);
            $table->decimal('price_usd', 20, 8)->nullable();
            $table->text('error_message')->nullable();
            $table->integer('response_time_ms')->nullable();
            $table->timestamp('timestamp')->index();
            $table->timestamps();

            // Indexes for faster queries
            $table->index(['token_id', 'timestamp']);
            $table->index(['provider_id', 'timestamp']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('price_fetch_logs');
    }
};
