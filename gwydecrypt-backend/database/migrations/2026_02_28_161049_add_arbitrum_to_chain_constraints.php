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
        // Drop existing constraints
        DB::statement("ALTER TABLE wallets DROP CONSTRAINT IF EXISTS wallets_chain_check");
        DB::statement("ALTER TABLE investments DROP CONSTRAINT IF EXISTS investments_chain_check");
        DB::statement("ALTER TABLE token_chains DROP CONSTRAINT IF EXISTS token_chains_chain_check");

        // Add new constraints with Arbitrum ('arb') and existing chains
        DB::statement("ALTER TABLE wallets ADD CONSTRAINT wallets_chain_check CHECK (chain IN ('eth', 'sol', 'polygon', 'sui', 'base', 'op', 'bnb', 'btc', 'arb', 'fiat', 'commodities'))");
        DB::statement("ALTER TABLE investments ADD CONSTRAINT investments_chain_check CHECK (chain IN ('eth', 'sol', 'polygon', 'sui', 'base', 'op', 'bnb', 'btc', 'arb', 'fiat', 'commodities'))");
        DB::statement("ALTER TABLE token_chains ADD CONSTRAINT token_chains_chain_check CHECK (chain IN ('eth', 'sol', 'polygon', 'sui', 'base', 'op', 'bnb', 'btc', 'arb', 'fiat', 'commodities'))");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop constraints with Arbitrum
        DB::statement("ALTER TABLE wallets DROP CONSTRAINT wallets_chain_check");
        DB::statement("ALTER TABLE investments DROP CONSTRAINT investments_chain_check");
        DB::statement("ALTER TABLE token_chains DROP CONSTRAINT token_chains_chain_check");

        // Restore previous constraints (without Arbitrum)
        DB::statement("ALTER TABLE wallets ADD CONSTRAINT wallets_chain_check CHECK (chain IN ('eth', 'sol', 'polygon', 'sui', 'base', 'op', 'bnb', 'btc', 'fiat', 'commodities'))");
        DB::statement("ALTER TABLE investments ADD CONSTRAINT investments_chain_check CHECK (chain IN ('eth', 'sol', 'polygon', 'sui', 'base', 'op', 'bnb', 'btc', 'fiat', 'commodities'))");
        DB::statement("ALTER TABLE token_chains ADD CONSTRAINT token_chains_chain_check CHECK (chain IN ('eth', 'sol', 'polygon', 'sui', 'base', 'op', 'bnb', 'btc', 'fiat', 'commodities'))");
    }
};
