import fs from 'node:fs';
import path from 'node:path';
import { ownedRoomCleanup } from './qa-room-cleanup.mjs';
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve('../../output/playwright/browsers');
const {chromium}=await import('playwright');
const base=process.env.MOBILE_BASE_URL||'http://localhost:4186';
const out=path.resolve(`../../output/playwright/mobile-20261008/${process.env.AI_RUN||'live-ai'}`);fs.mkdirSync(out,{recursive:true});
const roomCleanup=ownedRoomCleanup(base,out);
const speech=path.resolve('../../output/playwright/mobile-20261008/speech-en.wav');
const browser=await chromium.launch({args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream',`--use-file-for-fake-audio-capture=${speech}`]});
const contexts=[];const result={scope:'Actual UI, API, LiveKit and AI service; synthesized English speech as microphone input',messages:[],errors:[]};
try {
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,locale:'vi-VN',permissions:['microphone','camera'],recordVideo:{dir:path.join(out,'video')}});contexts.push(context);
 await context.tracing.start({screenshots:true,snapshots:true,sources:true});
 const page=await context.newPage();roomCleanup.track(page);page.setDefaultTimeout(15000);page.on('pageerror',e=>result.errors.push(e.message));
 page.on('websocket',socket=>socket.on('framereceived',frame=>{
  if(typeof frame.payload==='string')try{const raw=JSON.parse(frame.payload);const d=raw.type==='subtitle'&&raw.data?raw.data:raw;if(d.confidence!==0&&d.originalText)result.messages.push({type:raw.type,original:d.originalText,translation:d.translatedText,isFinal:d.isFinal});}catch{}
 }));
 await page.goto(base);await page.getByRole('button',{name:'Tạo cuộc họp mới',exact:true}).tap();await page.locator('#display-name').pressSequentially('QA live speech');
 await page.locator('#native-language-select').selectOption('en');await page.locator('button[type=submit]').tap();
 await page.getByRole('button',{name:'Tắt mic',exact:true}).waitFor({timeout:45000});
 await page.getByRole('button',{name:'Ngôn ngữ',exact:true}).tap();await page.locator('#meeting-target-language').selectOption('ja');await page.getByRole('button',{name:'Đóng ngôn ngữ',exact:true}).tap();
 await page.getByRole('button',{name:'Thêm',exact:true}).tap();await page.getByRole('button',{name:'Lịch sử phụ đề & xuất',exact:true}).tap();
 await page.waitForTimeout(45000);
 const originalToggle=page.locator('dialog[open]').getByRole('button',{name:'Gốc',exact:true});
 if(await originalToggle.getAttribute('aria-pressed')!=='true')await originalToggle.tap();
 result.panelText=await page.locator('dialog[open]').innerText();
 await page.screenshot({path:path.join(out,'subtitles-390.png')});
 await page.setViewportSize({width:1440,height:900});await page.screenshot({path:path.join(out,'subtitles-1440.png')});
 result.hasTranscript=/project|John|Friday|report|We decided/i.test(result.panelText);
 result.hasJapaneseTranslation=/[\u3040-\u30ff\u4e00-\u9faf]/.test(result.panelText);
 await page.keyboard.press('Escape');await page.getByRole('button',{name:'Thêm',exact:true}).tap();await page.getByRole('dialog',{name:'Tùy chọn cuộc họp',exact:true}).getByRole('button',{name:'Action Items',exact:true}).tap();
 result.actionPanelText=await page.locator('dialog[open]').innerText();await page.screenshot({path:path.join(out,'actions-1440.png')});
 await context.tracing.stop({path:path.join(out,'trace.zip')});
}catch(error){result.error=error.message;}
finally {for(const c of contexts)await c.close();await browser.close();await roomCleanup.cleanup();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({hasTranscript:result.hasTranscript,hasJapaneseTranslation:result.hasJapaneseTranslation,messages:result.messages.length,error:result.error,errors:result.errors.length}));}
process.exitCode=result.error||result.errors.length||!result.hasTranscript||!result.hasJapaneseTranslation?1:0;
