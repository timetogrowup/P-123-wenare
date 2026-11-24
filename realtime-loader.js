(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./realtime-core.js'):root.WenareRealtimeCore);if(typeof module==='object'&&module.exports)module.exports=api;else root.WenareRealtimeLoader=api;})(globalThis,function(core){'use strict';
const serviceKey=q=>JSON.stringify([q.stopId,q.lineId,q.directionId]);
const queryKey=q=>JSON.stringify([q.stopId,q.lineId,q.directionId,q.generationId]);
function create({fetchImpl=fetch,mono=()=>performance.now(),wall=Date.now,configUrl='./departures-config.json',timeoutMs=10000,setTimer=setTimeout,clearTimer=clearTimeout}={}){
 let configValue=null,configUntil=-Infinity,configPending=null,signature=null,epoch=0,caps=null,capUntil=0,capPending=null,globalCooldown=0;
 let discoveryBase=null,scoped=false;const decisions=new Map();
 const records=new Map(),pending=new Map(),known=new Map();
 async function json(url,init={}){const controller=new AbortController(),timer=setTimer(()=>controller.abort(),timeoutMs);try{const response=await fetchImpl(url,{...init,cache:'no-store',signal:controller.signal});return {response,body:response.ok?await response.json():null};}finally{clearTimer(timer);}}
 function put(key,record){records.delete(key);records.set(key,record);if(records.size>512)records.delete(records.keys().next().value);}
 function present(record){return record&&(record.body||record.blocked)?record:null;}
 function safe(query,record,{retire=false,reason=null}={}){
  const saved=known.get(serviceKey(query));
  if(saved&&saved.generationId!==query.generationId)return {...record,body:null,clock:null,blocked:true,reason:'CANCELLATION_GENERATION_UNRECONCILED'};
  let body=record?.body||saved?.body||null;
  if(body&&(retire||saved))body={...body,...(retire?{departures:[],serviceStatus:'unavailable',coverage:{status:'unknown'}}:{}),...(saved?{cancellations:saved.body.cancellations}:{})};
  return {...record,body,clock:record?.clock||saved?.clock||null,blocked:record?.blocked===true,reason:reason||record?.reason||null};
 }
 async function config({force=false}={}){
  if(configPending)return configPending;if(!force&&mono()<configUntil)return configValue;
  configPending=(async()=>{let value=null,batch=false,observationBase=null;try{const {response,body:c}=await json(configUrl);if(response.ok && c?.schemaVersion===1 && c.realtime?.apiVersion===2 && c.realtime.enabled===false &&
      c.apiBase===null && c.realtime.discoveryBase==='https://wenare-passages.onrender.com') {
     observationBase=c.realtime.discoveryBase;
   }
   if(response.ok&&c?.schemaVersion===1&&c.realtime?.enabled===true&&c.realtime?.apiVersion===2&&typeof c.apiBase==='string'){const url=new URL(c.apiBase);if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/')throw new Error('INVALID_API_BASE');{value=url.origin;batch=c.realtime.capabilityQuery===true;}}}catch{}
   const next=JSON.stringify([value,batch,observationBase]);scoped=batch||Boolean(observationBase);discoveryBase=observationBase;if(next!==signature){epoch++;decisions.clear();caps=null;capUntil=0;signature=next;}
   configValue=value;configUntil=mono()+60000;return value;
  })().finally(()=>{configPending=null;});return configPending;
 }
 async function capabilities(base){
  if(caps&&mono()<capUntil)return caps;if(capPending)return capPending;const mine=epoch;
  capPending=(async()=>{const {response,body:b}=await json(base+'/api/v2/capabilities');if(!response.ok||b?.schemaVersion!==2||!Array.isArray(b.services)||b.services.length>1000||!Array.isArray(b.generations)||b.generations.length>2||b.generations.some(g=>typeof g!=='string'))throw new Error('INVALID_CAPABILITIES');
   if(mine!==epoch)throw new Error('CONFIG_CHANGED');caps=b;capUntil=mono()+60000;return b;
  })().finally(()=>{capPending=null;});return capPending;
 }
 async function prepare(queries,signal){
  if(!scoped||!(configValue||discoveryBase)||signal?.aborted)return;
  const mine=epoch,base=configValue||discoveryBase,groups=new Map();
  for(const q of queries){
   if((decisions.get(queryKey(q))?.until??0)>mono())continue;
   if(!groups.has(q.generationId))groups.set(q.generationId,new Map());
   groups.get(q.generationId).set(serviceKey(q),q);
  }
  for(const [generationId,group] of groups){
   const values=[...group.values()];
   for(let i=0;i<values.length;i+=32){
    if(signal?.aborted||mine!==epoch)return;
    const batch=values.slice(i,i+32),services=batch.map(({stopId,lineId,directionId})=>({stopId,lineId,directionId}));
    let allowed=new Set();
    try{
     const {response,body}=await json(base+'/api/v2/capabilities/query',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({generationId,services})});
     if(configValue && (response.status===404||response.status===405)){
      const legacy=await capabilities(base);
      if(legacy.generations.includes(generationId))allowed=new Set(legacy.services.filter(s=>['covered','partial'].includes(s.coverage)).map(serviceKey));
     }else if(response.ok&&body?.schemaVersion===2&&body.generationId===generationId&&typeof body.registryVersion==='string'&&Array.isArray(body.services)&&body.services.length===batch.length){
      const keys=new Set(body.services.map(serviceKey));
      if(keys.size===batch.length&&batch.every(q=>keys.has(serviceKey(q))))allowed=new Set(body.services.filter(s=>['covered','partial'].includes(s.coverage)).map(serviceKey));
     }
    }catch{/* A failed discovery leaves every affected service theoretical. */}
    if(signal?.aborted||mine!==epoch)return;
    for(const q of batch){
     const key=queryKey(q);decisions.delete(key);
     decisions.set(key,{allowed:allowed.has(serviceKey(q)),until:mono()+60000});
     if(decisions.size>512)decisions.delete(decisions.keys().next().value);
    }
   }
  }
 }
 function waitFor(promise,signal){if(!signal)return promise;if(signal.aborted)return Promise.reject(new Error('ABORTED'));return new Promise((resolve,reject)=>{const abort=()=>{cleanup();reject(new Error('ABORTED'));},cleanup=()=>signal.removeEventListener('abort',abort);signal.addEventListener('abort',abort,{once:true});promise.then(value=>{cleanup();resolve(value);},error=>{cleanup();reject(error);});});}
 function join(entry,signal){entry.readers++;return waitFor(entry.promise,signal).finally(()=>{entry.readers--;});}
 async function read(query,{projected=false,signal}={}){
  if(projected)return null;if(signal?.aborted)throw new Error('ABORTED');
  const key=queryKey(query),previous=records.get(key);
  if(mono()<globalCooldown)return present(safe(query,previous,{retire:configValue===null}));
  const base=await config();
  if(signal?.aborted)throw new Error('ABORTED');
  if(!base){const r=safe(query,previous,{retire:true,reason:'REALTIME_DISABLED'});r.refreshMono=mono()+60000;put(key,r);return present(r);}
  if(previous&&mono()<previous.refreshMono&&previous.epoch===epoch)return present(safe(query,previous));
  if(pending.has(key))return join(pending.get(key),signal);
  const mine=epoch,entry={readers:0},request=(async()=>{try{
   let eligible;
   if(scoped){await prepare([query]);eligible=decisions.get(key)?.allowed===true;}
   else{const cap=await capabilities(base);eligible=cap.generations.includes(query.generationId)&&cap.services.some(s=>serviceKey(s)===serviceKey(query)&&['covered','partial'].includes(s.coverage));}
   if(!entry.readers)throw new Error('NO_ACTIVE_READERS');
   if(!eligible){const r=safe(query,null,{retire:true,reason:'NOT_QUALIFIED'});r.refreshMono=mono()+60000;r.epoch=mine;put(key,r);return present(r);}
   const start=mono(),{response:r,body:raw}=await json(base+'/api/v2/departures?'+new URLSearchParams(query));
   if(r.status===429){const retry=r.headers.get('Retry-After'),date=Date.parse(r.headers.get('Date')),reference=Number.isFinite(date)?date:previous?.clock?previous.clock.server+mono()-previous.clock.mono:wall();const delay=/^\d+$/.test(retry||'')?Number(retry):(Date.parse(retry)-reference)/1000;globalCooldown=mono()+Math.min(86400,Number.isFinite(delay)?Math.max(1,delay):60)*1000;throw new Error('RATE_LIMITED');}
   if(!r.ok){if(r.status===409){caps=null;capUntil=0;}throw new Error('REALTIME_UNAVAILABLE');}
   const body=core.validateResponse(raw,query),elapsed=mono()-start;if(elapsed<0||elapsed>10000)throw new Error('CLOCK_UNCERTAIN');if(mine!==epoch)throw new Error('CONFIG_CHANGED');
   const record={body,clock:{server:Date.parse(body.serverTimeUtc)+elapsed/2,mono:mono(),wall:wall()},refreshMono:mono()+body.nextRefreshAfterSeconds*1000,refreshAt:wall()+body.nextRefreshAfterSeconds*1000,epoch:mine};
   const saved=known.get(serviceKey(query)),at=Date.parse(body.serverTimeUtc);
   if(!saved||at>Date.parse(saved.body.serverTimeUtc)){
    if(body.cancellations.length){if(known.size>=128&&!saved){const blocked={...record,body:null,blocked:true,reason:'CANCELLATION_CAPACITY_LIMIT'};put(key,blocked);return blocked;}known.set(serviceKey(query),{generationId:query.generationId,body:{...body,departures:[]},clock:record.clock});}
    else known.delete(serviceKey(query));
   }
   const safeRecord=safe(query,record);put(key,safeRecord);return present(safeRecord);
  }catch(error){if(error.message==='NO_ACTIVE_READERS')return present(previous);const record=safe(query,previous,{retire:mine!==epoch,reason:error.message});record.refreshMono=Math.max(globalCooldown,mono()+60000);record.epoch=epoch;put(key,record);return present(record);}})().finally(()=>pending.delete(key));
  entry.promise=request;pending.set(key,entry);return join(entry,signal);
 }
 return {read,config,prepare,configDelay:()=>Math.max(0,configUntil-mono()),nextDelay:query=>Math.max(0,Math.max(globalCooldown,records.get(queryKey(query))?.refreshMono||mono())-mono()),invalidateConfig(){configUntil=-Infinity;},clear(){decisions.clear();for(const [key,record]of records)if(record.blocked)record.refreshMono=0;else records.delete(key);caps=null;capUntil=0;configUntil=-Infinity;}};
}
function createScheduler({loader,onRecord,isActive=()=>true,mono=()=>performance.now(),setTimer=setTimeout,clearTimer=clearTimeout}={}){
 let targets=[],revision=null,signature=null,timer=null,pending=false,epoch=0,rerun=false,controller=null;
 function arm(delay){clearTimer(timer);timer=null;if(targets.length&&isActive())timer=setTimer(run,Math.max(1,delay));}
 async function run(){timer=null;if(pending){rerun=true;return;}if(!targets.length||!isActive())return;pending=true;controller=new AbortController();const signal=controller.signal,mine=epoch,current=targets,version=revision;
  try{if(loader.configDelay()<=0)await loader.config();if(mine===epoch&&isActive())await loader.prepare?.(current,signal);let cursor=0;async function worker(){while(cursor<current.length&&mine===epoch&&isActive()){const query=current[cursor++],record=await loader.read(query,{signal}).catch(()=>null);if(mine===epoch&&isActive())onRecord(query,record,version);}}await Promise.all([worker(),worker()]);}
  finally{pending=false;if(rerun){rerun=false;arm(0);}else if(mine===epoch&&isActive()&&targets.length)arm(Math.min(loader.configDelay(),...targets.map(q=>loader.nextDelay(q))));}
 }
 return {update(queries,{revision:next=null}={}){const unique=[...new Map(queries.map(q=>[queryKey(q),q])).values()],sig=JSON.stringify([next,unique.map(queryKey)]);if(sig===signature&&targets.length)return;epoch++;controller?.abort();signature=sig;targets=unique;revision=next;if(pending)rerun=true;arm(0);},stop(){epoch++;controller?.abort();targets=[];signature=null;clearTimer(timer);timer=null;},wake(){loader.invalidateConfig();epoch++;controller?.abort();if(pending)rerun=true;arm(0);},run};
}
return {create,createScheduler,serviceKey};
});
