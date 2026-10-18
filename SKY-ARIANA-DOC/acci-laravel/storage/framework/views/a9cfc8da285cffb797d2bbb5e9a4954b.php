<?php $__env->startSection('title', 'Create ACCI Packing List'); ?>

<?php $__env->startSection('content'); ?>
    <header class="mb-4">
        <p class="page-kicker">Commercial documents</p>
        <h1 class="page-title fs-3 fw-bold">Create ACCI Packing List</h1>
    </header>

    <?php echo $__env->make('acci-packing-lists._form', [
        'action' => route('acci-packing-lists.store'),
        'method' => 'POST',
        'submitLabel' => 'Create Packing List',
        'cancelUrl' => route('acci-packing-lists.index'),
    ], array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?>
<?php $__env->stopSection(); ?>

<?php echo $__env->make('layouts.app', array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?><?php /**PATH E:\New folder\sky-ariana-bbb\acci-laravel\resources\views/acci-packing-lists/create.blade.php ENDPATH**/ ?>