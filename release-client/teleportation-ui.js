(function(){
 'use strict';
 const core=window.WenareTeleportation, state=core.createState(), favorites=core.createFavorites(()=>localStorage);
 const $=id=>document.getElementById(id);
 const create=(tag,text,cls)=>{
  const el=document.createElement(tag);
  if(text)el.textContent=text;
  if(cls)el.className=cls;
  return el;
 };
 const glyph='<svg viewBox="0 0 80 88" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><ellipse cx="40" cy="75" rx="29" ry="9"/><circle cx="40" cy="25" r="7"/><path d="M40 38v18m-12-9 12-9 12 9M40 55l-9 13m9-13 9 13M20 29v27m40-27v27" /></svg>';
 function button(label,action,{dialog=false,disabled=false}={}){
  const b=create('button',null,'teleport-button');
  b.type='button';b.title=label;b.setAttribute('aria-label',label);
  b.innerHTML=glyph;b.onclick=action;b.disabled=disabled;
  if(dialog)b.setAttribute('aria-haspopup','dialog');
  return b;
 }
 function secondary(label,action){
  const b=create('button',label,'secondary');b.type='button';b.onclick=action;return b;
 }
 const dialog=create('dialog',null,'trip-calls-dialog teleport-dialog');
 const heading=create('header',null,'trip-calls-header');
 const title=create('h2');title.id='teleportTitle';
 dialog.setAttribute('aria-labelledby',title.id);
 const options=create('div',null,'teleport-options');
 heading.append(title,secondary('Fermer',()=>dialog.close()));
 dialog.append(heading,options);document.body.append(dialog);
 let opener,confirmed=false;
 dialog.addEventListener('close',()=>{if(!confirmed)opener?.focus({preventScroll:true});});
 function show(label,trigger){
  title.textContent=label;opener=trigger;confirmed=false;
  dialog.showModal();
 }
 function notify(text){
  for(const el of document.querySelectorAll('.teleport-feedback'))el.textContent=text;
 }
 function add(point,notice=notify){
  notice(favorites.add(point)?'Lieu habituel enregistré.':'Lieu disponible pour cette session. Le stockage est indisponible.');
 }
 const effect=create('div',null,'teleport-effect');
 effect.setAttribute('aria-hidden','true');effect.innerHTML=glyph;document.body.append(effect);
 let animation;
 function animate(){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  animation?.cancel();
  (document.querySelector('#placesDialog[open]')||document.body).append(effect);
  animation=effect.animate([
   {opacity:0,transform:'translate(-50%, -50%) scale(.72)'},
   {opacity:1,transform:'translate(-50%, -50%) scale(1)',offset:.32},
   {opacity:0,transform:'translate(-50%, -50%) scale(1.16)'}
  ],{duration:530,easing:'ease-out'});
 }
 function refresh({focus=true}={}){
  window.dispatchEvent(new CustomEvent('wenare:teleportation',{detail:state.read()}));
  for(const banner of document.querySelectorAll('.teleport-banner'))banner.refresh();
  if(focus)(document.querySelector('#placesDialog[open] .teleport-banner')||$('teleportBanner')).focus();
 }
 function explore(point,at=null){
  if(!state.explore(point,at))return;
  notify('');refresh();animate();
 }
 function reset(){
  state.reset();notify('');refresh({focus:false});
  (document.querySelector('#placesDialog[open] #placesClose')||$('openTeleportation')).focus({preventScroll:true});
 }
 function banner(){
  const el=create('section',null,'teleport-banner');el.tabIndex=-1;
  const label=create('strong'),status=create('small'),feedback=create('small',null,'teleport-feedback');
  feedback.setAttribute('role','status');
  const actions=create('div',null,'teleport-actions');
  const present=secondary('Maintenant',()=>explore(state.read().destination));
  actions.append(present,secondary('Ajouter aux lieux habituels',()=>add(state.read().destination)),secondary('Revenir à ma position',reset));
  el.append(label,status,actions,feedback);
  el.refresh=()=>{
   const context=state.read();
   el.hidden=context.mode==='gps';
   if(el.hidden)return;
   label.textContent='Exploration à '+context.destination.label;
   present.hidden=context.at===null;
   status.textContent=context.at===null?'Maintenant':'Départs théoriques à partir de '+core.time(context.at)+(context.at<Date.now()?' · heure passée':'');
  };
  el.refresh();
  return el;
 }
 function list(message){
  options.replaceChildren();
  const info=create('p',message||(!favorites.read().length?'Choisissez un point sur la carte pour enregistrer votre premier lieu.':''));info.setAttribute('role','status');options.append(info);
  for(const point of favorites.read()){
   const row=create('div',null,'teleport-actions');
   row.append(secondary(point.label,()=>{confirmed=true;dialog.close();explore(point);}));
   const remove=secondary('Supprimer',()=>{
    const ok=favorites.remove(point.id);
    list(ok?'Lieu habituel supprimé.':'Modification appliquée pour cette session.');
    options.querySelector('button')?.focus();
   });
   remove.setAttribute('aria-label','Supprimer '+point.label);row.append(remove);options.append(row);
  }
  options.append(secondary('Choisir sur la carte',()=>{confirmed=true;dialog.close();$('openPlacesMap').click();}));
 }
 function chooseTrip(point,at,trigger,closeTrip,approximate=false,clock=Date.now){
  options.replaceChildren();
  if(!point)return;
  const actions=create('div',null,'teleport-actions');
  const confirm=instant=>{confirmed=true;dialog.close();closeTrip();explore(point,instant);};
  actions.append(secondary('Maintenant',()=>confirm(null)));
  const info=create('p');info.setAttribute('role','status');
  if(Number.isFinite(at)&&at>=clock()){
   const arrival=secondary('À l’arrivée · '+core.time(at),()=>{
    if(at>=clock())confirm(at);
    else{arrival.disabled=true;info.textContent='Cette heure d’arrivée est passée.';}
   });
   actions.append(arrival);
   info.textContent=approximate?'Heure d’arrivée théorique approximative.':'Heure d’arrivée théorique.';
  }else info.textContent=Number.isFinite(at)?'Cette heure d’arrivée est passée.':'Heure d’arrivée indisponible.';
  options.append(actions,info);show(point.label,trigger);
 }
 const entry=button('Téléportation · lieux habituels',e=>{list();show('Lieux habituels',e.currentTarget);},{dialog:true});
 entry.id='openTeleportation';$('openSettings').before(entry);
 const mainBanner=banner();mainBanner.id='teleportBanner';$('nearbyOverviewTitle').after(mainBanner);
 setInterval(()=>{
  if(state.read().at!==null)for(const el of document.querySelectorAll('.teleport-banner'))el.refresh();
 },30000);
 window.WenareTeleportationUI={button,secondary,banner,explore,add,chooseTrip,read:state.read};
})();
