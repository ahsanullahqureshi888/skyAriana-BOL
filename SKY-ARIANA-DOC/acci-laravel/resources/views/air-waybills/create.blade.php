@extends('layouts.app')

@section('title', 'Create Air Waybill')

@section('content')
    <header class="d-flex flex-wrap align-items-end justify-content-between gap-3 mb-4 no-print">
        <div>
            <p class="page-kicker">Freight documents</p>
            <h1 class="page-title">Create Air Waybill</h1>
            <p class="page-subtitle">Enter shipment details while the IATA-style A4 preview updates beside the form.</p>
        </div>
        <a class="btn btn-outline-secondary" href="{{ route('air-waybills.index') }}">Back to AWBs</a>
    </header>

    @include('air-waybills._form', [
        'action' => route('air-waybills.store'),
        'method' => 'POST',
        'submitLabel' => 'Save AWB',
        'cancelUrl' => route('air-waybills.index'),
    ])
@endsection
