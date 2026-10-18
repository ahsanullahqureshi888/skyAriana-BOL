<!doctype html>
<html lang="en" class="acci-pdf">
<head>
    <meta charset="utf-8">
    <title>ACCI Packing List {{ $packingList->packing_list_no }}</title>
    <style>{!! file_get_contents(resource_path('css/acci-invoice-print.css')) !!}</style>
</head>
<body class="acci-pdf">
    <x-acci.packing-list-document :packing-list="$packingList" :for-pdf="true" />
</body>
</html>
