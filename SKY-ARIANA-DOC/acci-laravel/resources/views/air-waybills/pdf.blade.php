<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>{{ $airWaybill->awb_number }}</title>
    <style>{!! file_get_contents(resource_path('css/air-waybill-print.css')) !!}</style>
    <style>html, body { margin: 0; padding: 0; background: #fff; }</style>
</head>
<body class="awb-pdf">
    <x-awb.document :air-waybill="$airWaybill" :for-pdf="true" />
</body>
</html>
