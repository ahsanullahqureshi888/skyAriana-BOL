# ACCI Invoice Design QA

**Findings**

- No actionable P0, P1, or P2 visual mismatches remain.
- [P3] Legal artwork depends on the final uploaded assets.
  Location: stamp and signature overlay inside the goods-table description column.
  Evidence: the reference scan contains a specific ACCI stamp, handwritten signature, and company mark; the implementation correctly layers real uploaded PNG assets but cannot reproduce those exact marks without the original legal image files.
  Impact: geometry and overlap are verified, while exact ink shape and opacity will vary by the uploaded company assets.
  Fix: upload tightly cropped transparent PNG files from the create/edit screen and perform one final asset-specific print check.

**Open Questions**

- None blocking. The amount-in-words copy intentionally uses professional dollars-and-cents wording instead of the scan's decimal wording because automatic English conversion was an explicit product requirement.

**Implementation Checklist**

- [x] A4 portrait composition with 10 mm page margins.
- [x] Times New Roman document typography and thin black rules.
- [x] Two-column seller/buyer and invoice/payment header.
- [x] Goods-table column widths aligned to the source proportions.
- [x] Amount, origin, receipt, signatory, stamp, and signature regions aligned.
- [x] Stamp overlays the signature/receipt region.
- [x] Browser print remains on one A4 page.
- [x] DomPDF output contains exactly one page.
- [x] Responsive editor validated at 1440 x 1000 and 500 x 844.

**Follow-up Polish**

- Re-run the stamp-focused comparison after the final transparent ACCI stamp and signature PNGs are supplied.

## Evidence

- Source visual truth path: `C:\Users\HomePC\AppData\Local\Temp\codex-clipboard-e122babd-a50c-4338-a2ab-ef137809524a.png`
- Source original pixels: 610 x 771.
- Source page crop: 521 x 736, normalized to 794 x 1123 for direct A4 comparison.
- Implementation screenshot path: `E:\New folder\sky-ariana-bbb\acci-laravel\tests\Artifacts\acci-invoice-final.png`
- Implementation pixels: 794 x 1123.
- CSS page size: 210 mm x 297 mm; document content uses the 10 mm page margin plus source-matched internal centering.
- Density normalization: device scale factor 1; source page crop resized with Lanczos to the implementation pixel dimensions.
- State: seeded `ACCI-120892`, 25/05/2026, S V INTERNATIONAL, BLACK RAISINS (BEST), 1,407 CTNS, 22,512 KGS, USD 76,090.56.
- Full-view comparison evidence: `E:\New folder\sky-ariana-bbb\acci-laravel\tests\Artifacts\reference-vs-implementation-final.png`
- Live desktop evidence: `E:\New folder\sky-ariana-bbb\acci-laravel\tests\Artifacts\live-create-final.png`
- Live responsive evidence: `E:\New folder\sky-ariana-bbb\acci-laravel\tests\Artifacts\live-create-mobile-500.png`
- Final DomPDF render: `E:\New folder\sky-ariana-bbb\acci-laravel\tmp\pdfs\ACCI-120892-final.png`
- Final PDF artifact: `E:\New folder\sky-ariana-bbb\acci-laravel\output\pdf\ACCI-120892.pdf`
- Primary interactions tested: index, create, validation, save, search, edit, view, print, PDF download, delete, image storage, and image cleanup.
- Browser/server check: live index and create routes returned HTTP 200; no application console or Laravel runtime errors appeared during final captures.

## Required Fidelity Surfaces

- Fonts and typography: Times New Roman/Times fallback is used throughout the invoice; title, compact body copy, bold labels, wrapping, and line-height visually follow the scan. Bootstrap UI typography remains separate from the legal document.
- Spacing and layout rhythm: normalized comparison confirms matching page width, centered title, header split, table start/end positions, column ratios, receipt placement, and serial footer. The form/preview UI stacks cleanly at the responsive breakpoint.
- Colors and visual tokens: the legal document stays black on white with no decorative application tokens leaking into print/PDF. The editor uses restrained navy, blue, white, and neutral surfaces.
- Image quality and asset fidelity: production uses actual uploaded PNG/JPEG/WebP files, including transparent PNG support; no code-drawn replacement stamp or signature is used. The visual fixture uses a real workspace stamp/signature asset only for overlap QA.
- Copy and content: all requested invoice labels and sample commercial fields are present. Server and browser amount-in-words output match.

## Comparison History

1. Initial normalized comparison
   Earlier findings: receipt and amount blocks sat too low; receipt corners were too rounded; stamp scale was too small.
   Fixes made: moved summary/receipt/signatory blocks to source-measured positions, removed receipt radius, and recalibrated the seal layer.
   Post-fix evidence: `tests\Artifacts\acci-invoice-fixture-2.png` and `tests\Artifacts\reference-vs-implementation-final.png`.

2. Stamp/signature refinement
   Earlier findings: the first QA stamp asset contained excess whitespace and then rendered oversized after cropping.
   Fixes made: used a tightly measured transparent QA crop and set the production stamp/signature layer to source-matched dimensions and overlap.
   Post-fix evidence: `tests\Artifacts\acci-invoice-final.png`.

3. DomPDF pagination refinement
   Earlier finding: DomPDF expanded table rows and placed the serial footer on page 2, violating the one-page requirement.
   Fixes made: added a DomPDF-only compact table profile while retaining the browser print dimensions; added a regression assertion that counts PDF page objects.
   Post-fix evidence: `tmp\pdfs\ACCI-120892-final.png`; automated verification reports one page.

final result: passed
