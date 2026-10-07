import time
from pathlib import Path
from playwright.sync_api import sync_playwright

EVIDENCE_DIR = Path(__file__).resolve().parents[1] / "evidence"
EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    # 1. Light Mode Capture
    ctx_light = browser.new_context(viewport={"width": 1440, "height": 900})
    page_light = ctx_light.new_page()
    page_light.add_init_script("localStorage.setItem('layameet_theme', 'light');")
    page_light.goto("http://localhost:3000/prejoin/DEMO99", wait_until="networkidle")
    time.sleep(1)
    page_light.mouse.move(250, 200)
    time.sleep(0.3)
    page_light.mouse.move(300, 350)
    time.sleep(0.4)
    shot_light = EVIDENCE_DIR / "prejoin_contrast_light.png"
    page_light.screenshot(path=str(shot_light), full_page=False)
    print(f"Saved: {shot_light}")
    ctx_light.close()

    # 2. Dark Mode Capture
    ctx_dark = browser.new_context(viewport={"width": 1440, "height": 900})
    page_dark = ctx_dark.new_page()
    page_dark.add_init_script("localStorage.setItem('layameet_theme', 'dark');")
    page_dark.goto("http://localhost:3000/prejoin/DEMO99", wait_until="networkidle")
    time.sleep(1)
    page_dark.mouse.move(250, 200)
    time.sleep(0.3)
    page_dark.mouse.move(1200, 300)
    time.sleep(0.4)
    shot_dark = EVIDENCE_DIR / "prejoin_contrast_dark.png"
    page_dark.screenshot(path=str(shot_dark), full_page=False)
    print(f"Saved: {shot_dark}")
    ctx_dark.close()

    browser.close()

print("Contrast validation screenshots captured successfully!")
