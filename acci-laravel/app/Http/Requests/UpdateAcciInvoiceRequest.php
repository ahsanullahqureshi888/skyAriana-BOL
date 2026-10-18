<?php

namespace App\Http\Requests;

use App\Models\AcciInvoice;

class UpdateAcciInvoiceRequest extends AcciInvoiceRequest
{
    public function rules(): array
    {
        $invoice = $this->route('acci_invoice') ?? $this->route('acciInvoice');
        $id = is_object($invoice) ? $invoice->getKey() : $invoice;

        return $this->invoiceRules($id);
    }
}
