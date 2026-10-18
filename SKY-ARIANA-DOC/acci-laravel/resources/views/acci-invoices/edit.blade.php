@extends('layouts.app')

@section('title', 'Edit '.$invoice->invoice_no)

@section('content')
    <header class="d-flex flex-wrap align-items-end justify-content-between gap-3 mb-4 no-print">
        <div>
            <p class="page-kicker">Commercial documents</p>
            <h1 class="page-title">Edit {{ $invoice->invoice_no }}</h1>
            <p class="page-subtitle">Update invoice data and verify the live A4 preview before saving.</p>
        </div>
        <a class="btn btn-outline-secondary" href="{{ route('acci-invoices.show', $invoice) }}">Cancel editing</a>
    </header>

    @include('acci-invoices._form', [
        'action' => route('acci-invoices.update', $invoice),
        'method' => 'PUT',
        'submitLabel' => 'Update Invoice',
        'cancelUrl' => route('acci-invoices.show', $invoice),
    ])
@endsection
