const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium,webkit}=require('playwright');
const {fixture,now,defense,origin}=require('./test_teleportation_browser.cjs');
const baseline=require('./fixtures/bandeau-v46.json');
const browserName=process.env.MMI_BROWSER||'chromium';
const themes=['pop','funk','reggae','rock','jazz','electro','bossa','soul','folk','lofi','ambient','swing'];
const proofs='qa-teleportation-bandeau';

async function measure(page){
 return page.evaluate(()=>{
  const h=document.querySelector('#wenareHeader'),r=h.getBoundingClientRect(),style=getComputedStyle(h);
  return {height:r.height,top:r.top,bottom:r.bottom,footprint:r.bottom+parseFloat(style.marginBottom),
   width:r.width,scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth};
 });
}
async function project(page){
 await page.evaluate(({defense,now})=>WenareTeleportationUI.explore({...defense,label:'place de la Concorde, à Paris'},now+30*60000),{defense,now});
}
async function colors(page){
 return page.evaluate(()=>{
  const rgb=s=>s.match(/[\d.]+/g).slice(0,3).map(Number);
  const luminance=c=>c.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
  const contrast=(a,b)=>(Math.max(luminance(a),luminance(b))+.05)/(Math.min(luminance(a),luminance(b))+.05);
  const header=document.querySelector('#wenareHeader'),style=getComputedStyle(header),bg=rgb(style.backgroundColor);
  const text=['#wenareSituation','#wenareQuestion','#wenareProjectionStatus','#wenareNameSignal'].map(selector=>{
   const s=getComputedStyle(document.querySelector(selector));return {selector,ratio:contrast(rgb(s.color),bg),opacity:s.opacity};
  });
  const buttons=Array.from(document.querySelectorAll('#wenareHeader button')).map(b=>{const s=getComputedStyle(b);return contrast(rgb(s.color),rgb(s.backgroundColor));});
  return {text,buttons,background:style.backgroundColor,darker:luminance(bg)<luminance(rgb(getComputedStyle(document.body).backgroundColor)),position:style.position};
 });
}
(async()=>{
 const browser=await ({chromium,webkit}[browserName]).launch({headless:true,
  ...(process.env.MMI_EXECUTABLE?{executablePath:process.env.MMI_EXECUTABLE}:{})});
 try{
  fs.mkdirSync(proofs,{recursive:true});
  const evidence={browser:browserName,baseline:baseline.sourceCommit,measurements:{},themes:{},widths:{}};
  const previous=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block',reducedMotion:'reduce'});
  const old=await fixture(previous,false,{'index.html':baseline.indexHtml,'teleportation.css':baseline.teleportationCss,'teleportation.js':baseline.teleportationJs,'teleportation-ui.js':baseline.teleportationUiJs,'places-map-ui.js':baseline.placesMapUiJs});
  await old.page.waitForFunction(()=>document.querySelector('#wenareSituation').textContent.includes('près de'));
  await old.page.evaluate(()=>WenareThemes.select('pop'));
  evidence.measurements.oldGPS=await measure(old.page);
  await project(old.page);evidence.measurements.oldProjection=await measure(old.page);
  await previous.close();

  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block',reducedMotion:'reduce'});
  await context.addInitScript(()=>localStorage.setItem('wenare-teleportation-favorites-v1',JSON.stringify([
   {id:'legacy-map',lat:48.865,lon:2.321,label:'48.86500, 2.32100'}
  ])));
  const {page,errors}=await fixture(context);
  await page.waitForFunction(()=>document.querySelector('#wenareSituation').textContent.includes('près de'));
  await page.evaluate(()=>WenareThemes.select('pop'));
  evidence.measurements.newGPS=await measure(page);
  await project(page);evidence.measurements.newProjection=await measure(page);
  for(const mode of ['GPS','Projection']){
   const before=evidence.measurements['old'+mode].footprint,after=evidence.measurements['new'+mode].footprint;
   evidence.measurements['gain'+mode]=Math.round((1-after/before)*1000)/10;
   assert.ok(after<before,mode+': actual occupied height is reduced ('+before+' -> '+after+')');
  }
  await page.evaluate(()=>{
   const rows=document.createElement('section');rows.id='scrollFixture';
   for(let i=0;i<18;i++){
    const card=document.createElement('article');card.style.cssText='min-height:140px;padding:12px';
    const button=document.createElement('button');button.textContent='Résultat de recette '+i;button.id='scrollResult'+i;
    card.append(button);rows.append(card);
   }
   document.getElementById('nearbyOverview').append(rows);
  });
  for(const theme of themes){
   await page.evaluate(theme=>WenareThemes.select(theme),theme);
   const result=await colors(page);evidence.themes[theme]=result;
   assert.equal(result.position,'sticky',theme);assert.ok(result.darker,theme+' background is darker than page');
   assert.equal(result.background,'rgb(11, 16, 32)');
   for(const text of result.text){assert.ok(text.ratio>=4.5,theme+' '+text.selector);assert.equal(text.opacity,'1');}
   assert.ok(result.buttons.every(r=>r>=4.5),theme+' button text contrast');
  }
  await page.evaluate(()=>WenareThemes.select('pop'));
  for(const width of [320,360,390,768,1280]){
   await page.setViewportSize({width,height:844});
   for(const y of [0,350,1000,1800]){
    await page.evaluate(y=>scrollTo(0,y),y);
    const r=await measure(page);assert.ok(Math.abs(r.top)<=1,'header top at '+width+' / '+y);
    assert.ok(r.bottom<844&&r.scrollWidth<=r.viewport,'bounded header without horizontal overflow');
   }
   for(const id of ['openSettings','openHabitualPlaces','returnToPosition']){
    const b=await page.locator('#'+id).boundingBox();assert.ok(b.width>=44&&b.height>=44);
   }
   evidence.widths[width]=await measure(page);
  }
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>document.getElementById('scrollResult17').focus());
  let focused=await page.locator('#scrollResult17').boundingBox(),h=await measure(page);
  assert.ok(focused.y>=h.bottom&&focused.y+focused.height<=844,'last result can be reached and focused');
  await page.screenshot({path:proofs+'/'+browserName+'-compact-scrolled.png'});
  await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:proofs+'/'+browserName+'-compact-projection.png'});

  // A legacy coordinate favorite is visible as a human label, yet keeps its point and id.
  await page.locator('#openHabitualPlaces').click();
  await page.getByRole('button',{name:'Point sélectionné sur la carte',exact:true}).click();
  await page.waitForFunction(()=>WenareTeleportationUI.read().destination?.labelKind==='map-point');
  assert.equal(await page.evaluate(()=>WenareTeleportationUI.read().destination.labelKind),'map-point');
  assert.match(await page.locator('#wenareSituation').innerText(),/au point sélectionné sur la carte/);
  assert.doesNotMatch(await page.locator('#wenareSituation').innerText(),/48[.,]865|2[.,]321/);
  await page.locator('#returnToPosition').click();
  await page.waitForFunction(()=>WenareTeleportationUI.read().mode==='gps');
  assert.equal(await page.locator('#wenareHeader').getAttribute('data-teleportation'),'false');
  assert.notEqual((await colors(page)).background,'rgb(11, 16, 32)','active normal theme restored');
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('wenare:physical-position',{detail:{status:'ready',position:{lat:48.1,lon:2.8,accuracy:10,timestamp:Date.now()},location:null}})));
  assert.match(await page.locator('#wenareSituation').innerText(),/Lieu non identifié/);
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('wenare:physical-position',{detail:{status:'pending'}})));
  assert.match(await page.locator('#wenareSituation').innerText(),/Localisation en cours/);

  // Use the actual free-point selection on the map, with local Leaflet and fixture tiles.
  await page.locator('#openPlacesMap').click();
  await page.getByRole('button',{name:'Sélectionner le centre de la carte',exact:true}).click();
  await page.getByRole('button',{name:'Explorer le point sélectionné',exact:true}).click();
  assert.equal(await page.evaluate(()=>WenareTeleportationUI.read().destination.labelKind),'map-point');
  await page.keyboard.press('Escape');
  await page.locator('#placesDialog').waitFor({state:'hidden'});
  assert.match(await page.locator('#wenareSituation').innerText(),/au point sélectionné sur la carte/);

  for(const size of [{width:320,height:568},{width:844,height:390}]){
   await page.setViewportSize(size);
   await page.evaluate(()=>{document.documentElement.style.fontSize='200%';scrollTo(0,0);});
   const r=await measure(page);assert.ok(r.height<=size.height*.6+1&&r.scrollWidth<=r.viewport,'200% text remains bounded');
   assert.ok(await page.locator('#wenareHeader').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'header does not scroll horizontally at 200%');
   await page.locator('#openSettings').click();
   await page.locator('#settingsDialog').waitFor({state:'visible'});
   await page.keyboard.press('Escape');
  }
  await page.evaluate(()=>{document.documentElement.style.fontSize='';scrollTo(0,0);});
  await page.setViewportSize({width:390,height:844});
  assert.deepEqual(errors,[]);
  fs.writeFileSync(proofs+'/'+browserName+'-compact-metrics.json',JSON.stringify(evidence,null,2)+'\n');
  console.log(browserName+' COMPACT_BROWSER_OK '+JSON.stringify(evidence.measurements));
  await context.close();
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

