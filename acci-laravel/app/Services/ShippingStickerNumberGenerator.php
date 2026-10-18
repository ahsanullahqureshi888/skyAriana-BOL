<?php

namespace App\Services;

use App\Models\ShippingSticker;

class ShippingStickerNumberGenerator
{
    public function next(): string
    {
        $lastNumber = ShippingSticker::query()
            ->where('sticker_no', 'like', 'STK-%')
            ->latest('id')
            ->value('sticker_no');

        if (! $lastNumber) {
            return 'STK-000101';
        }

        $numericPart = (int) preg_replace('/\D/', '', $lastNumber);
        $nextNumeric = $numericPart + 1;

        return 'STK-'.str_pad((string) $nextNumeric, 6, '0', STR_PAD_LEFT);
    }
}
