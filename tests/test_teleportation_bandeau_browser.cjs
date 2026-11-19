const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium,webkit}=require('playwright');
const {fixture,now,defense,auber,origin}=require('./test_teleportation_browser.cjs');
const browserName=process.env.MMI_BROWSER||'chromium';
const targets=['#wenareLogoSignal .wenare-mark','#wenareNameSignal'];

async function assertMotion(page,active){
 for(const selector of targets){
  const node=page.locator(selector);
  const style=await node.evaluate(el=>({name:getComputedStyle(el).animationName,state:getComputedStyle(el).animationPlayState}));
  assert.equal(style.name,active?'wenare-teleport-shake':'none',selector);
  if(active){
   assert.equal(style.state,'running');
   const values=new Set();
   for(let i=0;i<4;i++){
    values.add(await node.evaluate(el=>getComputedStyle(el).transform));
    await page.waitForTimeout(90);
   }
   assert.ok(values.size>1,selector+' actually moves');
  }
 }
}

(async()=>{
 const browser=await ({chromium,webkit}[browserName]).launch({headless:true,
  ...(process.env.MMI_EXECUTABLE?{executablePath:process.env.MMI_EXECUTABLE}:{})});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
  const {page,errors}=await fixture(context);page.setDefaultTimeout(15000);
  await page.waitForFunction(()=>document.querySelector('#wenareSituation').textContent.includes('près de'));
  assert.match(await page.locator('#wenareSituation').innerText(),/Il est 09 h 00.*Poissy/);
  await assertMotion(page,false);
  assert.equal(await page.locator('.motion-logo').evaluate(e=>getComputedStyle(e).animationName),'none');

  await page.evaluate(({defense,now})=>WenareTeleportationUI.explore({...defense,label:'place de l’Étoile'},now+20*60000),{defense,now});
  assert.equal(await page.locator('#wenareSituation').innerText(),'Il sera 09 h 20. Je serai place de l’Étoile.');
  await page.locator('#wenareProjectionStatus').waitFor({state:'visible'});
  const copy=page.locator('#wenareSituation'),before=await copy.boundingBox();
  await assertMotion(page,true);
  const after=await copy.boundingBox();assert.equal(before.x,after.x);assert.equal(before.y,after.y);
  await page.clock.fastForward(90000);
  assert.equal(await page.locator('#wenareSituation').innerText(),'Il sera 09 h 20. Je serai place de l’Étoile.');
  await page.locator('[data-radius="500"]').click();
  await page.locator('[data-domain="food"]').count().then(async n=>{if(n)await page.locator('[data-domain="food"]').click();});
  for(const theme of ['pop','funk','reggae','rock','jazz','electro','bossa','soul','folk','lofi','ambient','swing']){
   await page.evaluate(theme=>WenareThemes.select(theme),theme);
   assert.equal(await page.locator('#wenareLogoSignal .wenare-mark').evaluate(e=>getComputedStyle(e).animationPlayState),'running');
  }
  await assertMotion(page,true);

  await page.emulateMedia({reducedMotion:'reduce'});await assertMotion(page,false);
  await page.locator('#wenareProjectionStatus').waitFor({state:'visible'});
  await page.emulateMedia({reducedMotion:'no-preference'});await assertMotion(page,true);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
  assert.equal(await page.locator('#wenareLogoSignal .wenare-mark').evaluate(e=>getComputedStyle(e).animationPlayState),'paused');
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
  await assertMotion(page,true);

  // The original correction has expired. A pending return must preserve projection.
  await page.evaluate(()=>{window.pendingGPS=[];navigator.geolocation.getCurrentPosition=(ok,error)=>pendingGPS.push({ok,error});});
  await page.locator('#returnToPosition').click();
  await page.waitForFunction(()=>pendingGPS.length===1);
  assert.equal(await page.locator('#returnToPosition').getAttribute('aria-disabled'),'true');
  assert.equal(await page.evaluate(()=>WenareTeleportationUI.read().mode),'exploration');
  await assertMotion(page,true);
  await page.evaluate(()=>pendingGPS[0].error({code:1}));
  await page.waitForFunction(()=>!document.querySelector('#returnToPosition').disabled);
  assert.match(await page.locator('#wenareCommandFeedback').innerText(),/Autorisez la localisation/);
  assert.equal(await page.evaluate(()=>WenareTeleportationUI.read().mode),'exploration');

  await page.locator('#returnToPosition').click();
  await page.waitForFunction(()=>pendingGPS.length===2);
  await page.evaluate(auber=>WenareTeleportationUI.explore({...auber,label:'Auber'}),auber);
  await page.evaluate(origin=>pendingGPS[1].ok({timestamp:Date.now(),coords:{latitude:origin.lat,longitude:origin.lon,accuracy:10}}),origin);
  await page.waitForTimeout(100);
  assert.equal(await page.evaluate(()=>WenareTeleportationUI.read().destination.label),'Auber');
  assert.match(await page.locator('#wenareSituation').innerText(),/Je me projette à Auber/);
  await assertMotion(page,true);

  await page.locator('#returnToPosition').click();
  await page.waitForFunction(()=>pendingGPS.length===3);
  await page.evaluate(origin=>pendingGPS[2].ok({timestamp:Date.now(),coords:{latitude:origin.lat,longitude:origin.lon,accuracy:10}}),origin);
  await page.waitForFunction(()=>WenareTeleportationUI.read().mode==='gps');
  await assertMotion(page,false);
  assert.match(await page.locator('#wenareSituation').innerText(),/Je suis près de.*Poissy/);

  await page.evaluate(({defense,now})=>WenareTeleportationUI.explore({...defense,label:'place de l’Étoile'},now+1000),{defense,now});
  assert.match(await page.locator('#wenareSituation').innerText(),/Cette heure est passée/);
  await assertMotion(page,true);
  await page.evaluate(auber=>WenareTeleportationUI.explore({...auber,label:'<img src=x onerror=alert(1)> lieu très long '.repeat(4)}),auber);
  assert.equal(await page.locator('#wenareSituation img').count(),0);
  for(const width of [320,360,390]){
   await page.setViewportSize({width,height:844});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'width '+width);
   for(const id of ['openSettings','openHabitualPlaces','returnToPosition']){
    const b=await page.locator('#'+id).boundingBox();assert.ok(b.width>=44&&b.height>=44);
   }
  }
  fs.mkdirSync('qa-teleportation-bandeau',{recursive:true});
  await page.evaluate(({defense,now})=>WenareTeleportationUI.explore({...defense,label:'place de l’Étoile'},now+30*60000),{defense,now});
  await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:'qa-teleportation-bandeau/'+browserName+'-projection.png'});
  assert.deepEqual(errors,[]);
  await context.close();

  const reduced=await browser.newContext({serviceWorkers:'block',reducedMotion:'reduce'});
  const manual=await fixture(reduced,true);
  await manual.page.waitForFunction(()=>document.querySelector('#wenareSituation').textContent.includes('indisponible'));
  await manual.page.evaluate(auber=>WenareTeleportationUI.explore({...auber,label:'Auber'}),auber);
  await assertMotion(manual.page,false);
  await manual.page.locator('#wenareProjectionStatus').waitFor({state:'visible'});
  assert.deepEqual(manual.errors,[]);await reduced.close();
  console.log(browserName+' BANDEAU_BROWSER_OK: measured movement of logo and name, 90s persistence, stable text, 12 themes, GPS pending/failure/race/success, dates, reduced motion, 320/360/390px, escaped label');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
