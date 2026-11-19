(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.WenareTeleportation=api;
})(globalThis,function(){
 'use strict';
 const key='wenare-teleportation-favorites-v1';
 const validTime=value=>Number.isSafeInteger(value)&&Math.abs(value)<=8640000000000000;
 function destination(value){
  if(!value||!Number.isFinite(value.lat)||Math.abs(value.lat)>90||
     !Number.isFinite(value.lon)||Math.abs(value.lon)>180||typeof value.label!=='string')return null;
  const label=value.label.trim().slice(0,140);
  if(!label)return null;
  return {lat:value.lat,lon:value.lon,label,...(typeof value.stationId==='string'&&value.stationId?{stationId:value.stationId}:{})};
 }
 function fromPlace(place){
  return destination({lat:place?.lat,lon:place?.lon,label:place?.name,stationId:String(place?.id??'')});
 }
 function resolveStop(call,stops){
  for(const id of [call.stopId,call.parent]){
   const stop=stops.get(id);
   if(!stop)continue;
   const point=destination({lat:stop.lat,lon:stop.lon,label:call.name,stationId:String(stop.id??id)});
   if(point)return point;
  }
  return null;
 }
 function createState(){
  let value={mode:'gps',destination:null,at:null,revision:0};
  return {
   read:()=>({...value,destination:value.destination&&{...value.destination}}),
   explore(point,at=null){
    const target=destination(point);
    if(!target||(at!==null&&!validTime(at)))return false;
    value={mode:'exploration',destination:target,at,revision:value.revision+1};
    return true;
   },
   reset(){value={mode:'gps',destination:null,at:null,revision:value.revision+1};}
  };
 }
 function createFavorites(storage){
  const same=(a,b)=>(a.stationId&&a.stationId===b.stationId)||(a.lat===b.lat&&a.lon===b.lon);
  let rows=[],persistent=true;
  try{
   const stored=JSON.parse(storage().getItem(key)||'[]');
   if(Array.isArray(stored))for(const entry of stored){
    const point=destination(entry);
    if(point&&typeof entry.id==='string'&&!rows.some(row=>row.id===entry.id||same(row,point)))rows.push({...point,id:entry.id});
   }
  }catch{persistent=false;}
  const save=()=>{
   try{storage().setItem(key,JSON.stringify(rows));persistent=true;}catch{persistent=false;}
   return persistent;
  };
  return {
   read:()=>rows.map(row=>({...row})),
   add(value){
    const point=destination(value);
    if(!point)return false;
    if(!rows.some(row=>same(row,point)))rows.push({...point,id:JSON.stringify([point.lat,point.lon,point.stationId])});
    return save();
   },
   remove(id){rows=rows.filter(row=>row.id!==id);return save();},
   persistent:()=>persistent
  };
 }
 const zone={timeZone:'Europe/Paris'};
 const day=new Intl.DateTimeFormat('fr-FR',zone);
 const clock=new Intl.DateTimeFormat('fr-FR',{...zone,hour:'2-digit',minute:'2-digit'});
 function time(at,reference=Date.now()){
  const hour=clock.format(at);
  return day.format(at)===day.format(reference)?hour:day.format(at)+' à '+hour;
 }
 return {destination,fromPlace,resolveStop,createState,createFavorites,time};
});
