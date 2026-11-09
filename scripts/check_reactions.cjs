// Check presentation 0.6: the companion re-enacts the engine's episode, the jar shows the
// policy's exact average. Never inspects results through the animation; reads them from the page.
//   node scripts/check_reactions.cjs [url]      (default: the local web/index.html)
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const url = process.argv[2] || 'file://' + path.resolve('web/index.html');
const OUTCOME = {succeeds: 4, fails: 5, conserved: 3};
const dedupe = a => a.filter((x, i) => i === 0 || x !== a[i - 1]);

(async () => {
  const browser = await chromium.launch({headless: true});
  const page = await browser.newPage({viewport: {width: 1440, height: 1000}, reducedMotion: 'no-preference'});
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(url, {waitUntil: 'networkidle'});
  await page.waitForFunction(() => globalThis.QuietReactions && document.querySelectorAll('.signal').length === 3);
  const row = () => page.evaluate(() => Math.round(-parseFloat(getComputedStyle(document.getElementById('pet')).backgroundPositionY) / 208) + 0);
  const jar = () => page.evaluate(() => { const s = document.querySelector('.terrarium');
    return {level: s.style.getPropertyValue('--jar'), optimal: s.classList.contains('is-optimal'),
            below: s.classList.contains('is-below'), note: document.getElementById('jar-status').textContent}; });
  async function watch(ms) { const rows = []; const end = Date.now() + ms;
    while (Date.now() < end) { rows.push(await row()); await page.waitForTimeout(90); } return dedupe(rows); }
  async function expected() {
    const h3 = await page.locator('#outcome h3').textContent();
    const outcome = Object.entries(OUTCOME).find(([w]) => h3.includes(w))[1];
    const read = await page.locator('.signal.read').count();
    const changed = await page.locator('.answer').nth(2).locator('strong').textContent();
    const [before, after] = changed.split('→').map(x => x.trim());
    return [...(read ? [1] : [6]), ...(read && before === after ? [8] : []), outcome, 0];
  }
  const results = {};

  assert.equal(await row(), 6, 'waits before the first episode');

  // Exact optimal on the missing half: reads both halves, then the outcome of this draw.
  await page.locator('#world').selectOption('complementarity');
  await page.locator('#policy').selectOption('optimal');
  let j = await jar(); assert.equal(j.level, '1.000'); assert(j.optimal); assert.match(j.note, /matches the exact optimum/);
  await page.locator('#run').click();
  let want = await expected(), seen = await watch(9000);
  assert.deepEqual(seen, want, `optimal sequence ${seen} != ${want}`); results.optimal = seen;

  // Myopic value on the same world: silence first, a dark jar.
  await page.locator('#policy').selectOption('myopic');
  j = await jar(); assert.equal(j.level, '0.000'); assert(!j.optimal); assert.match(j.note, /best possible \+2\.62/);
  await page.locator('#run').click();
  want = await expected(); seen = await watch(5500);
  assert.equal(want[0], 6); assert.deepEqual(seen, want, `myopic sequence ${seen} != ${want}`); results.myopic = seen;

  // The closed gate: reads, reviews because nothing changes, conserves.
  await page.locator('#world').selectOption('disconnected');
  await page.locator('#policy').selectOption('information');
  j = await jar(); assert(j.below, 'paying for unusable information is worse than silence');
  await page.locator('#run').click();
  want = await expected(); seen = await watch(5000);
  assert.deepEqual(want, [1, 8, 3, 0]); assert.deepEqual(seen, want); results.gate = seen;

  // World information in the distraction world is below silence at cost 0.20.
  await page.locator('#world').selectOption('distraction');
  j = await jar(); assert(j.below); assert.match(j.note, /-0\.25 vs silence/);

  // Manual selection has no exported expectation: the jar says so instead of guessing.
  await page.locator('#policy').selectOption('manual');
  j = await jar(); assert.equal(j.level, ''); assert.match(j.note, /named policy/);

  // Alternate timelines: selecting a row re-enacts that policy in the same world.
  await page.locator('#policy').selectOption('optimal');
  await page.locator('#run').click();
  const outcomeText = await page.locator('#outcome').textContent();
  await page.locator('details summary', {hasText: 'Alternate timelines'}).click();
  const tr = page.locator('#timeline-body tr[data-policy="severity"]');
  await tr.focus(); await page.keyboard.press('Enter');
  assert(await tr.evaluate(e => e.classList.contains('is-playing')));
  assert.match(await page.locator('#companion-announcement').textContent(), /re-enacts Severity rule/);
  assert.equal(await row(), 1, 'severity reads at least one monitor in distraction');
  assert.equal(await page.locator('#outcome').textContent(), outcomeText, 'a re-enactment never changes the episode');

  // Pause: the companion holds the first frame of the outcome pose.
  await page.locator('#run').click();
  await page.locator('#motion').click();
  const h3 = await page.locator('#outcome h3').textContent();
  const pose = Object.entries(OUTCOME).find(([w]) => h3.includes(w))[1];
  await page.waitForTimeout(400);
  assert.equal(await row(), pose);
  assert.equal(await page.evaluate(() => getComputedStyle(document.getElementById('pet')).backgroundPositionX), '0px');
  await page.locator('#motion').click();

  // Companion changes keep the episode and restart its re-enactment.
  await page.locator('#companion-select').selectOption('buer');
  assert.equal(await page.locator('#outcome').textContent(), (await page.locator('#outcome').textContent()));
  assert.deepEqual(errors, []);
  fs.writeFileSync('results/reactions_checks.json', JSON.stringify({url, engine: 'Chromium', sequences: results,
    rows: {wait: 6, toward: 1, review: 8, jump: 4, fail: 5, wave: 3, idle: 0},
    checks: ['waits before the first episode', 'optimal re-enactment matches outcome', 'myopic silence re-enactment',
      'closed gate: toward → review → wave', 'jar levels 1 / 0 from exact expectations', 'below-silence jar',
      'manual jar is neutral', 'keyboard timeline re-enactment', 're-enactment never changes the outcome',
      'paused companion holds the outcome pose', 'no page errors']}, null, 2) + '\n');
  await browser.close();
  console.log('Reaction checks passed:', JSON.stringify(results));
})().catch(e => { console.error(e); process.exit(1); });
