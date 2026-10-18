"""Core PDF Generation Service.

Provides lazy-loaded ReportLab engine, atomic file writing with SHA-256 checksums,
standardized A4 canvas styling, two-pass page numbering, and header/footer decorators.
"""

from __future__ import annotations

import hashlib
import os
import shutil
import tempfile
from io import BytesIO
from pathlib import Path
from typing import Any, Callable

from backend.services.documents.template_service import DocumentBranding, DocumentColors

# ReportLab components are lazy-loaded upon first PDF generation request
_REPORTLAB_LOADED = False
_canvas = None
_colors = None
_pagesizes = None
_styles = None
_platypus = None


def _ensure_reportlab():
    """Lazy load ReportLab modules only when PDF generation is requested."""
    global _REPORTLAB_LOADED, _canvas, _colors, _pagesizes, _styles, _platypus
    if not _REPORTLAB_LOADED:
        from reportlab import platypus
        from reportlab.lib import colors, pagesizes, styles
        from reportlab.pdfgen import canvas

        _canvas = canvas
        _colors = colors
        _pagesizes = pagesizes
        _styles = styles
        _platypus = platypus
        _REPORTLAB_LOADED = True


class NumberedCanvas:
    """Two-pass canvas to accurately compute and print total page counts (Page X of Y)."""

    def __new__(cls, *args, **kwargs):
        _ensure_reportlab()

        class _InnerNumberedCanvas(_canvas.Canvas):
            def __init__(self, *c_args, **c_kwargs):
                super().__init__(*c_args, **c_kwargs)
                self._saved_page_states = []

            def showPage(self):
                self._saved_page_states.append(dict(self.__dict__))
                self._startPage()

            def save(self):
                num_pages = len(self._saved_page_states)
                for state in self._saved_page_states:
                    self.__dict__.update(state)
                    self.draw_page_number(num_pages)
                    _canvas.Canvas.showPage(self)
                _canvas.Canvas.save(self)

            def draw_page_number(self, page_count: int):
                self.saveState()
                self.setFont("Helvetica", 8)
                self.setFillColor(_colors.HexColor(DocumentColors.MUTED_GRAY))

                # Footer line
                width, height = _pagesizes.A4
                self.setStrokeColor(_colors.HexColor(DocumentColors.BORDER_LIGHT))
                self.setLineWidth(0.5)
                self.line(36, 32, width - 36, 32)

                # Left: Electronic document disclaimer
                self.drawString(36, 20, DocumentBranding.DISCLAIMER)

                # Right: Page X of Y
                page_str = f"Page {self._pageNumber} of {page_count}"
                self.drawRightString(width - 36, 20, page_str)
                self.restoreState()

        return _InnerNumberedCanvas(*args, **kwargs)


def write_pdf_atomically(target_path: Path, build_fn: Callable[[BytesIO], None]) -> dict[str, Any]:
    """Execute PDF rendering to an in-memory buffer, write to a temp file, verify, and atomically rename.

    Returns:
        dict containing 'file_path', 'file_size', 'sha256', 'filename'
    """
    target_path.parent.mkdir(parents=True, exist_ok=True)
    buffer = BytesIO()

    # Build PDF into memory buffer
    build_fn(buffer)
    pdf_bytes = buffer.getvalue()
    buffer.close()

    if not pdf_bytes or len(pdf_bytes) < 100:
        raise ValueError("Generated PDF is empty or malformed.")

    # Calculate SHA-256 Checksum
    sha256_hash = hashlib.sha256(pdf_bytes).hexdigest()
    file_size = len(pdf_bytes)

    # Atomic write pattern: Write to temp file in same directory then rename
    temp_file = target_path.with_suffix(".tmp." + sha256_hash[:8])
    try:
        with open(temp_file, "wb") as f:
            f.write(pdf_bytes)
            f.flush()
            os.fsync(f.fileno())

        # Atomic replace
        temp_file.replace(target_path)
    except Exception as exc:
        if temp_file.exists():
            try:
                temp_file.unlink()
            except Exception:
                pass
        raise IOError(f"Failed to atomically write PDF to {target_path}: {exc}") from exc

    return {
        "success": True,
        "file_path": str(target_path),
        "filename": target_path.name,
        "file_size": file_size,
        "sha256": sha256_hash,
        "sha256_checksum": sha256_hash,
    }


def draw_document_header(
    c: Any,
    doc_title: str,
    doc_number: str,
    doc_badge: str = "OFFICIAL COPY",
    date_str: str = "",
):
    """Draw standardized header banner on top of A4 canvas."""
    _ensure_reportlab()
    width, height = _pagesizes.A4

    c.saveState()

    # Top accent bar (Navy & Gold)
    c.setFillColor(_colors.HexColor(DocumentColors.PRIMARY_NAVY))
    c.rect(36, height - 36, width - 72, 4, fill=1, stroke=0)

    # Logo or Typographic Fallback
    logo_path = DocumentBranding.get_logo_path()
    text_x = 36
    if logo_path and logo_path.exists():
        try:
            c.drawImage(
                str(logo_path),
                36,
                height - 90,
                width=48,
                height=48,
                preserveAspectRatio=True,
                mask="auto",
            )
            text_x = 94
        except Exception:
            text_x = 36

    # Company name and subtitle
    c.setFillColor(_colors.HexColor(DocumentColors.PRIMARY_NAVY))
    c.setFont("Helvetica-Bold", 15)
    c.drawString(text_x, height - 58, DocumentBranding.COMPANY_NAME)

    c.setFillColor(_colors.HexColor(DocumentColors.MUTED_GRAY))
    c.setFont("Helvetica", 8)
    c.drawString(text_x, height - 70, DocumentBranding.COMPANY_SUBTITLE)
    c.drawString(text_x, height - 81, DocumentBranding.HEADQUARTERS)

    # Right side: Document Title and Number Box
    box_width = 180
    box_x = width - 36 - box_width
    box_y = height - 90

    c.setFillColor(_colors.HexColor(DocumentColors.BG_ACCENT))
    c.setStrokeColor(_colors.HexColor(DocumentColors.PRIMARY_NAVY))
    c.setLineWidth(1)
    c.roundRect(box_x, box_y, box_width, 48, radius=4, fill=1, stroke=1)

    c.setFillColor(_colors.HexColor(DocumentColors.PRIMARY_NAVY))
    c.setFont("Helvetica-Bold", 11)
    c.drawRightString(width - 46, height - 57, doc_title.upper())

    c.setFont("Helvetica-Bold", 10)
    c.setFillColor(_colors.HexColor(DocumentColors.ACCENT_GOLD))
    c.drawRightString(width - 46, height - 71, doc_number)

    c.setFont("Helvetica", 8)
    c.setFillColor(_colors.HexColor(DocumentColors.MUTED_GRAY))
    date_display = f"Date: {date_str}" if date_str else doc_badge
    c.drawRightString(width - 46, height - 83, date_display)

    # Dividing line below header
    c.setStrokeColor(_colors.HexColor(DocumentColors.BORDER_LIGHT))
    c.setLineWidth(1)
    c.line(36, height - 100, width - 36, height - 100)

    c.restoreState()
