<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('api_providers', function (Blueprint $table) {
            $table->string('provider_type')->default('price')->after('name');
            $table->string('chain')->nullable()->after('provider_type'); // For blockchain RPCs: eth, sol, polygon, sui
        });

        // Update existing providers to be 'price' type
        DB::statement("UPDATE api_providers SET provider_type = 'price' WHERE provider_type IS NULL");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('api_providers', function (Blueprint $table) {
            $table->dropColumn(['provider_type', 'chain']);
        });
    }
};
