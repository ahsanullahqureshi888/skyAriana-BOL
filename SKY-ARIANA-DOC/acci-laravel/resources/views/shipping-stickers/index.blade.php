@extends('layouts.app')

@section('title', 'Shipping Stickers')

@section('content')
    <div class="dashboard-header-card mb-4 d-flex flex-wrap align-items-center justify-content-between gap-3">
        <div>
            <div class="header-verified-pill">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg> ACCI Freight Labeling
            </div>
            <h1 class="dashboard-header-card__title">Shipping Stickers &amp; Labels</h1>
            <p class="dashboard-header-card__subtitle">Create, search, view, print, and export printable ACCI export product &amp; box shipping stickers.</p>
        </div>
        <div class="d-flex flex-wrap align-items-center gap-2">
            <!-- Global Zoom Toggle -->
            <div class="global-zoom-widget bg-white/20 p-1 rounded-pill border border-white/30 me-1">
                <span class="text-white/80 text-2xs fw-bold px-1.5">🔍 Zoom:</span>
                <button type="button" class="global-zoom-btn text-white" data-zoom="0.85" onclick="setGlobalAppZoom(0.85, this)">85%</button>
                <button type="button" class="global-zoom-btn active text-white" data-zoom="0.90" onclick="setGlobalAppZoom(0.90, this)">90%</button>
                <button type="button" class="global-zoom-btn text-white" data-zoom="1.0" onclick="setGlobalAppZoom(1.0, this)">100%</button>
            </div>
            <a class="btn btn-outline-light px-3 py-2 text-sm fw-bold rounded-3 d-inline-flex align-items-center gap-1.5" href="{{ route('shipping-stickers.index') }}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg> Refresh
            </a>
            <button type="button" class="btn btn-primary px-3 py-2 text-sm fw-bold rounded-3 d-inline-flex align-items-center gap-1.5 shadow-xs btn-fullscreen-toggle" onclick="toggleAppFullscreen(this)" style="background:#2563eb;border-color:#1d4ed8;" title="Toggle Full Screen (F11)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                <span class="fs-text">Full Screen</span>
            </button>
            <a class="btn btn-primary-action px-4 py-2 shadow-sm d-inline-flex align-items-center gap-2" href="{{ route('shipping-stickers.create') }}" style="font-size:0.92rem">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> Create Shipping Sticker
            </a>
        </div>
    </div>

    @php
        $totalCount = $stickers->total();
        $exporterCount = $stickers->pluck('exporter_name')->filter()->unique()->count();
        $importerCount = $stickers->pluck('importer_name')->filter()->unique()->count();
    @endphp

    <div class="row g-3 mb-4 dashboard-kpi-row">
        <div class="col-6 col-md-4">
            <div class="kpi-card-modern">
                <div class="d-flex align-items-center gap-3">
                    <div class="kpi-card-modern__icon-well text-white" style="background: linear-gradient(135deg, #3b82f6, #1d4ed8);">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                    </div>
                    <div class="overflow-hidden">
                        <div class="kpi-card-modern__label text-truncate">TOTAL STICKERS</div>
                        <div class="kpi-card-modern__value text-truncate">{{ number_format($totalCount) }}</div>
                        <span class="kpi-card-modern__badge" style="background:#eff6ff;color:#1d4ed8;">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg> Box Labels
                        </span>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-6 col-md-4">
            <div class="kpi-card-modern">
                <div class="d-flex align-items-center gap-3">
                    <div class="kpi-card-modern__icon-well text-white" style="background: linear-gradient(135deg, #10b981, #047857);">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 3v18"/><path d="M3 7h18"/><path d="M6 12h12"/><path d="M8 17h8"/></svg>
                    </div>
                    <div class="overflow-hidden">
                        <div class="kpi-card-modern__label text-truncate">EXPORTERS</div>
                        <div class="kpi-card-modern__value text-truncate">{{ number_format($exporterCount) }}</div>
                        <span class="kpi-card-modern__badge" style="background:#ecfdf5;color:#047857;">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg> Registered Shippers
                        </span>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-6 col-md-4">
            <div class="kpi-card-modern">
                <div class="d-flex align-items-center gap-3">
                    <div class="kpi-card-modern__icon-well text-white" style="background: linear-gradient(135deg, #0ea5e9, #0369a1);">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    </div>
                    <div class="overflow-hidden">
                        <div class="kpi-card-modern__label text-truncate">IMPORTERS</div>
                        <div class="kpi-card-modern__value text-truncate">{{ number_format($importerCount) }}</div>
                        <span class="kpi-card-modern__badge" style="background:#e0f2fe;color:#0369a1;">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg> Destination Importers
                        </span>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <form class="dashboard-toolbar-card mb-4" action="{{ route('shipping-stickers.index') }}" method="GET" role="search">
        <div class="d-flex flex-wrap flex-lg-nowrap align-items-center justify-content-between gap-3">
            <div class="flex-grow-1 w-100">
                <label class="visually-hidden" for="search">Search shipping stickers</label>
                <div class="input-group input-group-lg search-input-group">
                    <span class="input-group-text bg-transparent border-end-0 text-slate-400 ps-3">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    </span>
                    <input class="form-control border-start-0 ps-1 fs-6 shadow-none bg-transparent" id="search" name="search" type="search" value="{{ $search }}" placeholder="Search sticker no., exporter, importer, or commodity..." onkeyup="filterStickerTable()">
                </div>
            </div>
            <div class="d-flex align-items-center gap-2 flex-shrink-0">
                <button class="btn btn-primary-action px-4 py-2.5 fw-bold d-inline-flex align-items-center gap-2" type="submit">
                    Search
                </button>
                @if($search !== '')
                    <a class="btn btn-outline-secondary px-3 py-2.5 fw-bold rounded-3" href="{{ route('shipping-stickers.index') }}">Clear</a>
                @endif
            </div>
        </div>
        <div class="d-flex flex-wrap align-items-center gap-2 mt-3 pt-3 border-top border-slate-100">
            <span class="text-secondary" style="font-size:0.75rem;font-weight:700;letter-spacing:0.04em;text-transform:uppercase">Quick Filters:</span>
            <a class="badge {{ $search === '' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600' }} text-decoration-none px-3 py-1.5 rounded-pill" href="{{ route('shipping-stickers.index') }}" style="font-size:0.78rem;font-weight:700">All Stickers ({{ $totalCount }})</a>
            <span class="badge bg-slate-100 text-slate-600 px-3 py-1.5 rounded-pill d-inline-flex align-items-center gap-1.5" style="font-size:0.78rem;font-weight:700">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg> ACCI Label
            </span>
            <span class="badge bg-slate-100 text-slate-600 px-3 py-1.5 rounded-pill d-inline-flex align-items-center gap-1.5" style="font-size:0.78rem;font-weight:700">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg> Export Standard
            </span>
        </div>
    </form>

    @php
        $getInitialsPhp = function($name, $fallback = 'NA') {
            if (empty($name)) return $fallback;
            $clean = preg_replace('/[^a-zA-Z0-9\s]/', '', $name);
            $words = preg_split('/\s+/', trim($clean));
            if (empty($words) || empty($words[0])) return $fallback;
            if (count($words) === 1) return strtoupper(substr($words[0], 0, 2));
            return strtoupper(substr($words[0], 0, 1) . substr($words[1], 0, 1));
        };
    @endphp

    <div class="dashboard-table-card">
        <!-- Desktop Table View (md and up) -->
        <div class="table-responsive d-none d-md-block">
            <table class="table align-middle mb-0 custom-modern-table" id="stickersTable">
                <thead>
                    <tr>
                        <th class="ps-4">STICKER NO.</th>
                        <th>DATE</th>
                        <th>EXPORTER</th>
                        <th>IMPORTER</th>
                        <th>COMMODITY</th>
                        <th>NET WT</th>
                        <th class="text-end pe-4">ACTIONS</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse($stickers as $stk)
                        @php
                            $stkDateFormatted = '';
                            if (!empty($stk->sticker_date)) {
                                $stkDateFormatted = is_string($stk->sticker_date)
                                    ? \Carbon\Carbon::parse($stk->sticker_date)->format('m/d/Y')
                                    : $stk->sticker_date->format('m/d/Y');
                            }
                        @endphp
                        <tr class="sticker-row" data-sticker-no="{{ $stk->sticker_no }}" data-search="{{ strtolower($stk->sticker_no . ' ' . $stk->exporter_name . ' ' . $stk->importer_name . ' ' . $stk->commodity_name . ' ' . $stk->net_wt) }}">
                            <td class="ps-4">
                                <a class="invoice-number-link fw-extrabold text-primary text-decoration-none d-inline-flex align-items-center gap-1.5" href="{{ route('shipping-stickers.show', $stk) }}">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                                    {{ $stk->sticker_no }}
                                </a>
                            </td>
                            <td>
                                <span class="badge border font-mono px-2.5 py-1.5" style="background:#f8fafc;color:#1e293b;border-color:#cbd5e1 !important;font-size:0.8rem;font-weight:700;display:inline-block">
                                    {{ $stkDateFormatted }}
                                </span>
                            </td>
                            <td>
                                <div class="d-flex align-items-center gap-2.5">
                                    <div class="rounded-circle text-white d-grid place-items-center flex-shrink-0 shadow-2xs" style="width:34px;height:34px;font-size:0.8rem;font-weight:800;background:linear-gradient(135deg, #4f46e5, #3730a3);">
                                        {{ $getInitialsPhp($stk->exporter_name, 'EX') }}
                                    </div>
                                    <div class="overflow-hidden">
                                        <strong class="text-slate-800 d-block text-truncate" style="font-size:0.88rem;max-width:190px" title="{{ $stk->exporter_name }}">{{ $stk->exporter_name }}</strong>
                                        <span class="text-slate-500 text-truncate d-block" style="font-size:0.72rem;">Shipper</span>
                                    </div>
                                </div>
                            </td>
                            <td>
                                <div class="d-flex align-items-center gap-2.5">
                                    <div class="rounded-circle text-white d-grid place-items-center flex-shrink-0 shadow-2xs" style="width:34px;height:34px;font-size:0.8rem;font-weight:800;background:linear-gradient(135deg, #0284c7, #0369a1);">
                                        {{ $getInitialsPhp($stk->importer_name, 'IM') }}
                                    </div>
                                    <div class="overflow-hidden">
                                        <span class="text-slate-800 fw-bold d-block text-truncate" style="font-size:0.88rem;max-width:190px" title="{{ $stk->importer_name }}">{{ $stk->importer_name }}</span>
                                        <span class="text-slate-500 text-truncate d-block" style="font-size:0.72rem;">Consignee</span>
                                    </div>
                                </div>
                            </td>
                            <td>
                                <span class="badge border px-2.5 py-1.5 d-inline-flex align-items-center gap-1.5" style="background:#f8fafc;color:#0f172a;border-color:#cbd5e1 !important;font-weight:700;font-size:0.78rem">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                                    {{ $stk->commodity_name }}
                                </span>
                            </td>
                            <td>
                                <span class="fw-bold text-slate-700 d-inline-flex align-items-center gap-1.5" style="font-size:0.88rem">
                                    <svg class="text-slate-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/></svg>
                                    {{ $stk->net_wt }}
                                </span>
                            </td>
                            <td class="pe-4">
                                <div class="d-flex flex-nowrap align-items-center justify-content-end gap-1.5">
                                    <a class="btn-doc-modern btn-doc-modern--view" href="{{ route('shipping-stickers.show', $stk) }}" title="View Sticker">
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg> View
                                    </a>
                                    <a class="btn-doc-modern btn-doc-modern--edit" href="{{ route('shipping-stickers.edit', $stk) }}" title="Edit Sticker">
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="16 3 21 8 8 21 3 21 3 16 16 3"></polygon></svg> Edit
                                    </a>
                                    <form action="{{ route('shipping-stickers.duplicate', $stk) }}" method="POST" class="d-inline">
                                        @csrf
                                        <button type="submit" class="btn-doc-modern btn-doc-modern--view text-slate-700" title="Duplicate Sticker (1-Click Copy)">
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copy
                                        </button>
                                    </form>
                                    <a class="btn-doc-modern btn-doc-modern--print" href="{{ route('shipping-stickers.print', $stk) }}" target="_blank" rel="noopener" title="Open A4 Print Sheet">
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg> Print
                                    </a>
                                    <a class="btn-doc-modern btn-doc-modern--pdf" href="{{ route('shipping-stickers.pdf', $stk) }}" title="Download Official PDF">
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg> PDF
                                    </a>
                                    <form action="{{ route('shipping-stickers.destroy', $stk) }}" method="POST" class="d-inline" onsubmit="return confirm('Are you sure you want to delete sticker {{ $stk->sticker_no }}?');">
                                        @csrf
                                        @method('DELETE')
                                        <button type="submit" class="btn-doc-modern btn-doc-modern--delete text-danger" title="Delete Sticker">
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                        </button>
                                    </form>
                                </div>
                            </td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="7">
                                <div class="empty-state py-5 text-center">
                                    <div class="mb-4 text-slate-300 d-flex justify-content-center">
                                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                                    </div>
                                    <strong class="d-block mb-1 fs-5 text-slate-800">No Shipping Stickers Found</strong>
                                    <span class="text-slate-500 d-block mb-4">{{ $search !== '' ? 'Try adjusting your search query or clearing filters.' : 'Create your first ACCI Shipping Sticker to get started.' }}</span>
                                    @if($search === '')
                                        <a class="btn btn-primary-action px-4 py-2" href="{{ route('shipping-stickers.create') }}">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="me-2 inline-block"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> Create First Sticker
                                        </a>
                                    @endif
                                </div>
                            </td>
                        </tr>
                    @endforelse
                </tbody>
            </table>
        </div>

        <!-- Mobile Card List View (d-block d-md-none) -->
        <div class="d-md-none p-3" id="stickersMobileCards">
            @forelse($stickers as $stk)
                <div class="sticker-mobile-card p-3.5 bg-white rounded-3 border shadow-2xs mb-3" data-sticker-no="{{ $stk->sticker_no }}" data-search="{{ strtolower($stk->sticker_no . ' ' . $stk->exporter_name . ' ' . $stk->importer_name . ' ' . $stk->commodity_name . ' ' . $stk->net_wt) }}">
                    <div class="d-flex align-items-center justify-content-between gap-2 mb-2 pb-2 border-bottom border-slate-100">
                        <a class="fw-bold text-primary text-decoration-none d-inline-flex align-items-center gap-1" href="{{ route('shipping-stickers.show', $stk) }}" style="font-size:0.95rem;">
                            🏷️ {{ $stk->sticker_no }}
                        </a>
                        <span class="badge border font-mono px-2 py-1 text-slate-600 bg-slate-50" style="font-size:0.75rem;">
                            {{ $stk->sticker_date ? $stk->sticker_date->format('m/d/Y') : '' }}
                        </span>
                    </div>
                    
                    <div class="mb-1.5">
                        <div class="text-2xs text-slate-400 fw-bold text-uppercase">Shipper / Exporter:</div>
                        <div class="fw-bold text-slate-800" style="font-size:0.88rem;">{{ $stk->exporter_name }}</div>
                    </div>
                    
                    <div class="mb-2">
                        <div class="text-2xs text-slate-400 fw-bold text-uppercase">Consignee / Importer:</div>
                        <div class="fw-bold text-slate-800" style="font-size:0.88rem;">{{ $stk->importer_name }}</div>
                    </div>
                    
                    <div class="d-flex flex-wrap align-items-center gap-1.5 mb-3 pt-1">
                        <span class="badge bg-slate-100 text-slate-800 border px-2 py-1 text-xs fw-bold">
                            📦 {{ $stk->commodity_name }}
                        </span>
                        <span class="badge bg-slate-100 text-slate-800 border px-2 py-1 text-xs fw-bold">
                            ⚖️ {{ $stk->net_wt }}
                        </span>
                        @if(!empty($stk->lot_no))
                            <span class="badge bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 text-xs fw-bold">
                                🟢 Lot: {{ $stk->lot_no }}
                            </span>
                        @endif
                    </div>

                    <!-- Touch Friendly Mobile Action Buttons -->
                    <div class="d-flex align-items-center gap-1.5 pt-2 border-top border-slate-100">
                        <a class="btn btn-sm btn-primary flex-fill py-1.5 d-flex align-items-center justify-content-center gap-1 rounded-2 text-xs fw-bold" href="{{ route('shipping-stickers.show', $stk) }}">
                            👁️ View
                        </a>
                        <a class="btn btn-sm btn-outline-secondary flex-fill py-1.5 d-flex align-items-center justify-content-center gap-1 rounded-2 text-xs fw-bold" href="{{ route('shipping-stickers.print', $stk) }}" target="_blank" rel="noopener">
                            🖨️ Print
                        </a>
                        <a class="btn btn-sm btn-outline-primary flex-fill py-1.5 d-flex align-items-center justify-content-center gap-1 rounded-2 text-xs fw-bold" href="{{ route('shipping-stickers.pdf', $stk) }}">
                            📄 PDF
                        </a>
                        <a class="btn btn-sm btn-outline-secondary flex-fill py-1.5 d-flex align-items-center justify-content-center gap-1 rounded-2 text-xs fw-bold" href="{{ route('shipping-stickers.edit', $stk) }}">
                            ✏️ Edit
                        </a>
                    </div>
                </div>
            @empty
                <div class="empty-state py-4 text-center">
                    <strong class="d-block mb-1 text-slate-700">No Shipping Stickers Found</strong>
                    <a class="btn btn-primary-action btn-sm px-3 py-1.5 mt-2" href="{{ route('shipping-stickers.create') }}">
                        Create First Sticker
                    </a>
                </div>
            @endforelse
        </div>

        @if($stickers->hasPages())
            <div class="card-footer bg-white px-4 py-3 border-top">{{ $stickers->links() }}</div>
        @endif
    </div>

<script>
function formatStickerDate(rawDate) {
    if (!rawDate) return '';
    const str = String(rawDate).trim();
    if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(str)) {
        return str;
    }
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${mm}/${dd}/${yyyy}`;
    }
    return str.split('T')[0];
}

function getInitialsJs(name, fallback) {
    if (!name) return fallback;
    const clean = name.replace(/[^a-zA-Z0-9\s]/g, '').trim();
    const parts = clean.split(/\s+/);
    if (!parts || !parts[0]) return fallback;
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0].substring(0, 1) + parts[1].substring(0, 1)).toUpperCase();
}

window.rehydrateStickersTable = function(incomingStickers) {
    try {
        let savedStickers = incomingStickers;
        if (!savedStickers) {
            savedStickers = JSON.parse(localStorage.getItem('user_saved_stickers') || '[]');
        }
        if (!Array.isArray(savedStickers) || savedStickers.length === 0) return;

        // Also ensure localStorage is up to date
        try {
            let currentLocal = JSON.parse(localStorage.getItem('user_saved_stickers') || '[]');
            savedStickers.forEach(stk => {
                if (stk && stk.sticker_no) {
                    const idx = currentLocal.findIndex(s => s.sticker_no === stk.sticker_no);
                    if (idx >= 0) currentLocal[idx] = { ...currentLocal[idx], ...stk };
                    else currentLocal.unshift(stk);
                }
            });
            localStorage.setItem('user_saved_stickers', JSON.stringify(currentLocal));
        } catch (e) {}

        const tableBody = document.querySelector('#stickersTable tbody');
        const mobileContainer = document.querySelector('#stickersMobileCards');
        
        const existingStickerNos = new Set();
        document.querySelectorAll('#stickersTable tbody tr.sticker-row, #stickersMobileCards .sticker-mobile-card').forEach(el => {
            if (el.dataset.stickerNo) existingStickerNos.add(el.dataset.stickerNo);
        });

        // Sync all local stickers with server in background
        fetch('{{ route("shipping-stickers.sync") }}', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': '{{ csrf_token() }}',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ stickers: savedStickers })
        }).catch(() => {});

        savedStickers.forEach(stk => {
            if (stk.sticker_no && !existingStickerNos.has(stk.sticker_no)) {
                const expInitial = getInitialsJs(stk.exporter_name, 'EX');
                const impInitial = getInitialsJs(stk.importer_name, 'IM');
                const dateFormatted = formatStickerDate(stk.sticker_date || new Date());
                const searchData = `${stk.sticker_no} ${stk.exporter_name || ''} ${stk.importer_name || ''} ${stk.commodity_name || ''} ${stk.net_wt || ''}`.toLowerCase();
                const stickerIdentifier = encodeURIComponent(stk.id || stk.sticker_no);

                // 1. Prepend to Desktop Table
                if (tableBody) {
                    const emptyRow = tableBody.querySelector('td[colspan="7"]');
                    if (emptyRow && emptyRow.parentElement) emptyRow.parentElement.remove();

                    const tr = document.createElement('tr');
                    tr.className = 'sticker-row bg-blue-50/15';
                    tr.dataset.stickerNo = stk.sticker_no;
                    tr.dataset.search = searchData;
                    
                    tr.innerHTML = `
                        <td class="ps-4">
                            <a class="invoice-number-link fw-extrabold text-primary text-decoration-none d-inline-flex align-items-center gap-1.5" href="/shipping-stickers/${stickerIdentifier}">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                                ${stk.sticker_no}
                            </a>
                        </td>
                        <td>
                            <span class="badge border font-mono px-2.5 py-1.5" style="background:#f8fafc;color:#1e293b;border-color:#cbd5e1 !important;font-size:0.8rem;font-weight:700;display:inline-block">
                                ${dateFormatted}
                            </span>
                        </td>
                        <td>
                            <div class="d-flex align-items-center gap-2.5">
                                <div class="rounded-circle text-white d-grid place-items-center flex-shrink-0 shadow-2xs" style="width:34px;height:34px;font-size:0.8rem;font-weight:800;background:linear-gradient(135deg, #4f46e5, #3730a3);">
                                    ${expInitial}
                                </div>
                                <div class="overflow-hidden">
                                    <strong class="text-slate-800 d-block text-truncate" style="font-size:0.88rem;max-width:190px" title="${stk.exporter_name || 'N/A'}">${stk.exporter_name || 'N/A'}</strong>
                                    <span class="text-slate-500 text-truncate d-block" style="font-size:0.72rem;">Shipper</span>
                                </div>
                            </div>
                        </td>
                        <td>
                            <div class="d-flex align-items-center gap-2.5">
                                <div class="rounded-circle text-white d-grid place-items-center flex-shrink-0 shadow-2xs" style="width:34px;height:34px;font-size:0.8rem;font-weight:800;background:linear-gradient(135deg, #0284c7, #0369a1);">
                                    ${impInitial}
                                </div>
                                <div class="overflow-hidden">
                                    <span class="text-slate-800 fw-bold d-block text-truncate" style="font-size:0.88rem;max-width:190px" title="${stk.importer_name || 'N/A'}">${stk.importer_name || 'N/A'}</span>
                                    <span class="text-slate-500 text-truncate d-block" style="font-size:0.72rem;">Consignee</span>
                                </div>
                            </div>
                        </td>
                        <td>
                            <span class="badge border px-2.5 py-1.5 d-inline-flex align-items-center gap-1.5" style="background:#f8fafc;color:#0f172a;border-color:#cbd5e1 !important;font-weight:700;font-size:0.78rem">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                                ${stk.commodity_name || 'N/A'}
                            </span>
                        </td>
                        <td>
                            <span class="fw-bold text-slate-700 d-inline-flex align-items-center gap-1.5" style="font-size:0.88rem">
                                <svg class="text-slate-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/></svg>
                                ${stk.net_wt || 'N/A'}
                            </span>
                        </td>
                        <td class="pe-4">
                            <div class="d-flex flex-nowrap align-items-center justify-content-end gap-1.5">
                                <a class="btn-doc-modern btn-doc-modern--view" href="/shipping-stickers/${stickerIdentifier}" title="View Sticker">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg> View
                                </a>
                                <a class="btn-doc-modern btn-doc-modern--edit" href="/shipping-stickers/${stickerIdentifier}/edit" title="Edit Sticker">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="16 3 21 8 8 21 3 21 3 16 16 3"></polygon></svg> Edit
                                </a>
                                <a class="btn-doc-modern btn-doc-modern--view text-slate-700" href="/shipping-stickers/${stickerIdentifier}" title="Duplicate Sticker (1-Click Copy)">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copy
                                </a>
                                <a class="btn-doc-modern btn-doc-modern--print" href="/shipping-stickers/${stickerIdentifier}/print" target="_blank" rel="noopener" title="Open A4 Print Sheet">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg> Print
                                </a>
                                <a class="btn-doc-modern btn-doc-modern--pdf" href="/shipping-stickers/${stickerIdentifier}/pdf" title="Download Official PDF">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg> PDF
                                </a>
                                <button type="button" class="btn-doc-modern btn-doc-modern--delete text-danger" onclick="deleteLocalSticker('${stk.sticker_no}', this)" title="Delete Sticker">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                </button>
                            </div>
                        </td>
                    `;
                    tableBody.insertBefore(tr, tableBody.firstChild);
                }

                // 2. Prepend to Mobile Card View
                if (mobileContainer) {
                    const mobileEmpty = mobileContainer.querySelector('.empty-state');
                    if (mobileEmpty) mobileEmpty.remove();

                    const card = document.createElement('div');
                    card.className = 'sticker-mobile-card p-3.5 bg-white rounded-3 border shadow-2xs mb-3';
                    card.dataset.stickerNo = stk.sticker_no;
                    card.dataset.search = searchData;

                    card.innerHTML = `
                        <div class="d-flex align-items-center justify-content-between gap-2 mb-2 pb-2 border-bottom border-slate-100">
                            <a class="fw-bold text-primary text-decoration-none d-inline-flex align-items-center gap-1" href="/shipping-stickers/${stickerIdentifier}" style="font-size:0.95rem;">
                                🏷️ ${stk.sticker_no}
                            </a>
                            <span class="badge border font-mono px-2 py-1 text-slate-600 bg-slate-50" style="font-size:0.75rem;">
                                ${dateFormatted}
                            </span>
                        </div>
                        
                        <div class="mb-1.5">
                            <div class="text-2xs text-slate-400 fw-bold text-uppercase">Shipper / Exporter:</div>
                            <div class="fw-bold text-slate-800" style="font-size:0.88rem;">${stk.exporter_name || 'N/A'}</div>
                        </div>
                        
                        <div class="mb-2">
                            <div class="text-2xs text-slate-400 fw-bold text-uppercase">Consignee / Importer:</div>
                            <div class="fw-bold text-slate-800" style="font-size:0.88rem;">${stk.importer_name || 'N/A'}</div>
                        </div>
                        
                        <div class="d-flex flex-wrap align-items-center gap-1.5 mb-3 pt-1">
                            <span class="badge bg-slate-100 text-slate-800 border px-2 py-1 text-xs fw-bold">
                                📦 ${stk.commodity_name || 'N/A'}
                            </span>
                            <span class="badge bg-slate-100 text-slate-800 border px-2 py-1 text-xs fw-bold">
                                ⚖️ ${stk.net_wt || 'N/A'}
                            </span>
                            ${stk.lot_no ? `<span class="badge bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 text-xs fw-bold">🟢 Lot: ${stk.lot_no}</span>` : ''}
                        </div>

                        <div class="d-flex align-items-center gap-1.5 pt-2 border-top border-slate-100">
                            <a class="btn btn-sm btn-primary flex-fill py-1.5 d-flex align-items-center justify-content-center gap-1 rounded-2 text-xs fw-bold" href="/shipping-stickers/${stickerIdentifier}">
                                👁️ View
                            </a>
                            <a class="btn btn-sm btn-outline-secondary flex-fill py-1.5 d-flex align-items-center justify-content-center gap-1 rounded-2 text-xs fw-bold" href="/shipping-stickers/${stickerIdentifier}/print" target="_blank" rel="noopener">
                                🖨️ Print
                            </a>
                            <a class="btn btn-sm btn-outline-primary flex-fill py-1.5 d-flex align-items-center justify-content-center gap-1 rounded-2 text-xs fw-bold" href="/shipping-stickers/${stickerIdentifier}/pdf">
                                📄 PDF
                            </a>
                            <a class="btn btn-sm btn-outline-secondary flex-fill py-1.5 d-flex align-items-center justify-content-center gap-1 rounded-2 text-xs fw-bold" href="/shipping-stickers/${stickerIdentifier}/edit">
                                ✏️ Edit
                            </a>
                        </div>
                    `;
                    mobileContainer.insertBefore(card, mobileContainer.firstChild);
                }

                existingStickerNos.add(stk.sticker_no);
            }
        });
    } catch (e) {
        console.error('Rehydration error', e);
    }
};

// Initial local rehydration
window.rehydrateStickersTable();

// Request stickers from parent React window
if (window.self !== window.top) {
    window.parent.postMessage({ type: 'REQUEST_SAVED_STICKERS' }, '*');
}

// Listen for messages from parent
window.addEventListener('message', function(e) {
    if (!e.data) return;
    if (e.data.type === 'RECEIVE_SAVED_STICKERS' && Array.isArray(e.data.stickers)) {
        window.rehydrateStickersTable(e.data.stickers);
    }
    if (e.data.type === 'STICKER_SAVED' && e.data.sticker) {
        window.rehydrateStickersTable([e.data.sticker]);
    }
});

window.deleteLocalSticker = function(stickerNo, btn) {
    if (!confirm('Are you sure you want to delete sticker ' + stickerNo + '?')) return;
    try {
        let saved = JSON.parse(localStorage.getItem('user_saved_stickers') || '[]');
        saved = saved.filter(s => s.sticker_no !== stickerNo);
        localStorage.setItem('user_saved_stickers', JSON.stringify(saved));
        
        if (window.self !== window.top) {
            window.parent.postMessage({ type: 'DELETE_STICKER', sticker_no: stickerNo }, '*');
        }

        const el = btn.closest('tr') || btn.closest('.sticker-mobile-card');
        if (el) el.remove();
    } catch (e) {}
};

function filterStickerTable() {
    const query = document.getElementById('search').value.toLowerCase().trim();
    const rows = document.querySelectorAll('#stickersTable tbody tr.sticker-row, #stickersMobileCards .sticker-mobile-card');

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
