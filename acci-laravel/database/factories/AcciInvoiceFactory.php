<?php

namespace Database\Factories;

use App\Models\AcciInvoice;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AcciInvoice>
 */
class AcciInvoiceFactory extends Factory
{
    protected $model = AcciInvoice::class;

    public function definition(): array
    {
        $weight = 22_512;
        $unitPrice = 3.38;

        return [
            'invoice_no' => 'ACCI-'.$this->faker->unique()->numberBetween(200000, 999999),
            'invoice_date' => '2026-05-25',
            'seller_name' => 'PAHLAWAN NOORI LTD',
            'seller_address' => "TL NO: 1173-27 SHORANDAM INDUSTRIAL AREA\nKANDAHAR, AFGHANISTAN",
            'seller_phone' => '+93 707 070 975',
            'seller_email' => 'exports@example.com',
            'buyer_name' => 'S V INTERNATIONAL',
            'buyer_address' => "71, GANDHI GALI, FATEHPURI, KHARI BAOLI\nCHANDNI CHOWK, DELHI, 110006 INDIA",
            'airway_bill_no' => 'A00002838',
            'airway_bill_date' => '2026-05-25',
            'payment_terms' => 'THIRD PARTY PAYMENTS ACCEPTABLE',
            'advance_payment' => '100% ADVANCE PAYMENT',
            'lc_number' => null,
            'collection_basis' => null,
            'transport_route' => 'VIA GOODS IN TRANSIT BY ROAD FROM KANDAHAR AFGHANISTAN TO INDIA',
            'commodity' => 'BLACK RAISINS (BEST)',
            'quantity_cartons' => 1407,
            'quantity_weight' => $weight,
            'unit_price' => $unitPrice,
            'total_price' => $weight * $unitPrice,
            'amount_in_words' => 'Seventy-Six Thousand Ninety US Dollars And Fifty-Six Cents Only',
            'country_of_origin' => 'Afghanistan',
            'reg_no' => '18398',
            'fee_no' => '16195',
            'received_amount' => 4953,
            'received_date' => '2026-03-14',
            'authorized_person' => 'PAHLAWAN NOORI LTD',
            'stamp_image' => null,
            'signature_image' => null,
        ];
    }
}
