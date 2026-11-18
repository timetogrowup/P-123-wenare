(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.WenareTripCalls=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){'use strict';
class TripCallsError extends Error{constructor(code){super(code);this.code=code;}}
const fail=code=>{throw new TripCallsError(code);};
const own=(obj,key)=>obj&&Object.hasOwn(obj,key);
function validatePartition(p,generation,line){
 if(p?.schemaVersion!==1||p.generationId!==generation||p.lineId!==line||!p.courses||!p.patterns||!p.timeTemplates||!p.stops||!p.serviceDays)fail('corrupt');
 for(const [ref,c] of Object.entries(p.courses)){
  const pattern=p.patterns[c.patternRef],times=p.timeTemplates[c.timeTemplateRef];
  if(!/^[a-f0-9]{16}$/.test(ref)||!Array.isArray(pattern)||pattern.length<2||!Array.isArray(times)||pattern.length!==times.length||!Array.isArray(c.serviceDates)||!c.availability)fail('corrupt');
  let last=-1;
  for(let i=0;i<pattern.length;i++){const row=pattern[i],t=times[i];
   if(!Array.isArray(row)||row.length!==4||!Number.isSafeInteger(row[0])||row[0]<=last||!own(p.stops,row[1])||typeof p.stops[row[1]].name!=='string'||!['0','1','2','3'].includes(row[2])||!['0','1','2','3'].includes(row[3])||!Array.isArray(t)||t.length!==3||t.slice(0,2).some(v=>v!==null&&(!Number.isSafeInteger(v)||v<0||v>=604800))||![null,'0','1'].includes(t[2]))fail('corrupt');last=row[0];}
  const final=pattern[pattern.length-1];if(final[0]!==c.terminusStopSequence||final[1]!==c.terminusStopId)fail('corrupt');
  for(const date of c.serviceDates)if(!/^\d{4}-\d\d-\d\d$/.test(date)||!own(p.serviceDays,date)||!Number.isSafeInteger(p.serviceDays[date].baseUtcMs))fail('corrupt');
 }
 return p;
}
function resolve(p,selection){
 validatePartition(p,selection.tripCalls.generationId,selection.lineId);
 const c=p.courses[selection.tripRef];if(!c||!c.serviceDates.includes(selection.serviceDate))fail('version_mismatch');
 if(c.availability.state==='unavailable')fail('unavailable');
 if(c.terminusStopId!==selection.directionId||c.gtfsDirectionId!==selection.gtfsDirectionId)fail('version_mismatch');
 const pattern=p.patterns[c.patternRef],times=p.timeTemplates[c.timeTemplateRef],base=p.serviceDays[selection.serviceDate].baseUtcMs;
 const calls=pattern.map((r,i)=>({stopSequence:r[0],stopId:r[1],name:p.stops[r[1]].name,parent:p.stops[r[1]].parent,platform:p.stops[r[1]].platform,pickupType:r[2],dropOffType:r[3],arrivalUtcMs:times[i][0]===null?null:base+times[i][0]*1000,departureUtcMs:times[i][1]===null?null:base+times[i][1]*1000,approximate:times[i][2]==='0',conditional:['2','3'].includes(r[2])||['2','3'].includes(r[3])}));
 const origin=calls.find(x=>x.stopSequence===selection.stopSequence);
 if(!origin||origin.stopId!==selection.stopId||origin.departureUtcMs!==Date.parse(selection.scheduledTimeUtc))fail('version_mismatch');
 const onward=calls.filter(x=>x.stopSequence>origin.stopSequence&&!(x.pickupType==='1'&&x.dropOffType==='1'));
 const terminus=calls[calls.length-1];
 return {originCall:origin,onwardCalls:onward,terminus,complete:c.availability.pathComplete&&c.availability.timesComplete&&c.availability.terminalArrivalKnown,notices:c.availability.reasonCodes,headsign:c.headsign,source:'Île-de-France Mobilités — GTFS',quality:'timetable'};
}
function time(value,origin){
 if(value===null)return 'Horaire non renseigné';
 const date=new Date(value),parts={timeZone:'Europe/Paris',hour:'2-digit',minute:'2-digit'};
 let text=date.toLocaleTimeString('fr-FR',parts);
 const calendar=d=>new Date(d).toLocaleDateString('fr-FR',{timeZone:'Europe/Paris'});
 if(origin!==undefined&&calendar(value)!==calendar(origin))text+=' · '+calendar(value);
 return text;
}
function label(call,origin,terminal=false){
 const a=call.arrivalUtcMs,d=call.departureUtcMs;
 if(terminal)return a===null?(d===null?'Arrivée non renseignée':'Arrivée non renseignée · départ '+time(d,origin)):'Arrivée '+time(a,origin);
 if(a!==null&&d!==null&&Math.floor(a/60000)!==Math.floor(d/60000))return 'Arrivée '+time(a,origin)+' · départ '+time(d,origin);
 return d!==null?time(d,origin):a!==null?'Arrivée '+time(a,origin):'Horaire non renseigné';
}
return {TripCallsError,validatePartition,resolve,time,label};
});
