// Check the built release as served at /quiet-signal/ with its own Content-Security-Policy.
//   node scripts/check_hosted.cjs http://127.0.0.1:5055/quiet-signal/
// Serve it through the blog (QUIET_SIGNAL_ROOT=dist/quiet-signal) or any server that sends
// RELEASE.json's policy on HTML. Fails on any CSP violation, page error, off-origin request,
// unloaded font or image, or a result that changes with companion or theme.
const assert = require('node:assert/strict'), fs = require('node:fs');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.argv[2];
if (!base || !base.endsWith('/quiet-signal/')) { console.error('usage: node scripts/check_hosted.cjs <origin>/quiet-signal/'); process.exit(2); }
(async () => {
  const browser = await chromium.launch({headless: true});
  const page = await browser.newPage({viewport: {width: 1440, height: 1000}, reducedMotion: 'reduce'});
  const errors = [], violations = [], offsite = [], sizes = {};
  const origin = new URL(base).origin;
  await page.addInitScript(() => document.addEventListener('securitypolicyviolation',
    e => (window.__csp = window.__csp || []).push(`${e.violatedDirective} ${e.blockedURI}`)));
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (/Content Security Policy/i.test(m.text())) violations.push(m.text()); });
  page.on('request', r => { if (!r.url().startsWith(origin) && !r.url().startsWith('data:')) offsite.push(r.url()); });
  page.on('response', async r => { try { sizes[r.url()] = (await r.body()).length; } catch (_) {} });

  const res = await page.goto(base, {waitUntil: 'networkidle'});
  const csp = res.headers()['content-security-policy'];
  const release = JSON.parse(fs.readFileSync(process.env.RELEASE_JSON || 'dist/quiet-signal/RELEASE.json', 'utf8'));
  assert.equal(csp, release.content_security_policy, 'served CSP is not the release policy');
  await page.waitForFunction(() => globalThis.QUIET_DATA && document.querySelectorAll('.signal').length === 3);
  const firstLoad = Object.values(sizes).reduce((a, b) => a + b, 0);
  assert.equal(await page.locator('#results-body tr').count(), 8);
  assert(await page.evaluate(() => document.fonts.check('16px Plex') && document.fonts.check('italic 16px Libre')), 'fonts not loaded');
  assert(await page.evaluate(() => getComputedStyle(document.getElementById('pet')).backgroundImage.includes('spritesheet')), 'companion sprite not applied');
  assert(await page.evaluate(() => [...document.querySelectorAll('#legend i')].every(i => i.style.background !== '')), 'legend swatches lost colour');

  for (const href of await page.evaluate(() => [...document.querySelectorAll('link[rel~=icon],link[rel=apple-touch-icon]')].map(l => l.href)))
    assert.equal((await page.request.get(href)).status(), 200, `icon ${href}`);
  const og = await page.evaluate(() => document.querySelector('meta[property="og:image"]').content);
  assert.equal((await page.request.get(base + og.split('/quiet-signal/')[1])).status(), 200, 'og:image not in release');
  await page.locator('#run').click();
  const same = await page.locator('#outcome').textContent();
  for (const pet of ['aster', 'buer', 'piko']) {
    await page.locator('#companion-select').selectOption(pet);
    assert.equal(await page.locator('#outcome').textContent(), same);
  }
  await page.locator('#theme').click();
  assert.equal(await page.locator('#outcome').textContent(), same);
  await page.locator('#theme').click();
  await page.locator('#companions summary').click();
  await page.waitForLoadState('networkidle');
  await page.locator('[data-pet="ochre"]').click();
  assert.match(await page.locator('#pet-name').textContent(), /Ochre/i);
  await page.locator('#world').selectOption('complementarity');
  await page.locator('#policy').selectOption('optimal'); await page.locator('#run').click();
  assert.equal(await page.locator('.signal.read').count(), 2);
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({width, height: 900});
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow at ${width}`);
  }
  await page.setViewportSize({width: 1440, height: 1000});
  await page.screenshot({path: 'results/hosted-desktop.png'});

  const r2 = await page.goto(base + 'research.html', {waitUntil: 'networkidle'});
  assert.equal(r2.headers()['content-security-policy'], release.content_security_policy);
  assert(await page.evaluate(() => { const i = document.querySelector('img'); return i && i.complete && i.naturalWidth > 0; }), 'figure did not load');
  await page.locator('a[href="index.html"]').first().click();
  await page.waitForURL(base + 'index.html');

  const csp2 = await page.evaluate(() => window.__csp || []);
  assert.deepEqual([...violations, ...csp2], [], 'CSP violations');
  assert.deepEqual(errors, [], 'page errors');
  assert.deepEqual(offsite, [], 'off-origin requests');
  const out = {base, engine: 'Chromium', content_security_policy: csp, first_load_bytes_uncompressed: firstLoad,
    checks: ['release CSP on both pages', 'no CSP violations', 'no page errors', 'same-origin requests only',
      'fonts loaded', 'companion sprite applied', 'legend colours under CSP', 'companion/theme result invariance',
      'gallery and Ochre', 'seal favicons and og:image served', 'complementarity optimal pair', '320/390/768 no overflow', 'research figure', 'relative navigation back']};
  fs.writeFileSync('results/hosted_checks.json', JSON.stringify(out, null, 2) + '\n');
  await browser.close();
  console.log(`Hosted checks passed at ${base}; first load ${firstLoad.toLocaleString()} bytes uncompressed.`);
})().catch(e => { console.error(e); process.exit(1); });
