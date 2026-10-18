@extends('layouts.app')

@section('title', 'Add Company Stamp')

@section('content')
<div class="container py-4">
    <div class="d-flex align-items-center mb-4">
        <a href="{{ route('company-stamps.index') }}" class="btn btn-outline-secondary me-3">&larr; Back</a>
        <h2 class="mb-0">Add Company Stamp</h2>
    </div>

    <div class="card shadow-sm" style="max-width: 600px;">
        <div class="card-body">
            <form action="{{ route('company-stamps.store') }}" method="POST" enctype="multipart/form-data">
                @csrf
                
                <div class="mb-3">
                    <label for="company_name" class="form-label fw-bold">Company Name (Exact Match)</label>
                    <input type="text" class="form-control @error('company_name') is-invalid @enderror" id="company_name" name="company_name" value="{{ old('company_name') }}" placeholder="e.g. NASIB OBID AKBARI LTD" required>
                    <div class="form-text">This must perfectly match the "seller_name" you type when creating an invoice.</div>
                    @error('company_name')
                        <div class="invalid-feedback">{{ $message }}</div>
                    @enderror
                </div>

                <div class="mb-4">
                    <label for="stamp_image" class="form-label fw-bold">Stamp Image (Transparent PNG Only)</label>
                    <input class="form-control @error('stamp_image') is-invalid @enderror" type="file" id="stamp_image" name="stamp_image" accept="image/png" required>
                    <div class="form-text text-danger fw-bold">Warning: You must upload a transparent PNG image, or it will cover the text underneath it in the PDF!</div>
                    @error('stamp_image')
                        <div class="invalid-feedback">{{ $message }}</div>
                    @enderror
                </div>

                <div class="text-end">
                    <button type="submit" class="btn btn-primary px-4">Save Stamp</button>
                </div>
            </form>
        </div>
    </div>
</div>
@endsection
