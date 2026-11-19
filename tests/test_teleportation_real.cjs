const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const tt=require('../timetable.js');
const teleport=require('../teleportation.js');
const {createLoader}=require('../trip-calls-loader.js');
const mobility=require('../mobility.js');

const root=path.resolve(process.env.WENARE_DATA_ROOT||'distribution');
const read=name=>fs.readFileSync(path.join(root,name));
const json=name=>JSON.parse(read(name));
const fileFetch=async url=>new Response(read(new URL(url).pathname.replace(/^\/distribution\//,'')));

async function verify(){
 const regional=json('mobility/manifest.json');
 const now=Date.parse(regional.validFromUtc)+8*3600000;
 const network=await mobility.validate(read('mobility/index.json'),regional,now);
 const platforms=new Map(network.stations.flatMap(station=>[[station.id,station],...station.stop_point_ids.map(id=>[id,station])]));
 const reference={sight:'Auber',destination:'La Défense',origin:'Poissy'};
 const rer=network.lines.find(line=>line.mode==='rer'&&line.route_short_name==='A');
 const bus=network.lines.find(line=>line.mode==='bus'&&line.route_short_name==='6501');
 assert.ok(rer&&bus,'RER A et bus 6501 dans le référentiel');
 const loader=createLoader({baseUrl:'https://recette.invalid/distribution/',storage:false,fetch:fileFetch});

 for(const {line,name,id} of [
  {line:rer,name:reference.origin,id:'IDFM:64883'},
  {line:bus,name:'Reine Blanche',id:'IDFM:64931'}
 ]){
  const lineId=line.route_id,meta=regional.lines[lineId],folder='mobility/';
  const packet=await tt.validate(read(folder+meta.file),regional,lineId,regional.networkSha256);
  const tripCalls={manifest:regional.tripCallsManifest,generationId:regional.generationId,
   networkSha256:regional.networkSha256,timetablePackageSha256:meta.sha256};
  const choose=station=>Object.keys(packet.groups).map(key=>JSON.parse(key)).filter(([id])=>platforms.get(id)?.id===station);
  const queries=choose(id);
  assert.ok(queries.length,name+' : service daté');
  const departures=queries.flatMap(([stopId,,directionId])=>tt.response(packet,
   {stopId,lineId,directionId,mode:line.mode},now,true,tripCalls).departures);
  departures.sort((a,b)=>Date.parse(a.scheduledTimeUtc)-Date.parse(b.scheduledTimeUtc));
  let chosen=null;
  for(const event of departures){
   const calls=await loader.load(event,{now});
   const onward=calls.onwardCalls.filter(call=>call.arrivalUtcMs>now&&call.dropOffType!=='1');
   const arrive=line===rer?onward.find(call=>call.name===reference.destination):onward[0];
   if(arrive&&(line!==rer||onward.some(call=>call.name===reference.sight))){
    chosen=arrive;
    if(line===rer)assert.ok(onward.find(call=>call.name===reference.sight&&teleport.resolveStop(call,platforms)));
    break;
   }
  }
  assert.ok(chosen,name+' : course avec arrivée exploitable');
  const point=teleport.resolveStop(chosen,platforms);
  assert.ok(point&&point.stationId!==id,name+' : identifiant et coordonnées à l’arrivée');
  const at=chosen.arrivalUtcMs;
  const onward=choose(point.stationId).flatMap(([stopId,,directionId])=>tt.response(packet,
   {stopId,lineId,directionId,mode:line.mode},now,true,tripCalls,'server',{consultationTime:at}).departures);
  if(line===rer)assert.ok(onward.length,'Départs disponibles depuis La Défense');
  assert.ok(onward.every(event=>Date.parse(event.scheduledTimeUtc)>=at&&Date.parse(event.scheduledTimeUtc)<at+3600000));
  console.log(line.route_short_name,name,'→',point.label,teleport.time(at,now),onward.length+' départs de la même ligne dans l’heure');
 }
}

verify().catch(error=>{console.error(error);process.exitCode=1;});
