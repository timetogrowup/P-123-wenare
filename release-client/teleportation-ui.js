(function(){
 'use strict';
 const core=window.WenareTeleportation,state=core.createState(),favorites=core.createFavorites(()=>localStorage);
 const $=id=>document.getElementById(id);
 const create=(tag,text,cls)=>{const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
 const header=$('wenareHeader'),returnButton=$('returnToPosition');
 let physical={status:'pending',position:null,location:null},headerTimer=null,headerHeight=-1,returnPending=false,returnAttempt=0;
 function measureHeader(){
  const height=Math.ceil(header.getBoundingClientRect().height);
  if(height!==headerHeight){headerHeight=height;document.documentElement.style.setProperty('--wenare-header-height',height+'px');}
 }
 if(typeof ResizeObserver==='function')new ResizeObserver(measureHeader).observe(header);
 else{window.addEventListener('resize',measureHeader);window.addEventListener('wenare:style',measureHeader);}
 measureHeader();
 document.addEventListener('focusin',event=>{
  if(header.contains(event.target)||event.target.closest?.('dialog'))return;
  const box=event.target.getBoundingClientRect(),bottom=header.getBoundingClientRect().bottom;
  if(box.top<bottom+8&&box.bottom>0)window.scrollBy({top:box.top-bottom-8,behavior:'instant'});
 });
 function summaries(){for(const e of document.querySelectorAll('[data-projection-summary]'))e.refresh();}
 function renderHeader(announce=false){
  const context=state.read(),now=Date.now(),view=core.presentation(context,physical,now);
  header.dataset.teleportation=String(view.exploration);header.dataset.documentHidden=String(document.hidden);
  for(const [id,text] of [['wenareSituation',view.situation],['wenareQuestion',view.question],['wenareProjectionStatus',view.status]]){
   const e=$(id);if(e.textContent!==text)e.textContent=text;
  }
  $('wenareProjectionStatus').hidden=!view.exploration;
  if(announce)$('wenareSituationAnnouncement').textContent=(view.status?view.status+'. ':'')+view.situation;
  if(typeof ResizeObserver!=='function')measureHeader();
  clearTimeout(headerTimer);
  if(!document.hidden){
   const boundary=context.mode==='exploration'&&context.at!==null&&context.at>=now?context.at-now+1:Infinity;
   headerTimer=setTimeout(()=>{renderHeader();summaries();},Math.min(60000-now%60000,boundary));
  }
 }
 window.addEventListener('wenare:physical-position',e=>{physical=e.detail;renderHeader();});
 document.addEventListener('visibilitychange',()=>renderHeader());window.addEventListener('pageshow',()=>renderHeader());
 function notify(text){const e=$('wenareCommandFeedback');e.textContent=text;e.hidden=!text;}
 function syncReturn(){returnButton.setAttribute('aria-disabled',String(returnPending));returnButton.setAttribute('aria-busy',String(returnPending));}
 const glyph='<svg viewBox="0 0 80 88" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><ellipse cx="40" cy="75" rx="29" ry="9"/><circle cx="40" cy="25" r="7"/><path d="M40 38v18m-12-9 12-9 12 9M40 55l-9 13m9-13 9 13M20 29v27m40-27v27" /></svg>';
 function button(label,action,{dialog=false,disabled=false}={}){
  const b=create('button',null,'teleport-button');b.type='button';b.title=label;b.setAttribute('aria-label',label);
  b.innerHTML=glyph;b.onclick=action;b.disabled=disabled;if(dialog)b.setAttribute('aria-haspopup','dialog');return b;
 }
 function secondary(label,action){const b=create('button',label,'secondary');b.type='button';b.onclick=action;return b;}
 function closeModal(d){return new Promise(resolve=>{if(!d.open)return resolve();d.addEventListener('close',resolve,{once:true});d.close();});}
 const dialog=create('dialog',null,'trip-calls-dialog teleport-dialog');
 const heading=create('header',null,'trip-calls-header'),title=create('h2');title.id='teleportTitle';
 dialog.setAttribute('aria-labelledby',title.id);const options=create('div',null,'teleport-options');
 heading.append(title,secondary('Fermer',()=>dialog.close()));dialog.append(heading,options);document.body.append(dialog);
 let opener,confirmed=false;
 dialog.addEventListener('close',()=>{if(!confirmed)opener?.focus({preventScroll:true});});
 function show(label,trigger){title.textContent=label;opener=trigger;confirmed=false;dialog.showModal();}
 const effect=create('div',null,'teleport-effect');effect.setAttribute('aria-hidden','true');effect.innerHTML=glyph;document.body.append(effect);
 let animation;
 function animate(){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  animation?.cancel();(document.querySelector('#placesDialog[open]')||document.body).append(effect);
  animation=effect.animate([{opacity:0,transform:'translate(-50%, -50%) scale(.72)'},{opacity:1,transform:'translate(-50%, -50%) scale(1)',offset:.32},{opacity:0,transform:'translate(-50%, -50%) scale(1.16)'}],{duration:530,easing:'ease-out'});
 }
 function refresh({focus=true}={}){
  renderHeader(true);window.dispatchEvent(new CustomEvent('wenare:teleportation',{detail:state.read()}));summaries();syncReturn();
  if(focus)(document.querySelector('#placesDialog[open] [data-projection-summary]')||$('nearbyOverview')).focus();
 }
 function explore(point,at=null){
  if(!state.explore(point,at))return;
  returnAttempt++;returnPending=false;notify('');refresh();animate();
 }
 async function returnHereNow(){
  if(returnPending)return;
  const attempt=++returnAttempt,revision=state.read().revision;
  returnPending=true;syncReturn();notify('Recherche de ma position…');
  try{
   if(!window.WenareOverview?.returnToPosition)throw {code:2};
   const ready=await window.WenareOverview.returnToPosition({fresh:true});
   if(attempt!==returnAttempt||state.read().revision!==revision)return;
   if(!ready){notify('La position a changé. Réessayez le retour à ma position.');return;}
   state.reset();notify('');refresh({focus:false});
  }catch(error){
   if(attempt!==returnAttempt||state.read().revision!==revision)return;
   notify(error.code===1?'Autorisez la localisation pour revenir à votre position.':
    state.read().mode==='exploration'?'Position indisponible. La téléportation reste active. Réessayez.':'Position indisponible. Réessayez.');
  }finally{if(attempt===returnAttempt){returnPending=false;syncReturn();}}
 }
 returnButton.onclick=returnHereNow;
 function contextSummary(){
  const e=create('section',null,'teleport-context');e.dataset.projectionSummary='';e.tabIndex=-1;
  const label=create('strong'),status=create('small');e.append(label,status);
  e.refresh=()=>{
   const c=state.read();e.hidden=c.mode==='gps';if(e.hidden)return;
   label.textContent='Exploration à '+c.destination.label;
   status.textContent=c.at===null?'Maintenant':'Départs théoriques à partir de '+core.time(c.at)+(c.at<Date.now()?' · heure passée':'');
  };e.refresh();return e;
 }
 function chooseTrip(point,at,trigger,closeTrip,approximate=false,clock=Date.now){
  options.replaceChildren();if(!point)return;
  const actions=create('div',null,'teleport-actions');
  const confirm=instant=>{confirmed=true;dialog.close();closeTrip();explore(point,instant);};
  actions.append(secondary('Maintenant',()=>confirm(null)));const info=create('p');info.setAttribute('role','status');
  if(Number.isFinite(at)&&at>=clock()){
   const arrival=secondary('À l’arrivée · '+core.time(at),()=>{if(at>=clock())confirm(at);else{arrival.disabled=true;info.textContent='Cette heure d’arrivée est passée.';}});
   actions.append(arrival);info.textContent=approximate?'Heure d’arrivée théorique approximative.':'Heure d’arrivée théorique.';
  }else info.textContent=Number.isFinite(at)?'Cette heure d’arrivée est passée.':'Heure d’arrivée indisponible.';
  options.append(actions,info);show(point.label,trigger);
 }

 // The manager edits a snapshot. Only explicit selection calls explore().
 const manager=create('dialog',null,'habitual-places-dialog');manager.id='habitualPlacesDialog';manager.setAttribute('aria-labelledby','habitualPlacesTitle');
 const managerHeading=create('div',null,'habitual-heading'),managerTitle=create('h2','Lieux habituels');managerTitle.id='habitualPlacesTitle';managerTitle.tabIndex=-1;
 managerHeading.append(managerTitle,secondary('Fermer',()=>manager.close()));
 const message=create('p',null,'habitual-message');message.id='habitualPlacesMessage';message.setAttribute('role','status');message.setAttribute('aria-live','polite');
 const storageNote=create('p','Les modifications sont disponibles pour cette session. Le stockage sur cet appareil est indisponible.','habitual-storage-note');
 const list=create('div',null,'habitual-list');list.id='habitualPlacesList';
 const form=create('form',null,'habitual-form'),formTitle=create('h3','Ajouter un lieu'),source=create('p'),label=create('label','Nom du lieu'),input=create('input');
 source.id='habitualPlaceSource';label.htmlFor='habitualPlaceName';input.id='habitualPlaceName';input.name='label';input.maxLength=140;input.autocomplete='off';
 const pick=secondary('Choisir sur la carte',pickForFavorite),save=create('button','Enregistrer');save.type='submit';save.id='saveHabitualPlace';
 const cancelEdit=secondary('Annuler la modification',()=>{if(!session)return;session.editId=null;session.draft=session.initial;renderForm();input.focus();});
 const formActions=create('div',null,'teleport-actions');formActions.append(save,pick,cancelEdit);form.append(formTitle,source,label,input,formActions);
 const moment=create('form',null,'habitual-moment'),momentTitle=create('h3','Choisir un moment');
 const mode=create('select'),date=create('input'),clock=create('input'),fields=create('div',null,'habitual-moment-fields');
 mode.id='habitualMoment';date.id='habitualDate';clock.id='habitualTime';date.type='date';clock.type='time';
 for(const [value,text] of [['now','Maintenant'],['date','À une date précise']]){
  const option=create('option',text);option.value=value;mode.append(option);
 }
 const labeled=(control,text)=>{const label=create('label',text);label.htmlFor=control.id;label.append(control);return label;};
 fields.append(labeled(date,'Date'),labeled(clock,'Heure'));
 const selected=create('p');selected.setAttribute('role','status');
 const exploreButton=create('button','Explorer');exploreButton.type='submit';exploreButton.id='exploreHabitualPlace';
 moment.append(momentTitle,labeled(mode,'Moment · heure de Paris'),fields,selected,exploreButton);
 const destinationPanel=create('section',null,'habitual-destination');
 destinationPanel.append(list,form);
 const panels=create('div',null,'habitual-panels');panels.append(destinationPanel,moment);
 managerTitle.textContent='Lieu et moment';
 manager.append(managerHeading,message,storageNote,panels);document.body.append(manager);
 function renderMoment(){
  fields.hidden=mode.value!=='date';date.required=clock.required=!fields.hidden;
  selected.textContent=session?.selected?'Destination : '+session.selected.label:'Choisissez un lieu habituel ou un point sur la carte.';
  exploreButton.disabled=!session?.selected;
 }
 mode.onchange=renderMoment;
 moment.onsubmit=async event=>{
  event.preventDefault();
  if(!session?.selected)return;
  const instant=mode.value==='date'?core.parisInstant(date.value,clock.value):{status:'ok',at:null};
  if(instant.status!=='ok'){
   say({invalid:'Indiquez une date et une heure valides.',missing:'Cette heure n’existe pas à Paris ce jour-là.',ambiguous:'Cette heure arrive deux fois à Paris ce jour-là. Choisissez une autre heure.'}[instant.status]);
   clock.focus();return;
  }
  const chosen=session.selected;
  suppressManagerClose=true;session.controller?.abort();session=null;sessionId++;
  await closeModal(manager);explore(chosen,instant.at);
 };
 let session=null,sessionId=0,suppressManagerClose=false;
 manager.addEventListener('close',()=>{
  if(suppressManagerClose){suppressManagerClose=false;return;}
  const old=session;session=null;sessionId++;old?.controller?.abort();
  if(old?.returnTo)old.returnTo();else $('openHabitualPlaces').focus({preventScroll:true});
 });
 function candidate(){
  const c=state.read();if(c.mode==='exploration')return {point:{...c.destination},origin:'exploration',capturedAt:Date.now()};
  if(!core.freshPosition(physical,Date.now()))return null;
  const p=physical.position,near=physical.location;
  const name=near?.label?(near.relation==='near'?'Près de '+near.label:near.label):'Ma position — lieu non identifié';
  return {point:core.destination({lat:p.lat,lon:p.lon,label:name}),origin:'gps',capturedAt:p.timestamp};
 }
 function say(text){message.textContent=text;message.hidden=!text;storageNote.hidden=favorites.persistent();}
 function feedback(result){
  const names={created:'Lieu habituel enregistré.',renamed:'Lieu habituel renommé.',removed:'Lieu habituel supprimé.',duplicate:'Ce lieu est déjà enregistré.',invalid:'Indiquez un nom de 1 à 140 caractères, sans coordonnées GPS.', 'not-found':'Ce lieu n’est plus disponible.'};
  return result.persistence==='session'?'Modification appliquée pour cette session. Le stockage est indisponible.':names[result.status];
 }
 function renderList(){
  list.replaceChildren();const rows=favorites.read();
  if(!rows.length)list.append(create('p','Aucun lieu habituel. Ajoutez le lieu consulté ou choisissez un point sur la carte.'));
  for(const point of rows){
   const row=create('div',null,'habitual-row');row.dataset.favoriteId=point.id;
   const select=secondary(point.label,()=>{session.selected={...point};renderMoment();for(const button of list.querySelectorAll('[data-favorite-select]'))button.setAttribute('aria-pressed',String(button===select));});select.dataset.favoriteSelect=point.id;select.setAttribute('aria-pressed',String(session?.selected?.id===point.id));
   const rename=secondary('Renommer',()=>{session.editId=point.id;session.draft={point:{...point},origin:'favorite'};renderForm();input.focus();input.select();});rename.setAttribute('aria-label','Renommer '+point.label);
   const remove=secondary('Supprimer',()=>{const result=favorites.delete(point.id);if(session.selected?.id===point.id)session.selected=null;renderMoment();if(session.editId===point.id){session.editId=null;session.draft=session.initial;renderForm();}renderList();say(feedback(result));(list.querySelector('button')||input).focus();});remove.setAttribute('aria-label','Supprimer '+point.label);
   row.append(select,rename,remove);list.append(row);
  }
 }
 function renderForm(){
  const draft=session?.draft;
  formTitle.textContent=session?.editId?'Renommer le lieu':'Ajouter un lieu';
  source.textContent=draft?(draft.origin==='gps'?'Position réelle relevée à '+core.time(draft.capturedAt):draft.origin==='exploration'?'Lieu projeté':draft.origin==='map'?'Point sélectionné sur la carte':'Lieu habituel')+' : '+draft.point.label:
   'Position actuelle indisponible. Choisissez un lieu sur la carte.';
  input.value=draft?.point.label||'';save.disabled=!draft;cancelEdit.hidden=!session?.editId;pick.hidden=!!session?.editId;
 }
 function openHabitualPlaces({candidate:given=null,returnTo=null}={}){
  if(manager.open)return;
  session?.controller?.abort();
  const initial=given||candidate();session={id:++sessionId,initial,draft:initial,selected:initial?.point??null,editId:null,returnTo,controller:null};
  mode.value='now';date.value='';clock.value='';renderList();renderForm();renderMoment();say('');manager.showModal();managerTitle.focus();
 }
 form.onsubmit=event=>{
  event.preventDefault();if(!session?.draft)return;
  const result=session.editId?favorites.rename(session.editId,input.value):favorites.create({...session.draft.point,label:input.value,labelKind:input.value.trim()===session.draft.point.label?session.draft.point.labelKind:'named'});
  say(feedback(result));if(!['created','renamed'].includes(result.status))return;
  session.selected={...result.favorite};renderMoment();session.editId=null;session.draft={point:{...result.favorite},origin:'favorite'};renderList();renderForm();
  Array.from(list.querySelectorAll('[data-favorite-select]')).find(e=>e.dataset.favoriteSelect===result.favorite.id)?.focus();
 };
 async function pickForFavorite(){
  const current=session;if(!current)return;
  if(current.draft)current.draft={...current.draft,point:{...current.draft.point,label:input.value||current.draft.point.label,labelKind:input.value.trim()&&input.value.trim()!==current.draft.point.label?'named':current.draft.point.labelKind}};
  current.controller?.abort();current.controller=new AbortController();const id=current.id;
  suppressManagerClose=true;await closeModal(manager);
  let result;
  try{result=await window.WenarePlacesMapUI.pickPoint({initialPoint:current.draft?.point,signal:current.controller.signal});}
  catch{result={status:'error',message:'La carte est indisponible. Réessayez.'};}
  if(session!==current||id!==sessionId)return;
  if(result.status==='selected'){current.draft={point:{...result.point},origin:'map',capturedAt:Date.now()};current.selected={...result.point};renderList();renderMoment();}
  renderForm();say(result.status==='error'?result.message:'');manager.showModal();input.focus();
 }
 $('openHabitualPlaces').onclick=()=>openHabitualPlaces();
 window.WenareTeleportationUI={button,secondary,contextSummary,explore,add:point=>openHabitualPlaces({candidate:{point:{...point},origin:'map',capturedAt:Date.now()}}),openHabitualPlaces,chooseTrip,read:state.read};
 syncReturn();renderHeader();
})();
