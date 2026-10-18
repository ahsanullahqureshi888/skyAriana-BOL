<?php $__env->startSection('title', 'Sky Ariana & Balam Bar Baran — Main Logistics Suite'); ?>

<?php $__env->startSection('content'); ?>
<div class="logistics-suite-dashboard py-2">
    <!-- Hero Banner (Executive Luminous Pearl Light Theme) -->
    <div class="card border-0 shadow-sm rounded-4 mb-4 overflow-hidden" style="background: linear-gradient(135deg, #ffffff 0%, #f8fafc 55%, #eff6ff 100%); border: 1px solid #e2e8f0 !important; border-top: 4px solid #2563eb !important; color: #0f172a;">
        <div class="card-body p-4 p-md-5">
            <div class="d-flex flex-wrap align-items-center justify-content-between gap-3">
                <div>
                    <div class="d-inline-flex align-items-center gap-2 px-3 py-1 rounded-pill mb-3" style="background: rgba(37, 99, 235, 0.1); border: 1px solid rgba(37, 99, 235, 0.25); color: #1e3a8a; font-size: 0.75rem; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase;">
                        <span class="status-pulse-dot bg-success"></span> All-in-One Main Logistics Software
                    </div>
                    <h1 class="display-6 fw-bold mb-2 text-dark" style="letter-spacing: -0.02em;">Sky Ariana &amp; Balam Bar Baran Suite</h1>
                    <p class="lead mb-0 text-secondary" style="max-width: 680px; font-size: 1.05rem; font-weight: 500;">
                        Unified Operating System for Afghan-International Trade, Customs Preference, Air Cargo Documentation, and ACCI Export Compliance.
                    </p>
                </div>
                <div class="d-flex flex-column gap-2">
                    <a href="<?php echo e(env('MAIN_LOGISTICS_URL', 'http://127.0.0.1:5173')); ?>" target="_top" class="btn btn-primary fw-bold px-4 py-2.5 shadow-sm d-flex align-items-center justify-content-center gap-2" style="background: linear-gradient(135deg, #1e3a8a, #2563eb); border: none;">
                        <span>🚀</span> <span>Open Main Logistics Software</span>
                    </a>
                    <a href="<?php echo e(route('safta-certificates.create')); ?>" class="btn btn-warning fw-bold px-4 py-2.5 shadow-sm d-flex align-items-center justify-content-center gap-2 text-dark" style="background: linear-gradient(135deg, #fbbf24, #f59e0b); border: none;">
                        <span>📜</span> <span>+ New SAFTA Certificate</span>
                    </a>
                    <a href="<?php echo e(route('acci-invoices.create')); ?>" class="btn btn-dark fw-bold px-4 py-2.5 shadow-sm d-flex align-items-center justify-content-center gap-2 text-white" style="background: #0f172a; border: none;">
                        <span>📄</span> <span>+ New Commercial Invoice</span>
                    </a>
                    <a href="<?php echo e(route('company-stamps.index')); ?>" class="btn btn-outline-secondary fw-bold px-4 py-2.5 shadow-sm d-flex align-items-center justify-content-center gap-2" style="background: white; border: 1px solid #cbd5e1; color: #475569;">
                        <span>⚙️</span> <span>Company Stamps Settings</span>
                    </a>
                </div>
            </div>
        </div>
    </div>

    <!-- 5 Suite Module Statistics Cards (Executive Glassmorphism Metric Cards) -->
    <div class="row g-3 mb-4">
        <div class="col-6 col-md-4 col-xl-2-4" style="flex: 1 0 18%; min-width: 180px;">
            <div class="card border-0 shadow-sm h-100 p-3 bg-white" style="border-radius: 1.1rem; border: 1px solid #e2e8f0 !important; border-top: 3px solid #2563eb !important; transition: transform 0.2s, box-shadow 0.2s;">
                <div class="d-flex align-items-center justify-content-between mb-2">
                    <span class="text-secondary fw-bold text-uppercase" style="font-size: 0.72rem; letter-spacing: 0.04em;">Invoices</span>
                    <div style="width: 38px; height: 38px; background: #eff6ff; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">📄</div>
                </div>
                <div class="fs-3 fw-bold text-dark mb-1" style="letter-spacing: -0.02em;"><?php echo e(number_format($counts['invoices'])); ?></div>
                <div class="d-flex align-items-center justify-content-between">
                    <span class="text-muted" style="font-size: 0.74rem; font-weight: 600;">ACCI Commercial</span>
                    <span class="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-2 py-0.5" style="font-size: 0.65rem;">Active</span>
                </div>
            </div>
        </div>

        <div class="col-6 col-md-4 col-xl-2-4" style="flex: 1 0 18%; min-width: 180px;">
            <div class="card border-0 shadow-sm h-100 p-3 bg-white" style="border-radius: 1.1rem; border: 1px solid #e2e8f0 !important; border-top: 3px solid #10b981 !important; transition: transform 0.2s, box-shadow 0.2s;">
                <div class="d-flex align-items-center justify-content-between mb-2">
                    <span class="text-secondary fw-bold text-uppercase" style="font-size: 0.72rem; letter-spacing: 0.04em;">Packing Lists</span>
                    <div style="width: 38px; height: 38px; background: #ecfdf5; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">📦</div>
                </div>
                <div class="fs-3 fw-bold text-dark mb-1" style="letter-spacing: -0.02em;"><?php echo e(number_format($counts['packing_lists'])); ?></div>
                <div class="d-flex align-items-center justify-content-between">
                    <span class="text-muted" style="font-size: 0.74rem; font-weight: 600;">Export Cargo</span>
                    <span class="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2 py-0.5" style="font-size: 0.65rem;">Ready</span>
                </div>
            </div>
        </div>

        <div class="col-6 col-md-4 col-xl-2-4" style="flex: 1 0 18%; min-width: 180px;">
            <div class="card border-0 shadow-sm h-100 p-3 bg-white" style="border-radius: 1.1rem; border: 1px solid #e2e8f0 !important; border-top: 3px solid #06b6d4 !important; transition: transform 0.2s, box-shadow 0.2s;">
                <div class="d-flex align-items-center justify-content-between mb-2">
                    <span class="text-secondary fw-bold text-uppercase" style="font-size: 0.72rem; letter-spacing: 0.04em;">Air Waybills</span>
                    <div style="width: 38px; height: 38px; background: #ecfeff; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">✈️</div>
                </div>
                <div class="fs-3 fw-bold text-dark mb-1" style="letter-spacing: -0.02em;"><?php echo e(number_format($counts['air_waybills'])); ?></div>
                <div class="d-flex align-items-center justify-content-between">
                    <span class="text-muted" style="font-size: 0.74rem; font-weight: 600;">IATA Carrier AWB</span>
                    <span class="badge bg-info-subtle text-info border border-info-subtle rounded-pill px-2 py-0.5" style="font-size: 0.65rem;">IATA</span>
                </div>
            </div>
        </div>

        <div class="col-6 col-md-4 col-xl-2-4" style="flex: 1 0 18%; min-width: 180px;">
            <div class="card border-0 shadow-sm h-100 p-3" style="border-radius: 1.1rem; border: 1px solid #fde68a !important; border-top: 3px solid #f59e0b !important; background: linear-gradient(135deg, #ffffff 0%, #fffef5 100%); transition: transform 0.2s, box-shadow 0.2s;">
                <div class="d-flex align-items-center justify-content-between mb-2">
                    <span class="text-secondary fw-bold text-uppercase" style="font-size: 0.72rem; letter-spacing: 0.04em;">SAFTA Origin</span>
                    <div style="width: 38px; height: 38px; background: #fef3c7; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">📜</div>
                </div>
                <div class="fs-3 fw-bold text-dark mb-1" style="letter-spacing: -0.02em;"><?php echo e(number_format($counts['safta_certificates'])); ?></div>
                <div class="d-flex align-items-center justify-content-between">
                    <span class="text-muted" style="font-size: 0.74rem; font-weight: 600;">Preferential Trade</span>
                    <span class="badge bg-warning-subtle text-warning border border-warning-subtle rounded-pill px-2 py-0.5" style="font-size: 0.65rem;">Verified</span>
                </div>
            </div>
        </div>

        <div class="col-6 col-md-4 col-xl-2-4" style="flex: 1 0 18%; min-width: 180px;">
            <div class="card border-0 shadow-sm h-100 p-3 bg-white" style="border-radius: 1.1rem; border: 1px solid #e2e8f0 !important; border-top: 3px solid #64748b !important; transition: transform 0.2s, box-shadow 0.2s;">
                <div class="d-flex align-items-center justify-content-between mb-2">
                    <span class="text-secondary fw-bold text-uppercase" style="font-size: 0.72rem; letter-spacing: 0.04em;">Stickers</span>
                    <div style="width: 38px; height: 38px; background: #f1f5f9; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">🏷️</div>
                </div>
                <div class="fs-3 fw-bold text-dark mb-1" style="letter-spacing: -0.02em;"><?php echo e(number_format($counts['shipping_stickers'])); ?></div>
                <div class="d-flex align-items-center justify-content-between">
                    <span class="text-muted" style="font-size: 0.74rem; font-weight: 600;">Cargo Labels</span>
                    <span class="badge bg-secondary-subtle text-secondary border border-secondary-subtle rounded-pill px-2 py-0.5" style="font-size: 0.65rem;">Barcodes</span>
                </div>
            </div>
        </div>
    </div>

    <!-- Main Suite Module Applications Grid (Executive Luminous Glass Cards) -->
    <h2 class="h5 fw-bold text-dark mb-3 d-flex align-items-center gap-2" style="letter-spacing: -0.01em;">
        <span>🏢</span> <span>Logistics Document Suite Modules</span>
    </h2>
    <div class="row g-4 mb-5">
        <!-- SAFTA Certificate Module Card -->
        <div class="col-12 col-md-6 col-lg-4">
            <div class="card border-0 shadow-sm h-100 overflow-hidden d-flex flex-column bg-white" style="border-radius: 1.25rem; border: 1px solid #e2e8f0 !important; border-top: 4px solid #f59e0b !important; transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);">
                <div class="card-body p-4 d-flex flex-column">
                    <div class="d-flex align-items-center justify-content-between mb-3">
                        <span class="badge bg-warning-subtle text-warning border border-warning-subtle rounded-pill px-3 py-1 fw-bold" style="font-size: 0.72rem;">SAFTA Preference</span>
                        <div style="width: 44px; height: 44px; background: #fef3c7; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.4rem;">📜</div>
                    </div>
                    <h3 class="h5 fw-bold text-dark mb-2" style="letter-spacing: -0.01em;">SAFTA Certificate of Origin</h3>
                    <p class="text-secondary small mb-4 flex-grow-1" style="line-height: 1.6;">
                        100% pixel-perfect replica of official ACCI South Asian Free Trade Area paper certificates. Features authentic pale yellow safety paper (#fcecb8), 7-column baseline alignment, and ACCI blue seal.
                    </p>
                    <div class="d-flex gap-2 mt-auto">
                        <a href="<?php echo e(route('safta-certificates.index')); ?>" class="btn btn-outline-dark fw-bold flex-grow-1 py-2" style="border-radius: 0.65rem;">
                            Manage Suite →
                        </a>
                        <a href="<?php echo e(route('safta-certificates.create')); ?>" class="btn btn-warning fw-bold px-3 py-2 text-dark" style="border-radius: 0.65rem; background: linear-gradient(135deg, #fbbf24, #f59e0b); border: none;">
                            + New
                        </a>
                    </div>
                </div>
            </div>
        </div>

        <!-- ACCI Commercial Invoices Card -->
        <div class="col-12 col-md-6 col-lg-4">
            <div class="card border-0 shadow-sm h-100 overflow-hidden d-flex flex-column bg-white" style="border-radius: 1.25rem; border: 1px solid #e2e8f0 !important; border-top: 4px solid #2563eb !important; transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);">
                <div class="card-body p-4 d-flex flex-column">
                    <div class="d-flex align-items-center justify-content-between mb-3">
                        <span class="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-3 py-1 fw-bold" style="font-size: 0.72rem;">Customs Trade</span>
                        <div style="width: 44px; height: 44px; background: #eff6ff; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.4rem;">📄</div>
                    </div>
                    <h3 class="h5 fw-bold text-dark mb-2" style="letter-spacing: -0.01em;">ACCI Commercial Invoices</h3>
                    <p class="text-secondary small mb-4 flex-grow-1" style="line-height: 1.6;">
                        Official Kabul Chamber of Commerce invoices with automated line items, live totals, English words currency conversion, and company rubber stamps.
                    </p>
                    <div class="d-flex gap-2 mt-auto">
                        <a href="<?php echo e(route('acci-invoices.index')); ?>" class="btn btn-outline-dark fw-bold flex-grow-1 py-2" style="border-radius: 0.65rem;">
                            Manage Invoices →
                        </a>
                        <a href="<?php echo e(route('acci-invoices.create')); ?>" class="btn btn-primary fw-bold px-3 py-2" style="border-radius: 0.65rem; background: linear-gradient(135deg, #1e3a8a, #2563eb); border: none;">
                            + New
                        </a>
                    </div>
                </div>
            </div>
        </div>

        <!-- ACCI Packing Lists Card -->
        <div class="col-12 col-md-6 col-lg-4">
            <div class="card border-0 shadow-sm h-100 overflow-hidden d-flex flex-column bg-white" style="border-radius: 1.25rem; border: 1px solid #e2e8f0 !important; border-top: 4px solid #10b981 !important; transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);">
                <div class="card-body p-4 d-flex flex-column">
                    <div class="d-flex align-items-center justify-content-between mb-3">
                        <span class="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-3 py-1 fw-bold" style="font-size: 0.72rem;">Cargo Logistics</span>
                        <div style="width: 44px; height: 44px; background: #ecfdf5; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.4rem;">📦</div>
                    </div>
                    <h3 class="h5 fw-bold text-dark mb-2" style="letter-spacing: -0.01em;">Export Packing Lists</h3>
                    <p class="text-secondary small mb-4 flex-grow-1" style="line-height: 1.6;">
                        Export cargo breakdown documents detailing package quantities, net/gross weights, measurements, and harmonized customs tariff marks.
                    </p>
                    <div class="d-flex gap-2 mt-auto">
                        <a href="<?php echo e(route('acci-packing-lists.index')); ?>" class="btn btn-outline-dark fw-bold flex-grow-1 py-2" style="border-radius: 0.65rem;">
                            Manage Packing →
                        </a>
                        <a href="<?php echo e(route('acci-packing-lists.create')); ?>" class="btn btn-success fw-bold px-3 py-2" style="border-radius: 0.65rem; background: linear-gradient(135deg, #059669, #10b981); border: none;">
                            + New
                        </a>
                    </div>
                </div>
            </div>
        </div>

        <!-- Air Waybills Card -->
        <div class="col-12 col-md-6 col-lg-4">
            <div class="card border-0 shadow-sm h-100 overflow-hidden d-flex flex-column bg-white" style="border-radius: 1.25rem; border: 1px solid #e2e8f0 !important; border-top: 4px solid #06b6d4 !important; transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);">
                <div class="card-body p-4 d-flex flex-column">
                    <div class="d-flex align-items-center justify-content-between mb-3">
                        <span class="badge bg-info-subtle text-info border border-info-subtle rounded-pill px-3 py-1 fw-bold" style="font-size: 0.72rem;">Airline Cargo</span>
                        <div style="width: 44px; height: 44px; background: #ecfeff; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.4rem;">✈️</div>
                    </div>
                    <h3 class="h5 fw-bold text-dark mb-2" style="letter-spacing: -0.01em;">Air Waybills (AWB Master/House)</h3>
                    <p class="text-secondary small mb-4 flex-grow-1" style="line-height: 1.6;">
                        IATA air waybill documents with 12-column freight charges breakdown, carrier contract terms, agent stamp uploads, and 1-click duplication.
                    </p>
                    <div class="d-flex gap-2 mt-auto">
                        <a href="<?php echo e(route('air-waybills.index')); ?>" class="btn btn-outline-dark fw-bold flex-grow-1 py-2" style="border-radius: 0.65rem;">
                            Manage AWBs →
                        </a>
                        <a href="<?php echo e(route('air-waybills.create')); ?>" class="btn btn-info fw-bold px-3 py-2 text-white" style="border-radius: 0.65rem; background: linear-gradient(135deg, #0891b2, #06b6d4); border: none;">
                            + New
                        </a>
                    </div>
                </div>
            </div>
        </div>

        <!-- Shipping Stickers Card -->
        <div class="col-12 col-md-6 col-lg-4">
            <div class="card border-0 shadow-sm h-100 overflow-hidden d-flex flex-column bg-white" style="border-radius: 1.25rem; border: 1px solid #e2e8f0 !important; border-top: 4px solid #64748b !important; transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);">
                <div class="card-body p-4 d-flex flex-column">
                    <div class="d-flex align-items-center justify-content-between mb-3">
                        <span class="badge bg-secondary-subtle text-secondary border border-secondary-subtle rounded-pill px-3 py-1 fw-bold" style="font-size: 0.72rem;">Carton Labels</span>
                        <div style="width: 44px; height: 44px; background: #f1f5f9; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.4rem;">🏷️</div>
                    </div>
                    <h3 class="h5 fw-bold text-dark mb-2" style="letter-spacing: -0.01em;">Shipping Stickers &amp; Barcodes</h3>
                    <p class="text-secondary small mb-4 flex-grow-1" style="line-height: 1.6;">
                        Export carton shipping stickers with barcode generation, consignee destination tags, and high-visibility logistics handling marks.
                    </p>
                    <div class="d-flex gap-2 mt-auto">
                        <a href="<?php echo e(route('shipping-stickers.index')); ?>" class="btn btn-outline-dark fw-bold flex-grow-1 py-2" style="border-radius: 0.65rem;">
                            Manage Stickers →
                        </a>
                        <a href="<?php echo e(route('shipping-stickers.create')); ?>" class="btn btn-secondary fw-bold px-3 py-2" style="border-radius: 0.65rem;">
                            + New
                        </a>
                    </div>
                </div>
            </div>
        </div>

        <!-- Quick Integration Card -->
        <div class="col-12 col-md-6 col-lg-4">
            <div class="card border-0 shadow-sm h-100 overflow-hidden d-flex flex-column" style="border-radius: 1.25rem; border: 1px solid #e2e8f0 !important; border-top: 4px solid #0f172a !important; background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%); transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);">
                <div class="card-body p-4 d-flex flex-column">
                    <div class="d-flex align-items-center justify-content-between mb-3">
                        <span class="badge bg-dark text-white rounded-pill px-3 py-1 fw-bold" style="font-size: 0.72rem;">System Status</span>
                        <div style="width: 44px; height: 44px; background: #e2e8f0; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.4rem;">⚡</div>
                    </div>
                    <h3 class="h5 fw-bold text-dark mb-2" style="letter-spacing: -0.01em;">Unified All-in-One Engine</h3>
                    <p class="text-secondary small mb-4 flex-grow-1" style="line-height: 1.6;">
                        All 5 logistics document modules run on a unified SQLite transactional engine with instantaneous PDF rendering, print previews, and automated serial tracking.
                    </p>
                    <div class="d-flex gap-2 mt-auto">
                        <a href="<?php echo e(route('document-suite.health')); ?>" target="_blank" class="btn btn-outline-dark fw-bold w-100 py-2" style="border-radius: 0.65rem;">
                            Check System API Health →
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Consolidated Recent Logistics Documents Log (Executive Luminous Card) -->
    <div class="card border-0 shadow-sm overflow-hidden mb-4 bg-white" style="border-radius: 1.25rem; border: 1px solid #e2e8f0 !important;">
        <div class="card-header bg-white p-4 border-bottom d-flex align-items-center justify-content-between">
            <div>
                <div class="d-inline-flex align-items-center gap-1.5 px-2.5 py-0.5 rounded-pill bg-primary-subtle text-primary fw-bold mb-2" style="font-size: 0.7rem;">
                    <span>⚡</span> <span>Live Database Activity Feed</span>
                </div>
                <h3 class="h5 fw-bold mb-1 text-dark" style="letter-spacing: -0.01em;">Recent Logistics Suite Activity</h3>
                <p class="text-secondary small mb-0">Consolidated real-time feed of all documents created across Invoices, Packing Lists, AWBs, SAFTA, and Stickers</p>
            </div>
        </div>
        <div class="card-body p-0">
            <div class="table-responsive">
                <table class="table table-hover align-middle mb-0">
                    <thead style="background: #f8fafc; color: #475569; font-size: 0.75rem; font-weight: 750; letter-spacing: 0.04em; text-transform: uppercase;">
                        <tr>
                            <th class="ps-4 py-3.5 border-bottom">Document Type</th>
                            <th class="py-3.5 border-bottom">Number / Ref</th>
                            <th class="py-3.5 border-bottom">Party / Consignee</th>
                            <th class="py-3.5 border-bottom">Date</th>
                            <th class="text-end pe-4 py-3.5 border-bottom">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php $__empty_1 = true; $__currentLoopData = $recentActivities; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $item): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); $__empty_1 = false; ?>
                        <tr>
                            <td class="ps-4 py-3.5">
                                <span class="badge <?php echo e($item->badge); ?> rounded-pill px-3 py-1.5 fw-bold shadow-sm" style="font-size: 0.75rem;">
                                    <span class="me-1"><?php echo e($item->icon); ?></span> <?php echo e($item->type); ?>

                                </span>
                            </td>
                            <td class="fw-bold text-dark py-3.5" style="font-size: 0.95rem;"><?php echo e($item->number); ?></td>
                            <td class="text-secondary fw-semibold py-3.5"><?php echo e($item->party); ?></td>
                            <td class="text-muted small py-3.5"><?php echo e($item->date); ?></td>
                            <td class="text-end pe-4 py-3.5">
                                <div class="btn-group shadow-sm" role="group">
                                    <a href="<?php echo e($item->view_url); ?>" class="btn btn-sm btn-outline-primary fw-bold px-2.5" title="View Document">
                                        View
                                    </a>
                                    <a href="<?php echo e($item->pdf_url); ?>" target="_blank" class="btn btn-sm btn-outline-danger fw-bold px-2.5" title="Download PDF">
                                        PDF
                                    </a>
                                    <a href="<?php echo e($item->print_url); ?>" target="_blank" class="btn btn-sm btn-outline-dark fw-bold px-2.5" title="Print Document">
                                        Print
                                    </a>
                                </div>
                            </td>
                        </tr>
                        <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); if ($__empty_1): ?>
                        <tr>
                            <td colspan="5" class="text-center py-5 text-muted">
                                <div class="py-4">
                                    <div class="fs-1 mb-2">🏢</div>
                                    <div class="fw-bold text-dark mb-1">No logistics documents found</div>
                                    <p class="small text-muted mb-0">Click "+ New" above to create your first document in the suite.</p>
                                </div>
                            </td>
                        </tr>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>
<?php $__env->stopSection(); ?>

<?php echo $__env->make('layouts.app', array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?><?php /**PATH E:\New folder\sky-ariana-bbb\acci-laravel\resources\views/dashboard.blade.php ENDPATH**/ ?>