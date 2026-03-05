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
        Schema::table("user_positions", function (Blueprint $table) {
            $table->timestamp("position_since")->nullable()->after("last_synced_at");
            $table->decimal("age_in_days", 10, 4)->nullable()->after("position_since");
            $table->string("last_action")->nullable()->after("age_in_days");
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table("user_positions", function (Blueprint $table) {
            $table->dropColumn(["position_since", "age_in_days", "last_action"]);
        });
    }
};
