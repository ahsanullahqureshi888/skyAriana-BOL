@php
    $dateInput = function (mixed $value): string {
        if (! $value) return '';
        try {
            return \Illuminate\Support\Carbon::parse($value)->format('Y-m-d');
        } catch (\Throwable) {
            return (string) $value;
        }
    };

    $chargeSettlement = old('charge_settlement', (float) $airWaybill->total_collect > 0 ? 'collect' : 'prepaid');
@endphp

<form action="{{ $action }}" method="POST" enctype="multipart/form-data" data-awb-form novalidate>
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
                            <strong>Air Waybill information</strong>
                            <div class="small text-secondary">Fields marked with an asterisk are required.</div>
                        </div>
                        <span class="badge text-bg-light border">IATA format | A4 portrait</span>
                    </div>
                </div>
                <div class="card-body p-3 p-lg-4">
                    @if(isset($invoices) && $invoices->count() > 0)
                        <div class="mb-4 p-3 rounded-3" style="background:#eff6ff;border:1px solid #bfdbfe;">
                            <label class="form-label font-bold text-xs uppercase text-primary d-flex align-items-center gap-1.5 mb-1.5">
                                ⚡ 1-Click Auto-Fill from Existing ACCI Invoice
                            </label>
                            <select id="invoice-autofill-select-awb" class="form-select text-sm font-semibold" style="border-radius:0.6rem" onchange="autoFillAwbFromInvoice(this)">
                                <option value="">-- Select ACCI Invoice to Auto-Populate AWB Details --</option>
                                @foreach($invoices as $inv)
                                    <option value="{{ $inv->id }}"
                                        data-shipper-name="{{ $inv->seller_name }}"
                                        data-shipper-address="{{ $inv->seller_address }}"
                                        data-consignee-name="{{ $inv->buyer_name }}"
                                        data-consignee-address="{{ $inv->buyer_address }}"
                                        data-commodity="{{ $inv->commodity }}"
                                        data-weight="{{ $inv->quantity_weight }}"
                                        data-price="{{ $inv->total_price }}"
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
                            <ul class="mb-0 mt-2 small">@foreach($errors->all() as $error)<li>{{ $error }}</li>@endforeach</ul>
                        </div>
                    @endif

                    <section class="form-section">
                        <h2 class="form-section__title"><span class="form-section__number">1</span> AWB identity and carrier</h2>
                        <div class="row g-3">
                            <div class="col-md-6"><x-form.input name="awb_number" label="AWB number" :value="$airWaybill->awb_number" required help="IATA format: 3-digit prefix and 8-digit serial." /></div>
                            <div class="col-6 col-md-3"><x-form.input name="airline_prefix" label="Airline prefix" :value="$airWaybill->airline_prefix" required maxlength="3" inputmode="numeric" /></div>
                            <div class="col-6 col-md-3"><x-form.input name="serial_number" label="Serial number" :value="$airWaybill->serial_number" required maxlength="8" inputmode="numeric" /></div>
                            <div class="col-md-8"><x-form.input name="carrier_name" label="Carrier name" :value="$airWaybill->carrier_name" /></div>
                            <div class="col-md-4">
                                <label class="form-label required-label" for="status">Status</label>
                                <select class="form-select @error('status') is-invalid @enderror" id="status" name="status" required>
                                    @foreach(['draft' => 'Draft', 'issued' => 'Issued', 'cancelled' => 'Cancelled'] as $value => $label)
                                        <option value="{{ $value }}" @selected(old('status', $airWaybill->status) === $value)>{{ $label }}</option>
                                    @endforeach
                                </select>
                                @error('status')<div class="invalid-feedback">{{ $message }}</div>@enderror
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
                                <h2 class="form-section__title mb-0"><span class="form-section__number">2</span> Shipper &amp; Consignee Details</h2>
                                <span class="badge bg-indigo-100 text-indigo-700 rounded-pill px-2.5 py-0.5" style="font-size:0.72rem;font-weight:700;">{{ $savedSellers->count() }} Shippers / {{ $savedBuyers->count() }} Consignees</span>
                            </div>
                            <div class="d-flex align-items-center gap-2">
                                <button type="button" class="party-recommend-trigger party-recommend-trigger--seller" onclick="openRecommendations_shipper_name()">💡 Recommend Shippers</button>
                                <button type="button" class="party-recommend-trigger party-recommend-trigger--buyer" onclick="openRecommendations_consignee_name()">💡 Recommend Consignees</button>
                                <a href="{{ route('saved-companies.index') }}" target="_blank" class="btn btn-sm btn-link text-primary text-decoration-none p-0 fw-bold" style="font-size:0.8rem;">⚙️ Manage Saved Parties Library</a>
                            </div>
                        </div>

                        <div class="row g-3 mb-3 bg-slate-50 p-3 rounded-3 border" style="border-color:#e2e8f0 !important;">
                            <div class="col-md-6">
                                <label class="form-label text-slate-700 small fw-bold mb-1">⚡ Quick Select Saved Shipper ({{ $savedSellers->count() }} profiles)</label>
                                <select class="form-select form-select-sm" id="saved-shipper-select" onchange="autoFillShipper(this)">
                                    <option value="">-- Choose Saved Shipper Profile --</option>
                                    @foreach($savedSellers as $sSeller)
                                        <option value="{{ json_encode($sSeller) }}">{{ $sSeller->company_name }} @if($sSeller->iec_code)(Lic: {{ $sSeller->iec_code }})@endif</option>
                                    @endforeach
                                </select>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label text-slate-700 small fw-bold mb-1">⚡ Quick Select Saved Consignee ({{ $savedBuyers->count() }} profiles)</label>
                                <select class="form-select form-select-sm" id="saved-consignee-select" onchange="autoFillConsignee(this)">
                                    <option value="">-- Choose Saved Consignee Profile --</option>
                                    @foreach($savedBuyers as $sBuyer)
                                        <option value="{{ json_encode($sBuyer) }}">{{ $sBuyer->company_name }} @if($sBuyer->gst_no)(GST: {{ $sBuyer->gst_no }})@endif</option>
                                    @endforeach
                                </select>
                            </div>
                        </div>

                        <div class="row g-3">
                            <div class="col-md-6">
                                <div class="d-flex align-items-center justify-content-between mb-1">
                                    <label class="form-label text-slate-700 small fw-bold mb-0">Shipper Name *</label>
                                    <div class="d-flex align-items-center gap-1.5">
                                        <button type="button" class="party-recommend-trigger party-recommend-trigger--seller py-0 px-2" onclick="openRecommendations_shipper_name()">💡 All Shippers</button>
                                        <button type="button" class="btn btn-xs btn-outline-primary py-0 px-2 rounded-pill fw-bold" onclick="saveAwbParty('shipper')" style="font-size:0.72rem;">💾 Save Shipper</button>
                                    </div>
                                </div>
                                <div class="party-autocomplete-wrapper">
                                    <input type="text" name="shipper_name" id="shipper_name" class="form-control" value="{{ old('shipper_name', $airWaybill->shipper_name) }}" required placeholder="Type name or click for recommendations..." autocomplete="off">
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="d-flex align-items-center justify-content-between mb-1">
                                    <label class="form-label text-slate-700 small fw-bold mb-0">Consignee Name *</label>
                                    <div class="d-flex align-items-center gap-1.5">
                                        <button type="button" class="party-recommend-trigger party-recommend-trigger--buyer py-0 px-2" onclick="openRecommendations_consignee_name()">💡 All Consignees</button>
                                        <button type="button" class="btn btn-xs btn-outline-primary py-0 px-2 rounded-pill fw-bold" onclick="saveAwbParty('consignee')" style="font-size:0.72rem;">💾 Save Consignee</button>
                                    </div>
                                </div>
                                <div class="party-autocomplete-wrapper">
                                    <input type="text" name="consignee_name" id="consignee_name" class="form-control" value="{{ old('consignee_name', $airWaybill->consignee_name) }}" required placeholder="Type name or click for recommendations..." autocomplete="off">
                                </div>
                            </div>
                            <div class="col-md-6"><x-form.textarea name="shipper_address" label="Shipper Address *" :value="$airWaybill->shipper_address" :rows="4" required /></div>
                            <div class="col-md-6"><x-form.textarea name="consignee_address" label="Consignee Address *" :value="$airWaybill->consignee_address" :rows="4" required /></div>
                            <div class="col-md-3"><x-form.input name="shipper_phone" label="Shipper Phone" :value="$airWaybill->shipper_phone" /></div>
                            <div class="col-md-3"><x-form.input name="shipper_account_no" label="Shipper Account / Licence No." :value="$airWaybill->shipper_account_no" /></div>
                            <div class="col-md-3"><x-form.input name="consignee_phone" label="Consignee Phone" :value="$airWaybill->consignee_phone" /></div>
                            <div class="col-md-3"><x-form.input name="consignee_account_no" label="Consignee Account / GST No." :value="$airWaybill->consignee_account_no" /></div>
                            <div class="col-12"><x-form.textarea name="notify_party" label="Notify Party" :value="$airWaybill->notify_party" :rows="3" /></div>
                        </div>
                    </section>

                    <section class="form-section">
                        <h2 class="form-section__title"><span class="form-section__number">3</span> Agent, airports and routing</h2>
                        <div class="row g-3">
                            <div class="col-md-6"><x-form.textarea name="issuing_agent" label="Issuing agent name and city" :value="$airWaybill->issuing_agent" :rows="2" /></div>
                            <div class="col-md-3"><x-form.input name="iata_code" label="Agent IATA code" :value="$airWaybill->iata_code" /></div>
                            <div class="col-md-3"><x-form.input name="agent_account_no" label="Agent account no." :value="$airWaybill->agent_account_no" /></div>
                            <div class="col-md-6"><x-form.input name="departure_airport" label="Airport of departure" :value="$airWaybill->departure_airport" required /></div>
                            <div class="col-md-6"><x-form.input name="destination_airport" label="Airport of destination" :value="$airWaybill->destination_airport" required /></div>
                            <div class="col-md-4"><x-form.input name="requested_routing" label="Requested routing" :value="$airWaybill->requested_routing" /></div>
                            <div class="col-md-2"><x-form.input name="first_carrier" label="First carrier" :value="$airWaybill->first_carrier" /></div>
                            <div class="col-md-3"><x-form.input name="flight_no" label="Flight number" :value="$airWaybill->flight_no" /></div>
                            <div class="col-md-3"><x-form.input name="flight_date" label="Flight date" type="date" :value="$dateInput($airWaybill->flight_date)" /></div>
                            <div class="col-md-6"><x-form.input name="airport_departure" label="Printed departure airport" :value="$airWaybill->airport_departure ?: $airWaybill->departure_airport" /></div>
                            <div class="col-md-6"><x-form.input name="airport_destination" label="Printed destination airport" :value="$airWaybill->airport_destination ?: $airWaybill->destination_airport" /></div>
                        </div>
                    </section>

                    <section class="form-section">
                        <h2 class="form-section__title"><span class="form-section__number">4</span> Declared values and instructions</h2>
                        <div class="row g-3">
                            <div class="col-md-3"><x-form.input name="currency" label="Currency" :value="$airWaybill->currency" required maxlength="3" /></div>
                            <div class="col-md-3"><x-form.input name="declared_value_carriage" label="Declared value - carriage" :value="$airWaybill->declared_value_carriage" /></div>
                            <div class="col-md-3"><x-form.input name="declared_value_customs" label="Declared value - customs" :value="$airWaybill->declared_value_customs" /></div>
                            <div class="col-md-3"><x-form.input name="insurance_amount" label="Insurance amount" :value="$airWaybill->insurance_amount" /></div>
                            <div class="col-md-5"><x-form.input name="reference_number" label="Reference number" :value="$airWaybill->reference_number" /></div>
                            <div class="col-md-7"><x-form.textarea name="accounting_information" label="Accounting information" :value="$airWaybill->accounting_information" :rows="3" /></div>
                            <div class="col-12"><x-form.textarea name="handling_information" label="Handling information" :value="$airWaybill->handling_information" :rows="3" /></div>
                        </div>
                    </section>

                    <section class="form-section">
                        <h2 class="form-section__title"><span class="form-section__number">5</span> Shipment and cargo</h2>
                        <div class="row g-3">
                            <div class="col-6 col-md-3"><x-form.input name="pieces" label="Pieces" type="number" :value="$airWaybill->pieces" min="1" step="1" required /></div>
                            <div class="col-6 col-md-3"><x-form.input name="gross_weight" label="Gross weight" type="number" :value="$airWaybill->gross_weight" min="0.001" step="0.001" required /></div>
                            <div class="col-6 col-md-3"><x-form.input name="chargeable_weight" label="Chargeable weight" type="number" :value="$airWaybill->chargeable_weight" min="0.001" step="0.001" required /></div>
                            <div class="col-6 col-md-3">
                                <label class="form-label required-label" for="weight_unit">Weight unit</label>
                                <select class="form-select @error('weight_unit') is-invalid @enderror" id="weight_unit" name="weight_unit" required>
                                    @foreach(['KG', 'LB'] as $unit)<option value="{{ $unit }}" @selected(old('weight_unit', $airWaybill->weight_unit) === $unit)>{{ $unit }}</option>@endforeach
                                </select>
                                @error('weight_unit')<div class="invalid-feedback">{{ $message }}</div>@enderror
                            </div>
                            <div class="col-md-3"><x-form.input name="rate_class" label="Rate class" :value="$airWaybill->rate_class" /></div>
                            <div class="col-md-4"><x-form.input name="commodity_item_no" label="Commodity item number" :value="$airWaybill->commodity_item_no" /></div>
                            <div class="col-md-5"><x-form.input name="rate" label="Rate" :value="$airWaybill->rate" help="Enter a number for automatic calculation, or text such as As Agreed." /></div>
                            <div class="col-12"><x-form.textarea name="commodity_description" label="Nature and quantity of goods" :value="$airWaybill->commodity_description" :rows="3" required /></div>
                            <div class="col-12"><x-form.textarea name="dimensions" label="Dimensions / volume" :value="$airWaybill->dimensions" :rows="2" /></div>
                        </div>
                    </section>

                    <section class="form-section">
                        <h2 class="form-section__title"><span class="form-section__number">6</span> Charges and settlement</h2>
                        <div class="row g-3">
                            <div class="col-sm-6 col-lg-4"><x-form.input name="freight_charge" label="Weight / freight charge" type="number" :value="$airWaybill->freight_charge" min="0" step="0.01" help="Calculated from chargeable weight and rate when rate is numeric." /></div>
                            <div class="col-sm-6 col-lg-4"><x-form.input name="valuation_charge" label="Valuation charge" type="number" :value="$airWaybill->valuation_charge" min="0" step="0.01" /></div>
                            <div class="col-sm-6 col-lg-4"><x-form.input name="tax" label="Tax" type="number" :value="$airWaybill->tax" min="0" step="0.01" /></div>
                            <div class="col-sm-6 col-lg-4"><x-form.input name="other_agent_charge" label="Other charges due agent" type="number" :value="$airWaybill->other_agent_charge" min="0" step="0.01" /></div>
                            <div class="col-sm-6 col-lg-4"><x-form.input name="other_carrier_charge" label="Other charges due carrier" type="number" :value="$airWaybill->other_carrier_charge" min="0" step="0.01" /></div>
                            <div class="col-sm-6 col-lg-4">
                                <label class="form-label required-label" for="charge_settlement">Settlement</label>
                                <select class="form-select" id="charge_settlement" name="charge_settlement" required>
                                    <option value="prepaid" @selected($chargeSettlement === 'prepaid')>Prepaid</option>
                                    <option value="collect" @selected($chargeSettlement === 'collect')>Collect</option>
                                </select>
                            </div>
                            <div class="col-sm-6 col-lg-4"><x-form.input name="total_prepaid" label="Total prepaid" type="number" :value="$airWaybill->total_prepaid" step="0.01" readonly /></div>
                            <div class="col-sm-6 col-lg-4"><x-form.input name="total_collect" label="Total collect" type="number" :value="$airWaybill->total_collect" step="0.01" readonly /></div>
                            <div class="col-sm-6 col-lg-4"><x-form.input name="charges_at_destination" label="Charges at destination" type="number" :value="$airWaybill->charges_at_destination" min="0" step="0.01" /></div>
                            <div class="col-sm-6 col-lg-4"><x-form.input name="currency_conversion" label="Currency conversion rate" type="number" :value="$airWaybill->currency_conversion" min="0" step="0.000001" /></div>
                            <div class="col-md-8 d-flex align-items-end">
                                <div class="calculation-note w-100">
                                    <strong>Automatic total charges</strong>
                                    <span data-awb-calculation-summary>Enter a numeric rate to calculate weight charge and totals.</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section class="form-section">
                        <h2 class="form-section__title"><span class="form-section__number">7</span> Execution, signatures and carrier assets</h2>
                        <div class="row g-3">
                            <div class="col-md-6"><x-form.input name="issued_place" label="Issued place" :value="$airWaybill->issued_place" /></div>
                            <div class="col-md-6"><x-form.input name="issued_date" label="Issued date" type="date" :value="$dateInput($airWaybill->issued_date)" /></div>
                            @foreach(['carrier_stamp' => 'Carrier stamp', 'shipper_signature' => 'Shipper signature', 'carrier_signature' => 'Carrier signature'] as $field => $label)
                                <div class="col-md-6">
                                    <label for="{{ $field }}" class="form-label">{{ $label }}</label>
                                    <input class="form-control @error($field) is-invalid @enderror" id="{{ $field }}" name="{{ $field }}" type="file" accept="image/png,image/jpeg,image/webp">
                                    @error($field)<div class="invalid-feedback">{{ $message }}</div>@enderror
                                    @if($airWaybill->{$field})<div class="form-text">A file is already stored. Uploading another replaces it after a successful update.</div>@endif
                                </div>
                            @endforeach
                            <div class="col-12"><x-form.textarea name="remarks" label="Internal remarks" :value="$airWaybill->remarks" :rows="3" help="Remarks are stored with the AWB but are not printed on the IATA form." /></div>
                        </div>
                    </section>

                    <div class="d-flex flex-wrap justify-content-end gap-2 mt-4">
                        <a class="btn btn-outline-secondary" href="{{ $cancelUrl }}">Cancel</a>
                        <button class="btn btn-primary px-4 fw-bold shadow-sm d-inline-flex align-items-center gap-2" type="submit" id="saveAwbSubmitBtn">{{ $submitLabel }}</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Floating Mobile Jump to Preview Pill -->
        <div class="d-xl-none position-fixed bottom-4 end-4 z-40" style="bottom: 1.5rem; right: 1.5rem; z-index: 1030;">
            <a href="#liveAwbPreviewSection" class="btn btn-primary shadow-lg rounded-pill px-3.5 py-2.5 fw-bold d-inline-flex align-items-center gap-2 border border-white/20">
                ✈️ <span style="font-size:0.85rem;">View Live AWB</span>
            </a>
        </div>

        <aside class="col-xl-5 position-sticky" id="liveAwbPreviewSection" style="position: sticky; top: 1.25rem; z-index: 10;">
            <div class="card preview-card shadow-sm border-0 rounded-4 overflow-hidden">
                <div class="preview-card__bar d-flex flex-wrap align-items-center justify-content-between gap-2 p-3 bg-white border-bottom">
                    <div>
                        <div class="d-flex align-items-center gap-2">
                            <strong class="text-slate-800" style="font-size: 0.95rem;">✈️ Live Air Waybill Preview</strong>
                            <span class="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-2 py-0.5" style="font-size:0.68rem;font-weight:700;">IATA A4</span>
                        </div>
                        <span class="text-slate-500 text-xs mt-0.5">Front page | exact A4 proportions</span>
                    </div>
                    <div class="d-flex align-items-center gap-1">
                        <button type="button" class="btn btn-xs btn-outline-secondary rounded-pill px-2.5 py-1 text-xs fw-bold" onclick="syncAwbPreviewScale()">Auto-Fit</button>
                    </div>
                </div>
                <div class="awb-preview-viewport p-2 p-sm-3 d-flex justify-content-center" data-awb-preview-viewport style="background: radial-gradient(circle, #f1f5f9 10%, #e2e8f0 90%); min-height: 480px; overflow: hidden; position: relative;">
                    <div class="awb-preview-sheet" data-awb-preview-sheet style="transform-origin: top center; transition: transform 0.15s ease-out; margin: 0 auto;">
                        <x-awb.document :air-waybill="$airWaybill" :live-preview="true" :include-terms="false" />
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
            input: 'shipper_name',
            type: 'seller',
            selectId: 'saved-shipper-select',
            mappings: {
                account_no: 'shipper_account_no',
                phone: 'shipper_phone',
                address: 'shipper_address'
            }
        });

        attachPartyAutocomplete({
            input: 'consignee_name',
            type: 'buyer',
            selectId: 'saved-consignee-select',
            mappings: {
                account_no: 'consignee_account_no',
                phone: 'consignee_phone',
                address: 'consignee_address'
            }
        });
    }
});

window.autoFillShipper = function(selectEl) {
    if (!selectEl.value) return;
    try {
        const data = JSON.parse(selectEl.value);
        if (data.company_name) document.getElementById('shipper_name').value = data.company_name;
        if (data.address) document.querySelector('[name=shipper_address]').value = data.address;
        if (data.phone) document.querySelector('[name=shipper_phone]').value = data.phone;
        if (data.iec_code && document.querySelector('[name=shipper_account_no]')) document.querySelector('[name=shipper_account_no]').value = data.iec_code;
        document.getElementById('shipper_name').dispatchEvent(new Event('input', {bubbles: true}));
        document.querySelector('[name=shipper_address]').dispatchEvent(new Event('input', {bubbles: true}));
        document.querySelector('[name=shipper_phone]')?.dispatchEvent(new Event('input', {bubbles: true}));
        document.querySelector('[name=shipper_account_no]')?.dispatchEvent(new Event('input', {bubbles: true}));
    } catch(e) {}
};

window.autoFillConsignee = function(selectEl) {
    if (!selectEl.value) return;
    try {
        const data = JSON.parse(selectEl.value);
        if (data.company_name) document.getElementById('consignee_name').value = data.company_name;
        if (data.address) document.querySelector('[name=consignee_address]').value = data.address;
        if (data.phone) document.querySelector('[name=consignee_phone]').value = data.phone;
        if (data.gst_no && document.querySelector('[name=consignee_account_no]')) document.querySelector('[name=consignee_account_no]').value = data.gst_no;
        document.getElementById('consignee_name').dispatchEvent(new Event('input', {bubbles: true}));
        document.querySelector('[name=consignee_address]').dispatchEvent(new Event('input', {bubbles: true}));
        document.querySelector('[name=consignee_phone]')?.dispatchEvent(new Event('input', {bubbles: true}));
        document.querySelector('[name=consignee_account_no]')?.dispatchEvent(new Event('input', {bubbles: true}));
    } catch(e) {}
};

window.saveAwbParty = function(type) {
    const isShipper = type === 'shipper';
    const companyName = document.getElementById(isShipper ? 'shipper_name' : 'consignee_name')?.value.trim();
    const address = document.querySelector(isShipper ? '[name=shipper_address]' : '[name=consignee_address]')?.value.trim();
    const phone = document.querySelector(isShipper ? '[name=shipper_phone]' : '[name=consignee_phone]')?.value.trim();
    const accountNo = document.querySelector(isShipper ? '[name=shipper_account_no]' : '[name=consignee_account_no]')?.value.trim();

    if (!companyName) {
        alert('Please enter ' + type + ' name first.');
        return;
    }

    const payload = {
        type: isShipper ? 'seller' : 'buyer',
        company_name: companyName,
        address: address,
        phone: phone,
        iec_code: isShipper ? accountNo : '',
        gst_no: !isShipper ? accountNo : ''
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
            const selectId = isShipper ? 'saved-shipper-select' : 'saved-consignee-select';
            const selectEl = document.getElementById(selectId);
            if (selectEl) {
                const opt = document.createElement('option');
                opt.value = JSON.stringify(data.company);
                opt.textContent = data.company.company_name;
                opt.selected = true;
                selectEl.appendChild(opt);
            }
            if (isShipper && window.SAVED_SELLERS_DATA) {
                window.SAVED_SELLERS_DATA.push(data.company);
            } else if (!isShipper && window.SAVED_BUYERS_DATA) {
                window.SAVED_BUYERS_DATA.push(data.company);
            }
        }
    })
    .catch(() => alert('Error saving company'));
};

window.autoFillAwbFromInvoice = function(selectEl) {
    const opt = selectEl.options[selectEl.selectedIndex];
    if (!opt || !opt.value) return;

    const setField = (name, val) => {
        const el = document.getElementById(name) || document.querySelector(`[name="${name}"]`);
        if (el && val) {
            el.value = val;
            el.dispatchEvent(new Event('input', {bubbles: true}));
        }
    };

    setField('shipper_name', opt.dataset.shipperName || '');
    setField('shipper_address', opt.dataset.shipperAddress || '');
    setField('consignee_name', opt.dataset.consigneeName || '');
    setField('consignee_address', opt.dataset.consigneeAddress || '');
    setField('nature_and_quantity_of_goods', opt.dataset.commodity || '');
    setField('gross_weight', opt.dataset.weight || '');
    setField('total_charge', opt.dataset.price || '');
};

document.querySelector('form[data-awb-form]')?.addEventListener('submit', function() {
    const btn = document.getElementById('saveAwbSubmitBtn');
    if (btn && !btn.disabled) {
        btn.classList.add('disabled');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span> Saving Air Waybill...';
    }
});
</script>
