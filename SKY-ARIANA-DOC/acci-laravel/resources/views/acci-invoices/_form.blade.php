@php
    $dateInput = function (mixed $value): string {
        if (! $value) return '';
        try {
            return \Illuminate\Support\Carbon::parse($value)->format('Y-m-d');
        } catch (\Throwable) {
            return (string) $value;
        }
    };
@endphp

<form action="{{ $action }}" method="POST" enctype="multipart/form-data" data-acci-form novalidate>
    @csrf
    @if($method !== 'POST')
        @method($method)
    @endif

    <div class="row g-4 align-items-start">
        <div class="col-xl-7">
            <div class="card">
                <div class="card-header px-4 py-3">
                    <div class="d-flex flex-wrap align-items-center justify-content-between gap-2">
                        <div>
                            <strong>Invoice information</strong>
                            <div class="small text-secondary">Fields marked with an asterisk are required.</div>
                        </div>
                        <span class="badge text-bg-light border">A4 portrait · USD</span>
                    </div>
                </div>
                <div class="card-body p-3 p-lg-4">
                    @if($errors->any())
                        <div class="alert alert-danger" role="alert">
                            <strong>Please correct the highlighted fields.</strong>
                            <ul class="mb-0 mt-2 small">
                                @foreach($errors->all() as $error)
                                    <li>{{ $error }}</li>
                                @endforeach
                            </ul>
                        </div>
                    @endif

                    <section class="form-section">
                        <h2 class="form-section__title"><span class="form-section__number">1</span> Document</h2>
                        <div class="row g-3">
                            <div class="col-md-4">
                                <x-form.input name="acci_no" label="ACCI number" :value="$invoice->acci_no" />
                            </div>
                            <div class="col-md-4">
                                <x-form.input name="invoice_no" label="Document number" :value="$invoice->invoice_no" required help="Letters, numbers, and hyphens." />
                            </div>
                            <div class="col-md-4">
                                <x-form.input name="invoice_date" label="Invoice date" type="date" :value="$dateInput($invoice->invoice_date)" required />
                            </div>
                        </div>
                    </section>

                    <section class="form-section">
                        @php
                            $savedSellers = \App\Models\SavedCompany::whereIn('type', ['seller', 'both'])->orderBy('company_name')->get();
                            $savedBuyers = \App\Models\SavedCompany::whereIn('type', ['buyer', 'both'])->orderBy('company_name')->get();
                        @endphp
                        
                        <x-party-autocomplete :sellers="$savedSellers" :buyers="$savedBuyers" />

                        <div class="d-flex flex-wrap align-items-center justify-content-between mb-3 gap-2">
                            <div class="d-flex align-items-center gap-2">
                                <h2 class="form-section__title mb-0"><span class="form-section__number">2</span> Seller &amp; Buyer</h2>
                                <span class="badge bg-indigo-100 text-indigo-700 rounded-pill px-2.5 py-0.5" style="font-size:0.72rem;font-weight:700;">{{ $savedSellers->count() }} Sellers / {{ $savedBuyers->count() }} Buyers</span>
                            </div>
                            <div class="d-flex align-items-center gap-2">
                                <button type="button" class="party-recommend-trigger party-recommend-trigger--seller" onclick="openRecommendations_seller_name()">💡 Recommend Sellers</button>
                                <button type="button" class="party-recommend-trigger party-recommend-trigger--buyer" onclick="openRecommendations_buyer_name()">💡 Recommend Buyers</button>
                                <a href="{{ route('saved-companies.index') }}" target="_blank" class="btn btn-sm btn-link text-primary text-decoration-none p-0 fw-bold" style="font-size:0.8rem;">⚙️ Manage Saved Parties</a>
                            </div>
                        </div>

                        <div class="row g-3 mb-3 bg-slate-50 p-3 rounded-3 border" style="border-color:#e2e8f0 !important;">
                            <div class="col-md-6">
                                <label class="form-label text-slate-700 small fw-bold mb-1">⚡ Quick Select Saved Seller ({{ $savedSellers->count() }} profiles)</label>
                                <select class="form-select form-select-sm" id="saved-seller-select" onchange="autoFillSeller(this)">
                                    <option value="">-- Choose Saved Seller Profile --</option>
                                    @foreach($savedSellers as $sSeller)
                                        <option value="{{ json_encode($sSeller) }}">{{ $sSeller->company_name }} @if($sSeller->iec_code)(Lic: {{ $sSeller->iec_code }})@endif</option>
                                    @endforeach
                                </select>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label text-slate-700 small fw-bold mb-1">⚡ Quick Select Saved Buyer ({{ $savedBuyers->count() }} profiles)</label>
                                <select class="form-select form-select-sm" id="saved-buyer-select" onchange="autoFillBuyer(this)">
                                    <option value="">-- Choose Saved Buyer Profile --</option>
                                    @foreach($savedBuyers as $sBuyer)
                                        <option value="{{ json_encode($sBuyer) }}">{{ $sBuyer->company_name }} @if($sBuyer->gst_no)(GST: {{ $sBuyer->gst_no }})@endif</option>
                                    @endforeach
                                </select>
                            </div>
                        </div>

                        <div class="row g-3">
                            <div class="col-md-6">
                                <div class="d-flex align-items-center justify-content-between mb-1">
                                    <label class="form-label text-slate-700 small fw-bold mb-0">Seller Company *</label>
                                    <div class="d-flex align-items-center gap-1.5">
                                        <button type="button" class="party-recommend-trigger party-recommend-trigger--seller py-0 px-2" onclick="openRecommendations_seller_name()">💡 Recommendations</button>
                                        <button type="button" class="btn btn-xs btn-outline-primary py-0 px-2 rounded-pill fw-bold" onclick="saveCurrentParty('seller')" style="font-size:0.72rem;">💾 Save Seller</button>
                                    </div>
                                </div>
                                <div class="party-autocomplete-wrapper">
                                    <input type="text" name="seller_name" id="seller_name" class="form-control" value="{{ old('seller_name', $invoice->seller_name) }}" required placeholder="Type name or click for recommendations..." autocomplete="off">
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="d-flex align-items-center justify-content-between mb-1">
                                    <label class="form-label text-slate-700 small fw-bold mb-0">Buyer Company *</label>
                                    <div class="d-flex align-items-center gap-1.5">
                                        <button type="button" class="party-recommend-trigger party-recommend-trigger--buyer py-0 px-2" onclick="openRecommendations_buyer_name()">💡 Recommendations</button>
                                        <button type="button" class="btn btn-xs btn-outline-primary py-0 px-2 rounded-pill fw-bold" onclick="saveCurrentParty('buyer')" style="font-size:0.72rem;">💾 Save Buyer</button>
                                    </div>
                                </div>
                                <div class="party-autocomplete-wrapper">
                                    <input type="text" name="buyer_name" id="buyer_name" class="form-control" value="{{ old('buyer_name', $invoice->buyer_name) }}" required placeholder="Type name or click for recommendations..." autocomplete="off">
                                </div>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label text-slate-700 small fw-bold mb-1">Seller Address *</label>
                                <textarea name="seller_address" id="seller_address" class="form-control" rows="4" required placeholder="Full seller address...">{{ old('seller_address', $invoice->seller_address) }}</textarea>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label text-slate-700 small fw-bold mb-1">Buyer Address *</label>
                                <textarea name="buyer_address" id="buyer_address" class="form-control" rows="4" required placeholder="Full buyer address...">{{ old('buyer_address', $invoice->buyer_address) }}</textarea>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label text-slate-700 small fw-bold mb-1">Seller Phone</label>
                                <input type="tel" name="seller_phone" id="seller_phone" class="form-control" value="{{ old('seller_phone', $invoice->seller_phone) }}" placeholder="+937...">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label text-slate-700 small fw-bold mb-1">Seller Email</label>
                                <input type="email" name="seller_email" id="seller_email" class="form-control" value="{{ old('seller_email', $invoice->seller_email) }}" placeholder="info@...">
                            </div>
                        </div>
                    </section>

                    <section class="form-section">
                        <h2 class="form-section__title"><span class="form-section__number">3</span> Transit &amp; payment</h2>
                        <div class="row g-3">
                            <div class="col-md-7">
                                <x-form.input name="airway_bill_no" label="Airway bill number" :value="$invoice->airway_bill_no" />
                            </div>
                            <div class="col-md-5">
                                <x-form.input name="airway_bill_date" label="Airway bill date" type="date" :value="$dateInput($invoice->airway_bill_date)" />
                            </div>
                            <div class="col-md-7">
                                <x-form.textarea name="payment_terms" label="Terms of payment" :value="$invoice->payment_terms" :rows="2" />
                            </div>
                            <div class="col-md-5">
                                <x-form.input name="advance_payment" label="Advance payment" :value="$invoice->advance_payment" />
                            </div>
                            <div class="col-md-6">
                                <x-form.input name="lc_number" label="Letter of credit number" :value="$invoice->lc_number" />
                            </div>
                            <div class="col-md-6">
                                <x-form.input name="collection_basis" label="Collection basis" :value="$invoice->collection_basis" />
                            </div>
                            <div class="col-12">
                                <x-form.textarea name="transport_route" label="Transport route / through" :value="$invoice->transport_route" :rows="3" />
                            </div>
                        </div>
                    </section>

                    <section class="form-section">
                        <div class="d-flex flex-wrap align-items-center justify-content-between mb-3 gap-2">
                            <h2 class="form-section__title mb-0"><span class="form-section__number" style="background:#7c3aed;color:#fff;">4</span> Goods &amp; Pricing</h2>
                            <button type="button" class="btn btn-sm btn-outline-primary fw-bold d-inline-flex align-items-center gap-1.5 rounded-pill px-3 shadow-xs" id="add-invoice-item-btn">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                + Add Another Item
                            </button>
                        </div>

                        <div id="invoice-items-container">
                            @php
                                $existingItems = $invoice->items;
                                if (empty($existingItems)) {
                                    $existingItems = [[
                                        'commodity' => $invoice->commodity ?: 'BLACK RAISINS',
                                        'quantity_cartons' => $invoice->quantity_cartons ?: 448,
                                        'quantity_weight' => $invoice->quantity_weight ?: 7168,
                                        'unit_price' => $invoice->unit_price ?: 2.50,
                                        'total_price' => $invoice->total_price ?: 17920.00,
                                    ]];
                                }
                            @endphp

                            @foreach($existingItems as $idx => $item)
                                <div class="invoice-item-card card border p-3 mb-3 bg-white rounded-3 shadow-xs position-relative" data-item-index="{{ $idx }}" style="border-color:#cbd5e1 !important;">
                                    <div class="d-flex align-items-center justify-content-between mb-2 pb-2 border-bottom">
                                        <span class="badge bg-purple-100 text-purple-700 fw-bold px-2.5 py-1 rounded-pill" style="font-size:0.8rem;background:#f3e8ff;color:#6b21a8;">Item #<span class="item-number-label">{{ $idx + 1 }}</span></span>
                                        <button type="button" class="btn btn-link text-danger text-decoration-none p-0 text-xs fw-bold remove-invoice-item-btn {{ count($existingItems) > 1 ? '' : 'd-none' }}">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg> Remove Item
                                        </button>
                                    </div>
                                    <!-- Vertical Stacked Item Layout ("Items on top of each other") -->
                                    <div class="d-flex flex-column gap-3">
                                        <div>
                                            <label class="form-label text-slate-700 small fw-bold mb-1">Commodity / Description of Goods *</label>
                                            <input type="text" class="form-control item-commodity" value="{{ data_get($item, 'commodity') }}" required placeholder="e.g. BLACK RAISINS">
                                            <div class="d-flex flex-wrap gap-1.5 mt-1.5">
                                                <span class="text-xs text-slate-400 me-1 d-flex align-items-center">Presets:</span>
                                                @foreach(['BLACK RAISINS', 'GREEN RAISINS', 'WALNUTS IN SHELL', 'ALMONDS', 'FIGS (ANJEER)', 'PISTACHIOS'] as $preset)
                                                    <button type="button" class="btn btn-xs btn-outline-secondary py-0.5 px-2 text-xs rounded-pill" onclick="this.closest('div').previousElementSibling.value='{{ $preset }}'; updateInvoiceItems();">{{ $preset }}</button>
                                                @endforeach
                                            </div>
                                        </div>
                                        <div>
                                            <label class="form-label text-slate-700 small fw-bold mb-1">Quantity (cartons) *</label>
                                            <input type="number" class="form-control item-ctns" value="{{ data_get($item, 'quantity_cartons') }}" min="1" step="1" required placeholder="448">
                                        </div>
                                        <div>
                                            <label class="form-label text-slate-700 small fw-bold mb-1">Weight (KGS) *</label>
                                            <input type="number" step="0.001" class="form-control item-weight" value="{{ data_get($item, 'quantity_weight') }}" min="0.001" required placeholder="7168">
                                        </div>
                                        <div>
                                            <label class="form-label text-slate-700 small fw-bold mb-1">Unit Price (USD) *</label>
                                            <input type="number" step="0.0001" class="form-control item-unit-price" value="{{ data_get($item, 'unit_price') }}" min="0.0001" required placeholder="2.50">
                                        </div>
                                        <div>
                                            <div class="d-flex align-items-center justify-content-between bg-purple-50 px-3 py-2 rounded-2 border" style="background:#faf5ff;border-color:#e9d5ff !important;">
                                                <span class="text-xs text-purple-700 fw-bold text-uppercase" style="color:#6b21a8;">Item Total Price (USD):</span>
                                                <strong class="text-purple-900 fs-6" style="color:#4c1d95;">$<span class="item-total-display">{{ number_format((float) data_get($item, 'total_price', 0), 2) }}</span></strong>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            @endforeach
                        </div>

                        <!-- Hidden fields synced with backend -->
                        <input type="hidden" name="commodity" id="main_commodity" value="{{ $invoice->commodity }}">
                        <input type="hidden" name="quantity_cartons" id="main_quantity_cartons" value="{{ $invoice->quantity_cartons }}">
                        <input type="hidden" name="quantity_weight" id="main_quantity_weight" value="{{ $invoice->quantity_weight }}">
                        <input type="hidden" name="unit_price" id="main_unit_price" value="{{ $invoice->unit_price }}">
                        <input type="hidden" name="total_price" id="main_total_price" value="{{ $invoice->total_price }}">
                        <input type="hidden" name="amount_in_words" id="main_amount_in_words" value="{{ $invoice->amount_in_words }}">

                        <div class="row g-3 mt-1 bg-slate-50 p-3 border rounded-3 align-items-center" style="border-color:#e2e8f0 !important;">
                            <div class="col-md-3">
                                <span class="text-slate-500 text-xs d-block text-uppercase fw-bold">TOTAL CARTONS</span>
                                <strong class="fs-6 text-slate-800" id="summary-total-ctns">0 CTNS</strong>
                            </div>
                            <div class="col-md-3">
                                <span class="text-slate-500 text-xs d-block text-uppercase fw-bold">TOTAL WEIGHT</span>
                                <strong class="fs-6 text-primary" id="summary-total-weight">0 KGS</strong>
                            </div>
                            <div class="col-md-6">
                                <span class="text-slate-500 text-xs d-block text-uppercase fw-bold">GRAND TOTAL PRICE (USD)</span>
                                <strong class="fs-5 text-success" id="summary-grand-total">$0.00</strong>
                            </div>
                            <div class="col-12 mt-2 pt-2 border-top">
                                <div class="calculation-note w-100 bg-white p-2.5 rounded-2 border">
                                    <strong class="d-block text-xs text-uppercase text-slate-500 mb-1">Automatic amount in words</strong>
                                    <span class="fw-bold text-slate-800" data-preview="amount_in_words" id="words-display">{{ $invoice->amount_in_words ?: 'Enter weight and unit price to calculate.' }}</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section class="form-section">
                        <h2 class="form-section__title"><span class="form-section__number">5</span> Receipt &amp; authorization</h2>
                        <div class="row g-3">
                            <div class="col-md-6">
                                <x-form.input name="country_of_origin" label="Country of origin" :value="$invoice->country_of_origin" required />
                            </div>
                            <div class="col-md-6">
                                <x-form.input name="authorized_person" label="Authorized person / company" :value="$invoice->authorized_person" />
                            </div>
                            <div class="col-sm-6 col-lg-3">
                                <x-form.input name="reg_no" label="Registration number" :value="$invoice->reg_no" />
                            </div>
                            <div class="col-sm-6 col-lg-3">
                                <x-form.input name="fee_no" label="Fee number" :value="$invoice->fee_no" />
                            </div>
                            <div class="col-sm-6 col-lg-3">
                                <x-form.input name="received_amount" label="Received amount" type="number" :value="$invoice->received_amount" min="0" step="0.01" />
                            </div>
                            <div class="col-sm-6 col-lg-3">
                                <x-form.input name="received_date" label="Received date" type="text" placeholder="e.g. 1403/05/10" :value="$dateInput($invoice->received_date)" />
                            </div>
                        </div>
                    </section>

                    <section class="form-section">
                        <h2 class="form-section__title"><span class="form-section__number">6</span> Stamp &amp; signature</h2>
                        <p class="small text-secondary mb-3">Transparent PNG files produce the closest match. The stamp is layered above the signature in print and PDF.</p>
                        <div class="row g-3">
                            <div class="col-md-6">
                                <label for="stamp_image" class="form-label">Company stamp</label>
                                <input class="form-control @error('stamp_image') is-invalid @enderror" id="stamp_image" name="stamp_image" type="file" accept="image/png,image/jpeg,image/webp">
                                @error('stamp_image')<div class="invalid-feedback">{{ $message }}</div>@enderror
                                @if($invoice->stamp_image)<div class="form-text">A stamp is already stored. Uploading another replaces it after a successful update.</div>@endif
                            </div>
                            <div class="col-md-6">
                                <label for="signature_image" class="form-label">Signature</label>
                                <input class="form-control @error('signature_image') is-invalid @enderror" id="signature_image" name="signature_image" type="file" accept="image/png,image/jpeg,image/webp">
                                @error('signature_image')<div class="invalid-feedback">{{ $message }}</div>@enderror
                                @if($invoice->signature_image)<div class="form-text">A signature is already stored. Uploading another replaces it after a successful update.</div>@endif
                            </div>
                        </div>
                    </section>

                    <div class="d-flex flex-wrap justify-content-end gap-2 mt-4">
                        <a class="btn btn-outline-secondary" href="{{ $cancelUrl }}">Cancel</a>
                        <button class="btn btn-primary px-4 fw-bold shadow-sm d-inline-flex align-items-center gap-2" type="submit" id="saveInvoiceSubmitBtn">{{ $submitLabel }}</button>
                    </div>
                </div>
            </div>
        </div>

        <aside class="col-xl-5">
            <div class="card preview-card">
                <div class="preview-card__bar">
                    <div>
                        <strong>Live A4 preview</strong>
                        <span>10 mm print margins · single-page layout</span>
                    </div>
                    <span class="badge rounded-pill text-bg-light border">Portrait</span>
                </div>
                <div class="acci-preview-viewport" data-preview-viewport>
                    <div class="acci-preview-sheet" data-preview-sheet>
                        <x-acci.document :invoice="$invoice" :live-preview="true" />
                    </div>
                </div>
            </div>
        </aside>
    </div>
</form>

<script>
document.addEventListener('DOMContentLoaded', function() {
    const container = document.getElementById('invoice-items-container');
    const addBtn = document.getElementById('add-invoice-item-btn');

    const ones = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
    const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

    function integerToWords(number) {
        number = Math.floor(Math.abs(Number(number) || 0));
        if (number < 20) return ones[number];
        if (number < 100) return tens[Math.floor(number / 10)] + (number % 10 ? '-' + ones[number % 10] : '');
        if (number < 1000) return ones[Math.floor(number / 100)] + ' hundred' + (number % 100 ? ' ' + integerToWords(number % 100) : '');
        
        const scales = [[1000000000000, 'trillion'], [1000000000, 'billion'], [1000000, 'million'], [1000, 'thousand']];
        for (const [scale, label] of scales) {
            if (number >= scale) {
                const leading = Math.floor(number / scale);
                const remainder = number % scale;
                return integerToWords(leading) + ' ' + label + (remainder ? ' ' + integerToWords(remainder) : '');
            }
        }
        return 'zero';
    }

    function amountToWords(amount) {
        const val = Math.round((Number(amount) || 0) * 100) / 100;
        const whole = Math.floor(val);
        const cents = Math.round((val - whole) * 100);
        let words = integerToWords(whole) + ' US ' + (whole === 1 ? 'dollar' : 'dollars');
        if (cents > 0) {
            words += ' and ' + integerToWords(cents) + ' ' + (cents === 1 ? 'cent' : 'cents');
        }
        words += ' only';
        return words.replace(/\b\w/g, letter => letter.toUpperCase());
    }

    function updateInvoiceItems() {
        const cards = container.querySelectorAll('.invoice-item-card');
        let totalCtns = 0;
        let totalWeight = 0;
        let grandTotal = 0;
        const items = [];

        cards.forEach((card, index) => {
            const numLabel = card.querySelector('.item-number-label');
            if (numLabel) numLabel.textContent = index + 1;

            const removeBtn = card.querySelector('.remove-invoice-item-btn');
            if (removeBtn) {
                if (cards.length > 1) {
                    removeBtn.classList.remove('d-none');
                } else {
                    removeBtn.classList.add('d-none');
                }
            }

            const commodity = card.querySelector('.item-commodity')?.value.trim() || '';
            const ctns = parseInt(card.querySelector('.item-ctns')?.value, 10) || 0;
            const weight = parseFloat(card.querySelector('.item-weight')?.value) || 0;
            const unitPrice = parseFloat(card.querySelector('.item-unit-price')?.value) || 0;
            const itemTotal = round(weight * unitPrice, 2);

            const itemTotalDisplay = card.querySelector('.item-total-display');
            if (itemTotalDisplay) itemTotalDisplay.textContent = itemTotal.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});

            totalCtns += ctns;
            totalWeight += weight;
            grandTotal += itemTotal;

            items.push({
                commodity: commodity,
                quantity_cartons: ctns,
                quantity_weight: weight,
                unit_price: unitPrice,
                total_price: itemTotal
            });
        });

        function round(val, decimals) {
            return Number(Math.round(val + 'e' + decimals) + 'e-' + decimals);
        }

        const totalCtnsEl = document.getElementById('summary-total-ctns');
        const totalWeightEl = document.getElementById('summary-total-weight');
        const grandTotalEl = document.getElementById('summary-grand-total');
        const wordsDisplayEl = document.getElementById('words-display');

        if (totalCtnsEl) totalCtnsEl.textContent = totalCtns.toLocaleString() + ' CTNS';
        if (totalWeightEl) totalWeightEl.textContent = totalWeight.toLocaleString(undefined, {minimumFractionDigits:0, maximumFractionDigits:3}) + ' KGS';
        if (grandTotalEl) grandTotalEl.textContent = '$' + grandTotal.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});

        const words = grandTotal > 0 ? amountToWords(grandTotal) : 'Enter weight and unit price to calculate.';
        if (wordsDisplayEl) wordsDisplayEl.textContent = words;

        const mainCommodity = document.getElementById('main_commodity');
        const mainCtns = document.getElementById('main_quantity_cartons');
        const mainWeight = document.getElementById('main_quantity_weight');
        const mainUnitPrice = document.getElementById('main_unit_price');
        const mainTotalPrice = document.getElementById('main_total_price');
        const mainWords = document.getElementById('main_amount_in_words');

        if (mainCommodity) {
            if (items.length > 1) {
                mainCommodity.value = JSON.stringify(items);
            } else if (items.length === 1) {
                mainCommodity.value = items[0].commodity;
            } else {
                mainCommodity.value = '';
            }
        }

        if (mainCtns) mainCtns.value = totalCtns;
        if (mainWeight) mainWeight.value = totalWeight;
        if (mainUnitPrice && items[0]) mainUnitPrice.value = items[0].unit_price;
        if (mainTotalPrice) mainTotalPrice.value = grandTotal.toFixed(2);
        if (mainWords) mainWords.value = words;

        // Live A4 Preview sheet sync
        document.querySelectorAll('[data-preview="commodity"]').forEach(node => {
            node.textContent = items.map(i => i.commodity).filter(Boolean).join(', ');
        });
        document.querySelectorAll('[data-preview="quantity_cartons"]').forEach(node => {
            node.textContent = totalCtns.toLocaleString();
        });
        document.querySelectorAll('[data-preview="quantity_weight"]').forEach(node => {
            node.textContent = totalWeight.toLocaleString(undefined, {minimumFractionDigits:0, maximumFractionDigits:2});
        });
        document.querySelectorAll('[data-preview="total_price"]').forEach(node => {
            node.textContent = grandTotal.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});
        });
        document.querySelectorAll('[data-preview="amount_in_words"]').forEach(node => {
            node.textContent = words;
        });
    }

    window.updateInvoiceItems = updateInvoiceItems;

    if (addBtn && container) {
        addBtn.addEventListener('click', function() {
            const firstCard = container.querySelector('.invoice-item-card');
            if (!firstCard) return;

            const clone = firstCard.cloneNode(true);
            clone.querySelectorAll('input').forEach(input => {
                if (input.classList.contains('item-commodity')) input.value = '';
                if (input.classList.contains('item-ctns')) input.value = '';
                if (input.classList.contains('item-weight')) input.value = '';
                if (input.classList.contains('item-unit-price')) input.value = '';
            });

            container.appendChild(clone);
            updateInvoiceItems();
        });
    }

    if (container) {
        container.addEventListener('click', function(e) {
            const removeBtn = e.target.closest('.remove-invoice-item-btn');
            if (removeBtn) {
                const card = removeBtn.closest('.invoice-item-card');
                if (card && container.querySelectorAll('.invoice-item-card').length > 1) {
                    card.remove();
                    updateInvoiceItems();
                }
            }
        });

        container.addEventListener('input', function(e) {
            if (e.target.matches('.item-commodity, .item-ctns, .item-weight, .item-unit-price')) {
                updateInvoiceItems();
            }
        });
    }

    updateInvoiceItems();

    if (typeof attachPartyAutocomplete === 'function') {
        attachPartyAutocomplete({
            input: 'seller_name',
            type: 'seller',
            selectId: 'saved-seller-select',
            mappings: {
                phone: 'seller_phone',
                address: 'seller_address',
                email: 'seller_email'
            }
        });

        attachPartyAutocomplete({
            input: 'buyer_name',
            type: 'buyer',
            selectId: 'saved-buyer-select',
            mappings: {
                address: 'buyer_address'
            }
        });
    }
});

window.autoFillSeller = function(selectEl) {
    if (!selectEl.value) return;
    try {
        const data = JSON.parse(selectEl.value);
        if (data.company_name) document.getElementById('seller_name').value = data.company_name;
        if (data.address) document.getElementById('seller_address').value = data.address;
        if (data.phone) document.getElementById('seller_phone').value = data.phone;
        if (data.email) document.getElementById('seller_email').value = data.email;
        document.getElementById('seller_name').dispatchEvent(new Event('input', {bubbles: true}));
        document.getElementById('seller_address').dispatchEvent(new Event('input', {bubbles: true}));
        document.getElementById('seller_phone').dispatchEvent(new Event('input', {bubbles: true}));
        document.getElementById('seller_email').dispatchEvent(new Event('input', {bubbles: true}));
    } catch(e) {}
};

window.autoFillBuyer = function(selectEl) {
    if (!selectEl.value) return;
    try {
        const data = JSON.parse(selectEl.value);
        if (data.company_name) document.getElementById('buyer_name').value = data.company_name;
        if (data.address) document.getElementById('buyer_address').value = data.address;
        document.getElementById('buyer_name').dispatchEvent(new Event('input', {bubbles: true}));
        document.getElementById('buyer_address').dispatchEvent(new Event('input', {bubbles: true}));
    } catch(e) {}
};

window.saveCurrentParty = function(type) {
    const isSeller = type === 'seller';
    const companyName = document.getElementById(isSeller ? 'seller_name' : 'buyer_name')?.value.trim();
    const address = document.getElementById(isSeller ? 'seller_address' : 'buyer_address')?.value.trim();
    const phone = isSeller ? document.getElementById('seller_phone')?.value.trim() : '';
    const email = isSeller ? document.getElementById('seller_email')?.value.trim() : '';

    if (!companyName) {
        alert('Please enter ' + type + ' company name first.');
        return;
    }

    const payload = {
        type: type,
        company_name: companyName,
        address: address,
        phone: phone,
        email: email
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
            const selectId = isSeller ? 'saved-seller-select' : 'saved-buyer-select';
            const selectEl = document.getElementById(selectId);
            if (selectEl) {
                const opt = document.createElement('option');
                opt.value = JSON.stringify(data.company);
                opt.textContent = data.company.company_name;
                opt.selected = true;
                selectEl.appendChild(opt);
            }
            if (isSeller && window.SAVED_SELLERS_DATA) {
                window.SAVED_SELLERS_DATA.push(data.company);
            } else if (!isSeller && window.SAVED_BUYERS_DATA) {
                window.SAVED_BUYERS_DATA.push(data.company);
            }
        } else {
            alert('Error saving company');
        }
    })
    .catch(() => alert('Error saving company'));
};

document.querySelector('form[data-acci-form]')?.addEventListener('submit', function() {
    const btn = document.getElementById('saveInvoiceSubmitBtn');
    if (btn && !btn.disabled) {
        btn.classList.add('disabled');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span> Saving Invoice...';
    }
});
</script>
