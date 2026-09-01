<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

abstract class AirWaybillRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    protected function awbRules(?int $ignoreId = null): array
    {
        $uniqueAwbNumber = Rule::unique('air_waybills', 'awb_number');

        if ($ignoreId !== null) {
            $uniqueAwbNumber->ignore($ignoreId);
        }

        $money = ['nullable', 'numeric', 'min:0', 'max:9999999999999.99'];

        return [
            'awb_number' => ['required', 'string', 'regex:/^\d{3}-\d{8}$/', $uniqueAwbNumber],
            'airline_prefix' => ['required', 'digits:3'],
            'serial_number' => ['required', 'digits:8'],
            'shipper_name' => ['required', 'string', 'max:255'],
            'shipper_address' => ['required', 'string', 'max:3000'],
            'shipper_phone' => ['nullable', 'string', 'max:80'],
            'shipper_account_no' => ['nullable', 'string', 'max:100'],
            'consignee_name' => ['required', 'string', 'max:255'],
            'consignee_address' => ['required', 'string', 'max:3000'],
            'consignee_phone' => ['nullable', 'string', 'max:80'],
            'consignee_account_no' => ['nullable', 'string', 'max:100'],
            'notify_party' => ['nullable', 'string', 'max:3000'],
            'issuing_agent' => ['nullable', 'string', 'max:1000'],
            'iata_code' => ['nullable', 'string', 'max:40'],
            'agent_account_no' => ['nullable', 'string', 'max:100'],
            'departure_airport' => ['required', 'string', 'max:255'],
            'destination_airport' => ['required', 'string', 'max:255'],
            'requested_routing' => ['nullable', 'string', 'max:255'],
            'first_carrier' => ['nullable', 'string', 'max:80'],
            'flight_no' => ['nullable', 'string', 'max:120'],
            'flight_date' => ['nullable', 'date'],
            'currency' => ['required', 'string', 'size:3', 'regex:/^[A-Z]{3}$/'],
            'declared_value_carriage' => ['nullable', 'string', 'max:60'],
            'declared_value_customs' => ['nullable', 'string', 'max:60'],
            'insurance_amount' => ['nullable', 'string', 'max:60'],
            'handling_information' => ['nullable', 'string', 'max:3000'],
            'reference_number' => ['nullable', 'string', 'max:120'],
            'accounting_information' => ['nullable', 'string', 'max:3000'],
            'airport_destination' => ['nullable', 'string', 'max:255'],
            'airport_departure' => ['nullable', 'string', 'max:255'],
            'pieces' => ['required', 'integer', 'min:1', 'max:100000000'],
            'gross_weight' => ['required', 'numeric', 'gt:0', 'max:999999999999.999'],
            'chargeable_weight' => ['required', 'numeric', 'gt:0', 'max:999999999999.999'],
            'weight_unit' => ['required', 'string', 'max:8'],
            'rate_class' => ['nullable', 'string', 'max:30'],
            'commodity_item_no' => ['nullable', 'string', 'max:80'],
            'commodity_description' => ['required', 'string', 'max:3000'],
            'dimensions' => ['nullable', 'string', 'max:1000'],
            'rate' => ['nullable', 'string', 'max:40'],
            'freight_charge' => $money,
            'valuation_charge' => $money,
            'tax' => $money,
            'other_agent_charge' => $money,
            'other_carrier_charge' => $money,
            'total_prepaid' => $money,
            'total_collect' => $money,
            'charges_at_destination' => $money,
            'currency_conversion' => ['nullable', 'numeric', 'min:0', 'max:999999999.999999'],
            'charge_settlement' => ['required', Rule::in(['prepaid', 'collect'])],
            'carrier_name' => ['nullable', 'string', 'max:255'],
            'issued_place' => ['nullable', 'string', 'max:255'],
            'issued_date' => ['nullable', 'date'],
            'status' => ['required', Rule::in(['draft', 'issued', 'cancelled'])],
            'remarks' => ['nullable', 'string', 'max:3000'],
            'carrier_logo' => ['nullable', 'image', 'mimes:png,jpg,jpeg,webp', 'max:5120', 'dimensions:max_width=4000,max_height=4000'],
            'carrier_stamp' => ['nullable', 'image', 'mimes:png,jpg,jpeg,webp', 'max:5120', 'dimensions:max_width=4000,max_height=4000'],
            'shipper_signature' => ['nullable', 'image', 'mimes:png,jpg,jpeg,webp', 'max:5120', 'dimensions:max_width=4000,max_height=4000'],
            'carrier_signature' => ['nullable', 'image', 'mimes:png,jpg,jpeg,webp', 'max:5120', 'dimensions:max_width=4000,max_height=4000'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $prefix = preg_replace('/\D/', '', (string) $this->input('airline_prefix')) ?: '';
        $serial = preg_replace('/\D/', '', (string) $this->input('serial_number')) ?: '';
        $awbNumber = trim((string) $this->input('awb_number'));

        if (preg_match('/^(\d{3})-(\d{8})$/', $awbNumber, $matches) === 1) {
            $prefix = $matches[1];
            $serial = $matches[2];
        } elseif (strlen($prefix) === 3 && strlen($serial) === 8) {
            $awbNumber = $prefix.'-'.$serial;
        }

        $this->merge([
            'awb_number' => $awbNumber,
            'airline_prefix' => $prefix,
            'serial_number' => $serial,
            'currency' => strtoupper(trim((string) $this->input('currency', 'USD'))),
            'weight_unit' => strtoupper(trim((string) $this->input('weight_unit', 'KG'))),
            'status' => strtolower(trim((string) $this->input('status', 'draft'))),
        ]);
    }
}
