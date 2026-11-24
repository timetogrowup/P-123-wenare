const test=require('node:test'),assert=require('node:assert/strict'),rt=require('../realtime-core.js'),{create}=require('../realtime-loader.js');
const now=Date.parse('2026-11-23T18:00:00Z'),iso=n=>new Date(n).toISOString(),generationId='gen-fixture';
const theory=(minutes=4)=>({id:'visit',lineId:'line',stopId:'stop',directionId:'destination',serviceDate:'2026-11-23',tripRef:'0123456789abcdef',stopSequence:8,scheduledTimeUtc:iso(now+minutes*60000),quality:'timetable',status:'scheduled'});
const live=(minutes=3)=>({id:'provider-visit',lineId:'line',stopId:'stop',directionId:'destination',binding:{status:'matched',generationId,lineId:'line',stopId:'stop',serviceDate:'2026-11-23',tripRef:'0123456789abcdef',stopSequence:8},sourceRecordedAtUtc:iso(now-10000),validUntilUtc:iso(now+110000),expectedTimeUtc:iso(now+minutes*60000),quality:'real_time',status:'estimated'});
const options={now,generationId};
const query={stopId:'stop',lineId:'line',directionId:'destination',generationId};
const body=()=>({schemaVersion:2,query:{...query},serverTimeUtc:iso(now),coverage:{status:'covered'},serviceStatus:'available',departures:[live()],cancellations:[],cancellationSnapshot:{complete:true},nextRefreshAfterSeconds:30});
test('RT16 threshold before rounding: 299 vs 300/301 seconds',()=>{for(const [seconds,expected]of [[299,'realtime'],[300,'none'],[301,'none']]){assert.equal(rt.pair({...theory(),scheduledTimeUtc:iso(now+seconds*1000)},null,options).animation,'none');assert.equal(rt.pair(theory(),{...live(),expectedTimeUtc:iso(now+seconds*1000)},options).animation,expected==='none'?'none':'realtime');}});
test('RT17/18 real present suppresses theory animation independently of the two delays',()=>{const a=rt.pair(theory(2),live(8),options);assert.equal(a.animation,'none');assert.equal(a.theoreticalLabel,'2′');assert.equal(a.realtimeLabel,'8′');assert.equal(rt.pair(theory(8),live(2),options).animation,'realtime');});
test('RT11/19 expiration turns rectangle pale and recomputes theory without a fetch',()=>{const event={...live(),validUntilUtc:iso(now)};const p=rt.pair(theory(2),event,options);assert.equal(p.rectangleState,'empty');assert.equal(p.realtimeLabel,'');assert.equal(p.animation,'none');assert.equal(rt.pair(theory(),live(),{...options,now:now+120000}).real,false);});
test('RT04/05/03 wrong branch, loop visit or generation never fills rectangle',()=>{for(const replacement of [{stopSequence:9},{tripRef:'other'},{generationId:'wrong'},{stopId:'other'},{lineId:'other'}])assert.equal(rt.pair(theory(),{...live(),binding:{...live().binding,...replacement}},options).real,false);});
test('RT06 delayed departure retains immutable scheduled time after scheduled departure',()=>{const t=theory(-4),p=rt.pair(t,live(3),options);assert.equal(p.active,true);assert.equal(p.real,true);assert.equal(p.theoreticalLabel,'18:56');assert.equal(p.realtimeLabel,'3′');assert.equal(t.scheduledTimeUtc,iso(now-240000));});
test('RT07 resolve a delayed visit absent from first theoretical departures before final selection',()=>{const past=theory(-4),list=rt.merge([theory(20)],body(),options,b=>b.stopSequence===8?past:null);assert.equal(list.length,1);assert.equal(list[0].view.time,now+180000);});
test('RT12 latest observation replaces same visit, never earliest obsolete ETA',()=>{const early={...live(1),sourceRecordedAtUtc:iso(now-20000)},late=live(8),list=rt.merge([theory()],{departures:[late,early],cancellations:[]},options);assert.equal(list.length,1);assert.equal(list[0].view.time,now+480000);});
test('RT13 suppressed visits do not become active theoretical fallback',()=>{const cancel={...live(),status:'cancelled'};const result=rt.merge([theory()],{departures:[],cancellations:[cancel]},options);assert.equal(result[0].view.active,false);assert.equal(result[0].view.rectangleState,'empty');assert.equal(result[0].view.animation,'none');});
test('RT21 projection remains theoretical even if clock date is close to now',()=>{const p=rt.pair(theory(),live(),{...options,projected:true,consultationTime:now});assert.equal(p.real,false);assert.equal(p.animation,'none');assert.equal(p.theoreticalLabel,'19:04');});
test('RT26 reduced motion and explicit at-stop do not imply countdown animation',()=>{assert.equal(rt.pair(theory(),live(),{...options,motionReduced:true}).animation,'none');const p=rt.pair(theory(),{...live(),status:'at_stop',expectedTimeUtc:iso(now-1000)},options);assert.equal(p.animation,'none');assert.equal(p.realtimeLabel,'<1′');assert.equal(p.active,true);});
test('RT10 unknown clock, plan-only, missing timestamp and no boarding do not qualify RT',()=>{assert.equal(rt.pair(theory(),live(),{...options,clockTrusted:false}).real,false);for(const extra of [{quality:'timetable'},{sourceRecordedAtUtc:null},{boardingAllowed:false},{sourceRecordedAtUtc:iso(now+16000)}])assert.equal(rt.pair(theory(),{...live(),...extra},options).real,false);});
test('RT02 strict client response rejects duplicate or cross-service data',()=>{assert.equal(rt.validateResponse(body(),query).schemaVersion,2);for(const change of [b=>b.query.generationId='wrong',b=>b.departures.push(b.departures[0]),b=>b.departures[0].lineId='wrong',b=>b.nextRefreshAfterSeconds=0]){const b=body();change(b);assert.throws(()=>rt.validateResponse(b,query));}});
test('RT25 disabled config and projected context cause no provider or capabilities request',async()=>{let n=0;const loader=create({fetchImpl:async()=>{n++;return Response.json({schemaVersion:1,apiBase:null})}});assert.equal(await loader.read(query,{projected:true}),null);assert.equal(n,0);assert.equal(await loader.read(query),null);assert.equal(n,1);});
test('RT14 loader coalesces visits and obeys successful refresh schedule',async()=>{let n=0,clock=now;const loader=create({wall:()=>clock,mono:()=>clock,fetchImpl:async url=>{n++;if(url.includes('config'))return Response.json({schemaVersion:1,apiBase:'https://api.example',realtime:{enabled:true,apiVersion:2}});if(url.endsWith('capabilities'))return Response.json({schemaVersion:2,generations:[generationId],services:[{...query,coverage:'covered'}]});return Response.json(body());}});const records=await Promise.all([loader.read(query),loader.read(query)]);assert.ok(records.every(r=>r.body));assert.equal(n,3);await loader.read(query);assert.equal(n,3);clock+=30001;await loader.read(query);assert.equal(n,4);});
test('RT15 manual reload respects server cooldown across services',async()=>{let n=0,clock=now;const loader=create({wall:()=>clock,mono:()=>clock,fetchImpl:async url=>{n++;if(url.includes('config'))return Response.json({schemaVersion:1,apiBase:'https://api.example',realtime:{enabled:true,apiVersion:2}});if(url.endsWith('capabilities'))return Response.json({schemaVersion:2,generations:[generationId],services:[{...query,coverage:'covered'}]});return new Response('',{status:429,headers:{'Retry-After':'120'}});}});await loader.read(query);assert.equal(n,3);await loader.read(query);assert.equal(n,3);clock+=60000;await loader.read(query);assert.equal(n,3);});

test('RT07 timetable resolves an identified past visit before its future filter',()=>{const tt=require('../timetable.js'),q={stopId:'stop',lineId:'line',directionId:'destination'},key=JSON.stringify(['stop','line','destination']),data={schemaVersion:1,lineId:'line',validFromUtc:iso(now-3600000),validUntilUtc:iso(now+86400000),groups:{[key]:[[now/1000-240,'2026-11-23','0123456789abcdef',8],[now/1000+900,'2026-11-23','fedcba9876543210',9]]}};const response=tt.response(data,q,now,false,{generationId});assert.equal(response.departures.length,1);const t=response.resolveVisit({...live().binding,lineId:'line',stopId:'stop'});assert.equal(t.scheduledTimeUtc,iso(now-240000));assert.equal(response.resolveVisit({...live().binding,lineId:'line',stopId:'stop',generationId:'wrong'}),null);});

test('RT26 explicit fresh at-stop remains visible in nearby selection after ETA',()=>{const nearby=require('../nearby.js'),v=rt.pair(theory(),{...live(),status:'at_stop',expectedTimeUtc:iso(now-1000)},options);assert.equal(nearby.imminent(v,now),true);assert.equal(v.animation,'none');});
test('RT11/19 expired or unusable at-stop restores theoretical imminence',()=>{for(const extra of [{validUntilUtc:iso(now)},{quality:'stale'},{sourceRecordedAtUtc:null},{binding:{...live().binding,generationId:'other'}}]){const p=rt.pair(theory(2),{...live(),status:'at_stop',...extra},options);assert.equal(p.real,false);assert.equal(p.rectangleState,'empty');assert.equal(p.realtimeLabel,'');assert.equal(p.active,true);assert.equal(p.animation,'none');}});

test('regional discovery batches visible services and reuses decisions within the minute',async()=>{
 const batches=[],departures=[];
 const loader=create({wall:()=>now,mono:()=>0,fetchImpl:async(url,init)=>{
  if(url.includes('config.json'))return Response.json({schemaVersion:1,apiBase:'https://api.example',realtime:{enabled:true,apiVersion:2,capabilityQuery:true}});
  if(url.endsWith('/capabilities/query')){
   const request=JSON.parse(init.body);batches.push(request);
   return Response.json({schemaVersion:2,registryVersion:'fixture',generationId,services:request.services.map(s=>({...s,coverage:s.stopId===query.stopId?'covered':'unknown'}))});
  }
  departures.push(url);return Response.json(body());
 }});
 const queries=[query,...Array.from({length:35},(_,i)=>({...query,stopId:'other-'+i}))];
 await loader.config();await loader.prepare([...queries,query]);
 assert.deepEqual(batches.map(b=>b.services.length),[32,4]);
 await loader.read(query);await loader.read(queries[1]);await loader.prepare(queries);
 assert.equal(batches.length,2);assert.equal(departures.length,1);
 assert.ok(departures[0].includes('/departures?'));
});

test('regional discovery accepts a compatible legacy server and fails closed on a malformed response',async()=>{
 for(const fallback of [true,false]){
  let trips=0;const loader=create({wall:()=>now,mono:()=>0,fetchImpl:async url=>{
   if(url.includes('config.json'))return Response.json({schemaVersion:1,apiBase:'https://api.example',realtime:{enabled:true,apiVersion:2,capabilityQuery:true}});
   if(url.endsWith('/query'))return fallback?new Response('',{status:404}):Response.json({schemaVersion:2,generationId:'other',services:[]});
   if(url.endsWith('/capabilities'))return Response.json({schemaVersion:2,generations:[generationId],services:[{...query,coverage:'covered'}]});
   trips++;return Response.json(body());
  }});
  await loader.read(query);assert.equal(trips,fallback?1:0);
 }
});

test('scoped discovery keeps the remaining reader and skips departures after all readers leave', async () => {
  for (const keepSecond of [true,false]) {
    let signalStarted, release;
    const started = new Promise(resolve => {signalStarted=resolve;});
    const gate = new Promise(resolve => {release=resolve;});
    let discoveries=0, departures=0;
    const loader=create({fetchImpl:async url=>{
      if(url.endsWith('departures-config.json')) return Response.json({schemaVersion:1,apiBase:'https://fixture.example',realtime:{enabled:true,apiVersion:2,capabilityQuery:true}});
      if(url.endsWith('/capabilities/query')){
        discoveries++;
        signalStarted();
        await gate;
        return Response.json({schemaVersion:2,generationId,registryVersion:'fixture',services:[{...query,coverage:'covered'}]});
      }
      assert.ok(url.includes('/api/v2/departures?'));
      departures++;
      return Response.json(body());
    }});
    const first=new AbortController(), second=new AbortController();
    const one=loader.read(query,{signal:first.signal});
    await started;
    const two=loader.read(query,{signal:second.signal});
    await new Promise(resolve=>setImmediate(resolve));
    first.abort();
    await assert.rejects(one,/ABORTED/);
    if(!keepSecond){second.abort();await assert.rejects(two,/ABORTED/);}
    release();
    if(keepSecond) assert.equal((await two)?.body?.departures.length,1);
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(discoveries,1);
    assert.equal(departures,keepSecond?1:0);
  }
});
