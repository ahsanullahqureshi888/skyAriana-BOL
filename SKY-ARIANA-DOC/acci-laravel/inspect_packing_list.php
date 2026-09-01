<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$list = \App\Models\AcciPackingList::first();
echo "ID: " . $list->id . "\n";
echo "PACKING LIST NO: " . $list->packing_list_no . "\n";
echo "SELLER NAME: " . $list->seller_name . "\n";
echo "SELLER ADDRESS:\n" . $list->seller_address . "\n";
echo "---BUYER DETAILS---\n";
echo "BUYER NAME: " . $list->buyer_name . "\n";
echo "BUYER ADDRESS:\n" . $list->buyer_address . "\n";
echo "BUYER GST: " . $list->buyer_gst . "\n";
echo "BUYER FSSAI: " . $list->buyer_fssai . "\n";
