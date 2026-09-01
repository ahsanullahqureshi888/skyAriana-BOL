@extends('layouts.app')

@section('title', 'Create SAFTA Certificate')

@section('content')
    <div class="row g-4">
        <div class="col-lg-6">
            <div class="card border-0 shadow-sm p-4">
                <div class="d-flex align-items-center justify-content-between mb-3">
                    <h2 class="fs-4 fw-bold mb-0">Create SAFTA Certificate of Origin</h2>
                </div>

                @if(isset($invoices) && $invoices->count() > 0)
                    <div class="mb-4 p-3 bg-blue-50/50 border border-blue-200 rounded-xl" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:0.75rem">
                        <label class="form-label font-bold text-xs uppercase text-primary d-flex align-items-center gap-1.5 mb-1.5">
                            ⚡ 1-Click Auto-Fill from Existing ACCI Invoice
                        </label>
                        <select id="invoice-autofill-select" class="form-select text-sm font-semibold" style="border-radius:0.6rem">
                            <option value="">-- Select ACCI Invoice to Auto-Populate --</option>
                            @foreach($invoices as $inv)
                                <option value="{{ $inv->id }}"
                                    data-exporter-name="{{ $inv->seller_name }}"
                                    data-exporter-address="{{ $inv->seller_address }}"
                                    data-consignee-name="{{ $inv->buyer_name }}"
                                    data-consignee-address="{{ $inv->buyer_address }}"
                                    data-hs-code="{{ $inv->hs_code }}"
                                    data-commodity="{{ $inv->commodity }}"
                                    data-marks="{{ $inv->number_of_packages }}"
                                    data-gross-weight="{{ $inv->quantity_weight }} KGS"
                                    data-invoice-no="{{ $inv->invoice_no }}"
                                    data-invoice-date="{{ optional($inv->invoice_date)->format('d/m/Y') }}"
                                    data-fob-val="{{ number_format((float)$inv->total_price, 2) }} USD FOB"
                                    data-route="VIA: BY AIR FROM {{ strtoupper($inv->airport_of_loading ?: 'HAMID KARZAI AIRPORT') }} TO {{ strtoupper($inv->country_of_destination ?: 'INDIA') }}"
                                >
                                    {{ $inv->invoice_no }} - {{ $inv->buyer_name }} ({{ number_format((float)$inv->total_price, 2) }} USD)
                                </option>
                            @endforeach
                        </select>
                    </div>
                @endif

                <form action="{{ route('safta-certificates.store') }}" method="POST" id="safta-form">
                    @csrf

                    <div class="row g-3 mb-3">
                        <div class="col-md-6">
                            <label class="form-label font-bold text-xs uppercase">Certificate Number *</label>
                            <input type="text" name="certificate_no" class="form-control" value="{{ old('certificate_no', $certificate->certificate_no) }}" required>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label font-bold text-xs uppercase">Reference No. (Top Right) *</label>
                            <input type="text" name="reference_no" class="form-control" value="{{ old('reference_no', $certificate->reference_no) }}" required>
                        </div>
                    </div>

                    <div class="row g-3 mb-3">
                        <div class="col-md-6">
                            <label class="form-label font-bold text-xs uppercase">Issued In Country</label>
                            <input type="text" name="issued_in_country" class="form-control" value="{{ old('issued_in_country', $certificate->issued_in_country) }}" required>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label font-bold text-xs uppercase">ACCI Control No. (Bottom Red) *</label>
                            <input type="text" name="acci_control_no" class="form-control text-danger font-mono font-bold" value="{{ old('acci_control_no', $certificate->acci_control_no) }}" required>
                        </div>
                    </div>

                    @php
                        $savedSellers = \App\Models\SavedCompany::whereIn('type', ['seller', 'both'])->orderBy('company_name')->get();
                        $savedBuyers = \App\Models\SavedCompany::whereIn('type', ['buyer', 'both'])->orderBy('company_name')->get();
                    @endphp

                    <x-party-autocomplete :sellers="$savedSellers" :buyers="$savedBuyers" />

                    <div class="row g-3 mb-3 bg-slate-50 p-3 rounded-3 border" style="border-color:#e2e8f0 !important;">
                        <div class="col-md-6">
                            <div class="d-flex align-items-center justify-content-between mb-1">
                                <label class="form-label font-bold text-xs uppercase mb-0">⚡ Quick Select Saved Exporter (Box 1)</label>
                                <button type="button" class="party-recommend-trigger party-recommend-trigger--seller py-0 px-2" onclick="openRecommendations_exporter_name()">💡 View All Shippers ({{ $savedSellers->count() }})</button>
                            </div>
                            <select class="form-select form-select-sm" id="saved-exporter-select" onchange="autoFillSaftaExporter(this)">
                                <option value="">-- Choose Saved Exporter Profile ({{ $savedSellers->count() }} profiles) --</option>
                                @foreach($savedSellers as $sSeller)
                                    <option value="{{ json_encode($sSeller) }}">{{ $sSeller->company_name }} @if($sSeller->iec_code)(Lic: {{ $sSeller->iec_code }})@endif</option>
                                @endforeach
                            </select>
                        </div>
                        <div class="col-md-6">
                            <div class="d-flex align-items-center justify-content-between mb-1">
                                <label class="form-label font-bold text-xs uppercase mb-0">⚡ Quick Select Saved Consignee (Box 2)</label>
                                <button type="button" class="party-recommend-trigger party-recommend-trigger--buyer py-0 px-2" onclick="openRecommendations_consignee_name()">💡 View All Consignees ({{ $savedBuyers->count() }})</button>
                            </div>
                            <select class="form-select form-select-sm" id="saved-consignee-select" onchange="autoFillSaftaConsignee(this)">
                                <option value="">-- Choose Saved Consignee Profile ({{ $savedBuyers->count() }} profiles) --</option>
                                @foreach($savedBuyers as $sBuyer)
                                    <option value="{{ json_encode($sBuyer) }}">{{ $sBuyer->company_name }} @if($sBuyer->gst_no)(GST: {{ $sBuyer->gst_no }})@endif</option>
                                @endforeach
                            </select>
                        </div>
                    </div>

                    <div class="mb-3">
                        <div class="d-flex align-items-center justify-content-between mb-1">
                            <label class="form-label font-bold text-xs uppercase mb-0">Box 1: Exporter Name *</label>
                            <div class="d-flex align-items-center gap-1.5">
                                <button type="button" class="party-recommend-trigger party-recommend-trigger--seller py-0 px-2" onclick="openRecommendations_exporter_name()">💡 Recommend Shippers</button>
                                <button type="button" class="btn btn-xs btn-outline-primary py-0 px-2 rounded-pill fw-bold" onclick="saveSaftaParty('exporter')" style="font-size:0.72rem;">💾 Save Exporter</button>
                            </div>
                        </div>
                        <div class="party-autocomplete-wrapper">
                            <input type="text" name="exporter_name" id="exporter_name" class="form-control" value="{{ old('exporter_name', $certificate->exporter_name) }}" required placeholder="Type name or click for recommendations..." autocomplete="off">
                        </div>
                    </div>

                    <div class="mb-3">
                        <label class="form-label font-bold text-xs uppercase">Box 1: Exporter Address &amp; Details *</label>
                        <textarea name="exporter_address" id="exporter_address" class="form-control" rows="4" required placeholder="Full exporter address...">{{ old('exporter_address', $certificate->exporter_address) }}</textarea>
                    </div>

                    <div class="mb-3">
                        <div class="d-flex align-items-center justify-content-between mb-1">
                            <label class="form-label font-bold text-xs uppercase mb-0">Box 2: Consignee Name *</label>
                            <div class="d-flex align-items-center gap-1.5">
                                <button type="button" class="party-recommend-trigger party-recommend-trigger--buyer py-0 px-2" onclick="openRecommendations_consignee_name()">💡 Recommend Consignees</button>
                                <button type="button" class="btn btn-xs btn-outline-primary py-0 px-2 rounded-pill fw-bold" onclick="saveSaftaParty('consignee')" style="font-size:0.72rem;">💾 Save Consignee</button>
                            </div>
                        </div>
                        <div class="party-autocomplete-wrapper">
                            <input type="text" name="consignee_name" id="consignee_name" class="form-control" value="{{ old('consignee_name', $certificate->consignee_name) }}" required placeholder="Type name or click for recommendations..." autocomplete="off">
                        </div>
                    </div>

                    <div class="mb-3">
                        <label class="form-label font-bold text-xs uppercase">Box 2: Consignee Address &amp; Details *</label>
                        <textarea name="consignee_address" id="consignee_address" class="form-control" rows="4" required placeholder="Full consignee address...">{{ old('consignee_address', $certificate->consignee_address) }}</textarea>
                    </div>

                    <div class="mb-3">
                        <label class="form-label font-bold text-xs uppercase">Box 3: Means of Transport and Route *</label>
                        <input type="text" name="transport_route" class="form-control" value="{{ old('transport_route', $certificate->transport_route) }}" required>
                    </div>

                    <!-- Cargo Table -->
                    <div class="row g-3 mb-3">
                        <div class="col-md-6">
                            <label class="form-label font-bold text-xs uppercase">Box 5: HS Code</label>
                            <input type="text" name="hs_code" class="form-control" value="{{ old('hs_code', $certificate->hs_code) }}">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label font-bold text-xs uppercase">Box 6: Marks and Numbers</label>
                            <input type="text" name="marks_and_numbers" class="form-control" value="{{ old('marks_and_numbers', $certificate->marks_and_numbers) }}">
                        </div>
                    </div>

                    <div class="mb-3">
                        <label class="form-label font-bold text-xs uppercase">Box 7: Goods Description *</label>
                        <textarea name="commodity_description" class="form-control" rows="3" required>{{ old('commodity_description', $certificate->commodity_description) }}</textarea>
                    </div>

                    <div class="row g-3 mb-3">
                        <div class="col-md-4">
                            <label class="form-label font-bold text-xs uppercase">Box 8: Origin Criterion</label>
                            <input type="text" name="origin_criterion" class="form-control" value="{{ old('origin_criterion', $certificate->origin_criterion) }}" required>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label font-bold text-xs uppercase">Box 9: Gross Weight *</label>
                            <input type="text" name="gross_weight" class="form-control" value="{{ old('gross_weight', $certificate->gross_weight) }}" required>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label font-bold text-xs uppercase">Box 10: Invoice No & Date *</label>
                            <textarea name="invoice_no_and_date" class="form-control" rows="2" required>{{ old('invoice_no_and_date', "13\n23/07/2026") }}</textarea>
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
                        <textarea name="fob_value_details" class="form-control" rows="4" required>{{ old('fob_value_details', $certificate->fob_value_details) }}</textarea>
                    </div>

                    <!-- Declaration & Certificate -->
                    <div class="row g-3 mb-3">
                        <div class="col-md-6">
                            <label class="form-label font-bold text-xs uppercase">Box 12: Producing Country</label>
                            <input type="text" name="producing_country" class="form-control" value="{{ old('producing_country', $certificate->producing_country) }}" required>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label font-bold text-xs uppercase">Box 12: Importing Country</label>
                            <input type="text" name="importing_country" class="form-control" value="{{ old('importing_country', $certificate->importing_country) }}" required>
                        </div>
                    </div>

                    <div class="row g-3 mb-4">
                        <div class="col-md-6">
                            <label class="form-label font-bold text-xs uppercase">Box 12: Declaration Date *</label>
                            <input type="date" name="declaration_date" class="form-control" value="{{ old('declaration_date', optional($certificate->declaration_date)->format('Y-m-d')) }}" required>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label font-bold text-xs uppercase">Box 13: Certification Date *</label>
                            <input type="date" name="certification_date" class="form-control" value="{{ old('certification_date', optional($certificate->certification_date)->format('Y-m-d')) }}" required>
                        </div>
                    </div>

                    <div class="d-flex gap-2">
                        <button type="submit" class="btn btn-primary-action px-4 fw-bold d-inline-flex align-items-center gap-2" id="saveSaftaSubmitBtn">Save SAFTA Certificate</button>
                        <a href="{{ route('safta-certificates.index') }}" class="btn btn-outline-secondary px-3" style="border-radius:0.75rem">Cancel</a>
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
                            <x-acci.safta-document :certificate="$certificate" :live-preview="true" />
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

            if (typeof attachPartyAutocomplete === 'function') {
                attachPartyAutocomplete({
                    input: 'exporter_name',
                    type: 'seller',
                    selectId: 'saved-exporter-select',
                    mappings: {
                        address: 'exporter_address'
                    }
                });

                attachPartyAutocomplete({
                    input: 'consignee_name',
                    type: 'buyer',
                    selectId: 'saved-consignee-select',
                    mappings: {
                        address: 'consignee_address'
                    }
                });
            }
        });

        window.autoFillSaftaExporter = function(selectEl) {
            if (!selectEl.value) return;
            try {
                const data = JSON.parse(selectEl.value);
                if (data.company_name) document.getElementById('exporter_name').value = data.company_name;
                if (data.address) document.getElementById('exporter_address').value = data.address;
                document.getElementById('exporter_name').dispatchEvent(new Event('input', {bubbles: true}));
                document.getElementById('exporter_address').dispatchEvent(new Event('input', {bubbles: true}));
            } catch(e) {}
        };

        window.autoFillSaftaConsignee = function(selectEl) {
            if (!selectEl.value) return;
            try {
                const data = JSON.parse(selectEl.value);
                if (data.company_name) document.getElementById('consignee_name').value = data.company_name;
                if (data.address) document.getElementById('consignee_address').value = data.address;
                document.getElementById('consignee_name').dispatchEvent(new Event('input', {bubbles: true}));
                document.getElementById('consignee_address').dispatchEvent(new Event('input', {bubbles: true}));
            } catch(e) {}
        };

        window.saveSaftaParty = function(type) {
            const isExporter = type === 'exporter';
            const companyName = document.getElementById(isExporter ? 'exporter_name' : 'consignee_name')?.value.trim();
            const address = document.getElementById(isExporter ? 'exporter_address' : 'consignee_address')?.value.trim();

            if (!companyName) {
                alert('Please enter ' + type + ' name first.');
                return;
            }

            const payload = {
                type: isExporter ? 'seller' : 'buyer',
                company_name: companyName,
                address: address
            };

            fetch("{{ route('saved-companies.store') }}", {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': '{{ csrf_token() }}',
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            })
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    alert('✅ Saved ' + companyName + ' to Saved Parties library!');
                    const selectId = isExporter ? 'saved-exporter-select' : 'saved-consignee-select';
                    const selectEl = document.getElementById(selectId);
                    if (selectEl) {
                        const opt = document.createElement('option');
                        opt.value = JSON.stringify(data.company);
                        opt.textContent = data.company.company_name;
                        opt.selected = true;
                        selectEl.appendChild(opt);
                    }
                    if (isExporter && window.SAVED_SELLERS_DATA) {
                        window.SAVED_SELLERS_DATA.push(data.company);
                    } else if (!isExporter && window.SAVED_BUYERS_DATA) {
                        window.SAVED_BUYERS_DATA.push(data.company);
                    }
                } else {
                    alert('Error saving company');
                }
            })
            .catch(() => alert('Error saving company'));
        };

        document.getElementById('safta-form')?.addEventListener('submit', function() {
            const btn = document.getElementById('saveSaftaSubmitBtn');
            if (btn && !btn.disabled) {
                btn.classList.add('disabled');
                btn.disabled = true;
                btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span> Saving SAFTA Certificate...';
            }
        });
    </script>
@endsection
