(function(root){
'use strict';
const nodes=new Map(), models=new WeakMap();
const hour=value=>new Date(value).toLocaleTimeString('fr-FR',{timeZone:'Europe/Paris',hour:'2-digit',minute:'2-digit'}).replace(':',' h ');
const estimatedHour=value=>hour(Math.round(Date.parse(value)/60000)*60000);
const age=(view,now)=>Math.max(0,Math.round((now-Date.parse(view.realtime.sourceRecordedAtUtc))/1000));
const value=view=>view.real?view.realtimeLabel:view.theoreticalLabel;
let dialog,trigger;
function element(tag,text){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;return el;}
function chip(el,view){
 el.textContent=value(view);
 el.dataset.live=String(view.real);
 el.dataset.animation=view.animation;
}
function ensureDialog(){
 if(dialog)return;
 dialog=element('dialog');dialog.id='passage-detail';
 dialog.setAttribute('aria-labelledby','passage-stop');
 dialog.innerHTML='<h2 id="passage-stop"></h2><p class="route"><b></b> → <span></span></p><div class="chosen"><span class="passage-chip"></span><strong></strong></div><table><thead><tr><th scope="col">Passage</th><th scope="col">Officiel</th><th scope="col">Estimation</th></tr></thead><tbody></tbody></table><p class="why"></p><form method="dialog"><button autofocus>Fermer</button></form>';
 document.body.append(dialog);
 dialog.addEventListener('close',()=>{if(trigger?.isConnected)trigger.focus();trigger=null;});
}
function draw(){
 const data=models.get(trigger)?.details?.();
 if(!data?.rows[1])return false;
 const {rows,reference,projected}=data,view=rows[1];
 const find=s=>dialog.querySelector(s);
 find('h2').textContent=data.stop;find('.route b').textContent=data.line;
 find('.route span').textContent=data.destination||'Direction non renseignée';
 chip(find('.chosen span'),view);
 find('.chosen strong').textContent=view.real?'Estimation temps réel':'Horaire officiel';
 const body=find('tbody');body.replaceChildren();
 rows.forEach((v,i)=>{
  const tr=element('tr'),title=element('th',['Précédent','Sélectionné','Suivant'][i]);title.scope='row';
  if(i===1)tr.className='selected';
  const rt=element('td',!v||i===0?'—':projected?'Théorique seul':v.cancelled?'Annulé':v.real?estimatedHour(v.realtime.expectedTimeUtc):v.expired?estimatedHour(v.expired.expectedTimeUtc):'Indisponible');
  if(i>0&&v?.expired)rt.append(element('small','Dernière estimation connue · périmée'));
  if(i>0&&v?.real)rt.append(element('small','Il y a '+age(v,reference)+' s'));
  tr.append(title,element('td',v?hour(v.theory.scheduledTimeUtc):'—'),rt);body.append(tr);
 });
 const official=hour(view.theory.scheduledTimeUtc);
 const vehicle=({bus:'le bus',metro:'le métro',tram:'le tram',rer:'le RER',train:'le train'})[data.mode]||'le passage';
 find('.why').textContent=view.real?'Wenare affiche '+value(view)+' en rouge : '+vehicle+' est estimé à '+estimatedHour(view.realtime.expectedTimeUtc)+', selon une information reçue il y a '+age(view,reference)+' secondes. L’heure officielle est '+official+'.':'Wenare affiche '+value(view)+' en noir d’après l’horaire officiel de '+official+'. '+(projected?'La consultation porte sur l’heure choisie.':view.expired?'La dernière estimation a dépassé le seuil de fraîcheur de deux minutes.':'Aucune estimation fiable n’est disponible pour ce passage.');
 return true;
}
function update(node,view){
 models.set(node,view);chip(node,view);
 node.setAttribute('aria-label',value(view)+' · '+(view.real?'Estimation temps réel':'Horaire officiel')+' · Voir les horaires du passage');
 return node;
}
function create(view,key,{secondary=false,sourceKey=key}={}){
 let node=nodes.get(key);
 if(!node){
  node=element('button');node.type='button';node.className='departure-pair passage-chip';node.dataset.visitKey=key;
  node.setAttribute('aria-haspopup','dialog');
  node.onclick=e=>{e.stopPropagation();ensureDialog();trigger=node;dialog.dataset.serviceKey=node.dataset.serviceKey||'';if(draw())dialog.showModal();};
  nodes.set(key,node);
  if(nodes.size>1000)for(const [k,n] of nodes)if(n!==node&&!n.isConnected)nodes.delete(k);
 }
 node.dataset.sourceKey=sourceKey;node.classList.toggle('is-following',secondary);return update(node,view);
}
function syncDialog(){if(dialog?.open&&(!trigger?.isConnected||!draw()))dialog.close();}
function refresh(views){
 for(const node of nodes.values()){const view=views.get(node.dataset.sourceKey);if(view&&node.isConnected)update(node,view);}
 syncDialog();
}
root.WenareRealtimeUI={create,update,refresh,syncDialog};
})(globalThis);
