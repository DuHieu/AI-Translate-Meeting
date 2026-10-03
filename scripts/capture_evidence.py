import json
import time
import urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright

EVIDENCE_DIR = Path(__file__).resolve().parents[1] / "evidence"
EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)


def create_meeting():
    print("[1/7] Creating meeting via API...")
    req = urllib.request.Request(
        "http://localhost:5000/api/meetings",
        data=json.dumps({"name": "AI Translate Meeting Demo"}).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        print(f"      Meeting code: {data['meetingCode']}")
        return data["meetingCode"], data["hostToken"], data["meetingId"]


def run():
    meeting_code, host_token, meeting_id = create_meeting()
    code_upper = meeting_code.strip().upper()

    with sync_playwright() as p:
        print("[2/7] Launching Chromium with simulated media devices...")
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--use-fake-ui-for-media-stream",
                "--use-fake-device-for-media-stream",
                "--disable-web-security",
                "--no-sandbox",
            ],
        )

        context = browser.new_context(
            viewport={"width": 1440, "height": 900},
            permissions=["camera", "microphone"],
        )

        page = context.new_page()

        # Step 1: Open PreJoin Page with hostToken in sessionStorage
        print("[3/7] Navigating to PreJoin Page...")
        page.goto(f"http://localhost:3000/prejoin/{code_upper}", wait_until="networkidle")
        page.evaluate(
            f"""() => {{
                sessionStorage.setItem('meeting-host-token:{code_upper}', '{host_token}');
            }}"""
        )
        page.reload(wait_until="networkidle")
        time.sleep(1.5)

        # Screenshot 1: PreJoin Page showing Domain Glossary & Settings
        prejoin_shot = EVIDENCE_DIR / "01_prejoin_page.png"
        page.screenshot(path=str(prejoin_shot), full_page=True)
        print(f"      Saved: {prejoin_shot}")

        # Fill display name and click join
        print("[4/7] Joining meeting as host...")
        name_input = page.locator('input[placeholder*="Hieu"]').first
        if name_input.is_visible():
            name_input.fill("Hieu Du (Host)")

        # Click join button (supports both English and Vietnamese text)
        join_btn = page.locator('button:has-text("Tham gia ngay"), button:has-text("Join Now")').first
        join_btn.click()

        # Wait for meeting room stage to load
        page.wait_for_selector('main, footer', timeout=20000)
        time.sleep(3)
        print(f"      In meeting room: {page.url}")

        # Send simulated reactions safely
        print("[5/7] Triggering floating emoji reactions...")
        smile_btn = page.locator('button[aria-label="Reactions"]').first
        if smile_btn.is_visible():
            # Reaction 1: Thumbs up
            smile_btn.click()
            time.sleep(0.3)
            thumb_btn = page.locator('button:has-text("👍")').first
            if thumb_btn.is_visible():
                thumb_btn.click()
                time.sleep(0.3)

            # Reaction 2: Heart
            smile_btn.click()
            time.sleep(0.3)
            heart_btn = page.locator('button:has-text("❤️")').first
            if heart_btn.is_visible():
                heart_btn.click()
                time.sleep(0.3)

            # Reaction 3: Celebration
            smile_btn.click()
            time.sleep(0.3)
            party_btn = page.locator('button:has-text("🎉")').first
            if party_btn.is_visible():
                party_btn.click()
                time.sleep(0.5)

        # Screenshot 2: Meeting room with floating reactions, stage, and subtitle overlay
        room_shot = EVIDENCE_DIR / "02_meeting_room_overlay_reactions.png"
        page.screenshot(path=str(room_shot))
        print(f"      Saved: {room_shot}")

        # Open Subtitle Panel
        print("[6/7] Opening Subtitle Panel and triggering test utterances...")
        sub_toggle = page.locator('button[aria-label="Live Subtitles"]').first
        if sub_toggle.is_visible():
            sub_toggle.click()
            time.sleep(1)

        # Trigger quick chips: "Mẫu việc cần làm" and "Mẫu quyết định"
        action_chip = page.locator('button:has-text("Mẫu việc cần làm")').first
        if action_chip.is_visible():
            action_chip.click()
            time.sleep(1.5)

        decision_chip = page.locator('button:has-text("Mẫu quyết định")').first
        if decision_chip.is_visible():
            decision_chip.click()
            time.sleep(1.5)

        # Additional utterances via speech test input field
        speech_input = page.locator('input[placeholder*="Thử câu nói"]').first
        if speech_input.is_visible():
            speech_input.fill("Anh Nam nhớ cập nhật báo cáo kỹ thuật trước 5h chiều nhé.")
            speech_input.press("Enter")
            time.sleep(2.5)

            speech_input.fill("Chúng ta thống nhất chốt phương án B cho kiến trúc hệ thống.")
            speech_input.press("Enter")
            time.sleep(2.5)

        # Screenshot 3: Tab 1 (Transcript) with Search and Volume2 replay button
        search_input = page.locator('input[placeholder*="Tìm từ khóa"]').first
        if search_input.is_visible():
            search_input.fill("cuộc họp")
            time.sleep(1)

        panel_transcript_shot = EVIDENCE_DIR / "03_panel_transcript_search.png"
        page.screenshot(path=str(panel_transcript_shot))
        print(f"      Saved: {panel_transcript_shot}")

        # Clear search
        if search_input.is_visible():
            search_input.fill("")
            time.sleep(0.5)

        # Screenshot 4: Tab 2 (Action Items & Decisions Checklist)
        tab_actions = page.locator('button:has-text("Việc làm")').first
        if tab_actions.is_visible():
            tab_actions.click()
            time.sleep(1)

            # Check off the first item to show interactive [x] task completion
            check_box = page.locator('button:has(svg.lucide-square)').first
            if check_box.is_visible():
                check_box.click()
                time.sleep(0.5)

            panel_actions_shot = EVIDENCE_DIR / "04_panel_actions_checklist.png"
            page.screenshot(path=str(panel_actions_shot))
            print(f"      Saved: {panel_actions_shot}")

        # Screenshot 5: Tab 3 (AI Executive Recap Hub)
        tab_recap = page.locator('button:has-text("Tóm tắt")').first
        if tab_recap.is_visible():
            tab_recap.click()
            time.sleep(0.8)

            # Click "Tạo tóm tắt biên bản bằng AI" or "Làm mới tóm tắt"
            recap_btn = page.locator('button:has-text("Tạo tóm tắt biên bản bằng AI"), button:has-text("Làm mới tóm tắt")').first
            if recap_btn.is_visible():
                recap_btn.click()
                time.sleep(1.5)

            panel_recap_shot = EVIDENCE_DIR / "05_panel_ai_executive_recap.png"
            page.screenshot(path=str(panel_recap_shot))
            print(f"      Saved: {panel_recap_shot}")

        # Screenshot 6: Tab 4 (In-Meeting Real-time Chat)
        tab_chat = page.locator('button:has-text("Tin nhắn")').first
        if tab_chat.is_visible():
            tab_chat.click()
            time.sleep(0.8)

            # Send a chat message
            chat_input = page.locator('input[placeholder*="tin nhắn"]').first
            if chat_input.is_visible():
                chat_input.fill("Xin chào mọi người! Biên bản họp và phân công nhiệm vụ đã được AI tổng hợp xong.")
                page.keyboard.press("Enter")
                time.sleep(0.8)

            panel_chat_shot = EVIDENCE_DIR / "06_panel_in_meeting_chat.png"
            page.screenshot(path=str(panel_chat_shot))
            print(f"      Saved: {panel_chat_shot}")

        browser.close()
        print("[7/7] All 6 evidence screenshots captured successfully!")


if __name__ == "__main__":
    run()
