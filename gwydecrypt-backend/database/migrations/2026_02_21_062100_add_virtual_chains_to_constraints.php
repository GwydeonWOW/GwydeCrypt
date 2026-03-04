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
        // Update token_chains constraint to include virtual chains
        DB::statement("ALTER TABLE token_chains DROP CONSTRAINT IF EXISTS token_chains_chain_check");
        DB::statement("ALTER TABLE token_chains ADD CONSTRAINT token_chains_chain_check CHECK (chain IN ('eth', 'sol', 'polygon', 'sui', 'base', 'op', 'bnb', 'btc', 'linea', 'commodities', 'fiat'))");

        // No need to update wallets table - virtual chains won't be used there
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove virtual chains from constraint
        DB::statement("ALTER TABLE token_chains DROP CONSTRAINT IF EXISTS token_chains_chain_check");
        DB::statement("ALTER TABLE token_chains ADD CONSTRAINT token_chains_chain_check CHECK (chain IN ('eth', 'sol', 'polygon', 'sui', 'base', 'op', 'bnb', 'btc', 'linea'))");
    }
};
