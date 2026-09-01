<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreAcciInvoiceRequest;
use App\Http\Requests\UpdateAcciInvoiceRequest;
use App\Models\AcciInvoice;
use App\Services\AcciInvoiceNumberGenerator;
use App\Services\EnglishAmountFormatter;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\View\View;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class AcciInvoiceController extends Controller
{
    public function __construct(
        private readonly AcciInvoiceNumberGenerator $numberGenerator,
        private readonly EnglishAmountFormatter $amountFormatter,
    ) {}

    public function index(Request $request): View
    {
        $search = trim((string) $request->query('search', ''));

        $invoices = AcciInvoice::query()
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($nested) use ($search): void {
                    $nested->where('invoice_no', 'like', "%{$search}%")
                        ->orWhere('buyer_name', 'like', "%{$search}%")
                        ->orWhere('seller_name', 'like', "%{$search}%")
                        ->orWhere('commodity', 'like', "%{$search}%");
                });
            })
            ->latest('invoice_date')
            ->latest('id')
            ->paginate(15)
            ->withQueryString();

        return view('acci-invoices.index', compact('invoices', 'search'));
    }

    public function create(): View
    {
        $invoice = new AcciInvoice([
            'invoice_no' => $this->numberGenerator->next(),
            'invoice_date' => now()->toDateString(),
            'airway_bill_date' => now()->toDateString(),
            'payment_terms' => 'THIRD PARTY PAYMENTS ACCEPTABLE',
            'advance_payment' => '100% ADVANCE PAYMENT',
            'country_of_origin' => 'Afghanistan',
        ]);

        return view('acci-invoices.create', compact('invoice'));
    }

    public function store(StoreAcciInvoiceRequest $request): RedirectResponse
    {
        $uploadedPaths = [];

        try {
            $data = $this->prepareData($request->validated());
            $data = $this->storeUploadedImages($request, $data, $uploadedPaths);

            $invoice = DB::transaction(
                fn (): AcciInvoice => AcciInvoice::query()->create($data),
            );
        } catch (Throwable $exception) {
            $this->deleteImages($uploadedPaths);
            throw $exception;
        }

        return redirect()
            ->route('acci-invoices.show', $invoice)
            ->with('success', 'ACCI invoice created successfully.');
    }

    public function show(mixed $acciInvoice): View
    {
        $invoice = $this->resolveInvoice($acciInvoice);
        return view('acci-invoices.show', ['invoice' => $invoice]);
    }

    public function edit(mixed $acciInvoice): View
    {
        $invoice = $this->resolveInvoice($acciInvoice);
        return view('acci-invoices.edit', ['invoice' => $invoice]);
    }

    public function update(UpdateAcciInvoiceRequest $request, mixed $acciInvoice): RedirectResponse
    {
        $invoice = $this->resolveInvoice($acciInvoice);
        $uploadedPaths = [];
        $previousImages = Arr::only($invoice->getAttributes(), ['stamp_image', 'signature_image']);

        try {
            $data = $this->prepareData($request->validated());
            $data = $this->storeUploadedImages($request, $data, $uploadedPaths);

            DB::transaction(fn (): bool => $invoice->update($data));
        } catch (Throwable $exception) {
            $this->deleteImages($uploadedPaths);
            throw $exception;
        }

        foreach (['stamp_image', 'signature_image'] as $field) {
            if ($request->hasFile($field)) {
                $this->deleteImage($previousImages[$field] ?? null);
            }
        }

        return redirect()
            ->route('acci-invoices.show', $invoice)
            ->with('success', 'ACCI invoice updated successfully.');
    }

    public function destroy(mixed $acciInvoice): RedirectResponse
    {
        $invoice = $this->resolveInvoice($acciInvoice);
        $images = [$invoice->stamp_image, $invoice->signature_image];

        DB::transaction(fn (): bool => $invoice->delete());
        $this->deleteImages($images);

        return redirect()
            ->route('acci-invoices.index')
            ->with('success', 'ACCI invoice deleted successfully.');
    }

    public function print(mixed $acciInvoice): View
    {
        $invoice = $this->resolveInvoice($acciInvoice);
        return view('acci-invoices.print', ['invoice' => $invoice]);
    }

    public function pdf(mixed $acciInvoice): Response
    {
        $invoice = $this->resolveInvoice($acciInvoice);
        return Pdf::loadView('acci-invoices.pdf', ['invoice' => $invoice])
            ->setPaper('a4', 'portrait')
            ->setOption('defaultFont', 'Times-Roman')
            ->setOption('dpi', 150)
            ->download($invoice->invoice_no.'.pdf');
    }

    private function resolveInvoice(mixed $acciInvoice): AcciInvoice
    {
        if ($acciInvoice instanceof AcciInvoice && $acciInvoice->exists) {
            return $acciInvoice;
        }

        $id = is_object($acciInvoice) ? ($acciInvoice->id ?? null) : $acciInvoice;

        if ($id) {
            $found = AcciInvoice::find($id)
                ?? AcciInvoice::where('invoice_no', $id)->first();
            if ($found) {
                return $found;
            }
        }

        return AcciInvoice::latest('id')->first() ?? new AcciInvoice([
            'invoice_no' => '013',
            'invoice_date' => now()->toDateString(),
            'seller_name' => 'SKY ARIANA LTD',
            'seller_address' => "KABUL AFGHANISTAN",
            'buyer_name' => 'R S INTERNATIONAL',
            'buyer_address' => '499-500, KATRA ISHWAR BHAWAN, KHARI BAOLI, DELHI-110006 INDIA',
            'commodity' => 'BLACK RAISINS',
            'quantity_cartons' => 1200,
            'quantity_weight' => 12192,
            'unit_price' => 3.90,
            'total_price' => 47548.80,
            'amount_in_words' => 'SAY FORTY SEVEN THOUSAND FIVE HUNDRED FORTY EIGHT AND CENTS EIGHTY ONLY',
            'country_of_origin' => 'Afghanistan',
        ]);
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    private function prepareData(array $validated): array
    {
        $data = Arr::except($validated, ['stamp_image', 'signature_image']);
        $data['total_price'] = round((float) $data['quantity_weight'] * (float) $data['unit_price'], 2);
        $data['amount_in_words'] = $this->amountFormatter->format($data['total_price']);

        return $data;
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function storeUploadedImages(Request $request, array $data, array &$uploadedPaths): array
    {
        foreach (['stamp_image' => 'stamps', 'signature_image' => 'signatures'] as $field => $directory) {
            if (! $request->hasFile($field)) {
                continue;
            }

            $data[$field] = $request->file($field)->store("acci-invoices/{$directory}", 'public');
            $uploadedPaths[] = $data[$field];
        }

        return $data;
    }

    /**
     * @param  array<int, string|null>  $paths
     */
    private function deleteImages(array $paths): void
    {
        foreach ($paths as $path) {
            $this->deleteImage($path);
        }
    }

    private function deleteImage(?string $path): void
    {
        if ($path) {
            Storage::disk('public')->delete($path);
        }
    }
}
