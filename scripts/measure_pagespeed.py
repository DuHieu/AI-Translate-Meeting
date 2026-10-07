import asyncio
import json
import time
from playwright.async_api import async_playwright

async def measure_pagespeed(url: str, strategy: str = "mobile"):
    is_mobile = (strategy == "mobile")
    viewport = {"width": 393, "height": 852} if is_mobile else {"width": 1440, "height": 900}
    user_agent = (
        "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
        if is_mobile else
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport=viewport,
            user_agent=user_agent,
            device_scale_factor=2 if is_mobile else 1,
            is_mobile=is_mobile,
            has_touch=is_mobile
        )

        page = await context.new_page()

        # Web Vitals Observer script injected before document starts
        observer_script = """
        window.__webVitals = {
            fcp: 0,
            lcp: 0,
            cls: 0,
            fid: 0,
            ttfb: 0,
            domContentLoaded: 0,
            loadTime: 0
        };

        // TTFB & Navigation Timing
        new PerformanceObserver((entryList) => {
            const nav = entryList.getEntries()[0];
            if (nav) {
                window.__webVitals.ttfb = nav.responseStart - nav.requestStart;
                window.__webVitals.domContentLoaded = nav.domContentLoadedEventEnd - nav.startTime;
                window.__webVitals.loadTime = nav.loadEventEnd - nav.startTime;
            }
        }).observe({ type: 'navigation', buffered: true });

        // FCP
        new PerformanceObserver((entryList) => {
            for (const entry of entryList.getEntries()) {
                if (entry.name === 'first-contentful-paint') {
                    window.__webVitals.fcp = entry.startTime;
                }
            }
        }).observe({ type: 'paint', buffered: true });

        // LCP
        new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            if (entries.length > 0) {
                window.__webVitals.lcp = entries[entries.length - 1].startTime;
            }
        }).observe({ type: 'largest-contentful-paint', buffered: true });

        // CLS
        let clsValue = 0;
        new PerformanceObserver((entryList) => {
            for (const entry of entryList.getEntries()) {
                if (!entry.hadRecentInput) {
                    clsValue += entry.value;
                    window.__webVitals.cls = clsValue;
                }
            }
        }).observe({ type: 'layout-shift', buffered: true });
        """

        await page.add_init_script(observer_script)

        start_time = time.time()
        response = await page.goto(url, wait_until="networkidle", timeout=30000)
        nav_duration = (time.time() - start_time) * 1000

        # Wait extra 2 seconds for any trailing animations / late LCP candidate
        await page.wait_for_timeout(2000)

        status_code = response.status if response else 0

        # Extract vitals and resource metrics
        metrics = await page.evaluate("""
            () => {
                const vitals = window.__webVitals || {};
                const nav = performance.getEntriesByType('navigation')[0] || {};
                const paint = performance.getEntriesByType('paint');
                let fcp = vitals.fcp;
                if (!fcp) {
                    const fcpEntry = paint.find(p => p.name === 'first-contentful-paint');
                    if (fcpEntry) fcp = fcpEntry.startTime;
                }
                
                const resources = performance.getEntriesByType('resource');
                let totalTransferSize = 0;
                let scriptCount = 0;
                let imageCount = 0;
                let totalScriptSize = 0;

                resources.forEach(r => {
                    totalTransferSize += r.transferSize || 0;
                    if (r.initiatorType === 'script') {
                        scriptCount++;
                        totalScriptSize += r.transferSize || 0;
                    } else if (r.initiatorType === 'img') {
                        imageCount++;
                    }
                });

                return {
                    fcp: fcp || 0,
                    lcp: vitals.lcp || (nav.loadEventEnd ? nav.loadEventEnd : 0),
                    cls: vitals.cls || 0,
                    ttfb: nav.responseStart ? (nav.responseStart - nav.requestStart) : 0,
                    domInteractive: nav.domInteractive || 0,
                    domContentLoaded: nav.domContentLoadedEventEnd || 0,
                    loadComplete: nav.loadEventEnd || 0,
                    totalResources: resources.length,
                    totalTransferSizeKb: Math.round(totalTransferSize / 1024),
                    scriptCount: scriptCount,
                    totalScriptSizeKb: Math.round(totalScriptSize / 1024),
                    imageCount: imageCount
                };
            }
        """)

        # Performance score estimation (Lighthouse CWV weights: LCP 25%, TBT/FCP, CLS 25%)
        # Standard thresholds:
        # FCP: Good <= 1800ms
        # LCP: Good <= 2500ms
        # CLS: Good <= 0.1
        fcp = metrics["fcp"]
        lcp = metrics["lcp"]
        cls = metrics["cls"]
        ttfb = metrics["ttfb"]

        # Calculate Lighthouse-like performance score (0-100)
        score = 100
        if fcp > 1800:
            score -= min(25, int((fcp - 1800) / 100))
        if lcp > 2500:
            score -= min(40, int((lcp - 2500) / 100))
        if cls > 0.1:
            score -= min(25, int((cls - 0.1) * 150))
        score = max(10, min(100, score))

        await browser.close()

        return {
            "url": url,
            "strategy": strategy,
            "status_code": status_code,
            "nav_duration_ms": round(nav_duration, 1),
            "performance_score": score,
            "metrics": {
                "fcp_ms": round(fcp, 1),
                "lcp_ms": round(lcp, 1),
                "cls": round(cls, 4),
                "ttfb_ms": round(ttfb, 1),
                "dom_interactive_ms": round(metrics["domInteractive"], 1),
                "dom_content_loaded_ms": round(metrics["domContentLoaded"], 1),
                "load_complete_ms": round(metrics["loadComplete"], 1),
                "total_resources": metrics["totalResources"],
                "total_transfer_kb": metrics["totalTransferSizeKb"],
                "script_count": metrics["scriptCount"],
                "script_transfer_kb": metrics["totalScriptSizeKb"],
                "image_count": metrics["imageCount"]
            }
        }

async def main():
    urls = [
        "https://layameet.com/",
        "https://layameet.com/cam-nang",
        "https://layameet.com/cam-nang/hop-song-ngu-viet-nhat-khong-can-phien-dich-vien"
    ]
    
    results = {}
    for strategy in ["mobile", "desktop"]:
        results[strategy] = []
        for url in urls:
            res = await measure_pagespeed(url, strategy=strategy)
            results[strategy].append(res)
            
    print(json.dumps(results, indent=2))

if __name__ == "__main__":
    asyncio.run(main())
