<?php

namespace App\Services;

use App\Models\AcciInvoice;

class AcciInvoiceNumberGenerator
{
    private const PREFIX = 'ACCI-';

    private const FIRST_NUMBER = 120893;

    public function next(): string
    {
        $lastNumber = AcciInvoice::query()
            ->latest('id')
            ->value('invoice_no');

        $serial = self::FIRST_NUMBER;

        if (is_string($lastNumber) && preg_match('/(\d+)$/', $lastNumber, $matches) === 1) {
            $serial = max(self::FIRST_NUMBER, ((int) $matches[1]) + 1);
        }

        return self::PREFIX.$serial;
    }
}
