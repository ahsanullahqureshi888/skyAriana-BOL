<?php

namespace Tests\Feature;

use App\Models\SaftaCertificate;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SaftaCertificateModuleTest extends TestCase
{
    use RefreshDatabase;

    public function test_safta_certificate_index_and_create_screen_are_available(): void
    {
        $response = $this->get(route('safta-certificates.index'));
        $response->assertStatus(200);

        $createResponse = $this->get(route('safta-certificates.create'));
        $createResponse->assertStatus(200);
    }

    public function test_safta_certificate_is_created(): void
    {
        $payload = [
            'certificate_no' => 'SAFTA-2026-0001',
            'reference_no' => '21229',
            'issued_in_country' => 'AFGHANISTAN',
            'acci_control_no' => '133011',
            'exporter_name' => 'PAHLAWAN NOORI LTD',
            'exporter_address' => "SHORANDAM INDUSTRIAL AREA KANDAHAR AFGHANISTAN",
            'consignee_name' => 'S.V INTERNATIONAL',
            'consignee_address' => "KATRA ISHWAR BHAWAN KHARI BAOLI DELHI-110006",
            'transport_route' => 'VIA: BY AIR FROM HAMID KARZAI AIRPORT TO INDIA',
            'hs_code' => '08062010',
            'marks_and_numbers' => '762 CTNS',
            'commodity_description' => "BLACK RAISINS\nTOTAL N.W = 12192 KGS",
            'origin_criterion' => 'A',
            'gross_weight' => '13182.6 KGS',
            'invoice_no_and_date' => "13\n23/07/2026",
            'fob_value_details' => "31729.68 USD FOB",
            'producing_country' => 'AFGHANISTAN',
            'importing_country' => 'INDIA',
            'declaration_date' => '2026-07-26',
            'certification_date' => '2026-07-26',
        ];

        $response = $this->post(route('safta-certificates.store'), $payload);

        $certificate = SaftaCertificate::where('certificate_no', 'SAFTA-2026-0001')->firstOrFail();
        $response->assertRedirect(route('safta-certificates.show', $certificate));

        $this->assertDatabaseHas('safta_certificates', [
            'certificate_no' => 'SAFTA-2026-0001',
            'reference_no' => '21229',
            'exporter_name' => 'PAHLAWAN NOORI LTD',
        ]);
    }

    public function test_pdf_download_is_generated(): void
    {
        $cert = SaftaCertificate::create([
            'certificate_no' => 'SAFTA-2026-0002',
            'reference_no' => '21230',
            'issued_in_country' => 'AFGHANISTAN',
            'acci_control_no' => '133012',
            'exporter_name' => 'PAHLAWAN NOORI LTD',
            'exporter_address' => "KANDAHAR AFGHANISTAN",
            'consignee_name' => 'S.V INTERNATIONAL',
            'consignee_address' => "DELHI INDIA",
            'transport_route' => 'BY AIR',
            'hs_code' => '08062010',
            'marks_and_numbers' => '500 CTNS',
            'commodity_description' => "GREEN RAISINS",
            'origin_criterion' => 'A',
            'gross_weight' => '5000 KGS',
            'invoice_no_and_date' => "14\n24/07/2026",
            'fob_value_details' => "15000 USD FOB",
            'producing_country' => 'AFGHANISTAN',
            'importing_country' => 'INDIA',
            'declaration_date' => '2026-07-26',
            'certification_date' => '2026-07-26',
        ]);

        $response = $this->get(route('safta-certificates.pdf', $cert));
        $response->assertStatus(200);
        $response->assertHeader('content-type', 'application/pdf');
    }
}
