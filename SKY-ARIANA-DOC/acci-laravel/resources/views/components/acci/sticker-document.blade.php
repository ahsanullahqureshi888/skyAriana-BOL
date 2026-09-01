@props([
    'sticker',
    'livePreview' => false,
])

@php
    $value = function (string $field, mixed $fallback = '') use ($sticker, $livePreview): mixed {
        $modelValue = data_get($sticker, $field, $fallback);
        return $livePreview ? old($field, $modelValue) : $modelValue;
    };

    $fssaiJpgPath = public_path('images/fssai-logo.jpg');
    $fssaiPngPath = public_path('images/fssai-logo.png');
    if (is_file($fssaiJpgPath)) {
        $fssaiLogoSrc = 'data:image/jpeg;base64,'.base64_encode(file_get_contents($fssaiJpgPath));
    } elseif (is_file($fssaiPngPath)) {
        $fssaiLogoSrc = 'data:image/png;base64,'.base64_encode(file_get_contents($fssaiPngPath));
    } else {
        $fssaiLogoSrc = asset('images/fssai-logo.jpg');
    }

    $afgJpgPath = public_path('images/afghanistan-logo.jpg');
    $afgPngPath = public_path('images/afghanistan-logo.png');
    if (is_file($afgJpgPath)) {
        $afghanistanLogoSrc = 'data:image/jpeg;base64,'.base64_encode(file_get_contents($afgJpgPath));
    } elseif (is_file($afgPngPath)) {
        $afghanistanLogoSrc = 'data:image/png;base64,'.base64_encode(file_get_contents($afgPngPath));
    } else {
        $afghanistanLogoSrc = asset('images/afghanistan-logo.jpg');
    }

    $expPhone = trim((string) $value('exporter_phone'));
    $expLicence = trim((string) $value('exporter_licence_no'));
    $impGst = trim((string) $value('importer_gst'));
    $impFssai = trim((string) $value('importer_fssai'));
    $impPhone = trim((string) $value('importer_phone'));
    $impEmail = trim((string) $value('importer_email'));
    $impPan = trim((string) $value('importer_pan'));
    $lotNo = trim((string) $value('lot_no'));
    $transportMode = trim((string) $value('transport_mode'));
@endphp

<article class="shipping-sticker-box" aria-label="Shipping Sticker {{ $value('sticker_no') }}">
    <div class="sticker-container">
        <!-- Section 1: Exporter Details -->
        <section class="sticker-section">
            <h2 class="sticker-heading">NAME AND COMPLETE ADDRESS OF EXPORTER</h2>
            <div class="sticker-company-name sticker-company-name--blue" data-preview="exporter_name">{{ $value('exporter_name') }}</div>
            <p class="sticker-text fw-bold" data-preview="exporter_address">{{ $value('exporter_address') }}</p>
            <p class="sticker-text" data-hide-if-empty style="{{ $expPhone === '' ? 'display: none;' : '' }}">Phone: <strong data-preview="exporter_phone">{{ $expPhone }}</strong></p>
            <p class="sticker-text" data-hide-if-empty style="{{ $expLicence === '' ? 'display: none;' : '' }}">Licence No: <strong data-preview="exporter_licence_no">{{ $expLicence }}</strong></p>
        </section>

        <!-- Section 2: Importer Details -->
        <section class="sticker-section">
            <h2 class="sticker-heading">NAME AND COMPLETE ADDRESS OF IMPORTER</h2>
            <div class="sticker-company-name sticker-company-name--blue" style="font-size: 13.5pt;" data-preview="importer_name">{{ $value('importer_name') }}</div>
            <p class="sticker-text" style="white-space: pre-line;" data-preview="importer_address">{{ $value('importer_address') }}</p>
            <p class="sticker-text" data-hide-if-empty style="{{ $impGst === '' ? 'display: none;' : '' }}">GST: <strong data-preview="importer_gst" style="font-weight:600;">{{ $impGst }}</strong></p>
            <p class="sticker-text" data-hide-if-empty style="{{ $impFssai === '' ? 'display: none;' : '' }}">Fssai No: <strong data-preview="importer_fssai" style="font-weight:600;">{{ $impFssai }}</strong></p>
            <p class="sticker-text" data-hide-if-empty style="{{ $impPhone === '' ? 'display: none;' : '' }}">Phone No: <strong data-preview="importer_phone" style="font-weight:600;">{{ $impPhone }}</strong></p>
            <p class="sticker-text" data-hide-if-empty style="{{ $impEmail === '' ? 'display: none;' : '' }}">Email id: <strong data-preview="importer_email" style="font-weight:600;">{{ $impEmail }}</strong></p>
            <p class="sticker-text" data-hide-if-empty style="{{ $impPan === '' ? 'display: none;' : '' }}">Pan No: <strong data-preview="importer_pan" style="font-weight:600;">{{ $impPan }}</strong></p>
        </section>

        <!-- Section 3 & 4: Product Details & Logos -->
        <div class="sticker-product-logos-row">
            <div class="sticker-product-col">
                <p class="sticker-text sticker-commodity-line">Name of Commodity: <strong data-preview="commodity_name">{{ $value('commodity_name') }}</strong></p>
                <p class="sticker-text sticker-commodity-line">Net Wt: <strong data-preview="net_wt">{{ $value('net_wt') }}</strong></p>
                <p class="sticker-text sticker-commodity-line">Date of Packing: <strong data-preview="date_of_packing">{{ $value('date_of_packing') }}</strong></p>
                <p class="sticker-text sticker-commodity-line">Date of Expiry: <strong data-preview="date_of_expiry">{{ $value('date_of_expiry') }}</strong></p>
                <p class="sticker-text sticker-lot-no" data-hide-if-empty style="{{ $lotNo === '' ? 'display: none;' : '' }}; font-size: 17pt; font-weight: 900; color: #007a3d; margin-top: 6px; line-height: 1.2;">
                    Lot No: <strong data-preview="lot_no" style="font-weight: 900; color: #007a3d; font-size: 17pt;">{{ $lotNo }}</strong>
                </p>
                <p class="sticker-text sticker-transport-mode" data-hide-if-empty style="{{ $transportMode === '' ? 'display: none;' : '' }}; font-size: 16pt; font-weight: 900; color: #007a3d; margin-top: 4px; line-height: 1.2; letter-spacing: 0.3px; text-transform: uppercase;">
                    <strong data-preview="transport_mode" style="font-weight: 900; color: #007a3d; font-size: 16pt;">{{ $transportMode }}</strong>
                </p>
            </div>
            <div class="sticker-logos-col">
                <!-- FSSAI Logo (Top) -->
                <div class="sticker-logo-box fssai-logo-box" data-preview-target="fssai_logo">
                    <img src="{{ $fssaiLogoSrc }}" alt="FSSAI Logo" style="width: 88px; max-width: 95px; height: auto; display: block; margin-left: auto; margin-right: 0;" />
                </div>

                <!-- Afghanistan Export Logo (Bottom) -->
                <div class="sticker-logo-box afg-logo-box" style="margin-top: 8px;">
                    <img src="{{ $afghanistanLogoSrc }}" alt="Afghanistan Export Logo" style="width: 82px; max-width: 90px; height: auto; display: block; margin-left: auto; margin-right: 0;" />
                </div>
            </div>
        </div>
    </div>
</article>

<style>
.shipping-sticker-box {
    width: 120mm;
    max-width: 100%;
    margin: 0 auto;
    background: #ffffff;
    box-sizing: border-box;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.06);
    border-radius: 2px;
}

.sticker-container {
    border: 2px solid #000000;
    padding: 16px 20px;
    font-family: Arial, Helvetica, sans-serif;
    color: #000000;
    background: #ffffff;
    box-sizing: border-box;
}

.sticker-section {
    margin-bottom: 12px;
}

.sticker-heading {
    font-size: 11pt;
    font-weight: 800;
    color: #000000;
    margin: 0 0 3px 0;
    line-height: 1.25;
    text-transform: uppercase;
    letter-spacing: 0.15px;
}

.sticker-company-name {
    font-size: 14.5pt;
    font-weight: 800;
    margin: 2px 0 3px 0;
    line-height: 1.22;
}

.sticker-company-name--blue {
    color: #1e40af;
}

.sticker-text {
    font-size: 10pt;
    margin: 0 0 2.5px 0;
    line-height: 1.34;
    color: #000000;
}

.sticker-text strong {
    font-weight: 700;
}

.sticker-commodity-line {
    font-size: 11.5pt !important;
    margin: 0 0 3px 0 !important;
    line-height: 1.32 !important;
    color: #000000 !important;
}

.sticker-commodity-line strong {
    font-size: 12pt !important;
    font-weight: 800 !important;
}

.sticker-lot-no {
    font-size: 17pt !important;
    font-weight: 900 !important;
    color: #007a3d !important;
    margin-top: 6px !important;
    line-height: 1.2 !important;
}

.sticker-lot-no strong {
    font-size: 17pt !important;
    font-weight: 900 !important;
    color: #007a3d !important;
}

.sticker-transport-mode {
    font-size: 16pt !important;
    font-weight: 900 !important;
    color: #007a3d !important;
    margin-top: 4px !important;
    line-height: 1.2 !important;
    letter-spacing: 0.3px !important;
    text-transform: uppercase !important;
}

.sticker-transport-mode strong {
    font-size: 16pt !important;
    font-weight: 900 !important;
    color: #007a3d !important;
}

.sticker-product-logos-row {
    display: table;
    width: 100%;
    margin-top: 4px;
}

.sticker-product-col {
    display: table-cell;
    vertical-align: bottom;
    width: 63%;
}

.sticker-logos-col {
    display: table-cell;
    vertical-align: bottom;
    width: 37%;
    text-align: right;
}

.sticker-logo-box {
    display: block !important;
    width: 100% !important;
    clear: both !important;
    text-align: right !important;
}

@media print {
    .shipping-sticker-box {
        width: 100%;
        margin: 0;
        box-shadow: none !important;
    }
    .sticker-container {
        border-width: 1.8px !important;
        padding: 14px 18px !important;
    }
}
</style>
