import time
from pathlib import Path
from playwright.sync_api import sync_playwright

EVIDENCE_DIR = Path(__file__).resolve().parents[1] / "evidence"
EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        ctx = browser.new_context(viewport={"width": 375, "height": 667}, is_mobile=True)
        page = ctx.new_page()

        # 1. Home page mobile viewport (above the fold)
        page.goto("http://localhost:3000", wait_until="networkidle")
        time.sleep(1)
        page.screenshot(path=str(EVIDENCE_DIR / "mobile_home_viewport.png"), full_page=False)
        page.screenshot(path=str(EVIDENCE_DIR / "mobile_home_full.png"), full_page=True)

        # 2. PreJoin page mobile viewport
        page.goto("http://localhost:3000/prejoin/DEMO99", wait_until="networkidle")
        time.sleep(1)
        page.screenshot(path=str(EVIDENCE_DIR / "mobile_prejoin_viewport.png"), full_page=False)
        page.screenshot(path=str(EVIDENCE_DIR / "mobile_prejoin_full.png"), full_page=True)

        browser.close()
        print("Mobile audit screenshots captured!")

if __name__ == "__main__":
    run()
