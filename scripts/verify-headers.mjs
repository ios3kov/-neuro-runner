import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const origin=process.env.AUDIT_ORIGIN || 'http://127.0.0.1:8787';
let response;
for(let n=0;n<90;n++){
  try{response=await fetch(origin,{signal:AbortSignal.timeout(2000)});if(response.ok)break;}catch{}
  await new Promise(resolve=>setTimeout(resolve,500));
}
assert.ok(response?.ok,'Local Worker did not become ready');
const html=await response.text();
const policy=response.headers.get('content-security-policy');
assert.ok(policy?.includes("default-src 'self'"));
assert.ok(policy.includes("object-src 'none'"));
assert.ok(!policy.includes("script-src 'unsafe-inline'"));
assert.equal(response.headers.get('x-content-type-options'),'nosniff');
assert.equal(response.headers.get('referrer-policy'),'strict-origin-when-cross-origin');
assert.match(response.headers.get('cache-control'),/no-cache/);
assert.ok(!/cdn.tailwindcss|fonts.googleapis|importmap/.test(html));
const asset=html.match(/src="(\/assets\/[^\"]+\.js)"/)?.[1];
assert.ok(asset,'Main JavaScript asset not found');
const js=await fetch(new URL(asset,origin));
assert.ok(js.ok);
const cache=js.headers.get('cache-control');
assert.match(cache,/max-age=31536000/);
assert.match(cache,/immutable/);
assert.ok(!cache.includes('no-cache'),'Inherited no-cache cancels immutable asset caching');
assert.match(js.headers.get('content-type'),/javascript/);
const deep=await fetch(`${origin}/qa/deep-route`,{headers:{'Sec-Fetch-Mode':'navigate'}});
assert.ok(deep.ok,'SPA deep link did not resolve');
const evidence={origin,html:Object.fromEntries(response.headers),asset:{path:asset,headers:Object.fromEntries(js.headers)},deepLinkStatus:deep.status,passed:true};
await mkdir('audit-results',{recursive:true});
await writeFile('audit-results/cloudflare-local.json',JSON.stringify(evidence,null,2));
console.log('CLOUDFLARE_LOCAL',JSON.stringify(evidence));
