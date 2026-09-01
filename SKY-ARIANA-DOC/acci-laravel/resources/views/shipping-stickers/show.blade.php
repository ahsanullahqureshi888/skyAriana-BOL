@extends('layouts.app')

@section('title', 'Shipping Sticker ' . $sticker->sticker_no)

@section('content')
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4 no-print">
        <div>
            <a class="btn btn-outline-secondary btn-sm mb-2 d-inline-flex align-items-center gap-1" href="{{ route('shipping-stickers.index') }}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg> Back to stickers
            </a>
            <div class="d-flex align-items-center gap-2">
                <h1 class="h4 mb-0 fw-bold">Shipping Sticker {{ $sticker->sticker_no }}</h1>
                <span class="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-2.5 py-1" style="font-size:0.72rem;font-weight:700;">120mm × 140mm</span>
            </div>
        </div>
        <div class="d-flex flex-wrap align-items-center gap-2">
            <!-- Zoom Controls -->
            <div class="d-flex align-items-center gap-1 bg-white p-1 rounded-pill border shadow-sm me-2" style="border-color:#e2e8f0;">
                <button type="button" class="btn btn-xs btn-light rounded-circle p-1 d-flex align-items-center justify-content-center" onclick="changeStickerShowZoom(-0.05)" title="Zoom Out (Little Out Zoom)" style="width: 28px; height: 28px;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
                </button>
                <button type="button" class="btn btn-xs fw-bold px-2.5 py-1 text-slate-700" id="stickerShowZoomDisplay" onclick="setStickerShowZoom(0.88)" title="Click to reset (88%)" style="font-size:0.78rem; min-width: 48px;">
                    88%
                </button>
                <button type="button" class="btn btn-xs btn-light rounded-circle p-1 d-flex align-items-center justify-content-center" onclick="changeStickerShowZoom(0.05)" title="Zoom In" style="width: 28px; height: 28px;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
                </button>
                <button type="button" class="btn btn-xs btn-outline-secondary rounded-pill px-2.5 py-0.5 fw-bold ms-1" onclick="setStickerShowZoom(1.0)" title="100% Actual Size" style="font-size:0.72rem;">
                    100%
                </button>
            </div>

            <a class="btn btn-outline-primary d-inline-flex align-items-center gap-1.5" href="{{ route('shipping-stickers.edit', $sticker) }}">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg> Edit
            </a>
            <form action="{{ route('shipping-stickers.duplicate', $sticker) }}" method="POST" class="d-inline">
                @csrf
                <button type="submit" class="btn btn-outline-secondary d-inline-flex align-items-center gap-1.5">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Duplicate
                </button>
            </form>
            <a class="btn btn-outline-secondary d-inline-flex align-items-center gap-1.5" href="{{ route('shipping-stickers.print', $sticker) }}" target="_blank" rel="noopener">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg> Print
            </a>
            <a class="btn btn-primary d-inline-flex align-items-center gap-1.5" href="{{ route('shipping-stickers.pdf', $sticker) }}">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> Download PDF
            </a>
            <button type="button" class="btn btn-outline-secondary d-inline-flex align-items-center gap-1.5 btn-fullscreen-toggle" onclick="toggleAppFullscreen(this)" title="Toggle Full Screen (F11)">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                <span class="fs-text">Full Screen</span>
            </button>
            <form action="{{ route('shipping-stickers.destroy', $sticker) }}" method="POST" onsubmit="return confirm('Are you sure you want to delete this shipping sticker?')">
                @csrf
                @method('DELETE')
                <button type="submit" class="btn btn-outline-danger">Delete</button>
            </form>
        </div>
    </div>

    @if(session('success'))
        <div class="alert alert-success alert-dismissible fade show mb-4 no-print" role="alert">
            {{ session('success') }}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    @endif

    <div class="card border-0 shadow-sm rounded-4 overflow-hidden mb-5">
        <div class="p-3 bg-white border-bottom d-flex flex-wrap align-items-center justify-content-between gap-2 text-xs text-slate-500">
            <span class="d-inline-flex align-items-center gap-1.5">
                <span class="status-pulse-dot" style="background:#3b82f6;"></span> High Resolution Thermal &amp; Laser Print Format (120mm Width)
            </span>
            <div class="d-flex align-items-center gap-2">
                <button type="button" class="btn btn-link text-slate-600 text-decoration-none p-0 text-xs fw-bold" onclick="setStickerShowZoom(getOptimalMobileZoom())">Auto-Fit</button>
                <span class="text-slate-300">|</span>
                <button type="button" class="btn btn-link text-slate-600 text-decoration-none p-0 text-xs fw-bold" onclick="setStickerShowZoom(1.0)">100%</button>
                <span class="text-slate-300">|</span>
                <button type="button" class="btn btn-link text-slate-600 text-decoration-none p-0 text-xs fw-bold" onclick="setStickerShowZoom(0.70)">70%</button>
            </div>
        </div>

        <div class="sticker-show-stage p-2 p-sm-4 d-flex justify-content-center" style="background: radial-gradient(circle, #f8fafc 10%, #e2e8f0 90%); min-height: 480px; overflow: hidden; position: relative;">
            <div id="stickerShowZoomWrapper" style="transform: scale(0.88); transform-origin: top center; transition: transform 0.15s ease-out; width: fit-content; max-width: 100%;">
                <x-acci.sticker-document :sticker="$sticker" />
            </div>
        </div>
    </div>

    <!-- Mobile Sticky Action Dock (d-flex d-md-none) -->
    <div class="d-md-none position-fixed bottom-0 start-0 end-0 bg-white border-top p-2.5 shadow-lg no-print" style="z-index: 1040; backdrop-filter: blur(10px); background: rgba(255, 255, 255, 0.96);">
        <div class="d-flex align-items-center gap-2">
            <a class="btn btn-primary flex-fill py-2.5 fw-bold d-inline-flex align-items-center justify-content-center gap-1.5 shadow-xs text-xs rounded-3" href="{{ route('shipping-stickers.print', $sticker) }}" target="_blank" rel="noopener">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg> Print
            </a>
            <a class="btn btn-outline-primary flex-fill py-2.5 fw-bold d-inline-flex align-items-center justify-content-center gap-1.5 text-xs rounded-3" href="{{ route('shipping-stickers.pdf', $sticker) }}">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> PDF
            </a>
            <a class="btn btn-outline-secondary flex-fill py-2.5 fw-bold d-inline-flex align-items-center justify-content-center gap-1.5 text-xs rounded-3" href="{{ route('shipping-stickers.edit', $sticker) }}">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg> Edit
            </a>
            <form action="{{ route('shipping-stickers.duplicate', $sticker) }}" method="POST" class="d-inline">
                @csrf
                <button type="submit" class="btn btn-outline-secondary py-2.5 px-2.5 fw-bold d-inline-flex align-items-center justify-content-center text-xs rounded-3" title="Duplicate Sticker">
                    📋
                </button>
            </form>
        </div>
    </div>

    <script>
        (function() {
            try {
                const currentStk = @json($sticker);
                if (currentStk && currentStk.sticker_no) {
                    let saved = JSON.parse(localStorage.getItem('user_saved_stickers') || '[]');
                    const idx = saved.findIndex(s => s.sticker_no === currentStk.sticker_no);
                    if (idx >= 0) {
                        saved[idx] = { ...saved[idx], ...currentStk };
                    } else {
                        saved.unshift(currentStk);
                    }
                    localStorage.setItem('user_saved_stickers', JSON.stringify(saved));

                    if (window.self !== window.top) {
                        window.parent.postMessage({ type: 'STICKER_SAVED', sticker: currentStk }, '*');
                    }
                }
            } catch (e) {
                console.error('Failed to sync to local storage', e);
            }
        })();

        window.getOptimalMobileZoom = function() {
            const stage = document.querySelector('.sticker-show-stage');
            const availableWidth = stage ? stage.clientWidth : window.innerWidth;
            if (availableWidth < 470) {
                return Math.max(0.55, Math.min(0.85, (availableWidth - 28) / 454));
            }
            return 0.88;
        };

        let currentStickerShowZoom = window.getOptimalMobileZoom();

        window.setStickerShowZoom = function(scale) {
            currentStickerShowZoom = Math.min(Math.max(scale, 0.45), 1.5);
            const wrapper = document.getElementById('stickerShowZoomWrapper');
            const display = document.getElementById('stickerShowZoomDisplay');
            if (wrapper) {
                wrapper.style.transform = `scale(${currentStickerShowZoom})`;
            }
            if (display) {
                display.textContent = `${Math.round(currentStickerShowZoom * 100)}%`;
            }
        };

        window.changeStickerShowZoom = function(delta) {
            window.setStickerShowZoom(currentStickerShowZoom + delta);
        };

        // Apply initial responsive zoom on mobile
        document.addEventListener('DOMContentLoaded', function() {
            window.setStickerShowZoom(window.getOptimalMobileZoom());
        });
        window.addEventListener('resize', function() {
            if (window.innerWidth < 500) {
                window.setStickerShowZoom(window.getOptimalMobileZoom());
            }
        });
    </script>
@endsection
