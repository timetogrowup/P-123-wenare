(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.WenareTeleportation=api;
})(globalThis,function(){
 'use strict';
 const key='wenare-teleportation-favorites-v1';
 const validTime=value=>Number.isSafeInteger(value)&&Math.abs(value)<=8640000000000000;
 const mapPointLabel='Point sélectionné sur la carte';
 function normalizeLabel(label,kind){
  const value=String(label||'').trim().slice(0,140);
  const plain=value.replace(/\s+/g,' ');
  const pair=plain.match(/^([+-]?\d{1,3}(?:[.,]\d+)?)\s*[,;]\s*([+-]?\d{1,3}(?:[.,]\d+)?)$/);
  const degrees=plain.match(/^(\d{1,2}(?:[.,]\d+)?)\s*°\s*([NS])\s*[,;]?\s*(\d{1,3}(?:[.,]\d+)?)\s*°\s*([EO W])$/i);
  const number=text=>Number(text.replace(',','.'));
  const coordinates=(pair&&Math.abs(number(pair[1]))<=90&&Math.abs(number(pair[2]))<=180)||
   (degrees&&number(degrees[1])<=90&&number(degrees[3])<=180);
  if(kind==='map-point'||coordinates||value===mapPointLabel)return {label:mapPointLabel,labelKind:'map-point'};
  if(kind==='unknown'||!value)return {label:'Lieu non identifié',labelKind:'unknown'};
  return {label:value,labelKind:'named'};
 }
 function destination(value){
  if(!value||!Number.isFinite(value.lat)||Math.abs(value.lat)>90||
     !Number.isFinite(value.lon)||Math.abs(value.lon)>180||typeof value.label!=='string')return null;
  if(!value.label.trim())return null;
  const named=normalizeLabel(value.label,value.labelKind);
  return {lat:value.lat,lon:value.lon,...named,...(typeof value.stationId==='string'&&value.stationId?{stationId:value.stationId}:{})};
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
  const result=(status,favorite,persistence='unchanged')=>({status,persistence,...(favorite?{favorite:{...favorite}}:{})});
  function name(value){
   if(typeof value!=='string')return null;
   const label=value.trim().replace(/\s+/g,' ');
   if(!label||label.length>140||normalizeLabel(label).label!==label)return null;
   return label;
  }
  function create(value){
   const label=name(value?.label),point=label&&destination({...value,label});
   if(!point)return result('invalid');
   const existing=rows.find(row=>same(row,point));
   if(existing)return result('duplicate',existing);
   const row={...point,id:JSON.stringify([point.lat,point.lon,point.stationId])};
   rows.push(row);return result('created',row,save()?'stored':'session');
  }
  function rename(id,value){
   const label=name(value);if(!label)return result('invalid');
   const index=rows.findIndex(row=>row.id===id);if(index<0)return result('not-found');
   rows[index]={...rows[index],label,labelKind:'named'};
   return result('renamed',rows[index],save()?'stored':'session');
  }
  function remove(id){
   const point=rows.find(row=>row.id===id);if(!point)return result('not-found');
   rows=rows.filter(row=>row.id!==id);return result('removed',point,save()?'stored':'session');
  }
  return {
   read:()=>rows.map(row=>({...row})),create,rename,delete:remove,
   add(value){const r=create(value);return r.status==='duplicate'?persistent:r.status==='created'&&r.persistence==='stored';},
   remove(id){const r=remove(id);return r.status==='removed'&&r.persistence==='stored';},
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
 function locationText(label,kind){
  const named=normalizeLabel(label,kind),value=named.label;
  if(named.labelKind==='map-point')return 'au point sélectionné sur la carte';
  if(named.labelKind==='unknown')return 'à un lieu non identifié';
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
 function presentation(context,physical,now=Date.now()){
  const exploration=context.mode==='exploration',fixed=exploration&&context.at!==null;
  const when=fixed?context.at:now,otherDay=day.format(when)!==day.format(now);
  const clock=clockText(when),date=otherDay?'Le '+phraseDate.format(when)+', ':'';
  let situation,question='Qu’est-ce qui s’offre à moi ?';
  if(exploration){
   const label=normalizeLabel(context.destination.label,context.destination.labelKind).label;
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
    const place=physical.location,named=normalizeLabel(place?.label);
    const known=named.labelKind==='named';
    situation=prefix+(known&&place.relation==='near'?'Je suis près de '+place.label+'.':
     known&&place.relation==='at'?'Je suis '+locationText(place.label)+'.':
     'Lieu non identifié.');
   }else situation=prefix+(physical?.status==='pending'?'Localisation en cours…':'Ma position est indisponible.');
  }
  return {situation,question,exploration,status:exploration?'Téléportation active':''};
 }
 const parisMinute=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
 function parisInstant(date,clock){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^\d{2}:\d{2}$/.test(clock))return {status:'invalid'};
  const label=date+' '+clock;
  const utc=Date.parse(date+'T'+clock+':00Z');
  if(!Number.isFinite(utc)||new Date(utc).toISOString().slice(0,16)!==date+'T'+clock)return {status:'invalid'};
  const dayMs=86400000;
  const offsets=new Set([utc-dayMs,utc,utc+dayMs].map(probe=>Date.parse(parisMinute.format(probe).replace(' ','T')+':00Z')-probe));
  const matches=[...offsets].map(offset=>utc-offset).filter(at=>parisMinute.format(at)===label);
  if(matches.length===1)return {status:'ok',at:matches[0]};
  return {status:matches.length?'ambiguous':'missing'};
 }
 return {parisInstant,normalizeLabel,destination,fromPlace,resolveStop,createState,createFavorites,time,clockText,locationText,freshPosition,presentation};
});
