<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=820">
    <title>Print <?php echo e($invoice->invoice_no); ?></title>
    <style><?php echo file_get_contents(resource_path('css/acci-invoice-print.css')); ?></style>
    <style>
        html, body { margin: 0; background: #dfe4ea; }
        .print-toolbar { position: sticky; z-index: 20; top: 0; display: flex; justify-content: center; gap: 8px; padding: 10px; border-bottom: 1px solid #c7d0db; background: rgba(255,255,255,.96); font-family: Arial, sans-serif; }
        .print-toolbar a, .print-toolbar button { padding: 8px 14px; border: 1px solid #244f81; border-radius: 6px; color: #244f81; background: #fff; font: 700 13px Arial, sans-serif; cursor: pointer; text-decoration: none; }
        .print-toolbar button { color: #fff; background: #244f81; }
        .print-sheet { width: 210mm; min-height: 297mm; box-sizing: border-box; padding: 10mm; margin: 14px auto; background: #fff; box-shadow: 0 10px 35px rgba(20,35,52,.2); }
        .print-sheet.blue { background-color: #d1efff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        @media print { 
            .print-toolbar { display: none !important; } 
            .print-sheet { width: auto; height: 297mm !important; display: block; overflow: hidden; margin: 0; padding: 0; box-shadow: none; page-break-after: always; } 
            .print-sheet:last-child { page-break-after: auto; }
        }
    </style>
</head>
<body>
    <div class="print-toolbar">
        <a href="<?php echo e(route('acci-invoices.show', $invoice)); ?>">Back</a>
        <a href="<?php echo e(route('acci-invoices.pdf', $invoice)); ?>">Download PDF</a>
        <button type="button" onclick="window.print()">Print Invoice</button>
    </div>
    <main class="print-sheet">
        <?php if (isset($component)) { $__componentOriginal0f4b30ae2c89f29172ab7a7e4fc5abe3 = $component; } ?>
<?php if (isset($attributes)) { $__attributesOriginal0f4b30ae2c89f29172ab7a7e4fc5abe3 = $attributes; } ?>
<?php $component = Illuminate\View\AnonymousComponent::resolve(['view' => 'components.acci.document','data' => ['invoice' => $invoice,'color' => 'white']] + (isset($attributes) && $attributes instanceof Illuminate\View\ComponentAttributeBag ? $attributes->all() : [])); ?>
<?php $component->withName('acci.document'); ?>
<?php if ($component->shouldRender()): ?>
<?php $__env->startComponent($component->resolveView(), $component->data()); ?>
<?php if (isset($attributes) && $attributes instanceof Illuminate\View\ComponentAttributeBag): ?>
<?php $attributes = $attributes->except(\Illuminate\View\AnonymousComponent::ignoredParameterNames()); ?>
<?php endif; ?>
<?php $component->withAttributes(['invoice' => \Illuminate\View\Compilers\BladeCompiler::sanitizeComponentAttribute($invoice),'color' => 'white']); ?>
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
    </main>
    <main class="print-sheet blue">
        <?php if (isset($component)) { $__componentOriginal0f4b30ae2c89f29172ab7a7e4fc5abe3 = $component; } ?>
<?php if (isset($attributes)) { $__attributesOriginal0f4b30ae2c89f29172ab7a7e4fc5abe3 = $attributes; } ?>
<?php $component = Illuminate\View\AnonymousComponent::resolve(['view' => 'components.acci.document','data' => ['invoice' => $invoice,'color' => 'blue']] + (isset($attributes) && $attributes instanceof Illuminate\View\ComponentAttributeBag ? $attributes->all() : [])); ?>
<?php $component->withName('acci.document'); ?>
<?php if ($component->shouldRender()): ?>
<?php $__env->startComponent($component->resolveView(), $component->data()); ?>
<?php if (isset($attributes) && $attributes instanceof Illuminate\View\ComponentAttributeBag): ?>
<?php $attributes = $attributes->except(\Illuminate\View\AnonymousComponent::ignoredParameterNames()); ?>
<?php endif; ?>
<?php $component->withAttributes(['invoice' => \Illuminate\View\Compilers\BladeCompiler::sanitizeComponentAttribute($invoice),'color' => 'blue']); ?>
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
    </main>
</body>
</html>
<?php /**PATH E:\New folder\sky-ariana-bbb\acci-laravel\resources\views/acci-invoices/print.blade.php ENDPATH**/ ?>