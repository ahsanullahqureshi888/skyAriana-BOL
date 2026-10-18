<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AirWaybill extends Model
{
    use HasFactory;

    protected $fillable = [
        'awb_number',
        'airline_prefix',
        'serial_number',
        'shipper_name',
        'shipper_address',
        'shipper_phone',
        'shipper_account_no',
        'consignee_name',
        'consignee_address',
        'consignee_phone',
        'consignee_account_no',
        'notify_party',
        'issuing_agent',
        'iata_code',
        'agent_account_no',
        'departure_airport',
        'destination_airport',
        'requested_routing',
        'first_carrier',
        'flight_no',
        'flight_date',
        'currency',
        'declared_value_carriage',
        'declared_value_customs',
        'insurance_amount',
        'handling_information',
        'reference_number',
        'accounting_information',
        'airport_destination',
        'airport_departure',
        'pieces',
        'gross_weight',
        'chargeable_weight',
        'weight_unit',
        'rate_class',
        'commodity_item_no',
        'commodity_description',
        'dimensions',
        'rate',
        'freight_charge',
        'valuation_charge',
        'tax',
        'other_agent_charge',
        'other_carrier_charge',
        'total_prepaid',
        'total_collect',
        'charges_at_destination',
        'currency_conversion',
        'carrier_name',
        'shipper_signature',
        'carrier_signature',
        'issued_place',
        'issued_date',
        'carrier_logo',
        'carrier_stamp',
        'status',
        'remarks',
    ];

    protected function casts(): array
    {
        return [
            'flight_date' => 'date',
            'issued_date' => 'date',
            'pieces' => 'integer',
            'gross_weight' => 'decimal:3',
            'chargeable_weight' => 'decimal:3',
            'freight_charge' => 'decimal:2',
            'valuation_charge' => 'decimal:2',
            'tax' => 'decimal:2',
            'other_agent_charge' => 'decimal:2',
            'other_carrier_charge' => 'decimal:2',
            'total_prepaid' => 'decimal:2',
            'total_collect' => 'decimal:2',
            'charges_at_destination' => 'decimal:2',
            'currency_conversion' => 'decimal:6',
        ];
    }
}
