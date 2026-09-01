<?php $attributes ??= new \Illuminate\View\ComponentAttributeBag;

$__newAttributes = [];
$__propNames = \Illuminate\View\ComponentAttributeBag::extractPropNames(([
    'packingList',
    'forPdf' => false,
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
    'packingList',
    'forPdf' => false,
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
    use Illuminate\Support\Facades\Storage;

    $value = function (string $field, mixed $fallback = '') use ($packingList, $livePreview): mixed {
        $modelValue = data_get($packingList, $field, $fallback);
        return $livePreview ? old($field, $modelValue) : $modelValue;
    };

    $dateValue = function (string $field) use ($value): string {
        $raw = $value($field);
        if (! $raw) return '';
        try {
            return \Illuminate\Support\Carbon::parse($raw)->format('d/m/Y');
        } catch (\Throwable) {
            return (string) $raw;
        }
    };

    $weightFormat = function (mixed $amount): string {
        if ($amount === null || $amount === '') return '';
        $val = (float) $amount;
        return floor($val) == $val ? number_format($val, 0, '.', ',') : number_format($val, 2, '.', ',');
    };

    $imageSource = function (?string $path) use ($forPdf): ?string {
        if (! $path || ! Storage::disk('public')->exists($path)) return null;
        if (! $forPdf) return Storage::disk('public')->url($path);

        $mime = Storage::disk('public')->mimeType($path) ?: 'image/png';
        return 'data:'.$mime.';base64,'.base64_encode(Storage::disk('public')->get($path));
    };

    $stampSource = $imageSource($packingList->stamp_image);
    $signatureSource = $imageSource($packingList->signature_image);

    $sellerAddr = (string) $value('seller_address');
    $buyerAddr = (string) $value('buyer_address');
    $totalChars = strlen($sellerAddr) + strlen($buyerAddr);
    $totalLines = substr_count($sellerAddr, "\n") + substr_count($buyerAddr, "\n");
    $isLongPartyText = $totalChars > 250 || $totalLines > 8;
?>

<style>
    @media print {
        @page {
            size: A4 portrait;
            margin: 10mm;
        }
        html, body {
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
    }
    .acci-packing-list-doc {
        font-family: 'Times New Roman', Times, serif !important;
        color: #000;
        background-color: #fff;
        width: 100%;
        max-width: 190mm; /* A4 width minus margins */
        margin: 0 auto;
        padding: 8mm;
        border: 1px solid #000;
        box-sizing: border-box;
    }
    .acci-packing-list-doc * {
        font-family: 'Times New Roman', Times, serif !important;
    }
    .acci-document__title h1 {
        text-align: center;
        font-size: 16pt;
        font-weight: bold;
        text-decoration: underline;
        margin-top: 0;
        margin-bottom: 6mm;
        letter-spacing: 0.5px;
    }
</style>

<article class="acci-document acci-packing-list-doc" aria-label="ACCI Packing List <?php echo e($value('packing_list_no')); ?>">
    <header class="acci-document__title">
        <h1>PACKING LIST</h1>
    </header>


    <table style="width: 100%; border-collapse: collapse; margin-bottom: 2mm;">
        <tbody>
            <tr>
                <td rowspan="2" style="width: 50%; vertical-align: top;">
                    <div style="border: 1px solid #000; padding: 2mm; font-size: 8pt; line-height: 1.3; color: #000; width: 95%;">
                        <strong>FROM: <span data-preview="seller_name"><?php echo e(strtoupper((string) $value('seller_name'))); ?></span></strong><br>
                        <span data-preview="seller_address"><?php echo nl2br(e($value('seller_address'))); ?></span>
                        
                        <div style="border-bottom: 1px dashed #000; margin: 3.5mm 0;"></div>
                        
                        <strong>TO: <span data-preview="buyer_name"><?php echo e(strtoupper((string) $value('buyer_name'))); ?></span></strong><br>
                        <span data-preview="buyer_address"><?php echo nl2br(e($value('buyer_address'))); ?></span>
                    </div>
                </td>
                <td style="width: 50%; vertical-align: top; height: 1%;">
                    <div style="margin-bottom: 2mm;">
                        <div style="font-size: 9pt; font-weight: normal; white-space: nowrap; line-height: 1.2; color: #000;">No: <span data-preview="packing_list_no"><?php echo e($value('packing_list_no')); ?></span></div>
                        <div style="font-size: 9pt; font-weight: normal; white-space: nowrap; line-height: 1.2; color: #000;">Date: <span data-preview="packing_list_date"><?php echo e($dateValue('packing_list_date')); ?></span></div>
                    </div>
                </td>
            </tr>
            <tr>
                <td style="width: 50%; vertical-align: bottom;">
                    
                    <table class="acci-detail-table" style="width: 100%; border-collapse: collapse; border: 1px solid #000 !important; height: auto;">
                        <tbody>
                            <tr>
                                <td colspan="2" class="text-center" style="border: none !important; border-bottom: 1px solid #000 !important; padding: 1.5mm; font-size: 8pt; text-align: center; color: #000;">Afghan Transit Form Airway Bill.</td>
                            </tr>
                            <tr>
                                <td style="border: none !important; border-bottom: 1px solid #000 !important; padding: 1.5mm; width: 50%; font-size: 8pt; color: #000;">NO: <span data-preview="airway_bill_no"><?php echo e($value('airway_bill_no')); ?></span></td>
                                <td style="border: none !important; border-bottom: 1px solid #000 !important; padding: 1.5mm; width: 50%; font-size: 8pt; color: #000; text-align: center;">Date: <span data-preview="airway_bill_date"><?php echo e($dateValue('airway_bill_date')); ?></span></td>
                            </tr>
                            <tr>
                                <td colspan="2" class="text-center" style="border: none !important; border-bottom: 1px solid #000 !important; padding: 1.5mm; font-size: 8pt; text-align: center; color: #000;">Terms of Payment</td>
                            </tr>
                            <tr>
                                <td style="border: none !important; border-bottom: 1px solid #000 !important; padding: 1.5mm; font-size: 8pt; color: #000;">Letter of Credit</td>
                                <td style="border: none !important; border-bottom: 1px solid #000 !important; padding: 1.5mm 3mm 1.5mm 1.5mm; font-size: 8pt; color: #000; text-align: right;">Collection Basis</td>
                            </tr>
                            <tr>
                                <td colspan="2" style="border: none !important; border-bottom: 1px solid #000 !important; padding: 1.5mm; font-size: 8pt; color: #000;">No: <span data-preview="lc_number"><?php echo e($value('lc_number')); ?></span></td>
                            </tr>
                            <tr>
                                <td colspan="2" style="border: none !important; padding: 1.5mm; font-size: 7.5pt; color: #000;">
                                    <strong>Through:</strong><br>
                                    <span class="uppercase" style="font-weight: 700;" data-preview="transport_route"><?php echo e($value('transport_route', 'Via: GOODS IN TRANSIT BY ROAD FROM KANDAHAR AFGHANISTAN BY SEA DUBAI TO NHAVA SHEVA (INDIA).')); ?></span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </td>
            </tr>
        </tbody>
    </table>

    <table class="acci-goods-table acci-packing-table" style="border-collapse: collapse; border-bottom: 4px double #000 !important;">
        <thead>
            <tr>
                <th class="acci-goods-table__no" style="border-top: 4px double #000 !important; width: 7%; white-space: nowrap; border-right: 4px double #000 !important; border-bottom: 4px double #000 !important; padding: 4mm 1mm; font-size: 13pt; font-weight: bold; text-align: center;">No</th>
                <th style="border-top: 4px double #000 !important; width:67%; border-right: 1px solid #000; border-bottom: 4px double #000 !important; padding: 4mm 2mm; font-size: 12pt; font-weight: bold; text-align: center;">Description of Goods</th>
                <th style="border-top: 4px double #000 !important; width:26%; border-bottom: 4px double #000 !important; padding: 4mm 2mm; font-size: 12pt; font-weight: bold; text-align: center;">Quantity</th>
            </tr>
        </thead>
        <tbody>
            <tr class="acci-goods-row">
                <td class="acci-goods-row__number" style="width: 7%; border-right: 4px double #000 !important; text-align: center; font-size: 11pt; padding-top: 5mm; vertical-align: top;">1.</td>
                <td style="width: 67%; text-align: center; border-right: 1px solid #000; padding: 0; vertical-align: top; border-left: none !important; border-top: none !important;">
                    <div style="min-height: 350px; position: relative; width: 100%; padding: 5mm 0 10mm 0; box-sizing: border-box;">
                        <div>
                            <p class="acci-product-name" style="text-align: center; font-size: 10.5pt; font-weight: 400; margin: 0;" data-preview="commodity"><?php echo e(str_replace('RAISINIS', 'RAISINS', $value('commodity'))); ?></p>

                            <div style="margin-top: 4mm; font-size: 9.5pt; font-weight: 400; line-height: 1.5;">
                                <p data-hide-if-empty style="<?php echo e(empty(trim((string) $value('carton_dimensions'))) ? 'display: none;' : ''); ?>">Carton Dimensions: <span data-preview="carton_dimensions"><?php echo e($value('carton_dimensions')); ?></span></p>
                                <p data-hide-if-empty style="<?php echo e(empty(trim((string) $value('volume_per_carton'))) ? 'display: none;' : ''); ?>">Volume per Carton: <span data-preview="volume_per_carton"><?php echo e($value('volume_per_carton')); ?></span></p>
                            </div>
                        </div>

                        <div class="acci-description-summary" style="position: absolute; bottom: 10mm; left: 0; right: 0; text-align: center;">
                            <p class="acci-description-summary__origin" style="font-weight: 400; font-size: 13pt; margin: 0;">(Origin <span data-preview="country_of_origin"><?php echo e($value('country_of_origin', 'Afghanistan')); ?></span>)</p>
                        </div>
                    </div>
                </td>
                <td style="width: 26%; border: none !important; border-left: 1px solid #000 !important; border-right: 1px solid #000 !important; text-align: center; padding: 0; vertical-align: top;">
                    <div style="min-height: 350px; position: relative; width: 100%; padding: 5mm 0 10mm 0; box-sizing: border-box;">
                        <div style="font-size: 10pt; font-weight: 400; line-height: 1.5;">
                            <p><span data-preview="quantity_cartons"><?php echo e(number_format((float) $value('quantity_cartons'))); ?></span> CTNS</p>
                            <p>NW: <span data-preview="net_weight"><?php echo e($weightFormat($value('net_weight'))); ?></span> KGS</p>
                            <p>GW: <span data-preview="gross_weight"><?php echo e($weightFormat($value('gross_weight'))); ?></span> KGS</p>
                            <p data-hide-if-empty style="<?php echo e(empty(trim((string) $value('total_volume'))) ? 'display: none;' : ''); ?>">Total Volume: <span data-preview="total_volume"><?php echo e($value('total_volume')); ?></span></p>
                        </div>

                        <div class="acci-seal-layer" style="position: absolute; bottom: 10mm; left: 0; width: 100%; text-align: center; pointer-events: none;">
                            <?php
                                $sellerName = strtoupper(trim($value('seller_name')));
                                $dbStamp = \App\Models\CompanyStamp::where('company_name', $sellerName)->first();
                                
                                $companyNameStr = trim(strtoupper((string) ($value('authorized_person') ?: $value('seller_name'))));
                                $isNasib = str_contains($companyNameStr, 'NASIB OBID AKBARI');
                                
                                if (!empty($stampSource)) {
                                    $finalStamp = $stampSource;
                                } elseif ($dbStamp && $dbStamp->stamp_image_path) {
                                    $finalStamp = asset($dbStamp->stamp_image_path);
                                } else {
                                    $finalStamp = $isNasib ? asset('images/nasib_stamp.png') : null;
                                }
                            ?>
                            
                            <div style="text-align: center; width: 100%; margin: 0; padding: 0;">
                                <strong style="display: block; font-size: 8.5pt; text-transform: uppercase; margin: 0 auto; line-height: 1.1; word-wrap: break-word; white-space: normal; padding: 0 2mm;" data-preview="authorized_person"><?php echo e(str_replace('RAISINIS', 'RAISINS', $value('authorized_person') ?: $value('seller_name'))); ?></strong>
                                <p style="letter-spacing: -0.5px; font-size: 8pt; margin-top: 1mm; margin-bottom: 0; text-align: center;">---------------------------</p>

                                <div style="position: relative; height: 45mm; width: 100%; margin-top: -5mm;">
                                    <?php if($signatureSource): ?>
                                        <img class="acci-signature-image" data-preview-image="signature_image" src="<?php echo e($signatureSource); ?>" alt="" onerror="this.style.display='none'" style="position: absolute; left: 0; right: 0; top: 0; margin: 0 auto; max-width: 45mm; max-height: 45mm; mix-blend-mode: multiply; opacity: 0.9;">
                                    <?php else: ?>
                                        <img class="acci-signature-image" data-preview-image="signature_image" src="" alt="" style="display:none; position: absolute; left: 0; right: 0; top: 0; margin: 0 auto; max-width: 45mm; max-height: 45mm; mix-blend-mode: multiply; opacity: 0.9;" onerror="this.style.display='none'">
                                    <?php endif; ?>

                                    <?php if($finalStamp): ?>
                                        <img class="acci-stamp-image" data-preview-image="stamp_image" src="<?php echo e($finalStamp); ?>" alt="" onerror="this.style.display='none'" style="position: absolute; left: 0; right: 0; top: 0; margin: 0 auto; max-width: 45mm; max-height: 45mm; mix-blend-mode: multiply; opacity: 0.9;">
                                    <?php else: ?>
                                        <img class="acci-stamp-image" data-preview-image="stamp_image" src="" alt="" style="display:none; position: absolute; left: 0; right: 0; top: 0; margin: 0 auto; max-width: 45mm; max-height: 45mm; mix-blend-mode: multiply; opacity: 0.9;" onerror="this.style.display='none'">
                                    <?php endif; ?>
                                </div>
                            </div>
                        </div>
                    </div>
                </td>
            </tr>
        </tbody>
    </table>

    <footer class="acci-document__serial">
        <span data-preview="packing_list_no"><?php echo e($value('packing_list_no')); ?></span>
    </footer>
</article>
<?php /**PATH E:\New folder\sky-ariana-bbb\acci-laravel\resources\views/components/acci/packing-list-document.blade.php ENDPATH**/ ?>