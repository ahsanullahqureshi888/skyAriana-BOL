<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SavedCompany extends Model
{
    use HasFactory;

    protected $fillable = [
        'type',
        'company_name',
        'address',
        'phone',
        'email',
        'gst_no',
        'fssai_no',
        'iec_code',
    ];
}
