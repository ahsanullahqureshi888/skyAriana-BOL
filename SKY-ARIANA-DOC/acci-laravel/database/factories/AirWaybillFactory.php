<?php

namespace Database\Factories;

use App\Models\AirWaybill;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AirWaybill>
 */
class AirWaybillFactory extends Factory
{
    protected $model = AirWaybill::class;

    public function definition(): array
    {
        $serial = str_pad((string) $this->faker->unique()->numberBetween(10000000, 99999999), 8, '0', STR_PAD_LEFT);

        return [
            'awb_number' => '235-'.$serial,
            'airline_prefix' => '235',
            'serial_number' => $serial,
            'shipper_name' => 'NOODA TRADING',
            'shipper_address' => 'T.L NO:17272 ADD:DASHT BARCHI KABUL-AFGHANISTAN',
            'shipper_phone' => 'AF +93784832323',
            'shipper_account_no' => null,
            'consignee_name' => 'RAJ ENTERPRISES',
            'consignee_address' => "616, 2 FLOOR, KATRA ISHWAR BHAWAN, KHARI BAOLI\nDELHI NORTH DELHI, DELHI 110006, INDIA",
            'consignee_phone' => 'IN +919873852862',
            'consignee_account_no' => null,
            'notify_party' => 'GOLDEN NUTS TRADING L.L.C, M05 SAEED AL QAZ BUILDING, NAIF ROAD, DEIRA, DUBAI-UAE',
            'issuing_agent' => "SKY TRAVEL AND TOURS\nKABUL",
            'iata_code' => '0138110',
            'agent_account_no' => 'C0138110',
            'departure_airport' => 'KABUL AIRPORT',
            'destination_airport' => 'DELHI AIRPORT',
            'requested_routing' => 'IST / DEL',
            'first_carrier' => 'TK',
            'flight_no' => 'TK 0707 / TK 6104',
            'flight_date' => '2026-07-09',
            'currency' => 'USD',
            'declared_value_carriage' => 'NVD',
            'declared_value_customs' => 'NCV',
            'insurance_amount' => 'XXX',
            'handling_information' => 'OSI-DO NOT PUT THE GOODS IN RAIN AND HANDLE WITH CARE HS CODE:',
            'reference_number' => null,
            'accounting_information' => null,
            'airport_destination' => 'DELHI AIRPORT',
            'airport_departure' => 'KABUL AIRPORT',
            'pieces' => 756,
            'gross_weight' => 8316,
            'chargeable_weight' => 8316,
            'weight_unit' => 'KG',
            'rate_class' => 'K',
            'commodity_item_no' => null,
            'commodity_description' => 'DRY FIGS GRADE C',
            'dimensions' => '48.0 x 29.0 x 16.0 cm / 756',
            'rate' => 'As Agreed',
            'freight_charge' => 0,
            'valuation_charge' => 0,
            'tax' => 0,
            'other_agent_charge' => 0,
            'other_carrier_charge' => 0,
            'total_prepaid' => 0,
            'total_collect' => 0,
            'charges_at_destination' => 0,
            'currency_conversion' => 0,
            'carrier_name' => 'TURKISH AIRLINES INC',
            'shipper_signature' => null,
            'carrier_signature' => null,
            'issued_place' => 'KABUL',
            'issued_date' => '2026-07-12',
            'carrier_logo' => 'images/awb/turkish-cargo-logo.png',
            'carrier_stamp' => null,
            'status' => 'issued',
            'remarks' => null,
        ];
    }
}
