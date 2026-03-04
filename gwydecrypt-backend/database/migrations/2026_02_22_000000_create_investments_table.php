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
        Schema::create('investments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('token_id')->constrained()->onDelete('cascade');
            $table->enum('chain', ['eth', 'sol', 'polygon', 'sui', 'base', 'op', 'bnb', 'btc', 'linea'])->notNullable();

            // Purchase details
            $table->decimal('amount_purchased', 36, 18)->notNullable(); // Amount of tokens purchased
            $table->decimal('purchase_price_per_token', 20, 2)->notNullable(); // Price in USD at purchase time
            $table->decimal('purchase_total_usd', 20, 2)->notNullable(); // Total USD spent (amount * price)
            $table->timestamp('purchase_date')->notNullable();

            // Optional notes
            $table->string('notes')->nullable();

            // Timestamps
            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index('user_id');
            $table->index('token_id');
            $table->index('purchase_date');
            $table->index(['user_id', 'token_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('investments');
    }
};
