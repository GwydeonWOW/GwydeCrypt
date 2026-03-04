<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('api_providers', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // coingecko, zerion, jupiter
            $table->string('base_url');
            $table->text('api_key')->nullable(); // encrypted
            $table->boolean('is_active')->default(true);
            $table->integer('priority')->default(999); // 1=primary, 2=secondary
            $table->integer('rate_limit_per_minute')->default(100);
            $table->integer('rate_limit_per_day')->default(10000);
            $table->timestamp('last_used_at')->nullable();
            $table->integer('success_count')->default(0);
            $table->integer('failure_count')->default(0);
            $table->timestamps();

            $table->index('priority');
            $table->index('is_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('api_providers');
    }
};
