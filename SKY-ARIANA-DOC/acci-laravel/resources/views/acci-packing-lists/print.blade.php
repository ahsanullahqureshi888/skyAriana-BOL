<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=820">
    <title>Print Packing List {{ $packingList->packing_list_no }}</title>
    <style>{!! file_get_contents(resource_path('css/acci-invoice-print.css')) !!}</style>
    <style>
        html, body { margin: 0; background: #dfe4ea; }
        .print-toolbar { position: sticky; z-index: 20; top: 0; display: flex; justify-content: center; gap: 8px; padding: 10px; border-bottom: 1px solid #c7d0db; background: rgba(255,255,255,.96); font-family: Arial, sans-serif; }
        .print-toolbar a, .print-toolbar button { padding: 8px 14px; border: 1px solid #244f81; border-radius: 6px; color: #244f81; background: #fff; font: 700 13px Arial, sans-serif; cursor: pointer; text-decoration: none; }
        .print-toolbar button { color: #fff; background: #244f81; }
        .print-sheet { width: 210mm; min-height: 297mm; box-sizing: border-box; padding: 10mm; margin: 14px auto; background: #fff; box-shadow: 0 10px 35px rgba(20,35,52,.2); }
        @media print { .print-toolbar { display: none !important; } .print-sheet { width: auto; min-height: 0; margin: 0; padding: 0; box-shadow: none; } }
    </style>
</head>
<body>
    <div class="print-toolbar">
        <a href="{{ route('acci-packing-lists.show', $packingList) }}">Back</a>
        <a href="{{ route('acci-packing-lists.pdf', $packingList) }}">Download PDF</a>
        <button type="button" onclick="window.print()">Print Packing List</button>
    </div>
    <main class="print-sheet">
        <x-acci.packing-list-document :packing-list="$packingList" />
    </main>
</body>
</html>
