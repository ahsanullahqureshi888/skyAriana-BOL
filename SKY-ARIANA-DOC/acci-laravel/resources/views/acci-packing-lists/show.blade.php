@extends('layouts.app')

@section('title', 'Packing List ' . $packingList->packing_list_no)

@section('content')
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4 no-print">
        <div>
            <a class="btn btn-outline-secondary btn-sm mb-2" href="{{ route('acci-packing-lists.index') }}">← Back to lists</a>
            <h1 class="h4 mb-0 fw-bold">ACCI Packing List {{ $packingList->packing_list_no }}</h1>
        </div>
        <div class="d-flex flex-wrap gap-2">
            <a class="btn btn-outline-primary" href="{{ route('acci-packing-lists.edit', $packingList) }}">Edit</a>
            <a class="btn btn-outline-secondary" href="{{ route('acci-packing-lists.print', $packingList) }}" target="_blank" rel="noopener">Print</a>
            <a class="btn btn-primary" href="{{ route('acci-packing-lists.pdf', $packingList) }}">Download PDF</a>
            <form action="{{ route('acci-packing-lists.destroy', $packingList) }}" method="POST" onsubmit="return confirm('Are you sure you want to delete this packing list?')">
                @csrf
                @method('DELETE')
                <button type="submit" class="btn btn-outline-danger">Delete</button>
            </form>
        </div>
    </div>

    @if(session('success'))
        <div class="alert alert-success alert-dismissible fade show mb-4 no-print" role="alert">
            {{ session('success') }}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    @endif

    <div class="card border-0 shadow-sm p-4 bg-white mx-auto" style="max-width: 210mm;">
        <x-acci.packing-list-document :packing-list="$packingList" />
    </div>
@endsection
