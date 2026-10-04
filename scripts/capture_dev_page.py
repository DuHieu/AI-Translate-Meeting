import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={'width': 1280, 'height': 800})
        await page.goto('http://localhost:3000/developers', wait_until='networkidle')
        await page.wait_for_timeout(500)
        await page.screenshot(path='evidence/29_developers_dark.png')
        print('Captured evidence/29_developers_dark.png')

        # Click tab 2
        btn2 = page.locator('text=2. WebSocket Subtitle')
        await btn2.click()
        await page.wait_for_timeout(300)
        await page.screenshot(path='evidence/30_developers_tab2_dark.png')
        print('Captured evidence/30_developers_tab2_dark.png')

        # Light mode
        theme_btn = page.locator('button[aria-label*="chế độ"]').or_(page.locator('button[title*="Chuyển sang"]')).first
        if await theme_btn.count() > 0:
            await theme_btn.click()
            await page.wait_for_timeout(400)
            await page.screenshot(path='evidence/31_developers_light.png')
            print('Captured evidence/31_developers_light.png')

        await browser.close()

if __name__ == '__main__':
    asyncio.run(main())
