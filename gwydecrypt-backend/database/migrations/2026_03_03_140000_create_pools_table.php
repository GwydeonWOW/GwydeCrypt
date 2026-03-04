<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pools', function (Blueprint $table) {
            $table->id();
            $table->string('pool_address', 42)->unique();
            $table->integer('chain_id');
            $table->string('chain_name', 50);

            // Protocol info
            $table->string('protocol_id', 50);
            $table->string('protocol_name', 100);
            $table->string('protocol_url', 255)->nullable();

            // Pool metadata
            $table->string('farm_type', 50)->nullable();
            $table->string('farm_address', 42)->nullable();
            $table->string('pool_symbol', 100)->nullable();
            $table->boolean('pool_is_stable')->default(false);
            $table->string('pool_fee', 10)->nullable();

            // Metrics
            $table->decimal('tvl_usd', 20, 2)->default(0);
            $table->decimal('apy', 10, 2)->default(0);
            $table->decimal('apy_base', 10, 2)->default(0);
            $table->decimal('apy_reward', 10, 2)->default(0);

            // Categorization
            $table->boolean('is_stablecoin')->default(false);
            $table->string('il_risk', 20)->default('medium');

            // State
            $table->boolean('is_active')->default(true);
            $table->boolean('is_killed')->default(false);

            // Timestamps
            $table->timestamp('vfat_synced_at')->nullable();
            $table->timestamps();

            // Indexes
            $table->index(['chain_id', 'tvl_usd'], 'idx_chain_tvl');
            $table->index('apy', 'idx_apy');
            $table->index('protocol_id', 'idx_protocol');
            $table->index(['is_active', 'is_killed'], 'idx_active');
            $table->index('vfat_synced_at', 'idx_synced');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pools');
    }
};
