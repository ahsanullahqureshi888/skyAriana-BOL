@extends('layouts.app')

@section('title', $invoice->invoice_no)

@section('content')
    <header class="d-flex flex-wrap align-items-end justify-content-between gap-3 mb-4 no-print">
        <div>
            <p class="page-kicker">ACCI invoice</p>
            <h1 class="page-title">{{ $invoice->invoice_no }}</h1>
            <p class="page-subtitle">{{ $invoice->buyer_name }} · USD {{ number_format((float) $invoice->total_price, 2) }}</p>
        </div>
        <div class="d-flex flex-wrap gap-2">
            <a class="btn btn-outline-secondary" href="{{ route('acci-invoices.index') }}">Back</a>
            <a class="btn btn-outline-primary" href="{{ route('acci-invoices.edit', $invoice) }}">Edit</a>
            <a class="btn btn-outline-secondary" href="{{ route('acci-invoices.print', $invoice) }}" target="_blank" rel="noopener">Print</a>
            <a class="btn btn-primary" href="{{ route('acci-invoices.pdf', $invoice) }}">Download PDF</a>
            <form action="{{ route('acci-invoices.destroy', $invoice) }}" method="POST" onsubmit="return confirm('Delete {{ $invoice->invoice_no }}? This cannot be undone.')">
                @csrf
                @method('DELETE')
                <button class="btn btn-outline-danger" type="submit">Delete</button>
            </form>
        </div>
    </header>

    <div class="card overflow-hidden">
        <div class="show-document-stage">
            <div class="show-document-sheet">
                <x-acci.document :invoice="$invoice" />
            </div>
        </div>
    </div>
@endsection
