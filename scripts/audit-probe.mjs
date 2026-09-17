import { createRequire } from 'node:module';
import { mkdir, writeFile, readdir, readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
const require = createRequire('/tmp/neuro-audit-tools/package.json');
const { chromium } = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default;
await mkdir('audit-results', { recursive: true });
const origin = 'http://127.0.0.1:4173';
for (let n = 0; n < 60; n++) {
  try { if ((await fetch(origin)).ok) break; } catch {}
  await new Promise(r => setTimeout(r, 500));
}
const browser = await chromium.launch();
const result = { viewports: [], bundles: [], inventory: [] };
for (const [width, height] of [[390,844],[1280,800],[320,568],[844,390]]) {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [], requests = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('requestfailed', r => requests.push({url:r.url(),error:r.failure()?.errorText}));
  await page.addInitScript(() => {
    window.__qa = { lcp: 0, cls: 0, longTasks: [] };
    for (const [type, consume] of [
      ['largest-contentful-paint', e => { window.__qa.lcp=e.startTime; }],
      ['layout-shift', e => { if (!e.hadRecentInput) window.__qa.cls+=e.value; }],
      ['longtask', e => window.__qa.longTasks.push(e.duration)]
    ]) { try { new PerformanceObserver(l => l.getEntries().forEach(consume)).observe({type,buffered:true}); } catch {} }
  });
  await page.goto(origin, { waitUntil: 'domcontentloaded' });
  let login = false;
  try { await page.getByRole('button', { name: 'INITIALIZE_BOOT', exact: true }).waitFor({timeout:18000}); login = true; } catch {}
  const item = { width, height, loginVisible: login, errors, requests, states: [] };
  const capture = async name => {
    const scan = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
    const details = await page.evaluate(() => ({
      text: document.body.innerText.slice(0,1800),
      overflow: document.documentElement.scrollWidth > window.innerWidth,
      controls: [...document.querySelectorAll('button,input,[role="button"]')].filter(e=>e.getBoundingClientRect().width>0).map(e=>({text:e.getAttribute('aria-label')||e.textContent?.trim().slice(0,40),tag:e.tagName,width:Math.round(e.getBoundingClientRect().width),height:Math.round(e.getBoundingClientRect().height)})).slice(0,40),
      metrics: window.__qa,
      paints: performance.getEntriesByType('paint').map(p=>({name:p.name,ms:p.startTime})),
      resources: performance.getEntriesByType('resource').map(r=>({url:r.name,ms:Math.round(r.duration),bytes:r.transferSize}))
    }));
    await page.screenshot({path:`audit-results/${width}x${height}-${name}.png`});
    item.states.push({name,...details,violations:scan.violations.map(v=>({id:v.id,impact:v.impact,count:v.nodes.length,nodes:v.nodes.slice(0,5).map(n=>({html:n.html,summary:n.failureSummary}))}))});
  };
  try {
    await capture('login');
    if (login) {
      await page.getByRole('button',{name:'INITIALIZE_BOOT',exact:true}).click({timeout:3000});
      await page.getByText('ARCADE',{exact:true}).first().waitFor({timeout:5000});
      await capture('desktop');
      await page.getByText('ARCADE',{exact:true}).first().click();
      await capture('arcade');
      const cdp = await context.newCDPSession(page);
      await cdp.send('Performance.enable');
      const before = await cdp.send('Performance.getMetrics');
      await page.waitForTimeout(2000);
      const after = await cdp.send('Performance.getMetrics');
      const metric = (m,n)=>m.metrics.find(x=>x.name===n)?.value || 0;
      item.idle2s = { taskMs:1000*(metric(after,'TaskDuration')-metric(before,'TaskDuration')),scriptMs:1000*(metric(after,'ScriptDuration')-metric(before,'ScriptDuration')),heapBytes:metric(after,'JSHeapUsedSize') };
      const link = page.getByText('CAT_TERRITORY.EXE',{exact:true}).first();
      if (await link.count()) {
        await page.route('https://meow.neurospace.tech/**',route=>route.fulfill({contentType:'text/html',body:'<title>QA destination stub</title>'}));
        await link.click();
        await page.waitForURL('https://meow.neurospace.tech/**',{timeout:5000});
        item.externalNavigation = page.url();
        item.externalDestinationMocked = true;
      }
    }
  } catch (e) { item.probeError = String(e); }
  result.viewports.push(item);
  console.log('VIEWPORT_AUDIT',JSON.stringify(item));
  await context.close();
}
for (const name of await readdir('dist/assets')) {
  const data = await readFile(`dist/assets/${name}`);
  result.bundles.push({name,bytes:data.length,gzip:gzipSync(data).length});
}
async function walk(dir='.') {
  for (const entry of await readdir(dir,{withFileTypes:true})) {
    if (['node_modules','.git','dist','audit-results'].includes(entry.name)) continue;
    const p=`${dir}/${entry.name}`;
    if (entry.isDirectory()) await walk(p);
    else if (/\.(tsx?|jsx?)$/.test(p)) {
      const text=await readFile(p,'utf8');
      result.inventory.push({path:p,lines:text.split('\n').length,imports:[...text.matchAll(/(?:from\s+|import\s*)['"]([^'"]+)['"]/g)].map(m=>m[1]),timers:(text.match(/setInterval|setTimeout|requestAnimationFrame/g)||[]).length});
    }
  }
}
await walk();
await writeFile('audit-results/baseline.json',JSON.stringify(result,null,2));
console.log('BUNDLES',JSON.stringify(result.bundles));
console.log('INVENTORY',JSON.stringify(result.inventory));
await browser.close();
