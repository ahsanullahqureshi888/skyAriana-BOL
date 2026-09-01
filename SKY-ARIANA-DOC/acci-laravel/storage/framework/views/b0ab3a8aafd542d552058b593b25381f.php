<?php $__env->startSection('title', 'Shipping Stickers'); ?>

<?php $__env->startSection('content'); ?>
    <div class="dashboard-header-card mb-4 d-flex flex-wrap align-items-center justify-content-between gap-3">
        <div>
            <div class="header-verified-pill">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg> ACCI Freight Labeling
            </div>
            <h1 class="dashboard-header-card__title">Shipping Stickers &amp; Labels</h1>
            <p class="dashboard-header-card__subtitle">Create, search, view, print, and export printable ACCI export product &amp; box shipping stickers.</p>
        </div>
        <div class="d-flex flex-wrap align-items-center gap-2">
            <a class="btn btn-outline-light px-3 py-2 text-sm fw-bold rounded-3 d-inline-flex align-items-center gap-1.5" href="<?php echo e(route('shipping-stickers.index')); ?>">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg> Refresh
            </a>
            <a class="btn btn-primary-action px-4 py-2 shadow-sm d-inline-flex align-items-center gap-2" href="<?php echo e(route('shipping-stickers.create')); ?>" style="font-size:0.92rem">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> Create Shipping Sticker
            </a>
        </div>
    </div>

    <?php
        $totalCount = $stickers->total();
        $exporterCount = $stickers->pluck('exporter_name')->filter()->unique()->count();
        $importerCount = $stickers->pluck('importer_name')->filter()->unique()->count();
    ?>

    <div class="row g-3 mb-4 dashboard-kpi-row">
        <div class="col-6 col-md-4">
            <div class="kpi-card-modern">
                <div class="d-flex align-items-center gap-3">
                    <div class="kpi-card-modern__icon-well text-white" style="background: linear-gradient(135deg, #3b82f6, #1d4ed8);">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                    </div>
                    <div class="overflow-hidden">
                        <div class="kpi-card-modern__label text-truncate">TOTAL STICKERS</div>
                        <div class="kpi-card-modern__value text-truncate"><?php echo e(number_format($totalCount)); ?></div>
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
                        <div class="kpi-card-modern__value text-truncate"><?php echo e(number_format($exporterCount)); ?></div>
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
                        <div class="kpi-card-modern__value text-truncate"><?php echo e(number_format($importerCount)); ?></div>
                        <span class="kpi-card-modern__badge" style="background:#e0f2fe;color:#0369a1;">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg> Destination Importers
                        </span>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <form class="dashboard-toolbar-card mb-4" action="<?php echo e(route('shipping-stickers.index')); ?>" method="GET" role="search">
        <div class="d-flex flex-wrap flex-lg-nowrap align-items-center justify-content-between gap-3">
            <div class="flex-grow-1 w-100">
                <label class="visually-hidden" for="search">Search shipping stickers</label>
                <div class="input-group input-group-lg search-input-group">
                    <span class="input-group-text bg-transparent border-end-0 text-slate-400 ps-3">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    </span>
                    <input class="form-control border-start-0 ps-1 fs-6 shadow-none bg-transparent" id="search" name="search" type="search" value="<?php echo e($search); ?>" placeholder="Search sticker no., exporter, importer, or commodity...">
                </div>
            </div>
            <div class="d-flex align-items-center gap-2 flex-shrink-0">
                <button class="btn btn-primary-action px-4 py-2.5 fw-bold d-inline-flex align-items-center gap-2" type="submit">
                    Search
                </button>
                <?php if($search !== ''): ?>
                    <a class="btn btn-outline-secondary px-3 py-2.5 fw-bold rounded-3" href="<?php echo e(route('shipping-stickers.index')); ?>">Clear</a>
                <?php endif; ?>
            </div>
        </div>
        <div class="d-flex flex-wrap align-items-center gap-2 mt-3 pt-3 border-top border-slate-100">
            <span class="text-secondary" style="font-size:0.75rem;font-weight:700;letter-spacing:0.04em;text-transform:uppercase">Quick Filters:</span>
            <a class="badge <?php echo e($search === '' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'); ?> text-decoration-none px-3 py-1.5 rounded-pill" href="<?php echo e(route('shipping-stickers.index')); ?>" style="font-size:0.78rem;font-weight:700">All Stickers (<?php echo e($totalCount); ?>)</a>
            <span class="badge bg-slate-100 text-slate-600 px-3 py-1.5 rounded-pill d-inline-flex align-items-center gap-1.5" style="font-size:0.78rem;font-weight:700">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg> ACCI Label
            </span>
            <span class="badge bg-slate-100 text-slate-600 px-3 py-1.5 rounded-pill d-inline-flex align-items-center gap-1.5" style="font-size:0.78rem;font-weight:700">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg> Export Standard
            </span>
        </div>
    </form>

    <div class="dashboard-table-card">
        <div class="table-responsive">
            <table class="table align-middle mb-0 custom-modern-table">
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
                    <?php $__empty_1 = true; $__currentLoopData = $stickers; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $stk): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); $__empty_1 = false; ?>
                        <tr>
                            <td class="ps-4">
                                <a class="invoice-number-link fw-extrabold text-primary text-decoration-none d-inline-flex align-items-center gap-1.5" href="<?php echo e(route('shipping-stickers.show', $stk)); ?>">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                                    <?php echo e($stk->sticker_no); ?>

                                </a>
                            </td>
                            <td>
                                <span class="badge border font-mono px-2.5 py-1.5" style="background:#f8fafc;color:#1e293b;border-color:#cbd5e1 !important;font-size:0.8rem;font-weight:700;display:inline-block">
                                    <?php echo e($stk->sticker_date ? $stk->sticker_date->format('m/d/Y') : ''); ?>

                                </span>
                            </td>
                            <td>
                                <div class="d-flex align-items-center gap-3">
                                    <div class="rounded-circle bg-slate-100 text-slate-600 d-grid place-items-center flex-shrink-0" style="width:36px;height:36px;font-size:0.85rem;font-weight:800">
                                        <?php echo e(strtoupper(substr($stk->exporter_name, 0, 2))); ?>

                                    </div>
                                    <div>
                                        <strong class="text-slate-800 d-block" style="font-size:0.9rem"><?php echo e($stk->exporter_name); ?></strong>
                                        <span class="text-slate-500 text-truncate d-block" style="font-size:0.75rem;max-width:200px">Shipper</span>
                                    </div>
                                </div>
                            </td>
                            <td>
                                <div class="d-flex align-items-center gap-3">
                                    <div class="rounded-circle text-blue-700 d-grid place-items-center flex-shrink-0" style="width:36px;height:36px;font-size:0.85rem;background:#eff6ff;font-weight:800">
                                        <?php echo e(strtoupper(substr($stk->importer_name, 0, 2))); ?>

                                    </div>
                                    <div>
                                        <span class="text-slate-800 fw-bold d-block" style="font-size:0.9rem"><?php echo e($stk->importer_name); ?></span>
                                        <span class="text-slate-500 text-truncate d-block" style="font-size:0.75rem;max-width:200px">Consignee</span>
                                    </div>
                                </div>
                            </td>
                            <td>
                                <span class="badge border px-2.5 py-1.5 d-inline-flex align-items-center gap-1.5" style="background:#f8fafc;color:#0f172a;border-color:#cbd5e1 !important;font-weight:700;font-size:0.8rem">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                                    <?php echo e($stk->commodity_name); ?>

                                </span>
                            </td>
                            <td>
                                <span class="fw-bold text-slate-700 d-inline-flex align-items-center gap-1.5" style="font-size:0.9rem">
                                    <svg class="text-slate-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/></svg>
                                    <?php echo e($stk->net_wt); ?>

                                </span>
                            </td>
                            <td class="pe-4">
                                <div class="d-flex flex-nowrap align-items-center justify-content-end gap-1.5">
                                    <a class="btn-doc-modern btn-doc-modern--view" href="<?php echo e(route('shipping-stickers.show', $stk)); ?>" title="View Sticker">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg> View
                                    </a>
                                    <a class="btn-doc-modern btn-doc-modern--edit" href="<?php echo e(route('shipping-stickers.edit', $stk)); ?>" title="Edit Sticker">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="16 3 21 8 8 21 3 21 3 16 16 3"></polygon></svg> Edit
                                    </a>
                                    <a class="btn-doc-modern btn-doc-modern--print" href="<?php echo e(route('shipping-stickers.print', $stk)); ?>" target="_blank" rel="noopener" title="Open A4 Print Sheet">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg> Print
                                    </a>
                                    <a class="btn-doc-modern btn-doc-modern--pdf" href="<?php echo e(route('shipping-stickers.pdf', $stk)); ?>" title="Download Official PDF">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg> PDF
                                    </a>
                                </div>
                            </td>
                        </tr>
                    <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); if ($__empty_1): ?>
                        <tr>
                            <td colspan="7">
                                <div class="empty-state py-5 text-center">
                                    <div class="mb-4 text-slate-300 d-flex justify-content-center">
                                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                                    </div>
                                    <strong class="d-block mb-1 fs-5 text-slate-800">No Shipping Stickers Found</strong>
                                    <span class="text-slate-500 d-block mb-4"><?php echo e($search !== '' ? 'Try adjusting your search query or clearing filters.' : 'Create your first ACCI Shipping Sticker to get started.'); ?></span>
                                    <?php if($search === ''): ?>
                                        <a class="btn btn-primary-action px-4 py-2" href="<?php echo e(route('shipping-stickers.create')); ?>">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="me-2 inline-block"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> Create First Sticker
                                        </a>
                                    <?php endif; ?>
                                </div>
                            </td>
                        </tr>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
        <?php if($stickers->hasPages()): ?>
            <div class="card-footer bg-white px-4 py-3 border-top"><?php echo e($stickers->links()); ?></div>
        <?php endif; ?>
    </div>
<?php $__env->stopSection(); ?>

<?php echo $__env->make('layouts.app', array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?><?php /**PATH E:\New folder\sky-ariana-bbb\acci-laravel\resources\views/shipping-stickers/index.blade.php ENDPATH**/ ?>