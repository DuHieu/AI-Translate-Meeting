import fs from 'node:fs';
import path from 'node:path';
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve('../../output/playwright/browsers');
const { chromium } = await import('playwright');
const browser=await chromium.launch();const rows=[];
for(const mode of ['dispatch','synthesize']){
 const detach=false;
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
 const page=await context.newPage();
 await page.setContent(`<meta name="viewport" content="width=device-width,initial-scale=1"><style>button{width:100%;height:80px;touch-action:none}dialog{width:300px;height:500px}</style><button id="leave" onclick="this.textContent='LEFT'">Leave</button><dialog><button id="handle" onpointerdown="this.setPointerCapture(event.pointerId)" onpointerup="this.closest('dialog').close()">Handle</button></dialog><script>document.querySelector('dialog').showModal()</script>`);
 const rect=await page.locator('#handle').boundingBox();const session=await context.newCDPSession(page);
 const point={x:rect.x+rect.width/2,y:rect.y+10,id:1};
 if(mode==='synthesize')await session.send('Input.synthesizeScrollGesture',{x:point.x,y:point.y,yDistance:-70,gestureSourceType:'touch',speed:400,preventFling:true});
 else {
 await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});
 await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...point,y:point.y+70}]});
 await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 }
 await page.locator('dialog').waitFor({state:'hidden'});if(detach)await session.detach();
 await page.locator('#leave').tap();
 rows.push({mode,nextTap:await page.locator('#leave').innerText()});
 await context.close();
}
await browser.close();fs.writeFileSync('../../output/playwright/mobile-20261008/touch-gesture-repro.json',JSON.stringify(rows,null,2));console.log(rows);
