<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('price_fetch_log', function (Blueprint $table) {
            $table->id();
            $table->string('provider'); // coingecko, zerion, jupiter
            $table->string('endpoint');
            $table->integer('status_code');
            $table->text('response_message')->nullable();
            $table->integer('response_time_ms')->nullable();
            $table->timestamp('requested_at');
            $table->timestamps();

            $table->index('provider');
            $table->index('requested_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('price_fetch_log');
    }
};
