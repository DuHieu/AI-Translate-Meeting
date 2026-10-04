import time
from pathlib import Path
from playwright.sync_api import sync_playwright

EVIDENCE_DIR = Path(__file__).resolve().parents[1] / "evidence"
EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=["--disable-web-security"],
        )

        # 1. Desktop Dark Mode (1440x900)
        d_ctx = browser.new_context(viewport={"width": 1440, "height": 900})
        d_page = d_ctx.new_page()

        d_page.goto("http://localhost:3000", wait_until="networkidle")
        time.sleep(1)

        # Reset theme to dark if previously set to light
        d_page.evaluate("() => { localStorage.setItem('vimeet_theme', 'dark'); document.documentElement.classList.add('dark'); }")
        d_page.reload(wait_until="networkidle")
        time.sleep(1)

        shot1 = EVIDENCE_DIR / "15_hero_interactive_dark.png"
        d_page.screenshot(path=str(shot1), full_page=False)
        print(f"Saved: {shot1}")

        # 2. Click English translation tab
        en_tab = d_page.locator("button:has-text('EN')").first
        if en_tab.is_visible():
            en_tab.click()
            time.sleep(0.5)

        shot2 = EVIDENCE_DIR / "16_hero_interactive_en_switch.png"
        d_page.screenshot(path=str(shot2), full_page=False)
        print(f"Saved: {shot2}")

        # 3. Toggle to Light Mode
        theme_toggle = d_page.locator('button[aria-label*="giao diện"]').first
        theme_toggle.click()
        time.sleep(1)

        shot3 = EVIDENCE_DIR / "17_hero_interactive_light.png"
        d_page.screenshot(path=str(shot3), full_page=False)
        print(f"Saved: {shot3}")

        # 4. Mobile Viewport (390x844 iPhone 13/14)
        m_ctx = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True)
        m_page = m_ctx.new_page()
        m_page.goto("http://localhost:3000", wait_until="networkidle")
        time.sleep(1)

        shot4 = EVIDENCE_DIR / "18_hero_interactive_mobile.png"
        m_page.screenshot(path=str(shot4), full_page=False)
        print(f"Saved: {shot4}")

        browser.close()

if __name__ == "__main__":
    run()
