<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreShippingStickerRequest;
use App\Http\Requests\UpdateShippingStickerRequest;
use App\Models\ShippingSticker;
use App\Services\ShippingStickerNumberGenerator;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\View\View;
use Symfony\Component\HttpFoundation\Response;

class ShippingStickerController extends Controller
{
    public function __construct(
        private readonly ShippingStickerNumberGenerator $numberGenerator,
    ) {}

    public function index(Request $request): View
    {
        $search = trim((string) $request->query('search', ''));

        $stickers = ShippingSticker::query()
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($nested) use ($search): void {
                    $nested->where('sticker_no', 'like', "%{$search}%")
                        ->orWhere('exporter_name', 'like', "%{$search}%")
                        ->orWhere('importer_name', 'like', "%{$search}%")
                        ->orWhere('commodity_name', 'like', "%{$search}%");
                });
            })
            ->latest('sticker_date')
            ->latest('id')
            ->paginate(15)
            ->withQueryString();

        return view('shipping-stickers.index', compact('stickers', 'search'));
    }

    public function create(): View
    {
        $sticker = new ShippingSticker([
            'sticker_no' => $this->numberGenerator->next(),
            'sticker_date' => now()->toDateString(),
            'exporter_name' => '',
            'exporter_address' => '',
            'exporter_phone' => '',
            'exporter_licence_no' => '',
            'importer_name' => '',
            'importer_address' => '',
            'importer_gst' => '',
            'importer_fssai' => '',
            'importer_phone' => '',
            'importer_email' => '',
            'importer_pan' => '',
            'commodity_name' => '',
            'net_wt' => '',
            'date_of_packing' => '',
            'date_of_expiry' => '',
            'lot_no' => '',
            'transport_mode' => '',
        ]);

        $invoices = \App\Models\AcciInvoice::latest('id')->limit(30)->get();

        return view('shipping-stickers.create', compact('sticker', 'invoices'));
    }

    public function duplicate(mixed $shippingSticker): RedirectResponse
    {
        $original = $this->resolveSticker($shippingSticker);
        $replica = $original->replicate(['sticker_no']);
        $replica->sticker_no = $this->numberGenerator->next();
        $replica->sticker_date = now()->toDateString();
        $replica->save();

        return redirect()
            ->route('shipping-stickers.edit', $replica)
            ->with('success', 'Shipping sticker duplicated successfully. You are now editing the new copy.');
    }

    public function store(StoreShippingStickerRequest $request): RedirectResponse|\Illuminate\Http\JsonResponse
    {
        $data = $request->validated();

        if (empty($data['sticker_no'])) {
            $data['sticker_no'] = $this->numberGenerator->next();
        }

        if (empty($data['sticker_date'])) {
            $data['sticker_date'] = now()->toDateString();
        } else {
            try {
                $data['sticker_date'] = \Illuminate\Support\Carbon::parse($data['sticker_date'])->toDateString();
            } catch (\Throwable) {
                $data['sticker_date'] = now()->toDateString();
            }
        }

        foreach (['exporter_name', 'exporter_address', 'exporter_phone', 'exporter_licence_no',
                  'importer_name', 'importer_address', 'importer_gst', 'importer_fssai',
                  'importer_phone', 'importer_email', 'importer_pan',
                  'commodity_name', 'net_wt', 'date_of_packing', 'date_of_expiry',
                  'lot_no', 'transport_mode'] as $f) {
            if (!isset($data[$f])) {
                $data[$f] = '';
            }
        }

        $sticker = DB::transaction(
            fn (): ShippingSticker => ShippingSticker::query()->create($data),
        );

        if ($request->wantsJson() || $request->ajax()) {
            return response()->json([
                'success' => true,
                'message' => 'Shipping sticker created successfully.',
                'sticker' => $sticker,
                'redirect' => route('shipping-stickers.show', $sticker),
            ]);
        }

        return redirect()
            ->route('shipping-stickers.show', $sticker)
            ->with('success', 'Shipping sticker created successfully.');
    }

    public function show(mixed $shippingSticker): View
    {
        $sticker = $this->resolveSticker($shippingSticker);
        return view('shipping-stickers.show', ['sticker' => $sticker]);
    }

    public function edit(mixed $shippingSticker): View
    {
        $sticker = $this->resolveSticker($shippingSticker);
        return view('shipping-stickers.edit', ['sticker' => $sticker]);
    }

    public function update(UpdateShippingStickerRequest $request, mixed $shippingSticker): RedirectResponse|\Illuminate\Http\JsonResponse
    {
        $sticker = $this->resolveSticker($shippingSticker);
        $data = $request->validated();

        if (!empty($data['sticker_date'])) {
            try {
                $data['sticker_date'] = \Illuminate\Support\Carbon::parse($data['sticker_date'])->toDateString();
            } catch (\Throwable) {
                // keep current
            }
        }

        foreach (['exporter_name', 'exporter_address', 'exporter_phone', 'exporter_licence_no',
                  'importer_name', 'importer_address', 'importer_gst', 'importer_fssai',
                  'importer_phone', 'importer_email', 'importer_pan',
                  'commodity_name', 'net_wt', 'date_of_packing', 'date_of_expiry',
                  'lot_no', 'transport_mode'] as $f) {
            if (!isset($data[$f])) {
                $data[$f] = '';
            }
        }

        DB::transaction(function () use ($sticker, $data): void {
            $sticker->update($data);
        });

        if ($request->wantsJson() || $request->ajax()) {
            return response()->json([
                'success' => true,
                'message' => 'Shipping sticker updated successfully.',
                'sticker' => $sticker,
                'redirect' => route('shipping-stickers.show', $sticker),
            ]);
        }

        return redirect()
            ->route('shipping-stickers.show', $sticker)
            ->with('success', 'Shipping sticker updated successfully.');
    }

    public function sync(\Illuminate\Http\Request $request): \Illuminate\Http\JsonResponse
    {
        $stickers = $request->input('stickers', []);
        if (!is_array($stickers)) {
            return response()->json(['success' => false, 'message' => 'Invalid stickers payload.']);
        }

        $saved = [];
        foreach ($stickers as $stkData) {
            if (empty($stkData['sticker_no'])) continue;

            $sticker = ShippingSticker::updateOrCreate(
                ['sticker_no' => $stkData['sticker_no']],
                [
                    'sticker_date' => !empty($stkData['sticker_date']) ? \Illuminate\Support\Carbon::parse($stkData['sticker_date'])->toDateString() : now()->toDateString(),
                    'exporter_name' => $stkData['exporter_name'] ?? '',
                    'exporter_address' => $stkData['exporter_address'] ?? '',
                    'exporter_phone' => $stkData['exporter_phone'] ?? '',
                    'exporter_licence_no' => $stkData['exporter_licence_no'] ?? '',
                    'importer_name' => $stkData['importer_name'] ?? '',
                    'importer_address' => $stkData['importer_address'] ?? '',
                    'importer_gst' => $stkData['importer_gst'] ?? '',
                    'importer_fssai' => $stkData['importer_fssai'] ?? '',
                    'importer_phone' => $stkData['importer_phone'] ?? '',
                    'importer_email' => $stkData['importer_email'] ?? '',
                    'importer_pan' => $stkData['importer_pan'] ?? '',
                    'commodity_name' => $stkData['commodity_name'] ?? '',
                    'net_wt' => $stkData['net_wt'] ?? '',
                    'date_of_packing' => $stkData['date_of_packing'] ?? '',
                    'date_of_expiry' => $stkData['date_of_expiry'] ?? '',
                    'lot_no' => $stkData['lot_no'] ?? '',
                    'transport_mode' => $stkData['transport_mode'] ?? '',
                ]
            );
            $saved[] = $sticker;
        }

        return response()->json([
            'success' => true,
            'count' => count($saved),
            'stickers' => $saved,
        ]);
    }

    public function destroy(mixed $shippingSticker): RedirectResponse|\Illuminate\Http\JsonResponse
    {
        $sticker = $this->resolveSticker($shippingSticker);
        DB::transaction(function () use ($sticker): void {
            $sticker->delete();
        });

        if (request()->wantsJson() || request()->ajax()) {
            return response()->json([
                'success' => true,
                'message' => 'Shipping sticker deleted successfully.',
            ]);
        }

        return redirect()
            ->route('shipping-stickers.index')
            ->with('success', 'Shipping sticker deleted successfully.');
    }

    public function print(mixed $shippingSticker): View
    {
        $sticker = $this->resolveSticker($shippingSticker);
        return view('shipping-stickers.print', ['sticker' => $sticker]);
    }

    public function pdf(mixed $shippingSticker): Response
    {
        $sticker = $this->resolveSticker($shippingSticker);
        return Pdf::loadView('shipping-stickers.pdf', ['sticker' => $sticker])
            ->setPaper('a4', 'portrait')
            ->setOption('defaultFont', 'Times-Roman')
            ->setOption('dpi', 150)
            ->download('SHIPPING-STICKER.pdf');
    }

    private function resolveSticker(mixed $shippingSticker): ShippingSticker
    {
        if ($shippingSticker instanceof ShippingSticker && $shippingSticker->exists) {
            return $shippingSticker;
        }

        $id = is_object($shippingSticker) ? ($shippingSticker->id ?? null) : $shippingSticker;

        if ($id) {
            $found = ShippingSticker::find($id)
                ?? ShippingSticker::where('sticker_no', $id)->first();
            if ($found) {
                return $found;
            }
        }

        return ShippingSticker::latest('id')->first() ?? new ShippingSticker([
            'sticker_no' => 'STK-013',
            'exporter_name' => 'SKY ARIANA LTD',
            'importer_name' => 'R S INTERNATIONAL',
            'importer_address' => '499-500, KATRA ISHWAR BHAWAN, KHARI BAOLI, DELHI-110006 INDIA',
            'commodity' => 'BLACK RAISINS',
            'total_cartons' => 1200,
            'total_net_weight' => 12192,
            'total_gross_weight' => 12500,
        ]);
    }
}
