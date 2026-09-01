<?php

namespace Tests\Feature;

use App\Models\AirWaybill;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AirWaybillModuleTest extends TestCase
{
    use RefreshDatabase;

    public function test_awb_index_and_create_screen_are_available(): void
    {
        $this->get(route('air-waybills.index'))->assertOk();
        $this->get(route('air-waybills.create'))
            ->assertOk()
            ->assertSee('235-35822254');
    }

    public function test_awb_is_created_with_server_calculated_charges(): void
    {
        $response = $this->post(route('air-waybills.store'), $this->validPayload([
            'chargeable_weight' => 100,
            'rate' => '2.50',
            'freight_charge' => 1,
            'valuation_charge' => 10,
            'tax' => 5,
            'other_agent_charge' => 3,
            'other_carrier_charge' => 2,
            'charge_settlement' => 'prepaid',
        ]));

        $airWaybill = AirWaybill::query()->sole();

        $response->assertRedirect(route('air-waybills.show', $airWaybill));
        $this->assertSame('250.00', $airWaybill->freight_charge);
        $this->assertSame('270.00', $airWaybill->total_prepaid);
        $this->assertSame('0.00', $airWaybill->total_collect);
        $this->assertSame('235', $airWaybill->airline_prefix);
        $this->assertSame('35822254', $airWaybill->serial_number);
    }

    public function test_required_awb_fields_are_validated(): void
    {
        $this->from(route('air-waybills.create'))
            ->post(route('air-waybills.store'), [])
            ->assertRedirect(route('air-waybills.create'))
            ->assertSessionHasErrors([
                'awb_number',
                'airline_prefix',
                'serial_number',
                'shipper_name',
                'shipper_address',
                'consignee_name',
                'consignee_address',
                'departure_airport',
                'destination_airport',
                'pieces',
                'gross_weight',
                'chargeable_weight',
                'commodity_description',
            ]);
    }

    public function test_awb_can_be_searched_updated_printed_duplicated_and_deleted(): void
    {
        $airWaybill = AirWaybill::factory()->create([
            'awb_number' => '235-35822253',
            'airline_prefix' => '235',
            'serial_number' => '35822253',
            'shipper_name' => 'NOODA TRADING',
        ]);

        $this->get(route('air-waybills.index', ['search' => 'NOODA']))
            ->assertOk()
            ->assertSee($airWaybill->awb_number);

        $this->put(route('air-waybills.update', $airWaybill), $this->validPayload([
            'awb_number' => $airWaybill->awb_number,
            'airline_prefix' => $airWaybill->airline_prefix,
            'serial_number' => $airWaybill->serial_number,
            'commodity_description' => 'DRY FIGS GRADE A',
        ]))->assertRedirect(route('air-waybills.show', $airWaybill));

        $this->assertSame('DRY FIGS GRADE A', $airWaybill->refresh()->commodity_description);

        $this->get(route('air-waybills.print', $airWaybill))
            ->assertOk()
            ->assertSee('DRY FIGS GRADE A')
            ->assertSee('CONDITIONS OF CONTRACT');

        $this->post(route('air-waybills.duplicate', $airWaybill))->assertRedirect();
        $duplicate = AirWaybill::query()->whereKeyNot($airWaybill->id)->sole();
        $this->assertSame('235-35822254', $duplicate->awb_number);
        $this->assertSame('draft', $duplicate->status);

        $this->delete(route('air-waybills.destroy', $airWaybill))
            ->assertRedirect(route('air-waybills.index'));
        $this->assertDatabaseMissing('air_waybills', ['id' => $airWaybill->id]);
    }

    public function test_uploaded_transparent_assets_are_stored_and_removed(): void
    {
        Storage::fake('public');

        $response = $this->post(route('air-waybills.store'), $this->validPayload([
            'carrier_stamp' => UploadedFile::fake()->createWithContent('stamp.png', $this->transparentPng()),
            'carrier_signature' => UploadedFile::fake()->createWithContent('signature.png', $this->transparentPng()),
        ]));

        $airWaybill = AirWaybill::query()->sole();
        $response->assertRedirect(route('air-waybills.show', $airWaybill));
        Storage::disk('public')->assertExists($airWaybill->carrier_stamp);
        Storage::disk('public')->assertExists($airWaybill->carrier_signature);

        $stampPath = $airWaybill->carrier_stamp;
        $signaturePath = $airWaybill->carrier_signature;
        $this->delete(route('air-waybills.destroy', $airWaybill));
        Storage::disk('public')->assertMissing($stampPath);
        Storage::disk('public')->assertMissing($signaturePath);
    }

    public function test_pdf_download_contains_front_and_contract_pages(): void
    {
        $airWaybill = AirWaybill::factory()->create();

        $response = $this->get(route('air-waybills.pdf', $airWaybill))
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');

        preg_match_all('/\/Type\s*\/Page\b/', (string) $response->getContent(), $pageObjects);
        $this->assertCount(2, $pageObjects[0], 'The generated Air Waybill PDF must contain the front and contract pages.');
    }

    private function validPayload(array $overrides = []): array
    {
        return array_merge([
            'awb_number' => '235-35822254',
            'airline_prefix' => '235',
            'serial_number' => '35822254',
            'shipper_name' => 'NOODA TRADING',
            'shipper_address' => 'DASHT BARCHI, KABUL, AFGHANISTAN',
            'shipper_phone' => '+93 784 832 323',
            'shipper_account_no' => '',
            'consignee_name' => 'RAJ ENTERPRISES',
            'consignee_address' => 'KHARI BAOLI, DELHI, INDIA',
            'consignee_phone' => '+91 98738 52862',
            'consignee_account_no' => '',
            'notify_party' => 'GOLDEN NUTS TRADING L.L.C, DUBAI, UAE',
            'issuing_agent' => 'SKY TRAVEL AND TOURS, KABUL',
            'iata_code' => '0138110',
            'agent_account_no' => 'C0138110',
            'departure_airport' => 'KABUL AIRPORT',
            'destination_airport' => 'DELHI AIRPORT',
            'requested_routing' => 'IST / DEL',
            'first_carrier' => 'TK',
            'flight_no' => 'TK 0707',
            'flight_date' => '2026-07-09',
            'currency' => 'USD',
            'declared_value_carriage' => 'NVD',
            'declared_value_customs' => 'NCV',
            'insurance_amount' => 'XXX',
            'handling_information' => 'HANDLE WITH CARE',
            'reference_number' => '',
            'accounting_information' => '',
            'airport_destination' => 'DELHI AIRPORT',
            'airport_departure' => 'KABUL AIRPORT',
            'pieces' => 756,
            'gross_weight' => 8316,
            'chargeable_weight' => 8316,
            'weight_unit' => 'KG',
            'rate_class' => 'K',
            'commodity_item_no' => '',
            'commodity_description' => 'DRY FIGS GRADE C',
            'dimensions' => '48 x 29 x 16 cm / 756',
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
            'charge_settlement' => 'prepaid',
            'carrier_name' => 'TURKISH AIRLINES INC',
            'issued_place' => 'KABUL',
            'issued_date' => '2026-07-12',
            'status' => 'issued',
            'remarks' => '',
        ], $overrides);
    }

    private function transparentPng(): string
    {
        return base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL5WQAAAABJRU5ErkJggg==');
    }
}
