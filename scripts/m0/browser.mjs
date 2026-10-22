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
const normalize = value => String(value).split('\n')[0].replaceAll(base,'').replace(/http:\/\/127\.0\.0\.1:\d+/g,'').replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi,':uuid').replace(/\?[^\s)]+/g,'');
const rows = [];
const authStates = {};
const populated = {
  '/app/bots':'M0 Bot a', '/app/conversations':'m0-bot-a',
  '/app/conversations/:id':'M0 synthetic question',
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
      let events = []; let rawErrors=[]; let responses = []; const pending = new Set();
      page.on('pageerror',error=>{rawErrors.push(error.stack);events.push(`pageerror:${normalize(error.message)}`);});
      page.on('console',msg=>{if(msg.type()==='error') {rawErrors.push(msg.text());events.push(`console:${normalize(msg.text())}`);}});
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
        events=[]; rawErrors=[]; responses=[];
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
            // Mobile CSS intentionally hides this select; inspect bound context,
            // while geometry/keyboard checks assess actual visible controls.
            await page.locator('.ck-workspace__select').waitFor({state:'attached'});
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
          if(route.template==='/app/bots/:botKey/test') {
            row.dataChecks.runtimeIframe=await page.locator('iframe').count();
            if(!row.dataChecks.runtimeIframe) events.push('runtime:unavailable');
          }
          if(responses.some(r=>r.status>=500)&&/No (?:[a-z]+ )*(?:found|yet|indexed|requests|conversations|leads|data)/i.test(row.visible)) events.push('error:server-failure-presented-as-empty');
          row.overflow=await page.evaluate(()=>({document:document.documentElement.scrollWidth,viewport:innerWidth}));
          if(row.overflow.document>viewport.width+1) events.push('layout:horizontal-page-overflow');
          row.clipped=await page.evaluate(()=>[...document.querySelectorAll('.ck-page-header,.ck-appbar,main button,main a')].filter(el=>{
            const r=el.getBoundingClientRect(),s=getComputedStyle(el);
            return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'&&!el.closest('.ck-table-wrap')&&(r.left < -1||r.right>innerWidth+1);
          }).map(el=>({tag:el.tagName,text:el.textContent.trim().slice(0,80)})));
          if(row.clipped.length) events.push(`layout:clipped-header-or-actions:${row.clipped.length}`);
          const axe=await new AxeBuilder({page}).analyze();
          row.axe=axe.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)}));
          row.dataChecks.axe=row.axe.filter(v=>['critical','serious'].includes(v.impact)).map(v=>({id:v.id,impact:v.impact,count:v.nodes.length})).sort((a,b)=>a.id.localeCompare(b.id));
          for(const violation of row.axe.filter(v=>['critical','serious'].includes(v.impact))) events.push(`axe:${violation.impact}:${violation.id}`);
          await page.keyboard.press('Tab');
          row.keyboard=await page.evaluate(()=>({tag:document.activeElement?.tagName,name:document.activeElement?.getAttribute('aria-label')||document.activeElement?.textContent?.trim().slice(0,100)}));
          if(row.keyboard.tag==='BODY') events.push('keyboard:no-focused-control');
          const screenshot=`evidence/m0/screenshots/${route.template.replaceAll('/','_').replaceAll(':','')}-${viewport.width}-${phase}.png`;
          await page.screenshot({path:screenshot,fullPage:true}); row.evidence=screenshot;
        } catch(error) { events.push(`fatal:${normalize(error.message)}`); }
        row.milliseconds=Math.round(performance.now()-start);
        row.events=[...new Set(events)].sort(); row.rawErrors=rawErrors; row.responses=responses;
        row.signature=createHash('sha256').update(JSON.stringify({events:row.events,dataChecks:row.dataChecks})).digest('hex');
        row.status=row.events.length?'observed-defects':'pass'; rows.push(row);
        await writeFile('evidence/m0/browser.json',JSON.stringify(rows,null,2));
        console.log(`${row.id}: ${row.status} (${row.events.length} observations)`);
      }
      await context.close();
    }
  }
  const context=await authenticated('superadmin',{width:1440,height:900});
  const page=await context.newPage();
  const row={id:'workspace-switch@1440',route:'/app/bots',auth:'superadmin',tenant:'a → b',fixture:'populated A/B synthetic',viewport:{width:1440,height:900},phase:'workspace-switch',events:[],dataChecks:{}};
  page.on('pageerror',error=>row.events.push(`pageerror:${normalize(error.message)}`));
  try {
    await page.goto(base+'/app/dashboard',{waitUntil:'networkidle'});
    // Follow a real product link to exercise client-side navigation and context.
    await page.locator('a[href="/app/bots"]').first().click();
    await page.waitForURL(base+'/app/bots');
    await page.waitForLoadState('networkidle');
    for(const key of ['a','b']) {
      const select=page.locator('.ck-workspace__select');
      const response=await select.inputValue()===f.tenants[key].id?Promise.resolve():page.waitForResponse(r=>r.url().includes(`/tenants/${f.tenants[key].id}/projects`));
      await select.selectOption(f.tenants[key].id);
      await response;
      await page.waitForLoadState('networkidle');
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      assert.equal(await select.inputValue(),f.tenants[key].id);
      const text=await page.locator('main').innerText();
      row.dataChecks[key]={ownVisible:text.includes(`M0 Bot ${key}`),foreignVisible:text.includes(`M0 Bot ${key==='a'?'b':'a'}`)};
      if(!row.dataChecks[key].ownVisible) row.events.push(`data:workspace-${key}-missing-own-bot`);
      if(row.dataChecks[key].foreignVisible) row.events.push(`isolation:workspace-${key}-shows-foreign-bot`);
    }
    row.evidence='evidence/m0/screenshots/workspace-switch.png'; await page.screenshot({path:row.evidence,fullPage:true});
  } catch(error) {row.events.push(`fatal:${normalize(error.message)}`);}
  row.events=[...new Set(row.events)].sort(); row.status=row.events.length?'observed-defects':'pass';
  row.signature=createHash('sha256').update(JSON.stringify({events:row.events,dataChecks:row.dataChecks})).digest('hex');
  rows.push(row); await context.close();
} finally { await browser.close(); }
assert.equal(rows.filter(r=>['direct','reload'].includes(r.phase)).length,162);
await writeFile('evidence/m0/browser.json',JSON.stringify(rows,null,2));
await writeFile('evidence/m0/browser.md','# M0 route coverage\n\n| Route | Auth | Tenant | Viewport | Phase | Result | Events | Evidence |\n|---|---|---|---|---|---|---|---|\n'+rows.map(r=>`| ${r.route} | ${r.auth} | ${r.tenant} | ${r.viewport.width}×${r.viewport.height} | ${r.phase} | ${r.status} | ${r.events.join('; ').replaceAll('|','/')} | ${r.evidence??'browser.json'} |`).join('\n')+'\n');
const signatures=Object.fromEntries(rows.map(r=>[r.id,{events:r.events,dataChecks:r.dataChecks,signature:r.signature}]));
await writeFile('evidence/m0/browser-baseline-candidate.json',JSON.stringify(signatures,null,2));
assert.ok(!rows.some(r=>r.events.some(event=>event.startsWith('fatal:'))),'Route/harness execution incomplete; fatal errors cannot become approved known-defect baseline');
if(process.argv.includes('--record')) {
  console.log('Candidate captured; requires review before becoming the CI baseline.');
} else {
  const baseline=JSON.parse(await readFile('scripts/m0/browser-baseline.json','utf8'));
  assert.deepEqual(signatures,baseline,'Browser behavior changed (new failures OR unexpected passes): review browser.json');
}
