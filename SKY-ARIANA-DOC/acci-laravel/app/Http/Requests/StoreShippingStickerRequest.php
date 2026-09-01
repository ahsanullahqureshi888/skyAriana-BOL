<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreShippingStickerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'sticker_no' => ['nullable', 'string', 'max:50'],
            'sticker_date' => ['nullable'],
            'exporter_name' => ['nullable', 'string', 'max:255'],
            'exporter_address' => ['nullable', 'string'],
            'exporter_phone' => ['nullable', 'string', 'max:100'],
            'exporter_licence_no' => ['nullable', 'string', 'max:100'],
            'importer_name' => ['nullable', 'string', 'max:255'],
            'importer_address' => ['nullable', 'string'],
            'importer_gst' => ['nullable', 'string', 'max:100'],
            'importer_fssai' => ['nullable', 'string', 'max:100'],
            'importer_phone' => ['nullable', 'string', 'max:100'],
            'importer_email' => ['nullable', 'string', 'max:255'],
            'importer_pan' => ['nullable', 'string', 'max:100'],
            'commodity_name' => ['nullable', 'string', 'max:255'],
            'net_wt' => ['nullable', 'string', 'max:100'],
            'date_of_packing' => ['nullable', 'string', 'max:100'],
            'date_of_expiry' => ['nullable', 'string', 'max:100'],
            'lot_no' => ['nullable', 'string', 'max:100'],
            'transport_mode' => ['nullable', 'string', 'max:255'],
        ];
    }
}
