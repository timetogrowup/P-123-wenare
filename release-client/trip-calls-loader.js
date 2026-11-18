(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./trip-calls-core.js'));else root.WenareTripCallsLoader=factory(root.WenareTripCalls);})(typeof globalThis!=='undefined'?globalThis:this,function(core){'use strict';
const LIMIT=1048576,DISK_LIMIT=25*LIMIT,MEMORY_LIMIT=15*LIMIT;
const failure=code=>new core.TripCallsError(code);
function openDb(){return new Promise((resolve,reject)=>{const r=indexedDB.open('wenare-trip-calls-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('files');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function diskGet(key){const db=await openDb();try{return await new Promise((resolve,reject)=>{const r=db.transaction('files').objectStore('files').get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}finally{db.close();}}
async function diskPut(key,record){const db=await openDb();try{await new Promise((resolve,reject)=>{const t=db.transaction('files','readwrite'),s=t.objectStore('files');s.put({...record,accessed:Date.now()},key);const r=s.openCursor();let entries=[],total=0;r.onsuccess=()=>{const c=r.result;if(c){entries.push({key:c.key,size:c.value.bytes.byteLength,accessed:c.value.accessed});total+=c.value.bytes.byteLength;c.continue();}else for(const e of entries.sort((a,b)=>a.accessed-b.accessed)){if(total<=DISK_LIMIT)break;if(e.key!==key){s.delete(e.key);total-=e.size;}}};t.oncomplete=resolve;t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error);});}finally{db.close();}}
function createLoader(options={}){
 const fetcher=options.fetch||globalThis.fetch.bind(globalThis),base=options.baseUrl||(typeof document!=='undefined'?new URL('./distribution/',document.baseURI).href:'https://wenare.invalid/distribution/');
 const memory=new Map(),pending=new Map();let memorySize=0;
 function path(entry,generation,limit){if(!entry||!Number.isSafeInteger(entry.bytes)||entry.bytes<=0||entry.bytes>limit||!/^[a-f0-9]{64}$/.test(entry.sha256)||typeof entry.file!=='string'||!entry.file.startsWith('trip-calls/'+generation+'/')||!/^[A-Za-z0-9_./-]+$/.test(entry.file)||entry.file.split('/').some(s=>s==='..'||s==='.'||!s))throw failure('corrupt');const u=new URL(entry.file,base);if(u.origin!==new URL(base).origin||!u.href.startsWith(base))throw failure('corrupt');return u.href;}
 async function decode(bytes,entry){if(bytes.byteLength!==entry.bytes)throw failure('corrupt');const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');if(hash!==entry.sha256)throw failure('corrupt');let decoded=bytes;if(entry.encoding){if(entry.encoding!=='gzip-json'||!Number.isSafeInteger(entry.decodedBytes)||entry.decodedBytes<=0||entry.decodedBytes>LIMIT)throw failure('corrupt');if(typeof DecompressionStream!=='function')throw failure('unavailable');const reader=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')).getReader(),parts=[];let size=0;for(;;){const n=await reader.read();if(n.done)break;size+=n.value.byteLength;if(size>entry.decodedBytes){await reader.cancel();throw failure('corrupt');}parts.push(n.value);}if(size!==entry.decodedBytes)throw failure('corrupt');const joined=new Uint8Array(size);let offset=0;for(const part of parts){joined.set(part,offset);offset+=part.byteLength;}decoded=joined.buffer;}try{return JSON.parse(new TextDecoder().decode(decoded));}catch{throw failure('corrupt');}}
 function remember(key,bytes){if(memory.has(key)){memorySize-=memory.get(key).byteLength;memory.delete(key);}memory.set(key,bytes);memorySize+=bytes.byteLength;while(memorySize>MEMORY_LIMIT){const oldest=memory.keys().next().value;memorySize-=memory.get(oldest).byteLength;memory.delete(oldest);}}
 async function acquire(entry,generation,limit,signal){
  const url=path(entry,generation,limit),key=generation+'|'+entry.file+'|'+entry.sha256;
  if(signal?.aborted)throw new DOMException('Aborted','AbortError');
  const cached=memory.get(key);if(cached){remember(key,cached);return decode(cached,entry);}
  let request=pending.get(key);
  if(!request){
   const control=new AbortController();request={users:0,control};
   request.promise=(async()=>{let bytes;
    try{const stored=options.storage===false?null:await diskGet(key).catch(()=>null);if(stored){try{await decode(stored.bytes,entry);remember(key,stored.bytes);diskPut(key,stored).catch(()=>{});return stored.bytes;}catch{/* A damaged local copy must not prevent a network repair. */}}
     const timer=setTimeout(()=>control.abort(),options.timeoutMs||10000);
     try{const response=await fetcher(url,{cache:'no-store',signal:control.signal});if(!response.ok)throw failure('network_error');
      if(response.body?.getReader){const reader=response.body.getReader(),parts=[];let size=0;for(;;){const next=await reader.read();if(next.done)break;size+=next.value.byteLength;if(size>entry.bytes||size>limit){await reader.cancel();throw failure('corrupt');}parts.push(next.value);}const joined=new Uint8Array(size);let offset=0;for(const part of parts){joined.set(part,offset);offset+=part.byteLength;}bytes=joined.buffer;}
      else{bytes=await response.arrayBuffer();if(bytes.byteLength>limit)throw failure('corrupt');}
     }finally{clearTimeout(timer);}
     await decode(bytes,entry);remember(key,bytes);if(options.storage!==false)diskPut(key,{bytes}).catch(()=>{});return bytes;
    }catch(e){if(e.code==='corrupt'||e.code==='unavailable')throw e;if(control.signal.aborted)throw failure('network_error');throw failure(typeof navigator!=='undefined'&&navigator.onLine===false?'offline_missing':'network_error');}
   })().finally(()=>pending.delete(key));pending.set(key,request);
  }
  request.users++;
  const bytes=await new Promise((resolve,reject)=>{let done=false;const finish=(fn,value)=>{if(done)return;done=true;signal?.removeEventListener('abort',abort);request.users--;if(!request.users&&signal?.aborted)request.control.abort();fn(value);};const abort=()=>finish(reject,new DOMException('Aborted','AbortError'));signal?.addEventListener('abort',abort,{once:true});request.promise.then(v=>finish(resolve,v),e=>finish(reject,e));});
  return decode(bytes,entry);
 }
 async function load(selection,{signal,now=Date.now()}={}){
  const binding=selection.tripCalls;if(!binding?.manifest||!binding.generationId)throw failure('unavailable');
  const m=await acquire(binding.manifest,binding.generationId,LIMIT,signal);
  if(m.schemaVersion!==1||m.kind!=='trip-calls'||m.generationId!==binding.generationId)throw failure('version_mismatch');
  if(!(Date.parse(m.selectionValidFromUtc)<=now&&now<Date.parse(m.selectionValidUntilUtc)))throw failure('expired');
  const entry=m.lines?.[selection.lineId];if(!entry||entry.networkSha256!==binding.networkSha256||entry.timetablePackageSha256!==binding.timetablePackageSha256)throw failure('version_mismatch');
  const index=await acquire(entry,binding.generationId,128*1024,signal);
  if(index.schemaVersion!==1||index.lineId!==selection.lineId||index.generationId!==binding.generationId||index.networkSha256!==entry.networkSha256||index.timetablePackageSha256!==entry.timetablePackageSha256)throw failure('version_mismatch');
  const matches=Object.entries(index.partitions||{}).filter(([prefix])=>selection.tripRef.startsWith(prefix));if(matches.length!==1)throw failure('corrupt');
  const partition=await acquire(matches[0][1],binding.generationId,LIMIT,signal);
  return {...core.resolve(partition,selection),validity:{from:m.selectionValidFromUtc,until:m.selectionValidUntilUtc},generationId:m.generationId};
 }
 return {load};
}
return {createLoader};
});
