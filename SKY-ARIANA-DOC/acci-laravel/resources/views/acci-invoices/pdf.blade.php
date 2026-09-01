<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>{{ $invoice->invoice_no }}</title>
    <style>{!! file_get_contents(resource_path('css/acci-invoice-print.css')) !!}</style>
    <style>html, body { margin: 0; padding: 0; background: #fff; }</style>
</head>
<body class="acci-pdf">
    <div style="height: 297mm; display: block; overflow: hidden; page-break-after: always; background-color: #ffffff;">
        <x-acci.document :invoice="$invoice" :for-pdf="true" color="white" />
    </div>
    <div style="height: 297mm; display: block; overflow: hidden; background-color: #d1efff; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
        <x-acci.document :invoice="$invoice" :for-pdf="true" color="blue" />
    </div>
</body>
</html>
