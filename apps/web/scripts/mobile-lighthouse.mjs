import fs from 'node:fs';
import path from 'node:path';
import lighthouse, { snapshot, startTimespan, generateReport } from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
const root = path.resolve('../..');
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(root, 'output/playwright/browsers');
const { chromium } = await import('playwright');
const base = process.env.MOBILE_BASE_URL || 'http://localhost:4173';
const out = path.join(root, 'output/playwright/mobile-20261008/lighthouse');
fs.mkdirSync(out, { recursive: true });
const chrome = await chromeLauncher.launch({ chromePath: chromium.executablePath(), chromeFlags: ['--headless=new', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--no-first-run'] });
const pp = await puppeteer.connect({ browserURL: `http://localhost:${chrome.port}`, defaultViewport: null });
const pw = await chromium.connectOverCDP(`http://localhost:${chrome.port}`);
const summaries = [];
const flags = { port: chrome.port, logLevel: 'error', onlyCategories: ['performance','accessibility','best-practices'], formFactor: 'mobile' };
function save(name, result, scope) {
  if (!result?.lhr) throw new Error(`Lighthouse did not return ${name}`);
  const lhr = result.lhr;
  fs.writeFileSync(path.join(out, `${name}.json`), JSON.stringify(lhr, null, 2));
  fs.writeFileSync(path.join(out, `${name}.html`), generateReport(lhr));
  const metrics = Object.fromEntries(['largest-contentful-paint','interaction-to-next-paint','cumulative-layout-shift','total-blocking-time','speed-index'].map(key => [key, lhr.audits[key]?.numericValue ?? null]));
  const row = { name, scope, mode: lhr.gatherMode, scores: Object.fromEntries(Object.entries(lhr.categories).map(([key,v])=>[key,v.score === null ? null : Math.round(v.score*100)])), metrics, throttling: lhr.configSettings.throttling, throttlingMethod: lhr.configSettings.throttlingMethod, warnings: lhr.runWarnings, runtimeError:lhr.runtimeError };
  summaries.push(row);
  fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify(summaries,null,2));
  console.log(JSON.stringify(row));
}
try {
  if (!process.env.LIGHTHOUSE_ROOM_ONLY) save('home-mobile', await lighthouse(base, flags), 'Production bundle, default mobile simulated throttling; fresh navigation');
  const context = await pw.newContext({hasTouch:true,isMobile:true,locale:'vi-VN',timezoneId:'Asia/Bangkok',viewport:{width:390,height:844},permissions:['microphone','camera']});
  const actual = await context.newPage();
  await actual.goto(base);
  await actual.getByRole('button',{name:'Tạo cuộc họp mới',exact:true}).tap();
  await actual.locator('#display-name').waitFor();
  const prejoin = actual.url();
  if (!process.env.LIGHTHOUSE_ROOM_ONLY) save('prejoin-mobile', await lighthouse(prejoin, flags), 'Production bundle, default mobile simulated throttling; actual API-created room');
  // Associate Lighthouse's Puppeteer page with the exact page driven through real UI.
  const target = (await pp.pages()).find(p=>p.url() === prejoin);
  if (!target) throw new Error('Could not locate real PreJoin page for Lighthouse user flow');
  const roomSpan = await startTimespan(target, {flags:{...flags,onlyCategories:['performance','best-practices']}});
  await actual.locator('#display-name').fill('QA Lighthouse');
  await actual.locator('#native-language-select').selectOption('en');
  await actual.locator('button[type=submit]').tap();
  await actual.getByRole('button',{name:'Tắt mic',exact:true}).waitFor({timeout:45000});
  await actual.getByRole('button',{name:'Ngôn ngữ',exact:true}).tap();
  await actual.locator('#meeting-target-language').selectOption('ja');
  await actual.getByRole('button',{name:'Đóng ngôn ngữ',exact:true}).tap();
  await actual.getByRole('button',{name:'Thêm',exact:true}).tap();
  await actual.getByRole('button',{name:'Chat',exact:true}).tap();
  await actual.getByRole('textbox',{name:'Gửi tin nhắn',exact:true}).fill('Lighthouse interaction');
  await actual.getByRole('button',{name:'Gửi tin nhắn',exact:true}).tap();
  save('meeting-mobile-timespan',await roomSpan.endTimespan(),'Real join + language + chat interaction. Timespan supports CLS/TBT; navigation LCP is not available. INP only if Lighthouse actually reports it.');
  await actual.getByRole('button',{name:'Đóng tin nhắn',exact:true}).tap();
  await actual.screenshot({path:path.join(out,'meeting-mobile.png')});
  save('meeting-mobile-snapshot',await snapshot(target,{flags:{...flags,onlyCategories:['accessibility','best-practices']}}),'Real connected meeting; Accessibility/Best Practices snapshot. No fabricated navigation Performance score.');
  await actual.getByRole('button',{name:'Rời',exact:true}).tap();
  await actual.getByRole('button',{name:'Rời cuộc họp',exact:true}).tap();
} finally { await pw.close(); await pp.disconnect(); await chrome.kill(); }
