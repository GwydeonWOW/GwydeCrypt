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
        Schema::table('user_positions', function (Blueprint $table) {
            // Campos para determinar si la posición está en rango (Uniswap V3, Thena V3, etc.)
            $table->integer('tick_low')->nullable();
            $table->integer('tick_up')->nullable();
            $table->integer('current_tick')->nullable();
            $table->boolean('in_range')->nullable()->default(null);

            // Índice para búsquedas por rango
            $table->index('in_range', 'idx_user_positions_in_range');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('user_positions', function (Blueprint $table) {
            $table->dropIndex('idx_user_positions_in_range');
            $table->dropColumn(['tick_low', 'tick_up', 'current_tick', 'in_range']);
        });
    }
};
