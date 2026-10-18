<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>SAFTA Certificate {{ $certificate->reference_no ?: $certificate->certificate_no }}</title>
    <style>
        @page { size: A4 portrait; margin: 5mm; }
        body { font-family: Helvetica, Arial, sans-serif; color: #000; margin: 0; padding: 0; font-size: 8pt; line-height: 1.2; }
        
        .safta-document { width: 100%; position: relative; }
        .safta-title-header { text-align: center; margin-bottom: 2mm; }
        .safta-title-header h1 { font-size: 13pt; font-weight: bold; margin: 0; text-transform: uppercase; }
        .safta-title-header h2 { font-size: 9.5pt; font-weight: bold; margin: 1px 0 0 0; text-transform: uppercase; }
        
        table { border-collapse: collapse; width: 100%; table-layout: fixed; }
        td, th { border: 0.8px solid #000; padding: 1.5mm 2mm; vertical-align: top; font-size: 8pt; line-height: 1.2; }
        
        .safta-box-title { font-size: 8pt; font-weight: bold; margin-bottom: 1mm; }
        .safta-box-content { font-size: 7.8pt; line-height: 1.15; white-space: pre-line; }
        
        .safta-official-stamp-box {
            margin-top: 2mm;
            border: 2px solid #2b5797;
            color: #2b5797;
            padding: 2.5mm;
            text-align: center;
            font-weight: bold;
        }
        .safta-official-stamp-box .stamp-word { font-size: 18pt; font-family: "Times New Roman", serif; letter-spacing: 2px; display: block; }
        .safta-official-stamp-box .stamp-sub { font-size: 7pt; text-transform: uppercase; margin-top: 2px; display: block; }
        
        .safta-cargo-table th { font-size: 7.5pt; font-weight: bold; background: #fdfdfd; }
        .safta-cargo-table td { height: 105mm; }
        .safta-footer-grid td { height: 50mm; position: relative; }
        .safta-red-control-no { margin-top: 2mm; font-size: 13pt; font-weight: bold; color: #cc0000; font-family: monospace; }
    </style>
</head>
<body>
    <x-acci.safta-document :certificate="$certificate" :for-pdf="true" />
</body>
</html>
