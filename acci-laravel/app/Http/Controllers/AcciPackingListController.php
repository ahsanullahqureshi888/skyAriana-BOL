<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreAcciPackingListRequest;
use App\Http\Requests\UpdateAcciPackingListRequest;
use App\Models\AcciPackingList;
use App\Services\AcciPackingListNumberGenerator;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\View\View;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class AcciPackingListController extends Controller
{
    public function __construct(
        private readonly AcciPackingListNumberGenerator $numberGenerator,
    ) {}

    public function index(Request $request): View
    {
        $search = trim((string) $request->query('search', ''));

        $packingLists = AcciPackingList::query()
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($nested) use ($search): void {
                    $nested->where('packing_list_no', 'like', "%{$search}%")
                        ->orWhere('buyer_name', 'like', "%{$search}%")
                        ->orWhere('seller_name', 'like', "%{$search}%")
                        ->orWhere('commodity', 'like', "%{$search}%");
                });
            })
            ->latest('packing_list_date')
            ->latest('id')
            ->paginate(15)
            ->withQueryString();

        return view('acci-packing-lists.index', compact('packingLists', 'search'));
    }

    public function create(): View
    {
        $packingList = new AcciPackingList([
            'packing_list_no' => '011',
            'packing_list_date' => now()->toDateString(),
            'airway_bill_date' => now()->toDateString(),
            'payment_terms' => 'THIRD PARTY PAYMENTS ACCEPTABLE',
            'country_of_origin' => 'Afghanistan',
            'commodity' => 'BLACK RAISINS',
            'quantity_cartons' => 2315,
            'carton_dimensions' => '47 x 30 x 25 cm',
            'volume_per_carton' => '0.035 CBM',
            'net_weight' => 6592,
            'gross_weight' => 7004,
            'total_volume' => '14.52 CBM',
            'transport_route' => 'Via: BY AIR FROM HAMID KARZAI AIRPORT TO INDIA',
        ]);

        return view('acci-packing-lists.create', compact('packingList'));
    }

    public function duplicate(mixed $acciPackingList): RedirectResponse
    {
        $original = $this->resolvePackingList($acciPackingList);
        $replica = $original->replicate(['packing_list_no']);
        $replica->packing_list_no = $this->numberGenerator->next();
        $replica->packing_list_date = now()->toDateString();
        $replica->airway_bill_date = now()->toDateString();
        $replica->save();

        return redirect()
            ->route('acci-packing-lists.edit', $replica)
            ->with('success', 'ACCI Packing List duplicated successfully. You are now editing the new copy.');
    }

    public function store(StoreAcciPackingListRequest $request): RedirectResponse
    {
        $uploadedPaths = [];

        try {
            $data = $request->validated();
            $data = $this->storeUploadedImages($request, $data, $uploadedPaths);

            $packingList = DB::transaction(
                fn (): AcciPackingList => AcciPackingList::query()->create($data),
            );
        } catch (Throwable $exception) {
            $this->deleteImages($uploadedPaths);
            throw $exception;
        }

        return redirect()
            ->route('acci-packing-lists.show', $packingList)
            ->with('success', 'ACCI packing list created successfully.');
    }

    public function show(mixed $acciPackingList): View
    {
        $packingList = $this->resolvePackingList($acciPackingList);
        return view('acci-packing-lists.show', ['packingList' => $packingList]);
    }

    public function edit(mixed $acciPackingList): View
    {
        $packingList = $this->resolvePackingList($acciPackingList);
        return view('acci-packing-lists.edit', ['packingList' => $packingList]);
    }

    public function update(UpdateAcciPackingListRequest $request, mixed $acciPackingList): RedirectResponse
    {
        $packingList = $this->resolvePackingList($acciPackingList);
        $uploadedPaths = [];
        $previousImages = Arr::only($packingList->getAttributes(), ['stamp_image', 'signature_image']);

        try {
            $data = $request->validated();
            $data = $this->storeUploadedImages($request, $data, $uploadedPaths);

            DB::transaction(function () use ($packingList, $data): void {
                $packingList->update($data);
            });

            $this->deleteReplacedImages($previousImages, $data);
        } catch (Throwable $exception) {
            $this->deleteImages($uploadedPaths);
            throw $exception;
        }

        return redirect()
            ->route('acci-packing-lists.show', $packingList)
            ->with('success', 'ACCI packing list updated successfully.');
    }

    public function destroy(mixed $acciPackingList): RedirectResponse
    {
        $packingList = $this->resolvePackingList($acciPackingList);
        $images = Arr::only($packingList->getAttributes(), ['stamp_image', 'signature_image']);

        DB::transaction(function () use ($packingList): void {
            $packingList->delete();
        });

        $this->deleteImages($images);

        return redirect()
            ->route('acci-packing-lists.index')
            ->with('success', 'ACCI packing list deleted successfully.');
    }

    public function print(mixed $acciPackingList): View
    {
        $packingList = $this->resolvePackingList($acciPackingList);
        return view('acci-packing-lists.print', ['packingList' => $packingList]);
    }

    public function pdf(mixed $acciPackingList): Response
    {
        $packingList = $this->resolvePackingList($acciPackingList);
        return Pdf::loadView('acci-packing-lists.pdf', ['packingList' => $packingList])
            ->setPaper('a4', 'portrait')
            ->setOption('defaultFont', 'Times-Roman')
            ->setOption('dpi', 150)
            ->download($packingList->invoice_no.'.pdf');
    }

    private function resolvePackingList(mixed $acciPackingList): AcciPackingList
    {
        if ($acciPackingList instanceof AcciPackingList && $acciPackingList->exists) {
            return $acciPackingList;
        }

        $id = is_object($acciPackingList) ? ($acciPackingList->id ?? null) : $acciPackingList;

        if ($id) {
            $found = AcciPackingList::find($id)
                ?? AcciPackingList::where('invoice_no', $id)->first();
            if ($found) {
                return $found;
            }
        }

        return AcciPackingList::latest('id')->first() ?? new AcciPackingList([
            'invoice_no' => '013',
            'invoice_date' => now()->toDateString(),
            'seller_name' => 'SKY ARIANA LTD',
            'seller_address' => "KABUL AFGHANISTAN",
            'buyer_name' => 'R S INTERNATIONAL',
            'buyer_address' => '499-500, KATRA ISHWAR BHAWAN, KHARI BAOLI, DELHI-110006 INDIA',
            'commodity' => 'BLACK RAISINS',
            'quantity_cartons' => 1200,
            'quantity_weight' => 12192,
            'total_price' => 47548.80,
            'country_of_origin' => 'Afghanistan',
        ]);
    }

    private function storeUploadedImages(Request $request, array $data, array &$uploadedPaths): array
    {
        foreach (['stamp_image', 'signature_image'] as $field) {
            if ($request->hasFile($field)) {
                $path = $request->file($field)->store('acci-packing-lists', 'public');
                $uploadedPaths[] = $path;
                $data[$field] = $path;
            }
        }

        return $data;
    }

    private function deleteReplacedImages(array $previousImages, array $newData): void
    {
        foreach (['stamp_image', 'signature_image'] as $field) {
            if (array_key_exists($field, $newData) && ! empty($previousImages[$field])) {
                Storage::disk('public')->delete($previousImages[$field]);
            }
        }
    }

    private function deleteImages(array $images): void
    {
        foreach ($images as $path) {
            if (! empty($path)) {
                Storage::disk('public')->delete($path);
            }
        }
    }
}
