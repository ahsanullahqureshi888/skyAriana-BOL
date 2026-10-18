@extends('layouts.app')

@section('title', 'Create ACCI Invoice')

@section('content')
    <header class="d-flex flex-wrap align-items-end justify-content-between gap-3 mb-4 no-print">
        <div>
            <p class="page-kicker">Commercial documents</p>
            <h1 class="page-title">Create ACCI invoice</h1>
            <p class="page-subtitle">Enter the commercial details while the print-ready document updates beside the form.</p>
        </div>
        <a class="btn btn-outline-secondary" href="{{ route('acci-invoices.index') }}">Back to invoices</a>
    </header>

    @include('acci-invoices._form', [
        'action' => route('acci-invoices.store'),
        'method' => 'POST',
        'submitLabel' => 'Save Invoice',
        'cancelUrl' => route('acci-invoices.index'),
    ])
@endsection
