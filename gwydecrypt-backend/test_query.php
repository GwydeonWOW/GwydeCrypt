<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "Testing direct DB query for chains...\n\n";

$start = microtime(true);

try {
    $results = DB::select('
        SELECT
            chain_id,
            chain_name,
            COUNT(*) as pool_count
        FROM pools
        WHERE is_active = TRUE
          AND is_killed = FALSE
        GROUP BY chain_id, chain_name
        ORDER BY chain_name
        LIMIT 5
    ');

    $elapsed = round((microtime(true) - $start) * 1000, 2);

    echo "✓ Query completed in {$elapsed}ms\n";
    echo "✓ Returned " . count($results) . " chains\n\n";

    foreach ($results as $r) {
        echo "  {$r->chain_name} (ID: {$r->chain_id}): {$r->pool_count} pools\n";
    }

} catch (\Exception $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . ":" . $e->getLine() . "\n";
}
