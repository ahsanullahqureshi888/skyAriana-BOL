import os
try:
    from playwright.async_api import async_playwright
except Exception:
    async_playwright = None
from app.core.config import settings

def _browser_executable() -> str | None:
    configured = os.getenv("PLAYWRIGHT_CHROMIUM_EXECUTABLE")
    candidates = [
        configured,
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    ]
    return next((path for path in candidates if path and os.path.exists(path)), None)

async def generate_pdf(invoice_id: int, auth_token: str, invoice_number: str, template_id: str) -> str:
    template_names = {
        "premium_afghan_heritage": "Premium-Afghan-Heritage",
        "premium_afghan_glass": "Premium-Afghan-Glass",
        "classic_afghan_blue_gold": "Classic-Afghan-Blue-Gold",
    }
    template_name = template_names.get(template_id, "Commercial-Invoice")
    safe_number = "".join(c if c.isalnum() or c in "-_" else "-" for c in invoice_number)
    pdf_filename = f"Commercial-Invoice-{safe_number}-{template_name}.pdf"
    pdf_path = os.path.join(settings.UPLOAD_DIR, "pdfs", pdf_filename)
    
    # Ensure directory exists
    os.makedirs(os.path.dirname(pdf_path), exist_ok=True)
    
    # Render using Playwright headless chrome
    async with async_playwright() as p:
        executable_path = _browser_executable()
        browser = await p.chromium.launch(headless=True, executable_path=executable_path) if executable_path else await p.chromium.launch(headless=True)
        # Pass the token as a query parameter so React can save it in localStorage
        # and authenticate API requests
        print_url = f"http://localhost:5173/invoice/{invoice_id}/print?token={auth_token}"
        
        page = await browser.new_page()
        # Set viewport to standard A4 size at 96 DPI
        await page.set_viewport_size({"width": 794, "height": 1123})
        
        await page.goto(print_url, wait_until="networkidle")
        await page.wait_for_selector("#invoice-print-root", state="visible", timeout=30000)
        await page.wait_for_function("document.fonts ? document.fonts.status === 'loaded' : true")
        await page.wait_for_function("Array.from(document.images).every((image) => image.complete)")
        
        # Match the browser print stylesheet's A4 portrait page box.
        await page.pdf(
            path=pdf_path,
            format="A4",
            print_background=True,
            margin={"top": "0", "bottom": "0", "left": "0", "right": "0"},
            scale=1.0
        )
        await browser.close()
        
    return pdf_path
