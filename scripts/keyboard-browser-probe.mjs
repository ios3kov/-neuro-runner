import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(`${process.env.NEURO_PLAYWRIGHT_ROOT || '/tmp/neuro-audit-tools'}/package.json`);
const { chromium }=require('playwright');
const origin='http://127.0.0.1:4173';
for(let i=0;i<50;i++){try{if((await fetch(origin)).ok)break;}catch{}await new Promise(r=>setTimeout(r,200));}
const browser=await chromium.launch();

async function mobile() {
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page=await context.newPage(); page.setDefaultTimeout(7000);
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin,{waitUntil:'networkidle'});
  const field=page.getByRole('textbox',{name:'RUNNER_ID'});
  await field.waitFor();
  assert.equal(await page.locator('input,textarea,[contenteditable="true"]').count(),0,'Mobile login exposes a native editable control');
  await field.tap();
  const keyboard=page.locator('section[aria-label="NEURO RUNNER keyboard"]');
  await keyboard.waitFor();
  assert.equal(await keyboard.isVisible(),true,'Built-in keyboard is not visible after tapping RUNNER_ID');
  await keyboard.getByRole('button',{name:'CLR',exact:true}).tap();
  for(const key of ['A','U','D','I','T']) await keyboard.getByRole('button',{name:key,exact:true}).tap();
  assert.equal((await field.innerText()).replace(/\s/g,''),'AUDIT');
  assert.equal(await page.locator('input,textarea,[contenteditable="true"]').count(),0,'Native editable control appeared while custom keyboard was open');
  await keyboard.getByRole('button',{name:'ENTER',exact:true}).tap();
  await page.getByRole('button',{name:'ARCADE',exact:true}).waitFor();
  assert.deepEqual(errors,[]);
  await context.close();
}

async function landscape() {
  const context=await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true});
  const page=await context.newPage(); page.setDefaultTimeout(7000);
  await page.goto(origin,{waitUntil:'networkidle'});
  await page.getByRole('textbox',{name:'RUNNER_ID'}).tap();
  const keyboard=page.locator('section[aria-label="NEURO RUNNER keyboard"]');
  await keyboard.waitFor();
  const box=await keyboard.boundingBox();
  assert.ok(box && box.height < 210, 'Landscape built-in keyboard is not compact enough');
  assert.ok((await page.evaluate(()=>document.documentElement.scrollWidth)) <= 844,'Landscape custom keyboard causes horizontal overflow');
  await context.close();
}

async function desktop() {
  const context=await browser.newContext({viewport:{width:1280,height:800},hasTouch:false,isMobile:false});
  const page=await context.newPage(); page.setDefaultTimeout(7000);
  await page.goto(origin,{waitUntil:'networkidle'});
  const field=page.getByRole('textbox',{name:'RUNNER_ID'});
  await field.focus();
  await page.keyboard.press('ControlOrMeta+A').catch(()=>{});
  // Field is virtual, so clear through repeated Backspace, then physical keys.
  for(let i=0;i<20;i++) await page.keyboard.press('Backspace');
  await page.keyboard.type('AUDIT');
  assert.equal((await field.innerText()).replace(/\s/g,''),'AUDIT');
  assert.equal(await page.locator('section[aria-label="NEURO RUNNER keyboard"]').count(),0,'Virtual keyboard rendered on desktop');
  await page.keyboard.press('Enter');
  await page.getByRole('button',{name:'ARCADE',exact:true}).waitFor();
  await context.close();
}

try {
  await mobile();
  await landscape();
  await desktop();
  console.log('KEYBOARD_BROWSER_PASS mobile/custom-only, landscape, desktop/hardware');
} finally {
  await browser.close();
}
