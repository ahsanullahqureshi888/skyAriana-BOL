<?php

namespace Tests\Feature;

use App\Models\AcciInvoice;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AcciInvoiceModuleTest extends TestCase
{
    use RefreshDatabase;

    public function test_invoice_index_and_create_screen_are_available(): void
    {
        $this->get(route('acci-invoices.index'))->assertOk();
        $this->get(route('acci-invoices.create'))
            ->assertOk()
            ->assertSee('ACCI-120893');
    }

    public function test_invoice_is_created_with_server_calculated_total_and_words(): void
    {
        $response = $this->post(route('acci-invoices.store'), $this->validPayload([
            'total_price' => '1.00',
        ]));

        $invoice = AcciInvoice::query()->sole();

        $response->assertRedirect(route('acci-invoices.show', $invoice));
        $this->assertSame('76090.56', $invoice->total_price);
        $this->assertSame(
            'Seventy-Six Thousand Ninety US Dollars And Fifty-Six Cents Only',
            $invoice->amount_in_words,
        );
    }

    public function test_required_commercial_fields_are_validated(): void
    {
        $this->from(route('acci-invoices.create'))
            ->post(route('acci-invoices.store'), [])
            ->assertRedirect(route('acci-invoices.create'))
            ->assertSessionHasErrors([
                'invoice_no',
                'invoice_date',
                'seller_name',
                'seller_address',
                'buyer_name',
                'buyer_address',
                'commodity',
                'quantity_cartons',
                'quantity_weight',
                'unit_price',
                'total_price',
            ]);
    }

    public function test_invoice_can_be_searched_updated_printed_and_deleted(): void
    {
        $invoice = AcciInvoice::factory()->create(['buyer_name' => 'WAVELON IMPEX']);

        $this->get(route('acci-invoices.index', ['search' => 'WAVELON']))
            ->assertOk()
            ->assertSee($invoice->invoice_no);

        $this->put(route('acci-invoices.update', $invoice), $this->validPayload([
            'invoice_no' => $invoice->invoice_no,
            'commodity' => 'GREEN RAISINS',
        ]))->assertRedirect(route('acci-invoices.show', $invoice));

        $this->assertSame('GREEN RAISINS', $invoice->refresh()->commodity);
        $this->get(route('acci-invoices.print', $invoice))
            ->assertOk()
            ->assertSee('GREEN RAISINS');

        $this->delete(route('acci-invoices.destroy', $invoice))
            ->assertRedirect(route('acci-invoices.index'));
        $this->assertDatabaseMissing('acci_invoices', ['id' => $invoice->id]);
    }

    public function test_uploaded_stamp_is_stored_and_removed_with_invoice(): void
    {
        Storage::fake('public');

        $response = $this->post(route('acci-invoices.store'), $this->validPayload([
            'stamp_image' => UploadedFile::fake()->createWithContent('stamp.png', $this->transparentPng()),
        ]));

        $invoice = AcciInvoice::query()->sole();
        $response->assertRedirect(route('acci-invoices.show', $invoice));
        Storage::disk('public')->assertExists($invoice->stamp_image);

        $path = $invoice->stamp_image;
        $this->delete(route('acci-invoices.destroy', $invoice));
        Storage::disk('public')->assertMissing($path);
    }

    public function test_pdf_download_is_generated(): void
    {
        $invoice = AcciInvoice::factory()->create();

        $response = $this->get(route('acci-invoices.pdf', $invoice))
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');

        preg_match_all('/\/Type\s*\/Page\b/', (string) $response->getContent(), $pageObjects);
        $this->assertCount(1, $pageObjects[0], 'The generated invoice PDF must contain exactly one page.');
    }

    private function validPayload(array $overrides = []): array
    {
        return array_merge([
            'invoice_no' => 'ACCI-120893',
            'invoice_date' => '2026-05-25',
            'seller_name' => 'PAHLAWAN NOORI LTD',
            'seller_address' => 'SHORANDAM INDUSTRIAL AREA, KANDAHAR, AFGHANISTAN',
            'seller_phone' => '+93 707 070 975',
            'seller_email' => 'exports@example.com',
            'buyer_name' => 'S V INTERNATIONAL',
            'buyer_address' => '71 GANDHI GALI, DELHI, INDIA',
            'airway_bill_no' => 'A00002838',
            'airway_bill_date' => '2026-05-25',
            'payment_terms' => 'THIRD PARTY PAYMENTS ACCEPTABLE',
            'advance_payment' => '100% ADVANCE PAYMENT',
            'lc_number' => '',
            'collection_basis' => '',
            'transport_route' => 'BY ROAD FROM KANDAHAR AFGHANISTAN TO INDIA',
            'commodity' => 'BLACK RAISINS (BEST)',
            'quantity_cartons' => 1407,
            'quantity_weight' => 22512,
            'unit_price' => 3.38,
            'total_price' => 76090.56,
            'country_of_origin' => 'Afghanistan',
            'reg_no' => '18398',
            'fee_no' => '16195',
            'received_amount' => 4953,
            'received_date' => '2026-03-14',
            'authorized_person' => 'PAHLAWAN NOORI LTD',
        ], $overrides);
    }

    private function transparentPng(): string
    {
        return base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL5WQAAAABJRU5ErkJggg==');
    }
}
