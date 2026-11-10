/* QS-002 model for the browser: a line-for-line port of quiet_signal/temporal.py.
   scripts/check_qs002_export.cjs compares it with the Python results on every base row.
   No DOM access here, so Node can load it for that check. */
(function (root) {
  'use strict';
  const EPS = 1e-12, LOSS = 10, PROTECT = 3;
  const POLICIES = ['none', 'random', 'information', 'blind', 'aware', 'early', 'optimal'];
  const NAMES = {none: 'No monitoring', random: 'Random', information: 'Information first',
    blind: 'Static value', aware: 'Deadline-aware value', early: 'Early-stop rule',
    optimal: 'Exact optimal', oracle: 'Truth now (reference)'};
  const SENSORS = ['Fast scout', 'Slow survey', 'The bell'];
  const world = (name, p, deadline, delays, reliability = [0.75, 0.95, 1.0]) => ({name, p, deadline, delays, reliability});
  const WORLDS = {
    spare: world('spare', .25, 6, [1, 3, 5]),
    narrowing: world('narrowing', .25, 2, [1, 3, 5]),
    bell: world('bell', .25, 3, [1, 3, 4]),
    now: world('now', .5, 0, [1, 3, 5]),
    quiet: world('quiet', .1, 6, [2, 4, 7], [.75, .8, .9]),
  };
  const withBell = (w, d) => ({...w, delays: [w.delays[0], w.delays[1], d]});

  const like = (w, i, r, h) => (r === h ? w.reliability[i] : 1 - w.reliability[i]);
  function posterior(w, obs) {
    let a = w.p, b = 1 - w.p;
    for (const [i, r] of obs) { a *= like(w, i, r, 1); b *= like(w, i, r, 0); }
    return a + b <= 0 ? null : a / (a + b);
  }
  const predictive = (w, pi, i) => pi * w.reliability[i] + (1 - pi) * (1 - w.reliability[i]);
  const protects = (pi, ok) => ok && pi * LOSS > PROTECT + EPS;
  const decisionValue = (pi, ok) => (protects(pi, ok) ? -PROTECT : -pi * LOSS);
  const entropy = pi => -[pi, 1 - pi].filter(x => x > 0).reduce((s, x) => s + x * Math.log2(x), 0);
  function branches(w, obs, i) {
    const p1 = predictive(w, posterior(w, obs), i);
    return [[p1, [...obs, [i, 1]]], [1 - p1, [...obs, [i, 0]]]].filter(([pr]) => pr > 0);
  }
  const unqueried = obs => [0, 1, 2].filter(i => !obs.some(([k]) => k === i));
  const elapsed = (w, obs) => obs.reduce((t, [i]) => t + w.delays[i], 0);

  function choose(w, policy, obs, budget, cost) {
    const t = elapsed(w, obs), options = budget - obs.length > 0 ? unqueried(obs) : [];
    if (!options.length || policy === 'none') return null;
    const pi = posterior(w, obs);
    const pick = vals => { const best = Math.max(...vals); return best > EPS ? options[vals.indexOf(best)] : null; };
    if (policy === 'information')
      return pick(options.map(i => entropy(pi) - branches(w, obs, i).reduce((s, [pr, n]) => s + pr * entropy(posterior(w, n)), 0)));
    if (policy === 'blind' || policy === 'aware') {
      const now = decisionValue(pi, policy === 'blind' ? true : t <= w.deadline);
      return pick(options.map(i => {
        const ok = policy === 'blind' ? true : t + w.delays[i] <= w.deadline;
        return branches(w, obs, i).reduce((s, [pr, n]) => s + pr * decisionValue(posterior(w, n), ok), 0) - now - cost;
      }));
    }
    if (policy === 'early') {
      if (obs.length) return null;
      const i = [...options].sort((a, b) => w.delays[a] - w.delays[b] || a - b)[0];
      return t + w.delays[i] <= w.deadline ? i : null;
    }
    throw new Error(policy);
  }

  const memo = new Map();
  function optimal(w, obs, budget, cost) {
    const key = JSON.stringify([w, obs, budget, cost]);
    if (memo.has(key)) return memo.get(key);
    let best = decisionValue(posterior(w, obs), elapsed(w, obs) <= w.deadline), action = null;
    if (obs.length < budget) for (const i of unqueried(obs)) {
      const v = -cost + branches(w, obs, i).reduce((s, [pr, n]) => s + pr * optimal(w, n, budget, cost)[0], 0);
      if (v > best + EPS) { best = v; action = i; }
    }
    const out = [best, action]; memo.set(key, out); return out;
  }

  function plans(w, policy, obs, budget, cost) {
    if (policy === 'random') {
      const o = obs.length < budget ? unqueried(obs) : [];
      return o.length ? o.map(i => [1 / o.length, i]) : [[1, null]];
    }
    if (policy === 'optimal') return [[1, optimal(w, obs, budget, cost)[1]]];
    return [[1, choose(w, policy, obs, budget, cost)]];
  }

  function atoms(w) {
    const out = [];
    for (const h of [0, 1]) for (const r0 of [0, 1]) for (const r1 of [0, 1]) for (const r2 of [0, 1]) {
      const rs = [r0, r1, r2];
      let pr = h ? w.p : 1 - w.p;
      rs.forEach((r, i) => { pr *= like(w, i, r, h); });
      if (pr > 0) out.push([pr, h, rs]);
    }
    return out;
  }

  function episodes(w, policy, budget, cost, atom) {
    const [, h, rs] = atom, out = [];
    (function walk(obs, weight) {
      for (const [wt, i] of plans(w, policy, obs, budget, cost)) {
        if (i === null) {
          const t = elapsed(w, obs), prot = protects(posterior(w, obs), t <= w.deadline);
          let clock = 0, late = 0;
          const arrivals = obs.map(([k, r]) => { clock += w.delays[k]; late += clock > w.deadline; return {sensor: k, reading: r, at: clock}; });
          out.push([weight * wt, {trace: obs.map(([k]) => k), arrivals, tick: t, protected: prot,
            harm: !!(h && !prot), falseAlarm: !!(prot && !h), late, hazard: h,
            utility: -cost * obs.length - (prot ? PROTECT : 0) - (h && !prot ? LOSS : 0)}]);
        } else walk([...obs, [i, rs[i]]], weight * wt);
      }
    })([], 1);
    return out;
  }

  function evaluate(w, policy, budget, cost) {
    if (policy === 'oracle')
      return {net: -PROTECT * w.p, harm: 0, false_alarm: 0, queries: 0, tick: 0, late: 0, protect: w.p, slack: w.deadline};
    const a = {net: 0, harm: 0, false_alarm: 0, queries: 0, tick: 0, late: 0, protect: 0}; let slack = 0;
    for (const atom of atoms(w)) for (const [wt, e] of episodes(w, policy, budget, cost, atom)) {
      const m = atom[0] * wt;
      a.net += m * e.utility; a.harm += m * e.harm; a.false_alarm += m * e.falseAlarm;
      a.queries += m * e.trace.length; a.tick += m * e.tick; a.late += m * e.late;
      if (e.protected) { a.protect += m; slack += m * (w.deadline - e.tick); }
    }
    return {...a, slack: a.protect > EPS ? slack / a.protect : NaN};
  }

  /* One matched atom: the hidden state and every reading drawn once from a seeded generator,
     then held fixed while the policy or the bell's delivery changes. */
  function mulberry32(seed) {
    return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function draw(w, seed) {
    const u = mulberry32(seed), h = u() < w.p ? 1 : 0;
    const rs = [0, 1, 2].map(i => (u() < w.reliability[i] ? h : 1 - h));
    return [1, h, rs];
  }
  function replay(w, policy, budget, cost, atom, seed) {
    const eps = episodes(w, policy, budget, cost, atom);
    if (eps.length === 1) return eps[0][1];
    const u = mulberry32(seed ^ 0x9e3779b9)(); let acc = 0;      // random: one seeded branch
    for (const [wt, e] of eps) { acc += wt; if (u < acc) return e; }
    return eps[eps.length - 1][1];
  }

  root.QS2 = {POLICIES, NAMES, SENSORS, WORLDS, LOSS, PROTECT, withBell, evaluate, episodes, atoms, draw, replay,
    posterior, decisionValue, optimal, choose};
})(globalThis);
