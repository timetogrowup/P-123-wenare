const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium,webkit}=require('playwright');
const {fixture,now,defense,auber,origin}=require('./test_teleportation_browser.cjs');
const name=process.env.MMI_BROWSER||'chromium';
(async()=>{
 const browser=await ({chromium,webkit}[name]).launch({headless:true,...(process.env.MMI_EXECUTABLE?{executablePath:process.env.MMI_EXECUTABLE}:{})});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block',reducedMotion:'reduce'});
  await context.addInitScript(()=>{const key='wenare-teleportation-favorites-v1';if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify([{id:'old-map',lat:48.865,lon:2.321,label:'48.86500, 2.32100'}]));});
  const {page,errors}=await fixture(context);page.setDefaultTimeout(15000);
  await page.waitForFunction(()=>document.querySelector('#wenareSituation').textContent.includes('près de'));
  assert.equal(await page.locator('#teleportBanner,#openTeleportation').count(),0);
  for(const id of ['returnToPosition','openHabitualPlaces']){const r=await page.locator('#'+id).boundingBox();assert.ok(r.width>=44&&r.height>=44);}
  const gpsCalls=await page.evaluate(()=>window.gpsCalls);
  await page.evaluate(()=>{const old=navigator.geolocation.getCurrentPosition;navigator.geolocation.getCurrentPosition=(ok,error,options)=>{window.explicitOptions=options;old(ok,error,options);};});
  await page.locator('#returnToPosition').focus();await page.keyboard.press('Enter');
  await page.waitForFunction(()=>document.querySelector('#returnToPosition').getAttribute('aria-busy')==='false');
  assert.equal(await page.evaluate(()=>window.gpsCalls),gpsCalls+1);
  assert.equal(await page.evaluate(()=>explicitOptions.maximumAge),0);
  assert.equal(await page.evaluate(()=>WenareTeleportationUI.read().mode),'gps');
  await page.evaluate(({defense,now})=>WenareTeleportationUI.explore({...defense,label:'La Défense'},now+1200000),{defense,now});
  const before=await page.evaluate(()=>WenareTeleportationUI.read());
  await page.locator('#openHabitualPlaces').click();
  assert.deepEqual(await page.evaluate(()=>WenareTeleportationUI.read()),before);
  await page.getByRole('button',{name:'Renommer Point sélectionné sur la carte',exact:true}).click();
  await page.locator('#habitualPlaceName').fill('Maison');await page.locator('#saveHabitualPlace').click();
  await page.getByRole('button',{name:'Maison',exact:true}).waitFor();
  let saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('wenare-teleportation-favorites-v1'))[0]);
  assert.deepEqual(saved,{id:'old-map',lat:48.865,lon:2.321,label:'Maison',labelKind:'named'});
  assert.deepEqual(await page.evaluate(()=>WenareTeleportationUI.read()),before);
  await page.locator('#habitualPlacesDialog').getByRole('button',{name:'Fermer',exact:true}).click();
  assert.equal(await page.evaluate(()=>document.activeElement.id),'openHabitualPlaces');

  // A candidate is captured from the projected point and does not follow GPS updates.
  await page.locator('#openHabitualPlaces').click();
  assert.match(await page.locator('#habitualPlaceSource').innerText(),/Lieu projeté.*La Défense/);
  await page.locator('#habitualPlaceName').fill('Bureau');
  await page.evaluate(origin=>window.dispatchEvent(new CustomEvent('wenare:physical-position',{detail:{status:'ready',position:{...origin,accuracy:10,timestamp:Date.now()}}})),origin);
  assert.equal(await page.locator('#habitualPlaceName').inputValue(),'Bureau');
  await page.locator('#saveHabitualPlace').click();
  const bureau=await page.evaluate(()=>JSON.parse(localStorage.getItem('wenare-teleportation-favorites-v1')).find(x=>x.label==='Bureau'));
  assert.equal(bureau.lat,defense.lat);assert.equal(bureau.lon,defense.lon);
  await page.locator('#saveHabitualPlace').click();assert.match(await page.locator('#habitualPlacesMessage').innerText(),/déjà enregistré/);
  assert.deepEqual(await page.evaluate(()=>WenareTeleportationUI.read()),before);

  // Picking/cancelling on the map returns the draft, without moving the active consultation.
  await page.getByRole('button',{name:'Choisir sur la carte',exact:true}).click();
  await page.getByRole('button',{name:'Utiliser ce lieu',exact:true}).waitFor();
  await page.locator('#placesCanvas .leaflet-marker-icon[title="La Défense"]').click();
  await page.locator('#placesDetail').waitFor({state:'visible'});
  assert.equal(await page.locator('#placesDetail').getByRole('button',{name:/Explorer|Y aller/}).count(),0,'a picker pin cannot teleport or start guidance');
  assert.deepEqual(await page.evaluate(()=>WenareTeleportationUI.read()),before);
  await page.keyboard.press('Escape');await page.locator('#habitualPlacesDialog').waitFor({state:'visible'});
  assert.equal(await page.locator('#habitualPlaceName').inputValue(),'Bureau');
  assert.deepEqual(await page.evaluate(()=>WenareTeleportationUI.read()),before);
  await page.getByRole('button',{name:'Choisir sur la carte',exact:true}).click();
  await page.getByRole('button',{name:'Sélectionner le centre de la carte',exact:true}).click();
  await page.getByRole('button',{name:'Utiliser ce lieu',exact:true}).click();
  await page.locator('#habitualPlacesDialog').waitFor({state:'visible'});
  assert.match(await page.locator('#habitualPlaceSource').innerText(),/Point sélectionné sur la carte/);
  assert.deepEqual(await page.evaluate(()=>WenareTeleportationUI.read()),before);
  // Map errors preserve the draft and consultation, with a usable manager.
  await page.locator('#habitualPlaceName').fill('Brouillon conservé');
  await page.evaluate(()=>{window.originalPicker=WenarePlacesMapUI.pickPoint;WenarePlacesMapUI.pickPoint=async()=>({status:'error',message:'La carte est indisponible. Réessayez.'});});
  await page.getByRole('button',{name:'Choisir sur la carte',exact:true}).click();
  await page.locator('#habitualPlacesDialog').waitFor({state:'visible'});
  assert.equal(await page.locator('#habitualPlaceName').inputValue(),'Brouillon conservé');
  assert.match(await page.locator('#habitualPlacesMessage').innerText(),/carte est indisponible/);
  assert.deepEqual(await page.evaluate(()=>WenareTeleportationUI.read()),before);
  await page.evaluate(()=>{WenarePlacesMapUI.pickPoint=originalPicker;});
  await page.keyboard.press('Escape');

  // Selecting a favorite explicitly resets the projected hour, then W restores real space and time.
  await page.locator('#openHabitualPlaces').click();await page.getByRole('button',{name:'Maison',exact:true}).click();
  await page.waitForFunction(()=>WenareTeleportationUI.read().destination?.label==='Maison');
  assert.equal(await page.evaluate(()=>WenareTeleportationUI.read().at),null);
  assert.equal(await page.evaluate(()=>WenareTeleportationUI.read().destination.label),'Maison');
  await page.evaluate(()=>{window.pendingGPS=[];navigator.geolocation.getCurrentPosition=(ok,error,options)=>pendingGPS.push({ok,error,options});});
  await page.locator('#returnToPosition').click();await page.locator('#returnToPosition').click();
  assert.equal(await page.evaluate(()=>pendingGPS.length),1);
  assert.equal(await page.locator('#returnToPosition').getAttribute('aria-disabled'),'true');
  await page.evaluate(()=>pendingGPS[0].error({code:1}));
  await page.waitForFunction(()=>document.querySelector('#returnToPosition').getAttribute('aria-disabled')==='false');
  assert.equal(await page.evaluate(()=>WenareTeleportationUI.read().mode),'exploration');
  assert.match(await page.locator('#wenareCommandFeedback').innerText(),/Autorisez/);
  await page.locator('#returnToPosition').click();
  await page.evaluate(auber=>WenareTeleportationUI.explore({...auber,label:'Auber'}),auber);
  await page.evaluate(origin=>pendingGPS[1].ok({timestamp:Date.now(),coords:{latitude:origin.lat,longitude:origin.lon,accuracy:10}}),origin);
  assert.equal(await page.evaluate(()=>WenareTeleportationUI.read().destination.label),'Auber');
  await page.locator('#returnToPosition').click();
  await page.evaluate(origin=>pendingGPS[2].ok({timestamp:Date.now(),coords:{latitude:origin.lat,longitude:origin.lon,accuracy:10}}),origin);
  await page.waitForFunction(()=>WenareTeleportationUI.read().mode==='gps');
  assert.equal(await page.locator('#wenareHeader').getAttribute('data-teleportation'),'false');
  await page.locator('#openHabitualPlaces').click();await page.getByRole('button',{name:'Supprimer Bureau',exact:true}).click();
  assert.equal(await page.getByRole('button',{name:'Bureau',exact:true}).count(),0);
  await page.keyboard.press('Escape');await page.reload();
  await page.locator('#openHabitualPlaces').click();await page.getByRole('button',{name:'Maison',exact:true}).waitFor();
  saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('wenare-teleportation-favorites-v1'))[0]);
  assert.equal(saved.id,'old-map');assert.equal(saved.label,'Maison');
  fs.mkdirSync('qa-teleportation-bandeau',{recursive:true});
  await page.screenshot({path:'qa-teleportation-bandeau/'+name+'-habitual-places.png'});
  assert.deepEqual(errors,[]);await context.close();

  const unavailable=await browser.newContext({viewport:{width:320,height:740},serviceWorkers:'block'});
  await unavailable.addInitScript(()=>{Storage.prototype.setItem=()=>{throw Error('Storage blocked');};});
  const blocked=await fixture(unavailable,true);const p=blocked.page;
  await p.locator('#openHabitualPlaces').click();assert.equal(await p.locator('#saveHabitualPlace').isDisabled(),true);
  await p.getByRole('button',{name:'Choisir sur la carte',exact:true}).click();
  await p.getByRole('button',{name:'Sélectionner le centre de la carte',exact:true}).click();
  await p.getByRole('button',{name:'Utiliser ce lieu',exact:true}).click();
  await p.locator('#habitualPlacesDialog').waitFor({state:'visible'});await p.locator('#habitualPlaceName').fill('Point de recette');await p.locator('#saveHabitualPlace').click();
  assert.match(await p.locator('#habitualPlacesMessage').innerText(),/session/);
  await p.getByRole('button',{name:'Point de recette',exact:true}).click();
  await p.waitForFunction(()=>WenareTeleportationUI.read().destination?.label==='Point de recette');
  assert.equal(await p.evaluate(()=>WenareTeleportationUI.read().destination.label),'Point de recette');
  assert.deepEqual(blocked.errors,[]);await unavailable.close();
  console.log(name+' COMMANDS_BROWSER_OK: W fresh GPS, race/failure/success, + manager, legacy rename, projected draft, duplicate, map cancel/select, persistence and blocked storage');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

