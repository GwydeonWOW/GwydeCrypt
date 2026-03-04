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
            // Add user_id column
            $table->foreignId('user_id')->nullable()->after('id')->constrained('users')->onDelete('cascade');
            $table->index('user_id');

            // Add unique constraint on wallet_address + pool_id combination
            $table->unique(['wallet_address', 'pool_id'], 'unique_wallet_pool');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('user_positions', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->dropIndex(['user_id']);
            $table->dropUnique('unique_wallet_pool');
            $table->dropColumn('user_id');
        });
    }
};
