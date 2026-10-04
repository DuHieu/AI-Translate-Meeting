import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        
        # 1. Dark mode FAQ
        page = await browser.new_page(viewport={'width': 1280, 'height': 800})
        await page.goto('http://localhost:3000', wait_until='networkidle')
        
        faq_el = page.locator('#faq')
        await faq_el.scroll_into_view_if_needed()
        await page.wait_for_timeout(500)
        await page.screenshot(path='evidence/26_faq_dark.png')
        print('Captured evidence/26_faq_dark.png')

        # Click second accordion item
        btn2 = page.locator('#faq-question-1')
        await btn2.click()
        await page.wait_for_timeout(300)
        await page.screenshot(path='evidence/27_faq_expanded_dark.png')
        print('Captured evidence/27_faq_expanded_dark.png')

        # 2. Light mode FAQ
        theme_btn = page.locator('button[aria-label*="chế độ"]').or_(page.locator('button[title*="Chuyển sang"]')).first
        if await theme_btn.count() > 0:
            await theme_btn.click()
            await page.wait_for_timeout(400)
            await faq_el.scroll_into_view_if_needed()
            await page.screenshot(path='evidence/28_faq_light.png')
            print('Captured evidence/28_faq_light.png')

        await browser.close()

if __name__ == '__main__':
    asyncio.run(main())
