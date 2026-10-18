<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Shipping Sticker {{ $sticker->sticker_no }}</title>
    <style>
        @page { size: A4 portrait; margin: 15mm; }
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
    </style>
</head>
<body>
    <div style="padding-top: 10mm;">
        <x-acci.sticker-document :sticker="$sticker" />
    </div>
</body>
</html>
