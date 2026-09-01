import re
import os
import shutil
from datetime import date, datetime
from typing import Optional, List, Dict, Any
from pathlib import Path

try:
    from PIL import Image
except ImportError:  # pragma: no cover - depends on local OCR install
    Image = None

try:
    import pytesseract
except ImportError:  # pragma: no cover - depends on local OCR install
    pytesseract = None

try:
    from pdf2image import convert_from_path
except ImportError:  # pragma: no cover - depends on local OCR install
    convert_from_path = None

# Auto-detect Tesseract binary on Windows if not in PATH
if pytesseract and not shutil.which("tesseract"):
    common_paths = [
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        os.path.expanduser(r"~\AppData\Local\Programs\Tesseract-OCR\tesseract.exe"),
    ]
    for path in common_paths:
        if os.path.exists(path):
            pytesseract.pytesseract.tesseract_cmd = path
            break

def convert_persian_arabic_digits(text: str) -> str:
    """Converts Persian and Arabic digits to standard English digits."""
    persian_digits = "۰۱۲۳۴۵۶۷۸۹"
    arabic_digits = "٠١٢٣٤٥٦٧٨٩"
    english_digits = "0123456789"
    for p, e in zip(persian_digits, english_digits):
        text = text.replace(p, e)
    for a, e in zip(arabic_digits, english_digits):
        text = text.replace(a, e)
    return text

def shamsi_to_gregorian(jy: int, jm: int, jd: int) -> date:
    """Converts a Solar Hijri (Shamsi) date to Gregorian date."""
    jy_reg = jy - 979
    jm_reg = jm - 1
    jd_reg = jd - 1

    j_day_no = 365 * jy_reg + (jy_reg // 33) * 8 + (((jy_reg % 33) + 3) // 4)
    for i in range(jm_reg):
        j_day_no += 31 if i < 6 else 30
    j_day_no += jd_reg

    g_day_no = j_day_no + 79

    gy = 1600 + 400 * (g_day_no // 146097)
    g_day_no = g_day_no % 146097

    leap = True
    if g_day_no >= 36525:
        g_day_no -= 1
        gy += 100 * (g_day_no // 36524)
        g_day_no = g_day_no % 36524
        if g_day_no >= 365:
            g_day_no += 1
        else:
            leap = False

    gy += 4 * (g_day_no // 1461)
    g_day_no = g_day_no % 1461

    if g_day_no >= 366:
        g_day_no -= 1
        gy += g_day_no // 365
        g_day_no = g_day_no % 365

    g_day = g_day_no + 1

    g_days_in_month = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    if (gy % 4 == 0 and gy % 100 != 0) or (gy % 400 == 0):
        g_days_in_month[2] = 29

    gm = 1
    while gm <= 12 and g_day > g_days_in_month[gm]:
        g_day -= g_days_in_month[gm]
        gm += 1

    return date(gy, gm, g_day)

def clean_extracted_value(val: str) -> str:
    """Removes standard leading/trailing separators and spaces."""
    val = val.strip()
    val = re.sub(r"^[:：\-\.\s\*,]+", "", val)
    val = re.sub(r"[:：\-\.\s\*,]+$", "", val)
    return val.strip()

def parse_numeric_amount(val: str) -> float:
    """Cleans numeric string and converts it to float."""
    clean_val = val.replace(",", "").strip()
    return float(clean_val)

def detect_currency(text: str) -> Optional[str]:
    """Detects currency based on keywords in the text snippet."""
    text = text.lower()
    if any(w in text for w in ["usd", "dollar", "دالر", "$"]):
        return "USD"
    if any(w in text for w in ["toman", "tomans", "تومان", "ریال", "irr"]):
        return "Toman"
    if any(w in text for w in ["dirham", "dirhams", "درهم", "aed"]):
        return "Dirham"
    if any(w in text for w in ["afghani", "afn", "افغانی", "afgh"]):
        return "Afghani"
    return None

def extract_fields_from_text(text: str) -> Dict[str, Any]:
    """Extracts structured transaction fields from raw OCR text using regex heuristics."""
    norm_text = convert_persian_arabic_digits(text)
    
    data = {
        "receipt_no": None,
        "date": None,
        "customer_name": None,
        "subject": "",
        "amount": 0.0,
        "currency": "USD",
        "equivalent_amount": 0.0,
        "equivalent_currency": "Afghani",
        "payment_method": "Bank Transfer",
        "bank_account_number": None,
        "receiver_name": None,
        "description": "",
    }

    # 1. Receipt / Payment No
    receipt_patterns = [
        r"(?:نمبر رسید|رسید نمبر|شماره رسید|نمبر سند|شماره سند|سند نمبر|نمبر|شماره|Receipt No|Payment No|Receipt\s*#|No)\s*[:：\-\.\s]+\s*([A-Za-z0-9\-]{3,})",
        r"\b(BB-\d{4}-\d{4,})\b",
        r"\b(BB-\d{5,})\b",
    ]
    for pat in receipt_patterns:
        match = re.search(pat, norm_text, re.IGNORECASE)
        if match:
            data["receipt_no"] = match.group(1).strip()
            break

    # 2. Date (Handles Shamsi 1405.01.25 or Gregorian 2026-07-10)
    date_pattern = r"\b([12]\d{3})[-/\.]([0-1]?\d)[-/\.]([0-3]?\d)\b"
    match = re.search(date_pattern, norm_text)
    if match:
        yr = int(match.group(1))
        mn = int(match.group(2))
        dy = int(match.group(3))
        if 1300 <= yr <= 1500:
            try:
                data["date"] = shamsi_to_gregorian(yr, mn, dy)
            except Exception:
                data["date"] = date.today()
        elif 1900 <= yr <= 2100:
            try:
                data["date"] = date(yr, mn, dy)
            except Exception:
                data["date"] = date.today()
    if not data["date"]:
        data["date"] = date.today()

    # 3. Customer Name
    customer_patterns = [
        r"(?:نام مشتری|اسم مشتری|مشتری|محترم|Respected|Customer Name|Customer)\s*[:：\-\.\s]+\s*([^\n\r]+)",
    ]
    for pat in customer_patterns:
        match = re.search(pat, norm_text, re.IGNORECASE)
        if match:
            data["customer_name"] = clean_extracted_value(match.group(1))
            break

    # 4. Subject / Description
    subject_patterns = [
        r"(?:بابت|موضوع|شرح|Subject|For|Regarding)\s*[:：\-\.\s]+\s*([^\n\r]+)",
    ]
    for pat in subject_patterns:
        match = re.search(pat, norm_text, re.IGNORECASE)
        if match:
            data["subject"] = clean_extracted_value(match.group(1))
            break
    if not data["subject"]:
        data["subject"] = "Imported OCR Receipt"

    # 5. Amount & Currency
    # Look for amount followed by currency or preceded by currency
    amount_patterns = [
        r"(?:مبلغ|مقدار|Amount|Paid|USD|\$)\s*[:：\-\.\s]+\s*([\d\.,]+)\s*([A-Za-z\u0600-\u06FF\$]*)",
    ]
    for pat in amount_patterns:
        match = re.search(pat, norm_text, re.IGNORECASE)
        if match:
            try:
                data["amount"] = parse_numeric_amount(match.group(1))
                detected_cur = detect_currency(match.group(2))
                if detected_cur:
                    data["currency"] = detected_cur
            except Exception:
                pass
            break

    # 6. Equivalent Amount & Currency
    equiv_patterns = [
        r"(?:معادل|مبلغ معادل|Equivalent Amount|Equivalent|Equiv)\s*[:：\-\.\s]+\s*([\d\.,]+)\s*([A-Za-z\u0600-\u06FF]*)",
    ]
    for pat in equiv_patterns:
        match = re.search(pat, norm_text, re.IGNORECASE)
        if match:
            try:
                data["equivalent_amount"] = parse_numeric_amount(match.group(1))
                detected_cur = detect_currency(match.group(2))
                if detected_cur:
                    data["equivalent_currency"] = detected_cur
            except Exception:
                pass
            break

    # 7. Payment Method
    if any(w in norm_text.lower() for w in ["نقد", "نقدی", "cash"]):
        data["payment_method"] = "Cash"
    elif any(w in norm_text.lower() for w in ["حواله", "hawala"]):
        data["payment_method"] = "Hawala"
    else:
        data["payment_method"] = "Bank Transfer"

    # 8. Bank Account Number
    bank_patterns = [
        r"(?:شماره حساب|حساب نمبر|حساب بانکی|Account No|Account Number|Bank Account|A/C)\s*[:：\-\.\s]+\s*([A-Za-z0-9\-]+)",
    ]
    for pat in bank_patterns:
        match = re.search(pat, norm_text, re.IGNORECASE)
        if match:
            data["bank_account_number"] = match.group(1).strip()
            break

    # 9. Receiver / Beneficiary Name
    receiver_patterns = [
        r"(?:تسلیم کننده|دریافت کننده|آخذه|گیرنده|تسلیم گیرنده|بنام|Receiver|Beneficiary|Received By)\s*[:：\-\.\s]+\s*([^\n\r]+)",
    ]
    for pat in receiver_patterns:
        match = re.search(pat, norm_text, re.IGNORECASE)
        if match:
            data["receiver_name"] = clean_extracted_value(match.group(1))
            break

    # 10. Notes / Description
    notes_patterns = [
        r"(?:تفصیل|تفصیلات|یادداشت|توضیحات|ملاحظات|Notes|Description|Remarks)\s*[:：\-\.\s]+\s*([^\n\r]+)",
    ]
    for pat in notes_patterns:
        match = re.search(pat, norm_text, re.IGNORECASE)
        if match:
            data["description"] = clean_extracted_value(match.group(1))
            break

    return data

def process_file_ocr(file_path: Path) -> List[Dict[str, Any]]:
    """Converts image/PDF pages to text and runs OCR extraction, returning a list of extracted receipts."""
    file_ext = file_path.suffix.lower()
    ocr_results = []

    if pytesseract is None:
        raise RuntimeError("OCR is not available because pytesseract is not installed. Install backend requirements to enable receipt text extraction.")

    # Check if tesseract binary is actually executable/installed
    tesseract_available = True
    try:
        pytesseract.get_tesseract_version()
    except Exception:
        tesseract_available = False

    if file_ext == ".pdf":
        if convert_from_path is None:
            raise RuntimeError("PDF OCR is not available because pdf2image is not installed. Install backend requirements to enable PDF receipt extraction.")
        pages_images = []
        try:
            # pdf2image converts pages
            pages_images = convert_from_path(str(file_path))
        except Exception as e:
            # Fallback if pdf2image fails (e.g. no poppler)
            raise RuntimeError(
                f"PDF to Image conversion failed. Ensure Poppler is installed and added to PATH. Error: {e}"
            )

        for i, page in enumerate(pages_images):
            # Save page image temporarily
            page_name = f"{file_path.stem}_page_{i + 1}.png"
            page_path = file_path.parent / page_name
            page.save(str(page_path), "PNG")

            raw_text = ""
            if tesseract_available:
                try:
                    raw_text = pytesseract.image_to_string(page, lang="fas+eng")
                except Exception:
                    try:
                        raw_text = pytesseract.image_to_string(page, lang="eng")
                    except Exception as ocr_err:
                        raw_text = f"[OCR Extraction Failed: {ocr_err}]"
            else:
                raw_text = "[Tesseract OCR is not installed or not in System PATH. Please review setup instructions.]"

            parsed = extract_fields_from_text(raw_text)
            parsed["raw_text"] = raw_text
            parsed["temp_image_path"] = str(page_path)
            parsed["page_number"] = i + 1
            ocr_results.append(parsed)

    elif file_ext in [".png", ".jpg", ".jpeg", ".tiff", ".bmp", ".webp"]:
        if Image is None:
            raise RuntimeError("Image OCR is not available because Pillow is not installed. Install backend requirements to enable image receipt extraction.")
        try:
            img = Image.open(str(file_path))
        except Exception as img_err:
            raise RuntimeError(f"Failed to open image file. Error: {img_err}")

        raw_text = ""
        if tesseract_available:
            try:
                raw_text = pytesseract.image_to_string(img, lang="fas+eng")
            except Exception:
                try:
                    raw_text = pytesseract.image_to_string(img, lang="eng")
                except Exception as ocr_err:
                    raw_text = f"[OCR Extraction Failed: {ocr_err}]"
        else:
            raw_text = "[Tesseract OCR is not installed or not in System PATH. Please review setup instructions.]"

        parsed = extract_fields_from_text(raw_text)
        parsed["raw_text"] = raw_text
        parsed["temp_image_path"] = str(file_path)
        parsed["page_number"] = 1
        ocr_results.append(parsed)
    else:
        raise ValueError("Unsupported file format. Please upload PDF or image files.")

    return ocr_results
