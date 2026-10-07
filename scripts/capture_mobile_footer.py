import time
from pathlib import Path
from playwright.sync_api import sync_playwright

EVIDENCE_DIR = Path(__file__).resolve().parents[1] / "evidence"
EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # 1. Mobile viewport: 390x844 (iPhone 13/14)
        ctx = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True)
        page = ctx.new_page()

        page.goto("http://localhost:3000", wait_until="networkidle")
        time.sleep(1)

        # Scroll to bottom to view sub-footer
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        time.sleep(0.5)

        shot1 = EVIDENCE_DIR / "mobile_footer_subbar_390.png"
        page.screenshot(path=str(shot1), full_page=False)
        print(f"Saved: {shot1}")

        # 2. Narrow mobile viewport: 360x780 (Android common)
        ctx2 = browser.new_context(viewport={"width": 360, "height": 780}, is_mobile=True)
        page2 = ctx2.new_page()
        page2.goto("http://localhost:3000", wait_until="networkidle")
        time.sleep(1)
        page2.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        time.sleep(0.5)

        shot2 = EVIDENCE_DIR / "mobile_footer_subbar_360.png"
        page2.screenshot(path=str(shot2), full_page=False)
        print(f"Saved: {shot2}")

        browser.close()

if __name__ == "__main__":
    run()
