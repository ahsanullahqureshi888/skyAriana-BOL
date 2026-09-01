<?php $__env->startSection('title', 'SAFTA Certificates of Origin'); ?>

<?php $__env->startSection('content'); ?>
    <div class="dashboard-header-card mb-4 d-flex flex-wrap align-items-center justify-content-between gap-3">
        <div>
            <div class="header-verified-pill">
                <span>★</span> ACCI Verified Trade Preference
            </div>
            <h1 class="dashboard-header-card__title">SAFTA Certificates of Origin</h1>
            <p class="dashboard-header-card__subtitle">Manage, issue, and verify official South Asian Free Trade Area origin certificates for regional customs clearance & duty preferences.</p>
        </div>
        <div class="d-flex flex-wrap align-items-center gap-2">
            <a class="btn btn-outline-light px-3 py-2 text-sm fw-bold rounded-3 d-inline-flex align-items-center gap-1.5" href="<?php echo e(route('safta-certificates.index')); ?>">
                <span>🔄</span> Refresh
            </a>
            <a class="btn btn-primary-action px-4 py-2 shadow-sm d-inline-flex align-items-center gap-2" href="<?php echo e(route('safta-certificates.create')); ?>" style="font-size:0.92rem">
                <span>+</span> Create SAFTA Certificate
            </a>
        </div>
    </div>

    <?php
        $totalCount = $certificates->total();
        $exporterCount = $certificates->pluck('exporter_name')->filter()->unique()->count();
        $consigneeCount = $certificates->pluck('consignee_name')->filter()->unique()->count();
        $totalWeight = $certificates->sum(fn ($cert) => (float) preg_replace('/[^0-9.]/', '', $cert->gross_weight));
    ?>

    <div class="row g-3 mb-4 dashboard-kpi-row">
        <div class="col-6 col-md-6 col-xl-3">
            <div class="kpi-card-modern">
                <div class="d-flex align-items-center gap-3">
                    <div class="kpi-card-modern__icon-well text-white" style="background: linear-gradient(135deg, #2563eb, #1d4ed8);">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>
                    </div>
                    <div class="overflow-hidden">
                        <div class="kpi-card-modern__label text-truncate">TOTAL CERTIFICATES</div>
                        <div class="kpi-card-modern__value text-truncate"><?php echo e(number_format($totalCount)); ?></div>
                        <span class="kpi-card-modern__badge" style="background:#eff6ff;color:#1d4ed8;">
                            <span>✓</span> 100% ACCI Stamped
                        </span>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-6 col-md-6 col-xl-3">
            <div class="kpi-card-modern">
                <div class="d-flex align-items-center gap-3">
                    <div class="kpi-card-modern__icon-well text-white" style="background: linear-gradient(135deg, #059669, #047857);">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    </div>
                    <div class="overflow-hidden">
                        <div class="kpi-card-modern__label text-truncate">ACTIVE EXPORTERS</div>
                        <div class="kpi-card-modern__value text-truncate"><?php echo e(number_format($exporterCount)); ?></div>
                        <span class="kpi-card-modern__badge" style="background:#ecfdf5;color:#047857;">
                            <span>↑</span> Verified Exporters
                        </span>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-6 col-md-6 col-xl-3">
            <div class="kpi-card-modern">
                <div class="d-flex align-items-center gap-3">
                    <div class="kpi-card-modern__icon-well text-white" style="background: linear-gradient(135deg, #0284c7, #0369a1);">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.7 5.2c.3.4.8.5 1.3.3l.5-.3c.4-.2.6-.6.5-1.1z"/></svg>
                    </div>
                    <div class="overflow-hidden">
                        <div class="kpi-card-modern__label text-truncate">ACTIVE CONSIGNEES</div>
                        <div class="kpi-card-modern__value text-truncate"><?php echo e(number_format($consigneeCount)); ?></div>
                        <span class="kpi-card-modern__badge" style="background:#e0f2fe;color:#0369a1;">
                            <span>🌍</span> Regional Partners
                        </span>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-6 col-md-6 col-xl-3">
            <div class="kpi-card-modern">
                <div class="d-flex align-items-center gap-3">
                    <div class="kpi-card-modern__icon-well text-white" style="background: linear-gradient(135deg, #d97706, #b45309);">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
                    </div>
                    <div class="overflow-hidden">
                        <div class="kpi-card-modern__label text-truncate">TOTAL GROSS WEIGHT</div>
                        <div class="kpi-card-modern__value text-truncate"><?php echo e(number_format($totalWeight, 1)); ?> <span class="fs-6 fw-bold text-secondary">KGS</span></div>
                        <span class="kpi-card-modern__badge" style="background:#fef3c7;color:#b45309;">
                            <span>⚖️</span> Cleared Cargo
                        </span>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <form class="dashboard-toolbar-card mb-4" action="<?php echo e(route('safta-certificates.index')); ?>" method="GET" role="search">
        <div class="d-flex flex-wrap flex-lg-nowrap align-items-center justify-content-between gap-3">
            <div class="flex-grow-1 w-100">
                <label class="visually-hidden" for="search">Search SAFTA certificates</label>
                <div class="input-group input-group-lg">
                    <span class="input-group-text bg-white border-end-0 text-secondary ps-3" style="font-size:1.1rem">🔍</span>
                    <input class="form-control border-start-0 ps-1 fs-6" id="search" name="search" type="search" value="<?php echo e($search); ?>" placeholder="Search reference no., exporter, consignee, ACCI control no., or HS code...">
                </div>
            </div>
            <div class="d-flex align-items-center gap-2 flex-shrink-0">
                <button class="btn btn-primary-action px-4 py-2.5 fw-bold d-inline-flex align-items-center gap-1.5" type="submit">
                    <span>Search</span>
                </button>
                <?php if($search !== ''): ?>
                    <a class="btn btn-outline-secondary px-3 py-2.5 fw-bold rounded-3" href="<?php echo e(route('safta-certificates.index')); ?>">Clear</a>
                <?php endif; ?>
            </div>
        </div>
        <div class="d-flex flex-wrap align-items-center gap-2 mt-3 pt-3 border-top border-slate-100">
            <span class="text-secondary" style="font-size:0.75rem;font-weight:700;letter-spacing:0.04em;text-transform:uppercase">Quick Filters:</span>
            <a class="badge <?php echo e($search === '' ? 'bg-primary text-white' : 'bg-slate-100 text-dark'); ?> text-decoration-none px-3 py-1.5 rounded-pill" href="<?php echo e(route('safta-certificates.index')); ?>" style="font-size:0.78rem;font-weight:700">All Certificates (<?php echo e($totalCount); ?>)</a>
            <span class="badge bg-slate-100 text-dark px-3 py-1.5 rounded-pill" style="font-size:0.78rem;font-weight:700">🛡️ ACCI Stamped</span>
            <span class="badge bg-slate-100 text-dark px-3 py-1.5 rounded-pill" style="font-size:0.78rem;font-weight:700">🌍 South Asia Origin</span>
        </div>
    </form>

    <div class="dashboard-table-card">
        <div class="table-responsive">
            <table class="table align-middle mb-0">
                <thead>
                    <tr>
                        <th class="ps-4">REF NO.</th>
                        <th>CONTROL NO.</th>
                        <th>EXPORTER</th>
                        <th>CONSIGNEE</th>
                        <th>HS CODE</th>
                        <th>GROSS WEIGHT</th>
                        <th class="text-end pe-4">ACTIONS</th>
                    </tr>
                </thead>
                <tbody>
                    <?php $__empty_1 = true; $__currentLoopData = $certificates; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $cert): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); $__empty_1 = false; ?>
                        <tr>
                            <td class="ps-4 text-nowrap">
                                <a class="invoice-number-link fw-extrabold text-primary text-decoration-none d-inline-flex align-items-center gap-1" href="<?php echo e(route('safta-certificates.show', $cert)); ?>">
                                    <span>📜</span> <span style="font-size: 0.95rem;"><?php echo e($cert->reference_no ?: $cert->certificate_no); ?></span>
                                </a>
                            </td>
                            <td class="text-nowrap">
                                <span class="badge bg-rose-50 text-rose-700 border border-rose-200 font-mono font-bold px-2.5 py-1.5 d-inline-flex align-items-center gap-1" style="background:#fff1f2;color:#e11d48;font-size:0.76rem">
                                    <span style="font-size:0.85rem">🛡️</span> ACCI: <?php echo e($cert->acci_control_no); ?>

                                </span>
                            </td>
                            <td class="text-nowrap" style="min-width: 220px;">
                                <div class="d-flex align-items-center gap-2">
                                    <div class="rounded-circle bg-slate-100 text-slate-600 d-grid place-items-center flex-shrink-0" style="width:34px;height:34px;font-size:0.85rem;background:#f1f5f9;font-weight:800">
                                        <?php echo e(strtoupper(substr($cert->exporter_name, 0, 2))); ?>

                                    </div>
                                    <div class="overflow-hidden">
                                        <strong class="text-dark d-block text-truncate" style="font-size:0.85rem; max-width: 180px;" title="<?php echo e($cert->exporter_name); ?>"><?php echo e($cert->exporter_name); ?></strong>
                                        <span class="text-secondary text-truncate d-block" style="font-size:0.73rem;">Afghan Exporter</span>
                                    </div>
                                </div>
                            </td>
                            <td class="text-nowrap" style="min-width: 220px;">
                                <div class="d-flex align-items-center gap-2">
                                    <div class="rounded-circle bg-blue-50 text-blue-700 d-grid place-items-center flex-shrink-0" style="width:34px;height:34px;font-size:0.85rem;background:#eff6ff;color:#1d4ed8;font-weight:800">
                                        <?php echo e(strtoupper(substr($cert->consignee_name, 0, 2))); ?>

                                    </div>
                                    <div class="overflow-hidden">
                                        <strong class="text-dark fw-bold d-block text-truncate" style="font-size:0.85rem; max-width: 180px;" title="<?php echo e($cert->consignee_name); ?>"><?php echo e($cert->consignee_name); ?></strong>
                                        <span class="text-secondary text-truncate d-block" style="font-size:0.73rem;">Destination Consignee</span>
                                    </div>
                                </div>
                            </td>
                            <td class="text-nowrap">
                                <span class="badge bg-slate-100 text-dark border px-2.5 py-1.5 font-mono d-inline-flex align-items-center gap-1" style="background:#f8fafc;border-color:#e2e8f0;font-size:0.78rem;font-weight:700">
                                    <span>🏷️</span> <?php echo e($cert->hs_code ?: 'N/A'); ?>

                                </span>
                            </td>
                            <td class="text-nowrap">
                                <span class="fw-bold text-dark d-inline-flex align-items-center gap-1" style="font-size:0.85rem">
                                    <span>⚖️</span> <?php echo e($cert->gross_weight); ?>

                                </span>
                            </td>
                            <td class="pe-4">
                                <div class="d-flex flex-wrap justify-content-end gap-1.5">
                                    <a class="btn-doc-modern btn-doc-modern--view" href="<?php echo e(route('safta-certificates.show', $cert)); ?>" title="View Certificate Details">
                                        <span>👁</span> View
                                    </a>
                                    <a class="btn-doc-modern btn-doc-modern--edit" href="<?php echo e(route('safta-certificates.edit', $cert)); ?>" title="Edit Certificate">
                                        <span>✏️</span> Edit
                                    </a>
                                    <a class="btn-doc-modern btn-doc-modern--print" href="<?php echo e(route('safta-certificates.print', $cert)); ?>" target="_blank" rel="noopener" title="Open A4 Print Sheet">
                                        <span>🖨️</span> Print
                                    </a>
                                    <a class="btn-doc-modern btn-doc-modern--pdf" href="<?php echo e(route('safta-certificates.pdf', $cert)); ?>" title="Download Official PDF">
                                        <span>📄</span> PDF
                                    </a>
                                </div>
                            </td>
                        </tr>
                    <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); if ($__empty_1): ?>
                        <tr>
                            <td colspan="7">
                                <div class="empty-state py-5 text-center">
                                    <div class="mb-3" style="font-size:2.5rem">📜</div>
                                    <strong class="d-block mb-1 fs-5 text-dark">No SAFTA Certificates Found</strong>
                                    <span class="text-secondary d-block mb-3"><?php echo e($search !== '' ? 'Try adjusting your search criteria or clearing filters.' : 'Create your first ACCI SAFTA Certificate of Origin to get started.'); ?></span>
                                    <?php if($search === ''): ?>
                                        <a class="btn btn-primary-action px-4" href="<?php echo e(route('safta-certificates.create')); ?>">+ Create First SAFTA Certificate</a>
                                    <?php endif; ?>
                                </div>
                            </td>
                        </tr>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
        <?php if($certificates->hasPages()): ?>
            <div class="card-footer bg-white px-4 py-3 border-top"><?php echo e($certificates->links()); ?></div>
        <?php endif; ?>
    </div>
<?php $__env->stopSection(); ?>

<?php echo $__env->make('layouts.app', array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?><?php /**PATH E:\New folder\sky-ariana-bbb\acci-laravel\resources\views/safta-certificates/index.blade.php ENDPATH**/ ?>