import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ownedRoomCleanup } from './qa-room-cleanup.mjs';

const baseURL = process.env.MOBILE_BASE_URL || 'http://localhost:5173';
const run = process.env.MOBILE_RUN || 'run-01';
const out = process.env.MOBILE_ARTIFACT_ROOT || path.resolve(`../../output/playwright/mobile-20261008/${run}`);
fs.mkdirSync(out, { recursive: true });
const roomCleanup = ownedRoomCleanup(baseURL, out);
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve('../../output/playwright/browsers');
const { chromium, webkit, devices } = await import('playwright');
const { default: AxeBuilder } = await import('@axe-core/playwright');
const definitions = [
  { name: 'iphone15-webkit', engine: webkit, device: devices['iPhone 15'] },
  { name: 'pixel7-chromium', engine: chromium, device: devices['Pixel 7'] },
  { name: 'ipad-webkit', engine: webkit, device: devices['iPad Mini'] },
  { name: 'desktop1440', engine: chromium, device: { viewport: { width: 1440, height: 900 }, hasTouch: true, isMobile: false } },
];
const selected = process.env.MOBILE_DEVICE ? definitions.filter(d => d.name === process.env.MOBILE_DEVICE || (process.env.MOBILE_DEVICE === 'webkit' && d.engine===webkit) || (process.env.MOBILE_DEVICE === 'chromium' && d.engine===chromium)) : definitions;
if (!selected.length) throw new Error('MOBILE_DEVICE không khớp thiết bị kiểm thử nào.');
const results = [];
const cleanError = value => String(value).replace(/(?:Bearer\s+|token[=:])[^\s&"']+/gi, '[redacted]').slice(0, 2400);
async function waitUntil(fn, timeout = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeout) { if (await fn()) return; await new Promise(r => setTimeout(r, 200)); }
  throw new Error('Không đạt trạng thái mong đợi trong thời gian chờ');
}
for (const definition of selected) {
  const deviceOut = path.join(out, definition.name);
  fs.mkdirSync(deviceOut, { recursive: true });
  let browser, context, page;
  const deviceResult = { device: definition.name, baseURL, playwrightVersion:JSON.parse(fs.readFileSync(new URL('../node_modules/playwright/package.json',import.meta.url),'utf8')).version, scope: 'Live local API + LiveKit; emulated device; fake media', steps: [], audits: [], errors: [] };
  results.push(deviceResult);
  let code;
  async function evidence(name) {
    const screenshot = path.join(deviceOut, `${name}.png`);
    await page.screenshot({ path: screenshot, timeout: 30000 });
    return screenshot;
  }
  async function step(name, fn) {
    const item = { flow: name, status: 'FAIL' };
    deviceResult.steps.push(item);
    try { await fn(); item.screenshot = await evidence(name); item.status = 'PASS'; }
    catch (error) { item.error = cleanError(error.message); item.screenshot = await evidence(`${name}-failure`).catch(() => null); }
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(results, null, 2));
    console.log(definition.name, name, item.status, item.error?.split('\n')[0] || '');
    if (deviceResult.crashed) throw new Error('Trình render của trình duyệt kiểm thử đã crash; các luồng phụ thuộc bị chặn.');
    return item.status === 'PASS';
  }
  async function audit(name) {
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    fs.writeFileSync(path.join(deviceOut, `axe-${name}.json`), JSON.stringify(result, null, 2));
    deviceResult.audits.push({ screen: name, violations: result.violations.map(v => ({ id: v.id, impact: v.impact, count: v.nodes.length })), incomplete: result.incomplete.map(v => ({ id: v.id, count: v.nodes.length })) });
  }
  const tap = async (name) => {
    const dialog = page.locator('dialog[open]').last();
    const scope = await dialog.count() ? dialog : page;
    return scope.getByRole('button', { name, exact: true }).tap();
  };
  const openMore = () => tap('Thêm');
  try {
    browser = await definition.engine.launch({ headless: !process.env.MOBILE_HEADFUL, args: definition.engine === chromium ? ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] : [] });
    context = await browser.newContext({ ...definition.device, hasTouch: true, permissions: ['camera', 'microphone'], locale: 'vi-VN', timezoneId: 'Asia/Bangkok', recordVideo: { dir: path.join(deviceOut, 'video') } });
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
    page = await context.newPage(); roomCleanup.track(page);
    page.setDefaultTimeout(12000);
    page.on('pageerror', error => deviceResult.errors.push(cleanError(error.message)));
    page.on('crash', () => { deviceResult.crashed=true; });
    await page.goto(baseURL);
    await page.locator('h1:visible').waitFor();
    const consent = page.locator('.cookie-consent');
    if (await consent.isVisible()) {
      await evidence('cookie-consent');
      await consent.getByRole('button',{name:'Từ chối',exact:true}).tap();
    }
    await audit('home');
    const created = await step('01-home-create', async () => {
      const createBtn = page.getByRole('button', { name: 'Tạo cuộc họp mới', exact: true }).filter({ visible: true }).first();
      await createBtn.tap();
      const instantBtn = page.getByRole('menuitem').filter({ hasText: /Bắt đầu một cuộc họp tức thì|Start an instant meeting|今すぐ会議を開始/ }).filter({ visible: true }).first();
      try {
        await instantBtn.waitFor({ state: 'visible', timeout: 3000 });
        await instantBtn.tap();
      } catch {
        // Fallback if no dropdown menu is rendered
      }
      await page.locator('#display-name').waitFor({ timeout: 20000 });
      code = new URL(page.url()).pathname.split('/').at(-1);
      assert.match(code, /^[A-Z0-9]{6}$/);
    });
    if (created) {
      await step('02-code-prejoin-keywords', async () => {
        await page.goto(baseURL);
        await page.locator('input:visible').first().fill(code);
        await page.locator('form:visible button[type=submit]').tap();
        const expectedName=`QA ${definition.name}`;
        await page.locator('#display-name').tap();
        await page.locator('#display-name').pressSequentially(expectedName);
        await page.locator('#native-language-select').selectOption('en');
        await page.getByRole('button').filter({ hasText: /Thiết bị & Từ điển|Tùy chọn nâng cao/ }).tap();
        const dialog = page.getByRole('dialog', { name: 'Thiết lập thiết bị và từ điển cuộc họp', exact: true });
        await dialog.getByRole('combobox', { name: 'Chuyên ngành cuộc họp' }).selectOption('engineering');
        await dialog.getByRole('textbox', { name: 'Từ khóa bổ trợ' }).fill('SLA, KPI, LayaMeet');
        await dialog.getByRole('button', { name: 'Xong', exact: true }).tap();
        assert.equal(await page.locator('#native-language-select').inputValue(), 'en');
        assert.equal(await page.locator('#display-name').inputValue(),expectedName);
        await audit('prejoin');
      });
      const joined = await step('03-join-live-room', async () => {
        await page.locator('button[type=submit]').tap();
        await page.locator('.meeting-primary-controls').waitFor({ timeout: 35000 });
        await waitUntil(async () => !(await page.getByRole('button', { name: /^(Tắt mic|Bật mic)$/ }).isDisabled()), 30000);
        assert.match(await page.locator('.meeting-shell').innerText(), /Đã kết nối/);
        await audit('meeting');
      });
      if (joined) {
        await step('04-mic-camera', async () => {
          for (const [on, off] of [['Tắt mic', 'Bật mic'], ['Tắt cam', 'Bật cam']]) {
            await tap(on);
            await page.getByRole('button', { name: off, exact: true }).waitFor();
            await tap(off);
            await page.getByRole('button', { name: on, exact: true }).waitFor();
          }
        });
        await step('05-language-captions', async () => {
          const captions = page.getByRole('button', { name: 'Phụ đề', exact: true });
          const original = await captions.getAttribute('aria-pressed');
          await captions.tap();
          assert.notEqual(await captions.getAttribute('aria-pressed'), original);
          await captions.tap();
          await tap('Ngôn ngữ');
          const target = page.locator('#meeting-target-language');
          await target.selectOption('ja');
          await waitUntil(async () => !(await target.isDisabled()));
          assert.equal(await target.inputValue(), 'ja');
          assert.match(await page.getByRole('dialog', { name: 'Ngôn ngữ & phụ đề', exact: true }).innerText(), /Đang dịch sang 日本語/);
          await tap('Lớn');
          assert.match(await page.getByRole('dialog', { name: 'Ngôn ngữ & phụ đề', exact: true }).innerText(), /tạm rời/);
          await tap('Đóng ngôn ngữ');
        });
        await step('06-people-invite', async () => {
          await openMore(); await tap(`Mọi người (${await page.locator('.meeting-video-cell').count() || 1})`);
          await page.getByRole('button', { name: 'Đóng danh sách', exact: true }).waitFor();
          await page.getByRole('button', { name: /Sao chép liên kết/ }).tap();
          await waitUntil(async () => await page.getByText('Đã sao chép liên kết mời!', { exact: true }).isVisible() || await page.getByText(/Không thể sao chép tự động/).isVisible());
          assert.match(await page.getByRole('textbox', { name: 'Đường dẫn mời', exact: true }).inputValue(), new RegExp(`/meeting/${code}$`));
          await audit('people');
          await tap('Đóng danh sách');
        });
        await step('07-chat-send', async () => {
          await openMore(); await tap('Chat');
          const message = `QA xin chào 日本語 ${definition.name}`;
          await page.getByRole('textbox', { name: 'Gửi tin nhắn', exact: true }).fill(message);
          await page.getByRole('button', { name: 'Gửi tin nhắn', exact: true }).tap();
          await page.getByText(message, { exact: true }).waitFor();
          await audit('chat');
        });
        await step('08-rotate-chat-viewport', async () => {
          const initial = definition.device.viewport;
          if (definition.device.isMobile) await page.setViewportSize({ width: initial.height, height: initial.width });
          await page.getByRole('textbox', { name: 'Gửi tin nhắn', exact: true }).tap();
          await page.getByRole('textbox', { name: 'Gửi tin nhắn', exact: true }).fill('Sau khi xoay màn hình');
          const rect = await page.getByRole('button', { name: 'Gửi tin nhắn', exact: true }).boundingBox();
          assert(rect && rect.y >= 0 && rect.y + rect.height <= page.viewportSize().height);
          await page.getByRole('button', { name: 'Gửi tin nhắn', exact: true }).tap();
          await page.getByText('Sau khi xoay màn hình', { exact: true }).waitFor();
          if (definition.device.isMobile) await page.setViewportSize(initial);
          await page.setViewportSize({width:initial.width,height:360});
          await page.getByRole('textbox', { name: 'Gửi tin nhắn', exact: true }).tap();
          const inputRect = await page.getByRole('textbox',{name:'Gửi tin nhắn',exact:true}).boundingBox();
          assert(inputRect && inputRect.y >= 0 && inputRect.y + inputRect.height <= 360);
          deviceResult.viewportContract = {visibleHeight:360,inputRect,scope:'Viewport resize contract, not a physical OS keyboard'};
          await page.setViewportSize(initial);
          await tap('Đóng tin nhắn');
        });
        await step('09-actions-recap-settings', async () => {
          await openMore(); await tap('Action Items');
          await page.getByRole('button', { name: /Việc làm/ }).waitFor();
          await audit('actions');
          await tap('Đóng bảng phụ đề');
          await openMore(); await tap('Tóm tắt');
          await page.getByRole('button', { name: /Tóm tắt/ }).waitFor();
          await tap('Đóng bảng phụ đề');
          await openMore(); await tap('Cài đặt âm thanh & AI');
          await page.getByRole('dialog', { name: 'Cài đặt cuộc họp', exact: true }).waitFor();
          await audit('meeting-settings');
          await tap('Đóng cài đặt');
        });
        await step('10-devices-capabilities', async () => {
          await openMore(); await tap('Microphone & loa');
          await page.getByRole('dialog', { name: 'Microphone & loa', exact: true }).waitFor();
          await page.keyboard.press('Escape');
          await openMore(); await tap('Chọn camera');
          await page.getByRole('dialog', { name: 'Chọn camera', exact: true }).waitFor();
          await page.keyboard.press('Escape');
          await openMore();
          const supported = await page.evaluate(() => !!navigator.mediaDevices?.getDisplayMedia);
          if (!supported) {
            await tap('Chia sẻ màn hình');
            await page.getByText(/Trình duyệt này không hỗ trợ chia sẻ màn hình/).waitFor();
          } else {
            assert(await page.getByRole('button', { name: 'Chia sẻ màn hình', exact: true }).isEnabled());
          }
          await tap('Đóng tùy chọn');
        });
        await step('10b-additional-tools', async () => {
          await openMore(); await tap('Giơ tay');
          await openMore(); await tap('Hạ tay');
          await openMore(); await tap('Gửi biểu cảm 👍');
          await openMore(); await tap('Cabin phiên dịch (Audio Booth — Ducking -18dB)');
          await openMore(); await tap('Cabin phiên dịch (Audio Booth — Ducking -18dB)');
          await openMore(); await tap('Phiên dịch âm thanh (TTS)');
          await tap('Phiên dịch âm thanh (TTS)');
          await tap('Đóng tùy chọn');
          await openMore(); await tap('Hoạt động');
          await page.getByRole('dialog',{name:'Công cụ cuộc họp',exact:true}).waitFor();
          await page.keyboard.press('Escape');
          await openMore(); await tap('Bộ điều khiển của người tổ chức');
          await page.getByRole('dialog',{name:'Công cụ cuộc họp',exact:true}).waitFor();
          await page.keyboard.press('Escape');
          await openMore(); await tap('Đổi bố cục hiển thị');
          await page.getByRole('dialog',{name:'Bố cục cuộc họp',exact:true}).waitFor();
          await page.keyboard.press('Escape');
          await openMore(); await tap('Thông tin cuộc họp');
          await page.getByText('Cuộc họp đã sẵn sàng',{exact:true}).waitFor();
          await page.getByRole('button',{name:'Đóng',exact:true}).tap();
        });
        await page.keyboard.press('Escape');
        await step('10d-spoken-language-rejoin', async () => {
          await tap('Ngôn ngữ'); await tap('Vào lại để đổi ngôn ngữ nói');
          await page.getByRole('button',{name:'Tham gia lại',exact:true}).waitFor({timeout:20000});
          await tap('Tham gia lại'); await page.locator('#display-name').waitFor();
          await page.locator('#display-name').fill(`QA rejoin ${definition.name}`);
          await page.locator('#native-language-select').selectOption('ja');
          await page.locator('button[type=submit]').tap();
          await page.getByRole('button',{name:'Tắt mic',exact:true}).waitFor({timeout:45000});
          await tap('Ngôn ngữ');
          assert.match(await page.getByRole('dialog',{name:'Ngôn ngữ & phụ đề',exact:true}).innerText(),/Ngôn ngữ nói:.*日本語/);
          await tap('Đóng ngôn ngữ');
        });
        await step('10c-offline-online', async () => {
          await context.setOffline(true);
          await page.getByText(/Mất mạng/).waitFor();
          await evidence('offline');
          await context.setOffline(false);
          await waitUntil(async () => !(await page.getByText(/Mất mạng/).isVisible()), 15000);
          await waitUntil(async () => /Đã kết nối/.test(await page.locator('.meeting-shell').innerText()),30000);
        });
        await step('11-leave', async () => {
          await tap('Rời');
          const download = page.waitForEvent('download');
          await page.getByRole('button',{name:'.MD',exact:true}).tap();
          await (await download).saveAs(path.join(deviceOut,'meeting-minutes.md'));
          await page.getByRole('button', { name: 'Rời cuộc họp', exact: true }).tap();
          await page.getByRole('button', { name: /Tham gia lại|Vào lại/ }).waitFor({ timeout: 20000 });
        });
      }
    }
    await step('12-ja-long-copy', async () => {
      await page.goto(`${baseURL}/ja`);
      await page.locator('h1:visible').waitFor();
      await waitUntil(async () => /[\u3040-\u30ff\u4e00-\u9faf]/.test(await page.locator('h1:visible').innerText()));
      const text = await page.locator('h1:visible').innerText();
      assert.match(text, /[\u3040-\u30ff\u4e00-\u9faf]/);
      const metric = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
      assert(metric.scroll <= metric.viewport + 1);
      await audit('ja');
    });
    await step('13-home-sections-touch', async () => {
      await page.goto(baseURL);
      for (const section of ['features','pricing','faq','contact']) {
        await page.locator('[data-testid=mobile-hamburger-btn]:visible,[data-testid=header-logo-menu-btn]:visible').first().tap();
        await page.getByTestId(`drawer-${section}`).tap();
        await page.locator('section:visible h2').first().waitFor();
        assert((await page.locator('section:visible').allTextContents()).join(' ').trim().length > 100);
        await evidence(`home-${section}`);
      }
    });
    await step('14-settings-tabs', async () => {
      for (const tab of ['ai_byok','audio_vad','meeting_limits','subtitles']) {
        await page.goto(`${baseURL}/settings?tab=${tab}`);
        await page.locator('main').waitFor();
        assert((await page.locator('main').innerText()).trim().length > 100);
        await evidence(`settings-${tab}`);
        await audit(`settings-${tab}`);
      }
    });
    deviceResult.video = await page.video()?.path();
  } catch (error) { deviceResult.fatal = cleanError(error.message); console.log(definition.name, 'fatal', deviceResult.fatal); }
  finally {
    deviceResult.trace = path.join(deviceOut, 'trace.zip');
    await context?.tracing.stop({ path: deviceResult.trace }).catch(() => {});
    await context?.close(); await browser?.close();
    await roomCleanup.cleanup();
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(results, null, 2));
  }
}
console.log('Artifacts:', out);
process.exitCode = results.some(r => r.fatal || r.errors.length || r.steps.some(s => s.status !== 'PASS')) ? 1 : 0;
