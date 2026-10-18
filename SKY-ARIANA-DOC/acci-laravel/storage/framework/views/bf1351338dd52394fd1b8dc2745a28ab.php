<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="<?php echo e(csrf_token()); ?>">
    <title><?php echo $__env->yieldContent('title', 'Logistics Document Manager'); ?></title>
    <?php echo app('Illuminate\Foundation\Vite')(['resources/css/app.css', 'resources/js/app.js']); ?>
    <?php echo $__env->yieldPushContent('styles'); ?>
    <style>
        html.is-embedded nav.app-navbar { display: none !important; }
        html.is-embedded .embedded-hide { display: none !important; }
        html.is-embedded .embedded-doc-switcher { display: none !important; }
        html.is-embedded main.app-main { padding: 0.5rem 0.75rem 1rem !important; margin: 0 !important; width: 100% !important; max-width: 100% !important; }
        html.is-embedded body { background: #f8fafc !important; margin: 0 !important; overflow-x: hidden !important; }
    </style>
    <script>
        if (window.self !== window.top || new URLSearchParams(window.location.search).has('embed')) {
            document.documentElement.classList.add('is-embedded');
        }
    </script>
</head>
<body>
    <?php if (! (request()->routeIs('dashboard'))): ?>
    <nav class="navbar app-navbar no-print">
        <div class="container-fluid px-3 px-lg-4 app-navbar__inner">
            <a class="navbar-brand" href="<?php echo e(route('dashboard')); ?>">
                <span class="app-navbar__mark">SKY</span>
                <span class="app-navbar__title">Logistics Suite</span>
                <span class="app-navbar__status badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2.5 py-1 ms-1 d-none d-md-inline-flex align-items-center gap-1.5" style="font-size:0.7rem;font-weight:700">
                    <span class="status-pulse-dot"></span> Online
                </span>
            </a>
            <div class="app-navbar__controls d-flex align-items-center gap-2">
                <a class="app-navbar__back" href="<?php echo e(env('MAIN_LOGISTICS_URL', 'http://127.0.0.1:5173')); ?>" target="_top" style="background:linear-gradient(135deg, #1e3a8a, #2563eb);color:#fff;border-color:#1e3a8a;font-weight:700;">
                    <span aria-hidden="true">🚀</span>
                    <span>Main Logistics Software</span>
                </a>
                <a class="app-navbar__back" href="<?php echo e(route('dashboard')); ?>" aria-label="Suite Home Dashboard">
                    <span aria-hidden="true">🏢</span>
                    <span>Suite Home</span>
                </a>
            </div>
        </div>
    </nav>
    <?php endif; ?>

    <main class="container-fluid app-main px-3 px-lg-4">
        <!-- Modern Document Module Suite Navigation Bar (Unified Suite Navigation) -->
        <nav class="embedded-doc-switcher no-print mb-2.5" aria-label="ACCI document suite navigation">
            <div class="doc-switcher__inner d-flex flex-wrap align-items-center justify-content-between gap-2">
                <div class="doc-switcher__brand d-flex align-items-center gap-2">
                    <span class="doc-switcher__badge">SKY ARIANA LTD</span>
                    <span class="doc-switcher__subtitle">Main Logistics Operating Suite</span>
                    <span class="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2 py-0.5" style="font-size:0.68rem;font-weight:800">
                        <span class="status-pulse-dot me-1"></span> Live
                    </span>
                </div>
                <div class="doc-switcher__tabs d-flex flex-wrap gap-1">
                    <a class="doc-switcher__tab" href="<?php echo e(env('MAIN_LOGISTICS_URL', 'http://127.0.0.1:5173')); ?>" target="_top" style="background:linear-gradient(135deg, #1e3a8a, #2563eb);color:#fff;border-color:#1e3a8a;font-weight:800;box-shadow:0 4px 12px rgba(37,99,235,0.25);">
                        <span class="tab-icon">🚀</span>
                        <span class="tab-label">Main Logistics Software</span>
                    </a>
                    <a class="doc-switcher__tab <?php echo e(request()->routeIs('dashboard*') ? 'is-active' : ''); ?>" href="<?php echo e(route('dashboard')); ?>">
                        <span class="tab-icon">🏠</span>
                        <span class="tab-label">Suite Hub</span>
                    </a>
                    <a class="doc-switcher__tab <?php echo e(request()->routeIs('safta-certificates.*') ? 'is-active' : ''); ?>" href="<?php echo e(route('safta-certificates.index')); ?>">
                        <span class="tab-icon">📜</span>
                        <span class="tab-label">SAFTA Certificates</span>
                    </a>
                    <a class="doc-switcher__tab <?php echo e(request()->routeIs('acci-invoices.*') ? 'is-active' : ''); ?>" href="<?php echo e(route('acci-invoices.index')); ?>">
                        <span class="tab-icon">📄</span>
                        <span class="tab-label">ACCI Invoices</span>
                    </a>
                    <a class="doc-switcher__tab <?php echo e(request()->routeIs('acci-packing-lists.*') ? 'is-active' : ''); ?>" href="<?php echo e(route('acci-packing-lists.index')); ?>">
                        <span class="tab-icon">📦</span>
                        <span class="tab-label">Packing Lists</span>
                    </a>
                    <a class="doc-switcher__tab <?php echo e(request()->routeIs('air-waybills.*') ? 'is-active' : ''); ?>" href="<?php echo e(route('air-waybills.index')); ?>">
                        <span class="tab-icon">✈️</span>
                        <span class="tab-label">Air Waybills</span>
                    </a>
                    <a class="doc-switcher__tab <?php echo e(request()->routeIs('shipping-stickers.*') ? 'is-active' : ''); ?>" href="<?php echo e(route('shipping-stickers.index')); ?>">
                        <span class="tab-icon">🏷️</span>
                        <span class="tab-label">Shipping Stickers</span>
                    </a>
                </div>
            </div>
        </nav>

        <?php if(session('success')): ?>
            <div class="alert alert-success alert-dismissible fade show no-print" role="alert">
                <?php echo e(session('success')); ?>

                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        <?php endif; ?>

        <?php echo $__env->yieldContent('content'); ?>
    </main>

    <?php echo $__env->yieldPushContent('scripts'); ?>
</body>
</html>
<?php /**PATH E:\New folder\sky-ariana-bbb\acci-laravel\resources\views/layouts/app.blade.php ENDPATH**/ ?>