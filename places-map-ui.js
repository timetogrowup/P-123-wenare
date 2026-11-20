(function(){'use strict';
const teleport=WenareTeleportationUI,teleportCore=WenareTeleportation;
const initial={lat:48.8566,lon:2.3522};
let lastCenter=null,selection=null,selectionMarker=null,explorationMarker=null;
const core=WenarePlacesMap,categories=WenareOpportunities.CATEGORIES,$=id=>document.getElementById(id),el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
let snapshot=null,category='all',sources={transport:[],opportunities:[]},items=[],map=null,layers=null,positionMarker=null,radiusCircle=null,sequence=0,renderKey='',viewKey='',opener=null,tileFailed=false,autoFit=true,opening=false,openFailed=false;
const dialog=el('dialog',undefined,'places-dialog');dialog.id='placesDialog';dialog.setAttribute('aria-labelledby','placesTitle');
dialog.innerHTML='<div class="places-heading"><h2 id="placesTitle">Autour de moi · Carte</h2><button id="placesClose" type="button" class="secondary">Retour à la liste</button></div><div class="places-filters"><label for="placesRadius">Distance<select id="placesRadius"></select></label><label for="placesCategory">Ce qui m’intéresse<select id="placesCategory"></select></label></div><p id="placesStatus" class="places-status" role="status" aria-live="polite"></p><div id="placesCanvas" class="places-canvas" role="region" aria-label="Carte des lieux proposés" hidden></div><section id="placesDetail" class="places-detail" aria-label="Détail du lieu sélectionné" hidden><button id="placesDetailClose" class="secondary" type="button">Fermer la fiche</button><div id="placesDetailBody"></div></section><div id="placesLegend" class="places-legend" aria-label="Couleurs des catégories"></div><div id="placesControls" class="places-controls" hidden><button id="placesFit" type="button" class="secondary">Voir tous les lieux</button><button id="placesCenter" type="button" class="secondary">Ma position</button><button id="placesNorth" type="button" class="secondary" aria-label="Remettre le nord en haut">↑ Nord</button></div><p class="places-note">Deux doigts : tournez pour orienter le plan, écartez pour zoomer. Appuyez sur une épingle pour découvrir le lieu. Les pastilles chiffrées regroupent plusieurs lieux.</p><details class="places-information"><summary>Informations sur la carte</summary><p class="places-note">Même sélection que dans la liste · distances à vol d’oiseau · couverture partielle, disponibilités non confirmées. Le fond vectoriel IGN/Géoplateforme (ou OpenStreetMap en secours) reçoit les zones affichées et votre adresse IP. Les moteurs de rendu sont chargés depuis jsDelivr. Aucun nouvel appel GPS ni historique enregistré par cette carte.</p></details>';
document.body.append(dialog);
const banner=teleport.contextSummary();
$('placesStatus').before(banner);
const chooser=el('div',undefined,'teleport-actions');
const selectionLabel=el('span');
selectionLabel.setAttribute('aria-live','polite');
const mapJump=teleport.button('Explorer le point sélectionné',()=>{if(selection)teleport.explore(selection);},{disabled:true});
const mapFavorite=teleport.secondary('Ajouter aux lieux habituels',async()=>{
 if(!selection)return;
 const point={...selection},view=captureView();
 await closeMap();
 teleport.openHabitualPlaces({candidate:{point,origin:'map',capturedAt:Date.now()},returnTo:async()=>{await open({view});(mapFavorite.disabled?$('placesClose'):mapFavorite).focus();}});
});
mapFavorite.disabled=true;
const mapFeedback=el('small');mapFeedback.setAttribute('role','status');
const usePoint=teleport.secondary('Utiliser ce lieu',()=>{if(selection&&picker){picker.result={status:'selected',point:{...selection}};dialog.close();}});usePoint.hidden=true;usePoint.disabled=true;
let picker=null,pickerId=0;
chooser.append(teleport.secondary('Sélectionner le centre de la carte',()=>{if(map)selectCoordinates(map.getCenter());}),selectionLabel,mapJump,mapFavorite,usePoint,mapFeedback);
$('placesControls').after(chooser);
chooser.hidden=true;
function selectPoint(point){
 selection=point;selectionLabel.textContent=point?.label||'';mapFeedback.textContent='';
 mapJump.disabled=mapFavorite.disabled=usePoint.disabled=!point;
 selectionMarker?.remove();selectionMarker=null;
 if(map&&point){
  selectionMarker=L.circleMarker([point.lat,point.lon],{radius:9,color:'#743dd2',weight:3,fillOpacity:.1,interactive:false}).addTo(map);
 }
}
function selectCoordinates(latLng){
 const lat=latLng.lat,lon=((latLng.lng+180)%360+360)%360-180;
 selectPoint(teleportCore.destination({lat,lon,label:'Point sélectionné sur la carte',labelKind:'map-point'}));
}
for(const r of WenareOpportunities.RADII){const o=el('option',r.toLocaleString('fr-FR')+' m');o.value=String(r);$('placesRadius').append(o);}
for(const c of [{id:'all',short:'Tout voir'},...categories]){const o=el('option',c.short);o.value=c.id;$('placesCategory').append(o);}
const radiusColor=()=>getComputedStyle(document.documentElement).getPropertyValue('--wenare-accent').trim()||'#2463ad';
window.addEventListener('wenare:style',()=>radiusCircle?.setStyle({color:radiusColor()}));
function pos(){return snapshot?.exploration?.center||null;}
function meta(id){return categories.find(c=>c.id===id);}
function setStatus(){if(picker){$('placesStatus').textContent='Sélectionnez un point ou une épingle, puis utilisez ce lieu.';return;}const p=pos();$('placesStatus').textContent=!p?'Position GPS indisponible. La carte s’ouvre sur son dernier centre ou sur l’Île-de-France. Sélectionnez un point pour l’explorer.':items.length?items.length+' lieu'+(items.length>1?'x':'')+' · '+snapshot.radius.toLocaleString('fr-FR')+' m · '+(category==='all'?'Tous les domaines':meta(category).title)+(tileFailed?' · Fond IGN incomplet ou indisponible : fond de secours si nécessaire, épingles conservées.':''):'Aucun lieu proposé dans cette sélection. Essayez un autre rayon ou une autre catégorie.';}
function showPanel(body){$('placesDetailBody').replaceChildren(body);$('placesDetail').hidden=false;$('placesDetail').scrollIntoView({block:'nearest'});}
function hidePanel(){$('placesDetail').hidden=true;$('placesDetailBody').replaceChildren();}
function popup(p){const c=meta(p.category),box=el('div',undefined,'places-popup');box.append(el('h3',p.name),el('p',c.icon+' '+c.title+' · '+Math.ceil(p.distance)+' m'));
// A favorite picker only prepares a point; route and exploration actions belong to the normal map.
if(picker){box.append(el('p','Point sélectionné. Appuyez sur « Utiliser ce lieu » pour vérifier son nom avant de l’enregistrer.'));return box;}
if(p.category==='transport'){box.append(el('p',p.mapSummary||'Horaires théoriques · détails dans la liste'));const point=teleportCore.fromPlace(p);if(point)box.append(teleport.button('Explorer '+p.name,()=>teleport.explore(point)));}else{if(p.address)box.append(el('p',p.address));box.append(el('p',c.limit));}
const walk=el('button','🚶 Y aller à pied');walk.type='button';walk.onclick=()=>{dialog.close();window.WenareWalkingUI?.open(p);};box.append(walk);
const url=WenareOpportunities.safeUrl(p.url);if(url){const a=el('a','Consulter la fiche du lieu ↗');a.href=url;a.target='_blank';a.rel='noopener noreferrer';box.append(el('br'),a);}return box;}
function groupPopup(rows){const box=el('div',undefined,'places-popup');box.append(el('h3',rows.length+' lieux proches'));const list=el('div',undefined,'places-group-list');for(const p of rows){const c=meta(p.category),b=el('button',c.icon+' '+p.name+' · '+Math.ceil(p.distance)+' m');b.type='button';b.style.setProperty('--domain-color',core.COLORS[p.category]);b.onclick=()=>selectMarker(p);list.append(b);}box.append(list);return box;}
function selectMarker(p){selectPoint(teleportCore.destination({lat:p.lat,lon:p.lon,label:p.name,stationId:p.category==='transport'?String(p.id):undefined}));showPanel(popup(p));}
function drawMarkers(){if(!map)return;layers.clearLayers();for(const group of core.group(items,map.getZoom())){const single=group.items.length===1,p=group.items[0],color=group.categories.length===1?core.COLORS[p.category]:'#3e5266',html=single?'<div class="places-pin-body" style="--domain-color:'+color+'"><span>'+meta(p.category).icon+'</span></div>':'<div class="places-cluster" style="--domain-color:'+color+'">'+group.items.length+'</div><div class="places-cluster-dots">'+group.categories.map(c=>'<i style="--domain-color:'+core.COLORS[c]+'"></i>').join('')+'</div>',marker=L.marker([group.lat,group.lon],{title:single?p.name:group.items.length+' lieux : zoomer ou consulter',alt:single?meta(p.category).short+' : '+p.name:group.items.length+' lieux',icon:L.divIcon({className:'places-pin',html,iconSize:single?[30,36]:[38,38],iconAnchor:single?[15,36]:[19,19]}),keyboard:true}).addTo(layers);
if(single)marker.on('click',()=>selectMarker(p));else marker.on('click',()=>showPanel(groupPopup(group.items))).on('dblclick',()=>{map.closePopup();map.setView([group.lat,group.lon],Math.min(19,map.getZoom()+2),{animate:false});});}window.WenareMotion?.mapMarkers($('placesCanvas'));}
function fit(){const p=pos();if(!map||!p)return;const points=[[p.lat,p.lon],...items.map(p=>[p.lat,p.lon])];if(items.length)map.fitBounds(L.latLngBounds(points),{padding:[32,32],maxZoom:17,animate:false});else map.fitBounds(radiusCircle.getBounds(),{padding:[16,16],maxZoom:17,animate:false});}
function update(){items=pos()?core.select([sources.transport,sources.opportunities],category,snapshot.radius):[];$('placesRadius').value=String(snapshot?.radius||250);$('placesCategory').value=category;setStatus();$('placesLegend').replaceChildren();for(const c of categories){const count=items.filter(p=>p.category===c.id).length;if(!count)continue;const span=el('span'),dot=el('i',undefined,'domain-color-dot');dot.style.setProperty('--domain-color',core.COLORS[c.id]);span.append(dot,el('span',c.icon+' '+c.short+' · '+count));$('placesLegend').append(span);}if(!dialog.open||!map)return;
const p=pos(),physical=snapshot?.position?.coords;
$('placesCanvas').hidden=$('placesControls').hidden=chooser.hidden=false;
const exploring=snapshot?.exploration?.mode==='exploration';
$('placesCenter').textContent=exploring?'Point exploré':'Ma position';
$('placesTitle').textContent=picker?'Choisir un lieu habituel':exploring?'Autour du point exploré · Carte':'Autour de moi · Carte';
$('placesCenter').disabled=!p;
if(physical){
 positionMarker.setLatLng([physical.latitude,physical.longitude]);
 if(!map.hasLayer(positionMarker))positionMarker.addTo(map);
}else positionMarker.remove();
if(p){
 radiusCircle.setLatLng([p.lat,p.lon]).setRadius(snapshot.radius);
 if(!map.hasLayer(radiusCircle))radiusCircle.addTo(map);
}else radiusCircle.remove();
if(p&&snapshot.exploration.mode==='exploration'){
 explorationMarker.setLatLng([p.lat,p.lon]);
 if(!map.hasLayer(explorationMarker))explorationMarker.addTo(map);
}else explorationMarker.remove();
const nextKey=JSON.stringify(items.map(p=>[p.category,p.id,p.lat,p.lon,p.mapSummary]));const itemsChanged=nextKey!==renderKey;if(itemsChanged){map.closePopup();renderKey=nextKey;drawMarkers();}const nextView=JSON.stringify([p?.lat,p?.lon,snapshot?.radius,category,snapshot?.exploration?.revision]);if(nextView!==viewKey){hidePanel();if(!picker)autoFit=true;viewKey=nextView;map.invalidateSize();if(!picker)fit();}else if(itemsChanged&&autoFit)fit();}
function captureView(){return map?{center:map.getCenter(),zoom:map.getZoom(),bearing:map.getBearing(),selection:selection&&{...selection}}:null;}
function closeMap(){return new Promise(resolve=>{if(!dialog.open)return resolve();dialog.addEventListener('close',resolve,{once:true});dialog.close();});}
async function open({view=null}={}){if(opening)return;if(!dialog.open){opener=document.activeElement;openFailed=false;dialog.showModal();}const mine=++sequence;update();opening=true;$('placesStatus').textContent='Ouverture de la carte…';try{await window.WenareLoadMap();if(mine!==sequence||!dialog.open)return;const p=pos()||lastCenter||initial;$('placesCanvas').hidden=false;map=L.map('placesCanvas',{rotate:true,bearing:0,touchRotate:true,zoomAnimation:false,markerZoomAnimation:false,dragRotate:false,shiftKeyRotate:false,rotateControl:false,preventPageGestures:false});const prevent=e=>e.preventDefault(),manual=()=>{autoFit=false;};L.DomEvent.on(map.getContainer(),'mousedown touchstart wheel keydown',manual);L.DomEvent.on(map.getContainer(),'gesturestart gesturechange gestureend',prevent);map.on('unload',()=>{L.DomEvent.off(map.getContainer(),'gesturestart gesturechange gestureend',prevent);L.DomEvent.off(map.getContainer(),'mousedown touchstart wheel keydown',manual);});WenareVectorMap.attach(map,{onStatus(state){tileFailed=state==='fallback'||state==='partial';setStatus();}});layers=L.layerGroup().addTo(map);positionMarker=L.marker([p.lat,p.lon],{title:'Votre position',icon:L.divIcon({className:'places-position',iconSize:[18,18]})}).bindTooltip('Votre position');explorationMarker=L.marker([p.lat,p.lon],{title:'Point exploré',icon:L.divIcon({className:'teleport-exploration-pin',html:'◆',iconSize:[18,18]})}).bindTooltip('Point exploré');radiusCircle=L.circle([p.lat,p.lon],{radius:snapshot?.radius||250,color:radiusColor(),weight:1,dashArray:'5 6',fillOpacity:.025,interactive:false});map.setView([p.lat,p.lon],pos()||lastCenter?15:10);map.on('click',e=>selectCoordinates(e.latlng));map.on('moveend',()=>{const p=map.getCenter();lastCenter={lat:p.lat,lon:p.lng};});delete $('placesCanvas').dataset.motionPinsStarted;map.on('zoomend',drawMarkers);renderKey=viewKey='';update();if(view?.center){autoFit=false;map.setView(view.center,view.zoom||15,{animate:false});map.setBearing(view.bearing||0);if(view.selection)selectPoint(view.selection);}mapJump.hidden=mapFavorite.hidden=!!picker;usePoint.hidden=!picker;dialog.querySelector('.places-filters').hidden=!!picker;if(picker){$('placesTitle').textContent='Choisir un lieu habituel';autoFit=false;} }catch{if(mine!==sequence)return;openFailed=true;$('placesStatus').textContent='La carte est indisponible. Revenez à la liste pour consulter les lieux ou réessayez.';}finally{if(mine===sequence)opening=false;}}
$('placesDetailClose').onclick=hidePanel;
dialog.addEventListener('close',()=>{hidePanel();sequence++;opening=openFailed=false;autoFit=true;selectPoint(null);if(map){map.stop();map.touchGestures?.disable();map.remove();}map=layers=positionMarker=radiusCircle=explorationMarker=null;chooser.hidden=true;tileFailed=false;renderKey=viewKey='';$('placesCanvas').hidden=$('placesControls').hidden=true;if(!document.querySelector('dialog[open]'))opener?.focus({preventScroll:true});
 if(picker){const done=picker;picker=null;done.signal?.removeEventListener('abort',done.abort);done.resolve(done.result||{status:'cancelled'});}
 mapJump.hidden=mapFavorite.hidden=false;usePoint.hidden=true;dialog.querySelector('.places-filters').hidden=false;
});
$('openPlacesMap').onclick=()=>open();$('placesClose').onclick=()=>dialog.close();$('placesRadius').onchange=()=>window.WenareOverview?.selectRadius(Number($('placesRadius').value));$('placesCategory').onchange=()=>window.WenareOpportunitiesUI?.selectCategory($('placesCategory').value);$('placesFit').onclick=()=>{autoFit=true;fit();};$('placesCenter').onclick=()=>{const p=pos();if(p&&map){autoFit=false;map.setView([p.lat,p.lon],17,{animate:false});}};$('placesNorth').onclick=()=>{if(map){map.touchGestures?.disable();map.stop();map.setBearing(0);map.touchGestures?.enable();}};
window.addEventListener('wenare:overview',e=>{const next=e.detail;if(!next.enabled||snapshot?.exploration?.revision!==next.exploration?.revision){sources={transport:[],opportunities:[]};if(!picker)selectPoint(null);}snapshot=next;if(!snapshot.transportCount)sources.transport=[];update();if(dialog.open&&pos()&&!map&&!opening&&!openFailed)open();});
window.WenarePlacesMapUI={
 async pickPoint({initialPoint,signal}={}){
  if(signal?.aborted)return {status:'cancelled'};
  if(picker)return {status:'error',message:'Un choix de lieu est déjà en cours.'};
  if(dialog.open)await closeMap();
  return new Promise(resolve=>{
   const current={id:++pickerId,signal,resolve,result:null,abort:()=>dialog.close()};picker=current;
   signal?.addEventListener('abort',current.abort,{once:true});
   const point=teleportCore.destination(initialPoint),view=point?{center:[point.lat,point.lon],zoom:15,selection:point}:null;
   open({view}).then(()=>{if(picker===current&&openFailed){current.result={status:'error',message:'La carte est indisponible. Réessayez.'};dialog.close();}});
  });
 }
};
window.addEventListener('wenare:domain',e=>{category=e.detail.category;update();});
window.addEventListener('wenare:map-data',e=>{const {source,items:rows,revision}=e.detail;if(!Object.hasOwn(sources,source)||revision!==snapshot?.exploration?.revision)return;sources[source]=rows;update();});
})();

