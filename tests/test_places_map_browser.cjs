const {chromium,webkit,selectors}=require('playwright'),assert=require('node:assert/strict');
(async()=>{const name=process.env.MMI_BROWSER||'chromium',browser=await({chromium,webkit}[name]).launch({headless:true});try{
await selectors.register('reachableCluster', () => {
 const reachable = root => [...root.querySelectorAll('#placesCanvas .places-pin:has(.places-cluster)')].filter(pin => {
  const rect = pin.getBoundingClientRect();
  const hit = pin.ownerDocument.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
  return hit && pin.contains(hit);
 });
 return {query: root => reachable(root)[0] || null, queryAll: reachable};
});
const context=await browser.newContext({viewport:{width:320,height:844},serviceWorkers:'block'}),page=await context.newPage(),errors=[];let routes=0;
page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{window.gpsCalls=0;navigator.geolocation.getCurrentPosition=ok=>{window.gpsCalls++;ok({timestamp:Date.now(),coords:{latitude:48.9478,longitude:2.0328,accuracy:15}});};});
await page.route('https://tile.openstreetmap.org/**',r=>r.abort());
await page.route('https://data.geopf.fr/navigation/itineraire?**',r=>{routes++;const u=new URL(r.request().url()),start=u.searchParams.get('start').split(',').map(Number),end=u.searchParams.get('end').split(',').map(Number);return r.fulfill({json:{profile:'pedestrian',distanceUnit:'meter',timeUnit:'second',distance:600,duration:500,geometry:{type:'LineString',coordinates:[start,end]}}});});
await page.goto('http://127.0.0.1:8765/');await page.evaluate(()=>WenareOpportunitiesUI.selectCategory('all'));await page.waitForSelector('.opportunity-card');await page.click('[data-domain="health"]');await page.waitForSelector('.opportunity-card[data-category="health"]');
assert.equal(await page.locator('.domain-button .domain-color-dot').count(),10);const gps=await page.evaluate(()=>window.gpsCalls);await page.click('#openPlacesMap');await page.waitForSelector('#placesCanvas .places-pin');assert.equal(await page.locator('#placesRadius').inputValue(),'500');
for(const radius of [250,500,5000,10000]){await page.selectOption('#placesRadius',String(radius));await page.waitForFunction(r=>document.querySelector('#placesRadius').value===String(r),radius);const expected=await page.locator('.opportunity-card').count();await page.waitForFunction(n=>document.querySelector('#placesStatus').textContent.startsWith(n+' lieu')||n===0&&document.querySelector('#placesStatus').textContent.startsWith('Aucun'),expected);assert.equal(await page.locator('.places-dialog').evaluate(e=>e.scrollWidth<=e.clientWidth),true);}
await page.selectOption('#placesRadius','500');await page.waitForSelector('#placesCanvas .places-pin');await page.locator('#placesCanvas .places-pin').first().click();await page.waitForSelector('.places-popup h3');assert.ok((await page.locator('.places-popup').textContent()).includes('Santé'));assert.equal(routes,0);await page.locator('.places-popup button').click();await page.waitForSelector('#walkMap:not([hidden])');assert.equal(await page.locator('#placesDialog').isVisible(),false);assert.equal(routes,1);await page.click('#walkClose');
assert.equal(await page.locator('[data-domain="health"]').getAttribute('aria-pressed'),'true');assert.equal(await page.locator('[data-radius="500"]').getAttribute('aria-pressed'),'true');await page.click('#openPlacesMap');await page.waitForSelector('#placesCanvas .places-pin');await page.selectOption('#placesCategory','food');await page.waitForFunction(()=>document.querySelector('[data-domain="food"]').getAttribute('aria-pressed')==='true');await page.selectOption('#placesCategory','all');await page.selectOption('#placesRadius','3000');await page.waitForSelector('.places-cluster');await page.locator('#placesCanvas').scrollIntoViewIfNeeded();
// The asynchronous transport and place lists both replace Leaflet's marker layer.
await page.locator('#placesCanvas .leaflet-marker-pane').evaluate(pane => new Promise(resolve => {
  let timer;
  const observer = new MutationObserver(onChange);
  function onChange() {
    clearTimeout(timer);
    timer = setTimeout(() => { observer.disconnect(); resolve(); }, 500);
  }
  observer.observe(pane, {childList:true, subtree:true});
  onChange();
}));
await page.locator('reachableCluster=group').first().click();
await page.waitForSelector('.places-group-list button');assert.ok(await page.locator('.places-group-list button').count()>1);await page.locator('.places-group-list button').first().click();await page.waitForSelector('.places-popup h3');await page.waitForSelector('.places-group-list',{state:'detached'});
await page.keyboard.press('Escape');assert.equal(await page.locator('#placesDialog').isVisible(),false);await page.waitForFunction(()=>document.activeElement.id==='openPlacesMap',null,{timeout:5000,polling:50});assert.equal(await page.evaluate(()=>document.activeElement.id),'openPlacesMap');assert.equal(await page.evaluate(()=>window.gpsCalls),gps);assert.deepEqual(errors,[]);await context.close();
const denied=await browser.newContext({serviceWorkers:'block'}),d=await denied.newPage();await d.addInitScript(()=>{navigator.geolocation.getCurrentPosition=(_ok,fail)=>fail({code:1});});await d.goto('http://127.0.0.1:8765/');await d.click('#openPlacesMap');await d.waitForFunction(()=>document.querySelector('#placesStatus').textContent.includes('Position GPS indisponible'));assert.equal(await d.locator('#placesCanvas').isVisible(),true);assert.ok((await d.locator('#placesStatus').textContent()).includes('Position GPS indisponible'));await denied.close();console.log(name+' PLACES_MAP_BROWSER_OK: matching list/filter counts, six radii, coloured categories, clusters, popups, walking handoff, reopen/escape/focus, no extra GPS, 320px, denied location, tiles unavailable');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
