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

        # ── 1. Desktop Dark Mode (1440x900) ─────────
        ctx = browser.new_context(viewport={"width": 1440, "height": 900})
        page = ctx.new_page()

        page.goto("http://localhost:3000", wait_until="networkidle")
        time.sleep(1)

        # Ensure dark mode
        page.evaluate("() => { localStorage.setItem('vimeet_theme', 'dark'); document.documentElement.classList.add('dark'); }")
        page.reload(wait_until="networkidle")
        time.sleep(1)

        # 1.1 Pricing Dark
        pricing_elem = page.locator("#pricing")
        pricing_elem.scroll_into_view_if_needed()
        time.sleep(0.5)
        shot_pricing_dark = EVIDENCE_DIR / "19_pricing_dark.png"
        page.screenshot(path=str(shot_pricing_dark))
        print(f"Saved: {shot_pricing_dark}")

        # 1.2 Contact Dark
        contact_elem = page.locator("#contact")
        contact_elem.scroll_into_view_if_needed()
        time.sleep(0.5)
        shot_contact_dark = EVIDENCE_DIR / "20_contact_dark.png"
        page.screenshot(path=str(shot_contact_dark))
        print(f"Saved: {shot_contact_dark}")

        # 1.3 Footer Dark
        footer_elem = page.locator("footer")
        footer_elem.scroll_into_view_if_needed()
        time.sleep(0.5)
        shot_footer_dark = EVIDENCE_DIR / "21_footer_dark.png"
        page.screenshot(path=str(shot_footer_dark))
        print(f"Saved: {shot_footer_dark}")

        # 1.4 Click Privacy Policy link in footer
        privacy_btn = page.locator("button:has-text('Chính sách Quyền riêng tư')").first
        if privacy_btn.is_visible():
            privacy_btn.click()
            time.sleep(0.5)
            shot_privacy_modal = EVIDENCE_DIR / "22_privacy_modal.png"
            page.screenshot(path=str(shot_privacy_modal))
            print(f"Saved: {shot_privacy_modal}")
            # Close modal
            close_btn = page.locator("button:has-text('Đã Hiểu & Đóng')").first
            if close_btn.is_visible():
                close_btn.click()
                time.sleep(0.3)

        # ── 2. Desktop Light Mode ───────────────────
        theme_toggle = page.locator('button[aria-label*="giao diện"]').first
        theme_toggle.click()
        time.sleep(0.8)

        # 2.1 Pricing Light
        pricing_elem.scroll_into_view_if_needed()
        time.sleep(0.5)
        shot_pricing_light = EVIDENCE_DIR / "23_pricing_light.png"
        page.screenshot(path=str(shot_pricing_light))
        print(f"Saved: {shot_pricing_light}")

        # 2.2 Contact Light
        contact_elem.scroll_into_view_if_needed()
        time.sleep(0.5)
        shot_contact_light = EVIDENCE_DIR / "24_contact_light.png"
        page.screenshot(path=str(shot_contact_light))
        print(f"Saved: {shot_contact_light}")

        # 2.3 Footer Light
        footer_elem.scroll_into_view_if_needed()
        time.sleep(0.5)
        shot_footer_light = EVIDENCE_DIR / "25_footer_light.png"
        page.screenshot(path=str(shot_footer_light))
        print(f"Saved: {shot_footer_light}")

        browser.close()

if __name__ == "__main__":
    run()
