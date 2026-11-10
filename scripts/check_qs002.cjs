// QS-002 page checks: the displayed table equals the Python results, every world and policy runs,
// the clock and companion follow the episode, and nothing breaks under the release CSP.
//   node scripts/check_qs002.cjs [url]     (default: local web/last-reversible-moment/index.html)
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const url = process.argv[2] || 'file://' + path.resolve('web/last-reversible-moment/index.html');
const NAMES = {none: 'No monitoring', random: 'Random', information: 'Information first', blind: 'Static value',
  aware: 'Deadline-aware value', early: 'Early-stop rule', optimal: 'Exact optimal', oracle: 'Truth now (reference) †'};
const rows = fs.readFileSync('results/qs002_benchmark.csv', 'utf8').trim().split(/\r?\n/);
const cols = rows.shift().split(',');
const py = rows.map(l => Object.fromEntries(l.split(',').map((v, i) => [cols[i], v])));
const fmt = x => { const v = +x; return (Math.abs(v) < 5e-13 ? 0 : v).toFixed(2); };

(async () => {
  const browser = await chromium.launch({headless: true});
  const page = await browser.newPage({viewport: {width: 1440, height: 1000}, reducedMotion: 'no-preference'});
  const errors = [], requests = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('request', r => requests.push(r.url()));
  await page.addInitScript(() => document.addEventListener('securitypolicyviolation', e => (window.__csp = window.__csp || []).push(e.violatedDirective)));
  await page.goto(url, {waitUntil: 'networkidle'});
  await page.waitForFunction(() => globalThis.QS2 && document.querySelectorAll('#signals .signal').length === 3);
  let compared = 0;
  for (const world of ['spare', 'narrowing', 'bell', 'now']) {
    await page.locator('#world').selectOption(world);
    for (const budget of [0, 1, 2, 3]) {
      await page.locator('#budget').fill(String(budget));
      const table = await page.locator('#results-body tr').evaluateAll(trs => trs.map(tr => [tr.cells[0].textContent, tr.cells[1].textContent]));
      for (const r of py.filter(r => r.world === world && +r.budget === budget && +r.cost === 0.1)) {
        const shown = table.find(([n]) => n === NAMES[r.policy]);
        assert(shown, `${r.policy} missing`); assert.equal(shown[1], fmt(r.net), `${world} B${budget} ${r.policy}`); compared++;
      }
      for (const policy of ['none', 'random', 'information', 'blind', 'aware', 'early', 'optimal']) {
        await page.locator('#policy').selectOption(policy); await page.locator('#run').click();
        assert(await page.locator('#outcome').isVisible());
        const reads = await page.locator('#clock .ck-read').count();
        assert(reads <= budget, 'clock shows no more readings than the budget');
      }
      await page.locator('#policy').selectOption('aware');
    }
  }
  // The Funeral Bell intervention, through the controls.
  await page.locator('#world').selectOption('bell'); await page.locator('#budget').fill('1');
  await page.locator('#policy').selectOption('information');
  const netOf = async name => (await page.locator('#results-body tr').evaluateAll((trs, n) => trs.find(tr => tr.cells[0].textContent === n).cells[1].textContent, name));
  assert.equal(await netOf('Information first'), '-2.60');
  await page.locator('#bell').fill('3'); assert.equal(await netOf('Information first'), '-0.85');
  // Found by search: deadline-aware silence vs two-step listening.
  await page.locator('#world').selectOption('quiet');
  assert.equal(await netOf('Deadline-aware value'), '-1.00'); assert.equal(await netOf('Exact optimal'), '-0.78');
  // Manual order, exact; keyboard timeline re-enactment; paused companion holds a pose.
  await page.locator('#world').selectOption('narrowing'); await page.locator('#policy').selectOption('manual');
  await page.locator('#signals .signal').nth(0).click();
  assert.match(await page.locator('#results-body').textContent(), /You choose \(01\)-1\.85/);
  await page.locator('#run').click();
  await page.locator('details summary', {hasText: 'Alternate timelines'}).click();
  const tr = page.locator('#timeline-body tr[data-policy="information"]');
  await tr.focus(); await page.keyboard.press('Enter');
  assert(await tr.evaluate(e => e.classList.contains('is-playing')));
  assert.match(await page.locator('#companion-announcement').textContent(), /re-enacts Information first/);
  await page.locator('#motion').click(); await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => getComputedStyle(document.getElementById('pet')).backgroundPositionX), '0px');
  await page.locator('#motion').click();
  // Jar from exact expectations.
  await page.locator('#policy').selectOption('optimal');
  assert(await page.evaluate(() => document.querySelector('.terrarium').classList.contains('is-optimal')));
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({width, height: 900});
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow at ${width}`);
  }
  await page.screenshot({path: 'results/qs002-desktop.png'});
  const origin = new URL(url).protocol === 'file:' ? 'file:' : new URL(url).origin;
  assert.deepEqual(errors, []);
  assert.deepEqual(await page.evaluate(() => window.__csp || []), [], 'CSP violations');
  assert(requests.every(u => u.startsWith(origin) || u.startsWith('data:')), 'off-origin request');
  fs.writeFileSync('results/qs002_browser_checks.json', JSON.stringify({url, engine: 'Chromium', table_cells_compared: compared,
    checks: ['displayed net equals Python for 4 worlds x 4 budgets x 8 policies', 'every world/budget/policy episode runs',
      'clock never shows more readings than the budget', 'bell intervention -2.60 -> -0.85', 'searched counterexample -1.00 vs -0.78',
      'manual exact order', 'keyboard timeline re-enactment', 'paused companion', 'jar optimum', '320/390/768/1440 no overflow',
      'no page errors', 'no CSP violations', 'same-origin requests only']}, null, 2) + '\n');
  await browser.close();
  console.log(`QS-002 page checks passed (${compared} table cells equal Python) at ${url}`);
})().catch(e => { console.error(e); process.exit(1); });
