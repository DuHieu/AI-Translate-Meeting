import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve('../../output/playwright/browsers');
const {chromium} = await import('playwright');
const base=process.env.MOBILE_BASE_URL || 'http://localhost:5173';
const out=path.resolve('../../output/playwright/mobile-20261008/grid');
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
const contexts=[];const results=[];
async function participant(name,url) {
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,locale:'vi-VN',permissions:['microphone','camera'],recordVideo:{dir:path.join(out,'video')}});
  contexts.push(context);await context.tracing.start({screenshots:true,snapshots:true,sources:true});
  const page=await context.newPage();page.setDefaultTimeout(20000);
  await page.goto(url);await page.locator('#display-name').fill(name);
  await page.locator('#native-language-select').selectOption('en');
  await page.getByRole('button',{name:'Tắt microphone',exact:true}).tap();
  await page.getByRole('button',{name:'Tắt camera',exact:true}).tap();
  await page.locator('button[type=submit]').tap();return page;
}
let host;
try {
  const hostContext=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,locale:'vi-VN',permissions:['microphone','camera'],recordVideo:{dir:path.join(out,'video')}});
  contexts.push(hostContext);await hostContext.tracing.start({screenshots:true,snapshots:true,sources:true});
  host=await hostContext.newPage();host.setDefaultTimeout(20000);
  await host.goto(base);await host.getByRole('button',{name:'Tạo cuộc họp mới',exact:true}).tap();
  await host.locator('#display-name').fill('QA Grid Host');
  const roomUrl=host.url();await host.locator('button[type=submit]').tap();
  await host.getByRole('button',{name:'Tắt mic',exact:true}).waitFor({timeout:45000});
  await host.getByRole('button',{name:'Thêm',exact:true}).tap();
  await host.getByRole('button',{name:'Đổi bố cục hiển thị',exact:true}).tap();
  await host.getByRole('button',{name:/^Tiled/}).tap();
  for (let count=1;count<=6;count++) {
    if(count>1) {
      const guest=await participant(`QA Guest ${count}`,roomUrl);
      await host.getByRole('button',{name:'Chấp nhận',exact:true}).tap({timeout:30000});
      await guest.locator('.meeting-primary-controls').waitFor({timeout:45000});
      await host.locator('.meeting-video-cell').nth(count-1).waitFor({timeout:30000});
    }
    if (![1,2,4,6].includes(count))continue;
    for(const width of [360,390,430,768,1024,1280,1440,1920]) {
      await host.setViewportSize({width,height:width<768?844:900});
      const metrics=await host.evaluate(()=>({count:document.querySelectorAll('.meeting-video-cell').length,width:document.documentElement.scrollWidth,viewport:innerWidth,grid:getComputedStyle(document.querySelector('.meeting-video-grid')).gridTemplateColumns}));
      assert.equal(metrics.count,count);assert(metrics.width<=width+1);
      const file=path.join(out,`grid-${count}-${width}.png`);await host.screenshot({path:file});
      results.push({count,width,status:'PASS',metrics,file});
      fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));
    }
  }
  await host.setViewportSize({width:390,height:844});
  await host.locator('.meeting-video-cell').first().getByRole('button',{name:/Ghim/}).tap();
  await host.screenshot({path:path.join(out,'pinned-390.png')});
} catch(error) {
  results.push({status:'FAIL',error:error.message.slice(0,1500)});
  await host?.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});process.exitCode=1;
} finally {
  for(let i=0;i<contexts.length;i++) {await contexts[i].tracing.stop({path:path.join(out,`trace-${i}.zip`)});await contexts[i].close();}
  await browser.close();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));
  console.log('Grid evidence',out,'checks',results.length);
}
