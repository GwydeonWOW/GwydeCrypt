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
        Schema::create('sales', function (Blueprint $table) {
            $table->id();
            $table->foreignId('investment_id')->constrained()->onDelete('cascade');
            $table->decimal('amount_sold', 36, 18)->notNullable(); // Amount of tokens sold
            $table->decimal('sale_price_per_token', 20, 2)->notNullable(); // Price at which tokens were sold
            $table->decimal('sale_total_usd', 20, 2)->notNullable(); // Total USD received
            $table->timestamp('sale_date')->notNullable();
            $table->decimal('avg_buy_price', 20, 2)->notNullable(); // Average buy price (DCA) at time of sale
            $table->decimal('pnl_usd', 20, 2)->nullable(); // Profit/Loss: (sale_price - avg_buy_price) * amount_sold
            $table->decimal('pnl_percent', 10, 2)->nullable(); // PnL percentage
            $table->string('notes')->nullable();
            $table->timestamps();

            $table->index('investment_id');
            $table->index('sale_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sales');
    }
};
