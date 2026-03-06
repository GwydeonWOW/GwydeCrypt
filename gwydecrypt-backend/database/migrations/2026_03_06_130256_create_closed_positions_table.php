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
        Schema::create("closed_positions", function (Blueprint $table) {
            $table->id();
            $table->foreignId("user_id")->nullable()->constrained("users")->onDelete("set null");
            $table->string("wallet_address", 42)->index();
            $table->foreignId("pool_id")->constrained("pools")->onDelete("cascade");
            $table->string("token_id");
            $table->string("original_token_id")->nullable();
            $table->json("nft_id_chain")->nullable();

            // Timestamps
            $table->timestamp("oldest_action_timestamp")->nullable();
            $table->timestamp("closed_timestamp")->nullable();
            $table->decimal("age_in_days", 10, 4)->nullable();

            // Financial data
            $table->decimal("realized_pnl_usd", 20, 6)->default(0);
            $table->decimal("initial_balance_usd", 20, 6)->default(0);
            $table->decimal("total_pnl_usd", 20, 6)->default(0);
            $table->decimal("roi", 10, 4)->default(0);

            // Underlying tokens (JSON)
            $table->json("underlying")->nullable();

            // Metadata
            $table->string("last_action")->nullable();
            $table->boolean("is_migrated")->default(false);
            $table->integer("chain_length")->default(1);

            $table->timestamps();

            // Indexes
            $table->index(["user_id", "wallet_address"], "idx_closed_user_wallet");
            $table->index("closed_timestamp", "idx_closed_timestamp");
            $table->index("realized_pnl_usd", "idx_closed_pnl");
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists("closed_positions");
    }
};
