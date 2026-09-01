@extends('layouts.app')

@section('title', 'Create Shipping Sticker')

@section('content')
    <header class="mb-4">
        <p class="page-kicker">Product &amp; Shipping labels</p>
        <h1 class="page-title fs-3 fw-bold">Create Shipping Sticker</h1>
    </header>

    @include('shipping-stickers._form', [
        'action' => route('shipping-stickers.store'),
        'method' => 'POST',
        'submitLabel' => 'Create Shipping Sticker',
        'cancelUrl' => route('shipping-stickers.index'),
    ])
@endsection
