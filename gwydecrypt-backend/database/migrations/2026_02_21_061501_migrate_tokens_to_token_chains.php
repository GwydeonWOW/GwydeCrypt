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
        // Migrate existing tokens to token_chains
        $tokens = DB::table('tokens')->get();

        foreach ($tokens as $token) {
            DB::table('token_chains')->insert([
                'token_id' => $token->id,
                'chain' => $token->chain,
                'contract_address' => $token->contract_address,
                'decimals' => $token->decimals,
                'tradingview_symbol' => $token->tradingview_symbol,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // Now we can drop the columns from tokens table
        Schema::table('tokens', function (Blueprint $table) {
            $table->dropColumn(['chain', 'contract_address', 'decimals', 'tradingview_symbol']);
        });

        // Drop the check constraint on tokens.chain
        DB::statement("ALTER TABLE tokens DROP CONSTRAINT IF EXISTS tokens_chain_check");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Add columns back to tokens table
        Schema::table('tokens', function (Blueprint $table) {
            $table->string('chain', 20)->after('name');
            $table->string('contract_address')->nullable()->after('chain');
            $table->integer('decimals')->default(18)->after('contract_address');
            $table->string('tradingview_symbol')->nullable()->after('decimals');
        });

        // Restore check constraint
        DB::statement("ALTER TABLE tokens ADD CONSTRAINT tokens_chain_check CHECK (chain IN ('eth', 'sol', 'polygon', 'sui', 'base', 'op', 'bnb', 'btc', 'linea'))");

        // Migrate data back from token_chains
        $tokenChains = DB::table('token_chains')
            ->orderBy('token_id')
            ->orderBy('id')
            ->get();

        // For each token, take the first chain entry
        $processedTokens = [];
        foreach ($tokenChains as $tc) {
            if (!in_array($tc->token_id, $processedTokens)) {
                DB::table('tokens')
                    ->where('id', $tc->token_id)
                    ->update([
                        'chain' => $tc->chain,
                        'contract_address' => $tc->contract_address,
                        'decimals' => $tc->decimals,
                        'tradingview_symbol' => $tc->tradingview_symbol,
                    ]);
                $processedTokens[] = $tc->token_id;
            }
        }
    }
};
