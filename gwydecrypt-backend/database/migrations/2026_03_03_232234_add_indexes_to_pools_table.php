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
        Schema::table('pools', function (Blueprint $table) {
            // Índice compuesto para queries activas
            $table->index(['is_active', 'is_killed'], 'idx_active_killed');

            // Índice compuesto para chains con pool_type
            $table->index(['chain_name', 'pool_type'], 'idx_chain_pool_type');

            // Índice para ordenar por TVL y APY
            $table->index(['tvl_usd', 'apy'], 'idx_tvl_apy');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pools', function (Blueprint $table) {
            $table->dropIndex('idx_active_killed');
            $table->dropIndex('idx_chain_pool_type');
            $table->dropIndex('idx_tvl_apy');
        });
    }
};
