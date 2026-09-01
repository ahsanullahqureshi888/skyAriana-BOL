<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AcciInvoice extends Model
{
    use HasFactory;

    protected $fillable = [
        'acci_no',
        'invoice_no',
        'invoice_date',
        'seller_name',
        'seller_address',
        'seller_phone',
        'seller_email',
        'buyer_name',
        'buyer_address',
        'airway_bill_no',
        'airway_bill_date',
        'payment_terms',
        'advance_payment',
        'lc_number',
        'collection_basis',
        'transport_route',
        'commodity',
        'quantity_cartons',
        'quantity_weight',
        'unit_price',
        'total_price',
        'amount_in_words',
        'country_of_origin',
        'reg_no',
        'fee_no',
        'received_amount',
        'received_date',
        'authorized_person',
        'stamp_image',
        'signature_image',
    ];

    protected function casts(): array
    {
        return [
            'invoice_date' => 'date',
            'airway_bill_date' => 'date',
            // 'received_date' => 'date',
            'quantity_cartons' => 'integer',
            'quantity_weight' => 'decimal:3',
            'unit_price' => 'decimal:4',
            'total_price' => 'decimal:2',
            'received_amount' => 'decimal:2',
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
                'quantity_weight' => $this->attributes['quantity_weight'] ?? 0,
                'unit_price' => $this->attributes['unit_price'] ?? 0,
                'total_price' => $this->attributes['total_price'] ?? 0,
            ],
        ];
    }
}
