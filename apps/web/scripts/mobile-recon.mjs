import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const out = path.resolve('../../output/playwright/mobile-20261008/before');
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
for (const width of [390, 1440]) {
  const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 }, hasTouch: true, isMobile: width < 768, locale: 'vi-VN' });
  await context.tracing.start({ screenshots: true, snapshots: true });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  await page.goto('http://localhost:5173/');
  await page.locator('h1:visible').waitFor();
  await page.screenshot({ path: `${out}/home-${width}.png` });
  console.log(width, 'home buttons', await page.getByRole('button').allTextContents());
  await page.getByRole('button', { name: width === 390 ? 'Mới' : 'Tạo cuộc họp mới', exact: true }).tap().catch(async () => {
    const buttons = page.getByRole('button').filter({ hasText: /Cuộc họp mới|Tạo cuộc họp mới|Tạo phòng|New meeting|Start|Bắt đầu|Mới/ });
    await buttons.first().tap();
  });
  await page.locator('#display-name').waitFor();
  const code = new URL(page.url()).pathname.split('/').at(-1);
  await page.screenshot({ path: `${out}/prejoin-${width}.png` });
  console.log(width, 'prejoin', code, 'buttons', await page.getByRole('button').allTextContents());
  await page.locator('#display-name').fill(`QA mobile ${width}`);
  await page.locator('#native-language-select').selectOption('vi');
  await page.locator('button[type=submit]').tap();
  await page.getByRole('button', { name: 'Leave Meeting', exact: true }).waitFor({ timeout: 30000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${out}/meeting-${width}.png` });
  console.log(width, 'room', await page.locator('body').innerText());
  const people = page.getByRole('button', { name: /Người tham gia|Participants|Mọi người/ }).first();
  if (!(await people.isVisible())) await page.getByRole('button', { name: 'Tùy chọn khác', exact: true }).tap();
  await page.getByRole('button', { name: /Người tham gia|Participants|Mọi người/ }).first().tap();
  await page.screenshot({ path: `${out}/people-${width}.png` });
  await context.tracing.stop({ path: `${out}/trace-${width}.zip` });
  await context.close();
}
await browser.close();
