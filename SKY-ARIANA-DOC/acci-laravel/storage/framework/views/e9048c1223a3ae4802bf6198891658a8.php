<?php $__env->startSection('title', 'Create ACCI Invoice'); ?>

<?php $__env->startSection('content'); ?>
    <header class="d-flex flex-wrap align-items-end justify-content-between gap-3 mb-4 no-print">
        <div>
            <p class="page-kicker">Commercial documents</p>
            <h1 class="page-title">Create ACCI invoice</h1>
            <p class="page-subtitle">Enter the commercial details while the print-ready document updates beside the form.</p>
        </div>
        <a class="btn btn-outline-secondary" href="<?php echo e(route('acci-invoices.index')); ?>">Back to invoices</a>
    </header>

    <?php echo $__env->make('acci-invoices._form', [
        'action' => route('acci-invoices.store'),
        'method' => 'POST',
        'submitLabel' => 'Save Invoice',
        'cancelUrl' => route('acci-invoices.index'),
    ], array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?>
<?php $__env->stopSection(); ?>

<?php echo $__env->make('layouts.app', array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?><?php /**PATH E:\New folder\sky-ariana-bbb\acci-laravel\resources\views/acci-invoices/create.blade.php ENDPATH**/ ?>