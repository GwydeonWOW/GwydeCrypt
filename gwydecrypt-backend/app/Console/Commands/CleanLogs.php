<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class CleanLogs extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'logs:clean {--days=7 : Delete logs older than X days} {--force : Skip confirmation}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Clean old log files from storage/logs';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $days = (int) $this->option('days');
        $logsPath = storage_path('logs');

        if (!File::exists($logsPath)) {
            $this->error('Logs directory does not exist.');
            return self::FAILURE;
        }

        $files = File::files($logsPath);
        $cutoffTime = now()->subDays($days)->timestamp;
        $totalSize = 0;
        $deletedCount = 0;

        $toDelete = [];

        foreach ($files as $file) {
            if ($file->getMTime() < $cutoffTime) {
                $toDelete[] = $file;
                $totalSize += $file->getSize();
            }
        }

        if (empty($toDelete)) {
            $this->info('No log files older than ' . $days . ' days found.');
            return self::SUCCESS;
        }

        $this->info('Found ' . count($toDelete) . ' log file(s) older than ' . $days . ' days.');
        $this->info('Total size to free: ' . $this->formatBytes($totalSize));

        if (!$this->option('force') && !$this->confirm('Do you wish to continue?')) {
            $this->info('Operation cancelled.');
            return self::SUCCESS;
        }

        foreach ($toDelete as $file) {
            $this->line('Deleting: ' . $file->getFilename() . ' (' . $this->formatBytes($file->getSize()) . ')');
            File::delete($file->getPathname());
            $deletedCount++;
        }

        $this->info('Successfully deleted ' . $deletedCount . ' log file(s), freed ' . $this->formatBytes($totalSize));

        return self::SUCCESS;
    }

    private function formatBytes(int $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $bytes = max($bytes, 0);
        $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
        $pow = min($pow, count($units) - 1);
        $bytes /= pow(1024, $pow);

        return round($bytes, 2) . ' ' . $units[$pow];
    }
}
