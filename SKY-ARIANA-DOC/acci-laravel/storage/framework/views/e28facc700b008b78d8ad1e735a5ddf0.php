<?php $__env->startSection('title', 'Create Air Waybill'); ?>

<?php $__env->startSection('content'); ?>
    <header class="d-flex flex-wrap align-items-end justify-content-between gap-3 mb-4 no-print">
        <div>
            <p class="page-kicker">Freight documents</p>
            <h1 class="page-title">Create Air Waybill</h1>
            <p class="page-subtitle">Enter shipment details while the IATA-style A4 preview updates beside the form.</p>
        </div>
        <a class="btn btn-outline-secondary" href="<?php echo e(route('air-waybills.index')); ?>">Back to AWBs</a>
    </header>

    <?php echo $__env->make('air-waybills._form', [
        'action' => route('air-waybills.store'),
        'method' => 'POST',
        'submitLabel' => 'Save AWB',
        'cancelUrl' => route('air-waybills.index'),
    ], array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?>
<?php $__env->stopSection(); ?>

<?php echo $__env->make('layouts.app', array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?><?php /**PATH E:\New folder\sky-ariana-bbb\acci-laravel\resources\views/air-waybills/create.blade.php ENDPATH**/ ?>