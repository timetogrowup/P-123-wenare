const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');

(async()=>{
 for(const engine of [chromium,webkit]){
  const browser=await engine.launch();
  try{
   const page=await browser.newPage({viewport:{width:360,height:640}});
   await page.setContent(`<style>button{display:block;width:140px;height:40px}
     #cover{position:absolute;left:0;top:120px;width:170px;height:60px;background:white}</style>
   <div id="nearbyCards" style="position:absolute;top:0;left:0">
     <button data-meter-key="one" data-meter-mode="bus" data-live="false">3′</button>
     <button data-meter-key="two" data-meter-mode="rer" data-live="false">5′</button>
     <button data-meter-key="one" data-meter-mode="bus" data-live="true">2′</button>
     <button data-meter-key="covered" data-meter-mode="train" data-live="true">5′</button>
   </div><div id="cover"></div>
   <div id="railCards" style="position:absolute;top:1000px">
     <button data-meter-key="later" data-meter-mode="tram" data-live="true">1′</button>
   </div>`);
   for(const file of ['realtime-core.js','realtime-loader.js'])await page.addScriptTag({path:path.join(__dirname,'..',file)});
   const rows=await page.evaluate(()=>{
    const output=[], meter=WenareRealtimeLoader.createVisibleMeter({send:r=>output.push(r),now:()=>60000});
    meter.advance();
    WenareRealtimeLoader.sampleVisibleChips(document,innerWidth,innerHeight,meter.see);
    meter.flush();
    return output;
   });
   assert.deepEqual(rows,[[1,[['bus',1,1],['rer',1,0]]]]);
   console.log(engine.name(),'visible list counts verified');
  }finally{await browser.close();}
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
