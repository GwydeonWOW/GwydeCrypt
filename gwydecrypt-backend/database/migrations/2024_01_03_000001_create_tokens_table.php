<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tokens', function (Blueprint $table) {
            $table->id();
            $table->string('coingecko_id')->nullable();
            $table->string('zerion_id')->nullable();
            $table->string('jupiter_id')->nullable();
            $table->string('symbol');
            $table->string('name');
            $table->enum('chain', ['eth', 'sol', 'polygon', 'sui']);
            $table->string('contract_address')->nullable();
            $table->integer('decimals')->default(18);
            $table->string('logo_url')->nullable();
            $table->boolean('is_popular')->default(false);
            $table->enum('primary_provider', ['coingecko', 'zerion', 'jupiter'])->default('coingecko');
            $table->timestamps();

            $table->index('coingecko_id');
            $table->index('zerion_id');
            $table->index('jupiter_id');
            $table->index(['chain', 'contract_address']);
            $table->index('symbol');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tokens');
    }
};
