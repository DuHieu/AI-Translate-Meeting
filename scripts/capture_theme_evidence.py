import json
import time
import urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright

EVIDENCE_DIR = Path(__file__).resolve().parents[1] / "evidence"
EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)

def run():
    # 1. Create meeting
    req = urllib.request.Request(
        "http://localhost:5000/api/meetings",
        data=json.dumps({"name": "Theme & Logo Audit"}).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        code = data["meetingCode"].strip().upper()
        host_token = data["hostToken"]
        print(f"Created meeting: {code}")

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--use-fake-ui-for-media-stream",
                "--use-fake-device-for-media-stream",
                "--disable-web-security",
            ],
        )

        # ── 1. Desktop Dark Mode (1440x900) ─────────
        d_ctx = browser.new_context(viewport={"width": 1440, "height": 900}, permissions=["camera", "microphone"])
        d_page = d_ctx.new_page()

        # 1.1 Home Dark
        d_page.goto("http://localhost:3000", wait_until="networkidle")
        time.sleep(1)
        shot1 = EVIDENCE_DIR / "10_home_dark_desktop.png"
        d_page.screenshot(path=str(shot1), full_page=True)
        print(f"Saved: {shot1}")

        # 1.2 Home Light Mode (Click Theme Toggle)
        theme_toggle = d_page.locator('button[aria-label*="giao diện"]').first
        theme_toggle.click()
        time.sleep(1)
        shot2 = EVIDENCE_DIR / "11_home_light_desktop.png"
        d_page.screenshot(path=str(shot2), full_page=True)
        print(f"Saved: {shot2}")

        # 1.3 PreJoin Light Mode
        d_page.goto(f"http://localhost:3000/prejoin/{code}", wait_until="networkidle")
        d_page.evaluate(
            f"""() => {{
                sessionStorage.setItem('meeting-host-token:{code}', '{host_token}');
            }}"""
        )
        d_page.reload(wait_until="networkidle")
        time.sleep(1.5)
        shot3 = EVIDENCE_DIR / "12_prejoin_light_desktop.png"
        d_page.screenshot(path=str(shot3), full_page=True)
        print(f"Saved: {shot3}")

        # 1.4 Switch back to Dark on PreJoin
        theme_toggle_prejoin = d_page.locator('button[aria-label*="giao diện"]').first
        theme_toggle_prejoin.click()
        time.sleep(1)
        shot4 = EVIDENCE_DIR / "13_prejoin_dark_desktop.png"
        d_page.screenshot(path=str(shot4), full_page=True)
        print(f"Saved: {shot4}")

        # 1.5 Join meeting in Dark mode
        name_input = d_page.locator('input[placeholder*="Hieu"]').first
        if name_input.is_visible():
            name_input.fill("Hieu Du (Host)")
        join_btn = d_page.locator('button:has-text("Tham gia ngay"), button:has-text("Join Now")').first
        join_btn.click()
        d_page.wait_for_selector("footer", timeout=25000)
        time.sleep(3)
        shot5 = EVIDENCE_DIR / "14_meeting_room_dark.png"
        d_page.screenshot(path=str(shot5))
        print(f"Saved: {shot5}")

        # ── 2. Mobile Light & Dark (375x812) ────────
        m_ctx = browser.new_context(viewport={"width": 375, "height": 812})
        m_page = m_ctx.new_page()
        m_page.goto("http://localhost:3000", wait_until="networkidle")
        # Toggle to light mode
        m_theme_btn = m_page.locator('button[aria-label*="giao diện"]').first
        m_theme_btn.click()
        time.sleep(1)
        shot6 = EVIDENCE_DIR / "15_home_light_mobile.png"
        m_page.screenshot(path=str(shot6), full_page=True)
        print(f"Saved: {shot6}")

        browser.close()
        print("All theme screenshots captured!")

if __name__ == "__main__":
    run()
