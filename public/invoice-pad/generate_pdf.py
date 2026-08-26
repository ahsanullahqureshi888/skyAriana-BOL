import asyncio
import sys
import io
from pathlib import Path
from playwright.async_api import async_playwright

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

async def generate_all():
    current_dir = Path(__file__).parent.resolve()
    html_file = current_dir / "index.html"
    output_pdf = current_dir / "sky_ariana_commercial_invoice.pdf"
    preview_img = current_dir / "preview.png"

    print(f"Loading HTML: {html_file.as_uri()}")
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(channel="msedge", headless=True)
        page = await browser.new_page(viewport={"width": 1280, "height": 1600})
        
        await page.goto(html_file.as_uri(), wait_until="domcontentloaded")
        await page.wait_for_timeout(600)
        
        # 1. Render print A4 PDF
        await page.pdf(
            path=str(output_pdf),
            format="A4",
            print_background=True,
            margin={"top": "0mm", "right": "0mm", "bottom": "0mm", "left": "0mm"},
            prefer_css_page_size=True
        )
        print(f"[OK] Successfully generated PDF: {output_pdf} ({output_pdf.stat().st_size:,} bytes)")
        
        # 2. Render PNG preview
        invoice_el = await page.query_selector('.invoice-page')
        if invoice_el:
            await invoice_el.screenshot(path=str(preview_img))
            print(f"[OK] Successfully generated preview image: {preview_img}")
            
        await browser.close()

if __name__ == "__main__":
    asyncio.run(generate_all())
