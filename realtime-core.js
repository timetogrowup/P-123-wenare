/* Pure rules: a prediction never replaces the original GTFS departure. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.WenareRealtimeCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const instant=v=>typeof v==='string'&&/^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(v)?Date.parse(v):NaN;
const fields=['serviceDate','lineId','tripRef','stopId','stopSequence'];
const visitKey=e=>JSON.stringify(fields.map(k=>e?.[k]??null));
function matched(t,r,generation){const b=r?.binding;return !!b&&b.status==='matched'&&typeof generation==='string'&&b.generationId===generation&&typeof b.tripRef==='string'&&Number.isSafeInteger(b.stopSequence)&&fields.every(k=>(b[k]??r[k])===t[k]);}
function compact(time,now){const seconds=(time-now)/1000;return seconds>0?(seconds<60?'<1′':Math.ceil(seconds/60)+'′'):new Date(time).toLocaleTimeString('fr-FR',{timeZone:'Europe/Paris',hour:'2-digit',minute:'2-digit'});}
function pair(theory,realtime,{now,generationId,projected=false,consultationTime=null,clockTrusted=true,cancelled=false,motionReduced=false}={}){
 const scheduled=instant(theory?.scheduledTimeUtc),recorded=instant(realtime?.sourceRecordedAtUtc),until=instant(realtime?.validUntilUtc),expected=instant(realtime?.expectedTimeUtc);
 const suppressed=cancelled||theory?.status==='cancelled'||realtime?.status==='cancelled',boarding=theory?.boardingAllowed!==false&&realtime?.boardingAllowed!==false;
 const real=!!(!projected&&clockTrusted&&!suppressed&&boarding&&matched(theory,realtime,generationId)&&realtime.quality==='real_time'&&['estimated','at_stop'].includes(realtime.status)&&Number.isFinite(recorded)&&recorded<=now+15000&&now<until&&Number.isFinite(expected)&&(expected>now||realtime.status==='at_stop'));
 const effective=real?expected:scheduled,reference=projected?consultationTime:now,seconds=(effective-now)/1000;
 const active=!suppressed&&boarding&&Number.isFinite(effective)&&(projected?effective>=reference:effective>now||real&&realtime.status==='at_stop');
 const animation=!projected&&clockTrusted&&!motionReduced&&active&&realtime?.status!=='at_stop'&&seconds>0&&seconds<300?(real?'realtime':'theoretical'):'none';
 const theoreticalLabel=Number.isFinite(scheduled)?(projected?new Date(scheduled).toLocaleTimeString('fr-FR',{timeZone:'Europe/Paris',hour:'2-digit',minute:'2-digit'}):compact(scheduled,now)):'—';
 return {theoreticalLabel,realtimeLabel:real?(realtime.status==='at_stop'&&expected<=now?'<1′':compact(expected,now)):'',rectangleState:real?'available':'empty',animation,real,active,cancelled:suppressed,time:effective,label:projected?theoreticalLabel:real&&realtime.status==='at_stop'?'À l’arrêt':seconds<60?'Moins d’une minute':'Dans '+Math.ceil(seconds/60)+' min',theory,realtime:real?realtime:null};
}
function merge(theories,body,options={},resolveVisit=()=>null){
 const all=new Map(theories.map(t=>[visitKey(t),t])),predictions=new Map(),cancelled=new Set();
 for(const r of body?.departures||[]){const b=r.binding;if(b?.status!=='matched'||b.generationId!==options.generationId)continue;const t=all.get(visitKey({...r,...b}))||resolveVisit(b);if(!t||!matched(t,r,options.generationId))continue;const k=visitKey(t),old=predictions.get(k);all.set(k,t);if(!old||instant(r.sourceRecordedAtUtc)>instant(old.sourceRecordedAtUtc))predictions.set(k,r);if(r.status==='cancelled')cancelled.add(k);}
 for(const r of body?.cancellations||[]){const b=r.binding;if(b?.status!=='matched'||b.generationId!==options.generationId)continue;const t=all.get(visitKey({...r,...b}))||resolveVisit(b);if(t&&matched(t,r,options.generationId)){all.set(visitKey(t),t);cancelled.add(visitKey(t));}}
 return [...all].map(([key,event])=>{const view=pair(event,predictions.get(key),{...options,cancelled:cancelled.has(key)});return {event,view:{...view,pair:view},key};}).sort((a,b)=>a.view.time-b.view.time||a.key.localeCompare(b.key));
}
function validateResponse(body,query){
 if(!body||body.cancellationSnapshot?.complete!==true||body.schemaVersion!==2||!Number.isFinite(instant(body.serverTimeUtc))||!body.query||!['available','partial','none_announced','unavailable','no_service_verified'].includes(body.serviceStatus)||!['covered','partial','uncovered','unknown'].includes(body.coverage?.status))throw new Error('INVALID_REALTIME_RESPONSE');
 for(const k of ['stopId','lineId','directionId','generationId'])if(body.query[k]!==query[k])throw new Error('WRONG_REALTIME_SERVICE');
 if(!Number.isInteger(body.nextRefreshAfterSeconds)||body.nextRefreshAfterSeconds<1||body.nextRefreshAfterSeconds>86400)throw new Error('INVALID_REALTIME_CADENCE');
 for(const key of ['departures','cancellations']){
  if(!Array.isArray(body[key])||body[key].length>100)throw new Error('INVALID_REALTIME_SIZE');
  const ids=new Set();for(const e of body[key]){if(!e||typeof e.id!=='string'||ids.has(e.id))throw new Error('INVALID_REALTIME_VISIT');ids.add(e.id);for(const k of ['stopId','lineId','directionId'])if(e[k]!==query[k])throw new Error('WRONG_REALTIME_SERVICE');if(!['real_time','timetable','stale','unknown'].includes(e.quality)||!['estimated','scheduled','at_stop','cancelled','departed','unknown'].includes(e.status))throw new Error('INVALID_REALTIME_STATUS');if(e.binding?.status==='matched'&&(e.binding.generationId!==query.generationId||!/^\d{4}-\d\d-\d\d$/.test(e.binding.serviceDate)||typeof e.binding.tripRef!=='string'||!Number.isSafeInteger(e.binding.stopSequence)))throw new Error('INVALID_REALTIME_BINDING');}
 }
 return body;
}
return {instant,visitKey,matched,compact,pair,merge,validateResponse};
});
