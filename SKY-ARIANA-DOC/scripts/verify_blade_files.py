import glob
import os

blade_files = [
    r'e:\New folder\sky-ariana-bbb\acci-laravel\resources\views\components\acci\sticker-document.blade.php',
    r'e:\New folder\sky-ariana-bbb\acci-laravel\resources\views\shipping-stickers\_form.blade.php',
    r'e:\New folder\sky-ariana-bbb\acci-laravel\resources\views\shipping-stickers\show.blade.php',
    r'e:\New folder\sky-ariana-bbb\acci-laravel\resources\views\shipping-stickers\print.blade.php',
    r'e:\New folder\sky-ariana-bbb\acci-laravel\resources\views\shipping-stickers\index.blade.php',
    r'e:\New folder\sky-ariana-bbb\acci-laravel\resources\views\safta-certificates\create.blade.php',
    r'e:\New folder\sky-ariana-bbb\acci-laravel\resources\views\safta-certificates\edit.blade.php',
]

all_ok = True
for fpath in blade_files:
    if not os.path.exists(fpath):
        print(f"MISSING: {fpath}")
        all_ok = False
    else:
        with open(fpath, 'r', encoding='utf-8') as f:
            content = f.read()
            # Basic balance check of directives
            opens = content.count('@php')
            closes = content.count('@endphp')
            if opens != closes:
                print(f"MISMATCH in {fpath}: @php ({opens}) vs @endphp ({closes})")
                all_ok = False
            else:
                print(f"OK ({len(content)} bytes): {os.path.basename(fpath)}")

if all_ok:
    print("ALL BLADE FILES VERIFIED SUCCESSFULLY!")
