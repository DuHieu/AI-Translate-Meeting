import asyncio
import os
from playwright.async_api import async_playwright

ARTIFACT_DIR = r"C:\Users\Du Van Hieu\.gemini\antigravity\brain\8a53dfbc-a19f-497a-aa41-5ec90a8c07c9"

async def check_en():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 1440, "height": 900},
            color_scheme="dark",
            locale="vi-VN"
        )
        page = await context.new_page()
        await page.goto("http://localhost:3000")
        await page.wait_for_timeout(1000)
        
        # Click language switcher
        btn = page.locator("button[aria-label='Chọn ngôn ngữ hệ thống']")
        await btn.click()
        await page.wait_for_timeout(500)
        
        # Click English option inside dropdown
        en_opt = page.locator("div.z-50 button:has-text('English')")
        await en_opt.click()
        await page.wait_for_timeout(1000)
        
        await page.screenshot(path=os.path.join(ARTIFACT_DIR, "after_select_english.png"), full_page=True)
        print("Captured after_select_english.png")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(check_en())
