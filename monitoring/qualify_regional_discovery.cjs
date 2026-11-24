const assert = require('node:assert/strict');
const {chromium} = require('playwright');

const site = 'https://timetogrowup.github.io/P-123-wenare/';
const api = 'https://wenare-passages.onrender.com';
const batch = api + '/api/v2/capabilities/query';
const key = s => JSON.stringify([s.stopId, s.lineId, s.directionId]);

async function qualify() {
  const browser = await chromium.launch();
  const started = new Date().toISOString();
  let sent = 0, blockedDepartures = 0;
  try {
    const context = await browser.newContext({
      viewport: {width: 390, height: 844},
      geolocation: {latitude: 48.8574, longitude: 2.3515},
      permissions: ['geolocation'], serviceWorkers: 'block'
    });
    const page = await context.newPage();
    await page.route(api + '/**', route => {
      const req = route.request();
      if (req.url() === batch && req.method() === 'POST' && !sent) {
        sent++;
        return route.continue();
      }
      if (new URL(req.url()).pathname.endsWith('/departures')) blockedDepartures++;
      return route.abort();
    });
    const observed = page.waitForResponse(
      res => res.url() === batch && res.request().method() === 'POST', {timeout: 80000}
    );
    // Attach a rejection handler while navigation and scrolling are still pending.
    observed.catch(() => {});
    await page.goto(site, {waitUntil: 'domcontentloaded'});
    const chip = page.locator('.place-summary .passage-chip').first();
    await chip.waitFor({timeout: 60000});
    await chip.scrollIntoViewIfNeeded();
    const response = await observed;
    const query = response.request().postDataJSON();
    const body = await response.json();
    console.log(JSON.stringify({started, finished: new Date().toISOString(), status: response.status(),
      generation: query.generationId, services: query.services.length, decisions: body.services?.length,
      error: body.error, blockedDepartures, upstreamAllowed: false}));
    assert.equal(response.status(), 200);
    assert.equal(body.schemaVersion, 2);
    assert.equal(body.generationId, query.generationId);
    assert.ok(query.services.length > 0 && query.services.length <= 32);
    assert.deepEqual(body.services.map(key).sort(), query.services.map(key).sort());
    assert.equal(sent, 1);
  } finally {
    console.log(JSON.stringify({started, closed: new Date().toISOString(), sent, blockedDepartures}));
    await browser.close();
  }
}
qualify().catch(error => {console.error(error); process.exitCode = 1;});
