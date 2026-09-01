<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Print Shipping Sticker {{ $sticker->sticker_no }} - Sky Ariana Logistics</title>
    <style>
        html, body {
            margin: 0;
            background: #e2e8f0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #0f172a;
        }

        .print-toolbar {
            position: sticky;
            z-index: 100;
            top: 0;
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 10px 24px;
            border-bottom: 1px solid #cbd5e1;
            background: rgba(255, 255, 255, 0.96);
            backdrop-filter: blur(16px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }

        .toolbar-left, .toolbar-center, .toolbar-right {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .print-toolbar a, .print-toolbar button {
            padding: 7px 14px;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            color: #1e293b;
            background: #fff;
            font: 700 13px system-ui, sans-serif;
            cursor: pointer;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            transition: all 0.15s ease;
        }

        .print-toolbar a:hover, .print-toolbar button:hover {
            background: #f8fafc;
            border-color: #2563eb;
            color: #2563eb;
        }

        .print-toolbar button.btn-primary {
            color: #fff;
            background: linear-gradient(135deg, #2563eb, #1d4ed8);
            border-color: #1d4ed8;
            box-shadow: 0 2px 6px rgba(37, 99, 235, 0.3);
        }

        .print-toolbar button.btn-primary:hover {
            background: linear-gradient(135deg, #1d4ed8, #1e40af);
            border-color: #1e40af;
        }

        .segmented-group {
            display: inline-flex;
            align-items: center;
            gap: 2px;
            background: #f1f5f9;
            padding: 3px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
        }

        .segmented-btn {
            padding: 4px 10px !important;
            font-size: 12px !important;
            border-radius: 6px !important;
            border: none !important;
            background: transparent !important;
            color: #64748b !important;
        }

        .segmented-btn:hover {
            background: #e2e8f0 !important;
            color: #0f172a !important;
        }

        .segmented-btn.active {
            background: #fff !important;
            color: #2563eb !important;
            font-weight: 800 !important;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .print-stage {
            padding: 30px 20px 80px;
            display: flex;
            justify-content: center;
            min-height: calc(100vh - 70px);
            box-sizing: border-box;
        }

        .print-container {
            transform-origin: top center;
            transition: transform 0.15s ease-out;
        }

        /* Layout Modes */
        .layout-single {
            width: 140mm;
            min-height: 160mm;
            box-sizing: border-box;
            padding: 10mm;
            background: #fff;
            box-shadow: 0 20px 45px rgba(15, 23, 42, 0.12);
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .layout-grid-2 {
            width: 210mm;
            min-height: 297mm;
            box-sizing: border-box;
            padding: 12mm 15mm;
            background: #fff;
            box-shadow: 0 20px 45px rgba(15, 23, 42, 0.12);
            border-radius: 6px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-around;
            gap: 15mm;
        }

        .layout-grid-4 {
            width: 210mm;
            min-height: 297mm;
            box-sizing: border-box;
            padding: 10mm;
            background: #fff;
            box-shadow: 0 20px 45px rgba(15, 23, 42, 0.12);
            border-radius: 6px;
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8mm;
            justify-items: center;
            align-items: center;
        }

        .layout-grid-4 .shipping-sticker-box {
            transform: scale(0.78);
            transform-origin: center center;
            margin: -10mm 0;
        }

        @media print {
            @page {
                size: auto;
                margin: 0mm;
            }
            html, body {
                background: #fff !important;
                margin: 0 !important;
                padding: 0 !important;
            }
            .print-toolbar {
                display: none !important;
            }
            .print-stage {
                padding: 0 !important;
                margin: 0 !important;
            }
            .print-container {
                transform: none !important;
            }
            .layout-single, .layout-grid-2, .layout-grid-4 {
                box-shadow: none !important;
                border-radius: 0 !important;
                padding: 5mm !important;
                margin: 0 auto !important;
                page-break-after: avoid;
            }
        }
    </style>
</head>
<body>
    <div class="print-toolbar no-print">
        <div class="toolbar-left">
            <a href="{{ route('shipping-stickers.show', $sticker) }}">← Back to Document</a>
            <span style="font-size: 13px; font-weight: 800; color: #1e293b; margin-left: 8px;">
                Sticker: {{ $sticker->sticker_no }}
            </span>
        </div>

        <div class="toolbar-center">
            <!-- Sheet Layout Selector -->
            <div class="segmented-group">
                <span style="font-size: 11px; font-weight: 700; color: #64748b; padding: 0 6px;">Layout:</span>
                <button type="button" class="segmented-btn active" onclick="setLayoutMode('single', this)" title="Single Label (Thermal format)">1 Label (120mm)</button>
                <button type="button" class="segmented-btn" onclick="setLayoutMode('grid-2', this)" title="2 Labels per A4 Page">2 on A4 (Half)</button>
                <button type="button" class="segmented-btn" onclick="setLayoutMode('grid-4', this)" title="4 Labels 2x2 Grid per A4 Page">4 on A4 (2×2)</button>
            </div>

            <!-- Zoom Controls -->
            <div class="segmented-group">
                <span style="font-size: 11px; font-weight: 700; color: #64748b; padding: 0 6px;">Zoom:</span>
                <button type="button" class="segmented-btn" onclick="setPrintZoom(0.85, this)">85%</button>
                <button type="button" class="segmented-btn active" onclick="setPrintZoom(1.0, this)">100%</button>
                <button type="button" class="segmented-btn" onclick="setPrintZoom(1.15, this)">115%</button>
            </div>
        </div>

        <div class="toolbar-right">
            <a href="{{ route('shipping-stickers.pdf', $sticker) }}" title="Download Vector PDF">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                PDF
            </a>
            <button type="button" class="btn-primary" onclick="window.print()" title="Print Sticker (Ctrl + P)">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                Print Stickers
            </button>
        </div>
    </div>

    <main class="print-stage">
        <div class="print-container" id="printContainer">
            <div id="printSheet" class="layout-single">
                <x-acci.sticker-document :sticker="$sticker" />
            </div>
        </div>
    </main>

    <script>
        const singleContent = `<x-acci.sticker-document :sticker="$sticker" />`;

        function setLayoutMode(mode, btn) {
            const sheet = document.getElementById('printSheet');
            if (!sheet) return;

            sheet.className = '';
            if (mode === 'single') {
                sheet.className = 'layout-single';
                sheet.innerHTML = singleContent;
            } else if (mode === 'grid-2') {
                sheet.className = 'layout-grid-2';
                sheet.innerHTML = singleContent + singleContent;
            } else if (mode === 'grid-4') {
                sheet.className = 'layout-grid-4';
                sheet.innerHTML = singleContent + singleContent + singleContent + singleContent;
            }

            document.querySelectorAll('.segmented-group:first-of-type .segmented-btn').forEach(b => b.classList.remove('active'));
            if (btn) btn.classList.add('active');
        }

        function setPrintZoom(scale, btn) {
            const container = document.getElementById('printContainer');
            if (container) {
                container.style.transform = `scale(${scale})`;
            }
            document.querySelectorAll('.segmented-group:last-of-type .segmented-btn').forEach(b => b.classList.remove('active'));
            if (btn) btn.classList.add('active');
        }

        document.addEventListener('keydown', function(e) {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'p') {
                e.preventDefault();
                window.print();
            }
        });
    </script>
</body>
</html>
