<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;

class PolymarketController extends Controller
{
    /**
     * Get trending markets from Polymarket
     * Returns markets that match our target categories
     */
    public function trending(): JsonResponse
    {
        try {
            // Cache for 5 minutes
            $markets = Cache::remember('polymarket:trending', 300, function () {
                try {
                    $response = Http::timeout(10)
                        ->withOptions([
                            'verify' => false,
                            'ssl_key' => null,
                            'cert' => null,
                        ])
                        ->get('https://gamma-api.polymarket.com/events', [
                            'active' => 'true',
                            'closed' => 'false',
                            'limit' => 300,
                        ]);

                    if (!$response->successful()) {
                        return [];
                    }

                    $data = $response->json();

                    if (!is_array($data)) {
                        return [];
                    }

                    // Target categories - exact slugs from Polymarket
                    $targetCategories = ['politics', 'crypto', 'finance', 'geopolitics', 'economy'];

                    $allMarkets = [];

                    foreach ($data as $event) {
                        if (!isset($event['markets']) || !is_array($event['markets'])) {
                            continue;
                        }

                        // Get tags from EVENT level (tags are at event level, not market level)
                        $eventTags = $event['tags'] ?? [];

                        // Extract slugs from event tag objects
                        $eventTagSlugs = [];
                        foreach ($eventTags as $tag) {
                            if (is_array($tag) && isset($tag['slug'])) {
                                $eventTagSlugs[] = $tag['slug'];
                            }
                        }

                        // Check if event has any of our target categories
                        $hasTargetCategory = false;
                        foreach ($targetCategories as $category) {
                            if (in_array($category, $eventTagSlugs)) {
                                $hasTargetCategory = true;
                                break;
                            }
                        }

                        // Skip if event doesn't match any target category
                        if (!$hasTargetCategory) {
                            continue;
                        }

                        // Include all markets from this event
                        foreach ($event['markets'] as $market) {
                            // Skip closed or inactive markets
                            if (!isset($market['question']) || !isset($market['id'])) {
                                continue;
                            }

                            if (($market['closed'] ?? true) === true || ($market['active'] ?? false) === false) {
                                continue;
                            }

                            // Parse outcomePrices - comes as JSON string like "[\"0\", \"1\"]"
                            $outcomePrices = [0, 0];
                            if (isset($market['outcomePrices'])) {
                                if (is_array($market['outcomePrices'])) {
                                    $outcomePrices = $market['outcomePrices'];
                                } elseif (is_string($market['outcomePrices'])) {
                                    $parsed = json_decode($market['outcomePrices'], true);
                                    if (is_array($parsed)) {
                                        // Convert string prices to float
                                        $outcomePrices = array_map(function($p) {
                                            return is_numeric($p) ? floatval($p) : 0;
                                        }, $parsed);
                                    }
                                }
                            }

                            $allMarkets[] = [
                                'id' => $market['id'] ?? '',
                                'slug' => $event['slug'] ?? '', // Use event slug, not market slug
                                'question' => $market['question'] ?? '',
                                'description' => $market['description'] ?? '',
                                'outcome_prices' => $outcomePrices,
                                'volume' => floatval($market['volume'] ?? 0),
                                'tags' => $eventTagSlugs,
                                'end_date' => $market['endDate'] ?? null,
                            ];
                        }
                    }

                    // Sort by volume
                    usort($allMarkets, function ($a, $b) {
                        return ($b['volume'] ?? 0) <=> ($a['volume'] ?? 0);
                    });

                    \Log::info("Polymarket: Found " . count($allMarkets) . " markets in target categories");

                    return array_slice($allMarkets, 0, 200);
                } catch (\Exception $e) {
                    \Log::error('Polymarket API error: ' . $e->getMessage());
                    return [];
                }
            });

            return response()->json([
                'markets' => $markets ?? [],
            ]);
        } catch (\Exception $e) {
            \Log::error('Polymarket controller error: ' . $e->getMessage());
            return response()->json([
                'markets' => [],
                'error' => 'Failed to fetch markets',
            ], 500);
        }
    }
}
