<?php $attributes ??= new \Illuminate\View\ComponentAttributeBag;

$__newAttributes = [];
$__propNames = \Illuminate\View\ComponentAttributeBag::extractPropNames(([
    'name',
    'label',
    'value' => null,
    'required' => false,
    'rows' => 3,
    'help' => null,
]));

foreach ($attributes->all() as $__key => $__value) {
    if (in_array($__key, $__propNames)) {
        $$__key = $$__key ?? $__value;
    } else {
        $__newAttributes[$__key] = $__value;
    }
}

$attributes = new \Illuminate\View\ComponentAttributeBag($__newAttributes);

unset($__propNames);
unset($__newAttributes);

foreach (array_filter(([
    'name',
    'label',
    'value' => null,
    'required' => false,
    'rows' => 3,
    'help' => null,
]), 'is_string', ARRAY_FILTER_USE_KEY) as $__key => $__value) {
    $$__key = $$__key ?? $__value;
}

$__defined_vars = get_defined_vars();

foreach ($attributes->all() as $__key => $__value) {
    if (array_key_exists($__key, $__defined_vars)) unset($$__key);
}

unset($__defined_vars, $__key, $__value); ?>

<div>
    <label for="<?php echo e($name); ?>" class="form-label <?php echo e($required ? 'required-label' : ''); ?>"><?php echo e($label); ?></label>
    <textarea
        id="<?php echo e($name); ?>"
        name="<?php echo e($name); ?>"
        rows="<?php echo e($rows); ?>"
        <?php echo e($attributes->class(['form-control', 'is-invalid' => $errors->has($name)])); ?>

        <?php if($required): echo 'required'; endif; ?>
    ><?php echo e(old($name, $value)); ?></textarea>
    <?php if($help): ?><div class="form-text"><?php echo e($help); ?></div><?php endif; ?>
    <?php $__errorArgs = [$name];
$__bag = $errors->getBag($__errorArgs[1] ?? 'default');
if ($__bag->has($__errorArgs[0])) :
if (isset($message)) { $__messageOriginal = $message; }
$message = $__bag->first($__errorArgs[0]); ?><div class="invalid-feedback"><?php echo e($message); ?></div><?php unset($message);
if (isset($__messageOriginal)) { $message = $__messageOriginal; }
endif;
unset($__errorArgs, $__bag); ?>
</div>
<?php /**PATH E:\New folder\sky-ariana-bbb\acci-laravel\resources\views/components/form/textarea.blade.php ENDPATH**/ ?>