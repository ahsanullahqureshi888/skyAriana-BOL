@extends('layouts.app')

@section('title', 'Edit '.$airWaybill->awb_number)

@section('content')
    <header class="d-flex flex-wrap align-items-end justify-content-between gap-3 mb-4 no-print">
        <div>
            <p class="page-kicker">Air Waybill</p>
            <h1 class="page-title">Edit {{ $airWaybill->awb_number }}</h1>
            <p class="page-subtitle">Update the shipment and verify the print-ready front page before saving.</p>
        </div>
        <a class="btn btn-outline-secondary" href="{{ route('air-waybills.show', $airWaybill) }}">Cancel editing</a>
    </header>

    @include('air-waybills._form', [
        'action' => route('air-waybills.update', $airWaybill),
        'method' => 'PUT',
        'submitLabel' => 'Update AWB',
        'cancelUrl' => route('air-waybills.show', $airWaybill),
    ])
@endsection
