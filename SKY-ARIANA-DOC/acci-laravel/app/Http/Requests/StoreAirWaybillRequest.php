<?php

namespace App\Http\Requests;

class StoreAirWaybillRequest extends AirWaybillRequest
{
    public function rules(): array
    {
        return $this->awbRules();
    }
}
