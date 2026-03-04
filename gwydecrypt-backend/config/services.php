<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    // Crypto APIs
    'coin_gecko' => [
        'api_key' => env('COINGECKO_API_KEY'),
        'api_url' => env('COINGECKO_API_URL', 'https://api.coingecko.com/api/v3'),
    ],

    'zerion' => [
        'api_key' => env('ZERION_API_KEY'),
        'api_url' => env('ZERION_API_URL', 'https://api.zerion.io/v1'),
    ],

    'jupiter' => [
        'api_url' => env('JUPITER_API_URL', 'https://price.jup.ag/v4'),
    ],

    // Blockchain RPCs
    'ethereum' => [
        'rpc_url' => env('INFURA_RPC_URL') ?: env('ETHEREUM_RPC_URL', 'https://eth.llamarpc.com'),
        'infura_project_id' => env('INFURA_PROJECT_ID'),
        'infura_project_secret' => env('INFURA_PROJECT_SECRET'),
    ],

    'solana' => [
        'rpc_url' => env('SOLANA_RPC_URL', 'https://api.mainnet-beta.solana.com'),
    ],

    'polygon' => [
        'rpc_url' => env('POLYGON_RPC_URL', 'https://polygon-rpc.com'),
    ],

    'sui' => [
        'rpc_url' => env('SUI_RPC_URL', 'https://fullnode.mainnet.sui.io'),
    ],

];
