<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAcciPackingListRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $packingList = $this->route('acci_packing_list') ?? $this->route('acciPackingList');
        $id = is_object($packingList) ? $packingList->id : $packingList;

        return [
            'packing_list_no' => ['required', 'string', 'max:50', Rule::unique('acci_packing_lists', 'packing_list_no')->ignore($id)],
            'packing_list_date' => ['required', 'date'],
            'seller_name' => ['required', 'string', 'max:255'],
            'seller_address' => ['required', 'string'],
            'seller_phone' => ['nullable', 'string', 'max:100'],
            'seller_email' => ['nullable', 'email', 'max:255'],
            'buyer_name' => ['required', 'string', 'max:255'],
            'buyer_address' => ['required', 'string'],
            'buyer_phone' => ['nullable', 'string', 'max:100'],
            'buyer_gst' => ['nullable', 'string', 'max:100'],
            'buyer_fssai' => ['nullable', 'string', 'max:100'],
            'buyer_iec' => ['nullable', 'string', 'max:100'],
            'airway_bill_no' => ['nullable', 'string', 'max:100'],
            'airway_bill_date' => ['nullable', 'date'],
            'payment_terms' => ['nullable', 'string'],
            'lc_number' => ['nullable', 'string', 'max:100'],
            'collection_basis' => ['nullable', 'string', 'max:100'],
            'transport_route' => ['nullable', 'string'],
            'commodity' => ['required', 'string'],
            'quantity_cartons' => ['required', 'integer', 'min:1'],
            'carton_dimensions' => ['nullable', 'string', 'max:100'],
            'volume_per_carton' => ['nullable', 'string', 'max:100'],
            'net_weight' => ['nullable', 'numeric', 'min:0'],
            'gross_weight' => ['nullable', 'numeric', 'min:0'],
            'total_volume' => ['nullable', 'string', 'max:100'],
            'country_of_origin' => ['nullable', 'string', 'max:100'],
            'authorized_person' => ['nullable', 'string', 'max:255'],
            'stamp_image' => ['nullable', 'image', 'mimes:png,jpg,jpeg,webp', 'max:4096'],
            'signature_image' => ['nullable', 'image', 'mimes:png,jpg,jpeg,webp', 'max:4096'],
        ];
    }
}
