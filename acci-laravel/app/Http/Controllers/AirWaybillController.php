<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreAirWaybillRequest;
use App\Http\Requests\UpdateAirWaybillRequest;
use App\Models\AirWaybill;
use App\Services\AirWaybillNumberGenerator;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\View\View;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class AirWaybillController extends Controller
{
    private const IMAGE_DIRECTORIES = [
        'carrier_logo' => 'logos',
        'carrier_stamp' => 'stamps',
        'shipper_signature' => 'signatures',
        'carrier_signature' => 'signatures',
    ];

    public function __construct(
        private readonly AirWaybillNumberGenerator $numberGenerator,
    ) {}

    public function index(Request $request): View
    {
        $search = trim((string) $request->query('search', ''));
        $status = trim((string) $request->query('status', ''));

        $airWaybills = AirWaybill::query()
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($nested) use ($search): void {
                    $nested->where('awb_number', 'like', "%{$search}%")
                        ->orWhere('shipper_name', 'like', "%{$search}%")
                        ->orWhere('consignee_name', 'like', "%{$search}%")
                        ->orWhere('commodity_description', 'like', "%{$search}%")
                        ->orWhere('reference_number', 'like', "%{$search}%");
                });
            })
            ->when(in_array($status, ['draft', 'issued', 'cancelled'], true), fn ($query) => $query->where('status', $status))
            ->latest('issued_date')
            ->latest('id')
            ->paginate(15)
            ->withQueryString();

        return view('air-waybills.index', compact('airWaybills', 'search', 'status'));
    }

    public function create(): View
    {
        $awbNumber = $this->numberGenerator->next();
        $numberParts = $this->numberGenerator->split($awbNumber);

        $airWaybill = new AirWaybill([
            'awb_number' => $awbNumber,
            'airline_prefix' => $numberParts['prefix'],
            'serial_number' => $numberParts['serial'],
            'flight_date' => now()->toDateString(),
            'issued_date' => now()->toDateString(),
            'currency' => 'USD',
            'declared_value_carriage' => 'NVD',
            'declared_value_customs' => 'NCV',
            'insurance_amount' => 'XXX',
            'weight_unit' => 'KG',
            'rate_class' => 'K',
            'status' => 'draft',
        ]);

        return view('air-waybills.create', compact('airWaybill'));
    }

    public function store(StoreAirWaybillRequest $request): RedirectResponse
    {
        $uploadedPaths = [];

        try {
            $data = $this->prepareData($request->validated());
            $data = $this->storeUploadedImages($request, $data, $uploadedPaths);
            $airWaybill = DB::transaction(fn (): AirWaybill => AirWaybill::query()->create($data));
        } catch (Throwable $exception) {
            $this->deleteImages($uploadedPaths);
            throw $exception;
        }

        return redirect()
            ->route('air-waybills.show', $airWaybill)
            ->with('success', 'Air Waybill created successfully.');
    }

    public function show(mixed $airWaybill): View
    {
        $airWaybill = $this->resolveWaybill($airWaybill);
        return view('air-waybills.show', compact('airWaybill'));
    }

    public function edit(mixed $airWaybill): View
    {
        $airWaybill = $this->resolveWaybill($airWaybill);
        return view('air-waybills.edit', compact('airWaybill'));
    }

    public function update(UpdateAirWaybillRequest $request, mixed $airWaybill): RedirectResponse
    {
        $airWaybill = $this->resolveWaybill($airWaybill);
        $uploadedPaths = [];
        $previousImages = Arr::only($airWaybill->getAttributes(), array_keys(self::IMAGE_DIRECTORIES));

        try {
            $data = $this->prepareData($request->validated());
            $data = $this->storeUploadedImages($request, $data, $uploadedPaths);
            DB::transaction(fn (): bool => $airWaybill->update($data));
        } catch (Throwable $exception) {
            $this->deleteImages($uploadedPaths);
            throw $exception;
        }

        foreach (array_keys(self::IMAGE_DIRECTORIES) as $field) {
            if ($request->hasFile($field)) {
                $this->deleteImage($previousImages[$field] ?? null);
            }
        }

        return redirect()
            ->route('air-waybills.show', $airWaybill)
            ->with('success', 'Air Waybill updated successfully.');
    }

    public function destroy(mixed $airWaybill): RedirectResponse
    {
        $airWaybill = $this->resolveWaybill($airWaybill);
        $images = Arr::only($airWaybill->getAttributes(), array_keys(self::IMAGE_DIRECTORIES));

        DB::transaction(fn (): bool => $airWaybill->delete());
        $this->deleteImages(array_values($images));

        return redirect()
            ->route('air-waybills.index')
            ->with('success', 'Air Waybill deleted successfully.');
    }

    private function resolveWaybill(mixed $airWaybill): AirWaybill
    {
        if ($airWaybill instanceof AirWaybill && $airWaybill->exists) {
            return $airWaybill;
        }

        $id = is_object($airWaybill) ? ($airWaybill->id ?? null) : $airWaybill;

        if ($id) {
            $found = AirWaybill::find($id)
                ?? AirWaybill::where('awb_number', $id)->first();
            if ($found) {
                return $found;
            }
        }

        return AirWaybill::latest('id')->first() ?? new AirWaybill([
            'awb_number' => '235-35822253',
            'airline_prefix' => '235',
            'serial_number' => '35822253',
            'shipper_name' => 'SKY ARIANA LTD',
            'shipper_address' => 'KABUL AFGHANISTAN',
            'consignee_name' => 'R S INTERNATIONAL',
            'consignee_address' => '499-500, KATRA ISHWAR BHAWAN, KHARI BAOLI, DELHI-110006 INDIA',
            'departure_airport' => 'KBL - KABUL',
            'destination_airport' => 'DEL - DELHI',
            'commodity_description' => 'BLACK RAISINS',
            'pieces' => 1200,
            'gross_weight' => 12192,
            'chargeable_weight' => 12192,
            'weight_unit' => 'KGS',
            'currency' => 'USD',
            'status' => 'issued',
        ]);
    }

    public function duplicate(AirWaybill $airWaybill): RedirectResponse
    {
        $copiedPaths = [];

        try {
            $duplicate = $airWaybill->replicate();
            $awbNumber = $this->numberGenerator->next($airWaybill->airline_prefix);
            $numberParts = $this->numberGenerator->split($awbNumber);

            $duplicate->awb_number = $awbNumber;
            $duplicate->airline_prefix = $numberParts['prefix'];
            $duplicate->serial_number = $numberParts['serial'];
            $duplicate->status = 'draft';
            $duplicate->issued_date = now()->toDateString();

            foreach (array_keys(self::IMAGE_DIRECTORIES) as $field) {
                $duplicate->{$field} = $this->copyImage($airWaybill->{$field}, $copiedPaths);
            }

            DB::transaction(fn (): bool => $duplicate->save());
        } catch (Throwable $exception) {
            $this->deleteImages($copiedPaths);
            throw $exception;
        }

        return redirect()
            ->route('air-waybills.edit', $duplicate)
            ->with('success', 'Air Waybill duplicated. Review the new draft before issuing it.');
    }

    public function print(AirWaybill $airWaybill): View
    {
        return view('air-waybills.print', compact('airWaybill'));
    }

    public function pdf(AirWaybill $airWaybill): Response
    {
        return Pdf::loadView('air-waybills.pdf', compact('airWaybill'))
            ->setPaper('a4', 'portrait')
            ->setOption('defaultFont', 'Times-Roman')
            ->setOption('dpi', 150)
            ->download($airWaybill->awb_number.'-Air-Waybill.pdf');
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    private function prepareData(array $validated): array
    {
        $data = Arr::except($validated, [...array_keys(self::IMAGE_DIRECTORIES), 'charge_settlement']);
        $rate = trim((string) ($data['rate'] ?? ''));

        $data['freight_charge'] = is_numeric($rate)
            ? round((float) $data['chargeable_weight'] * (float) $rate, 2)
            : round((float) ($data['freight_charge'] ?? 0), 2);

        $totalCharges = round(
            (float) $data['freight_charge']
            + (float) ($data['valuation_charge'] ?? 0)
            + (float) ($data['tax'] ?? 0)
            + (float) ($data['other_agent_charge'] ?? 0)
            + (float) ($data['other_carrier_charge'] ?? 0),
            2,
        );

        if ($validated['charge_settlement'] === 'collect') {
            $data['total_prepaid'] = 0;
            $data['total_collect'] = $totalCharges;
        } else {
            $data['total_prepaid'] = $totalCharges;
            $data['total_collect'] = 0;
        }

        return $data;
    }

    /**
     * @param  array<string, mixed>  $data
     * @param  array<int, string>  $uploadedPaths
     * @return array<string, mixed>
     */
    private function storeUploadedImages(Request $request, array $data, array &$uploadedPaths): array
    {
        foreach (self::IMAGE_DIRECTORIES as $field => $directory) {
            if (! $request->hasFile($field)) {
                continue;
            }

            $data[$field] = $request->file($field)->store("air-waybills/{$directory}", 'public');
            $uploadedPaths[] = $data[$field];
        }

        return $data;
    }

    /**
     * @param  array<int, string>  $copiedPaths
     */
    private function copyImage(?string $path, array &$copiedPaths): ?string
    {
        if (! $path || ! Storage::disk('public')->exists($path)) {
            return $path;
        }

        $extension = pathinfo($path, PATHINFO_EXTENSION) ?: 'png';
        $copyPath = 'air-waybills/duplicates/'.Str::uuid().'.'.$extension;
        Storage::disk('public')->copy($path, $copyPath);
        $copiedPaths[] = $copyPath;

        return $copyPath;
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
        if ($path && str_starts_with($path, 'air-waybills/') && Storage::disk('public')->exists($path)) {
            Storage::disk('public')->delete($path);
        }
    }
}
