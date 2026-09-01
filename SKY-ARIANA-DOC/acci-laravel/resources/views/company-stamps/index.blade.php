@extends('layouts.app')

@section('title', 'Company Stamps Settings')

@section('content')
<div class="container py-4">
    <div class="d-flex justify-content-between align-items-center mb-4">
        <h2 class="mb-0">Company Stamps Settings</h2>
        <a href="{{ route('company-stamps.create') }}" class="btn btn-primary">Add New Stamp</a>
    </div>

    @if(session('success'))
        <div class="alert alert-success">{{ session('success') }}</div>
    @endif

    <div class="card shadow-sm">
        <div class="card-body p-0">
            <table class="table table-hover mb-0 align-middle">
                <thead class="table-light">
                    <tr>
                        <th class="px-4 py-3">Company Name (FROM)</th>
                        <th class="px-4 py-3">Stamp Preview</th>
                        <th class="px-4 py-3 text-end">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse($stamps as $stamp)
                        <tr>
                            <td class="px-4 py-3 fw-bold">{{ $stamp->company_name }}</td>
                            <td class="px-4 py-3">
                                @if($stamp->stamp_image_path)
                                    <div style="width: 100px; height: 100px; background-color: #f8f9fa; border: 1px dashed #ccc; display: flex; align-items: center; justify-content: center;">
                                        <img src="{{ asset('storage/' . $stamp->stamp_image_path) }}" alt="Stamp" style="max-width: 100%; max-height: 100%; object-fit: contain;">
                                    </div>
                                @else
                                    <span class="text-muted">No image</span>
                                @endif
                            </td>
                            <td class="px-4 py-3 text-end">
                                <a href="{{ route('company-stamps.edit', $stamp) }}" class="btn btn-sm btn-outline-secondary">Edit</a>
                                <form action="{{ route('company-stamps.destroy', $stamp) }}" method="POST" class="d-inline" onsubmit="return confirm('Are you sure you want to delete this stamp?');">
                                    @csrf
                                    @method('DELETE')
                                    <button type="submit" class="btn btn-sm btn-outline-danger">Delete</button>
                                </form>
                            </td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="3" class="text-center py-4 text-muted">
                                No company stamps configured yet. Add one to see it dynamically applied in PDFs!
                            </td>
                        </tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </div>
</div>
@endsection
