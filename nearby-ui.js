(function(){'use strict';
const $=id=>document.getElementById(id),core=WenareDepartures,logic=WenareNearby;
const teleport=WenareTeleportationUI,teleportCore=WenareTeleportation;
let context=teleport.read(),locations=new Map();
const center=()=>context.destination||(lastFix?{lat:lastFix.coords.latitude,lon:lastFix.coords.longitude}:null);
const projected=()=>context.at!==null;
const hour=value=>teleportCore.time(value,context.at??Date.now());
let sequence=0,controller=null,timer=null,tick=null,enabled=true,places=[],sources={},lastFix=null,results=new Map(),stopIndex=new Map();
let scanned=[],railScanned=[],railPlaces=[],loading=false,dataIssues=false;
let candidates=[],radius=250,manualRadius=false;
const expanded=new Set();
let lineColours=new Map();
const realtime=window.WenareRealtimeLoader?.create();
let structureKey=null;
function pairKey(place,item){return String(place.id)+'|'+item.event.id;}
function pairNode(place,item,where,secondary=false){return WenareRealtimeUI.create(item.view,pairKey(place,item)+'|'+where,{secondary,sourceKey:pairKey(place,item)});}
let physicalRequest=0,fixExpiry=null;
function publishPhysical(status){
 const valid=logic.validPosition(lastFix?.coords,lastFix?.timestamp),position=valid?{
  lat:lastFix.coords.latitude,lon:lastFix.coords.longitude,accuracy:lastFix.coords.accuracy,timestamp:lastFix.timestamp
 }:null;
 let location=null;
 if(position){
  const points=[...new Set(locations.values())].filter(p=>p.name&&Number.isFinite(p.lat)&&Number.isFinite(p.lon));
  const nearest=core.nearby(points,position,1)[0];
  if(nearest&&nearest.distance+position.accuracy<=250)location={label:'l’arrêt « '+nearest.name+' »',relation:'near',source:'catalogue'};
 }
 window.dispatchEvent(new CustomEvent('wenare:physical-position',{detail:{
  status:valid?'ready':status,position,requestId:physicalRequest,location
 }}));
}
function acceptPhysical(position){
 lastFix=position;clearTimeout(fixExpiry);publishPhysical('ready');
 fixExpiry=setTimeout(()=>publishPhysical('stale'),Math.max(1,position.timestamp+60001-Date.now()));
}
async function physicalPosition(reuse=true){
 const requestId=++physicalRequest;
 if(reuse&&logic.validPosition(lastFix?.coords,lastFix?.timestamp))return {position:lastFix,requestId};
 publishPhysical('pending');
 const position=await new Promise((resolve,reject)=>{
  if(!navigator.geolocation){reject({code:2});return;}
  const timeout=setTimeout(()=>reject({code:3}),15000);
  const done=fn=>value=>{clearTimeout(timeout);fn(value);};
  try{navigator.geolocation.getCurrentPosition(done(resolve),done(reject),{enableHighAccuracy:true,timeout:15000,maximumAge:reuse?15000:0});}
  catch(error){clearTimeout(timeout);reject(error);}
 });
 if(!logic.validPosition(position?.coords,position?.timestamp))throw {code:2};
 return {position,requestId};
}
async function returnToPosition({fresh=false}={}){
 const revision=teleport.read().revision;
 try{
  const {position,requestId}=await physicalPosition(!fresh);
  if(requestId!==physicalRequest||teleport.read().revision!==revision)return false;
  acceptPhysical(position);return true;
 }catch(error){
  if(teleport.read().revision!==revision)return false;
  publishPhysical('unavailable');throw error;
 }
}
function paintBadge(badge,lineId){return WenareLineColours.apply(badge,lineColours.get(lineId));}
const icon=mode=>({metro:'Ⓜ',rer:'Ⓡ',bus:'🚌',tram:'Ⓣ',train:'🚆',ter:'🚆',shuttle:'🚈',cable:'🚡',funicular:'🚞'}[mode]||'🚏');
function badge(service){const e=element('span',icon(service.mode)+' '+label(service.mode)+' '+service.lineName,'line-badge mode-'+service.mode);e.title=label(service.mode)+' '+service.lineName;return paintBadge(e,service.lineId);}
function controls(){document.querySelectorAll('[data-radius]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.radius)===radius)));$('radiusStatus').textContent='Rayon sélectionné : '+radius.toLocaleString('fr-FR')+' m';window.dispatchEvent(new CustomEvent('wenare:overview',{detail:{radius,manualRadius,enabled,transportCount:places.length+railPlaces.length,position:enabled?lastFix:null,exploration:{...context,center:enabled?center():null}}}));}
const label=mode=>({metro:'Métro',rer:'RER',bus:'Bus',tram:'Tram',train:'Transilien',ter:'TER',shuttle:'Navette',cable:'Câble',funicular:'Funiculaire'}[mode]||'Transport');
const say=text=>{$('nearbyOverviewStatus').textContent=text;$('nearbyOverviewStatus').classList.toggle('is-error',/⚠|indisponible|Autorisez|imprécise|trop ancienne|hors (de la )?période|aucun arrêt/i.test(text));};
function cancel(clear=true){structureKey=null;sequence++;controller?.abort();controller=null;clearTimeout(timer);clearInterval(tick);timer=tick=null;if(clear){places=[];railPlaces=[];scanned=[];railScanned=[];loading=false;results.clear();$('nearbyCards').replaceChildren();$('railCards').replaceChildren();$('railOverview').hidden=true;}controls();}
function fallback(text){enabled=false;publishPhysical('unavailable');controls();say(text);}
function element(tag,text,className){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(className)e.className=className;return e;}
function groupsFor(place,wall=Date.now(),mono=performance.now()){
 const observations=[],choices=[];for(const service of place.services){const row=results.get(service.key);if(!row)continue;if(row.error){dataIssues=true;continue;}const now=row.clock.server+mono-row.clock.mono;if(Math.abs((wall-row.clock.wall)-(mono-row.clock.mono))>30000||now>=Date.parse(row.response.validUntilUtc)){dataIssues=true;continue;}choices.push(...(row.response.tripChoices||[]));const rtClock=row.realtime?.clock,clockTrusted=!!rtClock&&Math.abs((wall-rtClock.wall)-(mono-rtClock.mono))<=30000,reference=clockTrusted?rtClock.server+mono-rtClock.mono:now;const pairs=WenareRealtimeCore.merge(row.response.departures,row.realtime?.body,{now:reference,generationId:row.response.generationId,projected:projected(),consultationTime:context.at,clockTrusted:row.realtime?.body?clockTrusted:true},row.response.resolveVisit);for(const item of pairs){if(projected()?item.view.active&&item.view.time<context.at+3600000:logic.imminent(item.view,reference))observations.push({service,...item});}}
 return logic.directionGroups(observations).map(group=>({...group,tripChoices:choices.filter(event=>
  event.lineId===group.lineId&&(event.gtfsDirectionId??null)===group.gtfsDirectionId&&
  (group.gtfsDirectionId!==null||event.directionId===group.events[0].event.directionId))}));
}
function projectionNotice(){
 if(!projected())return '';
 const rows=[...results.values()].filter(row=>!row.refreshPending);
 const outside=rows.filter(row=>row.code==='projection_outside_coverage').length;
 const limits=rows.map(row=>row.response?.projectionLimit).filter(Number.isFinite);
 const notices=[];
 if(outside)notices.push(outside===rows.length?'Heure hors de la période couverte.':'Couverture partielle à l’heure choisie.');
 if(limits.length)notices.push('Selon la ligne, horaires jusqu’à '+hour(Math.min(...limits))+'.');
 return notices.join(' ');
}
function select(){dataIssues=false;const wall=Date.now(),mono=performance.now(),all=[...new Map([...railScanned,...scanned].map(p=>[p.id,p])).values()],groups=new Map(all.map(p=>[p.id,groupsFor(p,wall,mono)])),sections=logic.selectSections(scanned,groups,railScanned);places=sections.primary;railPlaces=sections.rail;}
function render(){
 const active=document.activeElement,focusedTeleport=active?.dataset.nearbyTeleport,focusedTrip=active?.classList.contains('trip-calls-trigger')?{placeId:active.dataset.placeId,lineId:active.dataset.lineId,direction:active.dataset.direction}:null;
 select();const signature=JSON.stringify({revision:context.revision,expanded:[...expanded],loading,dataIssues,places:[...places,...railPlaces].map(p=>[p.id,...p.groups.map(g=>[g.key,...g.events.map(i=>i.event.id)])])});if(signature===structureKey){const views=new Map([...places,...railPlaces].flatMap(p=>p.groups.flatMap(g=>g.events.map(i=>[pairKey(p,i),i.view]))));WenareRealtimeUI.refresh(views);return;}structureKey=signature;const focusedPlace=document.activeElement?.classList.contains('place-summary')?document.activeElement.dataset.placeId:null;controls();$('nearbyCards').replaceChildren();$('railCards').replaceChildren();$('railOverview').hidden=!railPlaces.length;if(!places.length&&center()&&enabled)$('nearbyCards').append(element('p',loading?'⏳ Recherche des départs dans les 60 minutes…':projectionNotice()||(dataIssues?'⚠ Horaires indisponibles ou expirés. Réessayez avec une connexion.':'🔎 Aucun départ dans les 60 minutes à moins de '+radius.toLocaleString('fr-FR')+' m.'),'nearby-empty'));
 for(const {i,place,target,prefix} of [...places.map((place,i)=>({place,i,target:'nearbyCards',prefix:'place'})),...railPlaces.map((place,i)=>({place,i,target:'railCards',prefix:'rail'}))]){
 const card=element('article',undefined,'departure-place');card.dataset.view='directions';
 const groups=place.groups,lineStates=new Map(place.services.map(service=>[service.lineId,{service}])),partial=dataIssues,list=element('ul',undefined,'all-departures'),shown=new Set();
 for(const group of groups){shown.add(group.lineId);const li=element('li'),name=element('div',undefined,'departure-service');li.dataset.lineId=group.lineId;const tripButton=badge(group);const action=document.createElement('button');action.type='button';action.className=tripButton.className+' trip-calls-trigger';action.style.cssText=tripButton.style.cssText;if(tripButton.dataset.officialColour)action.dataset.officialColour=tripButton.dataset.officialColour;action.textContent=tripButton.textContent;action.dataset.placeId=String(place.id);action.dataset.lineId=group.lineId;action.dataset.direction=String(group.gtfsDirectionId??'unknown');action.title='Voir tous les arrêts jusqu’au terminus';action.setAttribute('aria-label',label(group.mode)+' '+group.lineName+' vers '+group.nextName+' : voir les arrêts jusqu’au terminus');action.onclick=event=>{event.stopPropagation();window.WenareTripCallsUI?.open(group,place,action);};name.append(action,element('span',(group.gtfsDirectionId===null?'Sens non renseigné · ':'')+'→ '+group.nextName));li.append(name);const times=element('p',undefined,'departure-times');group.events.forEach((item,j)=>{const wrap=element('span');if(j)wrap.append(document.createTextNode('Puis '));wrap.append(pairNode(place,item,'detail',j>0),document.createTextNode(' → '+(item.event.destinationName||'Destination non renseignée')+(projected()?'':' · prévu '+new Date(item.event.scheduledTimeUtc).toLocaleTimeString('fr-FR',{timeZone:'Europe/Paris',hour:'2-digit',minute:'2-digit'}))));times.append(wrap);});if(group.events.length===1)times.append(element('span','Puis : aucun dans les 60 min'));li.append(times);list.append(li);}
 const lines=logic.lineRows(groups).sort((a,b)=>a.lineName.localeCompare(b.lineName,'fr',{numeric:true}));
 const summary=element('button',undefined,'place-summary'),detailId=prefix+'-detail-'+i,open=expanded.has(place.id);
 summary.type='button';summary.dataset.placeId=place.id;summary.setAttribute('aria-expanded',String(open));summary.setAttribute('aria-controls',detailId);
 const row1=element('span',undefined,'summary-row place-heading'),title=element('h2',place.name,'place-name');title.title=place.name;
 row1.append(element('span','📍','place-pin'),title,element('span',Math.ceil(place.distance)+' m','place-distance'),element('span',open?'⌃':'⌄','place-chevron'));
 const row2=element('span',undefined,'summary-row'),row3=element('span',undefined,'summary-row');
 const walk=context.mode==='exploration'?'Depuis le point exploré':'🚶 ≈ '+core.walkingMinutes(place.distance)+' min';
 const visible=lines.slice(0,2),hiddenLines=lines.length-visible.length;
 if(hiddenLines){const extra=element('span','＋'+hiddenLines,'summary-extra');extra.title=hiddenLines+' autres lignes dans le détail';row1.insertBefore(extra,row1.lastChild);}
 function renderLine(row,line){row.classList.add('line-senses-row');row.dataset.lineId=line.lineId;const logo=element('span',(line.mode==='bus'?'':icon(line.mode)+' ')+line.lineName,'line-badge compact-line mode-'+line.mode);logo.title=label(line.mode)+' '+line.lineName;logo.setAttribute('aria-label',logo.title);row.append(paintBadge(logo,line.lineId));
  const known=line.directions.filter(g=>g.gtfsDirectionId==='0'||g.gtfsDirectionId==='1'),unknown=line.directions.filter(g=>g.gtfsDirectionId===null);
  const slots=known.length?['0','1'].map(id=>known.find(g=>g.gtfsDirectionId===id)||null):[unknown[0]||null,null];
  slots.forEach((direction,index)=>{if(!direction){const absent=element('span','—','sense-cell sense-empty');absent.dataset.gtfsDirectionId=String(index);absent.setAttribute('aria-label','Pas de départ annoncé dans ce sens dans les 60 minutes');row.append(absent);return;}
   const cell=element('span',undefined,'sense-cell');cell.dataset.nextPlaceId=direction.nextPlaceId;cell.dataset.gtfsDirectionId=direction.gtfsDirectionId??'unknown';const name=element('span',(direction.gtfsDirectionId===null?'Sens ? · ':'')+direction.nextName,'sense-name');name.title=direction.nextName;
   const time=element('span',undefined,'sense-time');time.append(pairNode(place,direction.events[0],'summary'));if(direction.events[1]){const following=element('small',undefined,'sense-following');following.append(document.createTextNode(' ('),pairNode(place,direction.events[1],'summary',true),document.createTextNode(')'));following.title='Suivant vers '+direction.events[1].event.destinationName;time.append(following);}
   cell.setAttribute('aria-label',label(line.mode)+' '+line.lineName+' '+(direction.gtfsDirectionId===null?'sens non renseigné':'sens GTFS '+direction.gtfsDirectionId)+' vers '+direction.nextName+' : '+direction.events[0].view.label+(direction.events[1]?', puis '+direction.events[1].view.label+' vers '+direction.events[1].event.destinationName:''));cell.append(name,time);row.append(cell);});

  if(line.directions.length>2){const more=element('span','＋'+(line.directions.length-2),'sense-variants');more.title='Autres premiers arrêts dans le détail';row.append(more);}
 }
 if(visible[0])renderLine(row2,visible[0]);if(visible[1])renderLine(row3,visible[1]);else row3.append(element('span',walk,'summary-walk'),element('span',partial?'⚠ Partiel · ⌄ Détails':'⌄ Détails','summary-more'));

 summary.append(row1,row2,row3);const detail=element('div',undefined,'place-detail');detail.id=detailId;detail.hidden=!open;
 detail.append(element('p',Math.ceil(place.distance)+' m à vol d’oiseau · '+walk+(context.mode==='gps'?' de marche indicative':''),'muted'),list,element('small',(partial?'⚠ Certains horaires sont indisponibles · ':'')+'Horaire prévu · en vert : estimation actualisée · '+(projected()?'60 min à partir de l’heure choisie':'60 prochaines minutes')+' · perturbations non connues'+(projectionNotice()?' · '+projectionNotice():'')));
 const walking=element('button','🚶 Y aller à pied','walk-button');walking.type='button';walking.onclick=()=>window.WenareWalkingUI?.open(place);detail.append(walking);const point=teleportCore.fromPlace(place);if(point){const jump=teleport.button('Explorer '+place.name,()=>teleport.explore(point));jump.dataset.nearbyTeleport=prefix+'-'+place.id;detail.append(jump);}
 summary.onclick=()=>{if(expanded.has(place.id))expanded.delete(place.id);else expanded.add(place.id);render();};
 card.append(summary,detail);$(target).append(card);
 }
 window.dispatchEvent(new CustomEvent('wenare:map-data',{detail:{source:'transport',revision:context.revision,items:enabled?[...places,...railPlaces].map(p=>({...p,id:String(p.id),category:'transport',mapSummary:p.groups.map(g=>label(g.mode)+' '+g.lineName+' → '+g.nextName+' : '+g.events.map(x=>x.view.label).join(', puis ')).join(' · ')})):[]}}));
 for(const id of ['nearbyCards','railCards'])window.WenareMotion?.cards($(id));
 if(focusedTrip&&!document.querySelector('#tripCallsDialog[open]'))Array.from(document.querySelectorAll('button.trip-calls-trigger')).find(b=>b.dataset.placeId===focusedTrip.placeId&&b.dataset.lineId===focusedTrip.lineId&&b.dataset.direction===focusedTrip.direction)?.focus({preventScroll:true});
 if(focusedTeleport&&!document.querySelector('dialog[open]'))Array.from(document.querySelectorAll('[data-nearby-teleport]')).find(b=>b.dataset.nearbyTeleport===focusedTeleport)?.focus({preventScroll:true});
 if(focusedPlace)Array.from(document.querySelectorAll('.place-summary')).find(b=>b.dataset.placeId===focusedPlace)?.focus({preventScroll:true});
}
async function catalogues(mine){
 const outputs=await Promise.allSettled([
 (async()=>{let record;try{record=await MMIReference.update();}catch{record=await MMIReference.read();}if(!record)throw new Error();return {mode:'metro',lines:record.data.lines,stations:core.catalogue(record.data),locations:record.data.stations,stops:record.data.stops,sha:record.manifest.sha256};})(),
 (async()=>{const record=await WenareMobility.load(controller.signal);return {record,mode:'extra',lines:record.data.lines,stations:core.catalogue(record.data),locations:record.data.stations,stops:record.data.stops,sha:record.manifest.networkSha256};})()
 ]);if(mine!==sequence)return null;sources={};stopIndex=new Map();locations=new Map();lineColours=new Map();const data=[];for(let i=0;i<outputs.length;i++){const r=outputs[i];if(r.status==='fulfilled'){sources[r.value.mode]=r.value;for(const line of r.value.lines)lineColours.set(line.route_id,WenareLineColours.palette(line));data.push(r.value.stations);for(const station of r.value.locations){locations.set(station.id,station);for(const id of station.stop_point_ids)locations.set(id,station);}for(const stop of r.value.stops){stopIndex.set(stop.stop_id,stop);if(!locations.has(stop.stop_id)&&Number.isFinite(stop.stop_lat)&&Number.isFinite(stop.stop_lon))locations.set(stop.stop_id,{id:stop.parent_station||stop.stop_id,lat:stop.stop_lat,lon:stop.stop_lon});}}}
 $('nearbyCoverage').textContent=(sources.extra?.record?.manifest.catalogueVersion===3?'Couverture : métro (16 lignes), '+Object.entries(sources.extra.record.manifest.qa.modeLines||{rer:5,bus:sources.extra.record.manifest.qa.busLines}).map(([mode,count])=>label(mode)+' : '+count).join(' · ')+'. Arrêts disposant de départs théoriques sur la période.':'Couverture : métro (16 lignes), RER A–E et cinq lignes de bus pilotes. Classement parmi les points couverts.')+(outputs.some(r=>r.status==='rejected')?' Certaines données sont indisponibles : propositions partielles.':'');return logic.mergePlaces(data);
}
let timetableReady=null;
function ensureTimetable(){if(window.WenareTimetable?.projectionVersion===1&&typeof window.WenareTimetable.loadMany==='function')return Promise.resolve();if(!timetableReady)timetableReady=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='./timetable.js?v=45';script.onload=()=>window.WenareTimetable?.projectionVersion===1&&typeof window.WenareTimetable.loadMany==='function'?resolve():reject(new Error('CLIENT_UPDATE_REQUIRED'));script.onerror=()=>reject(new Error('CLIENT_UPDATE_REQUIRED'));document.head.append(script);}).catch(error=>{timetableReady=null;throw error;});return timetableReady;}
async function loadQueries(queries,mine,pool){
 await Promise.allSettled(['metro','extra'].map(async mode=>{const src=sources[mode],needed=new Set(queries.filter(s=>(s.mode==='metro'?'metro':'extra')===mode&&(!results.has(s.key)||results.get(s.key).refreshPending)).map(s=>s.lineId)),q=[...new Map(pool.flatMap(p=>p.services).filter(s=>needed.has(s.lineId)&&(!results.has(s.key)||results.get(s.key).refreshPending)).map(s=>[s.key,s])).values()];if(!src||!q.length)return;try{await ensureTimetable();if(mine!==sequence)return;const rows=await WenareTimetable.loadMany(q,src.sha,controller.signal,mode==='metro'?'./distribution/timetable/':'./distribution/mobility/',true,{consultationTime:context.at});if(mine!==sequence)return;for(const row of rows){const previous=results.get(row.query.key);if(row.error&&previous?.response){previous.refreshPending=false;continue;}results.set(row.query.key,{...row,realtime:previous?.realtime||null,clock:row.response?{server:Date.parse(row.response.serverTimeUtc),mono:performance.now(),wall:Date.now()}:null});}}catch(error){if(mine!==sequence)return;for(const service of q){const previous=results.get(service.key);if(previous?.response)previous.refreshPending=false;else results.set(service.key,{error:'Horaires temporairement indisponibles.'});}}}));
 if(realtime&&!projected()&&mine===sequence){const todo=queries.filter(q=>results.get(q.key)?.response?.generationId);let cursor=0;async function worker(){while(cursor<todo.length&&mine===sequence){const q=todo[cursor++],row=results.get(q.key);const record=await realtime.read({stopId:q.stopId,lineId:q.lineId,directionId:q.directionId,generationId:row.response.generationId},{signal:controller.signal}).catch(()=>null);if(mine===sequence&&record)row.realtime=record;}}await Promise.all([worker(),worker()]);}
}
async function departures(mine){if(mine!==sequence||document.hidden||loading)return;loading=true;
 const domainRadii=window.WenareOpportunitiesUI?.radii();const radii=manualRadius||context.mode==='exploration'?[radius]:domainRadii||logic.RADII.filter(r=>r<=3000);
 if(window.WenareOpportunitiesUI?.transportNeeded()===false){radius=radii[0];scanned=[];railScanned=[];loading=false;render();return;}
 for(const current of radii){if(mine!==sequence)return;radius=current;const pool=candidates.filter(p=>p.distance<=radius);scanned=[];
  for(let i=0;i<pool.length;i+=3){if(mine!==sequence)return;const batch=pool.slice(i,i+3);await loadQueries([...new Map(batch.flatMap(p=>p.services).map(s=>[s.key,s])).values()],mine,pool);if(mine!==sequence)return;scanned.push(...batch);render();if(places.length===3)break;}
  select();if(places.length||manualRadius)break;
 }
 if(mine!==sequence||document.hidden)return;
 const railPool=candidates.filter(p=>p.distance<=radius&&p.services.some(s=>logic.isRail(s.mode))).map(p=>({...p,services:p.services.filter(s=>logic.isRail(s.mode))}));railScanned=[];
 for(let i=0;i<railPool.length;i+=3){if(mine!==sequence)return;const batch=railPool.slice(i,i+3);await loadQueries([...new Map(batch.flatMap(p=>p.services).map(s=>[s.key,s])).values()],mine,railPool);if(mine!==sequence)return;railScanned.push(...batch);render();if(railPlaces.length===3)break;}
 if(mine!==sequence||document.hidden)return;loading=false;render();say(projectionNotice()||(!candidates.some(p=>p.distance<=radius)?'Aucun arrêt couvert dans ce rayon.':dataIssues?'⚠ Certains horaires sont indisponibles ou expirés. Départs vérifiés uniquement.':places.length?'🕒 60 prochaines minutes · les sens de départ sont regroupés.':'🔎 Aucun départ dans les 60 minutes dans ce rayon.'));
 $('nearbyOverviewAge').textContent=context.mode==='exploration'?'':'Position reçue à '+new Date(lastFix.timestamp).toLocaleTimeString('fr-FR',{timeZone:'Europe/Paris'})+' · précision ±'+Math.round(lastFix.coords.accuracy)+' m'+(lastFix.coords.accuracy>100?' · l’ordre des points proches peut être incertain.':'')+(Array.from(results.values()).some(r=>r.response?.clockSource==='device')?' · horaires calculés avec l’horloge de l’appareil.':'');
 clearInterval(tick);tick=setInterval(()=>{render();if(!loading&&((places.length<3&&(scanned.length<candidates.filter(p=>p.distance<=radius).length||(!manualRadius&&context.mode==='gps'&&!places.length&&radius<3000)))||(railPlaces.length<3&&railScanned.length<candidates.filter(p=>p.distance<=radius&&p.services.some(s=>logic.isRail(s.mode))).length)))departures(sequence);},1000);clearTimeout(timer);timer=setTimeout(()=>{if(enabled&&!document.hidden)start(true);},60000);
}
async function start(silent=false,reuseFix=false){silent=silent===true&&!!center()&&!!candidates.length;window.dispatchEvent(new Event('wenare:restart'));enabled=true;cancel(!silent);loading=false;if(document.hidden)return;controller=new AbortController();const mine=sequence;if(!silent){say(context.mode==='exploration'?'Recherche des départs autour du point exploré…':'Wenare vous localise et prépare vos départs…');$('nearbyOverviewAge').textContent='';}
 const catalogue=catalogues(mine);
 if(context.mode==='gps'){
 if(!navigator.geolocation){fallback('Localisation indisponible sur cet appareil. Actualisez la page pour réessayer.');return;}
 let fix;try{fix=await physicalPosition(reuseFix);}catch(error){if(mine===sequence)fallback(error.code===1?'Autorisez la localisation pour voir vos départs automatiquement. Autorisez-la dans les paramètres du navigateur, puis actualisez la page.':'Position indisponible. Actualisez la page pour réessayer.');return;}
 if(mine!==sequence||fix.requestId!==physicalRequest)return;acceptPhysical(fix.position);
 }
 const stations=await catalogue;if(mine!==sequence||!stations)return;publishPhysical('stale');if(!stations.length){candidates=[];render();say('⚠ Données de transport indisponibles.');return;}
 if(!silent)results.clear();else for(const row of results.values())row.refreshPending=true;scanned=[];railScanned=[];candidates=core.nearby(stations,center(),stations.length);if(!silent){places=[];render();say('Chargement des horaires de toutes les lignes…');}await departures(mine);
}
async function selectRadius(value){
 if(![250,500,1000,3000,5000,10000].includes(value)||!center()||!enabled)return false;
 manualRadius=true;radius=value;
 if(!candidates.length){controls();return true;}
 cancel();controller=new AbortController();places=[];render();say('Chargement des horaires dans le rayon choisi…');await departures(sequence);return true;
}
document.querySelectorAll('[data-radius]').forEach(button=>button.onclick=()=>selectRadius(Number(button.dataset.radius)));
window.addEventListener('wenare:teleportation',event=>{
 context=event.detail;candidates=[];expanded.clear();
 document.querySelector('.theoretical-label').textContent=projected()
  ?'🕒 Départs théoriques à partir de l’heure choisie · 60 min max'
  :'🕒 Terminus du prochain départ · attente (suivant) · 60 min max';
 start(false,true);
});
controls();
 document.addEventListener('visibilitychange',()=>{if(document.hidden){cancel();say('Consultation suspendue pendant votre absence.');}else if(enabled)start();});
 window.addEventListener('online',()=>{if(enabled&&!document.hidden)start(true);});
 window.addEventListener('pageshow',event=>{if(event.persisted&&enabled)start();});
 window.WenareOverview={returnToPosition,selectRadius,resolveStop:call=>teleportCore.resolveStop(call,locations),refreshDepartures(){if(!enabled||!center()||!candidates.length)return;cancel(false);for(const row of results.values())row.refreshPending=true;loading=false;scanned=[];railScanned=[];controller=new AbortController();departures(sequence);},refreshDomain(){if(!enabled||!center()||!candidates.length)return;cancel(false);loading=false;scanned=[];railScanned=[];controller=new AbortController();render();departures(sequence);}};
 start();
})();
