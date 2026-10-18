<?php

namespace Tests\Feature;

use App\Models\ShippingSticker;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ShippingStickerModuleTest extends TestCase
{
    use RefreshDatabase;

    public function test_sticker_index_and_create_screen_are_available(): void
    {
        $response = $this->get(route('shipping-stickers.index'));
        $response->assertOk();
        $response->assertSee('Shipping Stickers');

        $createResponse = $this->get(route('shipping-stickers.create'));
        $createResponse->assertOk();
        $createResponse->assertSee('Create Shipping Sticker');
    }

    public function test_shipping_sticker_is_created(): void
    {
        $payload = [
            'sticker_no' => 'STK-000101',
            'sticker_date' => '2026-07-28',
            'exporter_name' => 'Pahlawan Noori LTD',
            'exporter_address' => 'Shorandam, Industrial Park Kandahar Afghanistan',
            'exporter_phone' => '+93707070975',
            'exporter_licence_no' => '27-1173',
            'importer_name' => 'Uttam Chand Rakesh Kumar Private Limited',
            'importer_address' => "573, Katra Ishwar Bhawan, Khari, Baoli\nDelhi-110006(India)",
            'importer_gst' => '07AADCU4808L1Z2',
            'importer_fssai' => '13324999000404',
            'importer_phone' => '011-45784868',
            'importer_email' => 'akshaykbhatia@hotmail.com',
            'importer_pan' => 'AADCU4808L',
            'commodity_name' => 'BLACK RAISINS',
            'net_wt' => '16 Kg',
            'date_of_packing' => 'JUL / 2026',
            'date_of_expiry' => 'JUL / 2028',
        ];

        $response = $this->post(route('shipping-stickers.store'), $payload);

        $stk = ShippingSticker::first();
        $this->assertNotNull($stk);
        $this->assertEquals('STK-000101', $stk->sticker_no);
        $this->assertEquals('BLACK RAISINS', $stk->commodity_name);

        $response->assertRedirect(route('shipping-stickers.show', $stk));
    }

    public function test_pdf_download_is_generated(): void
    {
        $stk = ShippingSticker::create([
            'sticker_no' => 'STK-000101',
            'sticker_date' => '2026-07-28',
            'exporter_name' => 'Pahlawan Noori LTD',
            'exporter_address' => 'Kandahar',
            'importer_name' => 'Uttam Chand Rakesh Kumar',
            'importer_address' => 'Delhi',
            'commodity_name' => 'BLACK RAISINS',
            'net_wt' => '16 Kg',
            'date_of_packing' => 'JUL / 2026',
            'date_of_expiry' => 'JUL / 2028',
        ]);

        $response = $this->get(route('shipping-stickers.pdf', $stk));
        $response->assertOk();
        $this->assertEquals('application/pdf', $response->headers->get('content-type'));
    }
}
