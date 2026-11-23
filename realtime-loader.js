(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./realtime-core.js'):root.WenareRealtimeCore);if(typeof module==='object'&&module.exports)module.exports=api;else root.WenareRealtimeLoader=api;})(globalThis,function(core){'use strict';
const serviceKey=q=>JSON.stringify([q.stopId,q.lineId,q.directionId]);
function create({fetchImpl=fetch,mono=()=>performance.now(),wall=Date.now,configUrl='./departures-config.json'}={}){
 let configPromise=null,caps=null,capUntil=0,capPending=null,globalCooldown=0;const records=new Map(),pending=new Map();
 async function config(){if(!configPromise)configPromise=fetchImpl(configUrl,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error();return r.json()}).then(c=>{if(c?.schemaVersion!==1||c.realtime?.enabled!==true||c.realtime?.apiVersion!==2||typeof c.apiBase!=='string')return null;const url=new URL(c.apiBase);if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)throw new Error('INVALID_API_BASE');return url.origin;}).catch(()=>null);return configPromise;}
 async function capabilities(base,signal){if(caps&&wall()<capUntil)return caps;if(capPending)return capPending;capPending=(async()=>{const r=await fetchImpl(base+'/api/v2/capabilities',{cache:'no-store',signal});if(!r.ok)throw new Error('CAPABILITIES_UNAVAILABLE');const b=await r.json();if(b.schemaVersion!==2||!Array.isArray(b.services)||b.services.length>1000||!Array.isArray(b.generations))throw new Error('INVALID_CAPABILITIES');caps=b;capUntil=wall()+60000;return b;})().finally(()=>{capPending=null});return capPending;}
 async function read(query,{projected=false,signal}={}){
  if(projected)return null;const base=await config();if(!base||signal?.aborted)return null;const key=JSON.stringify(query),previous=records.get(key);
  if(wall()<globalCooldown||previous&&wall()<previous.refreshAt)return previous||null;
  if(pending.has(key))return pending.get(key);
  const request=(async()=>{try{const cap=await capabilities(base,signal);if(!cap.generations.includes(query.generationId)||!cap.services.some(s=>serviceKey(s)===serviceKey(query)&&['covered','partial'].includes(s.coverage)))return null;
   const start=mono(),r=await fetchImpl(base+'/api/v2/departures?'+new URLSearchParams(query),{cache:'no-store',signal});
   if(r.status===429){const raw=r.headers.get('Retry-After'),delay=/^\d+$/.test(raw||'')?Number(raw):Math.max(1,(Date.parse(raw)-wall())/1000);globalCooldown=wall()+Math.min(86400,Number.isFinite(delay)?Math.max(1,delay):60)*1000;throw new Error('RATE_LIMITED');}
   if(!r.ok)throw new Error('REALTIME_UNAVAILABLE');const body=core.validateResponse(await r.json(),query),elapsed=mono()-start;
   if(elapsed<0||elapsed>10000)throw new Error('CLOCK_UNCERTAIN');
   const record={body,clock:{server:Date.parse(body.serverTimeUtc)+elapsed/2,mono:mono(),wall:wall()},refreshAt:wall()+body.nextRefreshAfterSeconds*1000};records.set(key,record);return record;
  }catch(error){if(signal?.aborted)throw error;if(previous){previous.refreshAt=wall()+60000;return previous;}records.set(key,{body:null,clock:null,refreshAt:wall()+60000});return null;}})().finally(()=>pending.delete(key));pending.set(key,request);return request;
 }
 return {read,clear(){records.clear();caps=null;capUntil=0;},config};
}
return {create,serviceKey};
});
