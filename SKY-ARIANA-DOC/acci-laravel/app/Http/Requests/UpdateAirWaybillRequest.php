<?php

namespace App\Http\Requests;

use App\Models\AirWaybill;

class UpdateAirWaybillRequest extends AirWaybillRequest
{
    public function rules(): array
    {
        $airWaybill = $this->route('air_waybill') ?? $this->route('airWaybill');
        $id = is_object($airWaybill) ? $airWaybill->getKey() : $airWaybill;

        return $this->awbRules($id);
    }
}
