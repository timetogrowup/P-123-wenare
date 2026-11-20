const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const name=process.env.MMI_BROWSER||'chromium';

async function assertScreenReaderOnly(locator,message){
 const state=await locator.evaluate(element=>{
  const style=getComputedStyle(element),box=element.getBoundingClientRect();
  return {position:style.position,width:box.width,height:box.height,overflow:style.overflow,clipPath:style.clipPath,whiteSpace:style.whiteSpace};
 });
 assert.equal(state.position,'absolute',message+' (position)');
 assert.ok(state.width<=1&&state.height<=1,message+' (surface)');
 assert.equal(state.overflow,'hidden',message+' (overflow)');
 assert.match(state.clipPath,/inset\(50%\)/,message+' (clip)');
 assert.equal(state.whiteSpace,'nowrap',message+' (white-space)');
}

(async()=>{
 const browser=await ({chromium,webkit}[name]).launch({headless:true});
 try {
  const ctx=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block',reducedMotion:'no-preference'});
  const page=await ctx.newPage(),errors=[];
  page.setDefaultTimeout(60000);
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   window.gpsCalls=0;
   navigator.geolocation.getCurrentPosition=ok=>{
    window.gpsCalls++;
    ok({timestamp:Date.now(),coords:{latitude:48.9478,longitude:2.0328,accuracy:15}});
   };
  });
  await page.goto('http://127.0.0.1:8765/');
  assert.equal(await page.locator('[data-radius]').count(),5);
  assert.equal(await page.locator('[data-radius="10000"]').count(),0);
  assert.equal(await page.locator('#domainAll,.domain-label,.overview-actions').count(),0);
  assert.equal(await page.locator('#openPlacesMap').count(),1);
  assert.equal(await page.locator('.radius-buttons > #openPlacesMap').count(),1);
  assert.equal(await page.locator('.radius-buttons > button').count(),6);
  await assertScreenReaderOnly(page.locator('#radiusStatus'),'status is only for assistive technology');
  assert.doesNotMatch(await page.locator('#nearbyOverview').innerText(),/Ce qui m’intéresse|Tout voir|10 000 m/);
  await page.evaluate(()=>WenareOpportunitiesUI.selectCategory('health'));
  await page.waitForSelector('.opportunity-foot');
  await page.waitForSelector('.opportunity-card');
  await assertScreenReaderOnly(page.locator('#domainResultsStatus'),'no numerical status line');
  assert.equal(await page.locator('.opportunity-count').count(),0,'no category section counters');
  const stats=await page.evaluate(()=>[...document.querySelectorAll('.domain-button')].map(b=>({
   category:b.dataset.domain,hasPlaces:b.dataset.hasPlaces,amplitude:parseFloat(b.style.getPropertyValue('--domain-shake-amp'))||0,
   speed:parseFloat(b.style.getPropertyValue('--domain-shake-speed'))||0,
   name:getComputedStyle(b.querySelector('.domain-button-content')).animationName,
  })));
  assert.equal(stats.length,10);
  assert.ok(stats.some(x=>x.category==='health'&&x.hasPlaces==='true'),'health places should activate signal');
  for(const row of stats){
   if(row.hasPlaces==='true'){
    assert.ok(row.amplitude>=1.2&&row.amplitude<=5);
    assert.ok(row.speed>=330&&row.speed<=2000);
    assert.notEqual(row.name,'none');
   }else{assert.equal(row.name,'none');}
  }
  const health=stats.find(x=>x.category==='health');
  const near=await page.locator('[data-domain="health"]').boundingBox();
  await page.waitForTimeout(250);
  const after=await page.locator('[data-domain="health"]').boundingBox();
  assert.equal(near.x,after.x,'button hit area must remain stable');
  assert.equal(near.y,after.y,'button hit area must remain stable');
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await page.locator('[data-domain="health"] .domain-button-content').evaluate(e=>getComputedStyle(e).animationName),'none');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.click('[data-radius="500"]');
  await page.waitForFunction(()=>document.querySelector('[data-radius="500"]').getAttribute('aria-pressed')==='true');
  await page.click('#openPlacesMap');
  await page.locator('#placesDialog').waitFor({state:'visible'});
  await page.selectOption('#placesRadius','10000');
  await page.waitForFunction(()=>document.querySelector('#placesRadius').value==='10000');
  await page.waitForFunction(()=>document.querySelector('#radiusStatus').textContent.replace(/\s+/gu,' ').includes('10 000'));
  assert.equal(await page.locator('[data-radius="10000"]').count(),0);
  await page.selectOption('#placesCategory','all');
  await page.waitForFunction(()=>document.querySelector('#transportOverview').hidden===false);
  await page.locator('#placesClose').click();
  await page.waitForFunction(()=>!document.querySelector('#placesDialog').open);
  for(const width of [320,390,768]) {
   await page.setViewportSize({width,height:844});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'no page overflow at '+width);
  }
  fs.mkdirSync('qa-compact-categories',{recursive:true});
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:'qa-compact-categories/'+name+'-compact.png',fullPage:false});
  assert.deepEqual(errors,[]);
  assert.equal(await page.evaluate(()=>window.gpsCalls),1);
  await ctx.close();

  const denied=await browser.newContext({reducedMotion:'reduce',serviceWorkers:'block'});
  const p=await denied.newPage();
  await p.addInitScript(()=>navigator.geolocation.getCurrentPosition=(_ok,bad)=>bad({code:1}));
  await p.goto('http://127.0.0.1:8765/');
  await p.waitForFunction(()=>document.querySelector('#nearbyOverviewStatus').textContent.includes('Autorisez'));
  assert.equal(await p.locator('.domain-button.has-places').count(),0);
  await denied.close();
  console.log(name+' COMPACT_CATEGORIES_OK: 5 radii + map, no red pin or counters, availability-driven shake, reduced motion, map 10000, mobile, no extra GPS');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
