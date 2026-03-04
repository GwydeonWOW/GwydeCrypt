<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Schedule vfat pools sync every 4 hours
Schedule::command('pools:sync-vfat')
    ->cron('0 */4 * * *') // Every 4 hours at minute 0
    ->description('Sync pools from vfat.io API')
    ->withoutOverlapping();
