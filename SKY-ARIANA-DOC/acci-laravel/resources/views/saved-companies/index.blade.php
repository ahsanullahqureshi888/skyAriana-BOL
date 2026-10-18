@extends('layouts.app')

@section('title', 'Saved Sellers & Buyers Library')

@section('content')
<div class="container-fluid py-3">
    <div class="d-flex flex-wrap align-items-center justify-content-between mb-4 gap-2">
        <div>
            <h1 class="h3 fw-extrabold text-slate-800 mb-1">🏢 Saved Sellers &amp; Buyers Library</h1>
            <p class="text-slate-500 small mb-0">Manage reusable seller and buyer profiles for 1-click auto-fill across Invoices, Packing Lists, Airway Bills, SAFTA Certificates, and Shipping Stickers.</p>
        </div>
        <button class="btn btn-primary fw-bold rounded-pill px-4 shadow-sm" data-bs-toggle="modal" data-bs-target="#createCompanyModal">
            + Save New Seller / Buyer
        </button>
    </div>

    <div class="row g-3 mb-4">
        <div class="col-md-6">
            <div class="input-group shadow-xs rounded-pill overflow-hidden border">
                <span class="input-group-text bg-white border-0 text-slate-400 ps-3">🔍</span>
                <input type="text" id="companySearchInput" class="form-control border-0 ps-0 shadow-none" placeholder="Search saved companies by name, address, phone, GST..." onkeyup="filterCompanies()">
            </div>
        </div>
        <div class="col-md-6 d-flex align-items-center justify-content-md-end gap-1.5">
            <button type="button" class="btn btn-sm btn-primary rounded-pill px-3 filter-btn active" data-filter="all" onclick="setFilter('all', this)">All Parties</button>
            <button type="button" class="btn btn-sm btn-outline-primary rounded-pill px-3 filter-btn" data-filter="seller" onclick="setFilter('seller', this)">Sellers Only</button>
            <button type="button" class="btn btn-sm btn-outline-primary rounded-pill px-3 filter-btn" data-filter="buyer" onclick="setFilter('buyer', this)">Buyers Only</button>
        </div>
    </div>

    <div class="row g-4" id="companyCardsGrid">
        @forelse($companies as $company)
            <div class="col-md-6 col-lg-4 company-card-item" data-type="{{ $company->type }}" data-search="{{ strtolower($company->company_name . ' ' . $company->address . ' ' . $company->phone . ' ' . $company->email . ' ' . $company->gst_no) }}">
                <div class="card h-100 border-0 shadow-xs rounded-3 p-3 bg-white position-relative hover-shadow transition" style="border: 1px solid #e2e8f0 !important;">
                    <div class="d-flex align-items-start justify-content-between mb-2">
                        <span class="badge {{ $company->type === 'seller' ? 'bg-indigo-100 text-indigo-700' : ($company->type === 'buyer' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700') }} fw-bold px-2.5 py-1 rounded-pill text-uppercase" style="font-size:0.72rem;">
                            {{ $company->type }}
                        </span>
                        <button class="btn btn-sm btn-outline-danger border-0 p-1 delete-company-btn" onclick="deleteCompany({{ $company->id }})" title="Delete Saved Company">
                            🗑️
                        </button>
                    </div>
                    <h5 class="fw-bold text-slate-800 mb-2">{{ $company->company_name }}</h5>
                    <p class="text-slate-600 small mb-2 text-pre-line" style="min-height: 44px;">{{ $company->address ?: 'No address specified' }}</p>
                    
                    <div class="border-top pt-2 text-xs text-slate-500 d-flex flex-column gap-1 mb-3">
                        @if($company->phone) <div><strong>Phone:</strong> {{ $company->phone }}</div> @endif
                        @if($company->email) <div><strong>Email:</strong> {{ $company->email }}</div> @endif
                        @if($company->gst_no) <div><strong>GST:</strong> {{ $company->gst_no }}</div> @endif
                        @if($company->fssai_no) <div><strong>FSSAI:</strong> {{ $company->fssai_no }}</div> @endif
                        @if($company->iec_code) <div><strong>IEC Code:</strong> {{ $company->iec_code }}</div> @endif
                    </div>

                    <div class="d-flex flex-wrap gap-1.5 mt-auto pt-2 border-top">
                        <span class="text-xs text-slate-400 me-1 d-flex align-items-center">Create:</span>
                        <a href="{{ route('acci-invoices.create') }}" class="btn btn-xs btn-outline-primary py-0.5 px-2 text-xs rounded-pill" title="New Invoice">📄 Invoice</a>
                        <a href="{{ route('acci-packing-lists.create') }}" class="btn btn-xs btn-outline-success py-0.5 px-2 text-xs rounded-pill" title="New Packing List">📦 Packing</a>
                        <a href="{{ route('shipping-stickers.create') }}" class="btn btn-xs btn-outline-secondary py-0.5 px-2 text-xs rounded-pill" title="New Sticker">🏷️ Sticker</a>
                        <a href="{{ route('safta-certificates.create') }}" class="btn btn-xs btn-outline-warning text-dark py-0.5 px-2 text-xs rounded-pill" title="New SAFTA">📜 SAFTA</a>
                    </div>
                </div>
            </div>
        @empty
            <div class="col-12 text-center py-5">
                <div class="p-4 bg-white rounded-3 shadow-xs border d-inline-block" style="max-width: 400px;">
                    <span class="fs-1 d-block mb-2">🏢</span>
                    <h5 class="fw-bold text-slate-700">No Saved Companies Yet</h5>
                    <p class="text-slate-500 small mb-3">Add frequent sellers or buyers to speed up document creation with 1-click auto-fill.</p>
                    <button class="btn btn-primary btn-sm rounded-pill px-3" data-bs-toggle="modal" data-bs-target="#createCompanyModal">+ Add First Company</button>
                </div>
            </div>
        @endforelse
    </div>
</div>

<!-- Modal -->
<div class="modal fade" id="createCompanyModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content rounded-3 border-0 shadow-lg">
            <form id="createCompanyForm">
                @csrf
                <div class="modal-header border-bottom px-4 py-3">
                    <h5 class="modal-title fw-bold">Save New Company Information</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body p-4">
                    <div class="mb-3">
                        <label class="form-label small fw-bold text-slate-700">Party Type *</label>
                        <select name="type" class="form-select" required>
                            <option value="seller">Seller (Exporter)</option>
                            <option value="buyer">Buyer (Importer / Consignee)</option>
                            <option value="both" selected>Both (Seller &amp; Buyer)</option>
                        </select>
                    </div>
                    <div class="mb-3">
                        <label class="form-label small fw-bold text-slate-700">Company Name *</label>
                        <input type="text" name="company_name" class="form-control" placeholder="e.g. SKY ARIANA LTD" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label small fw-bold text-slate-700">Company Address</label>
                        <textarea name="address" class="form-control" rows="3" placeholder="Full postal address..."></textarea>
                    </div>
                    <div class="row g-2 mb-3">
                        <div class="col-6">
                            <label class="form-label small fw-bold text-slate-700">Phone</label>
                            <input type="text" name="phone" class="form-control" placeholder="+91...">
                        </div>
                        <div class="col-6">
                            <label class="form-label small fw-bold text-slate-700">Email</label>
                            <input type="email" name="email" class="form-control" placeholder="info@...">
                        </div>
                    </div>
                    <div class="row g-2">
                        <div class="col-4">
                            <label class="form-label small fw-bold text-slate-700">GST No</label>
                            <input type="text" name="gst_no" class="form-control" placeholder="GST...">
                        </div>
                        <div class="col-4">
                            <label class="form-label small fw-bold text-slate-700">FSSAI No</label>
                            <input type="text" name="fssai_no" class="form-control" placeholder="FSSAI...">
                        </div>
                        <div class="col-4">
                            <label class="form-label small fw-bold text-slate-700">IEC Code</label>
                            <input type="text" name="iec_code" class="form-control" placeholder="IEC...">
                        </div>
                    </div>
                </div>
                <div class="modal-footer border-top px-4 py-3">
                    <button type="button" class="btn btn-outline-secondary btn-sm" data-bs-dismiss="modal">Cancel</button>
                    <button type="submit" class="btn btn-primary btn-sm fw-bold px-4 rounded-pill">Save Company</button>
                </div>
            </form>
        </div>
    </div>
</div>

<script>
document.getElementById('createCompanyForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const formData = new FormData(this);
    fetch("{{ route('saved-companies.store') }}", {
        method: 'POST',
        headers: {
            'X-CSRF-TOKEN': '{{ csrf_token() }}',
            'Accept': 'application/json'
        },
        body: formData
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            window.location.reload();
        } else {
            alert('Error saving company');
        }
    })
    .catch(() => alert('Error saving company'));
});

function deleteCompany(id) {
    if (!confirm('Are you sure you want to delete this saved company?')) return;
    fetch(`/saved-companies/${id}`, {
        method: 'DELETE',
        headers: {
            'X-CSRF-TOKEN': '{{ csrf_token() }}',
            'Accept': 'application/json'
        }
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            window.location.reload();
        }
    });
}

let currentFilter = 'all';

function setFilter(type, btn) {
    currentFilter = type;
    document.querySelectorAll('.filter-btn').forEach(b => {
        b.classList.remove('btn-primary', 'active');
        b.classList.add('btn-outline-primary');
    });
    btn.classList.remove('btn-outline-primary');
    btn.classList.add('btn-primary', 'active');
    filterCompanies();
}

function filterCompanies() {
    const query = document.getElementById('companySearchInput').value.toLowerCase().trim();
    const cards = document.querySelectorAll('.company-card-item');

    cards.forEach(card => {
        const cardType = card.dataset.type;
        const searchText = card.dataset.search || '';
        
        const typeMatch = (currentFilter === 'all') || (cardType === currentFilter || cardType === 'both');
        const searchMatch = !query || searchText.includes(query);

        if (typeMatch && searchMatch) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });
}
</script>
@endsection
