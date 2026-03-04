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
        // Create token_chains pivot table
        Schema::create('token_chains', function (Blueprint $table) {
            $table->id();
            $table->foreignId('token_id')->constrained()->onDelete('cascade');
            $table->string('chain', 20);
            $table->string('contract_address')->nullable();
            $table->integer('decimals')->default(18);
            $table->string('tradingview_symbol')->nullable();
            $table->timestamps();

            $table->unique(['token_id', 'chain']);
            $table->index('chain');
        });

        // Add check constraint for chain values
        DB::statement("ALTER TABLE token_chains ADD CONSTRAINT token_chains_chain_check CHECK (chain IN ('eth', 'sol', 'polygon', 'sui', 'base', 'op', 'bnb', 'btc', 'linea'))");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('token_chains');
    }
};
