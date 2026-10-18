<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>SAFTA Certificate {{ $certificate->reference_no ?: $certificate->certificate_no }}</title>
    @vite(['resources/css/app.css'])
    <style>
        body { background: #fff; margin: 0; padding: 0; }
        @media print {
            @page { size: A4 portrait; margin: 0; }
            body { padding: 0; }
        }
    </style>
</head>
<body onload="window.print()">
    <x-acci.safta-document :certificate="$certificate" />
</body>
</html>
