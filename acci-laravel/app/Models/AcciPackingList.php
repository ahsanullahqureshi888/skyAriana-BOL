<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AcciPackingList extends Model
{
    use HasFactory;

    protected $fillable = [
        'packing_list_no',
        'packing_list_date',
        'seller_name',
        'seller_address',
        'seller_phone',
        'seller_email',
        'buyer_name',
        'buyer_address',
        'buyer_phone',
        'buyer_gst',
        'buyer_fssai',
        'buyer_iec',
        'airway_bill_no',
        'airway_bill_date',
        'payment_terms',
        'lc_number',
        'collection_basis',
        'transport_route',
        'commodity',
        'quantity_cartons',
        'carton_dimensions',
        'volume_per_carton',
        'net_weight',
        'gross_weight',
        'total_volume',
        'country_of_origin',
        'authorized_person',
        'stamp_image',
        'signature_image',
    ];

    protected function casts(): array
    {
        return [
            'packing_list_date' => 'date',
            'airway_bill_date' => 'date',
            'quantity_cartons' => 'integer',
            'net_weight' => 'decimal:3',
            'gross_weight' => 'decimal:3',
        ];
    }

    public function getItemsAttribute(): array
    {
        $raw = $this->attributes['commodity'] ?? '';
        if (str_starts_with(trim($raw), '[')) {
            $decoded = json_decode($raw, true);
            if (is_array($decoded) && count($decoded) > 0) {
                return $decoded;
            }
        }

        return [
            [
                'commodity' => $this->attributes['commodity'] ?? '',
                'quantity_cartons' => $this->attributes['quantity_cartons'] ?? 0,
                'carton_dimensions' => $this->attributes['carton_dimensions'] ?? '',
                'volume_per_carton' => $this->attributes['volume_per_carton'] ?? '',
                'net_weight' => $this->attributes['net_weight'] ?? 0,
                'gross_weight' => $this->attributes['gross_weight'] ?? 0,
            ],
        ];
    }
}
