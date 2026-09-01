@extends('layouts.app')

@section('title', 'Edit Packing List ' . $packingList->packing_list_no)

@section('content')
    <header class="mb-4">
        <p class="page-kicker">Commercial documents</p>
        <h1 class="page-title fs-3 fw-bold">Edit ACCI Packing List {{ $packingList->packing_list_no }}</h1>
    </header>

    @include('acci-packing-lists._form', [
        'action' => route('acci-packing-lists.update', $packingList),
        'method' => 'PUT',
        'submitLabel' => 'Update Packing List',
        'cancelUrl' => route('acci-packing-lists.show', $packingList),
    ])
@endsection
