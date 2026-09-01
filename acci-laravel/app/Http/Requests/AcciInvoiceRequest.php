<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

abstract class AcciInvoiceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    protected function invoiceRules(?int $ignoreId = null): array
    {
        $uniqueInvoiceNumber = Rule::unique('acci_invoices', 'invoice_no');

        if ($ignoreId !== null) {
            $uniqueInvoiceNumber->ignore($ignoreId);
        }

        return [
            'acci_no' => ['nullable', 'string', 'max:40'],
            'invoice_no' => ['required', 'string', 'max:40', 'regex:/^[A-Z0-9-]+$/', $uniqueInvoiceNumber],
            'invoice_date' => ['required', 'date'],
            'seller_name' => ['required', 'string', 'max:255'],
            'seller_address' => ['required', 'string', 'max:2000'],
            'seller_phone' => ['nullable', 'string', 'max:80'],
            'seller_email' => ['nullable', 'email:rfc', 'max:255'],
            'buyer_name' => ['required', 'string', 'max:255'],
            'buyer_address' => ['required', 'string', 'max:2000'],
            'airway_bill_no' => ['nullable', 'string', 'max:80'],
            'airway_bill_date' => ['nullable', 'date'],
            'payment_terms' => ['nullable', 'string', 'max:1000'],
            'advance_payment' => ['nullable', 'string', 'max:120'],
            'lc_number' => ['nullable', 'string', 'max:100'],
            'collection_basis' => ['nullable', 'string', 'max:160'],
            'transport_route' => ['nullable', 'string', 'max:1500'],
            'commodity' => ['required', 'string'],
            'quantity_cartons' => ['required', 'integer', 'min:1', 'max:100000000'],
            'quantity_weight' => ['required', 'numeric', 'gt:0', 'max:999999999999.999'],
            'unit_price' => ['required', 'numeric', 'gt:0', 'max:99999999999.9999'],
            'total_price' => ['required', 'numeric', 'gt:0', 'max:9999999999999.99'],
            'country_of_origin' => ['required', 'string', 'max:120'],
            'reg_no' => ['nullable', 'string', 'max:100'],
            'fee_no' => ['nullable', 'string', 'max:100'],
            'received_amount' => ['nullable', 'numeric', 'min:0', 'max:9999999999999.99'],
            'received_date' => ['nullable', 'string', 'required_with:received_amount'],
            'authorized_person' => ['nullable', 'string', 'max:255'],
            'stamp_image' => ['nullable', 'image', 'mimes:png,jpg,jpeg,webp', 'max:4096', 'dimensions:max_width=3000,max_height=3000'],
            'signature_image' => ['nullable', 'image', 'mimes:png,jpg,jpeg,webp', 'max:4096', 'dimensions:max_width=3000,max_height=3000'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $invoiceNumber = strtoupper(trim((string) $this->input('invoice_no')));
        $weight = (float) $this->input('quantity_weight', 0);
        $unitPrice = (float) $this->input('unit_price', 0);
        $inputTotal = (float) $this->input('total_price', 0);

        $this->merge([
            'invoice_no' => $invoiceNumber,
            'total_price' => $inputTotal > 0 ? $inputTotal : round($weight * $unitPrice, 2),
            'country_of_origin' => trim((string) $this->input('country_of_origin', 'Afghanistan')),
        ]);
    }
}
