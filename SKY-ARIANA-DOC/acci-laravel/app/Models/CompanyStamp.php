<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CompanyStamp extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_name',
        'stamp_image_path',
    ];
}
