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
        Schema::table('investments', function (Blueprint $table) {
            $table->decimal('amount_remaining', 36, 18)->default(0)->after('amount_purchased');
            $table->decimal('original_purchase_price', 20, 2)->nullable()->after('purchase_price_per_token');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('investments', function (Blueprint $table) {
            $table->dropColumn(['amount_remaining', 'original_purchase_price']);
        });
    }
};
