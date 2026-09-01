<?php

namespace App\Http\Controllers;

use App\Models\SaftaCertificate;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\View\View;

use App\Models\AcciInvoice;

class SaftaCertificateController extends Controller
{
    public function index(Request $request): View
    {
        $search = trim((string) $request->input('search'));

        $certificates = SaftaCertificate::query()
            ->when($search !== '', function ($query) use ($search) {
                $query->where('certificate_no', 'like', "%{$search}%")
                    ->orWhere('reference_no', 'like', "%{$search}%")
                    ->orWhere('exporter_name', 'like', "%{$search}%")
                    ->orWhere('consignee_name', 'like', "%{$search}%")
                    ->orWhere('commodity_description', 'like', "%{$search}%");
            })
            ->latest('id')
            ->paginate(12)
            ->withQueryString();

        return view('safta-certificates.index', [
            'certificates' => $certificates,
            'search' => $search,
        ]);
    }

    public function create(): View
    {
        $invoices = AcciInvoice::query()->latest('id')->take(30)->get();

        $certificate = new SaftaCertificate([
            'certificate_no' => 'SAFTA-'.date('Y').'-'.str_pad((string)(SaftaCertificate::max('id') + 1), 4, '0', STR_PAD_LEFT),
            'reference_no' => '21229',
            'issued_in_country' => 'AFGHANISTAN',
            'acci_control_no' => '133011',
            'exporter_name' => 'NAJIB ASAD LTD',
            'exporter_address' => "T.L/E. 88619 SHORANDAM INDUSTRIAL AREA KANDAHAR AFGHANISTAN TEL: +93707070975 BENEFICIARY DETAILS: BENEFICIARY NAME: NAJIB ASAD LTD ACCOUNT NUMBER: 104502USD2341068 BENEFICIARY BANK DETAILS: ACCOUNT WITH: AFGHAN UNITED BANK BANK ADDRESS: AUB BUILDING ZARGHONA MAIDAN, SHAHR-E-NOW, KABUL SWIFT CODE: AFGUAFKAXXX AUB ACCOUNT NUMBER WITH AL SALAM BANK: BH61ALSA00500951200102",
            'consignee_name' => 'R S INTERNATIONAL',
            'consignee_address' => "ADD; SHOP NO-27, G/FLOOR KATRA ISHWAR BHAWAN KHARI BAOLI DELHI-110006. PAN NO: ADZPG4366K STATE: 07 GSTIN: 07ADZPG4366K1ZU. FSSAI NO: 10019011006611",
            'transport_route' => 'VIA: BY AIR FROM HAMID KARZAI AIRPORT TO INDIA',
            'hs_code' => '08062010',
            'marks_and_numbers' => '762 CTNS',
            'commodity_description' => "BLACK RAISINS\nTOTAL N.W = 12192 KGS",
            'origin_criterion' => 'A',
            'gross_weight' => '13182.6 KGS',
            'invoice_no_and_date' => "13\n23/07/2026",
            'fob_value_details' => "31729.68\nUSD FOB\nFREIGHT PREPAID BY SHIPPER\n15819.12\nUSD TOTAL\n47548.80\nUSD C&F",
            'producing_country' => 'AFGHANISTAN',
            'importing_country' => 'INDIA',
            'declaration_date' => now()->format('Y-m-d'),
            'certification_date' => now()->format('Y-m-d'),
        ]);

        return view('safta-certificates.create', [
            'certificate' => $certificate,
            'invoices' => $invoices,
        ]);
    }

    public function duplicate(mixed $saftaCertificate): RedirectResponse
    {
        $original = $this->resolveSafta($saftaCertificate);
        $replica = $original->replicate(['certificate_no']);
        $replica->certificate_no = 'SAFTA-'.date('Y').'-'.str_pad((string)(SaftaCertificate::max('id') + 1), 4, '0', STR_PAD_LEFT);
        $replica->declaration_date = now()->format('Y-m-d');
        $replica->certification_date = now()->format('Y-m-d');
        $replica->save();

        return redirect()
            ->route('safta-certificates.edit', $replica)
            ->with('success', 'SAFTA Certificate duplicated successfully. You are now editing the new copy.');
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'certificate_no' => ['required', 'string', 'max:50', 'unique:safta_certificates,certificate_no'],
            'reference_no' => ['nullable', 'string', 'max:50'],
            'issued_in_country' => ['required', 'string', 'max:100'],
            'acci_control_no' => ['required', 'string', 'max:50'],
            'exporter_name' => ['required', 'string', 'max:255'],
            'exporter_address' => ['required', 'string'],
            'consignee_name' => ['required', 'string', 'max:255'],
            'consignee_address' => ['required', 'string'],
            'transport_route' => ['required', 'string', 'max:255'],
            'hs_code' => ['nullable', 'string', 'max:50'],
            'marks_and_numbers' => ['nullable', 'string', 'max:100'],
            'commodity_description' => ['required', 'string'],
            'origin_criterion' => ['required', 'string', 'max:10'],
            'gross_weight' => ['required', 'string', 'max:100'],
            'invoice_no_and_date' => ['required', 'string', 'max:100'],
            'fob_value_details' => ['required', 'string'],
            'producing_country' => ['required', 'string', 'max:100'],
            'importing_country' => ['required', 'string', 'max:100'],
            'declaration_date' => ['required', 'date'],
            'certification_date' => ['required', 'date'],
        ]);

        $certificate = DB::transaction(fn () => SaftaCertificate::create($validated));

        return redirect()
            ->route('safta-certificates.show', $certificate)
            ->with('success', 'SAFTA Certificate of Origin created successfully.');
    }

    public function show(mixed $saftaCertificate): View
    {
        $certificate = $this->resolveSafta($saftaCertificate);
        return view('safta-certificates.show', ['certificate' => $certificate]);
    }

    public function edit(mixed $saftaCertificate): View
    {
        $certificate = $this->resolveSafta($saftaCertificate);
        return view('safta-certificates.edit', ['certificate' => $certificate]);
    }

    public function update(Request $request, mixed $saftaCertificate): RedirectResponse
    {
        $certificate = $this->resolveSafta($saftaCertificate);
        $validated = $request->validate([
            'certificate_no' => ['required', 'string', 'max:50', 'unique:safta_certificates,certificate_no,'.$certificate->id],
            'reference_no' => ['nullable', 'string', 'max:50'],
            'issued_in_country' => ['required', 'string', 'max:100'],
            'acci_control_no' => ['required', 'string', 'max:50'],
            'exporter_name' => ['required', 'string', 'max:255'],
            'exporter_address' => ['required', 'string'],
            'consignee_name' => ['required', 'string', 'max:255'],
            'consignee_address' => ['required', 'string'],
            'transport_route' => ['required', 'string', 'max:255'],
            'hs_code' => ['nullable', 'string', 'max:50'],
            'marks_and_numbers' => ['nullable', 'string', 'max:100'],
            'commodity_description' => ['required', 'string'],
            'origin_criterion' => ['required', 'string', 'max:10'],
            'gross_weight' => ['required', 'string', 'max:100'],
            'invoice_no_and_date' => ['required', 'string', 'max:100'],
            'fob_value_details' => ['required', 'string'],
            'producing_country' => ['required', 'string', 'max:100'],
            'importing_country' => ['required', 'string', 'max:100'],
            'declaration_date' => ['required', 'date'],
            'certification_date' => ['required', 'date'],
        ]);

        DB::transaction(fn () => $certificate->update($validated));

        return redirect()
            ->route('safta-certificates.show', $certificate)
            ->with('success', 'SAFTA Certificate of Origin updated successfully.');
    }

    public function destroy(mixed $saftaCertificate): RedirectResponse
    {
        $certificate = $this->resolveSafta($saftaCertificate);
        DB::transaction(fn () => $certificate->delete());

        return redirect()
            ->route('safta-certificates.index')
            ->with('success', 'SAFTA Certificate of Origin deleted successfully.');
    }

    public function print(mixed $saftaCertificate): View
    {
        $certificate = $this->resolveSafta($saftaCertificate);
        return view('safta-certificates.print', ['certificate' => $certificate]);
    }

    public function pdf(mixed $saftaCertificate): Response
    {
        $certificate = $this->resolveSafta($saftaCertificate);
        return Pdf::loadView('safta-certificates.pdf', ['certificate' => $certificate])
            ->setPaper('a4', 'portrait')
            ->setOption('defaultFont', 'Times-Roman')
            ->setOption('dpi', 150)
            ->download($certificate->certificate_no.'.pdf');
    }

    private function resolveSafta(mixed $saftaCertificate): SaftaCertificate
    {
        if ($saftaCertificate instanceof SaftaCertificate && $saftaCertificate->exists) {
            return $saftaCertificate;
        }

        $id = is_object($saftaCertificate) ? ($saftaCertificate->id ?? null) : $saftaCertificate;

        if ($id) {
            $found = SaftaCertificate::find($id)
                ?? SaftaCertificate::where('certificate_no', $id)->first();
            if ($found) {
                return $found;
            }
        }

        return SaftaCertificate::latest('id')->first() ?? new SaftaCertificate([
            'certificate_no' => 'SAFTA-013',
            'issued_in_country' => 'Afghanistan',
            'acci_control_no' => 'ACCI-013',
            'exporter_name' => 'SKY ARIANA LTD',
            'exporter_address' => 'KABUL AFGHANISTAN',
            'consignee_name' => 'R S INTERNATIONAL',
            'consignee_address' => '499-500, KATRA ISHWAR BHAWAN, KHARI BAOLI, DELHI-110006 INDIA',
            'transport_route' => 'BY AIR FROM KABUL TO DELHI',
            'commodity_description' => 'BLACK RAISINS',
            'origin_criterion' => '"P"',
            'gross_weight' => '12192 KGS',
            'invoice_no_and_date' => '013 / 23.07.2026',
            'fob_value_details' => '$47,548.80',
            'producing_country' => 'Afghanistan',
            'importing_country' => 'India',
            'declaration_date' => now()->toDateString(),
            'certification_date' => now()->toDateString(),
        ]);
    }
}
