import asyncio
import os
from playwright.async_api import async_playwright

ARTIFACT_DIR = r"C:\Users\Du Van Hieu\.gemini\antigravity\brain\8a53dfbc-a19f-497a-aa41-5ec90a8c07c9"

async def capture():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)

        # 1. Desktop Wide (1440x900) - Dark Mode
        context_desktop_dark = await browser.new_context(
            viewport={"width": 1440, "height": 900},
            color_scheme="dark",
            locale="vi-VN"
        )
        page = await context_desktop_dark.new_page()
        await page.goto("http://localhost:3000", wait_until="networkidle")
        await page.wait_for_timeout(1000)
        await page.screenshot(path=os.path.join(ARTIFACT_DIR, "desktop_wide_dark.png"), full_page=False)

        # 2. Desktop Wide (1440x900) - Light Mode
        context_desktop_light = await browser.new_context(
            viewport={"width": 1440, "height": 900},
            color_scheme="light",
            locale="vi-VN"
        )
        page_light = await context_desktop_light.new_page()
        await page_light.goto("http://localhost:3000", wait_until="networkidle")
        await page_light.wait_for_timeout(1000)
        await page_light.screenshot(path=os.path.join(ARTIFACT_DIR, "desktop_wide_light.png"), full_page=False)

        # 3. Laptop (1280x800)
        context_laptop = await browser.new_context(
            viewport={"width": 1280, "height": 800},
            color_scheme="dark",
            locale="vi-VN"
        )
        page_laptop = await context_laptop.new_page()
        await page_laptop.goto("http://localhost:3000", wait_until="networkidle")
        await page_laptop.wait_for_timeout(1000)
        await page_laptop.screenshot(path=os.path.join(ARTIFACT_DIR, "laptop_1280_dark.png"), full_page=False)

        # 4. Tablet Portrait (768x1024) - iPad
        context_tablet = await browser.new_context(
            viewport={"width": 768, "height": 1024},
            color_scheme="dark",
            locale="vi-VN"
        )
        page_tablet = await context_tablet.new_page()
        await page_tablet.goto("http://localhost:3000", wait_until="networkidle")
        await page_tablet.wait_for_timeout(1000)
        await page_tablet.screenshot(path=os.path.join(ARTIFACT_DIR, "tablet_768_portrait.png"), full_page=False)

        # 5. PreJoin on Desktop (1440x900)
        page_prejoin = await context_desktop_dark.new_page()
        await page_prejoin.goto("http://localhost:3000/prejoin/DEMO1234", wait_until="networkidle")
        await page_prejoin.wait_for_timeout(1000)
        await page_prejoin.screenshot(path=os.path.join(ARTIFACT_DIR, "prejoin_desktop_dark.png"), full_page=False)

        await browser.close()
        print("All screenshots captured successfully!")

if __name__ == "__main__":
    asyncio.run(capture())
