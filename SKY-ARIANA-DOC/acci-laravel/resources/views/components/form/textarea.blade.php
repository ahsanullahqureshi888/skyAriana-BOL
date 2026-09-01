@props([
    'name',
    'label',
    'value' => null,
    'required' => false,
    'rows' => 3,
    'help' => null,
])

<div>
    <label for="{{ $name }}" class="form-label {{ $required ? 'required-label' : '' }}">{{ $label }}</label>
    <textarea
        id="{{ $name }}"
        name="{{ $name }}"
        rows="{{ $rows }}"
        {{ $attributes->class(['form-control', 'is-invalid' => $errors->has($name)]) }}
        @required($required)
    >{{ old($name, $value) }}</textarea>
    @if($help)<div class="form-text">{{ $help }}</div>@endif
    @error($name)<div class="invalid-feedback">{{ $message }}</div>@enderror
</div>
