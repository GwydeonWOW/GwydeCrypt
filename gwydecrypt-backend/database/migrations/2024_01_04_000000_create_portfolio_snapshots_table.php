<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('portfolio_snapshots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->decimal('total_value_usd', 20, 2);
            $table->integer('wallet_count');
            $table->integer('token_count');
            $table->json('chains_distribution')->nullable();
            $table->timestamp('snapshot_at');
            $table->timestamps();

            $table->index('user_id');
            $table->index('snapshot_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('portfolio_snapshots');
    }
};
