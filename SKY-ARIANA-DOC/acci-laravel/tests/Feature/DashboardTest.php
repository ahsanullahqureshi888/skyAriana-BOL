<?php

namespace Tests\Feature;

use App\Models\AcciInvoice;
use App\Models\SaftaCertificate;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_renders_all_in_one_suite_and_activity()
    {
        AcciInvoice::factory()->create([
            'invoice_no' => 'INV-TEST-001',
        ]);

        SaftaCertificate::create([
            'certificate_no' => 'SAFTA-2026-0001',
            'reference_no' => 'SAFTA-TEST-001',
            'issued_in_country' => 'AFGHANISTAN',
            'acci_control_no' => '133011',
            'exporter_name' => 'SKY ARIANA LTD',
            'exporter_address' => 'SHORANDAM INDUSTRIAL AREA KANDAHAR AFGHANISTAN',
            'consignee_name' => 'BALAM BAR BARAN',
            'consignee_address' => 'DELHI-110006',
            'transport_route' => 'BY AIR',
            'hs_code' => '08062010',
            'marks_and_numbers' => '762 CTNS',
            'commodity_description' => 'BLACK RAISINS',
            'origin_criterion' => 'A',
            'gross_weight' => '13182.6 KGS',
            'invoice_no_and_date' => '13 23/07/2026',
            'fob_value_details' => '31729.68 USD FOB',
            'producing_country' => 'AFGHANISTAN',
            'importing_country' => 'INDIA',
            'declaration_date' => '2026-07-26',
            'certification_date' => '2026-07-26',
        ]);

        $response = $this->get('/');

        $response->assertStatus(200);
        $response->assertSee('Sky Ariana &amp; Balam Bar Baran Suite', false);
        $response->assertSee('Logistics Document Suite Modules');
        $response->assertSee('INV-TEST-001');
        $response->assertSee('SAFTA-2026-0001');
    }
}
