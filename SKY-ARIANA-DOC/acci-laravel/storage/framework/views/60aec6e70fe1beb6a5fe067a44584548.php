<?php $__env->startSection('title', 'Create Shipping Sticker'); ?>

<?php $__env->startSection('content'); ?>
    <header class="mb-4">
        <p class="page-kicker">Product &amp; Shipping labels</p>
        <h1 class="page-title fs-3 fw-bold">Create Shipping Sticker</h1>
    </header>

    <?php echo $__env->make('shipping-stickers._form', [
        'action' => route('shipping-stickers.store'),
        'method' => 'POST',
        'submitLabel' => 'Create Shipping Sticker',
        'cancelUrl' => route('shipping-stickers.index'),
    ], array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?>
<?php $__env->stopSection(); ?>

<?php echo $__env->make('layouts.app', array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?><?php /**PATH E:\New folder\sky-ariana-bbb\acci-laravel\resources\views/shipping-stickers/create.blade.php ENDPATH**/ ?>