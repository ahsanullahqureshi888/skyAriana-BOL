/**
 * Sky Ariana Transit - High-Definition 1-Page PDF Export Engine
 * 
 * Uses an isolated unscaled offscreen DOM clone at exact A4 proportions (794px x 1123px / 210mm x 297mm)
 * to guarantee razor-sharp 300+ DPI vector-grade PDF output without zoom distortion, UI artifacts,
 * or accidental multi-page spillovers.
 */

export async function exportDirectPdf(elementId, filename = 'document.pdf') {
  const sourceElement = document.getElementById(elementId);
  if (!sourceElement) {
    window.print();
    return;
  }

  // Ensure filename has .pdf extension
  const safeFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;

  // Check if html2pdf is available
  if (typeof window.html2pdf === 'undefined') {
    console.warn('html2pdf library not loaded, falling back to window.print()');
    window.print();
    return;
  }

  // 1. Create an isolated offscreen render container
  const renderContainer = document.createElement('div');
  renderContainer.id = 'pdf_render_sandbox_' + Date.now();
  renderContainer.style.cssText = `
    position: fixed;
    top: -99999px;
    left: -99999px;
    width: 794px;
    height: 1123px;
    min-width: 794px;
    min-height: 1123px;
    max-width: 794px;
    max-height: 1123px;
    background: #ffffff;
    padding: 0;
    margin: 0;
    overflow: hidden;
    z-index: -99999;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
    transform: none !important;
  `;

  // 2. Clone the target sheet node
  const clone = sourceElement.cloneNode(true);

  // 3. Reset any scale transforms on the clone and inner sheets
  clone.style.transform = 'none';
  clone.style.transformOrigin = 'top left';
  clone.style.margin = '0 auto';
  clone.style.width = '794px';
  clone.style.height = '1123px';
  clone.style.boxShadow = 'none';

  // Also reset all inner sheets
  const innerSheets = clone.querySelectorAll('.cmr-page-sheet, .inv-sheet');
  innerSheets.forEach(sheet => {
    sheet.style.transform = 'none';
    sheet.style.transformOrigin = 'top left';
    sheet.style.boxShadow = 'none';
    sheet.style.width = '794px';
    sheet.style.height = '1123px';
    sheet.style.minHeight = '1123px';
    sheet.style.maxHeight = '1123px';
    sheet.style.boxSizing = 'border-box';
  });

  // 4. Strip blue backgrounds, focus rings, and editing outlines from all inputs
  const blueFields = clone.querySelectorAll('.blue-field, .editable-cmr-badge');
  blueFields.forEach(field => {
    field.style.backgroundColor = 'transparent';
    field.style.background = 'transparent';
    field.style.boxShadow = 'none';
    field.style.outline = 'none';
    field.removeAttribute('contenteditable');
  });

  // Append clone to render container and attach to body
  renderContainer.appendChild(clone);
  document.body.appendChild(renderContainer);

  // 5. Wait for fonts & images to render
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch (e) {}
  }
  await new Promise(resolve => setTimeout(resolve, 250));

  // 6. html2pdf Configuration for strict 1-Page A4 output
  const opt = {
    margin: 0,
    filename: safeFilename,
    image: { type: 'jpeg', quality: 0.99 },
    html2canvas: {
      scale: 3.0, // High-resolution (300 DPI)
      useCORS: true,
      allowTaint: true,
      letterRendering: false, // Prevents broken Arabic/Persian/Cyrillic ligatures
      scrollY: 0,
      scrollX: 0,
      width: 794,
      height: 1123,
      windowWidth: 794,
      windowHeight: 1123,
      backgroundColor: '#ffffff',
      logging: false
    },
    jsPDF: {
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait',
      compress: true
    },
    pagebreak: { mode: 'avoid-all' }
  };

  try {
    await window.html2pdf().set(opt).from(renderContainer).save();
  } catch (err) {
    console.error('Direct PDF export encountered an error, falling back:', err);
    window.print();
  } finally {
    // 7. Clean up sandbox
    if (renderContainer && renderContainer.parentNode) {
      renderContainer.parentNode.removeChild(renderContainer);
    }
  }
}
