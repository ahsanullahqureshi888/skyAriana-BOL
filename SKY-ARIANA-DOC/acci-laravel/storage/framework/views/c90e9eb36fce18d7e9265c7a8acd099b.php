<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title><?php echo e($airWaybill->awb_number); ?></title>
    <style><?php echo file_get_contents(resource_path('css/air-waybill-print.css')); ?></style>
    <style>html, body { margin: 0; padding: 0; background: #fff; }</style>
</head>
<body class="awb-pdf">
    <?php if (isset($component)) { $__componentOriginal37a5a94d486a37a0a860163110328c2d = $component; } ?>
<?php if (isset($attributes)) { $__attributesOriginal37a5a94d486a37a0a860163110328c2d = $attributes; } ?>
<?php $component = Illuminate\View\AnonymousComponent::resolve(['view' => 'components.awb.document','data' => ['airWaybill' => $airWaybill,'forPdf' => true]] + (isset($attributes) && $attributes instanceof Illuminate\View\ComponentAttributeBag ? $attributes->all() : [])); ?>
<?php $component->withName('awb.document'); ?>
<?php if ($component->shouldRender()): ?>
<?php $__env->startComponent($component->resolveView(), $component->data()); ?>
<?php if (isset($attributes) && $attributes instanceof Illuminate\View\ComponentAttributeBag): ?>
<?php $attributes = $attributes->except(\Illuminate\View\AnonymousComponent::ignoredParameterNames()); ?>
<?php endif; ?>
<?php $component->withAttributes(['air-waybill' => \Illuminate\View\Compilers\BladeCompiler::sanitizeComponentAttribute($airWaybill),'for-pdf' => true]); ?>
<?php echo $__env->renderComponent(); ?>
<?php endif; ?>
<?php if (isset($__attributesOriginal37a5a94d486a37a0a860163110328c2d)): ?>
<?php $attributes = $__attributesOriginal37a5a94d486a37a0a860163110328c2d; ?>
<?php unset($__attributesOriginal37a5a94d486a37a0a860163110328c2d); ?>
<?php endif; ?>
<?php if (isset($__componentOriginal37a5a94d486a37a0a860163110328c2d)): ?>
<?php $component = $__componentOriginal37a5a94d486a37a0a860163110328c2d; ?>
<?php unset($__componentOriginal37a5a94d486a37a0a860163110328c2d); ?>
<?php endif; ?>
</body>
</html>
<?php /**PATH E:\New folder\sky-ariana-bbb\acci-laravel\resources\views/air-waybills/pdf.blade.php ENDPATH**/ ?>