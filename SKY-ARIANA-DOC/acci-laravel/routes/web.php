<?php

use App\Http\Controllers\AcciInvoiceController;
use App\Http\Controllers\AcciPackingListController;
use App\Http\Controllers\AirWaybillController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\CompanyStampController;
use App\Http\Controllers\ShippingStickerController;
use App\Http\Controllers\SaftaCertificateController;
use App\Http\Controllers\SavedCompanyController;
use Illuminate\Support\Facades\Route;

Route::get('document-suite/health', function () {
    return response()->json([
        'status' => 'ok',
        'service' => 'logistics-document-suite',
        'modules' => [
            'acci' => true,
            'acci_packing_lists' => true,
            'shipping_stickers' => true,
            'air_waybills' => true,
            'safta_certificates' => true,
        ],
    ])->header('Access-Control-Allow-Origin', '*');
})->name('document-suite.health');

Route::get('global-search', function (Illuminate\Http\Request $request) {
    $q = trim((string) $request->query('q', ''));
    if ($q === '') {
        return response()->json(['results' => []]);
    }

    $results = [];

    $invoices = \App\Models\AcciInvoice::query()
        ->where('invoice_no', 'like', "%{$q}%")
        ->orWhere('buyer_name', 'like', "%{$q}%")
        ->orWhere('seller_name', 'like', "%{$q}%")
        ->orWhere('commodity', 'like', "%{$q}%")
        ->limit(4)->get();
    foreach ($invoices as $inv) {
        $results[] = [
            'type' => 'Invoice',
            'icon' => '📄',
            'title' => $inv->invoice_no,
            'subtitle' => $inv->buyer_name . ' · ' . $inv->commodity,
            'url' => route('acci-invoices.show', $inv),
            'pdf_url' => route('acci-invoices.pdf', $inv),
        ];
    }

    $packingLists = \App\Models\AcciPackingList::query()
        ->where('packing_list_no', 'like', "%{$q}%")
        ->orWhere('buyer_name', 'like', "%{$q}%")
        ->orWhere('seller_name', 'like', "%{$q}%")
        ->orWhere('commodity', 'like', "%{$q}%")
        ->limit(4)->get();
    foreach ($packingLists as $pl) {
        $results[] = [
            'type' => 'Packing List',
            'icon' => '📦',
            'title' => $pl->packing_list_no,
            'subtitle' => $pl->buyer_name . ' · ' . $pl->commodity,
            'url' => route('acci-packing-lists.show', $pl),
            'pdf_url' => route('acci-packing-lists.pdf', $pl),
        ];
    }

    $awbs = \App\Models\AirWaybill::query()
        ->where('awb_number', 'like', "%{$q}%")
        ->orWhere('shipper_name', 'like', "%{$q}%")
        ->orWhere('consignee_name', 'like', "%{$q}%")
        ->limit(4)->get();
    foreach ($awbs as $awb) {
        $results[] = [
            'type' => 'Air Waybill',
            'icon' => '✈️',
            'title' => $awb->awb_number,
            'subtitle' => $awb->shipper_name . ' → ' . $awb->consignee_name,
            'url' => route('air-waybills.show', $awb),
            'pdf_url' => route('air-waybills.pdf', $awb),
        ];
    }

    $saftas = \App\Models\SaftaCertificate::query()
        ->where('reference_no', 'like', "%{$q}%")
        ->orWhere('certificate_no', 'like', "%{$q}%")
        ->orWhere('acci_control_no', 'like', "%{$q}%")
        ->orWhere('exporter_name', 'like', "%{$q}%")
        ->orWhere('consignee_name', 'like', "%{$q}%")
        ->limit(4)->get();
    foreach ($saftas as $safta) {
        $results[] = [
            'type' => 'SAFTA Origin',
            'icon' => '📜',
            'title' => $safta->reference_no ?: $safta->certificate_no,
            'subtitle' => $safta->exporter_name . ' · ACCI: ' . $safta->acci_control_no,
            'url' => route('safta-certificates.show', $safta),
            'pdf_url' => route('safta-certificates.pdf', $safta),
        ];
    }

    $stickers = \App\Models\ShippingSticker::query()
        ->where('sticker_no', 'like', "%{$q}%")
        ->orWhere('exporter_name', 'like', "%{$q}%")
        ->orWhere('importer_name', 'like', "%{$q}%")
        ->orWhere('commodity_name', 'like', "%{$q}%")
        ->limit(4)->get();
    foreach ($stickers as $stk) {
        $results[] = [
            'type' => 'Sticker',
            'icon' => '🏷️',
            'title' => $stk->sticker_no,
            'subtitle' => $stk->exporter_name . ' → ' . $stk->importer_name,
            'url' => route('shipping-stickers.show', $stk),
            'pdf_url' => route('shipping-stickers.pdf', $stk),
        ];
    }

    $companies = \App\Models\SavedCompany::query()
        ->where('company_name', 'like', "%{$q}%")
        ->orWhere('address', 'like', "%{$q}%")
        ->limit(4)->get();
    foreach ($companies as $comp) {
        $results[] = [
            'type' => 'Saved Party',
            'icon' => '🏢',
            'title' => $comp->company_name,
            'subtitle' => ucfirst($comp->type) . ' · ' . ($comp->phone ?: $comp->address),
            'url' => route('saved-companies.index'),
            'pdf_url' => null,
        ];
    }

    return response()->json(['results' => $results]);
})->name('global-search');

Route::get('/', [DashboardController::class, 'index'])->name('dashboard');
Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard.alt');

Route::get('acci-invoices/{acci_invoice}/print', [AcciInvoiceController::class, 'print'])
    ->name('acci-invoices.print');
Route::get('acci-invoices/{acci_invoice}/pdf', [AcciInvoiceController::class, 'pdf'])
    ->name('acci-invoices.pdf');

Route::resource('acci-invoices', AcciInvoiceController::class)
    ->parameters(['acci-invoices' => 'acci_invoice']);

Route::get('acci-packing-lists/{acci_packing_list}/print', [AcciPackingListController::class, 'print'])
    ->name('acci-packing-lists.print');
Route::get('acci-packing-lists/{acci_packing_list}/pdf', [AcciPackingListController::class, 'pdf'])
    ->name('acci-packing-lists.pdf');
Route::post('acci-packing-lists/{acci_packing_list}/duplicate', [AcciPackingListController::class, 'duplicate'])
    ->name('acci-packing-lists.duplicate');

Route::resource('acci-packing-lists', AcciPackingListController::class)
    ->parameters(['acci-packing-lists' => 'acci_packing_list']);

Route::get('shipping-stickers/{shipping_sticker}/print', [ShippingStickerController::class, 'print'])
    ->name('shipping-stickers.print');
Route::get('shipping-stickers/{shipping_sticker}/pdf', [ShippingStickerController::class, 'pdf'])
    ->name('shipping-stickers.pdf');
Route::post('shipping-stickers/{shipping_sticker}/duplicate', [ShippingStickerController::class, 'duplicate'])
    ->name('shipping-stickers.duplicate');
Route::post('shipping-stickers/sync', [ShippingStickerController::class, 'sync'])
    ->name('shipping-stickers.sync');

Route::resource('shipping-stickers', ShippingStickerController::class)
    ->parameters(['shipping-stickers' => 'shipping_sticker']);

Route::get('air-waybills/{air_waybill}/print', [AirWaybillController::class, 'print'])
    ->name('air-waybills.print');
Route::get('air-waybills/{air_waybill}/pdf', [AirWaybillController::class, 'pdf'])
    ->name('air-waybills.pdf');
Route::post('air-waybills/{air_waybill}/duplicate', [AirWaybillController::class, 'duplicate'])
    ->name('air-waybills.duplicate');

Route::resource('air-waybills', AirWaybillController::class)
    ->parameters(['air-waybills' => 'air_waybill']);

Route::get('safta-certificates/{safta_certificate}/print', [SaftaCertificateController::class, 'print'])
    ->name('safta-certificates.print');
Route::get('safta-certificates/{safta_certificate}/pdf', [SaftaCertificateController::class, 'pdf'])
    ->name('safta-certificates.pdf');
Route::post('safta-certificates/{safta_certificate}/duplicate', [SaftaCertificateController::class, 'duplicate'])
    ->name('safta-certificates.duplicate');

Route::resource('safta-certificates', SaftaCertificateController::class)
    ->parameters(['safta-certificates' => 'safta_certificate']);

Route::resource('company-stamps', CompanyStampController::class)
    ->parameters(['company-stamps' => 'company_stamp']);

Route::resource('saved-companies', SavedCompanyController::class)
    ->parameters(['saved-companies' => 'saved_company']);

// Redirect underscore URLs (e.g. /acci_invoices) to standard routes
Route::redirect('/acci_invoices', '/acci-invoices', 301);
Route::redirect('/acci_invoices/{any}', '/acci-invoices/{any}', 301)->where('any', '.*');
Route::redirect('/acci_packing_lists', '/acci-packing-lists', 301);
Route::redirect('/acci_packing_lists/{any}', '/acci-packing-lists/{any}', 301)->where('any', '.*');
Route::redirect('/air_waybills', '/air-waybills', 301);
Route::redirect('/air_waybills/{any}', '/air-waybills/{any}', 301)->where('any', '.*');
Route::redirect('/safta_certificates', '/safta-certificates', 301);
Route::redirect('/safta_certificates/{any}', '/safta-certificates/{any}', 301)->where('any', '.*');
Route::redirect('/shipping_stickers', '/shipping-stickers', 301);
Route::redirect('/shipping_stickers/{any}', '/shipping-stickers/{any}', 301)->where('any', '.*');



