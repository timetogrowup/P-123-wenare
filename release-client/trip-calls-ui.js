(function(){'use strict';
const core=window.WenareTripCalls,loader=window.WenareTripCallsLoader.createLoader();
const make=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
const dialog=make('dialog',undefined,'trip-calls-dialog');dialog.id='tripCallsDialog';dialog.setAttribute('aria-labelledby','tripCallsTitle');
const header=make('header',undefined,'trip-calls-header'),title=make('h2','Arrêts de votre transport');title.id='tripCallsTitle';
const close=make('button','Fermer','trip-calls-close');close.type='button';close.onclick=()=>dialog.close();header.append(title,close);
const description=make('p',undefined,'trip-calls-description');
const select=make('button',undefined,'trip-calls-picker-trigger');select.type='button';select.id='tripCallsDeparture';
select.setAttribute('aria-haspopup','dialog');
const picker=make('dialog',undefined,'trip-calls-dialog trip-calls-picker');picker.id='tripCallsPicker';
const pickerTitle=make('h2','Choisir un départ');pickerTitle.id='tripCallsPickerTitle';
picker.setAttribute('aria-labelledby',pickerTitle.id);
const pickerHeader=make('header',undefined,'trip-calls-header'),pickerClose=make('button','Retour','trip-calls-close');
pickerClose.type='button';pickerClose.onclick=()=>picker.close();pickerHeader.append(pickerTitle,pickerClose);
const departures=make('div',undefined,'trip-calls-options');picker.append(pickerHeader,departures);document.body.append(picker);
const status=make('p',undefined,'trip-calls-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
const content=make('div',undefined,'trip-calls-content'),actions=make('div',undefined,'trip-calls-actions');
const retry=make('button','Réessayer'),refresh=make('button','Actualiser les départs');retry.type=refresh.type='button';actions.append(retry,refresh);
dialog.append(header,description,select,status,content,actions);document.body.append(dialog);
let session=null,controller=null,revision=0,expiryTimer=null;
const messages={unavailable:'La desserte de ce départ n’est pas disponible dans ces données.',expired:'Ces horaires ont expiré. Actualisez les départs pour consulter une offre valide.',version_mismatch:'La desserte et le départ ne correspondent pas à la même version. Actualisez les départs.',offline_missing:'Cette desserte n’a pas été téléchargée. Réessayez avec une connexion.',network_error:'La desserte n’a pas pu être chargée. Réessayez avec une connexion.',corrupt:'Les données de desserte sont invalides. Réessayez ou actualisez les départs.'};
function now(event){const a=event.clockAnchor;if(a&&Number.isFinite(a.server)&&Number.isFinite(a.mono))return a.server+performance.now()-a.mono;return Date.now();}
function item(call,origin,terminal,event){const li=make('li',undefined,'trip-calls-stop'+(terminal?' is-terminus':''));const line=make('div',undefined,'trip-calls-stop-line');const at=terminal?call.arrivalUtcMs??call.departureUtcMs:call.departureUtcMs??call.arrivalUtcMs;line.append(make('strong',call.name),make('span',at===null?' · Horaire non renseigné':' · '+core.time(at,origin),'trip-calls-time'));li.append(line);
 const details=[];if(terminal)details.push('Terminus');if(call.platform)details.push('Quai '+call.platform);if(call.pickupType==='1'&&call.dropOffType!=='1')details.push('Descente uniquement');if(call.conditional)details.push('Desserte conditionnelle');if(call.approximate)details.push('Horaire approximatif fourni par la source');if(details.length)li.append(make('small',details.join(' · ')));const point=window.WenareOverview?.resolveStop(call);
 const usable=!!point&&call.dropOffType!=='1';
 const jump=WenareTeleportationUI.button(usable?'Explorer '+call.name:'Exploration indisponible à '+call.name,()=>WenareTeleportationUI.chooseTrip(point,dialog.dataset.state==='expired'?null:call.arrivalUtcMs,jump,()=>{session=null;dialog.close();},call.approximate,()=>now(event)),{dialog:true,disabled:!usable});
 li.append(jump);if(!usable)li.append(make('small',point?'Descente indisponible à cet arrêt.':'Coordonnées de cet arrêt indisponibles.'));return li;}
async function show(){
 if(!session)return;const mine=++revision;controller?.abort();controller=new AbortController();clearInterval(expiryTimer);const event=session.events[session.selected];
 content.replaceChildren();actions.hidden=true;status.textContent='Chargement de tous les arrêts jusqu’au terminus…';dialog.dataset.state='loading';description.textContent='Depuis '+session.place.name+' · '+new Date(event.scheduledTimeUtc).toLocaleDateString('fr-FR',{timeZone:'Europe/Paris'})+' · '+core.time(Date.parse(event.scheduledTimeUtc));
 try{const data=await loader.load(event,{signal:controller.signal,now:now(event)});if(mine!==revision||!dialog.open)return;
  dialog.dataset.state=data.complete?'ready':'partial';status.textContent=(data.complete?'Horaires théoriques · '+data.onwardCalls.length+' arrêts suivants.':'Parcours ou horaires incomplets : les informations manquantes sont indiquées.')+(event.clockSource==='device'?' Horloge de l’appareil utilisée.':'');
  const origin=make('section',undefined,'trip-calls-origin');origin.append(make('small','Votre arrêt de départ'),make('strong',data.originCall.name),make('span','Départ prévu '+core.time(data.originCall.departureUtcMs)+' · '+new Date(data.originCall.departureUtcMs).toLocaleDateString('fr-FR',{timeZone:'Europe/Paris'})));
  content.append(origin);const list=make('ol',undefined,'trip-calls-list');list.setAttribute('aria-label','Arrêts suivants jusqu’au terminus');for(const call of data.onwardCalls)list.append(item(call,data.originCall.departureUtcMs,call.stopSequence===data.terminus.stopSequence,event));content.append(list,make('p',data.source+' · horaires théoriques, perturbations non connues.','trip-calls-source'));
  expiryTimer=setInterval(()=>{if(now(event)>=Date.parse(data.validity.until)){status.textContent='Ces données ont expiré. Le parcours ouvert est conservé à titre indicatif.';dialog.dataset.state='expired';actions.hidden=false;retry.hidden=true;}},1000);
 }catch(error){if(error.name==='AbortError'||mine!==revision||!dialog.open)return;const code=error.code||'network_error';dialog.dataset.state=code;status.textContent=messages[code]||messages.network_error;actions.hidden=false;retry.hidden=['unavailable','expired','version_mismatch'].includes(code);}
}
function choiceText(event){return core.time(Date.parse(event.scheduledTimeUtc),Date.parse(session.events[session.current].scheduledTimeUtc))+' · '+(event.destinationName||'Destination non renseignée');}
function updateTrigger(){select.textContent='Départ consulté · '+choiceText(session.events[session.selected])+' ▾';}
select.onclick=()=>{
 if(!session)return;
 departures.replaceChildren();
 session.events.forEach((event,index)=>{
  const option=make('button',choiceText(event),'trip-calls-option');option.type='button';
  if(index===session.current)option.append(make('small','Prochain départ'));
  if(index===session.selected)option.setAttribute('aria-current','true');
  option.onclick=()=>{session.selected=index;picker.close();updateTrigger();show();};
  departures.append(option);
 });
 picker.showModal();
 const selected=departures.children[session.selected];selected.focus({preventScroll:true});selected.scrollIntoView({block:'center'});
};
picker.addEventListener('close',()=>{if(dialog.open)select.focus({preventScroll:true});});
retry.onclick=show;refresh.onclick=()=>{dialog.close();window.WenareOverview?.refreshDepartures?.();};
dialog.addEventListener('close',()=>{if(dialog.open)return;revision++;controller?.abort();clearInterval(expiryTimer);const old=session;session=null;content.replaceChildren();if(old){let target=old.button;if(!target?.isConnected)target=[...document.querySelectorAll('button.trip-calls-trigger')].find(b=>b.dataset.placeId===old.place.id&&b.dataset.lineId===old.lineId&&b.dataset.direction===old.direction);target?.focus({preventScroll:true});}});
window.WenareTripCallsUI={open(group,place,button){const current=group.events[0].event;
 const key=event=>event.tripRef?JSON.stringify([event.serviceDate,event.tripRef,event.nextStopSequence]):event.id;
 const currentTime=current.consultationTime??now(current),currentKey=key(current),byCourse=new Map();
 for(const event of [current,...group.events.map(x=>x.event),...(group.tripChoices||[])]){
  const id=key(event),previous=byCourse.get(id);
  if(!previous||(id!==currentKey&&Date.parse(event.scheduledTimeUtc)<Date.parse(previous.scheduledTimeUtc)))byCourse.set(id,event);
 }
 const sorted=[...byCourse.values()].sort((a,b)=>Date.parse(a.scheduledTimeUtc)-Date.parse(b.scheduledTimeUtc));
 const past=sorted.filter(event=>key(event)!==currentKey&&(current.consultationTime===undefined?Date.parse(event.scheduledTimeUtc)<=currentTime:Date.parse(event.scheduledTimeUtc)<currentTime)).slice(-3);
 const future=sorted.filter(event=>key(event)!==currentKey&&(current.consultationTime===undefined?Date.parse(event.scheduledTimeUtc)>currentTime:Date.parse(event.scheduledTimeUtc)>=currentTime)).slice(0,10);
 session={events:[...past,current,...future],current:past.length,selected:past.length,place:{id:String(place.id),name:place.name},button,lineId:group.lineId,direction:String(group.gtfsDirectionId??'unknown')};
 title.textContent=(button?.textContent||group.lineName)+' · arrêts jusqu’au terminus';updateTrigger();if(!dialog.open)dialog.showModal();close.focus();show();}};
})();
