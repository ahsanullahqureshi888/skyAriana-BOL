<?php

namespace Tests\Feature;

use App\Models\AcciPackingList;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AcciPackingListModuleTest extends TestCase
{
    use RefreshDatabase;

    public function test_packing_list_index_and_create_screen_are_available(): void
    {
        $response = $this->get(route('acci-packing-lists.index'));
        $response->assertOk();
        $response->assertSee('ACCI Packing Lists');

        $createResponse = $this->get(route('acci-packing-lists.create'));
        $createResponse->assertOk();
        $createResponse->assertSee('Create ACCI Packing List');
    }

    public function test_packing_list_is_created_with_custom_details(): void
    {
        $payload = [
            'packing_list_no' => '011',
            'packing_list_date' => '2026-07-18',
            'seller_name' => 'PAHLAWAN NOORI LTD',
            'seller_address' => 'T.L NO: 1173-27 SHORANDAM INDUSTRIAL AREA KANDAHAR AFGHANISTAN.',
            'seller_phone' => '+93707 070 975',
            'buyer_name' => 'S.V INTERNATIONAL',
            'buyer_address' => '71 GANDHI GALI, KHARI, BAOLI DELHI-110006(INDIA)',
            'buyer_phone' => '+919999494148',
            'buyer_gst' => '07ACPFS5791R1ZU',
            'buyer_fssai' => '13324999000209',
            'buyer_iec' => '0514045841',
            'commodity' => 'BLACK RAISINS GRADE 1',
            'quantity_cartons' => 412,
            'carton_dimensions' => '47 x 30 x 25 cm',
            'volume_per_carton' => '0.035 CBM',
            'net_weight' => 6592,
            'gross_weight' => 7004,
            'total_volume' => '14.52 CBM',
            'country_of_origin' => 'Afghanistan',
            'transport_route' => 'Via: BY AIR FROM HAMID KARZAI AIRPORT TO INDIA',
        ];

        $response = $this->post(route('acci-packing-lists.store'), $payload);

        $pl = AcciPackingList::first();
        $this->assertNotNull($pl);
        $this->assertEquals('011', $pl->packing_list_no);
        $this->assertEquals('BLACK RAISINS GRADE 1', $pl->commodity);
        $this->assertEquals(412, $pl->quantity_cartons);

        $response->assertRedirect(route('acci-packing-lists.show', $pl));
    }

    public function test_pdf_download_is_generated(): void
    {
        $pl = AcciPackingList::create([
            'packing_list_no' => '011',
            'packing_list_date' => '2026-07-18',
            'seller_name' => 'PAHLAWAN NOORI LTD',
            'seller_address' => 'Kandahar',
            'buyer_name' => 'S.V INTERNATIONAL',
            'buyer_address' => 'Delhi',
            'commodity' => 'BLACK RAISINS GRADE 1',
            'quantity_cartons' => 412,
            'net_weight' => 6592,
            'gross_weight' => 7004,
            'total_volume' => '14.52 CBM',
        ]);

        $response = $this->get(route('acci-packing-lists.pdf', $pl));
        $response->assertOk();
        $this->assertEquals('application/pdf', $response->headers->get('content-type'));
    }
}
