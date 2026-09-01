<?php $attributes ??= new \Illuminate\View\ComponentAttributeBag;

$__newAttributes = [];
$__propNames = \Illuminate\View\ComponentAttributeBag::extractPropNames(([
    'sticker',
    'livePreview' => false,
]));

foreach ($attributes->all() as $__key => $__value) {
    if (in_array($__key, $__propNames)) {
        $$__key = $$__key ?? $__value;
    } else {
        $__newAttributes[$__key] = $__value;
    }
}

$attributes = new \Illuminate\View\ComponentAttributeBag($__newAttributes);

unset($__propNames);
unset($__newAttributes);

foreach (array_filter(([
    'sticker',
    'livePreview' => false,
]), 'is_string', ARRAY_FILTER_USE_KEY) as $__key => $__value) {
    $$__key = $$__key ?? $__value;
}

$__defined_vars = get_defined_vars();

foreach ($attributes->all() as $__key => $__value) {
    if (array_key_exists($__key, $__defined_vars)) unset($$__key);
}

unset($__defined_vars, $__key, $__value); ?>

<?php
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
?>

<article class="shipping-sticker-box" aria-label="Shipping Sticker <?php echo e($value('sticker_no')); ?>">
    <div class="sticker-container">
        <!-- Section 1: Exporter Details -->
        <section class="sticker-section">
            <h2 class="sticker-heading">Name and Complete Address of Exporter</h2>
            <div class="sticker-company-name sticker-company-name--blue" data-preview="exporter_name"><?php echo e($value('exporter_name', 'Pahlawan Noori LTD')); ?></div>
            <p class="sticker-text fw-bold" data-preview="exporter_address"><?php echo e($value('exporter_address', 'Shorandam, Industrial Park Kandahar Afghanistan')); ?></p>
            <p class="sticker-text">Phone: <strong data-preview="exporter_phone"><?php echo e($value('exporter_phone', '+93707070975')); ?></strong></p>
            <p class="sticker-text">Licence No: <strong data-preview="exporter_licence_no"><?php echo e($value('exporter_licence_no', '27-1173')); ?></strong></p>
        </section>

        <!-- Section 2: Importer Details -->
        <section class="sticker-section">
            <h2 class="sticker-heading">Name and Complete Address of Importer</h2>
            <div class="sticker-company-name sticker-company-name--blue" style="font-size: 13.5pt;" data-preview="importer_name"><?php echo e($value('importer_name', 'Uttam Chand Rakesh Kumar Private Limited')); ?></div>
            <p class="sticker-text" style="white-space: pre-line;" data-preview="importer_address"><?php echo e($value('importer_address', "573, Katra Ishwar Bhawan, Khari, Baoli\nDelhi-110006(India)")); ?></p>
            <p class="sticker-text">GST: <span data-preview="importer_gst"><?php echo e($value('importer_gst', '07AADCU4808L1Z2')); ?></span></p>
            <p class="sticker-text">Fssai No: <span data-preview="importer_fssai"><?php echo e($value('importer_fssai', '13324999000404')); ?></span></p>
            <p class="sticker-text">Phone No: <span data-preview="importer_phone"><?php echo e($value('importer_phone', '011-45784868')); ?></span></p>
            <p class="sticker-text">Email id: <span data-preview="importer_email"><?php echo e($value('importer_email', 'akshaykbhatia@hotmail.com')); ?></span></p>
            <p class="sticker-text">Pan No: <span data-preview="importer_pan"><?php echo e($value('importer_pan', 'AADCU4808L')); ?></span></p>
        </section>

        <!-- Section 3 & 4: Product Details & Logos -->
        <div class="sticker-product-logos-row">
            <div class="sticker-product-col">
                <p class="sticker-text">Name of Commodity: <strong data-preview="commodity_name"><?php echo e($value('commodity_name', 'BLACK RAISINS')); ?></strong></p>
                <p class="sticker-text">Net Wt: <strong data-preview="net_wt"><?php echo e($value('net_wt', '16 Kg')); ?></strong></p>
                <p class="sticker-text">Date of Packing: <strong data-preview="date_of_packing"><?php echo e($value('date_of_packing', 'JUL / 2026')); ?></strong></p>
                <p class="sticker-text">Date of Expiry: <strong data-preview="date_of_expiry"><?php echo e($value('date_of_expiry', 'JUL / 2028')); ?></strong></p>
            </div>
            <div class="sticker-logos-col">
                <!-- FSSAI Logo (Top) -->
                <div class="sticker-logo-box fssai-logo-box" data-preview-target="fssai_logo">
                    <img src="<?php echo e($fssaiLogoSrc); ?>" alt="FSSAI Logo" style="width: 58px; height: auto; display: block; margin-left: auto; margin-right: 0;" />
                </div>

                <!-- Afghanistan Export Logo (Bottom) -->
                <div class="sticker-logo-box afg-logo-box" style="margin-top: 6px;">
                    <img src="<?php echo e($afghanistanLogoSrc); ?>" alt="Afghanistan Export Logo" style="width: 56px; height: auto; display: block; margin-left: auto; margin-right: 0;" />
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
}

.sticker-container {
    border: 1.5px solid #000000;
    padding: 14px 18px;
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
    font-weight: 700;
    color: #000000;
    margin: 0 0 4px 0;
    line-height: 1.25;
}

.sticker-company-name {
    font-size: 15pt;
    font-weight: 700;
    margin: 2px 0 4px 0;
    line-height: 1.25;
}

.sticker-company-name--blue {
    color: #2b5797;
}

.sticker-text {
    font-size: 10.5pt;
    margin: 0 0 3px 0;
    line-height: 1.35;
    color: #000000;
}

.sticker-text strong {
    font-weight: 700;
}

.sticker-product-logos-row {
    display: table;
    width: 100%;
    margin-top: 4px;
}

.sticker-product-col {
    display: table-cell;
    vertical-align: bottom;
    width: 65%;
}

.sticker-logos-col {
    display: table-cell;
    vertical-align: bottom;
    width: 35%;
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
    }
    .sticker-container {
        border-width: 1.5px !important;
    }
}
</style>
<?php /**PATH E:\New folder\sky-ariana-bbb\acci-laravel\resources\views/components/acci/sticker-document.blade.php ENDPATH**/ ?>