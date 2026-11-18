/* Uses the generated real dataset, independently of a browser/GPS. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createLoader}=require('../trip-calls-loader.js');
(async()=>{const root=path.resolve('distribution'),regional=JSON.parse(fs.readFileSync(path.join(root,'mobility/manifest.json'))),metro=JSON.parse(fs.readFileSync(path.join(root,'timetable/manifest.json')));if(!regional.tripCallsManifest)throw new Error('Generate trip calls before running the real-data qualification');
 const m=JSON.parse(fs.readFileSync(path.join(root,regional.tripCallsManifest.file))),selected=new Map();
 for(const [line,entry] of Object.entries(m.lines)){const mode=entry.transportKind==='metro'?'metro':regional.scope[line.replace('IDFM:','')];if(!selected.has(mode))selected.set(mode,{line,entry});}
 const results=[];
 for(const [mode,{line,entry}] of selected){const tm=entry.transportKind==='metro'?metro:regional,pkg=JSON.parse(fs.readFileSync(path.join(root,entry.transportFolder,entry.transportFile))),[key,rows]=Object.entries(pkg.groups)[0],[stopId,lineId,directionId]=JSON.parse(key),row=rows[0];let requests=0,bytes=0;
  const loader=createLoader({baseUrl:'https://test/distribution/',storage:false,fetch:async url=>{requests++;const p=new URL(url).pathname.replace('/distribution/','');const raw=fs.readFileSync(path.join(root,p));bytes+=raw.length;return new Response(raw);}});
  const selection={stopId,lineId,directionId,tripRef:row[2],serviceDate:row[1],stopSequence:row[3],gtfsDirectionId:pkg.tripDirections[row[2]],scheduledTimeUtc:new Date(row[0]*1000).toISOString(),tripCalls:{manifest:tm.tripCallsManifest,generationId:tm.generationId,networkSha256:tm.networkSha256,timetablePackageSha256:tm.lines[line].sha256}};
  const start=performance.now(),result=await loader.load(selection,{now:Date.parse(m.selectionValidFromUtc)+1});const coldMs=performance.now()-start;
  assert.ok(result.onwardCalls.length);assert.equal(result.terminus.stopId,directionId);assert.notEqual(result.terminus.arrivalUtcMs,null);assert.equal(requests,3);
  const warm=performance.now();await loader.load(selection,{now:Date.parse(m.selectionValidFromUtc)+1});assert.equal(requests,3);
  results.push({mode,line,calls:result.onwardCalls.length,coldMs:Math.round(coldMs),warmMs:Math.round(performance.now()-warm),bytes,requests});
 }
 assert.equal(selected.size,9);fs.mkdirSync('.cache',{recursive:true});fs.writeFileSync('.cache/trip-calls-real.json',JSON.stringify(results,null,2));console.log('TRIP_CALLS_REAL_OK',JSON.stringify(results));
})().catch(e=>{console.error(e);process.exit(1);});
