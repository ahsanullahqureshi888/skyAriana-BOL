@extends('layouts.app')

@section('title', 'Air Waybill ' . $airWaybill->awb_number)

@section('content')
    <header class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4 no-print">
        <div>
            <a class="btn btn-outline-secondary btn-sm mb-2 d-inline-flex align-items-center gap-1" href="{{ route('air-waybills.index') }}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg> Back to Waybills
            </a>
            <div class="d-flex align-items-center gap-2">
                <h1 class="h4 mb-0 fw-bold">✈️ AWB {{ $airWaybill->awb_number }}</h1>
                <span class="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-2.5 py-1" style="font-size:0.72rem;font-weight:700;">IATA A4 Standard</span>
                @if($airWaybill->status === 'issued')
                    <span class="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2.5 py-1" style="font-size:0.72rem;font-weight:700;">Issued</span>
                @endif
            </div>
            <p class="text-secondary text-xs mt-1 mb-0">{{ $airWaybill->shipper_name }} • {{ $airWaybill->airport_departure }} → {{ $airWaybill->airport_destination }}</p>
        </div>

        <div class="d-flex flex-wrap align-items-center gap-2">
            <!-- Zoom Controls -->
            <div class="d-flex align-items-center gap-1 bg-white p-1 rounded-pill border shadow-sm me-2" style="border-color:#e2e8f0;">
                <button type="button" class="btn btn-xs btn-light rounded-circle p-1 d-flex align-items-center justify-content-center" onclick="changeAwbShowZoom(-0.05)" title="Zoom Out" style="width: 28px; height: 28px;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
                </button>
                <button type="button" class="btn btn-xs fw-bold px-2.5 py-1 text-slate-700" id="awbShowZoomDisplay" onclick="setAwbShowZoom(getOptimalAwbShowZoom())" title="Click to auto-fit" style="font-size:0.78rem; min-width: 48px;">
                    88%
                </button>
                <button type="button" class="btn btn-xs btn-light rounded-circle p-1 d-flex align-items-center justify-content-center" onclick="changeAwbShowZoom(0.05)" title="Zoom In" style="width: 28px; height: 28px;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
                </button>
                <button type="button" class="btn btn-xs btn-outline-secondary rounded-pill px-2.5 py-0.5 fw-bold ms-1" onclick="setAwbShowZoom(1.0)" title="100% Actual Size" style="font-size:0.72rem;">
                    100%
                </button>
            </div>

            <a class="btn btn-outline-primary d-inline-flex align-items-center gap-1.5" href="{{ route('air-waybills.edit', $airWaybill) }}">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg> Edit
            </a>
            <form action="{{ route('air-waybills.duplicate', $airWaybill) }}" method="POST" class="d-inline">
                @csrf
                <button class="btn btn-outline-secondary d-inline-flex align-items-center gap-1.5" type="submit" title="Duplicate this AWB">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Duplicate
                </button>
            </form>
            <a class="btn btn-outline-secondary d-inline-flex align-items-center gap-1.5" href="{{ route('air-waybills.print', $airWaybill) }}" target="_blank" rel="noopener">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg> Print
            </a>
            <a class="btn btn-primary d-inline-flex align-items-center gap-1.5" href="{{ route('air-waybills.pdf', $airWaybill) }}">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> Download PDF
            </a>
            <button type="button" class="btn btn-outline-secondary d-inline-flex align-items-center gap-1.5 btn-fullscreen-toggle" onclick="toggleAppFullscreen(this)" title="Toggle Full Screen (F11)">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                <span class="fs-text">Full Screen</span>
            </button>
            <form action="{{ route('air-waybills.destroy', $airWaybill) }}" method="POST" onsubmit="return confirm('Delete {{ $airWaybill->awb_number }}? This cannot be undone.')">
                @csrf
                @method('DELETE')
                <button class="btn btn-outline-danger" type="submit">Delete</button>
            </form>
        </div>
    </header>

    <div class="card border-0 shadow-sm rounded-4 overflow-hidden mb-5">
        <div class="p-3 bg-white border-bottom d-flex flex-wrap align-items-center justify-content-between gap-2 text-xs text-slate-500">
            <span class="d-inline-flex align-items-center gap-1.5">
                <span class="status-pulse-dot" style="background:#2563eb;"></span> Standard IATA 7-Part Air Waybill Manifest (A4 Full Page)
            </span>
            <div class="d-flex align-items-center gap-2">
                <button type="button" class="btn btn-link text-slate-600 text-decoration-none p-0 text-xs fw-bold" onclick="setAwbShowZoom(getOptimalAwbShowZoom())">Auto-Fit Screen</button>
                <span class="text-slate-300">|</span>
                <button type="button" class="btn btn-link text-slate-600 text-decoration-none p-0 text-xs fw-bold" onclick="setAwbShowZoom(1.0)">100% Actual</button>
                <span class="text-slate-300">|</span>
                <button type="button" class="btn btn-link text-slate-600 text-decoration-none p-0 text-xs fw-bold" onclick="setAwbShowZoom(0.65)">Compact (65%)</button>
            </div>
        </div>

        <div class="show-document-stage awb-show-stage p-2 p-sm-4 d-flex justify-content-center" style="background: radial-gradient(circle, #f8fafc 10%, #e2e8f0 90%); min-height: 540px; overflow: hidden; position: relative;">
            <div id="awbShowZoomWrapper" style="transform: scale(0.88); transform-origin: top center; transition: transform 0.15s ease-out; width: fit-content; max-width: 100%;">
                <div class="show-document-sheet awb-show-sheet">
                    <x-awb.document :air-waybill="$airWaybill" />
                </div>
            </div>
        </div>
    </div>

    <!-- Mobile Sticky Action Dock (d-flex d-md-none) -->
    <div class="d-md-none position-fixed bottom-0 start-0 end-0 bg-white border-top p-2.5 shadow-lg no-print" style="z-index: 1040; backdrop-filter: blur(10px); background: rgba(255, 255, 255, 0.96);">
        <div class="d-flex align-items-center gap-2">
            <a class="btn btn-primary flex-fill py-2.5 fw-bold d-inline-flex align-items-center justify-content-center gap-1.5 shadow-xs text-xs rounded-3" href="{{ route('air-waybills.print', $airWaybill) }}" target="_blank" rel="noopener">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg> Print
            </a>
            <a class="btn btn-outline-primary flex-fill py-2.5 fw-bold d-inline-flex align-items-center justify-content-center gap-1.5 text-xs rounded-3" href="{{ route('air-waybills.pdf', $airWaybill) }}">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> PDF
            </a>
            <a class="btn btn-outline-secondary flex-fill py-2.5 fw-bold d-inline-flex align-items-center justify-content-center gap-1.5 text-xs rounded-3" href="{{ route('air-waybills.edit', $airWaybill) }}">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg> Edit
            </a>
            <form action="{{ route('air-waybills.duplicate', $airWaybill) }}" method="POST" class="d-inline">
                @csrf
                <button type="submit" class="btn btn-outline-secondary py-2.5 px-2.5 fw-bold d-inline-flex align-items-center justify-content-center text-xs rounded-3" title="Duplicate AWB">
                    📋
                </button>
            </form>
        </div>
    </div>

    <script>
        window.getOptimalAwbShowZoom = function() {
            const stage = document.querySelector('.awb-show-stage');
            const availableWidth = stage ? stage.clientWidth : window.innerWidth;
            if (availableWidth < 820) {
                return Math.max(0.35, Math.min(1.0, (availableWidth - 24) / 794));
            }
            return 0.88;
        };

        let currentAwbShowZoom = window.getOptimalAwbShowZoom();

        window.setAwbShowZoom = function(scale) {
            currentAwbShowZoom = Math.min(Math.max(scale, 0.30), 1.5);
            const wrapper = document.getElementById('awbShowZoomWrapper');
            const display = document.getElementById('awbShowZoomDisplay');
            if (wrapper) {
                wrapper.style.transform = `scale(${currentAwbShowZoom})`;
            }
            if (display) {
                display.textContent = `${Math.round(currentAwbShowZoom * 100)}%`;
            }
        };

        window.changeAwbShowZoom = function(delta) {
            window.setAwbShowZoom(currentAwbShowZoom + delta);
        };

        document.addEventListener('DOMContentLoaded', function() {
            window.setAwbShowZoom(window.getOptimalAwbShowZoom());
        });
        window.addEventListener('resize', function() {
            if (window.innerWidth < 850) {
                window.setAwbShowZoom(window.getOptimalAwbShowZoom());
            }
        });
    </script>
@endsection
