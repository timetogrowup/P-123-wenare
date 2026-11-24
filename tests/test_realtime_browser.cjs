const { chromium, webkit } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');

async function verify(engine, name) {
  const browser = await engine.launch({headless: true});
  try {
    const page = await browser.newPage({viewport: {width: 390, height: 844}});
    await page.goto('http://127.0.0.1:8765/maquettes/temps-reel/');
    const chips = page.locator('#passes .block');
    assert.deepEqual(await chips.allTextContents(), ['11′', '20′']);
    await page.locator('#passes button').nth(1).click();
    assert.match(await page.locator('#why').innerText(), /20′ en rouge.*12 h 02.*33 secondes.*12 h 08/);
    assert.equal(await page.locator('#rows tr').count(), 3);
    await page.getByText('Fermer', {exact:true}).click();
    await page.locator('#expiry').click();
    assert.equal(await page.locator('#passes .live').count(), 0);
    await page.locator('#expiry').click();
    for (const [scenario, animated] of [['imminent',1], ['limit',0], ['delay',0], ['past',1]]) {
      await page.locator('#scenario').selectOption(scenario);
      assert.equal(await page.locator('#passes .urgent').count(), animated);
    }
    for (const width of [320,390,768]) {
      await page.setViewportSize({width,height:844});
      assert.ok(await chips.evaluateAll(ns=>ns.every(n=>n.offsetWidth===56 && n.offsetHeight===24)));
    }
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.equal(await chips.first().evaluate(n=>getComputedStyle(n).animationName),'none');
    await page.locator('#projection').click();
    assert.equal(await page.locator('#passes .live').count(), 0);
    await page.screenshot({path:'preuves/temps-reel/maquette-'+name+'.png'});
  } finally { await browser.close(); }
}
(async()=>{
  fs.mkdirSync('preuves/temps-reel',{recursive:true});
  for (const [name,engine] of [['chromium',chromium],['webkit',webkit]]) {
    if (!process.env.MMI_BROWSER || process.env.MMI_BROWSER===name) await verify(engine,name);
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
