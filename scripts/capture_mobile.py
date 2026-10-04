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
        data=json.dumps({"name": "Mobile Audit"}).encode("utf-8"),
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

        # ── Mobile 375x812 ──────────────────────────
        m_ctx = browser.new_context(
            viewport={"width": 375, "height": 812},
            permissions=["camera", "microphone"],
        )
        m_page = m_ctx.new_page()

        # PreJoin
        m_page.goto(f"http://localhost:3000/prejoin/{code}", wait_until="networkidle")
        m_page.evaluate(
            f"""() => {{
                sessionStorage.setItem('meeting-host-token:{code}', '{host_token}');
            }}"""
        )
        m_page.reload(wait_until="networkidle")
        time.sleep(1.5)

        name_input = m_page.locator('input[placeholder*="Hieu"]').first
        if name_input.is_visible():
            name_input.fill("Mobile User")

        join_btn = m_page.locator('button:has-text("Tham gia ngay"), button:has-text("Join Now")').first
        join_btn.click()

        m_page.wait_for_selector("footer", timeout=25000)
        time.sleep(3)

        shot3 = EVIDENCE_DIR / "mobile_03_meeting_room.png"
        m_page.screenshot(path=str(shot3))
        print(f"Saved: {shot3}")

        # Open Subtitle Panel
        sub_btn = m_page.locator('button[aria-label="Live Subtitles"]').first
        sub_btn.click()
        time.sleep(1.5)

        shot4 = EVIDENCE_DIR / "mobile_04_panel_drawer.png"
        m_page.screenshot(path=str(shot4))
        print(f"Saved: {shot4}")

        # ── Tablet 768x1024 ─────────────────────────
        t_ctx = browser.new_context(
            viewport={"width": 768, "height": 1024},
            permissions=["camera", "microphone"],
        )
        t_page = t_ctx.new_page()
        t_page.goto("http://localhost:3000", wait_until="networkidle")
        time.sleep(1)

        shot5 = EVIDENCE_DIR / "tablet_01_home.png"
        t_page.screenshot(path=str(shot5), full_page=True)
        print(f"Saved: {shot5}")

        browser.close()
        print("Done!")

if __name__ == "__main__":
    run()
