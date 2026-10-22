import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const require = createRequire(new URL('./tools/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const { default: AxeBuilder } = require('@axe-core/playwright');
const base = 'http://localhost:45103';
assert.equal(process.env.M0_PORTAL_URL, base);
const f = JSON.parse(await readFile('evidence/m0/fixtures.json','utf8'));
const routeSource = await readFile('apps/portal/src/app/app.routes.ts','utf8');
// Discover authenticated child routes from the actual Angular registration.
const routeList = [];
for (const prefix of ['app','admin']) {
  const section = routeSource.split(`path: "${prefix}",`)[1].split('children: [')[1].split('{ path: "**"')[0];
  for (const [, path] of section.matchAll(/path: "([^"]+)"/g)) routeList.push({ template:`/${prefix}/${path}`, auth:prefix === 'admin' ? 'superadmin' : 'admin', tenant:prefix === 'app' ? 'a' : 'global' });
}
assert.equal(routeList.length,27,'Route inventory changed; review audit delta');
await writeFile('evidence/m0/routes.json',JSON.stringify(routeList,null,2));
await mkdir('evidence/m0/screenshots',{recursive:true});
const normalize = value => String(value).replaceAll(base,'').replace(/http:\/\/127\.0\.0\.1:\d+/g,'').replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi,':uuid').replace(/\?[^\s)]+/g,'');
const rows = [];
const authStates = {};
const populated = {
  '/app/bots':'M0 Bot a', '/app/conversations':'m0-bot-a',
  '/app/knowledge':'m0-local', '/app/knowledge/documents':'M0 Synthetic Private Document',
  '/app/knowledge/ingestions':'m0-local', '/app/knowledge/schedules':'M0 paused schedule',
  '/app/leads':'lead@example.test', '/app/settings/members':'m0-admin@example.test',
  '/app/settings/api-keys':'M0 synthetic key', '/admin/requests':'M0 Applicant',
  '/admin/tenants':'M0 Tenant A', '/admin/users':'m0-admin@example.test',
};
const browser = await chromium.launch({ headless:true, args:['--disable-background-networking','--disable-component-update','--no-sandbox'] });
async function authenticated(role,viewport) {
  const context = await browser.newContext({ viewport, reducedMotion:'reduce', serviceWorkers:'block', ...(authStates[role] ? {storageState:authStates[role]} : {}) });
  await context.route('**/*',async route => {
    const url = new URL(route.request().url());
    if (url.origin === base || ['data:','blob:'].includes(url.protocol)) await route.continue();
    else await route.abort('blockedbyclient');
  });
  if (!authStates[role]) {
    const login = await context.request.post(`${base}/api/v1/auth/login`,{data:f.users[role]});
    assert.equal(login.status(),200,`Login ${role}`);
    authStates[role] = await context.storageState();
  }
  const me = await context.request.get(`${base}/api/v1/auth/me`); assert.equal(me.status(),200);
  return context;
}
try {
  for (const viewport of [{width:390,height:844},{width:768,height:1024},{width:1440,height:900}]) {
    for (const route of routeList) {
      const context = await authenticated(route.auth,viewport);
      const page = await context.newPage();
      const path = route.template.replace(':botKey',f.projectKey).replace(':id',f.conversationId);
      let events = []; let responses = []; const pending = new Set();
      page.on('pageerror',error=>events.push(`pageerror:${normalize(error.message)}`));
      page.on('console',msg=>{if(msg.type()==='error') events.push(`console:${normalize(msg.text())}`);});
      page.on('request',req=>{ if(new URL(req.url()).origin === base) pending.add(req); });
      page.on('requestfinished',req=>pending.delete(req));
      page.on('requestfailed',req=>{pending.delete(req); events.push(`requestfailed:${normalize(req.url())}:${req.failure()?.errorText}`);});
      page.on('response',async response=>{
        if(response.status()>=400) events.push(`http:${response.status()}:${normalize(response.url())}`);
        if(response.url().includes('/api/v1/portal/')) {
          try { const data=await response.json(); responses.push({url:normalize(response.url()),status:response.status(),count:Array.isArray(data)?data.length:Array.isArray(data.items)?data.items.length:null}); } catch {}
        }
      });
      for (const phase of ['direct','reload']) {
        events=[]; responses=[];
        const start=performance.now();
        const row = {id:`${route.template}@${viewport.width}:${phase}`,route:route.template,auth:route.auth,tenant:route.tenant,fixture:'populated A/B synthetic',viewport,phase,events:[],responses:[]};
        try {
          const response=phase==='direct'?await page.goto(base+path,{waitUntil:'load',timeout:30000}):await page.reload({waitUntil:'load',timeout:30000});
          assert.equal(response.status(),200);
          await page.locator(route.auth==='admin'?'app-cockpit-shell':'app-admin-shell').waitFor({state:'visible',timeout:10000});
          // Network lifecycle plus browser frames, rather than a fixed sleep.
          await page.waitForLoadState('networkidle',{timeout:10000});
          await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
          assert.equal(new URL(page.url()).pathname,path,'Unexpected redirect');
          if(route.auth==='admin') {
            await page.locator('.ck-workspace__select').waitFor({state:'visible'});
            assert.equal(await page.locator('.ck-workspace__select').inputValue(),f.tenantId,'Tenant context failed to initialize');
          }
          assert.equal(pending.size,0,'Requests still in flight');
          row.visible = await page.locator('main').innerText().catch(()=>page.locator('body').innerText());
          row.tableRows=await page.locator('tbody tr').count();
          row.dataChecks={};
          if(populated[route.template]) {
            row.dataChecks={sentinelPresent:row.visible.includes(populated[route.template]),tableRows:row.tableRows};
            if(!row.dataChecks.sentinelPresent) events.push('data:seeded-record-not-visible');
          }
          if(responses.some(r=>r.status>=500)&&/No (?:[a-z]+ )*(?:found|yet|indexed|requests|conversations|leads|data)/i.test(row.visible)) events.push('error:server-failure-presented-as-empty');
          row.overflow=await page.evaluate(()=>({document:document.documentElement.scrollWidth,viewport:innerWidth}));
          if(row.overflow.document>viewport.width+1) events.push('layout:horizontal-page-overflow');
          const axe=await new AxeBuilder({page}).analyze();
          row.axe=axe.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)}));
          for(const violation of row.axe.filter(v=>['critical','serious'].includes(v.impact))) events.push(`axe:${violation.impact}:${violation.id}`);
          await page.keyboard.press('Tab');
          row.keyboard=await page.evaluate(()=>({tag:document.activeElement?.tagName,name:document.activeElement?.getAttribute('aria-label')||document.activeElement?.textContent?.trim().slice(0,100)}));
          if(row.keyboard.tag==='BODY') events.push('keyboard:no-focused-control');
          const screenshot=`evidence/m0/screenshots/${route.template.replaceAll('/','_').replaceAll(':','')}-${viewport.width}-${phase}.png`;
          await page.screenshot({path:screenshot,fullPage:true}); row.evidence=screenshot;
        } catch(error) { events.push(`fatal:${normalize(error.message)}`); }
        row.milliseconds=Math.round(performance.now()-start);
        row.events=[...new Set(events)].sort(); row.responses=responses;
        row.signature=createHash('sha256').update(JSON.stringify({events:row.events,dataChecks:row.dataChecks})).digest('hex');
        row.status=row.events.length?'observed-defects':'pass'; rows.push(row);
        await writeFile('evidence/m0/browser.json',JSON.stringify(rows,null,2));
      }
      await context.close();
    }
  }
} finally { await browser.close(); }
assert.equal(rows.length,162);
await writeFile('evidence/m0/browser.md','# M0 route coverage\n\n| Route | Auth | Tenant | Viewport | Phase | Result | Events | Evidence |\n|---|---|---|---|---|---|---|---|\n'+rows.map(r=>`| ${r.route} | ${r.auth} | ${r.tenant} | ${r.viewport.width}×${r.viewport.height} | ${r.phase} | ${r.status} | ${r.events.join('; ').replaceAll('|','/')} | ${r.evidence??'browser.json'} |`).join('\n')+'\n');
const signatures=Object.fromEntries(rows.map(r=>[r.id,{events:r.events,dataChecks:r.dataChecks,signature:r.signature}]));
await writeFile('evidence/m0/browser-baseline-candidate.json',JSON.stringify(signatures,null,2));
if(process.argv.includes('--record')) {
  console.log('Candidate captured; requires review before becoming the CI baseline.');
} else {
  const baseline=JSON.parse(await readFile('scripts/m0/browser-baseline.json','utf8'));
  assert.deepEqual(signatures,baseline,'Browser behavior changed (new failures OR unexpected passes): review browser.json');
}
