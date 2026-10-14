import fs from 'node:fs';
import path from 'node:path';
import { ownedRoomCleanup } from './qa-room-cleanup.mjs';
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve('../../output/playwright/browsers');
const { chromium } = await import('playwright');
const { default: AxeBuilder } = await import('@axe-core/playwright');
const base = process.env.MOBILE_BASE_URL || 'http://localhost:5173';
const out = path.resolve(`../../output/playwright/mobile-20261008/${process.env.QUALITY_RUN || 'quality'}`);
fs.mkdirSync(out, { recursive: true });
const roomCleanup=ownedRoomCleanup(base,out);
const routes = [
  ['home', '/'], ['ja', '/ja'], ['en', '/en'], ['settings', '/settings'], ['developers', '/developers'], ['admin', '/admin'], ['auth-callback', '/auth/callback'],
  ['guide-vi', '/cam-nang'], ['guide-vi-alias', '/vi/guide'], ['guide-en', '/en/guide'], ['guide-ja', '/ja/guide'],
  ['article-vi', '/cam-nang/hop-song-ngu-viet-nhat-khong-can-phien-dich-vien'], ['article-en', '/en/guide/real-time-bilingual-meeting-translation-guide'], ['article-ja', '/ja/guide/vietnam-japan-bilingual-meeting-guide'],
  ...['nhat', 'anh', 'trung', 'han'].map(s => [`language-${s}`, `/hop-song-ngu-tieng-${s}`]),
  ['compare-zoom', '/so-sanh/layameet-vs-zoom'], ['compare-google', '/so-sanh/layameet-vs-google-meet'], ['public-recap-empty', '/recap/QA0000'],
];
const rows = [];
const browser = await chromium.launch({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
try { for (const width of [360, 390, 430, 768, 1024, 1280, 1440, 1920]) {
  const context = await browser.newContext({ viewport: { width, height: width < 768 ? 844 : 900 }, hasTouch: true, isMobile: width < 768, locale: 'vi-VN', deviceScaleFactor: 1 });
  const page = await context.newPage(); roomCleanup.track(page);
  page.setDefaultTimeout(15000);
  const consoleErrors = [];
  page.on('pageerror', e => consoleErrors.push(e.message.slice(0, 300)));
  async function capture(name, fullPage = false) {
    await page.waitForTimeout(250);
    const file = `${out}/${name}-${width}.png`;
    await page.screenshot({ path: file });
    if (fullPage && [390, 1440].includes(width)) await page.screenshot({ path: `${out}/${name}-${width}-full.png`, fullPage: true });
    const measurement = await page.evaluate(() => {
      const visible = e => { const r=e.getBoundingClientRect(); return !e.classList.contains('sr-only') && r.width>0 && r.height>0 && getComputedStyle(e).visibility !== 'hidden'; };
      return {
        viewport: { width: innerWidth, height: visualViewport?.height ?? innerHeight },
        documentWidth: document.documentElement.scrollWidth,
        smallTargets: [...document.querySelectorAll('button,a,input,select,[role=switch],label:has(input[type=checkbox])')].filter(visible).filter(e => { const r=e.getBoundingClientRect();return r.width<44||r.height<44; }).map(e=>({ label:(e.getAttribute('aria-label')||e.textContent||e.getAttribute('title')||'').trim().slice(0,70), width:Math.round(e.getBoundingClientRect().width),height:Math.round(e.getBoundingClientRect().height) })),
        smallInputs: [...document.querySelectorAll('input:not([type=checkbox]):not([type=radio]),select,textarea')].filter(visible).filter(e=>parseFloat(getComputedStyle(e).fontSize)<16).map(e=>({ label:e.id||e.getAttribute('aria-label'),font:getComputedStyle(e).fontSize })),
      };
    });
    const row = { name, width, url: new URL(page.url()).pathname, file, ...measurement, consoleErrors: [...consoleErrors] };
    if ([390, 1440].includes(width)) {
      const axe = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
      fs.writeFileSync(`${out}/axe-${name}-${width}.json`, JSON.stringify(axe,null,2));
      row.axe = axe.violations.map(v=>({id:v.id,count:v.nodes.length}));
      row.incomplete = axe.incomplete.map(v=>({id:v.id,count:v.nodes.length}));
    }
    rows.push(row);
    fs.writeFileSync(`${out}/measurements.json`, JSON.stringify(rows,null,2));
    console.log(width,name,'overflow',measurement.documentWidth > width+1,'targets',measurement.smallTargets.length,'axe',row.axe?.map(v=>`${v.id}:${v.count}`).join(',')||'-');
  }
  await page.goto(base);
  await page.locator('.cookie-consent').waitFor();
  await capture('cookie-consent');
  await page.locator('.cookie-consent').getByRole('button',{name:'Tùy chỉnh',exact:true}).tap();
  await capture('cookie-preferences');
  await page.locator('.cookie-consent').getByRole('button',{name:'Thu gọn',exact:true}).tap();
  await page.locator('.cookie-consent').getByRole('button',{name:'Từ chối',exact:true}).tap();
  if (!process.env.PUBLIC_ONLY) {
  const createBtn = page.getByRole('button', {name:'Tạo cuộc họp mới',exact:true}).filter({ visible: true }).first();
  await createBtn.tap();
  const instantBtn = page.getByRole('menuitem').filter({ hasText: /Bắt đầu một cuộc họp tức thì|Start an instant meeting|今すぐ会議を開始/ }).filter({ visible: true }).first();
  try {
    await instantBtn.waitFor({ state: 'visible', timeout: 3000 });
    await instantBtn.tap();
  } catch {}
  await page.locator('#display-name').waitFor();
  await capture('prejoin');
  await page.locator('#display-name').fill('QA Viewport');
  await page.locator('#native-language-select').selectOption('en');
  await page.locator('button[type=submit]').tap();
  await page.getByRole('button',{name:'Tắt mic',exact:true}).waitFor({timeout:35000});
  await capture('meeting');
  await page.getByRole('button',{name:'Thêm',exact:true}).tap();
  await capture('more');
  await page.getByRole('dialog',{name:'Tùy chọn cuộc họp',exact:true}).getByRole('button',{name:'Chat',exact:true}).tap();
  await capture('chat');
  await page.getByRole('button',{name:'Đóng tin nhắn',exact:true}).tap();
  await page.getByRole('button',{name:'Thêm',exact:true}).tap();
  await page.getByRole('dialog',{name:'Tùy chọn cuộc họp',exact:true}).getByRole('button',{name:'Mọi người (1)',exact:true}).tap();
  await capture('people');
  await page.getByRole('button',{name:'Đóng danh sách',exact:true}).tap();
  await page.getByRole('button',{name:'Thêm',exact:true}).tap();
  await page.getByRole('dialog',{name:'Tùy chọn cuộc họp',exact:true}).getByRole('button',{name:'Action Items',exact:true}).tap();
  await capture('actions');
  await page.getByRole('button',{name:'Đóng bảng phụ đề',exact:true}).tap();
  await page.getByRole('button',{name:'Ngôn ngữ',exact:true}).tap();
  await capture('language');
  await page.getByRole('button',{name:'Đóng ngôn ngữ',exact:true}).tap();
  await page.getByRole('button',{name:'Thêm',exact:true}).tap();
  await page.getByRole('button',{name:'Cài đặt âm thanh & AI',exact:true}).tap();
  await capture('meeting-settings');
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Rời',exact:true}).tap();
  await capture('post-meeting');
  await page.getByRole('button',{name:'Rời cuộc họp',exact:true}).tap();
  await page.getByRole('button',{name:'Tham gia lại',exact:true}).waitFor();
  await capture('left-meeting');
  }
  await page.goto(base);
  const openNavigation = async () => page.locator('[data-testid=mobile-hamburger-btn]:visible,[data-testid=header-logo-menu-btn]:visible').first().tap();
  for (const section of ['features','pricing','faq','contact']) {
    await openNavigation(); await page.getByTestId(`drawer-${section}`).tap();
    await page.locator('section:visible h2').first().waitFor(); await capture(`home-${section}`,true);
  }
  await openNavigation(); await capture('navigation'); await page.keyboard.press('Escape');
  await openNavigation(); await page.getByTestId('drawer-tools').tap();
  await page.locator('main').waitFor(); await capture('system-tools'); await page.goto(base);
  for (const [name,id,label] of [['calendar','calendar','Lịch cuộc họp'],['history','history','Lịch sử cuộc họp'],['status','status','Trạng thái hệ thống']]) {
    try {
      await openNavigation(); await page.getByTestId(`drawer-${id}`).tap();
      const dialog=page.getByRole('dialog',{name:label,exact:true}); await dialog.waitFor();
      await capture(name);
      if (name==='calendar') {
        await dialog.getByRole('button',{name:'Tháng sau',exact:true}).tap();
        await dialog.getByRole('button',{name:'Tháng trước',exact:true}).tap();
        await dialog.getByRole('button',{name:'Đặt lịch mới',exact:true}).first().tap();
        await page.getByRole('dialog',{name:'Đặt lịch cuộc họp',exact:true}).waitFor();
        await page.locator('#schedule-name').fill('QA lịch họp — không gửi');
        await capture('schedule');
      }
      await page.keyboard.press('Escape');
    } catch(error) { rows.push({name,width,error:error.message.slice(0,200)}); console.log(width,name,'ERROR'); await page.keyboard.press('Escape'); }
  }
  for (const [name,label] of [['privacy','Chính sách quyền riêng tư'],['terms','Điều khoản dịch vụ']]) {
    await openNavigation(); await page.locator('dialog[open]').getByRole('button',{name:label,exact:true}).tap();
    await page.getByRole('dialog',{name:'Chính sách và điều khoản',exact:true}).waitFor(); await capture(name);
    await page.keyboard.press('Escape');
  }
  await openNavigation(); await page.getByTestId('drawer-pricing').tap();
  await page.getByRole('button',{name:'Cần tư vấn hạ tầng VPS / Server riêng?',exact:true}).tap();
  await page.getByRole('dialog',{name:'Đăng ký Demo và PoC',exact:true}).waitFor();
  await page.locator('#enterprise-name').fill('QA UI — không gửi');
  await page.locator('#enterprise-team-size').selectOption('100+'); await capture('enterprise'); await page.keyboard.press('Escape');
  for (const tab of ['audio_vad','meeting_limits','subtitles']) {
    await page.goto(`${base}/settings?tab=${tab}`); await page.locator('main').waitFor(); await capture(`settings-${tab}`);
  }
  for (const [name, route] of routes) {
    try { await page.goto(`${base}${route}`); await page.locator('main, h1, [role=alert]').first().waitFor({timeout:10000}); await capture(name,true); }
    catch(error) { rows.push({name,width,error:error.message.slice(0,200)}); console.log(width,name,'ERROR'); }
  }
  await context.close();
  await roomCleanup.cleanup();
}
} finally { await browser.close(); await roomCleanup.cleanup(); }
console.log('Quality artifacts',out);
