import asyncio
import os
from playwright.async_api import async_playwright

ARTIFACT_DIR = r"C:\Users\Du Van Hieu\.gemini\antigravity\brain\8a53dfbc-a19f-497a-aa41-5ec90a8c07c9"

async def test_fixes():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 1440, "height": 900},
            color_scheme="dark",
            locale="vi-VN"
        )
        page = await context.new_page()

        # Step 1: Visit HomePage - verify redesigned preview & centered hero
        print("1. Loading HomePage...")
        await page.goto("http://localhost:3000", wait_until="networkidle")
        await page.wait_for_timeout(1000)
        await page.screenshot(path=os.path.join(ARTIFACT_DIR, "step1_clean_preview_card.png"))
        print("Captured step1_clean_preview_card.png")

        # Step 2: Click close button on preview frame
        print("2. Clicking close on preview card...")
        close_btn = page.locator("[data-testid='preview-close-btn']").first
        await close_btn.click()
        await page.wait_for_timeout(600)
        await page.screenshot(path=os.path.join(ARTIFACT_DIR, "step2_preview_closed_with_reopen_btn.png"))
        print("Captured step2_preview_closed_with_reopen_btn.png")

        # Step 3: Reload page -> preview frame must be restored!
        print("3. Reloading page...")
        await page.reload(wait_until="networkidle")
        await page.wait_for_timeout(1000)
        await page.screenshot(path=os.path.join(ARTIFACT_DIR, "step3_preview_restored_after_reload.png"))
        print("Captured step3_preview_restored_after_reload.png")

        # Step 4: Click FAQ in navbar -> opens Centered Modal Dialog (NOT squishing homepage)
        print("4. Clicking FAQ to test Centered Modal Dialog...")
        faq_btn = page.locator("nav button").filter(has_text="Hỏi Đáp").first
        await faq_btn.click()
        await page.wait_for_timeout(600)
        await page.screenshot(path=os.path.join(ARTIFACT_DIR, "step4_centered_modal_faq.png"))
        print("Captured step4_centered_modal_faq.png")

        # Step 5: Switch to Pricing tab inside Modal
        print("5. Switching to Pricing inside Modal...")
        pricing_tab = page.locator("aside button").filter(has_text="Bảng Giá").first
        await pricing_tab.click()
        await page.wait_for_timeout(600)
        await page.screenshot(path=os.path.join(ARTIFACT_DIR, "step5_centered_modal_pricing.png"))
        print("Captured step5_centered_modal_pricing.png")

        # Step 6: Close Modal
        print("6. Closing modal...")
        modal_close = page.locator("[data-testid='info-modal-close-btn']").first
        await modal_close.click()
        await page.wait_for_timeout(400)
        await page.screenshot(path=os.path.join(ARTIFACT_DIR, "step6_homepage_after_modal_closed.png"))
        print("Captured step6_homepage_after_modal_closed.png")

        await browser.close()
        print("All verification steps completed successfully!")

if __name__ == "__main__":
    asyncio.run(test_fixes())
