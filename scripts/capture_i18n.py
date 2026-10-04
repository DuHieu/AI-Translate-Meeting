import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={'width': 1440, 'height': 900})
        
        # 1. Default (Vietnamese)
        await page.goto('http://localhost:3000/', wait_until='networkidle')
        await page.evaluate("""() => {
            localStorage.setItem('layameet_lang', 'vi');
            localStorage.setItem('layameet_theme', 'dark');
            document.documentElement.classList.add('dark');
        }""")
        await page.reload(wait_until='networkidle')
        await page.wait_for_timeout(400)
        await page.screenshot(path='evidence/36_lang_vi.png')
        print('Captured evidence/36_lang_vi.png')

        # 2. English (Switch language)
        await page.evaluate("""() => {
            localStorage.setItem('layameet_lang', 'en');
        }""")
        await page.reload(wait_until='networkidle')
        await page.wait_for_timeout(400)
        await page.screenshot(path='evidence/37_lang_en.png')
        print('Captured evidence/37_lang_en.png')

        # 3. Japanese (Switch language)
        await page.evaluate("""() => {
            localStorage.setItem('layameet_lang', 'ja');
        }""")
        await page.reload(wait_until='networkidle')
        await page.wait_for_timeout(400)
        await page.screenshot(path='evidence/38_lang_ja.png')
        print('Captured evidence/38_lang_ja.png')

        await browser.close()

if __name__ == '__main__':
    asyncio.run(main())
