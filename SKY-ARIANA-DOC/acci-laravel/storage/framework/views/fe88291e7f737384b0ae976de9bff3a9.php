<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title><?php echo e($invoice->invoice_no); ?></title>
    <style><?php echo file_get_contents(resource_path('css/acci-invoice-print.css')); ?></style>
    <style>html, body { margin: 0; padding: 0; background: #fff; }</style>
</head>
<body class="acci-pdf">
    <div style="height: 297mm; display: block; overflow: hidden; page-break-after: always; background-color: #ffffff;">
        <?php if (isset($component)) { $__componentOriginal0f4b30ae2c89f29172ab7a7e4fc5abe3 = $component; } ?>
<?php if (isset($attributes)) { $__attributesOriginal0f4b30ae2c89f29172ab7a7e4fc5abe3 = $attributes; } ?>
<?php $component = Illuminate\View\AnonymousComponent::resolve(['view' => 'components.acci.document','data' => ['invoice' => $invoice,'forPdf' => true,'color' => 'white']] + (isset($attributes) && $attributes instanceof Illuminate\View\ComponentAttributeBag ? $attributes->all() : [])); ?>
<?php $component->withName('acci.document'); ?>
<?php if ($component->shouldRender()): ?>
<?php $__env->startComponent($component->resolveView(), $component->data()); ?>
<?php if (isset($attributes) && $attributes instanceof Illuminate\View\ComponentAttributeBag): ?>
<?php $attributes = $attributes->except(\Illuminate\View\AnonymousComponent::ignoredParameterNames()); ?>
<?php endif; ?>
<?php $component->withAttributes(['invoice' => \Illuminate\View\Compilers\BladeCompiler::sanitizeComponentAttribute($invoice),'for-pdf' => true,'color' => 'white']); ?>
<?php echo $__env->renderComponent(); ?>
<?php endif; ?>
<?php if (isset($__attributesOriginal0f4b30ae2c89f29172ab7a7e4fc5abe3)): ?>
<?php $attributes = $__attributesOriginal0f4b30ae2c89f29172ab7a7e4fc5abe3; ?>
<?php unset($__attributesOriginal0f4b30ae2c89f29172ab7a7e4fc5abe3); ?>
<?php endif; ?>
<?php if (isset($__componentOriginal0f4b30ae2c89f29172ab7a7e4fc5abe3)): ?>
<?php $component = $__componentOriginal0f4b30ae2c89f29172ab7a7e4fc5abe3; ?>
<?php unset($__componentOriginal0f4b30ae2c89f29172ab7a7e4fc5abe3); ?>
<?php endif; ?>
    </div>
    <div style="height: 297mm; display: block; overflow: hidden; background-color: #d1efff; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
        <?php if (isset($component)) { $__componentOriginal0f4b30ae2c89f29172ab7a7e4fc5abe3 = $component; } ?>
<?php if (isset($attributes)) { $__attributesOriginal0f4b30ae2c89f29172ab7a7e4fc5abe3 = $attributes; } ?>
<?php $component = Illuminate\View\AnonymousComponent::resolve(['view' => 'components.acci.document','data' => ['invoice' => $invoice,'forPdf' => true,'color' => 'blue']] + (isset($attributes) && $attributes instanceof Illuminate\View\ComponentAttributeBag ? $attributes->all() : [])); ?>
<?php $component->withName('acci.document'); ?>
<?php if ($component->shouldRender()): ?>
<?php $__env->startComponent($component->resolveView(), $component->data()); ?>
<?php if (isset($attributes) && $attributes instanceof Illuminate\View\ComponentAttributeBag): ?>
<?php $attributes = $attributes->except(\Illuminate\View\AnonymousComponent::ignoredParameterNames()); ?>
<?php endif; ?>
<?php $component->withAttributes(['invoice' => \Illuminate\View\Compilers\BladeCompiler::sanitizeComponentAttribute($invoice),'for-pdf' => true,'color' => 'blue']); ?>
<?php echo $__env->renderComponent(); ?>
<?php endif; ?>
<?php if (isset($__attributesOriginal0f4b30ae2c89f29172ab7a7e4fc5abe3)): ?>
<?php $attributes = $__attributesOriginal0f4b30ae2c89f29172ab7a7e4fc5abe3; ?>
<?php unset($__attributesOriginal0f4b30ae2c89f29172ab7a7e4fc5abe3); ?>
<?php endif; ?>
<?php if (isset($__componentOriginal0f4b30ae2c89f29172ab7a7e4fc5abe3)): ?>
<?php $component = $__componentOriginal0f4b30ae2c89f29172ab7a7e4fc5abe3; ?>
<?php unset($__componentOriginal0f4b30ae2c89f29172ab7a7e4fc5abe3); ?>
<?php endif; ?>
    </div>
</body>
</html>
<?php /**PATH E:\New folder\sky-ariana-bbb\acci-laravel\resources\views/acci-invoices/pdf.blade.php ENDPATH**/ ?>