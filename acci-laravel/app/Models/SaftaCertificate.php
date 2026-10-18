<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SaftaCertificate extends Model
{
    use HasFactory;

    protected $fillable = [
        'certificate_no',
        'reference_no',
        'issued_in_country',
        'acci_control_no',
        'exporter_name',
        'exporter_address',
        'consignee_name',
        'consignee_address',
        'transport_route',
        'hs_code',
        'marks_and_numbers',
        'commodity_description',
        'origin_criterion',
        'gross_weight',
        'invoice_no_and_date',
        'fob_value_details',
        'producing_country',
        'importing_country',
        'declaration_date',
        'certification_date',
        'stamp_image',
        'signature_image',
    ];

    protected $casts = [
        'declaration_date' => 'date',
        'certification_date' => 'date',
    ];
}
