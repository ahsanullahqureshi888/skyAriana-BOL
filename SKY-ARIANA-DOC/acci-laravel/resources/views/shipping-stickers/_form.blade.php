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

<form action="{{ $action }}" method="POST" data-acci-form novalidate>
    @csrf
    @if($method !== 'POST')
        @method($method)
    @endif

    <div class="row g-4 align-items-start">
        <div class="col-xl-7">
            <div class="card border-0 shadow-sm" style="border-radius: 1.25rem;">
                <div class="card-header bg-white px-4 py-4" style="border-bottom: 1px solid #f1f5f9; border-top-left-radius: 1.25rem; border-top-right-radius: 1.25rem;">
                    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3">
                        <div>
                            <strong class="fs-5 text-slate-800">Shipping Sticker Details</strong>
                            <div class="text-slate-500 mt-1" style="font-size: 0.85rem;">Blank canvas ready for input. Fields marked with an asterisk are required.</div>
                        </div>
                        <div class="d-flex align-items-center gap-2">
                            <button type="button" class="btn btn-xs btn-outline-danger px-2.5 py-1.5 rounded-pill fw-bold d-inline-flex align-items-center gap-1" onclick="clearAllStickerFields()" title="Clear all input fields">
                                <span>🧹 Clear Form</span>
                            </button>
                            <button type="button" class="btn btn-xs btn-outline-primary px-2.5 py-1.5 rounded-pill fw-bold d-inline-flex align-items-center gap-1" onclick="fillSampleStickerData()" title="Fill sample demo data">
                                <span>⚡ Load Sample</span>
                            </button>
                            <span class="badge bg-slate-50 text-slate-600 border px-3 py-2 rounded-pill shadow-sm d-inline-flex align-items-center gap-1.5" style="border-color:#e2e8f0;">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg> Sticker label
                            </span>
                        </div>
                    </div>
                </div>
                <div class="card-body p-3 p-lg-4">
                    @if($errors->any())
                        <div class="alert alert-danger mb-4 shadow-sm rounded-3 border-0" style="background:#fef2f2;border:1px solid #fecaca;color:#991b1b;">
                            <strong class="d-block mb-1">⚠️ Please correct the following issues:</strong>
                            <ul class="mb-0 ps-3 small">
                                @foreach($errors->all() as $err)
                                    <li>{{ $err }}</li>
                                @endforeach
                            </ul>
                        </div>
                    @endif

                    @if(isset($invoices) && $invoices->count() > 0)
                        <div class="mb-4 p-3 rounded-3" style="background:#eff6ff;border:1px solid #bfdbfe;">
                            <label class="form-label font-bold text-xs uppercase text-primary d-flex align-items-center gap-1.5 mb-1.5">
                                ⚡ 1-Click Auto-Fill from Existing ACCI Invoice
                            </label>
                            <select id="invoice-autofill-select-sticker" class="form-select text-sm font-semibold" style="border-radius:0.6rem" onchange="autoFillStickerFromInvoice(this)">
                                <option value="">-- Select ACCI Invoice to Auto-Populate Sticker Details --</option>
                                @foreach($invoices as $inv)
                                    <option value="{{ $inv->id }}"
                                        data-exporter-name="{{ $inv->seller_name }}"
                                        data-exporter-address="{{ $inv->seller_address }}"
                                        data-exporter-phone="{{ $inv->seller_phone }}"
                                        data-importer-name="{{ $inv->buyer_name }}"
                                        data-importer-address="{{ $inv->buyer_address }}"
                                        data-importer-gst="{{ $inv->buyer_gst }}"
                                        data-importer-fssai="{{ $inv->buyer_fssai }}"
                                        data-importer-phone="{{ $inv->buyer_phone }}"
                                        data-importer-email="{{ $inv->buyer_email }}"
                                        data-commodity-name="{{ $inv->commodity }}"
                                        data-net-wt="{{ $inv->quantity_weight }} Kg"
                                    >
                                        {{ $inv->invoice_no }} - {{ $inv->buyer_name }} ({{ $inv->commodity }})
                                    </option>
                                @endforeach
                            </select>
                        </div>
                    @endif

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
                        <h2 class="form-section__title"><span class="form-section__number bg-primary text-white">1</span> Sticker Info</h2>
                        <div class="row g-3">
                            <div class="col-md-7">
                                <x-form.input name="sticker_no" label="Sticker Number" :value="$sticker->sticker_no" required />
                            </div>
                            <div class="col-md-5">
                                <x-form.input name="sticker_date" label="Sticker Date" type="date" :value="$dateInput($sticker->sticker_date)" required />
                                <div class="form-text text-muted small mt-1">Output format on label: <strong class="text-slate-700">MM/DD/YYYY</strong></div>
                            </div>
                        </div>
                    </section>

                    @php
                        $savedSellers = \App\Models\SavedCompany::whereIn('type', ['seller', 'both'])->orderBy('company_name')->get();
                        $savedBuyers = \App\Models\SavedCompany::whereIn('type', ['buyer', 'both'])->orderBy('company_name')->get();
                    @endphp

                    <x-party-autocomplete :sellers="$savedSellers" :buyers="$savedBuyers" />

                    <section class="form-section mt-4">
                        <div class="d-flex flex-wrap align-items-center justify-content-between mb-3 gap-2">
                            <div class="d-flex align-items-center gap-2">
                                <h2 class="form-section__title mb-0"><span class="form-section__number" style="background:#4f46e5;color:#fff;">2</span> Exporter (Shipper) Details</h2>
                                <span class="badge bg-indigo-100 text-indigo-700 rounded-pill px-2.5 py-1" style="font-size:0.72rem;font-weight:700;">{{ $savedSellers->count() }} Shippers Available</span>
                            </div>
                            <div class="d-flex align-items-center gap-2">
                                <button type="button" class="party-recommend-trigger party-recommend-trigger--seller" onclick="openRecommendations_exporter_name()">
                                    💡 Recommend Shippers
                                </button>
                                <a href="{{ route('saved-companies.index') }}" target="_blank" class="btn btn-sm btn-link text-primary text-decoration-none p-0 fw-bold" style="font-size:0.8rem;">⚙️ Manage Saved Parties</a>
                            </div>
                        </div>

                        <div class="mb-3 bg-indigo-50/50 p-3 rounded-3 border" style="border-color:#e0e7ff !important;">
                            <div class="d-flex align-items-center justify-content-between mb-1">
                                <label class="form-label text-indigo-900 small fw-bold mb-0">⚡ Quick Select Saved Exporter (Shipper)</label>
                                <span class="text-xs text-indigo-700">Type in Exporter Name for live search</span>
                            </div>
                            <select class="form-select form-select-sm" id="saved-exporter-select" onchange="autoFillExporter(this)">
                                <option value="">-- Choose Saved Exporter Profile ({{ $savedSellers->count() }} profiles) --</option>
                                @foreach($savedSellers as $sSeller)
                                    <option value="{{ json_encode($sSeller) }}">{{ $sSeller->company_name }} @if($sSeller->iec_code)(Lic: {{ $sSeller->iec_code }})@endif</option>
                                @endforeach
                            </select>
                        </div>

                        <div class="row g-3">
                            <div class="col-md-6">
                                <div class="d-flex align-items-center justify-content-between mb-1">
                                    <label class="form-label text-slate-700 small fw-bold mb-0">Exporter Name *</label>
                                    <div class="d-flex align-items-center gap-1.5">
                                        <button type="button" class="party-recommend-trigger party-recommend-trigger--seller py-0 px-2" onclick="openRecommendations_exporter_name()">💡 All Shippers</button>
                                        <button type="button" class="btn btn-xs btn-outline-primary py-0 px-2 rounded-pill fw-bold" onclick="saveStickerParty('exporter')" style="font-size:0.72rem;">💾 Save Exporter</button>
                                    </div>
                                </div>
                                <div class="party-autocomplete-wrapper">
                                    <input type="text" name="exporter_name" id="exporter_name" class="form-control" value="{{ old('exporter_name', $sticker->exporter_name) }}" required placeholder="Type name or click for recommendations..." autocomplete="off">
                                </div>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label text-slate-700 small fw-bold mb-1">Licence No</label>
                                <input type="text" name="exporter_licence_no" id="exporter_licence_no" class="form-control" value="{{ old('exporter_licence_no', $sticker->exporter_licence_no) }}" placeholder="27-1173">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label text-slate-700 small fw-bold mb-1">Exporter Phone</label>
                                <input type="tel" name="exporter_phone" id="exporter_phone" class="form-control" value="{{ old('exporter_phone', $sticker->exporter_phone) }}" placeholder="+937...">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label text-slate-700 small fw-bold mb-1">Exporter Address *</label>
                                <textarea name="exporter_address" id="exporter_address" class="form-control" rows="2" required placeholder="Full address...">{{ old('exporter_address', $sticker->exporter_address) }}</textarea>
                            </div>
                        </div>
                    </section>

                    <section class="form-section mt-4">
                        <div class="d-flex flex-wrap align-items-center justify-content-between mb-3 gap-2">
                            <div class="d-flex align-items-center gap-2">
                                <h2 class="form-section__title mb-0"><span class="form-section__number" style="background:#059669;color:#fff;">3</span> Importer (Consignee) Details</h2>
                                <span class="badge bg-emerald-100 text-emerald-700 rounded-pill px-2.5 py-1" style="font-size:0.72rem;font-weight:700;">{{ $savedBuyers->count() }} Consignees Available</span>
                            </div>
                            <button type="button" class="party-recommend-trigger party-recommend-trigger--buyer" onclick="openRecommendations_importer_name()">
                                💡 Recommend Consignees
                            </button>
                        </div>

                        <div class="mb-3 bg-emerald-50/50 p-3 rounded-3 border" style="border-color:#d1fae5 !important;">
                            <div class="d-flex align-items-center justify-content-between mb-1">
                                <label class="form-label text-emerald-900 small fw-bold mb-0">⚡ Quick Select Saved Importer (Consignee)</label>
                                <span class="text-xs text-emerald-700">Type in Importer Name for live search</span>
                            </div>
                            <select class="form-select form-select-sm" id="saved-importer-select" onchange="autoFillImporter(this)">
                                <option value="">-- Choose Saved Importer Profile ({{ $savedBuyers->count() }} profiles) --</option>
                                @foreach($savedBuyers as $sBuyer)
                                    <option value="{{ json_encode($sBuyer) }}">{{ $sBuyer->company_name }} @if($sBuyer->gst_no)(GST: {{ $sBuyer->gst_no }})@endif</option>
                                @endforeach
                            </select>
                        </div>

                        <div class="row g-3">
                            <div class="col-md-6">
                                <div class="d-flex align-items-center justify-content-between mb-1">
                                    <label class="form-label text-slate-700 small fw-bold mb-0">Importer Name *</label>
                                    <div class="d-flex align-items-center gap-1.5">
                                        <button type="button" class="party-recommend-trigger party-recommend-trigger--buyer py-0 px-2" onclick="openRecommendations_importer_name()">💡 All Consignees</button>
                                        <button type="button" class="btn btn-xs btn-outline-primary py-0 px-2 rounded-pill fw-bold" onclick="saveStickerParty('importer')" style="font-size:0.72rem;">💾 Save Importer</button>
                                    </div>
                                </div>
                                <div class="party-autocomplete-wrapper">
                                    <input type="text" name="importer_name" id="importer_name" class="form-control" value="{{ old('importer_name', $sticker->importer_name) }}" required placeholder="Type name or click for recommendations..." autocomplete="off">
                                </div>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label text-slate-700 small fw-bold mb-1">GST</label>
                                <input type="text" name="importer_gst" id="importer_gst" class="form-control" value="{{ old('importer_gst', $sticker->importer_gst) }}" placeholder="GST...">
                            </div>
                            <div class="col-12">
                                <label class="form-label text-slate-700 small fw-bold mb-1">Importer Address *</label>
                                <textarea name="importer_address" id="importer_address" class="form-control" rows="3" required placeholder="Full importer address...">{{ old('importer_address', $sticker->importer_address) }}</textarea>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label text-slate-700 small fw-bold mb-1">FSSAI No</label>
                                <input type="text" name="importer_fssai" id="importer_fssai" class="form-control" value="{{ old('importer_fssai', $sticker->importer_fssai) }}" placeholder="FSSAI...">
                            </div>
                            <div class="col-md-6 d-flex align-items-end pb-1">
                                <div class="form-check form-switch bg-slate-50 border p-2.5 rounded-3 w-100 d-flex align-items-center justify-content-between shadow-xs" style="border-color:#e2e8f0;">
                                    <label class="form-check-label fw-bold text-slate-700 small me-2 mb-0" for="show_fssai_logo">
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="me-1 text-primary"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg> FSSAI Logo Graphic
                                    </label>
                                    <input class="form-check-input" type="checkbox" role="switch" id="show_fssai_logo" name="show_fssai_logo" value="1" checked data-preview-toggle="fssai_logo">
                                </div>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label text-slate-700 small fw-bold mb-1">Phone No</label>
                                <input type="tel" name="importer_phone" id="importer_phone" class="form-control" value="{{ old('importer_phone', $sticker->importer_phone) }}" placeholder="+91...">
                            </div>
                            <div class="col-md-4">
                                <label class="form-label text-slate-700 small fw-bold mb-1">Email ID</label>
                                <input type="email" name="importer_email" id="importer_email" class="form-control" value="{{ old('importer_email', $sticker->importer_email) }}" placeholder="email@...">
                            </div>
                            <div class="col-md-4">
                                <label class="form-label text-slate-700 small fw-bold mb-1">PAN No</label>
                                <input type="text" name="importer_pan" id="importer_pan" class="form-control" value="{{ old('importer_pan', $sticker->importer_pan) }}" placeholder="PAN...">
                            </div>
                        </div>
                    </section>

                    <section class="form-section mt-4">
                        <div class="d-flex align-items-center justify-content-between mb-3">
                            <h2 class="form-section__title mb-0">
                                <span class="form-section__number" style="background:#7c3aed;color:#fff;">3</span> Product &amp; Transit Details
                            </h2>
                            <span class="badge bg-purple-100 text-purple-700 rounded-pill px-2.5 py-1 text-xs fw-bold">
                                Carton &amp; Box Specifications
                            </span>
                        </div>

                        <div class="row g-3.5">
                            <!-- Name of Commodity -->
                            <div class="col-md-6">
                                <x-form.input name="commodity_name" label="Name of Commodity" :value="$sticker->commodity_name" placeholder="e.g. BLACK RAISINS" required />
                                <div class="mt-2">
                                    <div class="text-2xs font-extrabold text-slate-400 text-uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                        <span>⚡ Quick Product Presets:</span>
                                    </div>
                                    <div class="d-flex flex-wrap gap-1.5">
                                        @foreach(['BLACK RAISINS', 'GREEN RAISINS', 'DRIED FIGS (ANJEER)', 'WALNUTS IN SHELL', 'WALNUT KERNELS', 'ALMONDS', 'PISTACHIOS', 'DRIED APRICOTS', 'SAFFRON'] as $item)
                                            <button type="button" class="btn btn-xs btn-light border py-1 px-2.5 rounded-pill text-xs fw-semibold text-slate-700 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300 transition-all shadow-2xs" onclick="setStickerInputValue('commodity_name', '{{ $item }}')">
                                                {{ $item }}
                                            </button>
                                        @endforeach
                                    </div>
                                </div>
                            </div>

                            <!-- Net Weight -->
                            <div class="col-md-6">
                                <x-form.input name="net_wt" label="Net Wt" :value="$sticker->net_wt" placeholder="e.g. 10 Kg" required />
                                <div class="mt-2">
                                    <div class="text-2xs font-extrabold text-slate-400 text-uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                        <span>⚖️ Quick Weight Presets:</span>
                                    </div>
                                    <div class="d-flex flex-wrap gap-1.5">
                                        @foreach(['5 Kg', '10 Kg', '12 Kg', '15 Kg', '16 Kg', '20 Kg', '25 Kg', '30 Kg', '50 Kg'] as $wt)
                                            <button type="button" class="btn btn-xs btn-light border py-1 px-2.5 rounded-pill text-xs fw-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 transition-all shadow-2xs" onclick="setStickerInputValue('net_wt', '{{ $wt }}')">
                                                {{ $wt }}
                                            </button>
                                        @endforeach
                                    </div>
                                </div>
                            </div>

                            <!-- Date of Packing -->
                            <div class="col-md-6">
                                <x-form.input name="date_of_packing" label="Date of Packing" :value="$sticker->date_of_packing" placeholder="AUG / 2026" required />
                                <div class="mt-2">
                                    <div class="text-2xs font-extrabold text-slate-400 text-uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                        <span>📅 Packing Date Presets:</span>
                                    </div>
                                    <div class="d-flex flex-wrap gap-1.5">
                                        @php
                                            $now = \Carbon\Carbon::now();
                                            $currentMonth = strtoupper($now->format('M / Y'));
                                            $nextMonth = strtoupper($now->copy()->addMonth()->format('M / Y'));
                                            $monthAfter = strtoupper($now->copy()->addMonths(2)->format('M / Y'));
                                        @endphp
                                        <button type="button" class="btn btn-xs btn-outline-primary py-1 px-2.5 rounded-pill text-xs fw-bold d-inline-flex align-items-center gap-1 shadow-2xs" onclick="setPackingAndExpiryDate('{{ $currentMonth }}', 2)">
                                            <span>📅 Current: {{ $currentMonth }}</span>
                                        </button>
                                        <button type="button" class="btn btn-xs btn-light border py-1 px-2.5 rounded-pill text-xs fw-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-all shadow-2xs" onclick="setPackingAndExpiryDate('{{ $nextMonth }}', 2)">
                                            <span>📅 {{ $nextMonth }}</span>
                                        </button>
                                        <button type="button" class="btn btn-xs btn-light border py-1 px-2.5 rounded-pill text-xs fw-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-all shadow-2xs" onclick="setPackingAndExpiryDate('{{ $monthAfter }}', 2)">
                                            <span>📅 {{ $monthAfter }}</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <!-- Date of Expiry -->
                            <div class="col-md-6">
                                <x-form.input name="date_of_expiry" label="Date of Expiry" :value="$sticker->date_of_expiry" placeholder="AUG / 2028" required />
                                <div class="mt-2">
                                    <div class="text-2xs font-extrabold text-slate-400 text-uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                        <span>⏳ Shelf Life Presets:</span>
                                    </div>
                                    <div class="d-flex flex-wrap gap-1.5">
                                        @php
                                            $exp1 = strtoupper($now->copy()->addYear()->format('M / Y'));
                                            $exp2 = strtoupper($now->copy()->addYears(2)->format('M / Y'));
                                            $exp3 = strtoupper($now->copy()->addYears(3)->format('M / Y'));
                                        @endphp
                                        <button type="button" class="btn btn-xs btn-outline-primary py-1 px-2.5 rounded-pill text-xs fw-bold d-inline-flex align-items-center gap-1 shadow-2xs" onclick="setStickerInputValue('date_of_expiry', '{{ $exp2 }}')">
                                            <span>📅 +2 Years ({{ $exp2 }})</span>
                                        </button>
                                        <button type="button" class="btn btn-xs btn-light border py-1 px-2.5 rounded-pill text-xs fw-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-all shadow-2xs" onclick="setStickerInputValue('date_of_expiry', '{{ $exp1 }}')">
                                            <span>+1 Yr ({{ $exp1 }})</span>
                                        </button>
                                        <button type="button" class="btn btn-xs btn-light border py-1 px-2.5 rounded-pill text-xs fw-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-all shadow-2xs" onclick="setStickerInputValue('date_of_expiry', '{{ $exp3 }}')">
                                            <span>+3 Yrs ({{ $exp3 }})</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <!-- Lot Number -->
                            <div class="col-md-6">
                                <x-form.input name="lot_no" label="Lot No (e.g. 265)" :value="$sticker->lot_no" placeholder="265" />
                                <div class="form-text text-muted small mt-1">Displays as <strong class="text-success" style="color:#007a3d !important; font-weight:800;">Lot No: {{ $sticker->lot_no ?: '265' }}</strong> on sticker</div>
                            </div>

                            <!-- Transport / Transit -->
                            <div class="col-md-6">
                                <x-form.input name="transport_mode" label="Transport / Transit (Under Lot No)" :value="$sticker->transport_mode" placeholder="e.g. BY AIR TO INDIA" />
                                <div class="form-text text-muted small mt-1">Displays in green: <strong style="color:#007a3d; font-weight:800;">BY AIR TO INDIA</strong> on sticker</div>
                                <div class="mt-2">
                                    <div class="text-2xs font-extrabold text-slate-400 text-uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                        <span>✈️ Quick Transit Presets:</span>
                                    </div>
                                    <div class="d-flex flex-wrap gap-1.5">
                                        @foreach(['BY AIR TO INDIA', 'BY AIR TO NEW DELHI, INDIA', 'BY AIR TO MUMBAI, INDIA', 'BY AIR', 'BY LAND TO INDIA'] as $tMode)
                                            <button type="button" class="btn btn-xs btn-light border py-1 px-2.5 rounded-pill text-xs fw-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 transition-all shadow-2xs" onclick="setStickerInputValue('transport_mode', '{{ $tMode }}')">
                                                {{ $tMode }}
                                            </button>
                                        @endforeach
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <!-- Mobile Floating Jump to Preview Pill -->
                    <div class="d-xl-none position-fixed bottom-4 end-4 z-40" style="bottom: 1.5rem; right: 1.5rem; z-index: 1030;">
                        <a href="#liveStickerPreviewSection" class="btn btn-primary shadow-lg rounded-pill px-3.5 py-2.5 fw-bold d-inline-flex align-items-center gap-2 border border-white/20">
                            🏷️ <span style="font-size:0.85rem;">View Live Preview</span>
                        </a>
                    </div>

                    <div class="d-flex flex-wrap justify-content-end gap-3 mt-5">
                        <a class="btn btn-light px-4 py-2.5 fw-bold text-slate-600 rounded-3" href="{{ $cancelUrl }}">Cancel</a>
                        <button class="btn btn-primary-action px-5 py-2.5 fw-bold shadow-sm d-inline-flex align-items-center gap-2 rounded-3" type="submit" id="saveStickerSubmitBtn">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                            {{ $submitLabel }}
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <aside class="col-xl-5 position-sticky" id="liveStickerPreviewSection" style="position: sticky; top: 1.25rem; z-index: 10;">
            <div class="card preview-card shadow-sm border-0 rounded-4 overflow-hidden">
                <div class="preview-card__bar d-flex flex-wrap align-items-center justify-content-between gap-2 p-3 bg-white border-bottom">
                    <div>
                        <div class="d-flex align-items-center gap-2">
                            <strong class="text-slate-800" style="font-size: 0.95rem;">🏷️ Live Sticker Preview</strong>
                            <span class="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-2 py-0.5" style="font-size:0.68rem;font-weight:700;">120mm × 140mm</span>
                        </div>
                        <span class="text-slate-500 text-xs mt-0.5">Real-time box &amp; carton label preview</span>
                    </div>
                    
                    <!-- Zoom Controls -->
                    <div class="d-flex align-items-center gap-1 bg-slate-100 p-1 rounded-pill border" style="border-color:#e2e8f0;">
                        <button type="button" class="btn btn-xs btn-white rounded-circle p-1 shadow-2xs d-flex align-items-center justify-content-center" onclick="changeStickerZoom(-0.05)" title="Zoom Out (Little Out Zoom)" style="width: 26px; height: 26px; background:#fff;">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
                        </button>
                        <button type="button" class="btn btn-xs fw-bold px-2 py-0.5 text-slate-700" id="stickerZoomDisplay" onclick="setStickerZoom(getOptimalFormZoom())" title="Click to auto-fit" style="font-size:0.75rem; min-width: 44px;">
                            85%
                        </button>
                        <button type="button" class="btn btn-xs btn-white rounded-circle p-1 shadow-2xs d-flex align-items-center justify-content-center" onclick="changeStickerZoom(0.05)" title="Zoom In" style="width: 26px; height: 26px; background:#fff;">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
                        </button>
                        <button type="button" class="btn btn-xs btn-outline-secondary rounded-pill px-2 py-0.5 fw-bold ms-1" onclick="setStickerZoom(1.0)" title="100% Actual Size" style="font-size:0.7rem; background:#fff;">
                            100%
                        </button>
                    </div>
                </div>

                <div class="sticker-preview-stage p-2 p-sm-3 d-flex justify-content-center" style="background: radial-gradient(circle, #f1f5f9 10%, #e2e8f0 90%); min-height: 480px; overflow: hidden; position: relative;">
                    <div id="stickerZoomWrapper" style="transform: scale(0.85); transform-origin: top center; transition: transform 0.15s ease-out; width: fit-content; max-width: 100%;">
                        <x-acci.sticker-document :sticker="$sticker" :live-preview="true" />
                    </div>
                </div>

                <div class="p-2.5 bg-slate-50 border-top d-flex align-items-center justify-content-between text-xs text-slate-500">
                    <span class="d-inline-flex align-items-center gap-1.5">
                        <span class="status-pulse-dot" style="background:#10b981;"></span> Live rendering active
                    </span>
                    <div class="d-flex align-items-center gap-2">
                        <button type="button" class="btn btn-link text-slate-600 text-decoration-none p-0 text-xs fw-bold" onclick="setStickerZoom(getOptimalFormZoom())">Auto-Fit</button>
                        <span class="text-slate-300">|</span>
                        <button type="button" class="btn btn-link text-slate-600 text-decoration-none p-0 text-xs fw-bold" onclick="setStickerZoom(0.70)">70%</button>
                    </div>
                </div>
            </div>
        </aside>
    </div>
</form>

<script>
document.addEventListener('DOMContentLoaded', function() {
    if (typeof attachPartyAutocomplete === 'function') {
        attachPartyAutocomplete({
            input: 'exporter_name',
            type: 'seller',
            selectId: 'saved-exporter-select',
            mappings: {
                licence: 'exporter_licence_no',
                phone: 'exporter_phone',
                address: 'exporter_address'
            }
        });

        attachPartyAutocomplete({
            input: 'importer_name',
            type: 'buyer',
            selectId: 'saved-importer-select',
            mappings: {
                gst: 'importer_gst',
                address: 'importer_address',
                fssai: 'importer_fssai',
                phone: 'importer_phone',
                email: 'importer_email',
                pan: 'importer_pan'
            }
        });
    }
});

window.autoFillExporter = function(selectEl) {
    if (!selectEl.value) return;
    try {
        const data = JSON.parse(selectEl.value);
        if (data.company_name) document.getElementById('exporter_name').value = data.company_name;
        if (data.iec_code) document.getElementById('exporter_licence_no').value = data.iec_code;
        if (data.address) document.getElementById('exporter_address').value = data.address;
        if (data.phone) document.getElementById('exporter_phone').value = data.phone;
        document.getElementById('exporter_name').dispatchEvent(new Event('input', {bubbles: true}));
        document.getElementById('exporter_licence_no')?.dispatchEvent(new Event('input', {bubbles: true}));
        document.getElementById('exporter_address').dispatchEvent(new Event('input', {bubbles: true}));
        document.getElementById('exporter_phone').dispatchEvent(new Event('input', {bubbles: true}));
    } catch(e) {}
};

window.autoFillImporter = function(selectEl) {
    if (!selectEl.value) return;
    try {
        const data = JSON.parse(selectEl.value);
        if (data.company_name) document.getElementById('importer_name').value = data.company_name;
        if (data.address) document.getElementById('importer_address').value = data.address;
        if (data.gst_no) document.getElementById('importer_gst').value = data.gst_no;
        if (data.fssai_no) document.getElementById('importer_fssai').value = data.fssai_no;
        if (data.phone) document.getElementById('importer_phone').value = data.phone;
        if (data.email) document.getElementById('importer_email').value = data.email;
        if (data.iec_code) document.getElementById('importer_pan').value = data.iec_code;
        document.getElementById('importer_name').dispatchEvent(new Event('input', {bubbles: true}));
        document.getElementById('importer_address').dispatchEvent(new Event('input', {bubbles: true}));
        document.getElementById('importer_gst').dispatchEvent(new Event('input', {bubbles: true}));
        document.getElementById('importer_fssai').dispatchEvent(new Event('input', {bubbles: true}));
        document.getElementById('importer_phone').dispatchEvent(new Event('input', {bubbles: true}));
        document.getElementById('importer_email').dispatchEvent(new Event('input', {bubbles: true}));
        document.getElementById('importer_pan').dispatchEvent(new Event('input', {bubbles: true}));
    } catch(e) {}
};

window.saveStickerParty = function(type) {
    const isExporter = type === 'exporter';
    const companyName = document.getElementById(isExporter ? 'exporter_name' : 'importer_name')?.value.trim();
    const address = document.getElementById(isExporter ? 'exporter_address' : 'importer_address')?.value.trim();
    const phone = document.getElementById(isExporter ? 'exporter_phone' : 'importer_phone')?.value.trim();
    const licence = isExporter ? document.getElementById('exporter_licence_no')?.value.trim() : '';
    const email = !isExporter ? document.getElementById('importer_email')?.value.trim() : '';
    const gstNo = !isExporter ? document.getElementById('importer_gst')?.value.trim() : '';
    const fssaiNo = !isExporter ? document.getElementById('importer_fssai')?.value.trim() : '';
    const iecCode = !isExporter ? document.getElementById('importer_pan')?.value.trim() : licence;

    if (!companyName) {
        alert('Please enter ' + type + ' company name first.');
        return;
    }

    const payload = {
        type: isExporter ? 'seller' : 'buyer',
        company_name: companyName,
        address: address,
        phone: phone,
        email: email,
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
            const selectId = isExporter ? 'saved-exporter-select' : 'saved-importer-select';
            const selectEl = document.getElementById(selectId);
            if (selectEl) {
                const opt = document.createElement('option');
                opt.value = JSON.stringify(data.company);
                opt.textContent = data.company.company_name + (data.company.gst_no ? ` (GST: ${data.company.gst_no})` : '');
                opt.selected = true;
                selectEl.appendChild(opt);
            }
            if (isExporter && window.SAVED_SELLERS_DATA) {
                window.SAVED_SELLERS_DATA.push(data.company);
            } else if (!isExporter && window.SAVED_BUYERS_DATA) {
                window.SAVED_BUYERS_DATA.push(data.company);
            }
        }
    })
    .catch(() => alert('Error saving company'));
};

window.autoFillStickerFromInvoice = function(selectEl) {
    const opt = selectEl.options[selectEl.selectedIndex];
    if (!opt || !opt.value) return;

    const setField = (name, val) => {
        const el = document.getElementById(name) || document.querySelector(`[name="${name}"]`);
        if (el && val) {
            el.value = val;
            el.dispatchEvent(new Event('input', {bubbles: true}));
        }
    };

    setField('exporter_name', opt.dataset.exporterName || '');
    setField('exporter_address', opt.dataset.exporterAddress || '');
    setField('exporter_phone', opt.dataset.exporterPhone || '');
    setField('importer_name', opt.dataset.importerName || '');
    setField('importer_address', opt.dataset.importerAddress || '');
    setField('importer_gst', opt.dataset.importerGst || '');
    setField('importer_fssai', opt.dataset.importerFssai || '');
    setField('importer_phone', opt.dataset.importerPhone || '');
    setField('importer_email', opt.dataset.importerEmail || '');
    setField('commodity_name', opt.dataset.commodityName || '');
    setField('net_wt', opt.dataset.netWt || '');
};

window.setStickerInputValue = function(fieldName, value) {
    const el = document.querySelector(`[name="${fieldName}"]`) || document.getElementById(fieldName);
    if (el) {
        el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    }
};

window.setPackingAndExpiryDate = function(packingDate, expiryYearsOffset = 2) {
    window.setStickerInputValue('date_of_packing', packingDate);
    const parts = packingDate.split('/');
    if (parts.length === 2) {
        const month = parts[0].trim();
        const year = parseInt(parts[1].trim());
        if (!isNaN(year)) {
            const expDate = `${month} / ${year + expiryYearsOffset}`;
            window.setStickerInputValue('date_of_expiry', expDate);
        }
    }
};

window.clearAllStickerFields = function() {
    if (!confirm('Are you sure you want to clear all fields?')) return;
    const fields = [
        'exporter_name', 'exporter_address', 'exporter_phone', 'exporter_licence_no',
        'importer_name', 'importer_address', 'importer_gst', 'importer_fssai',
        'importer_phone', 'importer_email', 'importer_pan',
        'commodity_name', 'net_wt', 'date_of_packing', 'date_of_expiry', 'lot_no', 'transport_mode'
    ];
    fields.forEach(name => {
        const el = document.getElementById(name) || document.querySelector(`[name="${name}"]`);
        if (el) {
            el.value = '';
            el.dispatchEvent(new Event('input', { bubbles: true }));
        }
    });
};

window.fillSampleStickerData = function() {
    const sample = {
        exporter_name: 'Pahlawan Noori LTD',
        exporter_address: 'Shorandam, Industrial Park Kandahar Afghanistan',
        exporter_phone: '+93707070975',
        exporter_licence_no: '27-1173',
        importer_name: 'Uttam Chand Rakesh Kumar Private Limited',
        importer_address: '573, Katra Ishwar Bhawan, Khari, Baoli\nDelhi-110006(India)',
        importer_gst: '07AADCU4808L1Z2',
        importer_fssai: '13324999000404',
        importer_phone: '011-45784868',
        importer_email: 'akshaykbhatia@hotmail.com',
        importer_pan: 'AADCU4808L',
        commodity_name: 'BLACK RAISINS',
        net_wt: '16 Kg',
        date_of_packing: 'AUG / 2026',
        date_of_expiry: 'AUG / 2028',
        lot_no: '265',
        transport_mode: 'BY AIR TO INDIA'
    };
    Object.entries(sample).forEach(([name, val]) => {
        const el = document.getElementById(name) || document.querySelector(`[name="${name}"]`);
        if (el) {
            el.value = val;
            el.dispatchEvent(new Event('input', { bubbles: true }));
        }
    });
};

window.getOptimalFormZoom = function() {
    const stage = document.querySelector('.sticker-preview-stage');
    const availableWidth = stage ? stage.clientWidth : window.innerWidth;
    if (availableWidth < 470) {
        return Math.max(0.55, Math.min(0.85, (availableWidth - 24) / 454));
    }
    return 0.85;
};

let currentStickerZoom = window.getOptimalFormZoom();

window.setStickerZoom = function(scale) {
    currentStickerZoom = Math.min(Math.max(scale, 0.45), 1.5);
    const wrapper = document.getElementById('stickerZoomWrapper');
    const display = document.getElementById('stickerZoomDisplay');
    if (wrapper) {
        wrapper.style.transform = `scale(${currentStickerZoom})`;
    }
    if (display) {
        display.textContent = `${Math.round(currentStickerZoom * 100)}%`;
    }
};

window.changeStickerZoom = function(delta) {
    window.setStickerZoom(currentStickerZoom + delta);
};

document.addEventListener('DOMContentLoaded', function() {
    window.setStickerZoom(window.getOptimalFormZoom());
});
window.addEventListener('resize', function() {
    if (window.innerWidth < 500) {
        window.setStickerZoom(window.getOptimalFormZoom());
    }
});

function captureAndSaveSticker(formEl) {
    try {
        const formData = new FormData(formEl);
        const stickerObj = {};
        formData.forEach((val, key) => {
            if (key !== '_token' && key !== '_method') {
                stickerObj[key] = val;
            }
        });
        if (!stickerObj.sticker_no) {
            const noEl = formEl.querySelector('[name="sticker_no"]') || document.getElementById('sticker_no');
            if (noEl && noEl.value) stickerObj.sticker_no = noEl.value.trim();
        }
        if (stickerObj.sticker_no) {
            let saved = JSON.parse(localStorage.getItem('user_saved_stickers') || '[]');
            const idx = saved.findIndex(s => s.sticker_no === stickerObj.sticker_no);
            if (idx >= 0) {
                saved[idx] = { ...saved[idx], ...stickerObj };
            } else {
                saved.unshift(stickerObj);
            }
            localStorage.setItem('user_saved_stickers', JSON.stringify(saved));

            if (window.self !== window.top) {
                window.parent.postMessage({ type: 'STICKER_SAVED', sticker: stickerObj }, '*');
            }
        }
    } catch (e) {
        console.error('Local sticker save error', e);
    }
}

const formEl = document.querySelector('form[data-acci-form]');
if (formEl) {
    formEl.addEventListener('submit', function() {
        captureAndSaveSticker(this);
        const btn = document.getElementById('saveStickerSubmitBtn');
        if (btn && !btn.disabled) {
            btn.classList.add('disabled');
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span> Saving Sticker...';
        }
    });
}

document.getElementById('saveStickerSubmitBtn')?.addEventListener('click', function() {
    const f = document.querySelector('form[data-acci-form]');
    if (f) captureAndSaveSticker(f);
});

document.addEventListener('keydown', function(e) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        const form = document.querySelector('form[data-acci-form]');
        if (form) {
            captureAndSaveSticker(form);
            form.requestSubmit();
        }
    }
});
</script>

