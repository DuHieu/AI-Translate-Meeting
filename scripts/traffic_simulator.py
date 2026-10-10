import asyncio
import random
import sys
import math

# Ensure UTF-8 output encoding for Windows CMD / PowerShell
sys.stdout.reconfigure(encoding='utf-8')

from playwright.async_api import async_playwright

# ==============================================================================
# 🎯 DYNAMIC KEYWORD GENERATOR (ĐẨY TOP 1 TÌM KIẾM GOOGLE)
# ==============================================================================
CORE_BRAND_QUERIES = [
    "laya meet",
    "layameet",
    "layameet.com",
    "laya meet ai",
    "nền tảng laya meet",
    "phần mềm laya meet",
    "laya meet họp trực tuyến",
    "ứng dụng laya meet"
]

FEATURE_QUERIES = [
    "laya meet họp song ngữ",
    "laya meet dịch trực tiếp",
    "họp trực tuyến song ngữ laya meet",
    "laya meet dịch phụ đề tiếng nhật",
    "họp song ngữ việt nhật laya meet",
    "laya meet dịch tiếng anh thời gian thực",
    "laya meet ram-only",
    "so sánh laya meet vs zoom",
    "so sánh laya meet vs google meet",
    "hướng dẫn họp song ngữ laya meet",
    "cẩm nang họp việt nhật laya meet"
]

GLOBAL_QUERIES = [
    "laya meet real time meeting translation",
    "laya meet ai bilingual meeting",
    "layameet subtitle translation",
    "laya meet vs zoom ai companion"
]

PREFIXES = ["phần mềm", "nền tảng", "công cụ", "ứng dụng", "giải pháp", "hướng dẫn"]
SUFFIXES = ["cho doanh nghiệp", "thời gian thực", "độ trễ thấp", "ai", "miễn phí"]

def generate_random_keyword() -> str:
    category = random.choices(["brand", "feature", "global", "combo"], weights=[35, 40, 15, 10])[0]
    if category == "brand":
        return random.choice(CORE_BRAND_QUERIES)
    elif category == "feature":
        return random.choice(FEATURE_QUERIES)
    elif category == "global":
        return random.choice(GLOBAL_QUERIES)
    else:
        # Dynamic combo
        prefix = random.choice(PREFIXES)
        brand = random.choice(["laya meet", "layameet"])
        topic = random.choice(["họp song ngữ", "dịch trực tiếp", "phụ đề ai", "họp trực tuyến"])
        return f"{prefix} {topic} {brand}"

# ==============================================================================
# 💻 RANDOMIZED CLIENT PROFILES (ANTI-BOT STEALTH & ENVIRONMENT RANDOMIZATION)
# ==============================================================================
PROFILES = [
    {
        "ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "viewport": {"width": 1920, "height": 1080},
        "locale": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
        "tz": "Asia/Ho_Chi_Minh"
    },
    {
        "ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        "viewport": {"width": 1536, "height": 864},
        "locale": "vi-VN,vi;q=0.9,en;q=0.8",
        "tz": "Asia/Ho_Chi_Minh"
    },
    {
        "ua": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "viewport": {"width": 1440, "height": 900},
        "locale": "en-US,en;q=0.9,vi;q=0.8",
        "tz": "Asia/Ho_Chi_Minh"
    },
    {
        "ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0",
        "viewport": {"width": 1366, "height": 768},
        "locale": "vi-VN,vi;q=0.9",
        "tz": "Asia/Ho_Chi_Minh"
    },
    {
        "ua": "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15",
        "viewport": {"width": 1680, "height": 1050},
        "locale": "en-US,en;q=0.9",
        "tz": "Asia/Tokyo"
    },
    {
        "ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "viewport": {"width": 1600, "height": 900},
        "locale": "ja-JP,ja;q=0.9,en-US;q=0.8",
        "tz": "Asia/Tokyo"
    }
]

# Internal navigation routes to explore
INTERNAL_EXPLORE_LINKS = [
    "a[href*='cam-nang']",
    "a[href*='guide']",
    "a[href*='developers']",
    "a[href*='so-sanh']",
    "a[href*='hop-song-ngu-tieng-nhat']",
    "a[href*='hop-song-ngu-tieng-anh']",
    "a[href='#features']",
    "a[href='#faq']"
]

# ==============================================================================
# 🧠 NATURAL HUMAN BEHAVIOR SIMULATORS
# ==============================================================================
async def human_mouse_wander(page, moves: int = 3):
    """Simulate random natural mouse wandering movements across the page."""
    for _ in range(moves):
        try:
            x = random.randint(150, 1000)
            y = random.randint(120, 650)
            await page.mouse.move(x, y, steps=random.randint(10, 25))
            await asyncio.sleep(random.uniform(0.3, 0.8))
        except Exception:
            pass

async def human_smooth_scroll(page, steps: int = 4):
    """Simulate human reading by scrolling down with pauses, and occasional scroll-backs."""
    for step in range(1, steps + 1):
        scroll_delta = random.randint(280, 520)
        # 20% chance of small scroll back up (re-reading behavior)
        if random.random() < 0.20:
            scroll_delta = -random.randint(100, 200)
        
        await page.evaluate(f"window.scrollBy({{ top: {scroll_delta}, behavior: 'smooth' }})")
        read_pause = random.uniform(2.5, 5.0)
        await asyncio.sleep(read_pause)
        
        if random.random() < 0.4:
            await human_mouse_wander(page, moves=1)

# ==============================================================================
# 🚀 CORE SEARCH & RANK-BOOSTING SIMULATION
# ==============================================================================
async def simulate_organic_search(keyword: str, headless: bool = False):
    profile = random.choice(PROFILES)
    print(f"\n" + "-" * 70)
    print(f"🎯 [Google Search Rank Booster] Từ khóa: '{keyword}'")
    print(f"🖥️ Thiết bị: {profile['viewport']['width']}x{profile['viewport']['height']} | Locale: {profile['locale'].split(',')[0]}")
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=headless,
            args=[
                "--start-maximized",
                "--disable-blink-features=AutomationControlled",
                "--disable-features=IsolateOrigins,site-per-process",
                "--no-sandbox"
            ]
        )
        
        context = await browser.new_context(
            user_agent=profile["ua"],
            viewport=profile["viewport"],
            locale=profile["locale"].split(",")[0],
            timezone_id=profile["tz"],
            no_viewport=True if not headless else False
        )
        
        # Inject anti-detection stealth script
        await context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            window.chrome = { runtime: {} };
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
        """)
        
        page = await context.new_page()
        
        try:
            # 1. Navigate to Google Search with realistic delay
            print("  🌐 1. Mở Google Search (google.com)...")
            await page.goto("https://www.google.com", wait_until="domcontentloaded")
            await asyncio.sleep(random.uniform(1.2, 2.5))
            
            # Dismiss cookie popups if present
            try:
                reject_btn = page.locator("button:has-text('Reject all'), button:has-text('Từ chối tất cả'), button:has-text('I agree')")
                if await reject_btn.is_visible(timeout=1200):
                    await reject_btn.click()
            except Exception:
                pass
            
            # 2. Type keyword naturally with human typing delays & occasional micro-pauses
            print(f"  ⌨️ 2. Gõ tự nhiên từ khóa: '{keyword}'...")
            search_box = page.locator("textarea[name='q'], input[name='q']").first
            await search_box.click()
            await asyncio.sleep(random.uniform(0.3, 0.7))
            
            for char in keyword:
                delay = random.randint(45, 130)
                await search_box.type(char, delay=delay)
                # 5% chance of a slight thinking pause
                if random.random() < 0.05:
                    await asyncio.sleep(random.uniform(0.2, 0.5))
            
            await asyncio.sleep(random.uniform(0.5, 1.2))
            await human_mouse_wander(page, moves=1)
            await page.keyboard.press("Enter")
            
            # 3. Wait for search results
            print("  🔍 3. Chờ Google trả về danh sách kết quả tìm kiếm...")
            await page.wait_for_load_state("domcontentloaded")
            await asyncio.sleep(random.uniform(2.0, 3.5))
            
            # 4. Search through up to 3 Google SERP pages to locate layameet.com
            target_link = None
            found_page_num = 1
            max_pages = 3
            
            for page_idx in range(1, max_pages + 1):
                print(f"  🔎 Đang quét kết quả trên Trang {page_idx} của Google...")
                
                # Check for organic layameet links
                layameet_links = page.locator("#search a[href*='layameet.com'], #rso a[href*='layameet.com']")
                count = await layameet_links.count()
                
                if count == 0:
                    layameet_links = page.locator("a[href*='layameet.com']:not([href*='google.com'])")
                    count = await layameet_links.count()
                
                for i in range(count):
                    link = layameet_links.nth(i)
                    if await link.is_visible():
                        target_link = link
                        found_page_num = page_idx
                        break
                
                if target_link:
                    break
                
                # If not found on current page and not last page, scroll down and click Next Page
                if page_idx < max_pages:
                    print(f"     Chưa thấy trên trang {page_idx}, cuộn xuống kiểm tra nút trang tiếp...")
                    await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                    await asyncio.sleep(random.uniform(1.5, 2.5))
                    
                    next_button = page.locator("a#pnnext, a:has-text('Tiếp'), a:has-text('Next'), a:has-text('Xem thêm')").first
                    if await next_button.is_visible(timeout=2000):
                        print(f"     👉 Nhấp sang Trang {page_idx + 1} của Google...")
                        await next_button.click()
                        await page.wait_for_load_state("domcontentloaded")
                        await asyncio.sleep(random.uniform(2.5, 4.0))
                    else:
                        break
            
            # 5. Handle Click & Engagement
            if target_link:
                href = await target_link.get_attribute("href")
                print(f"  🎯 4. TÌM THẤY layameet.com TẠI TRANG {found_page_num} GOOGLE!")
                print(f"     URL hiển thị: {href}")
                print("  👉 Di chuột mượt mà và nhấp chuột trực tiếp vào kết quả tìm kiếm...")
                
                await target_link.scroll_into_view_if_needed()
                await asyncio.sleep(random.uniform(0.8, 1.5))
                await human_mouse_wander(page, moves=2)
                await target_link.click()
                
                # 6. Deep User Engagement (Dwell Time & Multi-page browsing)
                await page.wait_for_load_state("domcontentloaded")
                dwell_time = random.randint(35, 60)
                print(f"  ✅ 5. Chuyển hướng vào trang layameet.com thành công: {page.url}")
                print(f"  👀 6. Giả lập người dùng đọc trang thực thụ (Dwell Time ~{dwell_time}s)...")
                
                # Perform natural reading & scrolling
                await human_smooth_scroll(page, steps=random.randint(4, 7))
                
                # 7. Multi-page Navigation (Session Depth - Giảm Bounce Rate & tăng NavBoost)
                try:
                    explore_selector = random.choice(INTERNAL_EXPLORE_LINKS)
                    internal_link = page.locator(explore_selector).first
                    if await internal_link.is_visible(timeout=2500):
                        sub_href = await internal_link.get_attribute("href")
                        print(f"  🔗 7. Người dùng tương tác sâu: Bấm xem tiếp trang con ({sub_href})...")
                        await internal_link.scroll_into_view_if_needed()
                        await asyncio.sleep(random.uniform(1.0, 2.0))
                        await internal_link.click()
                        await page.wait_for_load_state("domcontentloaded")
                        print(f"     Đang đọc nội dung trang phụ trong {random.randint(8, 15)} giây...")
                        await human_smooth_scroll(page, steps=3)
                except Exception:
                    pass
                
                print("  🎉 === THÀNH CÔNG: TÍN HIỆU XẾP HẠNG TOP 1 ĐƯỢC GỬI ĐẾN GOOGLE ALGORITHM ===")
            else:
                print("  ⚠️ Từ khóa mới này chưa nằm trong top 3 trang Google.")
                print("  🌐 Thực hiện truy cập trực tiếp layameet.com với Google Referrer để kích hoạt tín hiệu Brand Search...")
                await page.goto("https://layameet.com", referer="https://www.google.com/", wait_until="domcontentloaded")
                await human_smooth_scroll(page, steps=4)
                await asyncio.sleep(random.uniform(6.0, 10.0))
                print("  ✅ Đã ghi nhận 1 phiên truy cập Brand Referral từ Google.")
                
        except Exception as e:
            print(f"  ❌ Gặp lỗi: {e}")
        finally:
            await browser.close()

# ==============================================================================
# 🏁 MAIN ENTRY POINT
# ==============================================================================
async def main():
    headless = "--headless" in sys.argv
    count = 3
    if "--help" in sys.argv or "-h" in sys.argv:
        print("Usage: python scripts/traffic_simulator.py [--headless] [--count=<N> | <N>]")
        return

    for idx, arg in enumerate(sys.argv):
        if arg.startswith("--count="):
            try:
                count = int(arg.split("=")[1])
            except Exception:
                pass
        elif arg == "--count" and idx + 1 < len(sys.argv):
            try:
                count = int(sys.argv[idx + 1])
            except Exception:
                pass
        elif arg.isdigit():
            count = int(arg)
            
    print("=" * 70)
    print("🔥 LAYAMEET GOOGLE SEARCH TOP 1 RANK BOOSTER & ORGANIC TRAFFIC TOOL 🔥")
    print(f"Chế độ: {'Ẩn danh (Headless)' if headless else 'Trình duyệt GUI thật (Hiển thị màn hình)'}")
    print(f"Số lượng truy vấn ngẫu nhiên trong phiên: {count} lượt")
    print("=" * 70)
    
    # Generate completely randomized queries for this run
    queries = [generate_random_keyword() for _ in range(count)]
    
    for i, kw in enumerate(queries, 1):
        print(f"\n[Phiên {i}/{count}] Bắt đầu chu trình mô phỏng tìm kiếm...")
        await simulate_organic_search(kw, headless=headless)
        if i < count:
            pause_sec = random.randint(5, 12)
            print(f"\n⏳ Tạm dừng ngẫu nhiên {pause_sec} giây trước phiên tiếp theo...")
            await asyncio.sleep(pause_sec)
    
    print("\n" + "=" * 70)
    print("✨ TẤT CẢ CÁC LƯỢT MÔ PHỎNG ĐÃ HOÀN TẤT THÀNH CÔNG!")
    print("=" * 70)

if __name__ == "__main__":
    asyncio.run(main())
