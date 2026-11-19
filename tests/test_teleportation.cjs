const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const teleport=require('../teleportation.js');
const timetable=require('../timetable.js');

const poissy={lat:48.933,lon:2.041,label:'Poissy',stationId:'poissy'};
const defense={lat:48.892,lon:2.238,label:'La Défense',stationId:'defense'};

test('destinations and time are validated and transitions supersede older revisions',()=>{
 const state=teleport.createState(),at=Date.parse('2026-11-19T09:00:00Z');
 assert.equal(state.read().mode,'gps');
 assert.equal(state.explore({...poissy,lat:91}),false);
 assert.equal(state.explore(poissy,NaN),false);
 assert.equal(state.explore(poissy,at),true);
 const captured=state.read();
 captured.destination.lat=0;
 assert.equal(state.read().destination.lat,poissy.lat);
 state.explore(defense);
 assert.equal(state.read().at,null);
 assert.ok(state.read().revision>captured.revision);
 state.reset();
 assert.deepEqual(state.read(),{mode:'gps',at:null,destination:null,revision:3});
});

test('course locations resolve by platform, then by its explicit parent, never by name',()=>{
 const stops=new Map([['station',{id:'station',lat:48.9,lon:2.2}],['platform',{id:'other',lat:48.8,lon:2.1}]]);
 assert.equal(teleport.resolveStop({stopId:'platform',parent:'station',name:'Centre'},stops).stationId,'other');
 assert.equal(teleport.resolveStop({stopId:'missing',parent:'station',name:'Centre'},stops).stationId,'station');
 assert.equal(teleport.resolveStop({stopId:'missing',name:'Centre'},stops),null);
});

test('favorites deduplicate, survive reload and remain available when storage fails',()=>{
 let saved;
 const store=()=>({getItem:()=>saved,setItem:(_key,value)=>{saved=value;}});
 const favorites=teleport.createFavorites(store);
 favorites.add(poissy);
 favorites.add({...poissy,lat:48.934});
 assert.equal(favorites.read().length,1);
 const restored=teleport.createFavorites(store);
 assert.equal(restored.read()[0].label,'Poissy');
 restored.remove(restored.read()[0].id);
 assert.deepEqual(teleport.createFavorites(store).read(),[]);
 const blocked=teleport.createFavorites(()=>{throw Error('Storage unavailable');});
 assert.equal(blocked.add(poissy),false);
 assert.equal(blocked.read()[0].label,'Poissy');
});

const now=Date.parse('2026-11-19T19:00Z'),at=Date.parse('2026-11-19T23:30Z');
const query={stopId:'quay',lineId:'A',directionId:'terminal'};
function packageUntil(until){
 const offsets=[-30,-25,-20,-10,-5,0,5,59,60,61];
 return {validFromUtc:'2026-11-19T00:00Z',validUntilUtc:until,schemaVersion:2,groups:{
  [JSON.stringify([query.stopId,query.lineId,query.directionId])]:offsets.map((minute,i)=>[
   (at+minute*60000)/1000,'2026-11-19',String(i),1,'next',2
  ])
 }};
}

test('projection includes the lower bound and filters before applying limits',()=>{
 const data=packageUntil('2026-11-21T00:00Z');
 const view=timetable.response(data,query,now,true,{},'server',{consultationTime:at});
 assert.deepEqual(view.departures.map(event=>event.tripRef),['5','6','7']);
 assert.deepEqual(view.tripChoices.map(event=>event.tripRef),['2','3','4','5','6','7','8','9']);
 assert.equal(view.departures[0].clockAnchor.server,now);
 assert.equal(view.departures[0].consultationTime,at);
 assert.equal(timetable.response(data,query,at,true).departures[0].tripRef,'6');
});

test('projected coverage is clipped, while freshness remains bound to real time',()=>{
 const data=packageUntil('2026-11-19T23:36Z');
 const view=timetable.response(data,query,now,true,null,'server',{consultationTime:at});
 assert.deepEqual(view.departures.map(event=>event.tripRef),['5','6']);
 assert.equal(view.projectionLimit,Date.parse(data.validUntilUtc));
 assert.throws(()=>timetable.response(data,query,now,true,null,'server',{consultationTime:view.projectionLimit}),
  {code:'projection_outside_coverage'});
 assert.throws(()=>timetable.response(data,query,view.projectionLimit,true,null,'server',{consultationTime:at}),/expirés/);
});

test('display uses Paris dates at midnight and Paris offsets across the clock change',()=>{
 assert.equal(teleport.time(at,now),'20/11/2026 à 00:30');
 const october=Date.parse('2026-10-25T00:00Z');
 assert.equal(teleport.time(october+30*60000,october),'02:30');
 assert.equal(teleport.time(october+90*60000,october),'02:30');
 assert.equal(teleport.time(october+150*60000,october),'03:30');
});

test('the new shell caches all versioned scripts and styles referenced by the page',async()=>{
 let installer,files,work;
 const self={addEventListener(name,handler){if(name==='install')installer=handler;}};
 const caches={open:async()=>({addAll:async assets=>{files=assets;}})};
 vm.runInNewContext(fs.readFileSync('sw.js','utf8'),{self,caches});
 installer({waitUntil(promise){work=promise;}});
 await work;
 const html=fs.readFileSync('index.html','utf8');
 for(const [,asset] of html.matchAll(/(?:src|href)="([^"]+\.(?:js|css)\?v=\d+)"/g)){
  assert.ok(files.includes('./'+asset),asset+' is available offline');
 }
 for(const name of ['teleportation.js','teleportation-ui.js','teleportation.css']){
  assert.ok(files.some(asset=>asset.startsWith('./'+name+'?v=')));
 }
});
