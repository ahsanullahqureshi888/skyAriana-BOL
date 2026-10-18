<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>@yield('title', 'Logistics Document Manager')</title>
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png">
    <link rel="apple-touch-icon" href="/icon-512x512.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    @vite(['resources/css/app.css', 'resources/js/app.js'])
    @stack('styles')
    <style>
        :root {
            --global-app-zoom: 0.90;
        }
        html, body {
            zoom: var(--global-app-zoom);
        }
        html.is-embedded nav.app-navbar { display: none !important; }
        html.is-embedded .embedded-hide { display: none !important; }
        html.is-embedded .embedded-doc-switcher { display: none !important; }
        html.is-embedded main.app-main { padding: 0.4rem 0.6rem 0.8rem !important; margin: 0 !important; width: 100% !important; max-width: 100% !important; }
        html.is-embedded body { background: #f8fafc !important; margin: 0 !important; overflow-x: hidden !important; }
        
        .global-zoom-widget {
            display: inline-flex;
            align-items: center;
            gap: 2px;
            background: #f1f5f9;
            padding: 2px 4px;
            border-radius: 9999px;
            border: 1px solid #e2e8f0;
        }
        .global-zoom-btn {
            padding: 2px 8px;
            font-size: 0.72rem;
            font-weight: 700;
            border-radius: 9999px;
            border: none;
            background: transparent;
            color: #64748b;
            cursor: pointer;
            transition: all 0.15s ease;
        }
        .global-zoom-btn:hover {
            color: #0f172a;
            background: #e2e8f0;
        }
        .global-zoom-btn.active {
            background: #ffffff;
            color: #2563eb;
            box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        }
    </style>
    <script>
        (function() {
            const savedZoom = localStorage.getItem('acci-app-zoom') || '0.90';
            document.documentElement.style.setProperty('--global-app-zoom', savedZoom);
            if (window.self !== window.top || new URLSearchParams(window.location.search).has('embed')) {
                document.documentElement.classList.add('is-embedded');
            }
        })();

        window.setGlobalAppZoom = function(scale, btn) {
            document.documentElement.style.setProperty('--global-app-zoom', scale);
            localStorage.setItem('acci-app-zoom', scale);
            document.querySelectorAll('.global-zoom-btn').forEach(b => {
                if (b.dataset.zoom === String(scale)) {
                    b.classList.add('active');
                } else {
                    b.classList.remove('active');
                }
            });
        };

        window.toggleAppFullscreen = function(btn) {
            if (window.self !== window.top) {
                window.parent.postMessage({ type: 'TOGGLE_FULLSCREEN' }, '*');
            }
            if (!document.fullscreenElement) {
                if (document.documentElement.requestFullscreen) {
                    document.documentElement.requestFullscreen().catch(() => {});
                }
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen().catch(() => {});
                }
            }
        };

        document.addEventListener('fullscreenchange', function() {
            const isFull = !!document.fullscreenElement;
            document.querySelectorAll('.btn-fullscreen-toggle').forEach(b => {
                const text = b.querySelector('.fs-text');
                if (isFull) {
                    if (text) text.textContent = 'Exit Full Screen';
                    b.classList.add('bg-warning', 'text-dark');
                } else {
                    if (text) text.textContent = 'Full Screen';
                    b.classList.remove('bg-warning', 'text-dark');
                }
            });
        });

        document.addEventListener('keydown', function(e) {
            if (e.key === 'F11' || ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'f')) {
                e.preventDefault();
                window.toggleAppFullscreen();
            }
        });
    </script>
</head>
<body>
    @unless(request()->routeIs('dashboard'))
    <nav class="navbar app-navbar no-print">
        <div class="container-fluid px-3 px-lg-4 app-navbar__inner">
            <a class="navbar-brand d-flex align-items-center gap-2.5" href="{{ route('dashboard') }}">
                <div class="bg-white p-1 rounded-2 shadow-sm d-inline-flex align-items-center border border-white/30">
                    <img src="/images/logo.png" alt="Sky Ariana Group of Companies Logo" style="height: 34px; width: auto; max-width: 105px; object-fit: contain;" />
                </div>
                <span class="app-navbar__title">Logistics Suite</span>
                <span class="app-navbar__status badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2.5 py-1 ms-1 d-none d-md-inline-flex align-items-center gap-1.5" style="font-size:0.7rem;font-weight:700">
                    <span class="status-pulse-dot"></span> Online
                </span>
            </a>
            <div class="app-navbar__controls d-flex align-items-center gap-2">
                <button type="button" class="btn btn-sm btn-outline-light rounded-pill px-3 py-1.5 fw-bold d-inline-flex align-items-center gap-1.5 shadow-xs" onclick="openGlobalSearchModal()" style="border-color:rgba(255,255,255,0.3);background:rgba(255,255,255,0.1);font-size:0.8rem;" title="Search suite (Ctrl + K)">
                    <span>🔍</span> <span>Search Suite</span> <kbd class="bg-white text-dark px-1.5 py-0.5 rounded text-xs ms-1 border shadow-2xs">Ctrl+K</kbd>
                </button>
                <button type="button" class="btn btn-sm btn-outline-light rounded-pill px-3 py-1.5 fw-bold d-inline-flex align-items-center gap-1.5 shadow-xs btn-fullscreen-toggle" onclick="toggleAppFullscreen(this)" style="border-color:rgba(255,255,255,0.3);background:rgba(255,255,255,0.1);font-size:0.8rem;" title="Toggle Full Screen (F11)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                    <span class="fs-text">Full Screen</span>
                </button>
                <a class="app-navbar__back" href="{{ env('MAIN_LOGISTICS_URL', 'http://127.0.0.1:5173') }}" target="_top" style="background:linear-gradient(135deg, #1e3a8a, #2563eb);color:#fff;border-color:#1e3a8a;font-weight:700;">
                    <span aria-hidden="true">🚀</span>
                    <span>Main Logistics Software</span>
                </a>
                <a class="app-navbar__back" href="{{ route('dashboard') }}" aria-label="Suite Home Dashboard">
                    <span aria-hidden="true">🏢</span>
                    <span>Suite Home</span>
                </a>
            </div>
        </div>
    </nav>
    @endunless

    <main class="container-fluid app-main px-3 px-lg-4">
        <!-- Modern Document Module Suite Navigation Bar (Unified Suite Navigation) -->
        <nav class="embedded-doc-switcher no-print mb-2.5" aria-label="ACCI document suite navigation">
            <div class="doc-switcher__inner d-flex flex-wrap align-items-center justify-content-between gap-2">
                <div class="doc-switcher__brand d-flex align-items-center gap-2">
                    <span class="doc-switcher__badge">SKY ARIANA GROUP OF COMPANIES</span>
                    <span class="doc-switcher__subtitle">Main Logistics Operating Suite</span>
                    <span class="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2 py-0.5" style="font-size:0.68rem;font-weight:800">
                        <span class="status-pulse-dot me-1"></span> Live
                    </span>
                    <button type="button" class="btn btn-xs btn-outline-secondary rounded-pill px-2.5 py-0.5 fw-bold d-inline-flex align-items-center gap-1 ms-2" onclick="openGlobalSearchModal()" style="font-size:0.75rem;">
                        <span>🔍</span> <span>Quick Search</span> <kbd class="bg-slate-200 text-slate-700 px-1 rounded text-2xs">Ctrl+K</kbd>
                    </button>
                </div>
                <div class="doc-switcher__tabs d-flex flex-wrap align-items-center gap-1">
                    <a class="doc-switcher__tab" href="{{ env('MAIN_LOGISTICS_URL', 'http://127.0.0.1:5173') }}" target="_top" style="background:linear-gradient(135deg, #1e3a8a, #2563eb);color:#fff;border-color:#1e3a8a;font-weight:800;box-shadow:0 4px 12px rgba(37,99,235,0.25);">
                        <span class="tab-icon">🚀</span>
                        <span class="tab-label">Main Logistics Software</span>
                    </a>
                    <a class="doc-switcher__tab {{ request()->routeIs('dashboard*') ? 'is-active' : '' }}" href="{{ route('dashboard') }}">
                        <span class="tab-icon">🏠</span>
                        <span class="tab-label">Suite Hub</span>
                    </a>
                    <a class="doc-switcher__tab {{ request()->routeIs('safta-certificates.*') ? 'is-active' : '' }}" href="{{ route('safta-certificates.index') }}">
                        <span class="tab-icon">📜</span>
                        <span class="tab-label">SAFTA Certificates</span>
                    </a>
                    <a class="doc-switcher__tab {{ request()->routeIs('acci-invoices.*') ? 'is-active' : '' }}" href="{{ route('acci-invoices.index') }}">
                        <span class="tab-icon">📄</span>
                        <span class="tab-label">ACCI Invoices</span>
                    </a>
                    <a class="doc-switcher__tab {{ request()->routeIs('acci-packing-lists.*') ? 'is-active' : '' }}" href="{{ route('acci-packing-lists.index') }}">
                        <span class="tab-icon">📦</span>
                        <span class="tab-label">Packing Lists</span>
                    </a>
                    <a class="doc-switcher__tab {{ request()->routeIs('air-waybills.*') ? 'is-active' : '' }}" href="{{ route('air-waybills.index') }}">
                        <span class="tab-icon">✈️</span>
                        <span class="tab-label">Air Waybills</span>
                    </a>
                    <a class="doc-switcher__tab {{ request()->routeIs('shipping-stickers.*') ? 'is-active' : '' }}" href="{{ route('shipping-stickers.index') }}">
                        <span class="tab-icon">🏷️</span>
                        <span class="tab-label">Shipping Stickers</span>
                    </a>
                    <a class="doc-switcher__tab {{ request()->routeIs('saved-companies.*') ? 'is-active' : '' }}" href="{{ route('saved-companies.index') }}">
                        <span class="tab-icon">🏢</span>
                        <span class="tab-label">Saved Parties</span>
                    </a>
                    <a class="doc-switcher__tab" href="{{ env('MAIN_LOGISTICS_URL', 'http://127.0.0.1:5173') }}/ledger" target="_top">
                        <span class="tab-icon">📒</span>
                        <span class="tab-label">Party Ledgers</span>
                    </a>
                    <button type="button" class="btn btn-xs btn-primary rounded-pill px-3 py-1 fw-bold d-inline-flex align-items-center gap-1.5 ms-1 shadow-xs btn-fullscreen-toggle" onclick="toggleAppFullscreen(this)" style="font-size:0.75rem; background:#2563eb; border-color:#1d4ed8;" title="Toggle Full Screen (F11)">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                        <span class="fs-text">Full Screen</span>
                    </button>
                </div>
            </div>
        </nav>

        @if(session('success'))
            <div class="alert alert-success alert-dismissible fade show no-print" role="alert">
                {{ session('success') }}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        @endif

        @yield('content')
    </main>

    <!-- Global Search Command Palette Modal (Ctrl + K) -->
    <div class="modal fade" id="globalSearchModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-lg">
            <div class="modal-content border-0 shadow-lg" style="border-radius: 1.25rem; overflow: hidden;">
                <div class="modal-header border-bottom p-3 bg-slate-900 text-white">
                    <div class="input-group input-group-lg border-0 bg-transparent">
                        <span class="input-group-text bg-transparent border-0 text-slate-400 ps-2">🔍</span>
                        <input type="text" id="globalSearchQueryInput" class="form-control bg-transparent border-0 text-white shadow-none" placeholder="Search Invoices, AWBs, SAFTA, Stickers, Parties... (press Esc to close)" autofocus onkeyup="executeGlobalSearch(this.value)">
                    </div>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body p-0" style="max-height: 480px; overflow-y: auto; background: #f8fafc;">
                    <div id="globalSearchResultsContainer" class="p-3">
                        <div class="text-center py-4 text-slate-400">
                            <span class="fs-2 d-block mb-1">⚡</span>
                            <div class="fw-bold text-slate-600">Type to search anything in the suite...</div>
                            <div class="text-xs text-slate-400">Or use quick creation shortcuts below:</div>
                            <div class="d-flex flex-wrap align-items-center justify-content-center gap-2 mt-3">
                                <a href="{{ route('acci-invoices.create') }}" class="btn btn-sm btn-outline-primary rounded-pill px-3">+ New Invoice</a>
                                <a href="{{ route('acci-packing-lists.create') }}" class="btn btn-sm btn-outline-success rounded-pill px-3">+ New Packing List</a>
                                <a href="{{ route('air-waybills.create') }}" class="btn btn-sm btn-outline-info rounded-pill px-3">+ New AWB</a>
                                <a href="{{ route('safta-certificates.create') }}" class="btn btn-sm btn-outline-warning text-dark rounded-pill px-3">+ New SAFTA</a>
                                <a href="{{ route('shipping-stickers.create') }}" class="btn btn-sm btn-outline-secondary rounded-pill px-3">+ New Sticker</a>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer bg-white border-top px-4 py-2.5 d-flex justify-content-between align-items-center">
                    <span class="text-xs text-slate-500">Pro-tip: Press <kbd class="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border">Ctrl + K</kbd> anywhere to open search</span>
                    <button type="button" class="btn btn-sm btn-secondary rounded-pill px-3" data-bs-dismiss="modal">Close</button>
                </div>
            </div>
        </div>
    </div>

    <script>
    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
            e.preventDefault();
            openGlobalSearchModal();
        }
    });

    function openGlobalSearchModal() {
        const modalEl = document.getElementById('globalSearchModal');
        if (!modalEl) return;
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();
        setTimeout(() => {
            document.getElementById('globalSearchQueryInput')?.focus();
        }, 200);
    }

    let globalSearchDebounceTimer = null;
    function executeGlobalSearch(query) {
        clearTimeout(globalSearchDebounceTimer);
        const container = document.getElementById('globalSearchResultsContainer');
        if (!query.trim()) {
            container.innerHTML = `
                <div class="text-center py-4 text-slate-400">
                    <span class="fs-2 d-block mb-1">⚡</span>
                    <div class="fw-bold text-slate-600">Type to search anything in the suite...</div>
                    <div class="text-xs text-slate-400">Or use quick creation shortcuts below:</div>
                    <div class="d-flex flex-wrap align-items-center justify-content-center gap-2 mt-3">
                        <a href="{{ route('acci-invoices.create') }}" class="btn btn-sm btn-outline-primary rounded-pill px-3">+ New Invoice</a>
                        <a href="{{ route('acci-packing-lists.create') }}" class="btn btn-sm btn-outline-success rounded-pill px-3">+ New Packing List</a>
                        <a href="{{ route('air-waybills.create') }}" class="btn btn-sm btn-outline-info rounded-pill px-3">+ New AWB</a>
                        <a href="{{ route('safta-certificates.create') }}" class="btn btn-sm btn-outline-warning text-dark rounded-pill px-3">+ New SAFTA</a>
                        <a href="{{ route('shipping-stickers.create') }}" class="btn btn-sm btn-outline-secondary rounded-pill px-3">+ New Sticker</a>
                    </div>
                </div>`;
            return;
        }

        globalSearchDebounceTimer = setTimeout(() => {
            container.innerHTML = '<div class="text-center py-4"><span class="spinner-border spinner-border-sm text-primary"></span> Searching suite database...</div>';
            fetch(`/global-search?q=${encodeURIComponent(query.trim())}`)
                .then(r => r.json())
                .then(data => {
                    if (!data.results || data.results.length === 0) {
                        container.innerHTML = '<div class="text-center py-4 text-slate-500">No records found matching "' + query + '"</div>';
                        return;
                    }
                    let html = '<div class="list-group list-group-flush border rounded-3 overflow-hidden bg-white">';
                    data.results.forEach(res => {
                        html += `
                            <div class="list-group-item list-group-item-action d-flex align-items-center justify-content-between p-3 border-bottom">
                                <div class="d-flex align-items-center gap-3">
                                    <span class="fs-4">${res.icon}</span>
                                    <div>
                                        <div class="d-flex align-items-center gap-2">
                                            <span class="badge bg-slate-100 text-slate-700 fw-bold px-2 py-0.5 text-uppercase" style="font-size:0.68rem;">${res.type}</span>
                                            <strong class="text-slate-800">${res.title}</strong>
                                        </div>
                                        <div class="text-slate-500 text-xs mt-0.5">${res.subtitle}</div>
                                    </div>
                                </div>
                                <div class="d-flex align-items-center gap-1">
                                    <a href="${res.url}" class="btn btn-sm btn-outline-primary fw-bold rounded-pill px-3">View</a>
                                    ${res.pdf_url ? `<a href="${res.pdf_url}" target="_blank" class="btn btn-sm btn-outline-danger fw-bold rounded-pill px-2.5">PDF</a>` : ''}
                                </div>
                            </div>`;
                    });
                    html += '</div>';
                    container.innerHTML = html;
                })
                .catch(() => {
                    container.innerHTML = '<div class="text-center py-4 text-danger">Error searching database</div>';
                });
        }, 200);
    }
    </script>

    <script>
    // Register Service Worker for Instant Static Caching
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    // Instant Link Hover Preloading Strategy
    const preloadedUrls = new Set();
    document.addEventListener('mouseover', function(e) {
        const link = e.target.closest('a[href]');
        if (!link || !link.href) return;
        const href = link.href;
        if (href.startsWith(window.location.origin) && !preloadedUrls.has(href) && !href.includes('#') && !href.includes('/pdf')) {
            preloadedUrls.add(href);
            const preloadLink = document.createElement('link');
            preloadLink.rel = 'prefetch';
            preloadLink.href = href;
            document.head.appendChild(preloadLink);
        }
    });
    </script>

    @stack('scripts')
</body>
</html>
