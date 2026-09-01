@extends('layouts.app')

@section('title', 'Edit Company Stamp')

@section('content')
<div class="container py-4">
    <div class="d-flex align-items-center mb-4">
        <a href="{{ route('company-stamps.index') }}" class="btn btn-outline-secondary me-3">&larr; Back</a>
        <h2 class="mb-0">Edit Company Stamp</h2>
    </div>

    <div class="card shadow-sm" style="max-width: 600px;">
        <div class="card-body">
            <form action="{{ route('company-stamps.update', $company_stamp) }}" method="POST" enctype="multipart/form-data">
                @csrf
                @method('PUT')
                
                <div class="mb-3">
                    <label for="company_name" class="form-label fw-bold">Company Name (Exact Match)</label>
                    <input type="text" class="form-control @error('company_name') is-invalid @enderror" id="company_name" name="company_name" value="{{ old('company_name', $company_stamp->company_name) }}" required>
                    @error('company_name')
                        <div class="invalid-feedback">{{ $message }}</div>
                    @enderror
                </div>

                <div class="mb-4">
                    <label class="form-label fw-bold d-block">Current Stamp Image</label>
                    @if($company_stamp->stamp_image_path)
                        <div class="mb-3" style="width: 150px; height: 150px; background-color: #f8f9fa; border: 1px dashed #ccc; display: flex; align-items: center; justify-content: center;">
                            <img src="{{ asset('storage/' . $company_stamp->stamp_image_path) }}" alt="Stamp" style="max-width: 100%; max-height: 100%; object-fit: contain;">
                        </div>
                    @else
                        <p class="text-muted">No image uploaded.</p>
                    @endif

                    <label for="stamp_image" class="form-label fw-bold mt-2">Upload New Stamp (Optional)</label>
                    <input class="form-control @error('stamp_image') is-invalid @enderror" type="file" id="stamp_image" name="stamp_image" accept="image/png">
                    <div class="form-text text-danger fw-bold">Warning: You must upload a transparent PNG image!</div>
                    @error('stamp_image')
                        <div class="invalid-feedback">{{ $message }}</div>
                    @enderror
                </div>

                <div class="text-end">
                    <button type="submit" class="btn btn-primary px-4">Update Stamp</button>
                </div>
            </form>
        </div>
    </div>
</div>
@endsection
