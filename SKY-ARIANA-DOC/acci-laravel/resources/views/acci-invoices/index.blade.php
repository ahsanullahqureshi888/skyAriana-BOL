@extends('layouts.app')

@section('title', 'ACCI Invoices')

@section('content')
    <div class="dashboard-header-card mb-4 d-flex flex-wrap align-items-center justify-content-between gap-3">
        <div>
            <div class="header-verified-pill">
                <span>★</span> ACCI Commercial Documents
            </div>
            <h1 class="dashboard-header-card__title">ACCI Invoices</h1>
            <p class="dashboard-header-card__subtitle">Create, issue, search, print, and export standardized Afghanistan Chamber of Commerce & Investment commercial invoices.</p>
        </div>
        <div class="d-flex flex-wrap align-items-center gap-2">
            <a class="btn btn-outline-light px-3 py-2 text-sm fw-bold rounded-3 d-inline-flex align-items-center gap-1.5" href="{{ route('acci-invoices.index') }}">
                <span>🔄</span> Refresh
            </a>
            <button type="button" class="btn btn-primary px-3 py-2 text-sm fw-bold rounded-3 d-inline-flex align-items-center gap-1.5 shadow-xs btn-fullscreen-toggle" onclick="toggleAppFullscreen(this)" style="background:#2563eb;border-color:#1d4ed8;" title="Toggle Full Screen (F11)">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                <span class="fs-text">Full Screen</span>
            </button>
            <a class="btn btn-primary-action px-4 py-2 shadow-sm d-inline-flex align-items-center gap-2" href="{{ route('acci-invoices.create') }}" style="font-size:0.92rem">
                <span>+</span> Create Invoice
            </a>
        </div>
    </div>

    @php
        $totalCount = $invoices->total();
        $totalWeight = $invoices->sum('quantity_weight');
        $totalPrice = $invoices->sum('total_price');
        $buyerCount = $invoices->pluck('buyer_name')->filter()->unique()->count();
    @endphp

    <div class="row g-3 mb-4 dashboard-kpi-row">
        <div class="col-6 col-md-6 col-xl-3">
            <div class="kpi-card-modern">
                <div class="d-flex align-items-center gap-3">
                    <div class="kpi-card-modern__icon-well text-white" style="background: linear-gradient(135deg, #2563eb, #1d4ed8);">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                    </div>
                    <div class="overflow-hidden">
                        <div class="kpi-card-modern__label text-truncate">TOTAL INVOICES</div>
                        <div class="kpi-card-modern__value text-truncate">{{ number_format($totalCount) }}</div>
                        <span class="kpi-card-modern__badge" style="background:#eff6ff;color:#1d4ed8;">
                            <span>✓</span> Registered Invoices
                        </span>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-6 col-md-6 col-xl-3">
            <div class="kpi-card-modern">
                <div class="d-flex align-items-center gap-3">
                    <div class="kpi-card-modern__icon-well text-white" style="background: linear-gradient(135deg, #059669, #047857);">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 3v18"/><path d="M3 7h18"/><path d="M6 12h12"/><path d="M8 17h8"/></svg>
                    </div>
                    <div class="overflow-hidden">
                        <div class="kpi-card-modern__label text-truncate">TOTAL WEIGHT</div>
                        <div class="kpi-card-modern__value text-truncate">{{ floor((float)$totalWeight) == (float)$totalWeight ? number_format((float)$totalWeight, 0) : number_format((float)$totalWeight, 1) }} <span class="fs-6 fw-bold text-secondary">KGS</span></div>
                        <span class="kpi-card-modern__badge" style="background:#ecfdf5;color:#047857;">
                            <span>⚖️</span> Freight Volume
                        </span>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-6 col-md-6 col-xl-3">
            <div class="kpi-card-modern">
                <div class="d-flex align-items-center gap-3">
                    <div class="kpi-card-modern__icon-well text-white" style="background: linear-gradient(135deg, #d97706, #b45309);">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                    </div>
                    <div class="overflow-hidden">
                        <div class="kpi-card-modern__label text-truncate">COMMERCIAL VALUE</div>
                        <div class="kpi-card-modern__value text-truncate">$ {{ number_format($totalPrice, 2) }}</div>
                        <span class="kpi-card-modern__badge" style="background:#fef3c7;color:#b45309;">
                            <span>💵</span> USD Equivalent
                        </span>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-6 col-md-6 col-xl-3">
            <div class="kpi-card-modern">
                <div class="d-flex align-items-center gap-3">
                    <div class="kpi-card-modern__icon-well text-white" style="background: linear-gradient(135deg, #0284c7, #0369a1);">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    </div>
                    <div class="overflow-hidden">
                        <div class="kpi-card-modern__label text-truncate">ACTIVE BUYERS</div>
                        <div class="kpi-card-modern__value text-truncate">{{ number_format($buyerCount) }}</div>
                        <span class="kpi-card-modern__badge" style="background:#e0f2fe;color:#0369a1;">
                            <span>🌍</span> Commercial Clients
                        </span>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <form class="dashboard-toolbar-card mb-4" action="{{ route('acci-invoices.index') }}" method="GET" role="search">
        <div class="d-flex flex-wrap flex-lg-nowrap align-items-center justify-content-between gap-3">
            <div class="flex-grow-1 w-100">
                <label class="visually-hidden" for="search">Search invoices</label>
                <div class="input-group input-group-lg">
                    <span class="input-group-text bg-white border-end-0 text-secondary ps-3" style="font-size:1.1rem">🔍</span>
                    <input class="form-control border-start-0 ps-1 fs-6" id="search" name="search" type="search" value="{{ $search }}" placeholder="Search invoice no., buyer, seller, commodity, or date..." onkeyup="filterInvoiceTable()">
                </div>
            </div>
            <div class="d-flex align-items-center gap-2 flex-shrink-0">
                <button class="btn btn-primary-action px-4 py-2.5 fw-bold d-inline-flex align-items-center gap-1.5" type="submit">
                    <span>Search</span>
                </button>
                @if($search !== '')
                    <a class="btn btn-outline-secondary px-3 py-2.5 fw-bold rounded-3" href="{{ route('acci-invoices.index') }}">Clear</a>
                @endif
            </div>
        </div>
        <div class="d-flex flex-wrap align-items-center gap-2 mt-3 pt-3 border-top border-slate-100">
            <span class="text-secondary" style="font-size:0.75rem;font-weight:700;letter-spacing:0.04em;text-transform:uppercase">Quick Filters:</span>
            <a class="badge {{ $search === '' ? 'bg-primary text-white' : 'bg-slate-100 text-dark' }} text-decoration-none px-3 py-1.5 rounded-pill" href="{{ route('acci-invoices.index') }}" style="font-size:0.78rem;font-weight:700">All Invoices ({{ $totalCount }})</a>
            <span class="badge bg-slate-100 text-dark px-3 py-1.5 rounded-pill" style="font-size:0.78rem;font-weight:700">✓ ACCI Format</span>
            <span class="badge bg-slate-100 text-dark px-3 py-1.5 rounded-pill" style="font-size:0.78rem;font-weight:700">💵 USD Denominated</span>
        </div>
    </form>

    <div class="dashboard-table-card">
        <div class="table-responsive">
            <table class="table align-middle mb-0" id="invoicesTable">
                <thead>
                    <tr>
                        <th class="ps-4">INVOICE NO.</th>
                        <th>DATE</th>
                        <th>BUYER</th>
                        <th>COMMODITY</th>
                        <th class="text-end">WEIGHT</th>
                        <th class="text-end">TOTAL</th>
                        <th class="text-end pe-4">ACTIONS</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse($invoices as $invoice)
                        <tr class="invoice-row" data-search="{{ strtolower($invoice->invoice_no . ' ' . $invoice->buyer_name . ' ' . $invoice->seller_name . ' ' . $invoice->commodity) }}">
                            <td class="ps-4">
                                <a class="invoice-number-link fw-extrabold text-primary text-decoration-none d-inline-flex align-items-center gap-1" href="{{ url('/acci-invoices/' . $invoice->id) }}" data-bs-toggle="modal" data-bs-target="#viewModal-{{ $invoice->id }}">
                                    <span>📄</span> {{ $invoice->invoice_no }}
                                </a>
                            </td>
                            <td>
                                <span class="badge bg-slate-100 text-dark border font-mono" style="background:#f8fafc;border-color:#e2e8f0;font-size:0.78rem;font-weight:700">
                                    {{ $invoice->invoice_date ? $invoice->invoice_date->format('d M Y') : '' }}
                                </span>
                            </td>
                            <td>
                                <div class="d-flex align-items-center gap-2">
                                    <div class="rounded-circle bg-blue-50 text-blue-700 d-grid place-items-center flex-shrink-0" style="width:34px;height:34px;font-size:0.85rem;background:#eff6ff;color:#1d4ed8;font-weight:800">
                                        {{ strtoupper(substr($invoice->buyer_name, 0, 2)) }}
                                    </div>
                                    <div>
                                        <strong class="text-dark d-block" style="font-size:0.9rem">{{ $invoice->buyer_name }}</strong>
                                        <span class="text-secondary text-truncate d-block" style="font-size:0.73rem;max-width:200px">Commercial Buyer</span>
                                    </div>
                                </div>
                            </td>
                            <td>
                                <span class="badge bg-slate-100 text-dark border px-2.5 py-1.5" style="background:#f1f5f9;font-weight:700">
                                    <span>📦</span> {{ $invoice->commodity }}
                                </span>
                            </td>
                            <td class="text-end fw-bold text-dark">
                                {{ floor((float)$invoice->quantity_weight) == (float)$invoice->quantity_weight ? number_format((float)$invoice->quantity_weight, 0, '.', ',') : number_format((float)$invoice->quantity_weight, 2, '.', ',') }} <span class="text-secondary small">KGS</span>
                            </td>
                            <td class="text-end">
                                <span class="text-success fw-extrabold" style="font-size:0.95rem">
                                    $ {{ number_format((float) $invoice->total_price, 2) }}
                                </span>
                            </td>
                            <td class="pe-4">
                                <div class="d-flex flex-wrap justify-content-end gap-1.5">
                                    <button type="button" class="btn-doc-modern btn-doc-modern--view" data-bs-toggle="modal" data-bs-target="#viewModal-{{ $invoice->id }}" title="View Invoice Details">
                                        <span>👁</span> View
                                    </button>
                                    <a class="btn-doc-modern btn-doc-modern--edit" href="{{ url('/acci-invoices/' . $invoice->id . '/edit') }}" title="Edit Invoice">
                                        <span>✏️</span> Edit
                                    </a>
                                    <a class="btn-doc-modern btn-doc-modern--print" href="{{ url('/acci-invoices/' . $invoice->id . '/print') }}" target="_blank" rel="noopener" title="Open A4 Print Sheet">
                                        <span>🖨️</span> Print
                                    </a>
                                    <a class="btn-doc-modern btn-doc-modern--pdf" href="{{ url('/acci-invoices/' . $invoice->id . '/pdf') }}" title="Download Official PDF">
                                        <span>📄</span> PDF
                                    </a>
                                </div>

                                <!-- Modal Preview -->
                                <div class="modal fade text-start" id="viewModal-{{ $invoice->id }}" tabindex="-1" aria-labelledby="viewModalLabel-{{ $invoice->id }}" aria-hidden="true">
                                    <div class="modal-dialog modal-xl modal-dialog-scrollable">
                                        <div class="modal-content border-0 shadow-lg" style="border-radius:1rem;overflow:hidden">
                                            <div class="modal-header bg-dark text-white px-4 py-3">
                                                <div class="d-flex align-items-center gap-2">
                                                    <span class="fs-5">📄</span>
                                                    <div>
                                                        <h5 class="modal-title mb-0 fw-bold" id="viewModalLabel-{{ $invoice->id }}">Invoice {{ $invoice->invoice_no }}</h5>
                                                        <small class="text-white-50">{{ $invoice->buyer_name }} · USD {{ number_format((float)$invoice->total_price, 2) }}</small>
                                                    </div>
                                                </div>
                                                <div class="d-flex align-items-center gap-2 ms-auto">
                                                    <a class="btn btn-sm btn-outline-light" href="{{ url('/acci-invoices/' . $invoice->id) }}">Full Page ↗</a>
                                                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                                                </div>
                                            </div>
                                            <div class="modal-body p-4 bg-slate-100" style="background:#f1f5f9">
                                                <div class="d-flex justify-content-end gap-2 mb-3 no-print">
                                                    <a class="btn btn-sm btn-outline-secondary" href="{{ url('/acci-invoices/' . $invoice->id . '/edit') }}">✏️ Edit</a>
                                                    <a class="btn btn-sm btn-outline-primary" href="{{ url('/acci-invoices/' . $invoice->id . '/print') }}" target="_blank" rel="noopener">🖨️ Print Sheet</a>
                                                    <a class="btn btn-sm btn-primary" href="{{ url('/acci-invoices/' . $invoice->id . '/pdf') }}">📄 Download PDF</a>
                                                </div>
                                                <div class="show-document-sheet mx-auto shadow-sm" style="max-width:210mm;background:#fff;padding:10mm;border-radius:4px">
                                                    <x-acci.document :invoice="$invoice" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="7">
                                <div class="empty-state py-5 text-center">
                                    <div class="mb-3" style="font-size:2.5rem">📄</div>
                                    <strong class="d-block mb-1 fs-5 text-dark">No ACCI Invoices Found</strong>
                                    <span class="text-secondary d-block mb-3">{{ $search !== '' ? 'Try adjusting your search query or clearing filters.' : 'Create your first commercial ACCI Invoice to get started.' }}</span>
                                    @if($search === '')
                                        <a class="btn btn-primary-action px-4" href="{{ route('acci-invoices.create') }}">+ Create First Invoice</a>
                                    @endif
                                </div>
                            </td>
                        </tr>
                    @endforelse
                </tbody>
            </table>
        </div>
        @if($invoices->hasPages())
            <div class="card-footer bg-white px-4 py-3 border-top">{{ $invoices->links() }}</div>
        @endif
    </div>

<script>
function filterInvoiceTable() {
    const query = document.getElementById('search').value.toLowerCase().trim();
    const rows = document.querySelectorAll('#invoicesTable tbody tr.invoice-row');

    rows.forEach(row => {
        const text = row.dataset.search || '';
        if (!query || text.includes(query)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}
</script>
@endsection
