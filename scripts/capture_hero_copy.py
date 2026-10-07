import time
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={'width': 1920, 'height': 1080})
    page = ctx.new_page()

    # 1. EN mode screenshot
    page.goto('http://localhost:3000', wait_until='networkidle')
    page.evaluate("() => { localStorage.setItem('layameet_lang', 'en'); localStorage.setItem('vimeet_theme', 'light'); document.documentElement.classList.remove('dark'); }")
    page.reload(wait_until='networkidle')
    time.sleep(1)
    page.screenshot(path='evidence/hero_copy_en_light.png')

    # 2. VI mode screenshot
    page.evaluate("() => { localStorage.setItem('layameet_lang', 'vi'); }")
    page.reload(wait_until='networkidle')
    time.sleep(1)
    page.screenshot(path='evidence/hero_copy_vi_light.png')

    browser.close()
print('Screenshots captured successfully!')
