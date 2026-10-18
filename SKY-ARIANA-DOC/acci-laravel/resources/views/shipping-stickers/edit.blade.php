@extends('layouts.app')

@section('title', 'Edit Shipping Sticker ' . $sticker->sticker_no)

@section('content')
    <header class="mb-4">
        <p class="page-kicker">Product &amp; Shipping labels</p>
        <h1 class="page-title fs-3 fw-bold">Edit Shipping Sticker {{ $sticker->sticker_no }}</h1>
    </header>

    @include('shipping-stickers._form', [
        'action' => route('shipping-stickers.update', $sticker),
        'method' => 'PUT',
        'submitLabel' => 'Update Shipping Sticker',
        'cancelUrl' => route('shipping-stickers.show', $sticker),
    ])
@endsection
