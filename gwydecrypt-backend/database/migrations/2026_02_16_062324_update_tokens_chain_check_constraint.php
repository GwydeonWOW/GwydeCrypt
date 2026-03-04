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
        // Eliminar el constraint viejo
        DB::statement('ALTER TABLE tokens DROP CONSTRAINT IF EXISTS tokens_chain_check');

        // Crear el nuevo constraint con 'base' incluido
        DB::statement("ALTER TABLE tokens ADD CONSTRAINT tokens_chain_check CHECK (chain IN ('eth', 'sol', 'polygon', 'sui', 'base'))");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Eliminar el nuevo constraint
        DB::statement('ALTER TABLE tokens DROP CONSTRAINT IF EXISTS tokens_chain_check');

        // Recrear el viejo constraint (sin 'base')
        DB::statement("ALTER TABLE tokens ADD CONSTRAINT tokens_chain_check CHECK (chain IN ('eth', 'sol', 'polygon', 'sui'))");
    }
};
