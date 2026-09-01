@props([
    'certificate',
    'forPdf' => false,
    'livePreview' => false,
])

@php
    use Illuminate\Support\Facades\Storage;

    $value = function (string $field, mixed $fallback = '') use ($certificate, $livePreview): mixed {
        $modelValue = data_get($certificate, $field, $fallback);
        return $livePreview ? old($field, $modelValue) : $modelValue;
    };

    $dateValue = function (string $field) use ($value): string {
        $raw = $value($field);
        if (! $raw) return '';
        if ($raw instanceof \DateTimeInterface) {
            return $raw->format('d/m/Y');
        }
        try {
            return \Illuminate\Support\Carbon::parse((string) $raw)->format('d/m/Y');
        } catch (\Throwable) {
            return (string) $raw;
        }
    };

    $imageSource = function (?string $path) use ($forPdf): ?string {
        if (! $path || ! Storage::disk('public')->exists($path)) return null;
        if (! $forPdf) return Storage::disk('public')->url($path);

        $mime = Storage::disk('public')->mimeType($path) ?: 'image/png';
        return 'data:'.$mime.';base64,'.base64_encode(Storage::disk('public')->get($path));
    };

    $defaultStampSource = function () use ($forPdf): string {
        $path = public_path('images/acci-safta-stamp.png');
        if (!file_exists($path) || ! $forPdf) {
            return '/images/acci-safta-stamp.png';
        }
        return 'data:image/png;base64,'.base64_encode(file_get_contents($path));
    };

    $stampSource = $imageSource($certificate->stamp_image) ?: $defaultStampSource();
    $signatureSource = $imageSource($certificate->signature_image);

    // Auto-apply Najib Asad Ltd Stamp if applicable
    $exporterName = $value('exporter_name', 'NAJIB ASAD LTD');
    if (stripos($exporterName, 'NAJIB ASAD LTD') !== false) {
        $najibAsadStampPath = public_path('images/najib_asad_ltd_stamp.png');
        if (file_exists($najibAsadStampPath)) {
            if ($forPdf) {
                $signatureSource = 'data:image/png;base64,'.base64_encode(file_get_contents($najibAsadStampPath));
            } else {
                $signatureSource = '/images/najib_asad_ltd_stamp.png';
            }
        }
    }

    $originalStampSource = function () use ($forPdf): string {
        $path = public_path('images/original-stamp.png');
        if (!file_exists($path) || ! $forPdf) {
            return '/images/original-stamp.png';
        }
        return 'data:image/png;base64,'.base64_encode(file_get_contents($path));
    };
@endphp

<style>
    @media print {
        @page {
            size: A4 portrait;
            margin: 5mm;
        }
        html, body {
            margin: 0;
            padding: 0;
            height: auto !important;
            min-height: 100% !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        .safta-document {
            display: block !important;
            height: auto !important;
            min-height: auto !important;
            width: 100% !important;
            margin: 0 auto !important;
            padding: 2mm 5mm 10mm 5mm !important;
            border: none !important;
            box-shadow: none !important;
            page-break-after: always;
            box-sizing: border-box !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            line-height: 1.15 !important;
            overflow: visible !important; /* prevent clipping */
        }
        .safta-cargo-table-wrapper {
            display: block !important;
            height: 80mm !important; /* Reduced to guarantee footer fits perfectly on Page 1 without clipping */
            page-break-inside: avoid !important;
            break-inside: avoid !important;
        }
        .safta-cargo-table tbody td {
            font-size: 7.5pt !important;
            line-height: 1.1 !important;
        }
        .page-break {
            page-break-before: always !important;
            break-before: page !important;
            display: block !important;
            height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
        }
        .safta-document.overleaf-notes {
            display: block !important;
            padding: 5mm 10mm !important; /* Squish padding on Page 2 */
            page-break-after: auto;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
        }
        .overleaf-notes p, .overleaf-notes li, .overleaf-notes div {
            font-size: 9pt !important; /* Squish text on Page 2 */
            line-height: 1.2 !important;
            margin-bottom: 4px !important;
        }
        .overleaf-notes h3, .overleaf-notes h4 {
            margin-bottom: 4px !important;
            margin-top: 8px !important;
        }
    }
    /* Official ACCI SAFTA Certificate pale yellow safety paper background for all form boxes 1-13 */
    .safta-document table,
    .safta-document table tr,
    .safta-document table th,
    .safta-document table td {
        background-color: #fbe094 !important;
    }
</style>

<article class="safta-document antialiased subpixel-antialiased mx-auto bg-white text-black shadow-lg border border-gray-200" style="width: 210mm; min-height: 297mm; height: auto; display: block; margin: 0 auto; background-color: #ffffff !important; color: #000 !important; border: 1px solid #e5e7eb; padding: 6mm 10mm 15mm 10mm; box-sizing: border-box; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1); -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; overflow: visible;" aria-label="SAFTA Certificate of Origin {{ $value('certificate_no') }}">
    <!-- Title Header (Compact above Box 1 & Reference) -->
    <header class="safta-title-header text-center mb-1.5" style="text-align: center; margin-bottom: 2mm; background-color: #ffffff !important;">
        <h1 class="text-lg font-bold tracking-wider uppercase text-black" style="font-family: Arial, Helvetica, sans-serif; font-size: 13.5pt; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: 0.5px; color: #000;">CERTIFICATE OF ORIGIN</h1>
        <h2 class="text-xs font-semibold uppercase mb-1.5 text-black" style="font-family: Arial, Helvetica, sans-serif; font-size: 10pt; font-weight: 700; margin: 2px 0 2mm 0; text-transform: uppercase; color: #000;">(SOUTH ASIAN FREE TRADE AREA)</h2>
    </header>

    <!-- Top Grid: Boxes 1, 2, 3 (Left) & Reference + Box 4 (Right) -->
    <table class="safta-main-grid" style="width: 100%; border-collapse: collapse; table-layout: fixed; border-top: 1px solid #000; border-left: 1px solid #000; border-right: 1px solid #000; border-bottom: none;">
        <tbody>
            <tr>
                <td style="width: 50%; padding: 0; border: none; border-right: 1px solid #000; vertical-align: top;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td class="p-2.5 border-b border-black" style="border: none; border-bottom: 1px solid #000; height: 26mm; vertical-align: top; padding: 2mm 3mm;">
                                <div class="safta-box-title text-[9px] font-normal text-gray-700 leading-tight block mb-1 select-none" style="font-size: 10pt; color: #000; font-weight: normal; line-height: 1.1; margin-bottom: 2px; display: block; user-select: none;">1. Goods consigned from (exporter's Business, name Address,<br>country)</div>
                                <div class="text-[9.5px] text-black uppercase leading-snug tracking-tight" style="font-size: 8.5pt; font-weight: bold; font-family: 'Times New Roman', Times, serif; color: #000; margin-left: 8mm;" data-preview="exporter_name">{{ $value('exporter_name', 'NAJIB ASAD LTD') }}</div>
                                <div class="safta-box-content text-black uppercase leading-snug tracking-tight whitespace-pre-wrap" style="font-size: 7.5pt; font-family: 'Times New Roman', Times, serif; font-weight: normal; color: #000; line-height: 1.2; letter-spacing: 0; margin-top: 1mm; margin-left: 8mm;" data-preview="exporter_address">{{ $value('exporter_address', "T.L/E. 88619 SHORANDAM\nINDUSTRIAL AREA\nKANDAHAR AFGHANISTAN\nTEL: +93707070975\nBENEFICIARY DETAILS:\nBENEFICIARY NAME: NAJIB\nASAD LTD ACCOUNT\nNUMBER: 104502USD2341068\nBENEFICIARY BANK DETAILS:\nACCOUNT WITH: AFGHAN\nUNITED BANK BANK\nADDRESS: AUB BUILDING\nZARGHONA MAIDAN, SHAHR-\nE-NOW, KABUL SWIFT CODE:\nAFGUAFKAXXX AUB\nACCOUNT NUMBER WITH AL\nSALAM BANK:\nBH61ALSA00500951200102") }}</div>
                            </td>
                        </tr>
                        <tr>
                            <td class="p-2.5" style="border: none; border-bottom: 1px solid #000; height: 23mm; vertical-align: top; padding: 2mm 3mm;">
                                <div class="safta-box-title text-[9px] font-normal text-gray-700 leading-tight block mb-1 select-none" style="font-size: 10pt; color: #000; font-weight: normal; line-height: 1.1; margin-bottom: 2px; display: block; user-select: none;">2. Goods consigned to<br>(Consignee's name, address, country)</div>
                                <div class="text-[9.5px] text-black uppercase leading-snug tracking-tight whitespace-pre-wrap" style="font-weight: bold; font-family: 'Times New Roman', Times, serif; font-size: 8.5pt; color: #000; line-height: 1.15;" data-preview="consignee_name">{{ $value('consignee_name', 'R.S INTERNATIONAL') }}</div>
                                <div class="safta-box-content text-[9.5px] text-black uppercase leading-snug tracking-tight whitespace-pre-wrap" style="font-size: 7.5pt; font-family: 'Times New Roman', Times, serif; line-height: 1.2; font-weight: normal; color: #000; white-space: pre-wrap; margin-top: 2px;" data-preview="consignee_address">{{ $value('consignee_address', "ADD: SHOP NO-27, G/FLOOR KATRA ISHWAR BHAWAN KHARI BAOLI DELHI-110006. PAN NO: ADZPG4366K STATE: 07 GSTIN: 07ADZPG4366K1ZU. FSSAI NO: 10019011006611") }}</div>
                            </td>
                        </tr>
                        <tr>
                            <td class="p-2.5" style="border: none; height: 23mm; vertical-align: top; padding: 2mm 4mm;">
                                <div class="safta-box-title text-[9px] font-normal text-gray-700 leading-tight block mb-1 select-none" style="font-size: 10pt; color: #000; font-weight: normal; line-height: 1.1; margin-bottom: 4px; display: block; user-select: none;">3. Means of Transport and route<br>&nbsp;&nbsp;&nbsp;&nbsp;(as far as known)</div>
                                <div class="text-[9.5px] font-bold text-black uppercase leading-snug tracking-tight whitespace-pre-wrap" style="font-weight: bold; font-family: 'Times New Roman', Times, serif; font-size: 8.5pt; color: #000; line-height: 1.15; letter-spacing: -0.01em;" data-preview="transport_route">{{ $value('transport_route', 'VIA: BY AIR FROM HAMID KARZAI AIRPORT TO INDIA') }}</div>
                            </td>
                        </tr>
                    </table>
                </td>
                <td style="width: 50%; padding: 0; border: none; vertical-align: top;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td class="p-2.5" style="border: none; border-bottom: 1px solid #000; height: 35mm; vertical-align: top; padding: 4mm 6mm;">
                                <div class="text-[9px] font-normal text-gray-700 leading-tight block mb-1 select-none" style="font-size: 10pt; font-family: Arial, Helvetica, sans-serif; font-weight: normal; color: #000; user-select: none;">Reference No. <span data-preview="reference_no" class="text-[9.5px] font-bold text-black uppercase leading-snug tracking-tight" style="font-weight: bold; font-size: 10.5pt; font-family: Arial, sans-serif; color: #000; margin-left: 2px;">{{ $value('reference_no', '21229') }}</span></div>
                                <div class="text-[9.5px] font-bold text-black uppercase leading-snug tracking-tight" style="font-size: 11pt; font-weight: normal; font-family: Arial, Helvetica, sans-serif; margin-top: 1.5mm; color: #000;">SOUTH ASIAN FREE TRADE AREA (SAFTA)</div>
                                <div class="text-[9px] font-normal text-gray-700 leading-tight select-none" style="font-size: 10.5pt; font-family: Arial, Helvetica, sans-serif; font-style: normal; color: #000; margin-top: 0.5mm;">(combined declaration and certificate)</div>
                                <div class="text-[9px] font-normal text-gray-700 leading-tight select-none" style="font-size: 11pt; font-weight: normal; margin-top: 3mm; position: relative;">
                                    Issued in <span class="inline-block border-b border-dotted border-black font-bold text-black" style="font-family: 'Times New Roman', Times, serif; font-weight: bold; font-size: 11pt; border-bottom: 2px dotted #000; width: 45%; text-align: center; display: inline-block; color: #000; position: relative; top: -1px; margin-left: 2px;" data-preview="issued_in_country">{{ $value('issued_in_country', 'AFGHANISTAN') }}</span>
                                </div>
                                <div class="text-[9px] font-normal text-gray-700 leading-tight select-none" style="font-size: 11pt; color: #000; margin-top: 0.5mm; margin-left: 0;">(country)</div>
                                <div class="text-[9px] font-normal text-gray-700 leading-tight select-none italic" style="font-size: 11pt; font-style: normal; color: #000; margin-top: 1.5mm;">see notes overleaf</div>
                            </td>
                        </tr>
                        <tr>
                            <td class="p-2.5" style="border: none; height: 34mm; vertical-align: top; padding: 4mm 6mm; text-align: center;">
                                <div class="safta-box-title text-[9px] font-normal text-gray-700 leading-tight block mb-1 select-none text-left" style="text-align: left; font-size: 11pt; color: #000; font-weight: normal; line-height: 1.15; margin-bottom: 4px; display: block; user-select: none;">4. For Official use</div>
                                <div style="display:block; padding: 6px 0; user-select: none; margin-top: -2mm; text-align: center;">
                                    <img src="{{ $originalStampSource() }}" alt="Original Stamp" style="width: 75mm; max-width: 100%; height: auto; display: inline-block; mix-blend-mode: multiply; filter: contrast(1.5) brightness(1.15); transform: rotate(-2deg);" />
                                </div>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </tbody>
    </table>

    <div class="safta-cargo-table-wrapper" style="display: block; height: 85mm; overflow: hidden;">
        <table class="safta-cargo-table w-full" style="height: 100%; border-collapse: collapse; margin-top: 0; width: 100%; table-layout: fixed; border-top: 1px solid #000; border-left: 1px solid #000; border-right: 1px solid #000; border-bottom: none;">
            <thead>
                <tr>
                    <th class="text-left align-top font-normal" style="border: none; border-right: 1px solid #000; width: 8%; text-align: left; padding: 2px; font-size: 8.5pt; vertical-align: top; color: #000; line-height: 1.1;">5. HS<br>Code</th>
                    <th class="text-left align-top font-normal" style="border: none; border-right: 1px solid #000; width: 14%; text-align: left; padding: 2px; font-size: 8.5pt; vertical-align: top; color: #000; line-height: 1.1;">6. Marks<br>and<br>numbers of<br>packages</th>
                    <th class="text-left align-top font-normal" style="border: none; border-right: 1px solid #000; width: 33%; text-align: left; padding: 2px; font-size: 8.5pt; vertical-align: top; color: #000; line-height: 1.1;">7. Number and kind of packages:<br>description of goods</th>
                    <th class="text-left align-top font-normal" style="border: none; border-right: 1px solid #000; width: 9%; text-align: left; padding: 2px; font-size: 8.5pt; vertical-align: top; color: #000; line-height: 1.1;">8. Origin<br>criterion<br>(see<br>notes<br>overleaf)</th>
                    <th class="text-left align-top font-normal" style="border: none; border-right: 1px solid #000; width: 11%; text-align: left; padding: 2px; font-size: 8.5pt; vertical-align: top; color: #000; line-height: 1.1;">9. Gross<br>weight or<br>other<br>quantity</th>
                    <th class="text-left align-top font-normal" style="border: none; border-right: 1px solid #000; width: 12%; text-align: left; padding: 2px; font-size: 8.5pt; vertical-align: top; color: #000; line-height: 1.1;">10.<br>Number<br>and date<br>of invoices</th>
                    <th class="text-left align-top font-normal" style="border: none; width: 13%; text-align: left; padding: 2px 2px 2px 4px; font-size: 8.5pt; vertical-align: top; color: #000; line-height: 1.1;">11. f.o.b.<br>value in<br>US $</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    @php
                        $commodityDesc = trim((string) $value('commodity_description', "BLACK RAISINS\nTOTAL N.W = 12192 KGS"));
                        if (!str_contains($commodityDesc, '***')) {
                            $commodityDesc .= "\n***********************************";
                        }
                        
                        $invoiceData = trim((string) $value('invoice_no_and_date', "13\n23/07/2026"));
                        if (!str_contains($invoiceData, '***')) {
                            $invoiceLines = explode("\n", str_replace("\r", "", $invoiceData));
                            if (count($invoiceLines) >= 2) {
                                $invoiceData = $invoiceLines[0] . "\n********\n" . $invoiceLines[1];
                            } else {
                                $invoiceData .= "\n********";
                            }
                        }
                    @endphp
                    <td class="align-top font-bold text-black uppercase" style="border: none; border-right: 1px solid #000; text-align: left !important; vertical-align: top; padding: 22mm 2px 2px 2px !important; white-space: nowrap; font-weight: 700; font-size: 9pt; font-family: 'Times New Roman', Times, serif; color: #000; line-height: 1.2;" data-preview="hs_code">{{ trim((string) $value('hs_code', '08062010')) }}</td>
                <td class="align-top font-bold text-black uppercase" style="border: none; border-right: 1px solid #000; text-align: left !important; vertical-align: top; padding: 22mm 2px 2px 2px !important; font-weight: 700; font-size: 9pt; font-family: 'Times New Roman', Times, serif; color: #000; line-height: 1.2;" data-preview="marks_and_numbers">{{ trim((string) $value('marks_and_numbers', '762 CTNS')) }}</td>
                <td class="whitespace-pre-wrap align-top font-bold text-black uppercase" style="border: none; border-right: 1px solid #000; text-align: left !important; vertical-align: top; padding: 22mm 2px 2px 2px !important; white-space: pre-wrap; word-break: break-word; font-weight: 700; font-size: 9pt; font-family: 'Times New Roman', Times, serif; color: #000; line-height: 1.2;" data-preview="commodity_description">{{ $commodityDesc }}</td>
                <td class="align-top font-bold text-black uppercase" style="border: none; border-right: 1px solid #000; text-align: left !important; vertical-align: top; padding: 22mm 2px 2px 2px !important; font-weight: 700; font-size: 9pt; font-family: 'Times New Roman', Times, serif; color: #000; line-height: 1.2;" data-preview="origin_criterion">{{ trim((string) $value('origin_criterion', 'A')) }}</td>
                <td class="align-top font-bold text-black uppercase" style="border: none; border-right: 1px solid #000; text-align: left !important; vertical-align: top; padding: 22mm 2px 2px 2px !important; font-weight: 700; font-size: 9pt; font-family: 'Times New Roman', Times, serif; color: #000; line-height: 1.2;" data-preview="gross_weight">{{ trim((string) $value('gross_weight', '13182.6 KGS')) }}</td>
                <td class="align-top font-bold text-black uppercase" style="border: none; border-right: 1px solid #000; text-align: center !important; vertical-align: top; padding: 22mm 2px 2px 2px !important; font-weight: 700; font-size: 9pt; font-family: 'Times New Roman', Times, serif; color: #000; line-height: 1.2;" data-preview="invoice_no_and_date">{!! str_replace("\n", "<br>", e($invoiceData)) !!}</td>
                <td class="align-top font-bold text-black uppercase" style="border: none; text-align: left !important; vertical-align: top; padding: 18mm 2px 2px 4px !important; white-space: pre-wrap; font-weight: 700; font-size: 8.5pt; font-family: 'Times New Roman', Times, serif; color: #000; line-height: 1.15;" data-preview="fob_value">{{ trim((string) $value('fob_value', "31729.68\nUSD FOB\nFREIGHT\nPREPAID BY\nSHIPPER\n15819.12\nUSD TOTAL\n47548.80\nUSD C&F")) }}</td>
            </tr>
        </tbody>
        </table>
    </div>

    <!-- Bottom Section: Boxes 12 & 13 (50/50 equal width) -->
    <table class="safta-footer-grid min-h-[100px]" style="border-collapse: collapse; margin-top: 0; width: 100%; min-height: 100px; table-layout: fixed; border-top: 1px solid #000; border-left: 1px solid #000; border-right: 1px solid #000; border-bottom: 1px solid #000; page-break-inside: avoid !important; break-inside: avoid !important;">
        <tbody>
            <tr>
                <!-- Box 12: Exporter Declaration -->
                <td style="width: 50%; border: none; border-right: 1px solid #000; padding: 2mm 3mm; vertical-align: top; height: 35mm; position: relative;">
                    <div class="safta-box-title text-[9px] font-normal text-gray-700 leading-tight block mb-1 select-none" style="font-size: 10pt; color: #000; font-weight: normal; line-height: 1.1; margin-bottom: 2px; display: block; user-select: none;">12. Declaration by the exporter</div>
                    <p class="text-[9px] leading-tight text-gray-800 font-normal" style="font-size: 9pt; margin: 0 0 1mm 0; line-height: 1.15; color: #1f2937;">
                        The undersigned hereby declares that the above details and statements are correct that all the goods were produced in
                    </p>
                    <div style="font-weight: 900; font-size: 9.5pt; padding-left: 4mm; color: #000; display: inline-block; min-width: 50%; border-bottom: 2px dotted #000; line-height: 1; padding-bottom: 1px;" data-preview="producing_country">
                        {{ $value('producing_country', 'AFGHANISTAN') }}
                    </div>
                    <div class="text-[9px] leading-tight text-gray-800 font-normal" style="font-size: 9pt; color: #1f2937; margin-left: 2mm; margin-bottom: 1.5mm;">(country)</div>

                    <p class="text-[9px] leading-tight text-gray-800 font-normal" style="font-size: 9pt; margin: 0 0 1mm 0; line-height: 1.15; color: #1f2937;">
                        and that they comply with the origin requirements specified for those goods in SAFTA for goods exported to
                    </p>
                    <div style="font-family: 'Times New Roman', Times, serif; font-weight: bold; font-size: 11pt; padding-left: 4mm; color: #000; display: inline-block; min-width: 50%; border-bottom: 2px dotted #000; line-height: 1; padding-bottom: 1px;" data-preview="importing_country">
                        {{ $value('importing_country', 'INDIA') }}
                    </div>
                    <div class="text-[9px] leading-tight text-gray-800 font-normal" style="font-size: 9pt; color: #1f2937; margin-left: 2mm; margin-bottom: 4mm;">(importing country)</div>

                    <div style="font-family: 'Times New Roman', Times, serif; font-weight: bold; font-size: 11pt; padding-left: 4mm; color: #000; display: inline-block; min-width: 50%; border-bottom: 2px dotted #000; line-height: 1; padding-bottom: 1px;" data-preview="declaration_date">
                        {{ $dateValue('declaration_date') ?: '26/07/2026' }}
                    </div>
                    <div class="text-[9px] leading-tight text-gray-800 font-normal" style="font-size: 9pt; color: #1f2937; margin-left: 2mm;">
                        Place and date, signature of authorized singatory
                    </div>

                    <!-- Box 12 Exporter Stamp Overlay -->
                    <div style="position: absolute; bottom: 12mm; left: 22mm; z-index: 10; opacity: 0.85;">
                        @if($signatureSource)
                            <img src="{{ $signatureSource }}" alt="Exporter Stamp" style="max-width: 65mm; max-height: 48mm; display: inline-block; mix-blend-mode: multiply; filter: contrast(1.5) brightness(1.1);" />
                        @endif
                    </div>
                </td>

                <!-- Box 13: Certificate (Official Authority) -->
                <td style="width: 50%; border: none; padding: 2mm 3mm; vertical-align: top; height: 35mm; min-height: 100px; position: relative;">
                    <div class="safta-box-title text-[9px] font-normal text-gray-700 leading-tight block mb-1 select-none" style="font-size: 10pt; color: #000; font-weight: normal; line-height: 1.1; margin-bottom: 2px; display: block; user-select: none;">13. Certificate</div>
                    <p class="text-[9px] leading-tight text-gray-800 font-normal" style="font-size: 10.5pt; margin: 0; line-height: 1.15; color: #000;">
                        It is hereby certified on the basis of control carried out, that the declaration by the exporter is correct.
                    </p>
                    
                    <div style="font-family: 'Times New Roman', Times, serif; font-weight: bold; font-size: 11.5pt; padding-left: 14mm; margin-top: -1mm; margin-bottom: 0; color: #000; position: relative; z-index: 2;" data-preview="certification_date">
                        {{ $dateValue('certification_date') ?: '26/07/2026' }}
                    </div>
                    <div style="border-bottom: 2px dotted #000; width: 95%; margin-left: 1mm; margin-bottom: 1.5mm; margin-top: 1mm;"></div>
                    
                    <div class="text-[9px] leading-tight text-gray-800 font-normal" style="font-size: 10pt; color: #000; line-height: 1.15; margin-top: 1mm; margin-left: 1mm;">
                        Place and date, signature and Stamp of<br />Certifying authority
                    </div>

                    <!-- ACCI Official Chamber of Commerce & Investment Stamp Overlay -->
                    <div style="position: absolute; bottom: -2mm; right: 5mm; z-index: 10; opacity: 0.9;">
                        @if($stampSource)
                            <img src="{{ $stampSource }}" alt="Official Stamp" style="width: 85mm; display: inline-block; mix-blend-mode: multiply; filter: contrast(1.5) brightness(1.1);" />
                        @else
                            <div style="width: 100mm; height: 100mm; border: 1px dashed #ccc; display: flex; align-items: center; justify-content: center; font-size: 8pt; color: #999; border-radius: 50%;">Stamp Placeholder</div>
                        @endif
                    </div>
                </td>
            </tr>
        </tbody>
    </table>

    <!-- Footer Section -->
    <table style="width: 100%; border: none; margin-top: 1mm; background-color: #ffffff !important;">
        <tr style="background-color: #ffffff !important;">
            <td style="vertical-align: bottom; text-align: left; padding-left: 2mm; border: none; background-color: #ffffff !important;">
                <span style="font-family: Arial, Helvetica, sans-serif; font-weight: bold; font-size: 14pt; color: #000;">ACCI:</span>
                <span style="font-family: 'Courier New', Courier, monospace; font-size: 16pt; font-weight: bold; color: #cc0000; margin-left: 1mm; letter-spacing: 1px;">133011</span>
            </td>
            <td style="vertical-align: bottom; text-align: right; padding-right: 0; border: none; background-color: #ffffff !important;">
                <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJYAAACWAQMAAAAGz+OhAAAABlBMVEX///8AAABVwtN+AAAACXBIWXMAAA7EAAAOxAGVKw4bAAAA3UlEQVRIic2WsQ2FMAxEL6KgZARG+aOF0Rjlj0BJEcXfdowEX9S5uAoPitPdGQBeJovNjiRyrH4+ecwErXuWMh/rrueZyFxY6PNbdJYr5lEYhmCRG6YT/1l2Z63POVmHnh3vzq6pL/vem5k+E6ZeLd/PVtUyGgMmOfCR5D5t3iEak4JFr2B9li15bjQmN32iT4DHrDyam/W5pXjyWFTYvFKZ0SEOu/a8tj6nAiIzdfri88CUmVU0Ft+otucyBEthmYdIZjX2vDBZy61Vydj9n6s3u/psuwU8Oz4Ae5kfLaOeZwvmcgYAAAAASUVORK5CYII=" alt="ACCI QR Code" style="position: relative; top: -12mm; left: 2mm; width: 16mm; height: 16mm; display: inline-block; mix-blend-mode: multiply;" />
            </td>
        </tr>
    </table>

</article>
