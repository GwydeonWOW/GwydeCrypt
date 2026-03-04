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
        Schema::table('token_chains', function (Blueprint $table) {
            $table->boolean('is_virtual')->default(false)->after('tradingview_symbol');
            $table->index('is_virtual');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('token_chains', function (Blueprint $table) {
            $table->dropIndex(['is_virtual']);
            $table->dropColumn('is_virtual');
        });
    }
};
