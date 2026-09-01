@extends('layouts.app')

@section('title', 'SAFTA Certificate '.$certificate->reference_no)

@section('content')
    <header class="d-flex flex-wrap align-items-end justify-content-between gap-3 mb-4 no-print">
        <div>
            <p class="page-kicker">SAFTA Certificate of Origin</p>
            <h1 class="page-title">Reference No. {{ $certificate->reference_no ?: $certificate->certificate_no }}</h1>
            <p class="page-subtitle">{{ $certificate->exporter_name }} → {{ $certificate->consignee_name }}</p>
        </div>
        <div class="d-flex flex-wrap gap-2">
            <a class="btn btn-outline-secondary rounded-pill px-3" href="{{ route('safta-certificates.index') }}">Back</a>
            <a class="btn btn-outline-primary rounded-pill px-3" href="{{ route('safta-certificates.edit', $certificate) }}">Edit</a>
            <a class="btn btn-outline-secondary rounded-pill px-3" href="{{ route('safta-certificates.print', $certificate) }}" target="_blank" rel="noopener">Print</a>
            <a class="btn btn-primary rounded-pill px-3 fw-bold" href="{{ route('safta-certificates.pdf', $certificate) }}">Download PDF</a>
            <form action="{{ route('safta-certificates.destroy', $certificate) }}" method="POST" onsubmit="return confirm('Delete SAFTA Certificate {{ $certificate->reference_no }}? This cannot be undone.')">
                @csrf
                @method('DELETE')
                <button class="btn btn-outline-danger rounded-pill px-3" type="submit">Delete</button>
            </form>
        </div>
    </header>

    <div class="card overflow-hidden border-0 shadow-sm">
        <div class="show-document-stage p-4 bg-secondary-subtle d-flex justify-content-center">
            <div class="show-document-sheet bg-white p-3 shadow-lg rounded">
                <x-acci.safta-document :certificate="$certificate" />
            </div>
        </div>
    </div>
@endsection
