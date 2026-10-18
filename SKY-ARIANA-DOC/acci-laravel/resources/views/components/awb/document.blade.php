@props([
    'airWaybill',
    'forPdf' => false,
    'livePreview' => false,
    'includeTerms' => true,
])

@php
    use Illuminate\Support\Facades\Storage;

    $value = function (string $field, mixed $fallback = '') use ($airWaybill, $livePreview): mixed {
        $modelValue = data_get($airWaybill, $field, $fallback);
        return $livePreview ? old($field, $modelValue) : $modelValue;
    };

    $shortDate = function (string $field) use ($value): string {
        $raw = $value($field);
        if (! $raw) return '';
        try {
            return \Illuminate\Support\Carbon::parse($raw)->format('d-M');
        } catch (\Throwable) {
            return (string) $raw;
        }
    };

    $longDate = function (string $field) use ($value): string {
        $raw = $value($field);
        if (! $raw) return '';
        try {
            return \Illuminate\Support\Carbon::parse($raw)->format('d/m/Y');
        } catch (\Throwable) {
            return (string) $raw;
        }
    };

    $decimal = fn (mixed $amount, int $places = 2): string => number_format((float) $amount, $places, '.', ',');
    $hasAmount = fn (mixed $amount): bool => is_numeric($amount) && (float) $amount > 0;
    $charge = fn (mixed $amount): string => $hasAmount($amount) ? $decimal($amount) : '';

    $imageSource = function (?string $path) use ($forPdf): ?string {
        if (! $path) return null;

        $publicFile = public_path($path);
        if (is_file($publicFile)) {
            if (! $forPdf) return asset($path);
            $mime = mime_content_type($publicFile) ?: 'image/png';
            return 'data:'.$mime.';base64,'.base64_encode((string) file_get_contents($publicFile));
        }

        if (! Storage::disk('public')->exists($path)) return null;
        if (! $forPdf) return Storage::disk('public')->url($path);

        $mime = Storage::disk('public')->mimeType($path) ?: 'image/png';
        return 'data:'.$mime.';base64,'.base64_encode(Storage::disk('public')->get($path));
    };

    $carrierLogo = $imageSource($value('carrier_logo'));
    $carrierStamp = $imageSource($value('carrier_stamp'));
    $shipperSignature = $imageSource($value('shipper_signature'));
    $carrierSignature = $imageSource($value('carrier_signature'));
    $rateText = trim((string) $value('rate'));
    $freightText = $hasAmount($value('freight_charge')) ? $decimal($value('freight_charge')) : ($rateText !== '' && ! is_numeric($rateText) ? $rateText : '');
@endphp

<section class="awb-page awb-page--front" aria-label="Air Waybill {{ $value('awb_number') }}">
    <div class="awb-perforation">STAPLE DOCUMENT ABOVE PERFORATION</div>

    <table class="awb-number-strip">
        <tr>
            <td class="awb-number-strip__prefix" data-awb-preview="airline_prefix">{{ $value('airline_prefix') }}</td>
            <td class="awb-number-strip__carrier">KBL</td>
            <td class="awb-number-strip__serial" data-awb-preview="serial_number">{{ $value('serial_number') }}</td>
            <td class="awb-number-strip__full" data-awb-preview="awb_number">{{ $value('awb_number') }}</td>
        </tr>
    </table>

    <table class="awb-grid awb-grid--header">
        <tr>
            <td class="awb-half awb-cell awb-party-cell">
                <span class="awb-label">Shipper's Name and Address</span>
                <strong class="awb-party-name" data-awb-preview="shipper_name">{{ $value('shipper_name') }}</strong>
                <span class="awb-preline" data-awb-preview="shipper_address">{{ $value('shipper_address') }}</span>
                <span data-awb-preview="shipper_phone">{{ $value('shipper_phone') }}</span>
                @if($value('notify_party'))
                    <span class="awb-notify-line">NOTIFY PARTY: <span data-awb-preview="notify_party">{{ $value('notify_party') }}</span></span>
                @endif
                <div class="awb-account-box">
                    <span class="awb-label">Shipper's Account Number</span>
                    <span data-awb-preview="shipper_account_no">{{ $value('shipper_account_no') }}</span>
                </div>
            </td>
            <td class="awb-half awb-cell awb-title-cell">
                <span class="awb-label">Not negotiable</span>
                <h1>Air Waybill</h1>
                <div class="awb-issued-by">
                    <span>Issued by</span>
                    <strong data-awb-preview="carrier_name">{{ $value('carrier_name') }}</strong>
                    <strong data-awb-preview="carrier_name">{{ $value('carrier_name') }}</strong>
                </div>
            </td>
        </tr>
    </table>

    <table class="awb-grid awb-grid--consignee">
        <tr>
            <td class="awb-half awb-cell awb-party-cell">
                <span class="awb-label">Consignee's Name and Address</span>
                <strong class="awb-party-name" data-awb-preview="consignee_name">{{ $value('consignee_name') }}</strong>
                <span class="awb-preline" data-awb-preview="consignee_address">{{ $value('consignee_address') }}</span>
                <span data-awb-preview="consignee_phone">{{ $value('consignee_phone') }}</span>
                <div class="awb-account-box">
                    <span class="awb-label">Consignee's Account Number</span>
                    <span data-awb-preview="consignee_account_no">{{ $value('consignee_account_no') }}</span>
                </div>
            </td>
            <td class="awb-half awb-cell awb-contract-cell">
                <div class="awb-originals-note">Copies 1, 2 and 3 of this Air Waybill are originals and have the same validity</div>
                <p>It is agreed that the goods described herein are accepted in apparent good order and condition (except as noted) for carriage SUBJECT TO THE CONDITIONS OF CONTRACT ON THE REVERSE HEREOF. ALL GOODS MAY BE CARRIED BY ANY OTHER MEANS INCLUDING ROAD OR ANY OTHER CARRIER UNLESS SPECIFIC CONTRARY INSTRUCTIONS ARE GIVEN HEREON BY THE SHIPPER.</p>
            </td>
        </tr>
    </table>

    <table class="awb-grid awb-grid--agent">
        <tr>
            <td class="awb-half awb-cell awb-agent-cell">
                <div class="awb-agent-name">
                    <span class="awb-label">Issuing Carrier's Agent Name and City</span>
                    <span class="awb-preline awb-agent-value" data-awb-preview="issuing_agent">{{ $value('issuing_agent') }}</span>
                </div>
                <table class="awb-agent-codes">
                    <tr>
                        <td><span class="awb-label">Agents IATA Code</span><strong data-awb-preview="iata_code">{{ $value('iata_code') }}</strong></td>
                        <td><span class="awb-label">Account No.</span><strong data-awb-preview="agent_account_no">{{ $value('agent_account_no') }}</strong></td>
                    </tr>
                </table>
            </td>
            <td class="awb-half awb-cell awb-accounting-cell">
                <span class="awb-label">Accounting Information</span>
                <span class="awb-preline" data-awb-preview="accounting_information">{{ $value('accounting_information') }}</span>
            </td>
        </tr>
    </table>

    <table class="awb-grid awb-grid--departure-ref">
        <tr>
            <td class="awb-half awb-cell">
                <span class="awb-label">Airport of Departure (Addr. of First Carrier) and Requested Routing</span>
                <strong data-awb-preview="departure_airport">{{ $value('departure_airport') }}</strong>
            </td>
            <td class="awb-half awb-cell awb-reference-cell">
                <span class="awb-label">Reference Number</span>
                <span data-awb-preview="reference_number">{{ $value('reference_number') }}</span>
                <span class="awb-optional-label">Optional Shipping Information</span>
            </td>
        </tr>
    </table>

    <table class="awb-routing-table">
        <colgroup>
            <col style="width:4.5%"><col style="width:9%"><col style="width:17.5%"><col style="width:5%"><col style="width:9.5%"><col style="width:5%"><col style="width:9.5%"><col style="width:7.5%"><col style="width:5%"><col style="width:7%"><col style="width:7%"><col style="width:11.5%"><col style="width:11%">
        </colgroup>
        <tr>
            <td><span class="awb-label">To</span><strong>IST</strong></td>
            <td><span class="awb-label">By First Carrier</span><strong data-awb-preview="first_carrier">{{ $value('first_carrier') }}</strong></td>
            <td><span class="awb-label">Routing and Destination</span><strong data-awb-preview="requested_routing">{{ $value('requested_routing') }}</strong></td>
            <td><span class="awb-label">to</span><strong>DEL</strong></td>
            <td><span class="awb-label">by</span><strong data-awb-preview="first_carrier">{{ $value('first_carrier') }}</strong></td>
            <td><span class="awb-label">to</span></td>
            <td><span class="awb-label">by</span></td>
            <td><span class="awb-label">Currency</span><strong data-awb-preview="currency">{{ $value('currency') }}</strong></td>
            <td><span class="awb-label">ChgsC</span><strong>PP</strong></td>
            <td><span class="awb-label">WT/Val</span><strong>PPD</strong></td>
            <td><span class="awb-label">Other</span><strong>PPD</strong></td>
            <td><span class="awb-label">Declared Value for Carriage</span><strong data-awb-preview="declared_value_carriage">{{ $value('declared_value_carriage') }}</strong></td>
            <td><span class="awb-label">Declared Value for Customs</span><strong data-awb-preview="declared_value_customs">{{ $value('declared_value_customs') }}</strong></td>
        </tr>
    </table>

    <table class="awb-flight-table">
        <tr>
            <td class="awb-flight-table__destination"><span class="awb-label">Airport of Destination</span><strong data-awb-preview="airport_destination">{{ $value('airport_destination', $value('destination_airport')) }}</strong></td>
            <td class="awb-flight-table__flight"><span class="awb-label">Requested Flight/Date</span><strong><span data-awb-preview="flight_no">{{ $value('flight_no') }}</span> <span data-awb-preview="flight_date">{{ $shortDate('flight_date') }}</span></strong></td>
            <td class="awb-flight-table__insurance"><span class="awb-label">Amount of Insurance</span><strong data-awb-preview="insurance_amount">{{ $value('insurance_amount') }}</strong></td>
            <td class="awb-flight-table__notice">INSURANCE - If carrier offers insurance and such insurance is requested, indicate amount to be insured in figures in box marked "Amount of Insurance".</td>
        </tr>
    </table>

    <div class="awb-handling-cell awb-cell">
        <span class="awb-label">Handling Information</span>
        <span class="awb-preline" data-awb-preview="handling_information">{{ $value('handling_information') }}</span>
        <div class="awb-sci-box"><span>SCI</span><strong>T1</strong></div>
    </div>

    <table class="awb-cargo-table">
        <colgroup>
            <col style="width:6.6%"><col style="width:13.7%"><col style="width:2.8%"><col class="awb-spacer-col" style="width:1.2%"><col style="width:9.3%"><col class="awb-spacer-col" style="width:1.2%"><col style="width:13.2%"><col class="awb-spacer-col" style="width:1.2%"><col style="width:13.3%"><col class="awb-spacer-col" style="width:1.2%"><col style="width:13.2%"><col class="awb-spacer-col" style="width:1.2%"><col style="width:23%">
        </colgroup>
        <thead>
            <tr>
                <th>No. of<br>Pieces<br>RCP</th>
                <th>Gross<br>Weight</th>
                <th>K<br>lb</th>
                <th></th>
                <th>Rate Class<br><span>Commodity<br>Item No.</span></th>
                <th></th>
                <th>Chargeable<br>Weight</th>
                <th></th>
                <th>Rate<br><span>Charge</span></th>
                <th></th>
                <th>Total</th>
                <th></th>
                <th>Nature and Quantity of Goods<br><span>(incl. Dimensions or Volume)</span></th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td data-awb-preview="pieces">{{ $value('pieces') }}</td>
                <td data-awb-preview="gross_weight">{{ $decimal($value('gross_weight')) }}</td>
                <td data-awb-preview="rate_class">{{ $value('rate_class') }}</td>
                <td class="awb-spacer-cell"></td>
                <td><span data-awb-preview="commodity_item_no">{{ $value('commodity_item_no') }}</span></td>
                <td class="awb-spacer-cell"></td>
                <td data-awb-preview="chargeable_weight">{{ $decimal($value('chargeable_weight')) }}</td>
                <td class="awb-spacer-cell"></td>
                <td><span data-awb-preview="rate">{{ $rateText }}</span></td>
                <td class="awb-spacer-cell"></td>
                <td><span data-awb-preview="freight_charge">{{ $freightText }}</span></td>
                <td class="awb-spacer-cell"></td>
                <td><strong data-awb-preview="commodity_description">{{ $value('commodity_description') }}</strong><span class="awb-preline" data-awb-preview="dimensions">{{ $value('dimensions') }}</span></td>
            </tr>
        </tbody>
    </table>

    <table class="awb-bottom-table">
        <tr>
            <td class="awb-bottom-table__charges">
                <table class="awb-charge-table">
                    <tr><td><span>Prepaid</span><strong data-awb-preview="freight_charge_prepaid">{{ $value('total_collect') > 0 ? '' : $freightText }}</strong></td><td><span>Weight Charge</span></td><td><span>Collect</span><strong data-awb-preview="freight_charge_collect">{{ $value('total_collect') > 0 ? $freightText : '' }}</strong></td></tr>
                    <tr><td colspan="3"><span>Valuation Charge</span><strong data-awb-preview="valuation_charge">{{ $charge($value('valuation_charge')) }}</strong></td></tr>
                    <tr><td colspan="3"><span>Tax</span><strong data-awb-preview="tax">{{ $charge($value('tax')) }}</strong></td></tr>
                    <tr><td colspan="3"><span>Total other Charges Due Agent</span><strong data-awb-preview="other_agent_charge">{{ $charge($value('other_agent_charge')) }}</strong></td></tr>
                    <tr><td colspan="3"><span>Total other Charges Due Carrier</span><strong data-awb-preview="other_carrier_charge">{{ $charge($value('other_carrier_charge')) }}</strong></td></tr>
                    <tr class="awb-charge-table__blank"><td colspan="3"></td></tr>
                    <tr><td colspan="2"><span>Total Prepaid</span><strong data-awb-preview="total_prepaid">{{ $charge($value('total_prepaid')) }}</strong></td><td><span>Total Collect</span><strong data-awb-preview="total_collect">{{ $charge($value('total_collect')) }}</strong></td></tr>
                    <tr><td colspan="2"><span>Currency Conversion Rates</span><strong data-awb-preview="currency_conversion">{{ $charge($value('currency_conversion')) }}</strong></td><td><span>CC charges in Dest. Currency</span></td></tr>
                    <tr><td colspan="2"><span>For Carrier Use only<br>at Destination</span></td><td><span>Charges at Destination</span><strong data-awb-preview="charges_at_destination">{{ $charge($value('charges_at_destination')) }}</strong></td></tr>
                </table>
            </td>
            <td class="awb-bottom-table__signatures">
                <div class="awb-signature-spacer"></div>
                <div class="awb-certification">
                    Shipper certifies that the particulars on the face hereof are correct and that insofar as any part of the consignment contains dangerous goods such part is properly described by name and is in proper condition for carriage by air according to the applicable Dangerous Goods Regulations.
                </div>
                <div class="awb-shipper-signature-area">
                    <strong data-awb-preview="shipper_name">{{ $value('shipper_name') }}</strong>
                    <img src="{{ $shipperSignature }}" data-awb-preview-image="shipper_signature" alt="Shipper signature" @if(! $shipperSignature) hidden @endif>
                    <span>Signature of Shipper or his Agent</span>
                </div>
                <div class="awb-carrier-execution">
                    <div class="awb-carrier-assets">
                        <img class="awb-carrier-stamp" src="{{ $carrierStamp }}" data-awb-preview-image="carrier_stamp" alt="Carrier stamp" @if(! $carrierStamp) hidden @endif>
                    </div>
                    <img class="awb-carrier-signature" src="{{ $carrierSignature }}" data-awb-preview-image="carrier_signature" alt="Carrier signature" @if(! $carrierSignature) hidden @endif>
                    <div class="awb-execution-line">
                        <span>Executed on <strong data-awb-preview="issued_date">{{ $longDate('issued_date') }}</strong> (Date)</span>
                        <span>at <strong data-awb-preview="issued_place">{{ $value('issued_place') }}</strong> (Place)</span>
                        <span>Signature of Issuing Carrier or its Agent</span>
                    </div>
                </div>
            </td>
        </tr>
    </table>

    <div class="awb-footer-number" data-awb-preview="awb_number">{{ $value('awb_number') }}</div>
</section>

@if($includeTerms)
    <x-awb.terms />
@endif
