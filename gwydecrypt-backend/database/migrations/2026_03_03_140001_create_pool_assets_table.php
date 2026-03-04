<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pool_assets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pool_id')->constrained()->onDelete('cascade');

            // Token info
            $table->string('token_address', 42);
            $table->string('token_symbol', 50);
            $table->string('token_name')->nullable();
            $table->integer('token_decimals')->nullable();

            // Metrics (using high precision for wei values)
            $table->decimal('reserve', 65, 0)->default(0);
            $table->decimal('price', 30, 18)->default(0);
            $table->decimal('liquidity', 30, 18)->default(0);
            $table->decimal('monthly_swap_fees', 65, 0)->default(0);

            // Timestamps
            $table->timestamp('vfat_synced_at')->nullable();
            $table->timestamps();

            $table->index('pool_id', 'idx_pool_assets_pool');
            $table->index('token_address', 'idx_token_address');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pool_assets');
    }
};
