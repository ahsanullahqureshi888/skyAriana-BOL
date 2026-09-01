<?php

namespace App\Services;

use App\Models\AcciPackingList;

class AcciPackingListNumberGenerator
{
    public function next(): string
    {
        $lastNumber = AcciPackingList::query()
            ->where('packing_list_no', 'like', 'PL-%')
            ->orWhere('packing_list_no', 'regexp', '^[0-9]+$')
            ->latest('id')
            ->value('packing_list_no');

        if (! $lastNumber) {
            return 'PL-000011';
        }

        $numericPart = (int) preg_replace('/\D/', '', $lastNumber);
        $nextNumeric = $numericPart + 1;

        return 'PL-'.str_pad((string) $nextNumeric, 6, '0', STR_PAD_LEFT);
    }
}
