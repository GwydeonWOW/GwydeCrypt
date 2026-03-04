<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pool_rewards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pool_id')->constrained()->onDelete('cascade');

            // Reward token info
            $table->string('reward_token_address', 42);
            $table->string('reward_token_symbol', 50)->nullable();
            $table->string('reward_token_name')->nullable();
            $table->integer('reward_token_decimals')->nullable();

            // Reward rate (using high precision for wei values)
            $table->decimal('rewards_per_second', 65, 0)->default(0);
            $table->decimal('reward_token_price', 30, 18)->default(0);

            // Timestamps
            $table->timestamp('vfat_synced_at')->nullable();
            $table->timestamps();

            $table->index('pool_id', 'idx_pool_rewards_pool');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pool_rewards');
    }
};
