<?php $__env->startSection('title', 'ACCI Packing Lists'); ?>

<?php $__env->startSection('content'); ?>
    <div class="dashboard-header-card mb-4 d-flex flex-wrap align-items-center justify-content-between gap-3">
        <div>
            <div class="header-verified-pill">
                <span>★</span> ACCI Commercial Documents
            </div>
            <h1 class="dashboard-header-card__title">ACCI Packing Lists</h1>
            <p class="dashboard-header-card__subtitle">Create, search, manage, print, and export standardized ACCI itemized cargo packing lists.</p>
        </div>
        <div class="d-flex flex-wrap align-items-center gap-2">
            <a class="btn btn-outline-light px-3 py-2 text-sm fw-bold rounded-3 d-inline-flex align-items-center gap-1.5" href="<?php echo e(route('acci-packing-lists.index')); ?>">
                <span>🔄</span> Refresh
            </a>
            <a class="btn btn-primary-action px-4 py-2 shadow-sm d-inline-flex align-items-center gap-2" href="<?php echo e(route('acci-packing-lists.create')); ?>" style="font-size:0.92rem">
                <span>+</span> Create Packing List
            </a>
        </div>
    </div>

    <?php
        $totalCount = $packingLists->total();
        $totalGrossWeight = $packingLists->sum('gross_weight');
        $totalCartons = $packingLists->sum('quantity_cartons');
        $buyerCount = $packingLists->pluck('buyer_name')->filter()->unique()->count();
    ?>

    <div class="row g-3 mb-4 dashboard-kpi-row">
        <div class="col-6 col-md-6 col-xl-3">
            <div class="kpi-card-modern">
                <div class="d-flex align-items-center gap-3">
                    <div class="kpi-card-modern__icon-well text-white" style="background: linear-gradient(135deg, #2563eb, #1d4ed8);">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
                    </div>
                    <div class="overflow-hidden">
                        <div class="kpi-card-modern__label text-truncate">TOTAL PACKING LISTS</div>
                        <div class="kpi-card-modern__value text-truncate"><?php echo e(number_format($totalCount)); ?></div>
                        <span class="kpi-card-modern__badge" style="background:#eff6ff;color:#1d4ed8;">
                            <span>✓</span> Cargo Records
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
                        <div class="kpi-card-modern__value text-truncate"><?php echo e(floor((float)$totalGrossWeight) == (float)$totalGrossWeight ? number_format((float)$totalGrossWeight, 0) : number_format((float)$totalGrossWeight, 1)); ?> <span class="fs-6 fw-bold text-secondary">KGS</span></div>
                        <span class="kpi-card-modern__badge" style="background:#ecfdf5;color:#047857;">
                            <span>⚖️</span> Total Weight
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
                        <div class="kpi-card-modern__label text-truncate">TOTAL CARTONS</div>
                        <div class="kpi-card-modern__value text-truncate"><?php echo e(number_format($totalCartons)); ?> <span class="fs-6 fw-bold text-secondary">CTNS</span></div>
                        <span class="kpi-card-modern__badge" style="background:#fef3c7;color:#b45309;">
                            <span>📦</span> Package Cartons
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
                        <div class="kpi-card-modern__value text-truncate"><?php echo e(number_format($buyerCount)); ?></div>
                        <span class="kpi-card-modern__badge" style="background:#e0f2fe;color:#0369a1;">
                            <span>🌍</span> Active Clients
                        </span>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <form class="dashboard-toolbar-card mb-4" action="<?php echo e(route('acci-packing-lists.index')); ?>" method="GET" role="search">
        <div class="d-flex flex-wrap flex-lg-nowrap align-items-center justify-content-between gap-3">
            <div class="flex-grow-1 w-100">
                <label class="visually-hidden" for="search">Search packing lists</label>
                <div class="input-group input-group-lg">
                    <span class="input-group-text bg-white border-end-0 text-secondary ps-3" style="font-size:1.1rem">🔍</span>
                    <input class="form-control border-start-0 ps-1 fs-6" id="search" name="search" type="search" value="<?php echo e($search); ?>" placeholder="Search packing list no., buyer, seller, commodity, or date...">
                </div>
            </div>
            <div class="d-flex align-items-center gap-2 flex-shrink-0">
                <button class="btn btn-primary-action px-4 py-2.5 fw-bold d-inline-flex align-items-center gap-1.5" type="submit">
                    <span>Search</span>
                </button>
                <?php if($search !== ''): ?>
                    <a class="btn btn-outline-secondary px-3 py-2.5 fw-bold rounded-3" href="<?php echo e(route('acci-packing-lists.index')); ?>">Clear</a>
                <?php endif; ?>
            </div>
        </div>
        <div class="d-flex flex-wrap align-items-center gap-2 mt-3 pt-3 border-top border-slate-100">
            <span class="text-secondary" style="font-size:0.75rem;font-weight:700;letter-spacing:0.04em;text-transform:uppercase">Quick Filters:</span>
            <a class="badge <?php echo e($search === '' ? 'bg-primary text-white' : 'bg-slate-100 text-dark'); ?> text-decoration-none px-3 py-1.5 rounded-pill" href="<?php echo e(route('acci-packing-lists.index')); ?>" style="font-size:0.78rem;font-weight:700">All Packing Lists (<?php echo e($totalCount); ?>)</a>
            <span class="badge bg-slate-100 text-dark px-3 py-1.5 rounded-pill" style="font-size:0.78rem;font-weight:700">📦 Itemized Cargo</span>
            <span class="badge bg-slate-100 text-dark px-3 py-1.5 rounded-pill" style="font-size:0.78rem;font-weight:700">⚖️ Verified Weight</span>
        </div>
    </form>

    <div class="dashboard-table-card">
        <div class="table-responsive">
            <table class="table align-middle mb-0">
                <thead>
                    <tr>
                        <th class="ps-4">PL NO.</th>
                        <th>DATE</th>
                        <th>BUYER</th>
                        <th>COMMODITY</th>
                        <th class="text-end">CARTONS</th>
                        <th class="text-end">GROSS WEIGHT</th>
                        <th class="text-end pe-4">ACTIONS</th>
                    </tr>
                </thead>
                <tbody>
                    <?php $__empty_1 = true; $__currentLoopData = $packingLists; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $pl): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); $__empty_1 = false; ?>
                        <tr>
                            <td class="ps-4">
                                <a class="invoice-number-link fw-extrabold text-primary text-decoration-none d-inline-flex align-items-center gap-1" href="<?php echo e(route('acci-packing-lists.show', $pl)); ?>">
                                    <span>📦</span> <?php echo e($pl->packing_list_no); ?>

                                </a>
                            </td>
                            <td>
                                <span class="badge bg-slate-100 text-dark border font-mono" style="background:#f8fafc;border-color:#e2e8f0;font-size:0.78rem;font-weight:700">
                                    <?php echo e($pl->packing_list_date->format('d M Y')); ?>

                                </span>
                            </td>
                            <td>
                                <div class="d-flex align-items-center gap-2">
                                    <div class="rounded-circle bg-blue-50 text-blue-700 d-grid place-items-center flex-shrink-0" style="width:34px;height:34px;font-size:0.85rem;background:#eff6ff;color:#1d4ed8;font-weight:800">
                                        <?php echo e(strtoupper(substr($pl->buyer_name, 0, 2))); ?>

                                    </div>
                                    <div>
                                        <strong class="text-dark d-block" style="font-size:0.9rem"><?php echo e($pl->buyer_name); ?></strong>
                                        <span class="text-secondary text-truncate d-block" style="font-size:0.73rem;max-width:200px">Commercial Buyer</span>
                                    </div>
                                </div>
                            </td>
                            <td>
                                <span class="badge bg-slate-100 text-dark border px-2.5 py-1.5" style="background:#f1f5f9;font-weight:700">
                                    <span>🏷️</span> <?php echo e($pl->commodity); ?>

                                </span>
                            </td>
                            <td class="text-end fw-bold text-dark">
                                <?php echo e(number_format($pl->quantity_cartons)); ?> <span class="text-secondary small">CTNS</span>
                            </td>
                            <td class="text-end">
                                <span class="text-success fw-extrabold" style="font-size:0.95rem">
                                    <?php echo e(floor((float)$pl->gross_weight) == (float)$pl->gross_weight ? number_format((float)$pl->gross_weight, 0, '.', ',') : number_format((float)$pl->gross_weight, 2, '.', ',')); ?> <span class="text-secondary small">KGS</span>
                                </span>
                            </td>
                            <td class="pe-4">
                                <div class="d-flex flex-wrap justify-content-end gap-1.5">
                                    <a class="btn-doc-modern btn-doc-modern--view" href="<?php echo e(route('acci-packing-lists.show', $pl)); ?>" title="View Packing List Details">
                                        <span>👁</span> View
                                    </a>
                                    <a class="btn-doc-modern btn-doc-modern--edit" href="<?php echo e(route('acci-packing-lists.edit', $pl)); ?>" title="Edit Packing List">
                                        <span>✏️</span> Edit
                                    </a>
                                    <a class="btn-doc-modern btn-doc-modern--print" href="<?php echo e(route('acci-packing-lists.print', $pl)); ?>" target="_blank" rel="noopener" title="Open A4 Print Sheet">
                                        <span>🖨️</span> Print
                                    </a>
                                    <a class="btn-doc-modern btn-doc-modern--pdf" href="<?php echo e(route('acci-packing-lists.pdf', $pl)); ?>" title="Download Official PDF">
                                        <span>📄</span> PDF
                                    </a>
                                </div>
                            </td>
                        </tr>
                    <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); if ($__empty_1): ?>
                        <tr>
                            <td colspan="7">
                                <div class="empty-state py-5 text-center">
                                    <div class="mb-3" style="font-size:2.5rem">📦</div>
                                    <strong class="d-block mb-1 fs-5 text-dark">No ACCI Packing Lists Found</strong>
                                    <span class="text-secondary d-block mb-3"><?php echo e($search !== '' ? 'Try adjusting your search query or clearing filters.' : 'Create your first itemized packing list to get started.'); ?></span>
                                    <?php if($search === ''): ?>
                                        <a class="btn btn-primary-action px-4" href="<?php echo e(route('acci-packing-lists.create')); ?>">+ Create First Packing List</a>
                                    <?php endif; ?>
                                </div>
                            </td>
                        </tr>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
        <?php if($packingLists->hasPages()): ?>
            <div class="card-footer bg-white px-4 py-3 border-top"><?php echo e($packingLists->links()); ?></div>
        <?php endif; ?>
    </div>
<?php $__env->stopSection(); ?>

<?php echo $__env->make('layouts.app', array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?><?php /**PATH E:\New folder\sky-ariana-bbb\acci-laravel\resources\views/acci-packing-lists/index.blade.php ENDPATH**/ ?>