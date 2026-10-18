<!doctype html>
<html lang="en" class="acci-pdf">
<head>
    <meta charset="utf-8">
    <title>ACCI Packing List <?php echo e($packingList->packing_list_no); ?></title>
    <style><?php echo file_get_contents(resource_path('css/acci-invoice-print.css')); ?></style>
</head>
<body class="acci-pdf">
    <?php if (isset($component)) { $__componentOriginald53c750f7bb2c61a89b160406511f78b = $component; } ?>
<?php if (isset($attributes)) { $__attributesOriginald53c750f7bb2c61a89b160406511f78b = $attributes; } ?>
<?php $component = Illuminate\View\AnonymousComponent::resolve(['view' => 'components.acci.packing-list-document','data' => ['packingList' => $packingList,'forPdf' => true]] + (isset($attributes) && $attributes instanceof Illuminate\View\ComponentAttributeBag ? $attributes->all() : [])); ?>
<?php $component->withName('acci.packing-list-document'); ?>
<?php if ($component->shouldRender()): ?>
<?php $__env->startComponent($component->resolveView(), $component->data()); ?>
<?php if (isset($attributes) && $attributes instanceof Illuminate\View\ComponentAttributeBag): ?>
<?php $attributes = $attributes->except(\Illuminate\View\AnonymousComponent::ignoredParameterNames()); ?>
<?php endif; ?>
<?php $component->withAttributes(['packing-list' => \Illuminate\View\Compilers\BladeCompiler::sanitizeComponentAttribute($packingList),'for-pdf' => true]); ?>
<?php echo $__env->renderComponent(); ?>
<?php endif; ?>
<?php if (isset($__attributesOriginald53c750f7bb2c61a89b160406511f78b)): ?>
<?php $attributes = $__attributesOriginald53c750f7bb2c61a89b160406511f78b; ?>
<?php unset($__attributesOriginald53c750f7bb2c61a89b160406511f78b); ?>
<?php endif; ?>
<?php if (isset($__componentOriginald53c750f7bb2c61a89b160406511f78b)): ?>
<?php $component = $__componentOriginald53c750f7bb2c61a89b160406511f78b; ?>
<?php unset($__componentOriginald53c750f7bb2c61a89b160406511f78b); ?>
<?php endif; ?>
</body>
</html>
<?php /**PATH E:\New folder\sky-ariana-bbb\acci-laravel\resources\views/acci-packing-lists/pdf.blade.php ENDPATH**/ ?>