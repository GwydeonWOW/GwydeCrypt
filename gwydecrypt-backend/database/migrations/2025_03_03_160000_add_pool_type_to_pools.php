<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pools', function (Blueprint $table) {
            // Añadir campo pool_type para distinguir farms de pools
            $table->enum('pool_type', ['pool', 'farm', 'inactive'])
                ->default('pool')
                ->after('farm_type');

            // Añadir índice para filtrado rápido
            $table->index('pool_type', 'idx_vfat_pool_type');
        });
    }

    public function down(): void
    {
        Schema::table('pools', function (Blueprint $table) {
            $table->dropIndex('idx_vfat_pool_type');
            $table->dropColumn('pool_type');
        });
    }
};
