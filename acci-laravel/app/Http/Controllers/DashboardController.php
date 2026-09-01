<?php

namespace App\Http\Controllers;

use App\Models\AcciInvoice;
use App\Models\AcciPackingList;
use App\Models\AirWaybill;
use App\Models\SaftaCertificate;
use App\Models\ShippingSticker;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    /**
     * Display the Main Logistics Software Suite Dashboard ("all-in-one").
     */
    public function index()
    {
        $counts = [
            'invoices' => AcciInvoice::count(),
            'packing_lists' => AcciPackingList::count(),
            'air_waybills' => AirWaybill::count(),
            'safta_certificates' => SaftaCertificate::count(),
            'shipping_stickers' => ShippingSticker::count(),
        ];

        $recentInvoices = AcciInvoice::latest()->take(3)->get()->map(function ($item) {
            return (object) [
                'type' => 'Commercial Invoice',
                'badge' => 'bg-primary-subtle text-primary border-primary-subtle',
                'icon' => '📄',
                'number' => $item->invoice_no,
                'party' => $item->consignee_name ?? 'N/A',
                'date' => $item->invoice_date?->format('Y-m-d') ?? $item->created_at->format('Y-m-d'),
                'created_at' => $item->created_at,
                'view_url' => route('acci-invoices.show', $item),
                'pdf_url' => route('acci-invoices.pdf', $item),
                'print_url' => route('acci-invoices.print', $item),
            ];
        });

        $recentPackingLists = AcciPackingList::latest()->take(3)->get()->map(function ($item) {
            return (object) [
                'type' => 'Packing List',
                'badge' => 'bg-success-subtle text-success border-success-subtle',
                'icon' => '📦',
                'number' => $item->packing_list_no,
                'party' => $item->consignee_name ?? 'N/A',
                'date' => $item->packing_list_date?->format('Y-m-d') ?? $item->created_at->format('Y-m-d'),
                'created_at' => $item->created_at,
                'view_url' => route('acci-packing-lists.show', $item),
                'pdf_url' => route('acci-packing-lists.pdf', $item),
                'print_url' => route('acci-packing-lists.print', $item),
            ];
        });

        $recentAwbs = AirWaybill::latest()->take(3)->get()->map(function ($item) {
            return (object) [
                'type' => 'Air Waybill (AWB)',
                'badge' => 'bg-info-subtle text-info border-info-subtle',
                'icon' => '✈️',
                'number' => $item->awb_number,
                'party' => $item->consignee_name ?? 'N/A',
                'date' => $item->flight_date?->format('Y-m-d') ?? $item->created_at->format('Y-m-d'),
                'created_at' => $item->created_at,
                'view_url' => route('air-waybills.show', $item),
                'pdf_url' => route('air-waybills.pdf', $item),
                'print_url' => route('air-waybills.print', $item),
            ];
        });

        $recentSafta = SaftaCertificate::latest()->take(3)->get()->map(function ($item) {
            return (object) [
                'type' => 'SAFTA Certificate',
                'badge' => 'bg-warning-subtle text-warning border-warning-subtle',
                'icon' => '📜',
                'number' => $item->certificate_no ?? $item->reference_no ?? 'SAFTA-001',
                'party' => $item->exporter_name ?? 'Sky Ariana Ltd',
                'date' => $item->certificate_date?->format('Y-m-d') ?? $item->created_at->format('Y-m-d'),
                'created_at' => $item->created_at,
                'view_url' => route('safta-certificates.show', $item),
                'pdf_url' => route('safta-certificates.pdf', $item),
                'print_url' => route('safta-certificates.print', $item),
            ];
        });

        $recentStickers = ShippingSticker::latest()->take(3)->get()->map(function ($item) {
            return (object) [
                'type' => 'Shipping Sticker',
                'badge' => 'bg-secondary-subtle text-secondary border-secondary-subtle',
                'icon' => '🏷️',
                'number' => $item->sticker_number ?? $item->invoice_no ?? 'STK-001',
                'party' => $item->consignee_name ?? 'N/A',
                'date' => $item->date?->format('Y-m-d') ?? $item->created_at->format('Y-m-d'),
                'created_at' => $item->created_at,
                'view_url' => route('shipping-stickers.show', $item),
                'pdf_url' => route('shipping-stickers.pdf', $item),
                'print_url' => route('shipping-stickers.print', $item),
            ];
        });

        $recentActivities = $recentInvoices
            ->concat($recentPackingLists)
            ->concat($recentAwbs)
            ->concat($recentSafta)
            ->concat($recentStickers)
            ->sortByDesc('created_at')
            ->take(12);

        return view('dashboard', compact('counts', 'recentActivities'));
    }
}
