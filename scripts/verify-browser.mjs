import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
const require = createRequire(process.env.AUDIT_TOOLS || '/tmp/neuro-audit-tools/package.json');
const playwright = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default;
const engine = process.env.AUDIT_BROWSER || 'chromium';
const origin = process.env.AUDIT_ORIGIN || 'http://127.0.0.1:4173';
const output = process.env.AUDIT_OUTPUT || `audit-results/${engine}`;
await mkdir(output,{recursive:true});
const results=[];
const browser=await playwright[engine].launch();
for(let i=0;i<60;i++){try{if((await fetch(origin)).ok)break;}catch{}await new Promise(r=>setTimeout(r,500));}
const node=(page,name)=>page.getByRole('button',{name,exact:true});
async function capture(page,name){await page.screenshot({path:`${output}/${name}.png`});}
async function axe(page,state,result){
  const report=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
  const violations=report.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({html:n.html,summary:n.failureSummary}))}));
  result.accessibility.push({state,violations});
  assert.equal(violations.length,0,`${state}: ${JSON.stringify(violations)}`);
}
async function login(page){
  await page.goto(origin,{waitUntil:'networkidle'});
  await page.locator('#runner-id').fill('AUDIT');await node(page,'INITIALIZE_BOOT').click();await node(page,'ARCADE').waitFor();
}
async function root(page){await page.getByRole('navigation',{name:'Current folder'}).getByRole('button',{name:'ROOT',exact:true}).click();}
async function close(page){await page.keyboard.press('Escape');await page.locator('dialog[open]').waitFor({state:'detached'});}
async function bounds(page){
  const result=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:innerWidth,inputs:[...document.querySelectorAll('input')].map(e=>getComputedStyle(e).fontSize),meta:document.querySelector('meta[name=viewport]')?.content}));
  assert.ok(result.width<=result.viewport+1,`Horizontal overflow: ${JSON.stringify(result)}`);
  assert.ok(!/user-scalable\s*=\s*no|maximum-scale\s*=\s*1/.test(result.meta));
  for(const size of result.inputs)assert.ok(parseFloat(size)>=16,'Input text smaller than 16 CSS px');
}
try {
for(const [width,height] of [[390,844],[320,568],[844,390],[1280,800]]){
  const result={viewport:`${width}x${height}`,accessibility:[],errors:[],externalRequests:[],checks:[]};
  const context=await browser.newContext({viewport:{width,height},hasTouch:width!==1280,isMobile:width!==1280,reducedMotion:'reduce'});
  const page=await context.newPage();page.setDefaultTimeout(7000);
  page.on('pageerror',e=>result.errors.push(e.message));
  page.on('request',r=>{if(!r.url().startsWith(origin)&&!r.url().startsWith('https://meow.neurospace.tech'))result.externalRequests.push(r.url());});
  try {
    await page.goto(origin,{waitUntil:'networkidle'});await page.locator('#runner-id').waitFor();
    await bounds(page);await axe(page,'login',result);await capture(page,`${width}x${height}-login`);
    await page.locator('#runner-id').fill('');await node(page,'INITIALIZE_BOOT').click();
    assert.match(await page.locator('#login-error').innerText(),/Enter a runner ID/);
    await page.locator('#runner-id').fill('AUDIT');await page.locator('#runner-id').press('Enter');await node(page,'ARCADE').waitFor();
    await bounds(page);await axe(page,'desktop',result);await capture(page,`${width}x${height}-desktop`);
    result.checks.push('native input, validation, Enter, responsive desktop');
    const opener=node(page,'Open stats');await opener.focus();await opener.click();await page.getByRole('dialog',{name:'Archive history'}).waitFor();
    await axe(page,'history',result);
    for(let i=0;i<8;i++){await page.keyboard.press('Tab');assert.ok(await page.evaluate(()=>!!document.activeElement?.closest('dialog[open]')),'Focus escaped modal');}
    await close(page);assert.equal(await opener.evaluate(e=>e===document.activeElement),true,'Focus not restored');
    await node(page,'README.TXT').click();await page.getByRole('dialog',{name:'README.TXT'}).waitFor();await close(page);
    result.checks.push('dialogs: names, focus containment, Escape and focus return');
    await node(page,'SYSTEM').click();await node(page,'KERNEL.CFG').click();await page.getByRole('dialog',{name:'System settings'}).waitFor();
    const hidden=page.getByRole('switch',{name:'HIDDEN_FILES'});await hidden.click();assert.equal(await hidden.getAttribute('aria-checked'),'true');
    await page.getByRole('switch',{name:'LOW_POWER'}).click();await axe(page,'settings',result);await close(page);
    await root(page);await node(page,'PRIVATE').click();await page.locator('#archive-key').fill('wrong');await node(page,'UNLOCK').click();
    assert.match(await page.locator('#archive-error').innerText(),/Incorrect/);
    await page.locator('#archive-key').fill('QWERTY123');await page.locator('#archive-key').press('Enter');await node(page,'MOV_001.VID').waitFor();
    assert.equal(await page.locator('dialog[open]').count(),0);
    await node(page,'MOV_001.VID').focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('Enter');await page.getByRole('dialog',{name:'IMG_002.DAT'}).waitFor();await close(page);await root(page);
    result.checks.push('settings, wrong/correct archive key, navigation after unlock');
    for(const mode of ['grid','list','tree']){
      await node(page,`${mode} view`).click();assert.equal(await node(page,`${mode} view`).getAttribute('aria-pressed'),'true');
      if(mode==='tree'){
        const expand=node(page,'Expand ARCADE');if(await expand.count())await expand.click();
        await node(page,'ARCADE').click();await node(page,'SYSTEM').click();await node(page,'grid view').click();await node(page,'KERNEL.CFG').waitFor();
        await root(page);await node(page,'tree view').click();
      }else await node(page,'ARCADE').click();
      await node(page,'CAT_TERRITORY.EXE').waitFor();assert.equal(await node(page,'CAT_TERRITORY.EXE').count(),1);
      await axe(page,`${mode} arcade`,result);await bounds(page);
      await page.route('https://meow.neurospace.tech/**',route=>route.fulfill({contentType:'text/html',body:'<title>QA destination</title>'}));
      const before=context.pages().length;await node(page,'CAT_TERRITORY.EXE').click();await page.waitForURL('https://meow.neurospace.tech/**');assert.equal(context.pages().length,before,'Popup instead of same-tab link');
      await login(page);await node(page,'grid view').click();
    }
    result.checks.push('all views: one game, exact same-tab destination (mocked), tree sibling navigation');
    await node(page,'Exit session').click();await node(page,'CANCEL').click();await node(page,'ARCADE').waitFor();
    await node(page,'Exit session').click();await node(page,'EXIT SESSION').click();await page.locator('#runner-id').waitFor();await node(page,'INITIALIZE_BOOT').click();await node(page,'ARCADE').waitFor();
    result.checks.push('cancel exit, logout, clean relogin');
    assert.deepEqual(result.errors,[]);assert.deepEqual(result.externalRequests,[],'Unexpected third-party resources');await bounds(page);result.passed=true;
  }catch(error){result.passed=false;result.failure=String(error);await capture(page,`${width}x${height}-failure`);}
  results.push(result);console.log('BROWSER_VERIFICATION',JSON.stringify(result));await context.close();
}
for(const variant of ['blocked','corrupt','legacy','omni']){
  const result={variant,errors:[],checks:[],accessibility:[]};
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  const page=await context.newPage();page.setDefaultTimeout(7000);page.on('pageerror',e=>result.errors.push(e.message));
  if(variant==='blocked')await page.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Storage blocked','SecurityError');}}));
  if(variant==='corrupt')await page.addInitScript(()=>localStorage.setItem('netrunner-core-storage',JSON.stringify({version:3,state:{user:{settings:null},viewMode:'BROKEN'}})));
  if(variant==='legacy')await page.addInitScript(()=>{if(localStorage.getItem('qa-seeded'))return;localStorage.setItem('qa-seeded','1');localStorage.setItem('netrunner-storage',JSON.stringify({state:{user:{username:'LEGACY',settings:{soundEnabled:false},stats:{SNAKE:{plays:2,highScore:123,maxLevelReached:4}}},viewMode:'LIST'}}));});
  try{
    await login(page);
    if(variant==='legacy'){
      await node(page,'Open stats').click();assert.match(await page.getByRole('dialog').innerText(),/123/);await close(page);
      assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('netrunner-core-storage')).state.user.settings.soundEnabled),false);
    }
    if(variant==='omni'){
      for(let attempt=0;attempt<4;attempt++){
        await root(page);await node(page,'VAULT').click();await node(page,'OMNI.AI').click();await page.getByRole('dialog',{name:'OMNI_CORE.AI'}).waitFor();
        await page.locator('#omni-command').fill(attempt===0?'A':'ABC');if(attempt>=2)await node(page,'SEND').click();
        await node(page,'OK / ACKNOWLEDGE').waitFor();await axe(page,`OMNI error ${attempt}`,result);await node(page,'OK / ACKNOWLEDGE').click();
        if(attempt===3){await node(page,'NEXT').waitFor();await node(page,'NEXT').click();}
        await page.locator('dialog[open]').waitFor({state:'detached'});
      }
      const user=await page.evaluate(()=>JSON.parse(localStorage.getItem('netrunner-core-storage')).state.user);assert.equal(user.omniAttempts,0);assert.equal(user.omniIteration,1);
      result.checks.push('four OMNI visits, recovery and reset');
    }
    assert.deepEqual(result.errors,[]);result.passed=true;
  }catch(error){result.passed=false;result.failure=String(error);await capture(page,`${variant}-failure`);}
  results.push(result);console.log('BROWSER_VERIFICATION',JSON.stringify(result));await context.close();
}
}finally{await writeFile(`${output}/verification.json`,JSON.stringify({results,browser:browser.version(),engine,externalDestinationMocked:true},null,2));await browser.close();}
assert.ok(results.every(r=>r.passed),'One or more browser scenario groups failed');
console.log(`PASS ${results.length} ${engine} scenario groups`);
