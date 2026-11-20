const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium,webkit}=require('playwright');

const browserName=process.env.MMI_BROWSER||'chromium';
const base=process.env.MMI_BASE_URL||'http://127.0.0.1:8765/';
const origin={lat:48.933,lon:2.041};
const defense={lat:48.892,lon:2.238};
const auber={lat:48.872,lon:2.329};
const now=Date.parse('2026-11-19T08:00:00Z');
const minute=60000,arrival=now+20*minute;
const stations=[
 {id:'poissy',name:'Poissy',...origin,stop_point_ids:['p']},
 {id:'defense',name:'La Défense',...defense,stop_point_ids:['d']},
 {id:'auber',name:'Auber',...auber,stop_point_ids:['a']}
];
const data={
 stations,stops:stations.flatMap(s=>[
  {stop_id:s.id,stop_name:s.name},{stop_id:s.stop_point_ids[0],stop_name:s.name,parent_station:s.id}
 ]),
 lines:[{route_id:'A',route_short_name:'A',mode:'rer'},{route_id:'6501',route_short_name:'6501',mode:'bus'}],
 catalogueServices:[['p','A','a'],['d','A','a'],['a','6501','p']],
 patterns:[]
};

async function fixture(context,denyGPS=false,overrides={}){
 const page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.clock.install({time:now});
 await page.addInitScript(({data,origin,now,denyGPS})=>{
  window.fixture={data,now,requests:[],walking:[]};
  navigator.geolocation.getCurrentPosition=(success,error)=>{
   window.gpsCalls=(window.gpsCalls||0)+1;
   if(denyGPS)error({code:1});
   else success({timestamp:Date.now(),coords:{latitude:origin.lat,longitude:origin.lon,accuracy:10}});
  };
 },{data,origin,now,denyGPS});
 const patches={
  'network.js':"window.MMIReference.update=async()=>{throw Error('No metro fixture')}; window.MMIReference.read=async()=>null;",
  'mobility.js':"window.WenareMobility.load=async()=>({data:fixture.data,manifest:{catalogueVersion:3,qa:{modeLines:{rer:1,bus:1}},networkSha256:'fixture'}});",
  'opportunities.js':`window.WenareOpportunities.load=async()=>({
   manifest:{collectedAt:new Date(fixture.now).toISOString(),validUntilUtc:new Date(fixture.now+86400000).toISOString(),sources:{qa:{name:'Catalogue de recette',license:'Licence',licenseUrl:'https://example.com/'}}},
   items:{sport:[{id:'defense-sport',name:'Salle à La Défense',lat:48.892,lon:2.238,category:'sport',source:'qa'}]},errors:{}
  });`,
  'vector-basemap.js':"window.WenareVectorMap.attach=()=>{};",
  'walking.js':"window.WenareWalking.url=(start,end)=>{fixture.walking.push({start,end});return '/walking-fixture';};",
  'timetable.js':`window.WenareTimetable.loadMany=async(queries,_hash,_signal,_base,_group,options)=>{
   const rows=queries.map(query=>{
    const offsets=query.stopId==='p'?[5,15,25]:[10,20,23,45,82];
    const groups={[JSON.stringify([query.stopId,query.lineId,query.directionId])]:offsets.map((minute,index)=>[(fixture.now+minute*60000)/1000,'2026-11-19',query.stopId+index,1,query.stopId==='p'?'d':query.directionId,2])};
    const packet={schemaVersion:2,validFromUtc:'2026-11-19T00:00:00Z',validUntilUtc:'2026-11-20T00:00:00Z',groups};
    return {query,response:WenareTimetable.response(packet,query,Date.now(),true,{},'server',options)};
   });
   fixture.requests.push(queries.map(q=>q.stopId));
   if(queries.some(q=>q.stopId==='d')&&options.consultationTime===null)await new Promise(resolve=>setTimeout(resolve,350));
   return rows;
  };`,
  'trip-calls-loader.js':`window.WenareTripCallsLoader.createLoader=()=>({load:async event=>{
   const departureUtcMs=Date.parse(event.scheduledTimeUtc),arrivalUtcMs=fixture.now+20*60000;
   const onwardCalls=[
    {stopId:'d',name:'La Défense',stopSequence:2,arrivalUtcMs,departureUtcMs:arrivalUtcMs+60000},
    {stopId:'a',name:'Auber',stopSequence:3,arrivalUtcMs:null,departureUtcMs:null}
   ];
   return {complete:true,originCall:{name:'Poissy',departureUtcMs},onwardCalls,terminus:onwardCalls[1],validity:{until:'2026-11-20T00:00:00Z'},source:'Recette'};
  }});`
 };
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.origin!==new URL(base).origin)return route.abort();
  if(url.pathname==='/walking-fixture')return route.fulfill({status:503});
  const script=url.pathname.split('/').pop()||'index.html';
  if(Object.hasOwn(overrides,script))return route.fulfill({contentType:script.endsWith('.css')?'text/css':script.endsWith('.js')?'application/javascript':'text/html',body:overrides[script]});
  if(!patches[script])return route.continue();
  return route.fulfill({contentType:'application/javascript',body:fs.readFileSync(script,'utf8')+'\n'+patches[script]});
 });
 await page.goto(base);
 return {page,errors};
}

async function button(page,id,text){
 const control=page.locator(id).getByRole('button',{name:text,exact:true});
 await control.click();
}

module.exports={fixture,now,origin,defense,auber,arrival};
if(require.main===module)(async()=>{
 const browser=await ({chromium,webkit}[browserName]).launch({
  headless:true,...(process.env.MMI_EXECUTABLE?{executablePath:process.env.MMI_EXECUTABLE}:{})
 });
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block',reducedMotion:'reduce'});
  const {page,errors}=await fixture(context);
  page.setDefaultTimeout(10000);
  assert.equal(await page.getByRole('button',{name:'Bouger',exact:true}).getAttribute('aria-pressed'),'true');
  await page.locator('[data-radius="500"]').click();
  await page.getByRole('button',{name:/📍 Poissy/}).click();
  await page.getByRole('button',{name:/RER A.*voir les arrêts/}).click();
  assert.match(await page.locator('.trip-calls-stop').first().innerText(),/La Défense.*09:21/);
  await button(page,'#tripCallsDialog','Explorer Auber');
  assert.match(await page.locator('.teleport-dialog').innerText(),/Heure d’arrivée indisponible/);
  assert.equal(await page.locator('.teleport-dialog').getByRole('button',{name:/À l’arrivée/}).count(),0);
  await page.keyboard.press('Escape');
  await page.waitForFunction(()=>document.activeElement.getAttribute('aria-label')==='Explorer Auber');
  await button(page,'#tripCallsDialog','Explorer La Défense');
  await page.getByRole('button',{name:/À l’arrivée · 09:20/}).click();
  await page.waitForFunction(()=>document.activeElement.id==='nearbyOverview');
  assert.match(await page.locator('#wenareSituation').innerText(),/Il sera 09 h 20.*La Défense/);
  assert.equal(await page.evaluate(()=>WenareTeleportationUI.read().at),arrival);
  await page.getByRole('button',{name:/📍 La Défense/}).click();
  const departure=await page.locator('.departure-times').first().innerText();
  assert.match(departure,/09:20/);
  assert.match(departure,/09:23/);
  assert.doesNotMatch(departure,/09:10|10:22|dans \d+/);
  assert.equal(await page.locator('[data-radius="500"]').getAttribute('aria-pressed'),'true');
  await page.getByRole('button',{name:/Y aller à pied/}).first().click();
  await page.waitForFunction(()=>fixture.walking.length===1);
  const walk=await page.evaluate(()=>fixture.walking[0]);
  assert.deepEqual(walk.start,origin);
  assert.equal(walk.end.lat,defense.lat);
  await button(page,'#walkingDialog','Fermer le trajet piéton');
  await page.locator('[data-domain="sport"]').click();
  await page.locator('.opportunity-name').filter({hasText:'Salle à La Défense'}).waitFor();
  await page.getByRole('button',{name:'Ouvrir la carte des lieux'}).click();
  await page.locator('#placesDialog .teleport-exploration-pin').waitFor();
  await page.locator('#placesDialog .places-position').waitFor();
  await button(page,'#placesDialog','Retour à la liste');
  await page.locator('#openHabitualPlaces').click();
  await page.locator('#saveHabitualPlace').click();
  await page.locator('#habitualPlacesDialog').getByRole('button',{name:'Fermer',exact:true}).click();
  await page.locator('#returnToPosition').click();
  await page.getByRole('button',{name:/📍 Poissy/}).waitFor();
  assert.equal(await page.evaluate(()=>window.gpsCalls),2);
  await page.getByRole('button',{name:/📍 Poissy/}).click();
  await button(page,'#nearbyCards','Explorer Poissy');
  await page.waitForFunction(()=>document.activeElement.id==='nearbyOverview');
  assert.match(await page.locator('#wenareSituation').innerText(),/Poissy/);
  await page.reload();
  await page.getByRole('button',{name:'Lieux habituels'}).click();
  await button(page,'#habitualPlacesDialog','La Défense');
  await page.waitForFunction(()=>WenareTeleportationUI.read().destination?.label==='La Défense');
  assert.equal(await page.evaluate(()=>WenareTeleportationUI.read().at),null);
  await page.getByRole('button',{name:'Lieux habituels'}).click();
  await button(page,'#habitualPlacesDialog','Supprimer La Défense');
  assert.equal(await page.locator('#habitualPlacesDialog').getByRole('button',{name:'La Défense',exact:true}).count(),0);
  await page.keyboard.press('Escape');
  await page.waitForFunction(()=>document.activeElement.id==='openHabitualPlaces');
  await page.setViewportSize({width:320,height:740});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.deepEqual(errors,[]);
  await context.close();

  const denied=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
  const manual=await fixture(denied,true);
  await manual.page.getByText('Autorisez la localisation', {exact:false}).waitFor();
  await manual.page.getByRole('button',{name:'Ouvrir la carte des lieux'}).click();
  await button(manual.page,'#placesDialog','Sélectionner le centre de la carte');
  await button(manual.page,'#placesDialog','Explorer le point sélectionné');
  await manual.page.locator('#placesDialog .teleport-exploration-pin').waitFor();
  assert.equal(await manual.page.locator('#placesDialog .places-position').count(),0);
  assert.equal(await manual.page.evaluate(()=>WenareTeleportationUI.read().mode),'exploration');
  assert.deepEqual(manual.errors,[]);
  console.log(browserName+' TELEPORTATION_BROWSER_OK: RER fixture, projected hours, map, saved places, focus, GPS denial');
  await denied.close();
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

