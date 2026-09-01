<?php

namespace App\Http\Requests;

class StoreAcciInvoiceRequest extends AcciInvoiceRequest
{
    public function rules(): array
    {
        return $this->invoiceRules();
    }
}
