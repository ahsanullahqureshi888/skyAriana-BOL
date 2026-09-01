@extends('layouts.app')

@section('title', 'Air Waybills')

@section('content')
    <div class="dashboard-header-card mb-4 d-flex flex-wrap align-items-center justify-content-between gap-3">
        <div>
            <div class="header-verified-pill">
                <span>★</span> IATA Freight & Logistics
            </div>
            <h1 class="dashboard-header-card__title">Air Waybills (AWB)</h1>
            <p class="dashboard-header-card__subtitle">Create, issue, manage, duplicate, print, and export standardized IATA-style Air Waybill documents.</p>
        </div>
        <div class="d-flex flex-wrap align-items-center gap-2">
            <a class="btn btn-outline-light px-3 py-2 text-sm fw-bold rounded-3 d-inline-flex align-items-center gap-1.5" href="{{ route('air-waybills.index') }}">
                <span>🔄</span> Refresh
            </a>
            <button type="button" class="btn btn-primary px-3 py-2 text-sm fw-bold rounded-3 d-inline-flex align-items-center gap-1.5 shadow-xs btn-fullscreen-toggle" onclick="toggleAppFullscreen(this)" style="background:#2563eb;border-color:#1d4ed8;" title="Toggle Full Screen (F11)">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                <span class="fs-text">Full Screen</span>
            </button>
            <a class="btn btn-primary-action px-4 py-2 shadow-sm d-inline-flex align-items-center gap-2" href="{{ route('air-waybills.create') }}" style="font-size:0.92rem">
                <span>+</span> Create AWB
            </a>
        </div>
    </div>

    @php
        $totalAwb = $airWaybills->total();
        $totalGrossWeight = $airWaybills->sum('gross_weight');
        $totalPieces = $airWaybills->sum('pieces');
        $issuedCount = $airWaybills->where('status', 'issued')->count();
    @endphp

    <div class="row g-3 mb-4 dashboard-kpi-row">
        <div class="col-6 col-md-6 col-xl-3">
            <div class="kpi-card-modern">
                <div class="d-flex align-items-center gap-3">
                    <div class="kpi-card-modern__icon-well text-white" style="background: linear-gradient(135deg, #2563eb, #1d4ed8);">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.7 5.2c.3.4.8.5 1.3.3l.5-.3c.4-.2.6-.6.5-1.1z"/></svg>
                    </div>
                    <div class="overflow-hidden">
                        <div class="kpi-card-modern__label text-truncate">TOTAL WAYBILLS</div>
                        <div class="kpi-card-modern__value text-truncate">{{ number_format($totalAwb) }}</div>
                        <span class="kpi-card-modern__badge" style="background:#eff6ff;color:#1d4ed8;">
                            <span>✈️</span> Flight Manifests
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
                        <div class="kpi-card-modern__label text-truncate">GROSS WEIGHT</div>
                        <div class="kpi-card-modern__value text-truncate">{{ floor((float)$totalGrossWeight) == (float)$totalGrossWeight ? number_format((float)$totalGrossWeight, 0) : number_format((float)$totalGrossWeight, 1) }} <span class="fs-6 fw-bold text-secondary">KGS</span></div>
                        <span class="kpi-card-modern__badge" style="background:#ecfdf5;color:#047857;">
                            <span>⚖️</span> Total Air Freight
                        </span>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-6 col-md-6 col-xl-3">
            <div class="kpi-card-modern">
                <div class="d-flex align-items-center gap-3">
                    <div class="kpi-card-modern__icon-well text-white" style="background: linear-gradient(135deg, #d97706, #b45309);">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/></svg>
                    </div>
                    <div class="overflow-hidden">
                        <div class="kpi-card-modern__label text-truncate">TOTAL PIECES</div>
                        <div class="kpi-card-modern__value text-truncate">{{ number_format($totalPieces) }} <span class="fs-6 fw-bold text-secondary">PCS</span></div>
                        <span class="kpi-card-modern__badge" style="background:#fef3c7;color:#b45309;">
                            <span>📦</span> Cargo Packages
                        </span>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-6 col-md-6 col-xl-3">
            <div class="kpi-card-modern">
                <div class="d-flex align-items-center gap-3">
                    <div class="kpi-card-modern__icon-well text-white" style="background: linear-gradient(135deg, #0284c7, #0369a1);">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    </div>
                    <div class="overflow-hidden">
                        <div class="kpi-card-modern__label text-truncate">ISSUED AWBS</div>
                        <div class="kpi-card-modern__value text-truncate">{{ number_format($issuedCount) }}</div>
                        <span class="kpi-card-modern__badge" style="background:#e0f2fe;color:#0369a1;">
                            <span>✓</span> Cleared & Dispatched
                        </span>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <form class="dashboard-toolbar-card mb-4" action="{{ route('air-waybills.index') }}" method="GET" role="search">
        <div class="d-flex flex-wrap flex-lg-nowrap align-items-center justify-content-between gap-3">
            <div class="flex-grow-1 w-100">
                <label class="visually-hidden" for="search">Search Air Waybills</label>
                <div class="input-group input-group-lg">
                    <span class="input-group-text bg-white border-end-0 text-secondary ps-3" style="font-size:1.1rem">🔍</span>
                    <input class="form-control border-start-0 ps-1 fs-6" id="search" name="search" type="search" value="{{ $search }}" placeholder="Search AWB no., shipper, consignee, origin, or destination..." onkeyup="filterAwbTable()">
                </div>
            </div>
            <div class="d-flex align-items-center gap-2 flex-shrink-0">
                <button class="btn btn-primary-action px-4 py-2.5 fw-bold d-inline-flex align-items-center gap-1.5" type="submit">
                    <span>Search</span>
                </button>
                @if($search !== '')
                    <a class="btn btn-outline-secondary px-3 py-2.5 fw-bold rounded-3" href="{{ route('air-waybills.index') }}">Clear</a>
                @endif
            </div>
        </div>
        <div class="d-flex flex-nowrap overflow-x-auto pb-1 gap-2 mt-3 pt-3 border-top border-slate-100" style="-webkit-overflow-scrolling: touch;">
            <span class="text-secondary flex-shrink-0 d-flex align-items-center" style="font-size:0.75rem;font-weight:700;letter-spacing:0.04em;text-transform:uppercase">Quick Filters:</span>
            <a class="badge {{ $search === '' ? 'bg-primary text-white' : 'bg-slate-100 text-dark' }} text-decoration-none px-3 py-1.5 rounded-pill flex-shrink-0" href="{{ route('air-waybills.index') }}" style="font-size:0.78rem;font-weight:700">All AWBs ({{ $totalAwb }})</a>
            <span class="badge bg-slate-100 text-dark px-3 py-1.5 rounded-pill flex-shrink-0" style="font-size:0.78rem;font-weight:700">✈️ IATA Format</span>
            <span class="badge bg-slate-100 text-dark px-3 py-1.5 rounded-pill flex-shrink-0" style="font-size:0.78rem;font-weight:700">🏷️ Air Cargo</span>
        </div>
    </form>

    <div class="dashboard-table-card">
        <!-- Desktop Table View (d-none d-md-block) -->
        <div class="table-responsive d-none d-md-block">
            <table class="table align-middle mb-0" id="awbTable">
                <thead>
                    <tr>
                        <th class="ps-4">AWB NO.</th>
                        <th>ROUTE</th>
                        <th>SHIPPER</th>
                        <th>CONSIGNEE</th>
                        <th class="text-end">PIECES</th>
                        <th class="text-end">GROSS WEIGHT</th>
                        <th>STATUS</th>
                        <th class="text-end pe-4">ACTIONS</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse($airWaybills as $awb)
                        <tr class="awb-row" data-search="{{ strtolower($awb->awb_number . ' ' . $awb->shipper_name . ' ' . $awb->consignee_name . ' ' . $awb->airport_departure . ' ' . $awb->airport_destination) }}">
                            <td class="ps-4">
                                <a class="invoice-number-link fw-extrabold text-primary text-decoration-none d-inline-flex align-items-center gap-1" href="{{ route('air-waybills.show', $awb) }}">
                                    <span>✈️</span> {{ $awb->awb_number }}
                                </a>
                            </td>
                            <td>
                                <span class="badge bg-slate-100 text-dark border font-mono px-2.5 py-1.5" style="background:#f8fafc;border-color:#e2e8f0;font-size:0.78rem;font-weight:700">
                                    {{ $awb->airport_departure }} → {{ $awb->airport_destination }}
                                </span>
                            </td>
                            <td>
                                <div class="d-flex align-items-center gap-2">
                                    <div class="rounded-circle bg-slate-100 text-slate-600 d-grid place-items-center flex-shrink-0" style="width:34px;height:34px;font-size:0.85rem;background:#f1f5f9;font-weight:800">
                                        {{ strtoupper(substr($awb->shipper_name, 0, 2)) }}
                                    </div>
                                    <div>
                                        <strong class="text-dark d-block" style="font-size:0.9rem">{{ $awb->shipper_name }}</strong>
                                        <span class="text-secondary text-truncate d-block" style="font-size:0.73rem;max-width:200px">Shipper / Exporter</span>
                                    </div>
                                </div>
                            </td>
                            <td>
                                <div class="d-flex align-items-center gap-2">
                                    <div class="rounded-circle bg-blue-50 text-blue-700 d-grid place-items-center flex-shrink-0" style="width:34px;height:34px;font-size:0.85rem;background:#eff6ff;color:#1d4ed8;font-weight:800">
                                        {{ strtoupper(substr($awb->consignee_name, 0, 2)) }}
                                    </div>
                                    <div>
                                        <span class="text-dark fw-bold d-block" style="font-size:0.9rem">{{ $awb->consignee_name }}</span>
                                        <span class="text-secondary text-truncate d-block" style="font-size:0.73rem;max-width:200px">Destination Consignee</span>
                                    </div>
                                </div>
                            </td>
                            <td class="text-end fw-bold text-dark">
                                {{ number_format($awb->pieces) }} <span class="text-secondary small">PCS</span>
                            </td>
                            <td class="text-end">
                                <span class="text-success fw-extrabold" style="font-size:0.95rem">
                                    {{ floor((float)$awb->gross_weight) == (float)$awb->gross_weight ? number_format((float)$awb->gross_weight, 0, '.', ',') : number_format((float)$awb->gross_weight, 2, '.', ',') }} <span class="text-secondary small">KGS</span>
                                </span>
                            </td>
                            <td>
                                @if($awb->status === 'issued')
                                    <span class="badge bg-success-subtle text-success border border-success-subtle px-2.5 py-1">Issued</span>
                                @else
                                    <span class="badge bg-secondary-subtle text-secondary border border-secondary-subtle px-2.5 py-1">Draft</span>
                                @endif
                            </td>
                            <td class="pe-4">
                                <div class="d-flex flex-wrap justify-content-end gap-1.5">
                                    <a class="btn-doc-modern btn-doc-modern--view" href="{{ route('air-waybills.show', $awb) }}" title="View Waybill Details">
                                        <span>👁</span> View
                                    </a>
                                    <a class="btn-doc-modern btn-doc-modern--edit" href="{{ route('air-waybills.edit', $awb) }}" title="Edit Waybill">
                                        <span>✏️</span> Edit
                                    </a>
                                    <a class="btn-doc-modern btn-doc-modern--print" href="{{ route('air-waybills.print', $awb) }}" target="_blank" rel="noopener" title="Open A4 Print Sheet">
                                        <span>🖨️</span> Print
                                    </a>
                                    <a class="btn-doc-modern btn-doc-modern--pdf" href="{{ route('air-waybills.pdf', $awb) }}" title="Download Official PDF">
                                        <span>📄</span> PDF
                                    </a>
                                </div>
                            </td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="8">
                                <div class="empty-state py-5 text-center">
                                    <div class="mb-3" style="font-size:2.5rem">✈️</div>
                                    <strong class="d-block mb-1 fs-5 text-dark">No Air Waybills Found</strong>
                                    <span class="text-secondary d-block mb-3">{{ $search !== '' ? 'Try adjusting your search query or clearing filters.' : 'Create your first IATA-style Air Waybill to get started.' }}</span>
                                    @if($search === '')
                                        <a class="btn btn-primary-action px-4" href="{{ route('air-waybills.create') }}">+ Create First AWB</a>
                                    @endif
                                </div>
                            </td>
                        </tr>
                    @endforelse
                </tbody>
            </table>
        </div>

        <!-- Mobile Cards List View (d-block d-md-none) -->
        <div class="d-md-none p-3" id="awbMobileCards">
            @forelse($airWaybills as $awb)
                <div class="awb-mobile-card p-3.5 bg-white rounded-3 border shadow-2xs mb-3" data-search="{{ strtolower($awb->awb_number . ' ' . $awb->shipper_name . ' ' . $awb->consignee_name . ' ' . $awb->airport_departure . ' ' . $awb->airport_destination) }}">
                    <div class="d-flex align-items-center justify-content-between gap-2 mb-2 pb-2 border-bottom border-slate-100">
                        <a class="fw-bold text-primary text-decoration-none d-inline-flex align-items-center gap-1.5" href="{{ route('air-waybills.show', $awb) }}" style="font-size:0.95rem;">
                            <span>✈️</span> {{ $awb->awb_number }}
                        </a>
                        @if($awb->status === 'issued')
                            <span class="badge bg-success-subtle text-success border border-success-subtle px-2 py-0.5 text-xs fw-bold">Issued</span>
                        @else
                            <span class="badge bg-secondary-subtle text-secondary border border-secondary-subtle px-2 py-0.5 text-xs fw-bold">Draft</span>
                        @endif
                    </div>

                    <div class="d-flex align-items-center gap-1.5 mb-2">
                        <span class="badge bg-blue-50 text-blue-700 border border-blue-200 font-mono px-2 py-1 text-xs fw-bold">
                            🛫 {{ $awb->airport_departure }} → {{ $awb->airport_destination }}
                        </span>
                        @if($awb->carrier_name)
                            <span class="badge bg-slate-100 text-slate-700 border px-2 py-1 text-xs truncate" style="max-width: 160px;">
                                {{ $awb->carrier_name }}
                            </span>
                        @endif
                    </div>

                    <div class="mb-1.5">
                        <div class="text-2xs text-slate-400 fw-bold text-uppercase">Shipper / Exporter:</div>
                        <div class="fw-bold text-slate-800" style="font-size:0.88rem;">{{ $awb->shipper_name }}</div>
                    </div>

                    <div class="mb-2">
                        <div class="text-2xs text-slate-400 fw-bold text-uppercase">Consignee:</div>
                        <div class="fw-bold text-slate-800" style="font-size:0.88rem;">{{ $awb->consignee_name }}</div>
                    </div>

                    <div class="d-flex flex-wrap align-items-center gap-2 mb-3 pt-1">
                        <span class="badge bg-slate-100 text-slate-800 border px-2 py-1 text-xs fw-bold">
                            📦 {{ number_format($awb->pieces) }} PCS
                        </span>
                        <span class="badge bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 text-xs fw-black">
                            ⚖️ {{ floor((float)$awb->gross_weight) == (float)$awb->gross_weight ? number_format((float)$awb->gross_weight, 0, '.', ',') : number_format((float)$awb->gross_weight, 2, '.', ',') }} KGS
                        </span>
                        @if(!empty($awb->chargeable_weight))
                            <span class="badge bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-1 text-xs fw-bold">
                                Chg: {{ number_format((float)$awb->chargeable_weight, 1) }} KG
                            </span>
                        @endif
                    </div>

                    <!-- Touch Friendly Mobile Action Buttons -->
                    <div class="d-flex align-items-center gap-1.5 pt-2 border-top border-slate-100">
                        <a class="btn btn-sm btn-primary flex-fill py-1.5 d-flex align-items-center justify-content-center gap-1 rounded-2 text-xs fw-bold" href="{{ route('air-waybills.show', $awb) }}">
                            👁️ View
                        </a>
                        <a class="btn btn-sm btn-outline-secondary flex-fill py-1.5 d-flex align-items-center justify-content-center gap-1 rounded-2 text-xs fw-bold" href="{{ route('air-waybills.print', $awb) }}" target="_blank" rel="noopener">
                            🖨️ Print
                        </a>
                        <a class="btn btn-sm btn-outline-primary flex-fill py-1.5 d-flex align-items-center justify-content-center gap-1 rounded-2 text-xs fw-bold" href="{{ route('air-waybills.pdf', $awb) }}">
                            📄 PDF
                        </a>
                        <a class="btn btn-sm btn-outline-secondary flex-fill py-1.5 d-flex align-items-center justify-content-center gap-1 rounded-2 text-xs fw-bold" href="{{ route('air-waybills.edit', $awb) }}">
                            ✏️ Edit
                        </a>
                    </div>
                </div>
            @empty
                <div class="empty-state py-4 text-center">
                    <strong class="d-block mb-1 text-slate-700">No Air Waybills Found</strong>
                    <a class="btn btn-primary-action btn-sm px-3 py-1.5 mt-2" href="{{ route('air-waybills.create') }}">
                        + Create First AWB
                    </a>
                </div>
            @endforelse
        </div>

        @if($airWaybills->hasPages())
            <div class="card-footer bg-white px-4 py-3 border-top">{{ $airWaybills->links() }}</div>
        @endif
    </div>

<script>
function filterAwbTable() {
    const query = document.getElementById('search').value.toLowerCase().trim();
    const rows = document.querySelectorAll('#awbTable tbody tr.awb-row, #awbMobileCards .awb-mobile-card');

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
