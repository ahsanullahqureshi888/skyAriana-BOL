<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Shipping Sticker <?php echo e($sticker->sticker_no); ?></title>
    <style>
        @page { size: A4 portrait; margin: 15mm; }
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
    </style>
</head>
<body>
    <div style="padding-top: 10mm;">
        <?php if (isset($component)) { $__componentOriginald82d083f1b6868ec8707bff3bc40898a = $component; } ?>
<?php if (isset($attributes)) { $__attributesOriginald82d083f1b6868ec8707bff3bc40898a = $attributes; } ?>
<?php $component = Illuminate\View\AnonymousComponent::resolve(['view' => 'components.acci.sticker-document','data' => ['sticker' => $sticker]] + (isset($attributes) && $attributes instanceof Illuminate\View\ComponentAttributeBag ? $attributes->all() : [])); ?>
<?php $component->withName('acci.sticker-document'); ?>
<?php if ($component->shouldRender()): ?>
<?php $__env->startComponent($component->resolveView(), $component->data()); ?>
<?php if (isset($attributes) && $attributes instanceof Illuminate\View\ComponentAttributeBag): ?>
<?php $attributes = $attributes->except(\Illuminate\View\AnonymousComponent::ignoredParameterNames()); ?>
<?php endif; ?>
<?php $component->withAttributes(['sticker' => \Illuminate\View\Compilers\BladeCompiler::sanitizeComponentAttribute($sticker)]); ?>
<?php echo $__env->renderComponent(); ?>
<?php endif; ?>
<?php if (isset($__attributesOriginald82d083f1b6868ec8707bff3bc40898a)): ?>
<?php $attributes = $__attributesOriginald82d083f1b6868ec8707bff3bc40898a; ?>
<?php unset($__attributesOriginald82d083f1b6868ec8707bff3bc40898a); ?>
<?php endif; ?>
<?php if (isset($__componentOriginald82d083f1b6868ec8707bff3bc40898a)): ?>
<?php $component = $__componentOriginald82d083f1b6868ec8707bff3bc40898a; ?>
<?php unset($__componentOriginald82d083f1b6868ec8707bff3bc40898a); ?>
<?php endif; ?>
    </div>
</body>
</html>
<?php /**PATH E:\New folder\sky-ariana-bbb\acci-laravel\resources\views/shipping-stickers/pdf.blade.php ENDPATH**/ ?>