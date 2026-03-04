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
        DB::statement("ALTER TABLE tokens DROP CONSTRAINT IF EXISTS tokens_chain_check");

        // Add new constraints with BNB ('bnb')
        DB::statement("ALTER TABLE wallets ADD CONSTRAINT wallets_chain_check CHECK (chain IN ('eth', 'sol', 'polygon', 'sui', 'base', 'op', 'bnb'))");
        DB::statement("ALTER TABLE tokens ADD CONSTRAINT tokens_chain_check CHECK (chain IN ('eth', 'sol', 'polygon', 'sui', 'base', 'op', 'bnb'))");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop constraints with BNB
        DB::statement("ALTER TABLE wallets DROP CONSTRAINT wallets_chain_check");
        DB::statement("ALTER TABLE tokens DROP CONSTRAINT tokens_chain_check");

        // Restore previous constraints (without BNB)
        DB::statement("ALTER TABLE wallets ADD CONSTRAINT wallets_chain_check CHECK (chain IN ('eth', 'sol', 'polygon', 'sui', 'base', 'op'))");
        DB::statement("ALTER TABLE tokens ADD CONSTRAINT tokens_chain_check CHECK (chain IN ('eth', 'sol', 'polygon', 'sui', 'base', 'op'))");
    }
};
