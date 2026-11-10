// QS-002: the browser model must reproduce the Python results on every base row.
//   node scripts/check_qs002_export.cjs
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path'), assert = require('node:assert/strict');
const ctx = {}; vm.createContext(ctx); ctx.globalThis = ctx;
vm.runInContext(fs.readFileSync(path.resolve('web/last-reversible-moment/model.js'), 'utf8'), ctx);
const Q = ctx.QS2;
const [head, ...lines] = fs.readFileSync('results/qs002_benchmark.csv', 'utf8').trim().split(/\r?\n/);
const cols = head.split(',');
let cells = 0;
for (const line of lines) {
  const r = Object.fromEntries(line.split(',').map((v, i) => [cols[i], v]));
  const js = Q.evaluate(Q.WORLDS[r.world], r.policy, +r.budget, +r.cost);
  for (const k of ['net', 'harm', 'false_alarm', 'queries', 'tick', 'late', 'protect', 'slack']) {
    const want = r[k] === '' ? NaN : +r[k], got = js[k];
    if (Number.isNaN(want)) assert(Number.isNaN(got), `${line} ${k}`);
    else assert(Math.abs(got - want) < 1e-10, `${r.world} B${r.budget} c${r.cost} ${r.policy} ${k}: ${got} vs ${want}`);
    cells++;
  }
}
// The searched counterexample and the delivery intervention, against the specification.
const quiet = Q.WORLDS.quiet;
assert(Math.abs(Q.evaluate(quiet, 'aware', 2, .05).net + 1.0) < 1e-9);
assert(Math.abs(Q.evaluate(quiet, 'optimal', 2, .05).net + 0.778) < 1e-9);
assert(Math.abs(Q.evaluate(Q.withBell(Q.WORLDS.bell, 3), 'information', 1, .1).net + 0.85) < 1e-9);
// Matched replay: one atom, deterministic for a seed.
const a = Q.draw(Q.WORLDS.bell, 42), b = Q.draw(Q.WORLDS.bell, 42);
assert.deepEqual(a, b);
console.log(`${lines.length} QS-002 rows, ${cells} metric cells: browser model equals Python within 1e-10.`);
