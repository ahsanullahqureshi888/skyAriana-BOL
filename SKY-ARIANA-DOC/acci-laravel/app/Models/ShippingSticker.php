<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ShippingSticker extends Model
{
    use HasFactory;

    protected $fillable = [
        'sticker_no',
        'sticker_date',
        'exporter_name',
        'exporter_address',
        'exporter_phone',
        'exporter_licence_no',
        'importer_name',
        'importer_address',
        'importer_gst',
        'importer_fssai',
        'importer_phone',
        'importer_email',
        'importer_pan',
        'commodity_name',
        'net_wt',
        'date_of_packing',
        'date_of_expiry',
        'lot_no',
        'transport_mode',
    ];

    protected function casts(): array
    {
        return [
            'sticker_date' => 'date',
        ];
    }
}
