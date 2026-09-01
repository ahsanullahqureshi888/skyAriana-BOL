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
                            <strong>Packing List information</strong>
                            <div class="small text-secondary">Fields marked with an asterisk are required.</div>
                        </div>
                        <span class="badge text-bg-light border">A4 portrait</span>
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
                        <h2 class="form-section__title"><span class="form-section__number">1</span> Document Info</h2>
                        <div class="row g-3">
                            <div class="col-md-7">
                                <x-form.input name="packing_list_no" label="Packing List Number" :value="$packingList->packing_list_no" required />
                            </div>
                            <div class="col-md-5">
                                <x-form.input name="packing_list_date" label="Packing List Date" type="date" :value="$dateInput($packingList->packing_list_date)" required />
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
                                <a href="{{ route('saved-companies.index') }}" target="_blank" class="btn btn-sm btn-link text-primary text-decoration-none p-0 fw-bold" style="font-size:0.8rem;">⚙️ Manage Saved Parties Library</a>
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
                                    <input type="text" name="seller_name" id="seller_name" class="form-control" value="{{ old('seller_name', $packingList->seller_name) }}" required placeholder="Type name or click for recommendations..." autocomplete="off">
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
                                    <input type="text" name="buyer_name" id="buyer_name" class="form-control" value="{{ old('buyer_name', $packingList->buyer_name) }}" required placeholder="Type name or click for recommendations..." autocomplete="off">
                                </div>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label text-slate-700 small fw-bold mb-1">Seller Address *</label>
                                <textarea name="seller_address" id="seller_address" class="form-control" rows="4" required placeholder="Full seller address...">{{ old('seller_address', $packingList->seller_address) }}</textarea>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label text-slate-700 small fw-bold mb-1">Buyer Address *</label>
                                <textarea name="buyer_address" id="buyer_address" class="form-control" rows="4" required placeholder="Full buyer address...">{{ old('buyer_address', $packingList->buyer_address) }}</textarea>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label text-slate-700 small fw-bold mb-1">Buyer GST</label>
                                <input type="text" name="buyer_gst" id="buyer_gst" class="form-control" value="{{ old('buyer_gst', $packingList->buyer_gst) }}" placeholder="GST...">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label text-slate-700 small fw-bold mb-1">Buyer FSSAI NO</label>
                                <input type="text" name="buyer_fssai" id="buyer_fssai" class="form-control" value="{{ old('buyer_fssai', $packingList->buyer_fssai) }}" placeholder="FSSAI...">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label text-slate-700 small fw-bold mb-1">Buyer IEC Code</label>
                                <input type="text" name="buyer_iec" id="buyer_iec" class="form-control" value="{{ old('buyer_iec', $packingList->buyer_iec) }}" placeholder="IEC...">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label text-slate-700 small fw-bold mb-1">Buyer Phone</label>
                                <input type="tel" name="buyer_phone" id="buyer_phone" class="form-control" value="{{ old('buyer_phone', $packingList->buyer_phone) }}" placeholder="+91...">
                            </div>
                        </div>
                    </section>

                    <section class="form-section">
                        <h2 class="form-section__title"><span class="form-section__number">3</span> Transit &amp; Payment</h2>
                        <div class="row g-3">
                            <div class="col-md-7">
                                <x-form.input name="airway_bill_no" label="Airway bill number" :value="$packingList->airway_bill_no" />
                            </div>
                            <div class="col-md-5">
                                <x-form.input name="airway_bill_date" label="Airway bill date" type="date" :value="$dateInput($packingList->airway_bill_date)" />
                            </div>
                            <div class="col-md-7">
                                <x-form.textarea name="payment_terms" label="Terms of payment" :value="$packingList->payment_terms" :rows="2" />
                            </div>
                            <div class="col-md-5">
                                <x-form.input name="collection_basis" label="Collection basis" :value="$packingList->collection_basis" />
                            </div>
                            <div class="col-12">
                                <x-form.textarea name="transport_route" label="Transport route / through" :value="$packingList->transport_route" :rows="2" />
                            </div>
                        </div>
                    </section>

                    <section class="form-section">
                        <div class="d-flex flex-wrap align-items-center justify-content-between mb-3 gap-2">
                            <h2 class="form-section__title mb-0"><span class="form-section__number" style="background:#7c3aed;color:#fff;">4</span> Goods &amp; Packing Details</h2>
                            <button type="button" class="btn btn-sm btn-outline-primary fw-bold d-inline-flex align-items-center gap-1.5 rounded-pill px-3 shadow-xs" id="add-packing-item-btn">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                + Add Another Item
                            </button>
                        </div>

                        <div id="packing-items-container">
                            @php
                                $existingItems = $packingList->items;
                                if (empty($existingItems)) {
                                    $existingItems = [[
                                        'commodity' => $packingList->commodity ?: 'BLACK RAISINS',
                                        'quantity_cartons' => $packingList->quantity_cartons ?: 448,
                                        'carton_dimensions' => $packingList->carton_dimensions ?: '47 x 30 x 25 cm',
                                        'volume_per_carton' => $packingList->volume_per_carton ?: '0.035 CBM',
                                        'net_weight' => $packingList->net_weight ?: 7168,
                                        'gross_weight' => $packingList->gross_weight ?: 7004,
                                    ]];
                                }
                            @endphp

                            @foreach($existingItems as $idx => $item)
                                <div class="packing-item-card card border p-3 mb-3 bg-white rounded-3 shadow-xs position-relative" data-item-index="{{ $idx }}" style="border-color:#e2e8f0 !important;">
                                    <div class="d-flex align-items-center justify-content-between mb-2 pb-2 border-bottom">
                                        <span class="badge bg-slate-100 text-slate-700 fw-bold px-2.5 py-1 rounded-pill" style="font-size:0.78rem;">Item #<span class="item-number-label">{{ $idx + 1 }}</span></span>
                                        <button type="button" class="btn btn-link text-danger text-decoration-none p-0 text-xs fw-bold remove-packing-item-btn {{ count($existingItems) > 1 ? '' : 'd-none' }}">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg> Remove Item
                                        </button>
                                    </div>
                                    <div class="row g-3">
                                        <div class="col-md-7">
                                            <label class="form-label text-slate-700 small fw-bold mb-1">Commodity / Description of Goods *</label>
                                            <input type="text" class="form-control item-commodity" value="{{ data_get($item, 'commodity') }}" required placeholder="e.g. BLACK RAISINS">
                                            <div class="d-flex flex-wrap gap-1.5 mt-1.5">
                                                <span class="text-xs text-slate-400 me-1 d-flex align-items-center">Presets:</span>
                                                @foreach(['BLACK RAISINS', 'GREEN RAISINS', 'WALNUTS IN SHELL', 'ALMONDS', 'FIGS (ANJEER)', 'PISTACHIOS'] as $preset)
                                                    <button type="button" class="btn btn-xs btn-outline-secondary py-0.5 px-2 text-xs rounded-pill" onclick="this.closest('.col-md-7').querySelector('.item-commodity').value='{{ $preset }}'; updatePackingListItems();">{{ $preset }}</button>
                                                @endforeach
                                            </div>
                                        </div>
                                        <div class="col-md-5">
                                            <label class="form-label text-slate-700 small fw-bold mb-1">Quantity Cartons (CTNS) *</label>
                                            <input type="number" class="form-control item-ctns" value="{{ data_get($item, 'quantity_cartons') }}" min="1" required placeholder="448">
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label text-slate-700 small fw-bold mb-1">Carton Dimensions</label>
                                            <input type="text" class="form-control item-dims" value="{{ data_get($item, 'carton_dimensions') }}" placeholder="47 x 30 x 25 cm">
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label text-slate-700 small fw-bold mb-1">Volume per Carton</label>
                                            <input type="text" class="form-control item-vol-per-ctn" value="{{ data_get($item, 'volume_per_carton') }}" placeholder="0.035 CBM">
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label text-slate-700 small fw-bold mb-1">Net Weight (NW KGS)</label>
                                            <input type="number" step="0.001" class="form-control item-nw" value="{{ data_get($item, 'net_weight') }}" placeholder="7168">
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label text-slate-700 small fw-bold mb-1">Gross Weight (GW KGS)</label>
                                            <input type="number" step="0.001" class="form-control item-gw" value="{{ data_get($item, 'gross_weight') }}" placeholder="7004">
                                        </div>
                                    </div>
                                </div>
                            @endforeach
                        </div>

                        <!-- Hidden fields synced with backend -->
                        <input type="hidden" name="commodity" id="main_commodity" value="{{ $packingList->commodity }}">
                        <input type="hidden" name="quantity_cartons" id="main_quantity_cartons" value="{{ $packingList->quantity_cartons }}">
                        <input type="hidden" name="carton_dimensions" id="main_carton_dimensions" value="{{ $packingList->carton_dimensions }}">
                        <input type="hidden" name="volume_per_carton" id="main_volume_per_carton" value="{{ $packingList->volume_per_carton }}">
                        <input type="hidden" name="net_weight" id="main_net_weight" value="{{ $packingList->net_weight }}">
                        <input type="hidden" name="gross_weight" id="main_gross_weight" value="{{ $packingList->gross_weight }}">

                        <div class="row g-3 mt-1 bg-slate-50 p-3 border rounded-3 align-items-center" style="border-color:#e2e8f0 !important;">
                            <div class="col-md-4">
                                <span class="text-slate-500 text-xs d-block text-uppercase fw-bold">TOTAL CARTONS</span>
                                <strong class="fs-6 text-slate-800" id="summary-total-ctns">0 CTNS</strong>
                            </div>
                            <div class="col-md-4">
                                <span class="text-slate-500 text-xs d-block text-uppercase fw-bold">TOTAL NET WEIGHT</span>
                                <strong class="fs-6 text-primary" id="summary-total-nw">0 KGS</strong>
                            </div>
                            <div class="col-md-4">
                                <span class="text-slate-500 text-xs d-block text-uppercase fw-bold">TOTAL GROSS WEIGHT</span>
                                <strong class="fs-6 text-success" id="summary-total-gw">0 KGS</strong>
                            </div>
                        </div>
                    </section>

                    <section class="form-section">
                        <h2 class="form-section__title"><span class="form-section__number">5</span> Signatory</h2>
                        <div class="row g-3">
                            <div class="col-md-12">
                                <x-form.input name="authorized_person" label="Authorized signatory name" :value="$packingList->authorized_person" />
                            </div>
                        </div>
                    </section>

                    <div class="d-flex flex-wrap justify-content-end gap-2 mt-4">
                        <a class="btn btn-outline-secondary" href="{{ $cancelUrl }}">Cancel</a>
                        <button class="btn btn-primary px-4 fw-bold shadow-sm d-inline-flex align-items-center gap-2" type="submit" id="savePackingSubmitBtn">{{ $submitLabel }}</button>
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
                        <x-acci.packing-list-document :packing-list="$packingList" :live-preview="true" />
                    </div>
                </div>
            </div>
        </aside>
    </div>
</form>

<script>
document.addEventListener('DOMContentLoaded', function() {
    const container = document.getElementById('packing-items-container');
    const addBtn = document.getElementById('add-packing-item-btn');

    function updatePackingListItems() {
        const cards = container.querySelectorAll('.packing-item-card');
        let totalCtns = 0;
        let totalNW = 0;
        let totalGW = 0;
        const items = [];

        cards.forEach((card, index) => {
            const numLabel = card.querySelector('.item-number-label');
            if (numLabel) numLabel.textContent = index + 1;

            const removeBtn = card.querySelector('.remove-packing-item-btn');
            if (removeBtn) {
                if (cards.length > 1) {
                    removeBtn.classList.remove('d-none');
                } else {
                    removeBtn.classList.add('d-none');
                }
            }

            const commodity = card.querySelector('.item-commodity')?.value.trim() || '';
            const ctns = parseFloat(card.querySelector('.item-ctns')?.value) || 0;
            const dims = card.querySelector('.item-dims')?.value.trim() || '';
            const volPerCtn = card.querySelector('.item-vol-per-ctn')?.value.trim() || '';
            const nw = parseFloat(card.querySelector('.item-nw')?.value) || 0;
            const gw = parseFloat(card.querySelector('.item-gw')?.value) || 0;

            totalCtns += ctns;
            totalNW += nw;
            totalGW += gw;

            items.push({
                commodity: commodity,
                quantity_cartons: ctns,
                carton_dimensions: dims,
                volume_per_carton: volPerCtn,
                net_weight: nw,
                gross_weight: gw
            });
        });

        const totalCtnsEl = document.getElementById('summary-total-ctns');
        const totalNWEl = document.getElementById('summary-total-nw');
        const totalGWEl = document.getElementById('summary-total-gw');

        if (totalCtnsEl) totalCtnsEl.textContent = totalCtns.toLocaleString() + ' CTNS';
        if (totalNWEl) totalNWEl.textContent = totalNW.toLocaleString(undefined, {minimumFractionDigits:0, maximumFractionDigits:3}) + ' KGS';
        if (totalGWEl) totalGWEl.textContent = totalGW.toLocaleString(undefined, {minimumFractionDigits:0, maximumFractionDigits:3}) + ' KGS';

        const mainCommodity = document.getElementById('main_commodity');
        const mainCtns = document.getElementById('main_quantity_cartons');
        const mainDims = document.getElementById('main_carton_dimensions');
        const mainVolPerCtn = document.getElementById('main_volume_per_carton');
        const mainNW = document.getElementById('main_net_weight');
        const mainGW = document.getElementById('main_gross_weight');

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
        if (mainNW) mainNW.value = totalNW;
        if (mainGW) mainGW.value = totalGW;
        if (items[0]) {
            if (mainDims) mainDims.value = items[0].carton_dimensions;
            if (mainVolPerCtn) mainVolPerCtn.value = items[0].volume_per_carton;
        }

        // Live preview sync if available
        document.querySelectorAll('[data-preview="commodity"]').forEach(node => {
            node.textContent = items.map(i => i.commodity).filter(Boolean).join(', ');
        });
        document.querySelectorAll('[data-preview="quantity_cartons"]').forEach(node => {
            node.textContent = totalCtns.toLocaleString();
        });
        document.querySelectorAll('[data-preview="net_weight"]').forEach(node => {
            node.textContent = totalNW.toLocaleString(undefined, {minimumFractionDigits:0, maximumFractionDigits:2});
        });
        document.querySelectorAll('[data-preview="gross_weight"]').forEach(node => {
            node.textContent = totalGW.toLocaleString(undefined, {minimumFractionDigits:0, maximumFractionDigits:2});
        });
    }

    window.updatePackingListItems = updatePackingListItems;

    if (addBtn && container) {
        addBtn.addEventListener('click', function() {
            const firstCard = container.querySelector('.packing-item-card');
            if (!firstCard) return;

            const clone = firstCard.cloneNode(true);
            clone.querySelectorAll('input').forEach(input => {
                if (input.classList.contains('item-commodity')) input.value = '';
                if (input.classList.contains('item-ctns')) input.value = '';
                if (input.classList.contains('item-dims')) input.value = '';
                if (input.classList.contains('item-vol-per-ctn')) input.value = '';
                if (input.classList.contains('item-nw')) input.value = '';
                if (input.classList.contains('item-gw')) input.value = '';
            });

            container.appendChild(clone);
            updatePackingListItems();
        });
    }

    if (container) {
        container.addEventListener('click', function(e) {
            const removeBtn = e.target.closest('.remove-packing-item-btn');
            if (removeBtn) {
                const card = removeBtn.closest('.packing-item-card');
                if (card && container.querySelectorAll('.packing-item-card').length > 1) {
                    card.remove();
                    updatePackingListItems();
                }
            }
        });

        container.addEventListener('input', function(e) {
            if (e.target.matches('.item-commodity, .item-ctns, .item-dims, .item-vol-per-ctn, .item-nw, .item-gw')) {
                updatePackingListItems();
            }
        });
    }

    updatePackingListItems();

    if (typeof attachPartyAutocomplete === 'function') {
        attachPartyAutocomplete({
            input: 'seller_name',
            type: 'seller',
            selectId: 'saved-seller-select',
            mappings: {
                address: 'seller_address'
            }
        });

        attachPartyAutocomplete({
            input: 'buyer_name',
            type: 'buyer',
            selectId: 'saved-buyer-select',
            mappings: {
                address: 'buyer_address',
                gst: 'buyer_gst',
                fssai: 'buyer_fssai',
                pan: 'buyer_iec',
                phone: 'buyer_phone'
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
        document.getElementById('seller_name').dispatchEvent(new Event('input', {bubbles: true}));
        document.getElementById('seller_address').dispatchEvent(new Event('input', {bubbles: true}));
    } catch(e) {}
};

window.autoFillBuyer = function(selectEl) {
    if (!selectEl.value) return;
    try {
        const data = JSON.parse(selectEl.value);
        if (data.company_name) document.getElementById('buyer_name').value = data.company_name;
        if (data.address) document.getElementById('buyer_address').value = data.address;
        if (data.gst_no) document.getElementById('buyer_gst').value = data.gst_no;
        if (data.fssai_no) document.getElementById('buyer_fssai').value = data.fssai_no;
        if (data.iec_code) document.getElementById('buyer_iec').value = data.iec_code;
        if (data.phone) document.getElementById('buyer_phone').value = data.phone;
        document.getElementById('buyer_name').dispatchEvent(new Event('input', {bubbles: true}));
        document.getElementById('buyer_address').dispatchEvent(new Event('input', {bubbles: true}));
        document.getElementById('buyer_gst')?.dispatchEvent(new Event('input', {bubbles: true}));
        document.getElementById('buyer_fssai')?.dispatchEvent(new Event('input', {bubbles: true}));
        document.getElementById('buyer_iec')?.dispatchEvent(new Event('input', {bubbles: true}));
        document.getElementById('buyer_phone')?.dispatchEvent(new Event('input', {bubbles: true}));
    } catch(e) {}
};

window.saveCurrentParty = function(type) {
    const isSeller = type === 'seller';
    const companyName = document.getElementById(isSeller ? 'seller_name' : 'buyer_name')?.value.trim();
    const address = document.getElementById(isSeller ? 'seller_address' : 'buyer_address')?.value.trim();
    const phone = !isSeller ? document.getElementById('buyer_phone')?.value.trim() : '';
    const gstNo = !isSeller ? document.getElementById('buyer_gst')?.value.trim() : '';
    const fssaiNo = !isSeller ? document.getElementById('buyer_fssai')?.value.trim() : '';
    const iecCode = !isSeller ? document.getElementById('buyer_iec')?.value.trim() : '';

    if (!companyName) {
        alert('Please enter ' + type + ' company name first.');
        return;
    }

    const payload = {
        type: type,
        company_name: companyName,
        address: address,
        phone: phone,
        gst_no: gstNo,
        fssai_no: fssaiNo,
        iec_code: iecCode
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
    const btn = document.getElementById('savePackingSubmitBtn');
    if (btn && !btn.disabled) {
        btn.classList.add('disabled');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span> Saving Packing List...';
    }
});
</script>
