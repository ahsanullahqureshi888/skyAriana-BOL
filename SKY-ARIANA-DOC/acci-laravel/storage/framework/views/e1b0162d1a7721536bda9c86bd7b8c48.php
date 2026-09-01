<?php $__env->startSection('title', 'Create SAFTA Certificate'); ?>

<?php $__env->startSection('content'); ?>
    <div class="row g-4">
        <div class="col-lg-6">
            <div class="card border-0 shadow-sm p-4">
                <div class="d-flex align-items-center justify-content-between mb-3">
                    <h2 class="fs-4 fw-bold mb-0">Create SAFTA Certificate of Origin</h2>
                </div>

                <?php if(isset($invoices) && $invoices->count() > 0): ?>
                    <div class="mb-4 p-3 bg-blue-50/50 border border-blue-200 rounded-xl" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:0.75rem">
                        <label class="form-label font-bold text-xs uppercase text-primary d-flex align-items-center gap-1.5 mb-1.5">
                            ⚡ 1-Click Auto-Fill from Existing ACCI Invoice
                        </label>
                        <select id="invoice-autofill-select" class="form-select text-sm font-semibold" style="border-radius:0.6rem">
                            <option value="">-- Select ACCI Invoice to Auto-Populate --</option>
                            <?php $__currentLoopData = $invoices; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $inv): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                                <option value="<?php echo e($inv->id); ?>"
                                    data-exporter-name="<?php echo e($inv->seller_name); ?>"
                                    data-exporter-address="<?php echo e($inv->seller_address); ?>"
                                    data-consignee-name="<?php echo e($inv->buyer_name); ?>"
                                    data-consignee-address="<?php echo e($inv->buyer_address); ?>"
                                    data-hs-code="<?php echo e($inv->hs_code); ?>"
                                    data-commodity="<?php echo e($inv->commodity); ?>"
                                    data-marks="<?php echo e($inv->number_of_packages); ?>"
                                    data-gross-weight="<?php echo e($inv->quantity_weight); ?> KGS"
                                    data-invoice-no="<?php echo e($inv->invoice_no); ?>"
                                    data-invoice-date="<?php echo e(optional($inv->invoice_date)->format('d/m/Y')); ?>"
                                    data-fob-val="<?php echo e(number_format((float)$inv->total_price, 2)); ?> USD FOB"
                                    data-route="VIA: BY AIR FROM <?php echo e(strtoupper($inv->airport_of_loading ?: 'HAMID KARZAI AIRPORT')); ?> TO <?php echo e(strtoupper($inv->country_of_destination ?: 'INDIA')); ?>"
                                >
                                    <?php echo e($inv->invoice_no); ?> - <?php echo e($inv->buyer_name); ?> (<?php echo e(number_format((float)$inv->total_price, 2)); ?> USD)
                                </option>
                            <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
                        </select>
                    </div>
                <?php endif; ?>

                <form action="<?php echo e(route('safta-certificates.store')); ?>" method="POST" id="safta-form">
                    <?php echo csrf_field(); ?>

                    <div class="row g-3 mb-3">
                        <div class="col-md-6">
                            <label class="form-label font-bold text-xs uppercase">Certificate Number *</label>
                            <input type="text" name="certificate_no" class="form-control" value="<?php echo e(old('certificate_no', $certificate->certificate_no)); ?>" required>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label font-bold text-xs uppercase">Reference No. (Top Right) *</label>
                            <input type="text" name="reference_no" class="form-control" value="<?php echo e(old('reference_no', $certificate->reference_no)); ?>" required>
                        </div>
                    </div>

                    <div class="row g-3 mb-3">
                        <div class="col-md-6">
                            <label class="form-label font-bold text-xs uppercase">Issued In Country</label>
                            <input type="text" name="issued_in_country" class="form-control" value="<?php echo e(old('issued_in_country', $certificate->issued_in_country)); ?>" required>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label font-bold text-xs uppercase">ACCI Control No. (Bottom Red) *</label>
                            <input type="text" name="acci_control_no" class="form-control text-danger font-mono font-bold" value="<?php echo e(old('acci_control_no', $certificate->acci_control_no)); ?>" required>
                        </div>
                    </div>

                    <div class="mb-3">
                        <label class="form-label font-bold text-xs uppercase">Box 1: Exporter Name *</label>
                        <?php
    $uniqueExporters = \App\Models\SaftaCertificate::select('exporter_name')->whereNotNull('exporter_name')->where('exporter_name', '!=', '')->distinct()->pluck('exporter_name');
?>
                        <input type="text" name="exporter_name" class="form-control" value="<?php echo e(old('exporter_name', $certificate->exporter_name)); ?>" required list="exporter_list">
                        <datalist id="exporter_list">
                            <?php $__currentLoopData = $uniqueExporters; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $exp): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                                <option value="<?php echo e($exp); ?>"></option>
                            <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
                        </datalist>
                    </div>

                    <div class="mb-3">
                        <label class="form-label font-bold text-xs uppercase">Box 1: Exporter Address & Details *</label>
                        <textarea name="exporter_address" class="form-control" rows="4" required><?php echo e(old('exporter_address', $certificate->exporter_address)); ?></textarea>
                    </div>

                    <div class="mb-3">
                        <label class="form-label font-bold text-xs uppercase">Box 2: Consignee Name *</label>
                        <?php
                            $uniqueConsignees = \App\Models\SaftaCertificate::select('consignee_name')->whereNotNull('consignee_name')->where('consignee_name', '!=', '')->distinct()->pluck('consignee_name');
                        ?>
                        <input type="text" name="consignee_name" class="form-control" value="<?php echo e(old('consignee_name', $certificate->consignee_name)); ?>" required list="consignee_list">
                        <datalist id="consignee_list">
                            <?php $__currentLoopData = $uniqueConsignees; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $consignee): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                                <option value="<?php echo e($consignee); ?>"></option>
                            <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
                        </datalist>
                    </div>

                    <div class="mb-3">
                        <label class="form-label font-bold text-xs uppercase">Box 2: Consignee Address & Details *</label>
                        <textarea name="consignee_address" class="form-control" rows="4" required><?php echo e(old('consignee_address', $certificate->consignee_address)); ?></textarea>
                    </div>

                    <div class="mb-3">
                        <label class="form-label font-bold text-xs uppercase">Box 3: Means of Transport and Route *</label>
                        <input type="text" name="transport_route" class="form-control" value="<?php echo e(old('transport_route', $certificate->transport_route)); ?>" required>
                    </div>

                    <!-- Cargo Table -->
                    <div class="row g-3 mb-3">
                        <div class="col-md-6">
                            <label class="form-label font-bold text-xs uppercase">Box 5: HS Code</label>
                            <input type="text" name="hs_code" class="form-control" value="<?php echo e(old('hs_code', $certificate->hs_code)); ?>">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label font-bold text-xs uppercase">Box 6: Marks and Numbers</label>
                            <input type="text" name="marks_and_numbers" class="form-control" value="<?php echo e(old('marks_and_numbers', $certificate->marks_and_numbers)); ?>">
                        </div>
                    </div>

                    <div class="mb-3">
                        <label class="form-label font-bold text-xs uppercase">Box 7: Goods Description *</label>
                        <textarea name="commodity_description" class="form-control" rows="3" required><?php echo e(old('commodity_description', $certificate->commodity_description)); ?></textarea>
                    </div>

                    <div class="row g-3 mb-3">
                        <div class="col-md-4">
                            <label class="form-label font-bold text-xs uppercase">Box 8: Origin Criterion</label>
                            <input type="text" name="origin_criterion" class="form-control" value="<?php echo e(old('origin_criterion', $certificate->origin_criterion)); ?>" required>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label font-bold text-xs uppercase">Box 9: Gross Weight *</label>
                            <input type="text" name="gross_weight" class="form-control" value="<?php echo e(old('gross_weight', $certificate->gross_weight)); ?>" required>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label font-bold text-xs uppercase">Box 10: Invoice No & Date *</label>
                            <textarea name="invoice_no_and_date" class="form-control" rows="2" required><?php echo e(old('invoice_no_and_date', "13\n23/07/2026")); ?></textarea>
                        </div>
                    </div>

                    <div class="p-3 mb-3" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:0.75rem">
                        <div class="d-flex align-items-center justify-content-between mb-2">
                            <label class="form-label font-bold text-xs uppercase text-success mb-0">🧮 Auto-Calculate Box 11 (FOB + Freight = C&F)</label>
                            <span class="badge bg-success text-white font-mono font-bold" id="calculated-total-badge">USD 47,548.80 C&F</span>
                        </div>
                        <div class="row g-2">
                            <div class="col-md-4">
                                <label class="form-label text-xs font-semibold mb-1">FOB Value ($)</label>
                                <input type="number" step="0.01" id="calc-fob-val" class="form-control form-control-sm" value="31729.68" placeholder="31729.68">
                            </div>
                            <div class="col-md-4">
                                <label class="form-label text-xs font-semibold mb-1">Freight ($)</label>
                                <input type="number" step="0.01" id="calc-freight-val" class="form-control form-control-sm" value="15819.12" placeholder="15819.12">
                            </div>
                            <div class="col-md-4">
                                <label class="form-label text-xs font-semibold mb-1">Freight Terms</label>
                                <select id="calc-freight-type" class="form-select form-select-sm">
                                    <option value="FREIGHT PREPAID BY SHIPPER">PREPAID BY SHIPPER</option>
                                    <option value="FREIGHT COLLECT">COLLECT</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="mb-3">
                        <label class="form-label font-bold text-xs uppercase">Box 11: FOB Value Details *</label>
                        <textarea name="fob_value_details" class="form-control" rows="4" required><?php echo e(old('fob_value_details', $certificate->fob_value_details)); ?></textarea>
                    </div>

                    <!-- Declaration & Certificate -->
                    <div class="row g-3 mb-3">
                        <div class="col-md-6">
                            <label class="form-label font-bold text-xs uppercase">Box 12: Producing Country</label>
                            <input type="text" name="producing_country" class="form-control" value="<?php echo e(old('producing_country', $certificate->producing_country)); ?>" required>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label font-bold text-xs uppercase">Box 12: Importing Country</label>
                            <input type="text" name="importing_country" class="form-control" value="<?php echo e(old('importing_country', $certificate->importing_country)); ?>" required>
                        </div>
                    </div>

                    <div class="row g-3 mb-4">
                        <div class="col-md-6">
                            <label class="form-label font-bold text-xs uppercase">Box 12: Declaration Date *</label>
                            <input type="date" name="declaration_date" class="form-control" value="<?php echo e(old('declaration_date', optional($certificate->declaration_date)->format('Y-m-d'))); ?>" required>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label font-bold text-xs uppercase">Box 13: Certification Date *</label>
                            <input type="date" name="certification_date" class="form-control" value="<?php echo e(old('certification_date', optional($certificate->certification_date)->format('Y-m-d'))); ?>" required>
                        </div>
                    </div>

                    <div class="d-flex gap-2">
                        <button type="submit" class="btn btn-primary-action px-4 fw-bold">Save SAFTA Certificate</button>
                        <a href="<?php echo e(route('safta-certificates.index')); ?>" class="btn btn-outline-secondary px-3" style="border-radius:0.75rem">Cancel</a>
                    </div>
                </form>
            </div>
        </div>

        <div class="col-lg-6">
            <div class="sticky-top" style="top: 1rem;">
                <div class="card border-0 shadow-sm p-3" style="border-radius:0.85rem;background:#f8fafc">
                    <div class="d-flex align-items-center justify-content-between mb-3">
                        <h3 class="fs-6 fw-bold text-secondary uppercase mb-0">Live A4 Preview (SAFTA Replica)</h3>
                        <span class="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2.5 py-1">Real-time Sync</span>
                    </div>
                    <div class="show-document-stage overflow-auto">
                        <div class="show-document-sheet" style="transform: scale(0.72); transform-origin: top left; margin-bottom: -150px;">
                            <?php if (isset($component)) { $__componentOriginal2df637f9f236605c33565ecbdedfe132 = $component; } ?>
<?php if (isset($attributes)) { $__attributesOriginal2df637f9f236605c33565ecbdedfe132 = $attributes; } ?>
<?php $component = Illuminate\View\AnonymousComponent::resolve(['view' => 'components.acci.safta-document','data' => ['certificate' => $certificate,'livePreview' => true]] + (isset($attributes) && $attributes instanceof Illuminate\View\ComponentAttributeBag ? $attributes->all() : [])); ?>
<?php $component->withName('acci.safta-document'); ?>
<?php if ($component->shouldRender()): ?>
<?php $__env->startComponent($component->resolveView(), $component->data()); ?>
<?php if (isset($attributes) && $attributes instanceof Illuminate\View\ComponentAttributeBag): ?>
<?php $attributes = $attributes->except(\Illuminate\View\AnonymousComponent::ignoredParameterNames()); ?>
<?php endif; ?>
<?php $component->withAttributes(['certificate' => \Illuminate\View\Compilers\BladeCompiler::sanitizeComponentAttribute($certificate),'live-preview' => true]); ?>
<?php echo $__env->renderComponent(); ?>
<?php endif; ?>
<?php if (isset($__attributesOriginal2df637f9f236605c33565ecbdedfe132)): ?>
<?php $attributes = $__attributesOriginal2df637f9f236605c33565ecbdedfe132; ?>
<?php unset($__attributesOriginal2df637f9f236605c33565ecbdedfe132); ?>
<?php endif; ?>
<?php if (isset($__componentOriginal2df637f9f236605c33565ecbdedfe132)): ?>
<?php $component = $__componentOriginal2df637f9f236605c33565ecbdedfe132; ?>
<?php unset($__componentOriginal2df637f9f236605c33565ecbdedfe132); ?>
<?php endif; ?>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const form = document.getElementById('safta-form');
            const autofillSelect = document.getElementById('invoice-autofill-select');
            if (!form) return;

            function updatePreview(name, val, type = 'text') {
                const previewEls = document.querySelectorAll(`[data-preview="${name}"]`);
                previewEls.forEach(el => {
                    if (type === 'date') {
                        if (val) {
                            const parts = val.split('-');
                            if (parts.length === 3) el.textContent = `${parts[2]}/${parts[1]}/${parts[0]}`;
                            else el.textContent = val;
                        } else {
                            el.textContent = '';
                        }
                    } else if (name === 'invoice_no_and_date') {
                        let cleanVal = val.trim();
                        if (!cleanVal.includes('\n')) {
                            const match = cleanVal.match(/^(\d+)\s*(\d{2}\/\d{2}\/\d{4})$/);
                            if (match) {
                                cleanVal = match[1] + '\n' + match[2];
                            }
                        }
                        el.innerHTML = cleanVal.split(/\r?\n/).map(line => `<div style="line-height: 1.4; font-weight: 800;">${line.trim()}</div>`).join('');
                    } else {
                        el.textContent = val;
                    }
                });
            }

            function recalculateFobDetails() {
                const fobInput = document.getElementById('calc-fob-val');
                const freightInput = document.getElementById('calc-freight-val');
                const freightTypeSelect = document.getElementById('calc-freight-type');
                if (!fobInput || !freightInput || !freightTypeSelect) return;

                const fob = parseFloat(fobInput.value) || 0;
                const freight = parseFloat(freightInput.value) || 0;
                const freightType = freightTypeSelect.value || 'FREIGHT PREPAID BY SHIPPER';
                const total = fob + freight;

                const formattedFob = fob.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                const formattedFreight = freight.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                const formattedTotal = total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

                const badge = document.getElementById('calculated-total-badge');
                if (badge) badge.textContent = `USD ${formattedTotal} C&F`;

                const fobTextarea = form.querySelector('[name="fob_value_details"]');
                if (fobTextarea) {
                    fobTextarea.value = `${formattedFob}\nUSD FOB\n${freightType}\n${formattedFreight}\nUSD TOTAL\n${formattedTotal}\nUSD C&F`;
                    updatePreview('fob_value_details', fobTextarea.value, 'textarea');
                }
            }

            ['calc-fob-val', 'calc-freight-val', 'calc-freight-type'].forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.addEventListener('input', recalculateFobDetails);
                    el.addEventListener('change', recalculateFobDetails);
                }
            });

            if (autofillSelect) {
                autofillSelect.addEventListener('change', function() {
                    const opt = this.options[this.selectedIndex];
                    if (!opt || !opt.value) return;

                    const setField = (fieldName, val) => {
                        const field = form.querySelector(`[name="${fieldName}"]`);
                        if (field) {
                            field.value = val;
                            updatePreview(fieldName, val, field.type);
                        }
                    };

                    setField('exporter_name', opt.dataset.exporterName || '');
                    setField('exporter_address', opt.dataset.exporterAddress || '');
                    setField('consignee_name', opt.dataset.consigneeName || '');
                    setField('consignee_address', opt.dataset.consigneeAddress || '');
                    setField('hs_code', opt.dataset.hsCode || '');
                    setField('marks_and_numbers', opt.dataset.marks || '');
                    setField('commodity_description', opt.dataset.commodity || '');
                    setField('gross_weight', opt.dataset.grossWeight || '');
                    setField('invoice_no_and_date', `${opt.dataset.invoiceNo || ''}\n${opt.dataset.invoiceDate || ''}`);
                    setField('fob_value_details', opt.dataset.fobVal || '');
                    setField('transport_route', opt.dataset.route || '');
                });
            }

            form.addEventListener('input', function(e) {
                const target = e.target;
                const name = target.name;
                if (!name) return;
                updatePreview(name, target.value, target.type);
            });
        });
    </script>
<?php $__env->stopSection(); ?>

<?php echo $__env->make('layouts.app', array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?><?php /**PATH E:\New folder\sky-ariana-bbb\acci-laravel\resources\views/safta-certificates/create.blade.php ENDPATH**/ ?>