@extends('layouts.app')

@section('title', 'Create ACCI Packing List')

@section('content')
    <header class="mb-4">
        <p class="page-kicker">Commercial documents</p>
        <h1 class="page-title fs-3 fw-bold">Create ACCI Packing List</h1>
    </header>

    @include('acci-packing-lists._form', [
        'action' => route('acci-packing-lists.store'),
        'method' => 'POST',
        'submitLabel' => 'Create Packing List',
        'cancelUrl' => route('acci-packing-lists.index'),
    ])
@endsection
