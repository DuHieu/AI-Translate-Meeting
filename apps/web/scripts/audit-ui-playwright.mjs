import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCREENSHOT_DIR = path.resolve(__dirname, '../audit-screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const VIEWPORTS = [
  { name: '360px', width: 360, height: 640 },
  { name: '390px', width: 390, height: 844 },
  { name: '430px', width: 430, height: 932 },
  { name: '768px', width: 768, height: 1024 },
  { name: '1024px', width: 1024, height: 768 },
  { name: '1280px', width: 1280, height: 800 },
  { name: '1440px', width: 1440, height: 900 },
  { name: '1920px', width: 1920, height: 1080 },
];

const PAGES = [
  { path: '/', name: 'HomePage' },
  { path: '/prejoin/DEMO12', name: 'PreJoinPage' },
  { path: '/developers', name: 'DevelopersPage' },
  { path: '/so-sanh/layameet-vs-google-meet', name: 'ComparisonPage' },
  { path: '/cam-nang/hop-song-ngu-viet-nhat-khong-can-phien-dich-vien', name: 'BlogPostPage' },
  { path: '/settings', name: 'SettingsPage' },
];

async function runAudit() {
  console.log('🚀 Starting Comprehensive UI & UX Audit...');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const auditReport = [];

  // =========================================================================
  // BƯỚC 1: KIỂM TOÁN TỪNG VIEWPORT TRÊN HOMEPAGE
  // =========================================================================
  for (const vp of VIEWPORTS) {
    console.log(`\n🔍 Auditing Viewport: ${vp.name} (${vp.width}x${vp.height})`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();

    const url = `http://localhost:4173/`;
    await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(500);

    const screenshotPath = path.join(SCREENSHOT_DIR, `audit-home-${vp.name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });

    // 1. Kiểm tra cuộn ngang (Horizontal scroll / Overflow)
    const overflowInfo = await page.evaluate(() => {
      const docWidth = document.documentElement.clientWidth;
      const scrollWidth = document.documentElement.scrollWidth;
      const elements = Array.from(document.querySelectorAll('*'));
      const overflowing = [];

      for (const el of elements) {
        const rect = el.getBoundingClientRect();
        if (rect.right > docWidth + 1.5 && rect.width > 0 && rect.height > 0) {
          const style = window.getComputedStyle(el);
          if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
            overflowing.push({
              tag: el.tagName,
              className: (el.className || '').toString().slice(0, 100),
              right: Math.round(rect.right),
              diff: Math.round(rect.right - docWidth),
              text: (el.innerText || '').slice(0, 40).replace(/\n/g, ' ')
            });
          }
        }
      }
      return {
        hasHorizontalScroll: scrollWidth > docWidth + 1,
        docWidth,
        scrollWidth,
        overflowCount: overflowing.length,
        topOverflowing: overflowing.slice(0, 5)
      };
    });

    if (overflowInfo.hasHorizontalScroll) {
      auditReport.push({
        id: `AUDIT-OVERFLOW-${vp.name}`,
        page: 'HomePage',
        viewport: vp.name,
        desc: `Cuộn ngang xuất hiện: scrollWidth (${overflowInfo.scrollWidth}px) > docWidth (${overflowInfo.docWidth}px). Có ${overflowInfo.overflowCount} phần tử tràn mép phải.`,
        severity: 'Blocker',
        rootCause: overflowInfo.topOverflowing.map(o => `${o.tag}.${o.className} (vượt ${o.diff}px)`).join('; '),
        screenshot: `audit-home-${vp.name}.png`
      });
    }

    // 2. Kiểm tra Hero trên màn hình nhỏ 360x640 & 390x844
    if (vp.width <= 390) {
      const heroCheck = await page.evaluate(() => {
        const h1 = document.querySelector('h1');
        const ctaBtn = document.querySelector('button[type="submit"], a[href*="prejoin"]');
        const h1Rect = h1 ? h1.getBoundingClientRect() : null;
        const ctaRect = ctaBtn ? ctaBtn.getBoundingClientRect() : null;
        return {
          h1Bottom: h1Rect ? Math.round(h1Rect.bottom) : null,
          ctaBottom: ctaRect ? Math.round(ctaRect.bottom) : null,
          windowHeight: window.innerHeight,
          h1FontSize: h1 ? window.getComputedStyle(h1).fontSize : null
        };
      });

      if (heroCheck.ctaBottom && heroCheck.ctaBottom > heroCheck.windowHeight) {
        auditReport.push({
          id: `AUDIT-HERO-CTA-FOLD-${vp.name}`,
          page: 'HomePage/Hero',
          viewport: vp.name,
          desc: `Nút CTA chính bị đẩy xuống quá mép dưới màn hình (CTA bottom: ${heroCheck.ctaBottom}px > viewport ${heroCheck.windowHeight}px). Người dùng phải cuộn mới thấy CTA.`,
          severity: 'Major',
          rootCause: `Khoảng cách padding-top/bottom Hero hoặc kích thước H1 (${heroCheck.h1FontSize}) quá lớn trên màn hình dọc 640px.`,
          screenshot: `audit-home-${vp.name}.png`
        });
      }
    }

    // 3. Kiểm tra font-size của Form Inputs (iOS auto-zoom bug nếu < 16px)
    const smallInputs = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input, select, textarea'));
      const found = [];
      for (const input of inputs) {
        const style = window.getComputedStyle(input);
        const fontSizePx = parseFloat(style.fontSize);
        if (fontSizePx < 16 && style.display !== 'none') {
          found.push({
            tag: input.tagName,
            type: input.getAttribute('type') || 'text',
            placeholder: input.getAttribute('placeholder') || '',
            fontSize: style.fontSize,
            classes: (input.className || '').slice(0, 80)
          });
        }
      }
      return found;
    });

    if (smallInputs.length > 0) {
      auditReport.push({
        id: `AUDIT-INPUT-FONT-${vp.name}`,
        page: 'HomePage/Forms',
        viewport: vp.name,
        desc: `Phát hiện ${smallInputs.length} ô nhập liệu có font-size < 16px (ví dụ ${smallInputs[0].fontSize} trên "${smallInputs[0].placeholder || smallInputs[0].tag}"), gây lỗi Safari iOS tự động zoom khi focus.`,
        severity: 'Major',
        rootCause: `Class CSS thiết lập font chữ ${smallInputs[0].fontSize} (text-xs / text-sm) thay vì text-base (16px) cho mobile.`,
        screenshot: `audit-home-${vp.name}.png`
      });
    }

    // 4. Kiểm tra kích thước Touch Target (< 44x44px theo WCAG 2.2 AA)
    const touchTargetIssues = await page.evaluate(() => {
      const interactives = Array.from(document.querySelectorAll('button, a, input, select, [role="button"]'));
      const undersized = [];
      for (const el of interactives) {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        if (style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0) {
          if (rect.width < 44 || rect.height < 44) {
            const label = (el.innerText || el.getAttribute('aria-label') || el.getAttribute('title') || '').slice(0, 30).trim();
            if (label || el.querySelector('svg')) {
              undersized.push({
                label: label || '[Icon button]',
                width: Math.round(rect.width),
                height: Math.round(rect.height),
                class: (el.className || '').slice(0, 60)
              });
            }
          }
        }
      }
      return {
        count: undersized.length,
        samples: undersized.slice(0, 5)
      };
    });

    if (vp.width <= 430 && touchTargetIssues.count > 0) {
      auditReport.push({
        id: `AUDIT-TOUCH-TARGET-${vp.name}`,
        page: 'HomePage',
        viewport: vp.name,
        desc: `Có ${touchTargetIssues.count} nút/liên kết nhỏ hơn 44x44px. Ví dụ: ${touchTargetIssues.samples.map(s => `"${s.label}" (${s.width}x${s.height}px)`).join(', ')}.`,
        severity: 'Minor',
        rootCause: 'Nút icon hoặc pill tag thiếu min-h-[44px] min-w-[44px] hoặc hit area padding.',
        screenshot: `audit-home-${vp.name}.png`
      });
    }

    // 5. Kiểm tra Mobile Menu Drawer & Esc / Body Scroll Lock
    if (vp.width < 768) {
      const menuBtn = await page.$('button[data-testid="mobile-hamburger-btn"], button[aria-label*="menu"]');
      if (menuBtn) {
        await menuBtn.click();
        await page.waitForTimeout(300);

        const drawerOpenPath = path.join(SCREENSHOT_DIR, `audit-drawer-open-${vp.name}.png`);
        await page.screenshot({ path: drawerOpenPath });

        const drawerScrollLock = await page.evaluate(() => {
          return document.body.style.overflow === 'hidden' || document.documentElement.style.overflow === 'hidden';
        });

        if (!drawerScrollLock) {
          auditReport.push({
            id: `AUDIT-DRAWER-SCROLL-LOCK-${vp.name}`,
            page: 'Header/Drawer',
            viewport: vp.name,
            desc: 'Khi mở Mobile Menu Drawer, nền trang không được khóa cuộn (body scroll lock), người dùng vuốt drawer làm cuộn cả nội dung phía sau.',
            severity: 'Minor',
            rootCause: 'Drawer thiếu khóa overflow-hidden trên document.body khi mở.',
            screenshot: `audit-drawer-open-${vp.name}.png`
          });
        }

        // Test Escape to close
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);

        const isClosed = await page.evaluate(() => {
          const drawer = document.querySelector('[data-testid="drawer-home"]');
          return !drawer || window.getComputedStyle(drawer).display === 'none' || window.getComputedStyle(drawer).visibility === 'hidden';
        });

        if (!isClosed) {
          auditReport.push({
            id: `AUDIT-DRAWER-ESC-${vp.name}`,
            page: 'Header/Drawer',
            viewport: vp.name,
            desc: 'Mobile Menu Drawer không đóng khi nhấn phím Escape (vi phạm chuẩn WCAG 2.2 AA Keyboard Navigation).',
            severity: 'Minor',
            rootCause: 'Thiếu keydown event handler lắng nghe phím Escape.',
            screenshot: `audit-drawer-open-${vp.name}.png`
          });
        }
      }
    }

    // 6. Kiểm tra Tiếng Nhật (/ja) xem có vỡ chuỗi hay tràn layout
    try {
      await page.goto('http://localhost:4173/ja', { waitUntil: 'networkidle', timeout: 10000 });
      await page.waitForTimeout(400);

      const jaPath = path.join(SCREENSHOT_DIR, `audit-ja-${vp.name}.png`);
      await page.screenshot({ path: jaPath });

      const jaOverflow = await page.evaluate(() => {
        const docWidth = document.documentElement.clientWidth;
        const scrollWidth = document.documentElement.scrollWidth;
        return {
          hasOverflow: scrollWidth > docWidth + 1,
          scrollWidth,
          docWidth
        };
      });

      if (jaOverflow.hasOverflow) {
        auditReport.push({
          id: `AUDIT-JA-OVERFLOW-${vp.name}`,
          page: 'HomePage (Tiếng Nhật)',
          viewport: vp.name,
          desc: `Giao diện tiếng Nhật gây cuộn ngang: scrollWidth (${jaOverflow.scrollWidth}px) > docWidth (${jaOverflow.docWidth}px).`,
          severity: 'Major',
          rootCause: 'Chuỗi bản dịch tiếng Nhật không ngắt dòng (word-break) hoặc container thiếu flex-wrap.',
          screenshot: `audit-ja-${vp.name}.png`
        });
      }
    } catch (e) {
      console.warn(`Warning checking /ja at ${vp.name}:`, e.message);
    }

    await context.close();
  }

  // =========================================================================
  // BƯỚC 2: KIỂM TOÁN CÁC TRANG CỐT LÕI (PreJoin, Dev, Compare, Blog, Settings)
  // =========================================================================
  for (const pageItem of PAGES.slice(1)) {
    for (const width of [390, 1440]) {
      const vpLabel = `${width}px`;
      console.log(`\n🔍 Auditing Subpage: ${pageItem.name} at ${vpLabel}`);
      const context = await browser.newContext({
        viewport: { width, height: width === 390 ? 844 : 900 },
        deviceScaleFactor: 2,
      });
      const page = await context.newPage();

      try {
        await page.goto(`http://localhost:4173${pageItem.path}`, { waitUntil: 'networkidle', timeout: 15000 });
        await page.waitForTimeout(400);

        const imgName = `audit-${pageItem.name}-${vpLabel}.png`;
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, imgName) });

        const pageOverflow = await page.evaluate(() => {
          const docWidth = document.documentElement.clientWidth;
          const scrollWidth = document.documentElement.scrollWidth;
          return {
            hasOverflow: scrollWidth > docWidth + 1,
            diff: scrollWidth - docWidth
          };
        });

        if (pageOverflow.hasOverflow) {
          auditReport.push({
            id: `AUDIT-SUBPAGE-OVERFLOW-${pageItem.name}-${vpLabel}`,
            page: pageItem.name,
            viewport: vpLabel,
            desc: `Xuất hiện cuộn ngang trên trang ${pageItem.path} tại ${vpLabel} (vượt ${pageOverflow.diff}px).`,
            severity: 'Blocker',
            rootCause: 'Bảng hoặc khối mã/container có min-width cố định không co dãn trên mobile.',
            screenshot: imgName
          });
        }
      } catch (err) {
        console.error(`Error auditing ${pageItem.name}:`, err.message);
      } finally {
        await context.close();
      }
    }
  }

  await browser.close();

  console.log(`\n======================================================`);
  console.log(`📋 KIỂM TOÁN HOÀN TẤT: Tìm thấy ${auditReport.length} vấn đề cần xử lý.`);
  console.log(`======================================================`);

  fs.writeFileSync(path.join(__dirname, '../audit-report.json'), JSON.stringify(auditReport, null, 2));
  return auditReport;
}

runAudit().catch(err => {
  console.error('Fatal audit error:', err);
  process.exit(1);
});
