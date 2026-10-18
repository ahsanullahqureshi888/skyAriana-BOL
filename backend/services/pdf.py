from __future__ import annotations

from pathlib import Path


def extract_pdf_text(path: Path) -> str:
    try:
        import fitz

        with fitz.open(path) as document:
            return "\n".join(page.get_text() for page in document)
    except Exception:
        try:
            from pypdf import PdfReader

            reader = PdfReader(str(path))
            return "\n".join(page.extract_text() or "" for page in reader.pages)
        except Exception:
            return ""
