<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_positions', function (Blueprint $table) {
            $table->id();
            $table->string('wallet_address', 42);

            // Referencia al pool
            $table->foreignId('pool_id')
                ->constrained('pools')
                ->onDelete('cascade');

            // Balance del usuario en el pool
            $table->decimal('user_balance', 65, 0)->default(0); // En wei
            $table->decimal('user_balance_usd', 30, 2)->default(0); // En USD
            $table->decimal('pool_share', 10, 6)->default(0); // Porcentaje del pool (0-1)

            // Tokens del usuario en el pool
            $table->json('user_tokens')->nullable(); // Array: [{address, symbol, balance, decimals}]

            // Rewards pendientes de reclamar
            $table->json('pending_rewards')->nullable(); // Array: [{token_address, symbol, amount}]

            // Metadata
            $table->timestamp('last_synced_at')->nullable();
            $table->timestamps();

            // Índices
            $table->index(['wallet_address', 'pool_id'], 'idx_user_positions_wallet_pool');
            $table->index('wallet_address', 'idx_user_positions_wallet');
            $table->index('last_synced_at', 'idx_user_positions_synced');
            $table->unique(['wallet_address', 'pool_id'], 'unique_user_wallet_pool');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_positions');
    }
};
