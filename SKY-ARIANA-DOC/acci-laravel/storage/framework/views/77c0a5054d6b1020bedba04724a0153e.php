<?php $attributes ??= new \Illuminate\View\ComponentAttributeBag;

$__newAttributes = [];
$__propNames = \Illuminate\View\ComponentAttributeBag::extractPropNames(([
    'invoice',
    'forPdf' => false,
    'livePreview' => false,
    'color' => 'white',
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
    'invoice',
    'forPdf' => false,
    'livePreview' => false,
    'color' => 'white',
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

    $value = function (string $field, mixed $fallback = '') use ($invoice, $livePreview): mixed {
        $modelValue = data_get($invoice, $field, $fallback);
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

    $money = fn (mixed $amount): string => number_format((float) $amount, 2, '.', ',');
    $weightFormat = function (mixed $amount): string {
        $val = (float) $amount;
        return floor($val) == $val ? number_format($val, 0, '.', ',') : number_format($val, 2, '.', ',');
    };

    $imageSource = function (?string $path) use ($forPdf): ?string {
        if (! $path || ! Storage::disk('public')->exists($path)) return null;
        if (! $forPdf) return Storage::disk('public')->url($path);

        $mime = Storage::disk('public')->mimeType($path) ?: 'image/png';
        return 'data:'.$mime.';base64,'.base64_encode(Storage::disk('public')->get($path));
    };

    $stampSource = $imageSource($invoice->stamp_image);
    $signatureSource = $imageSource($invoice->signature_image);

    $sellerAddr = (string) $value('seller_address');
    $buyerAddr = (string) $value('buyer_address');
    $totalChars = strlen($sellerAddr) + strlen($buyerAddr);
    $totalLines = substr_count($sellerAddr, "\n") + substr_count($buyerAddr, "\n");
    $isLongPartyText = $totalChars > 200 || $totalLines > 6;

    $watermarkPath = public_path('images/acci-watermark.jpg');
    $watermarkSrc = ($forPdf && file_exists($watermarkPath)) 
        ? 'data:image/jpeg;base64,' . base64_encode(file_get_contents($watermarkPath)) 
        : asset('images/acci-watermark.jpg');
?>

<article class="acci-document <?php echo e($color === 'blue' ? 'acci-blue' : ''); ?>" aria-label="ACCI Invoice <?php echo e($value('invoice_no')); ?>" style="position: relative;">
    <!-- Watermark -->
    <div style="position: absolute; left: 0; width: 100%; text-align: center; z-index: 0; pointer-events: none; opacity: 0.1; <?php echo e($forPdf ? 'top: 350px;' : 'top: 50%; transform: translateY(-50%);'); ?>">
        <img src="<?php echo e($watermarkSrc); ?>" alt="" style="width: 450px; height: auto; margin: 0 auto; display: inline-block;" />
    </div>

    <header class="acci-document__title" style="text-align: center; margin-bottom: 3mm;">
        <h1 style="margin: 0; font-size: 16pt; font-weight: 800; letter-spacing: 0.5px; color: #000;">INVOICE</h1>
        <div style="font-size: 14pt; font-weight: 900; letter-spacing: 2px; line-height: 1; margin-top: 1mm; color: #000;">**************</div>
    </header>

    <table class="acci-header-layout">
        <tbody>
            <tr>
                <td class="acci-header-layout__left">
                    <section class="acci-party-box <?php echo e($isLongPartyText ? 'has-long-party-text' : ''); ?>">
                        <div class="acci-party-block acci-party-block--seller">
                            <p class="acci-party-header"><span class="acci-party-label">FROM:</span> <strong class="acci-party-name" data-preview="seller_name"><?php echo e($value('seller_name')); ?></strong></p>
                            <p class="acci-party-address" data-preview="seller_address"><?php echo e($value('seller_address')); ?></p>
                            <?php if($value('seller_phone')): ?>
                                <p class="acci-party-contact">TEL: <span data-preview="seller_phone"><?php echo e($value('seller_phone')); ?></span></p>
                            <?php endif; ?>
                        </div>
                        <div class="acci-party-divider">----------------------------------------------</div>
                        <div class="acci-party-block acci-party-block--buyer">
                            <p class="acci-party-header"><span class="acci-party-label">TO:</span> <strong class="acci-party-name" data-preview="buyer_name"><?php echo e($value('buyer_name')); ?></strong></p>
                            <p class="acci-party-address" data-preview="buyer_address"><?php echo e($value('buyer_address')); ?></p>
                            <?php if($value('buyer_gst')): ?>
                                <p class="acci-party-contact">GST: <span data-preview="buyer_gst"><?php echo e($value('buyer_gst')); ?></span></p>
                            <?php endif; ?>
                            <?php if($value('buyer_fssai')): ?>
                                <p class="acci-party-contact">FSSAI NO: <span data-preview="buyer_fssai"><?php echo e($value('buyer_fssai')); ?></span></p>
                            <?php endif; ?>
                            <?php if($value('buyer_iec')): ?>
                                <p class="acci-party-contact">IEC CODE: <span data-preview="buyer_iec"><?php echo e($value('buyer_iec')); ?></span></p>
                            <?php endif; ?>
                            <?php if($value('buyer_phone')): ?>
                                <p class="acci-party-contact">PHONE NO: <span data-preview="buyer_phone"><?php echo e($value('buyer_phone')); ?></span></p>
                            <?php endif; ?>
                        </div>
                    </section>
                </td>
                <td class="acci-header-layout__right">
                    <div class="acci-document-meta">
                        <p><span>No:</span><span data-preview="invoice_no"><?php echo e($value('invoice_no')); ?></span></p>
                        <p><span>Date:</span><span data-preview="invoice_date"><?php echo e($dateValue('invoice_date')); ?></span></p>
                    </div>
                    <table class="acci-detail-table">
                        <tbody>
                            <tr><td colspan="2" class="acci-detail-table__heading">Afghan Transit Form Airway Bill</td></tr>
                            <tr><td colspan="2" class="acci-detail-table__awb"><span>No: <span data-preview="airway_bill_no"><?php echo e($value('airway_bill_no')); ?></span></span> <span style="float:right">Date: <span data-preview="airway_bill_date"><?php echo e($dateValue('airway_bill_date')); ?></span></span></td></tr>
                            <tr>
                                <td colspan="2" class="acci-detail-table__payment">
                                    <span class="acci-detail-label text-center">Terms of Payment</span>
                                    <strong data-preview="payment_terms"><?php echo e($value('payment_terms')); ?></strong>
                                    <span data-preview="advance_payment"><?php echo e($value('advance_payment')); ?></span>
                                </td>
                            </tr>
                            <tr class="acci-detail-table__split">
                                <td>
                                    <span class="acci-detail-label">Letter Of Credit</span>
                                    <span>No: <span data-preview="lc_number"><?php echo e($value('lc_number')); ?></span></span>
                                </td>
                                <td>
                                    <span class="acci-detail-label">Collection Basis</span>
                                    <span data-preview="collection_basis"><?php echo e($value('collection_basis')); ?></span>
                                </td>
                            </tr>
                            <tr>
                                <td colspan="2" class="acci-detail-table__route">
                                    <span class="acci-detail-label">Through:</span>
                                    <strong data-preview="transport_route" class="d-block"><?php echo e($value('transport_route')); ?></strong>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </td>
            </tr>
        </tbody>
    </table>

    <table class="acci-goods-table" style="border-collapse: collapse; border-spacing: 0;">
        <thead>
            <tr>
                <th class="acci-goods-table__no">NO</th>
                <th class="acci-spacer-col" style="border: none !important; width: 5px;"></th>
                <th class="acci-goods-table__quantity">Quantity</th>
                <th class="acci-goods-table__description">Description of Goods</th>
                <th class="acci-goods-table__unit">Unit price<br>USD</th>
                <th class="acci-goods-table__total">Total price<br>USD</th>
            </tr>
        </thead>
        <tbody>
            <tr class="acci-spacer-row"><td colspan="6" style="border: none !important; height: 5px; padding: 0;"></td></tr>
            <tr class="acci-goods-row">
                <td class="acci-goods-row__number">1</td>
                <td class="acci-spacer-col" style="border: none !important;"></td>
                <td class="acci-goods-row__quantity">
                    <div class="acci-quantity-lines">
                        <p style="margin-bottom: 15px;"><span data-preview="quantity_cartons"><?php echo e(number_format((float) $value('quantity_cartons'))); ?></span> CTNS</p>
                        <p><span data-preview="quantity_weight"><?php echo e($weightFormat($value('quantity_weight'))); ?></span> KGS</p>
                    </div>
                </td>
                <td class="acci-goods-row__description">
                    <p class="acci-product-name" data-preview="commodity"><?php echo e($value('commodity')); ?></p>

                    <div class="acci-description-summary">
                        <p class="acci-description-summary__amount">Total Amount Say:USD:</p>
                        <p class="acci-description-summary__words" data-preview="amount_in_words"><?php echo e($value('amount_in_words')); ?></p>
                        <p class="acci-description-summary__origin">(Origin <span data-preview="country_of_origin"><?php echo e($value('country_of_origin', 'Afghanistan')); ?></span>)</p>
                    </div>

                    <div class="acci-receipt-box" style="width: 95%; margin: 0 auto; border: 1.5px solid #222; padding: 4mm 5mm 15mm 5mm; text-align: left; font-size: 8.5pt; font-family: 'Times New Roman', Times, serif; font-weight: 400; line-height: 1.6;">
                        <div style="width: 70%;">
                            <div style="display: flex; align-items: center; margin-bottom: 1.5mm;">
                                <span style="white-space: nowrap;">Reg No :</span>
                                <span style="flex-grow: 0.35; border-bottom: 1.5px dashed #222; margin-left: 4px; transform: translateY(-4px);"></span>
                                <span style="padding: 0 4px;" data-preview="reg_no"><?php echo e($value('reg_no')); ?></span>
                                <span style="flex-grow: 0.65; border-bottom: 1.5px dashed #222; transform: translateY(-4px);"></span>
                            </div>
                            <div style="display: flex; align-items: center; margin-bottom: 1.5mm;">
                                <span style="white-space: nowrap;">Fee No :</span>
                                <span style="flex-grow: 0.35; border-bottom: 1.5px dashed #222; margin-left: 4px; transform: translateY(-4px);"></span>
                                <span style="padding: 0 4px;" data-preview="fee_no"><?php echo e($value('fee_no')); ?></span>
                                <span style="flex-grow: 0.65; border-bottom: 1.5px dashed #222; transform: translateY(-4px);"></span>
                            </div>
                            <div style="display: flex; align-items: center; margin-bottom: 1.5mm;">
                                <span style="white-space: nowrap;">Received the sum of</span>
                                <span style="width: 30px; border-bottom: 1.5px dashed #222; margin-left: 4px; transform: translateY(-4px);"></span>
                                <span style="padding: 0 4px;" data-preview="received_amount"><?php echo e($value('received_amount') ? $money($value('received_amount')) : ''); ?></span>
                            </div>
                            <div style="display: flex; align-items: center; margin-bottom: 1.5mm;">
                                <span style="white-space: nowrap;">Date :</span>
                                <span style="flex-grow: 0.3; border-bottom: 1.5px dashed #222; margin-left: 4px; transform: translateY(-4px);"></span>
                                <span style="padding: 0 4px;" data-preview="received_date"><?php echo e($dateValue('received_date')); ?></span>
                                <span style="flex-grow: 0.7; border-bottom: 1.5px dashed #222; transform: translateY(-4px);"></span>
                            </div>
                            <div style="display: flex; align-items: center; margin-top: 15mm;">
                                <span style="white-space: nowrap;">Signature :</span>
                                <span style="flex-grow: 1; border-bottom: 1.5px dashed #222; margin-left: 4px; transform: translateY(-4px);"></span>
                            </div>
                        </div>
                    </div>



                    <div class="acci-seal-layer" style="z-index: 10;">
                        <?php if($signatureSource): ?>
                            <img
                                class="acci-signature-image"
                                data-preview-image="signature_image"
                                src="<?php echo e($signatureSource); ?>"
                                alt=""
                                onerror="this.style.display='none'"
                            >
                        <?php else: ?>
                            <img
                                class="acci-signature-image"
                                data-preview-image="signature_image"
                                src=""
                                alt=""
                                style="display:none"
                                onerror="this.style.display='none'"
                            >
                        <?php endif; ?>

                        <?php
                            $sellerName = strtoupper(trim($invoice->seller_name));
                            $dbStamp = \App\Models\CompanyStamp::where('company_name', $sellerName)->first();
                            
                            $companyNameStr = trim(strtoupper((string) ($invoice->authorized_person ?: $invoice->seller_name)));
                            $isNasib = str_contains($companyNameStr, 'NASIB OBID AKBARI');
                            
                            if (!empty($stampSource)) {
                                $finalStamp = $stampSource;
                            } elseif ($dbStamp && $dbStamp->stamp_image_path) {
                                $finalStamp = asset($dbStamp->stamp_image_path);
                            } else {
                                $finalStamp = $isNasib ? asset('images/nasib_stamp.png') : null;
                            }
                        ?>

                        <?php if($finalStamp): ?>
                            <img
                                class="acci-stamp-image"
                                data-preview-image="stamp_image"
                                src="<?php echo e($finalStamp); ?>"
                                alt=""
                                onerror="this.style.display='none'"
                                style="position: absolute; top: 0; left: 0; right: 0; margin: 0 auto; max-width: 45mm; max-height: 45mm; mix-blend-mode: multiply;"
                            >
                        <?php else: ?>
                            <img
                                class="acci-stamp-image"
                                data-preview-image="stamp_image"
                                src=""
                                alt=""
                                style="display:none; position: absolute; top: 0; left: 0; right: 0; margin: 0 auto; max-width: 45mm; max-height: 45mm; mix-blend-mode: multiply;"
                                onerror="this.style.display='none'"
                            >
                        <?php endif; ?>
                    </div>
                </td>
                <td><p class="acci-price-top" data-preview="unit_price"><?php echo e(number_format((float) $value('unit_price'), 2, '.', ',')); ?></p></td>
                <td>
                    <p class="acci-price-top" data-preview="total_price"><?php echo e($money($value('total_price'))); ?></p>
                    <div class="acci-authorized-block">
                        <p class="acci-authorized-block__total"><strong>TOTAL</strong><span>C&amp;F</span></p>
                        <p class="acci-authorized-block__price" data-preview="total_price"><?php echo e($money($value('total_price'))); ?></p>
                        <span class="acci-authorized-block__name" data-preview="authorized_person"><?php echo e($value('authorized_person') ?: $value('seller_name')); ?></span>
                        <span class="acci-authorized-block__label">Authorized Person</span>
                    </div>
                </td>
            </tr>
        </tbody>
    </table>

    <footer class="acci-document__serial">
        <span style="font-family: 'Times New Roman', Times, serif; margin-right: 15px; font-weight: 700;">ACCI:</span>
        <span data-preview="acci_no"><?php echo e($value('acci_no')); ?></span>
    </footer>
</article>
<?php /**PATH E:\New folder\sky-ariana-bbb\acci-laravel\resources\views/components/acci/document.blade.php ENDPATH**/ ?>