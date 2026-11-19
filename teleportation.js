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
 const phraseClock=new Intl.DateTimeFormat('fr-FR',{...zone,hour:'2-digit',minute:'2-digit'});
 const phraseDate=new Intl.DateTimeFormat('fr-FR',{...zone,day:'numeric',month:'long',year:'numeric'});
 function clockText(at){
  const parts=phraseClock.formatToParts(at);
  return parts.find(p=>p.type==='hour').value+' h '+parts.find(p=>p.type==='minute').value;
 }
 function locationText(label){
  const value=String(label||'').trim();
  if(/^(place|rue|avenue|boulevard|quai|cours|square|allée|impasse)\b/i.test(value))return value;
  if(/^(la défense|poissy|auber|paris|argentine|saint-germain-en-laye)$/i.test(value))return 'à '+value;
  return 'ici : '+value;
 }
 function freshPosition(physical,now){
  const p=physical?.position;
  return physical?.status==='ready'&&p&&Number.isFinite(p.lat)&&Math.abs(p.lat)<=90&&
   Number.isFinite(p.lon)&&Math.abs(p.lon)<=180&&Number.isFinite(p.accuracy)&&p.accuracy>=0&&
   p.accuracy<=1000&&Number.isFinite(p.timestamp)&&Math.abs(now-p.timestamp)<=60000;
 }
 function coordinateText(p){
  const number=new Intl.NumberFormat('fr-FR',{minimumFractionDigits:4,maximumFractionDigits:4});
  return number.format(Math.abs(p.lat))+'° '+(p.lat<0?'S':'N')+', '+number.format(Math.abs(p.lon))+'° '+(p.lon<0?'O':'E');
 }
 function presentation(context,physical,now=Date.now()){
  const exploration=context.mode==='exploration',fixed=exploration&&context.at!==null;
  const when=fixed?context.at:now,otherDay=day.format(when)!==day.format(now);
  const clock=clockText(when),date=otherDay?'Le '+phraseDate.format(when)+', ':'';
  let situation,question='Qu’est-ce qui s’offre à moi ?';
  if(exploration){
   const label=context.destination.label;
   if(fixed&&when<now){
    situation='Projection '+(otherDay?'du '+phraseDate.format(when)+' à ':'à ')+clock+' : '+label+'. Cette heure est passée.';
    question='Que puis-je explorer autour de ce lieu ?';
   }else if(fixed){
    situation=date+(otherDay?'il':'Il')+' sera '+clock+'. Je serai '+locationText(label)+'.';
    question='Qu’est-ce qui s’offrira à moi ?';
   }else{
    situation='Il est '+clock+'. Je me projette '+locationText(label)+'.';
    question='Qu’est-ce qui s’offre à moi là-bas ?';
   }
  }else{
   const prefix='Il est '+clock+'. ';
   if(freshPosition(physical,now)){
    const place=physical.location;
    situation=prefix+(place?.label&&place.relation==='near'?'Je suis près de '+place.label+'.':
     place?.label&&place.relation==='at'?'Je suis '+locationText(place.label)+'.':
     'Ma position : '+coordinateText(physical.position)+'.');
   }else situation=prefix+(physical?.status==='pending'?'Localisation en cours…':'Ma position est indisponible.');
  }
  return {situation,question,exploration,status:exploration?'Téléportation active':''};
 }
 return {destination,fromPlace,resolveStop,createState,createFavorites,time,clockText,locationText,freshPosition,presentation};
});
