import asyncio
import sys
import io
import html
from pathlib import Path
from playwright.async_api import async_playwright

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

async def run_full_diagnostics():
    print("==================================================")
    print("  SKY ARIANA ENTERPRISE INVOICE - FULL AUDIT SUITE")
    print("==================================================")
    
    current_dir = Path(__file__).parent.resolve()
    html_file = current_dir / "index.html"
    pdf_file = current_dir / "sky_ariana_commercial_invoice.pdf"

    errors = []
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(channel="msedge", headless=True)
        page = await browser.new_page(viewport={"width": 1280, "height": 1024})
        
        # Auto-accept all confirm/alert dialogs
        page.on("dialog", lambda dialog: dialog.accept())
        
        console_messages = []
        page.on("console", lambda msg: console_messages.append(f"[{msg.type}] {msg.text}"))
        
        # Test 1: Load Page
        print("\n[TEST 1] Loading index.html...")
        response = await page.goto(html_file.as_uri(), wait_until="domcontentloaded")
        if not response or response.status >= 400:
            errors.append(f"Failed to load HTML file: status {response.status if response else 'None'}")
        else:
            print("  [OK] Page loaded successfully with status 200.")

        # Test 2: Check for Console / JS Errors
        print("\n[TEST 2] Checking for Console Errors...")
        err_logs = [m for m in console_messages if "error" in m.lower()]
        if err_logs:
            errors.append(f"Console errors found: {err_logs}")
        else:
            print("  [OK] Zero JavaScript errors in console.")

        # Test 3: Verify Company Header & Metadata
        print("\n[TEST 3] Verifying Company Header & Metadata...")
        page_html = await page.content()
        decoded_text = html.unescape(page_html)
        
        required_texts = [
            "Islamic Republic of Afghanistan",
            "Sky Ariana & Balam Bar Baran",
            "2401-2198",
            "Kandahar Afghanistan",
            "transport@skyariana.com",
            "+93 700 9393 65",
            "+93 711 4355 29",
            "Name of Importer",
            "JDM ENTERPRISES",
            "Authorized Signature",
            "Company Stamp"
        ]
        for req in required_texts:
            if req.lower() in decoded_text.lower():
                print(f"  [OK] Found required text: '{req}'")
            else:
                errors.append(f"Missing required text: '{req}'")

        # Test 4: Verify Initial Calculations
        print("\n[TEST 4] Testing Initial Calculations...")
        grand_total = await page.text_content("#grand-total-val")
        subtotal_val = await page.text_content("#subtotal-val")
        summary_text = await page.text_content("#summary-line-text")
        
        print(f"  * Grand Total: {grand_total}")
        print(f"  * Subtotal: {subtotal_val}")
        print(f"  * Summary: {summary_text}")

        if "52,950" not in grand_total:
            errors.append(f"Expected Grand Total 52,950 USD, got: {grand_total}")
        else:
            print("  [OK] Reference calculations verified (52,950 USD).")

        # Test 5: Test Settings Modal Open & Tab Navigation
        print("\n[TEST 5] Testing Settings Modal & Navigation...")
        await page.click("button.btn-settings")
        await page.wait_for_timeout(300)
        
        is_modal_open = await page.evaluate("() => document.getElementById('settings-modal-overlay').classList.contains('open')")
        if not is_modal_open:
            errors.append("Settings modal failed to open upon clicking Settings button!")
        else:
            print("  [OK] Settings modal opened successfully.")

        # Test tab navigation
        await page.click("text=Dual Logos & Watermark")
        await page.wait_for_timeout(200)
        is_logos_tab_active = await page.evaluate("() => document.getElementById('tab-logos').classList.contains('active')")
        if is_logos_tab_active:
            print("  [OK] Dual Logos & Watermark tab active.")
        else:
            errors.append("Failed to switch to Dual Logos tab!")

        # Test 6: Test Company Name Update in Settings
        print("\n[TEST 6] Testing Company Profile Update via Settings...")
        await page.click("text=Company Profile")
        await page.wait_for_timeout(200)
        await page.fill("#set-company-name", "SKY ARIANA GLOBAL TRANSIT LTD")
        await page.click("button:has-text('Save & Apply Profile')")
        await page.wait_for_timeout(300)
        
        updated_title = await page.text_content("#display-company-name")
        print(f"  * Updated Header Company Title: {updated_title}")
        if updated_title == "SKY ARIANA GLOBAL TRANSIT LTD":
            print("  [OK] Company name updated dynamically via settings.")
        else:
            errors.append(f"Company name failed to update! Got: {updated_title}")

        # Test 7: Test Reset to Factory Defaults
        print("\n[TEST 7] Testing Reset to Defaults...")
        await page.click("button.btn-settings")
        await page.wait_for_timeout(200)
        await page.click("text=Reset All to Factory Defaults")
        await page.wait_for_timeout(300)
        
        reset_title = await page.text_content("#display-company-name")
        print(f"  * Company Title after reset: {reset_title}")
        if reset_title == "Sky Ariana & Balam Bar Baran":
            print("  [OK] Factory defaults restored successfully.")
        else:
            errors.append(f"Reset failed! Expected 'Sky Ariana & Balam Bar Baran', got: {reset_title}")

        # Test 8: Test Vector PDF Generation & Single Page Constraint
        print("\n[TEST 8] Validating Vector PDF Output...")
        await page.pdf(
            path=str(pdf_file),
            format="A4",
            print_background=True,
            margin={"top": "0mm", "right": "0mm", "bottom": "0mm", "left": "0mm"},
            prefer_css_page_size=True
        )
        
        if pdf_file.exists() and pdf_file.stat().st_size > 5000:
            with open(pdf_file, "rb") as f:
                raw_pdf = f.read()
                page_markers = raw_pdf.count(b"/Type /Page\n") + raw_pdf.count(b"/Type/Page\n") + raw_pdf.count(b"/Type /Page ") + raw_pdf.count(b"/Type/Page ") + raw_pdf.count(b"/Type /Page/")
                print(f"  * Generated PDF size: {len(raw_pdf):,} bytes")
                print(f"  * Verified Page Count: {page_markers}")
                if page_markers == 1:
                    print("  [OK] STRICT 1-PAGE A4 GUARANTEE VERIFIED! No spillover.")
                else:
                    errors.append(f"PDF exceeded 1 page! Detected {page_markers} pages.")
        else:
            errors.append("PDF generation failed or file size too small!")

        await browser.close()

    print("\n==================================================")
    if errors:
        print(f"FAILED WITH {len(errors)} ERROR(S):")
        for err in errors:
            print(f"  - {err}")
        sys.exit(1)
    else:
        print("ALL 8 AUDIT TESTS PASSED PERFECTLY WITH 100% SUCCESS!")
        print("==================================================")

if __name__ == "__main__":
    asyncio.run(run_full_diagnostics())
