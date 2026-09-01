@props([
    'name',
    'label',
    'type' => 'text',
    'value' => null,
    'required' => false,
    'readonly' => false,
    'step' => null,
    'min' => null,
    'help' => null,
])

<div>
    <label for="{{ $name }}" class="form-label {{ $required ? 'required-label' : '' }}">{{ $label }}</label>
    <input
        type="{{ $type }}"
        id="{{ $name }}"
        name="{{ $name }}"
        value="{{ old($name, $value) }}"
        {{ $attributes->class(['form-control', 'is-invalid' => $errors->has($name)]) }}
        @required($required)
        @readonly($readonly)
        @if($step !== null) step="{{ $step }}" @endif
        @if($min !== null) min="{{ $min }}" @endif
    >
    @if($help)<div class="form-text">{{ $help }}</div>@endif
    @error($name)<div class="invalid-feedback">{{ $message }}</div>@enderror
</div>
