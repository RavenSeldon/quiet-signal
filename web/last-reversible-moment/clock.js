/* QS-002 interface: a presentation layer over model.js. Every number shown is computed by the
   model (checked against Python); the companion and the jar only illustrate those results. */
(function () {
  'use strict';
  const Q = globalThis.QS2, $ = id => document.getElementById(id);
  const fmt = (x, d = 2) => (Number.isNaN(x) ? '—' : (Math.abs(x) < 5e-13 ? 0 : x).toFixed(d));
  const sign = x => (x > 5e-13 ? '+' : '') + fmt(x);
  const pct = x => `${fmt(100 * x, 1)}%`;
  const CH = ['rose', 'violet', 'sky'];
  const COLORS = {none: 'none', random: 'random', information: 'info', blind: 'task', aware: 'myopic',
                  early: 'severity', optimal: 'optimal', oracle: 'full'};
  const DEFAULTS = {spare: [1, .1], narrowing: [1, .1], bell: [1, .1], now: [1, .1], quiet: [2, .05]};
  const TEXT = {
    spare: ['Time to spare. Protection may begin as late as tick 6, and every reading, even the bell at tick 5, can still arrive in time.',
      'Compare Information first with the Early-stop rule. With time to spare, waiting for the bell is wise: stopping early costs 1.00 on average.'],
    narrowing: ['The narrowing window. Protection must begin by tick 2. Only the fast scout can return in time; the survey and the bell arrive after the world has changed.',
      'Information first chooses the bell and hears the truth at tick 5, three ticks too late. Then try Deadline-aware value.'],
    bell: ['The Funeral Bell. The bell is always right, and it rings at tick 4, one tick after the last reversible moment. The slow survey still lands at tick 3.',
      'Choose Information first, then move the bell from tick 4 to tick 3. The same true warning becomes protective: −2.60 becomes −0.85.'],
    now: ['Act now. The last reversible moment is tick 0. Any reading moves the clock past it, so listening forecloses protection.',
      'Raise the budget and compare policies. The ones that know the clock stay silent and act; the others listen their way past the deadline.'],
    quiet: ['Two quiet warnings, found by the adversarial search after the run. Different sensors: a scout at 75% (2 ticks), a survey at 80% (4 ticks), a bell at 90% (7 ticks). The hazard is rare.',
      'Neither warning alone changes the decision; together they do. Deadline-aware value stays silent. Exact optimal listens twice and does better on average (−0.78 vs −1.00).'],
  };
  let seed = 42, revealed = false, episode = null, chosen = [], timelines = {};
  let paused = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function state() {
    const name = $('world').value, bell = +$('bell').value;
    return {name, world: Q.withBell(Q.WORLDS[name], bell), bell, budget: +$('budget').value,
            policy: $('policy').value, cost: +$('cost').value};
  }

  /* Manual choice: a fixed order of sensors, then the shared consumer. Exact over all atoms. */
  function manualEpisode(w, order, cost, atom) {
    const [, h, rs] = atom, obs = order.map(i => [i, rs[i]]);
    let clock = 0, late = 0;
    const arrivals = obs.map(([k, r]) => { clock += w.delays[k]; late += clock > w.deadline; return {sensor: k, reading: r, at: clock}; });
    const pi = Q.posterior(w, obs), prot = clock <= w.deadline && pi * Q.LOSS > Q.PROTECT + 1e-12;
    return {trace: [...order], arrivals, tick: clock, protected: prot, harm: !!(h && !prot), falseAlarm: !!(prot && !h),
            late, hazard: h, utility: -cost * order.length - (prot ? Q.PROTECT : 0) - (h && !prot ? Q.LOSS : 0)};
  }
  function manualExpect(w, order, cost) {
    let net = 0;
    for (const atom of Q.atoms(w)) net += atom[0] * manualEpisode(w, order, cost, atom).utility;
    return net;
  }
  const expect = s => (s.policy === 'manual' ? manualExpect(s.world, chosen, s.cost) : Q.evaluate(s.world, s.policy, s.budget, s.cost).net);
  function play(s, policy, atom) {
    return policy === 'manual' ? manualEpisode(s.world, chosen, s.cost, atom) : Q.replay(s.world, policy, s.budget, s.cost, atom, seed);
  }

  /* ---- the companion: re-enacts one episode (rows from each companion's Record) ---- */
  const ROW = {idle: 0, toward: 1, wave: 3, jump: 4, fail: 5, wait: 6, review: 8};
  let steps = [{row: ROW.wait, loops: Infinity}], step = 0, frame = 0, loops = 0, still = ROW.wait;
  const isPaused = () => document.hidden || document.documentElement.classList.contains('motion-paused');
  function draw(row, f) { $('pet').style.backgroundPosition = `${-192 * f}px ${-208 * row}px`; }
  function enact(e) {
    const seq = e.trace.length ? e.trace.map(() => ({row: ROW.toward, loops: 1})) : [{row: ROW.wait, loops: 1}];
    if (e.late) seq.push({row: ROW.review, loops: 1});
    const outcome = e.harm ? ROW.fail : e.protected ? (e.hazard ? ROW.jump : ROW.review) : ROW.wave;
    steps = [...seq, {row: outcome, loops: 3}, {row: ROW.idle, loops: Infinity}];
    still = outcome; step = 0; frame = 0; loops = 0; draw(isPaused() ? still : steps[0].row, 0);
  }
  function rest() { steps = [{row: ROW.wait, loops: Infinity}]; still = ROW.wait; step = frame = loops = 0; draw(ROW.wait, 0); }
  setInterval(() => {
    if (isPaused()) { draw(still, 0); return; }
    frame += 1;
    if (frame >= QuietCompanion.frames(steps[step].row)) {
      frame = 0; loops += 1;
      if (loops >= steps[step].loops && step < steps.length - 1) { step += 1; loops = 0; }
    }
    draw(steps[step].row, frame);
  }, 180);

  /* ---- the jar: how good the chosen policy is on average ---- */
  function jar(s) {
    const svg = document.querySelector('.terrarium');
    const none = Q.evaluate(s.world, 'none', s.budget, s.cost).net, best = Q.evaluate(s.world, 'optimal', s.budget, s.cost).net - none;
    const gain = expect(s) - none, optimal = Math.abs(gain - best) < 1e-9;
    const level = best > 1e-10 ? Math.min(1, Math.max(0, gain / best)) : (Math.abs(gain) < 1e-10 ? 1 : 0);
    svg.style.setProperty('--jar', level.toFixed(3));
    svg.classList.toggle('is-optimal', optimal); svg.classList.toggle('is-below', gain < -1e-10);
    $('jar-status').textContent = `Jar · exact average ${sign(gain)} vs acting now · ${optimal ? 'matches the exact optimum' : `best possible ${sign(best)}`}`;
  }

  /* ---- the clock ---- */
  function clockSvg(s, e) {
    const w = s.world, D = w.deadline;
    const ghost = !e, bars = [];
    if (e) e.arrivals.forEach((a, k) => bars.push({sensor: a.sensor, start: a.at - w.delays[a.sensor], end: a.at, reading: a.reading, n: k + 1}));
    else [0, 1, 2].forEach(i => bars.push({sensor: i, start: 0, end: w.delays[i]}));
    const T = Math.max(10, D + 2, ...bars.map(b => b.end + 1));
    const L = 92, R = 612, X = t => L + (R - L) * t / T, lane = i => 34 + i * 30;
    let g = `<svg viewBox="0 0 640 ${e ? 168 : 150}" role="img" aria-labelledby="clock-t clock-d"><title id="clock-t">The clock</title><desc id="clock-d">Last reversible moment at tick ${D}. ${
      bars.map(b => `${Q.SENSORS[b.sensor]}${ghost ? ' would arrive' : ' arrived'} at tick ${b.end}${b.end > D ? ', after the deadline' : ''}`).join('. ')}.${e ? ` Decision at tick ${e.tick}: ${e.protected ? 'protect' : e.tick > D ? 'too late to protect' : 'stand down'}.` : ''}</desc>`;
    g += `<rect class="ck-zone" x="${L}" y="14" width="${X(D) - L}" height="${e ? 128 : 108}"/>`;
    g += `<rect class="ck-after" x="${X(D)}" y="14" width="${R - X(D)}" height="${e ? 128 : 108}"/>`;
    for (let t = 0; t <= T; t++) g += `<line class="ck-tick" x1="${X(t)}" x2="${X(t)}" y1="122" y2="126"/><text class="ck-num" x="${X(t)}" y="${e ? 158 : 140}">${t}</text>`;
    g += `<line class="ck-axis" x1="${L}" x2="${R}" y1="122" y2="122"/>`;
    [0, 1, 2].forEach(i => { g += `<text class="ck-lane" x="${L - 10}" y="${lane(i) + 4}">0${i + 1} ${Q.SENSORS[i].replace('The ', '').toUpperCase()}</text>`; });
    for (const b of bars) {
      const late = b.end > D;
      g += `<rect class="ck-bar ck-${CH[b.sensor]}${ghost ? ' is-ghost' : ''}${late ? ' is-late' : ''}" x="${X(b.start)}" y="${lane(b.sensor) - 6}" width="${Math.max(2, X(b.end) - X(b.start))}" height="12"/>`;
      g += `<circle class="ck-arrive${late ? ' is-late' : ''}" cx="${X(b.end)}" cy="${lane(b.sensor)}" r="3.4"/>`;
      if (!ghost) g += `<text class="ck-read" x="${X(b.end) + 7}" y="${lane(b.sensor) + 4}">${b.reading}${late ? ' · late' : ''}</text>`;
    }
    g += `<line class="ck-deadline" x1="${X(D)}" x2="${X(D)}" y1="8" y2="128"/><text class="ck-deadline-label" x="${Math.min(X(D) + 6, R - 4)}" y="11" text-anchor="${X(D) > R - 150 ? 'end' : 'start'}">LAST REVERSIBLE MOMENT · TICK ${D}</text>`;
    if (e) {
      const x = X(e.tick), label = e.protected ? 'PROTECT' : e.tick > D ? 'TOO LATE TO PROTECT' : 'STAND DOWN';
      g += `<line class="ck-decide${e.protected ? ' is-protect' : ''}" x1="${x}" x2="${x}" y1="20" y2="132"/><text class="ck-decide-label${e.protected ? ' is-protect' : ''}" x="${Math.min(x + 6, R - 4)}" y="142" text-anchor="${x > R - 150 ? 'end' : 'start'}">${label} @ ${e.tick}</text>`;
    }
    return g + '</svg>';
  }

  /* ---- rendering ---- */
  function signals(s) {
    $('signals').replaceChildren();
    for (let i = 0; i < 3; i++) {
      const read = revealed && episode && episode.e.arrivals.find(a => a.sensor === i);
      const order = chosen.indexOf(i);
      const b = document.createElement('button'); b.type = 'button';
      b.className = 'signal' + (read ? ' read' : '') + (s.policy === 'manual' && order >= 0 ? ' selected' : '');
      b.disabled = s.policy !== 'manual'; b.setAttribute('aria-pressed', String(order >= 0));
      const late = s.world.delays[i] > s.world.deadline;
      b.setAttribute('aria-label', `${Q.SENSORS[i]}: ${fmt(100 * s.world.reliability[i], 0)}% reliable, ${s.world.delays[i]} tick${s.world.delays[i] === 1 ? '' : 's'}.${s.policy === 'manual' ? ' Select to add it to your listening order.' : ''}`);
      b.innerHTML = `<span class="sensor-number">0${i + 1}</span><span><span class="sensor-name">${Q.SENSORS[i]}</span><span class="sensor-desc">${fmt(100 * s.world.reliability[i], 0)}% reliable · ${s.world.delays[i]} tick${s.world.delays[i] === 1 ? '' : 's'}${late ? ' · slower than the deadline' : ''}</span></span><span class="sensor-reading">${read ? `@${read.at}<strong>${read.reading}</strong>` : s.policy === 'manual' ? (order >= 0 ? `#${order + 1}` : 'CHOOSE') : 'QUIET'}</span>`;
      b.onclick = () => {
        if (order >= 0) chosen.splice(order, 1);
        else if (chosen.length < s.budget) chosen.push(i);
        else { $('selection-note').textContent = 'Budget full. Deselect a sensor or raise the budget.'; return; }
        reset(); const el = $('signals').children[i]; if (el) el.focus();
      };
      $('signals').append(b);
    }
  }

  function outcome(s, e) {
    const w = s.world, D = w.deadline, none = play(s, 'none', episode.atom);
    const slack = D - e.tick, intime = e.arrivals.filter(a => a.at <= D), late = e.arrivals.filter(a => a.at > D);
    const head = e.protected ? (e.hazard ? 'Protection began in time. The harm is prevented.' : 'Protection began, but there was no hazard. A false alarm.')
      : e.hazard ? (e.tick > D ? 'The hazard was real, and the moment had passed.' : 'The hazard was real. No protection began.')
      : e.tick > D ? 'No hazard. Nothing was lost, this time.' : 'No hazard. Standing down was right.';
    const verdict = (e.protected ? 'Protect' : e.tick > D ? 'No protection possible' : 'Stand down');
    const exp = expect(s), opt = Q.evaluate(w, 'optimal', s.budget, s.cost).net;
    $('outcome').innerHTML = `<div class="outcome-header"><h3>${head}</h3><p>${e.trace.length} reading${e.trace.length === 1 ? '' : 's'} · net ${sign(e.utility)}</p></div><div class="answers">
<div class="answer"><span>01 / WHAT WAS TRUE?</span><strong>${e.hazard ? 'A hazard was developing' : 'No hazard'}</strong><p>Revealed now. Readings the policy never took stay hidden from it: ${episode.atom[2].map((r, i) => `0${i + 1}=${r}`).join(' · ')}.</p></div>
<div class="answer"><span>02 / WHAT ARRIVED IN TIME?</span><strong>${e.arrivals.length ? `${intime.length} in time · ${late.length} late` : 'Nothing was asked'}</strong><p>${e.arrivals.length ? e.arrivals.map(a => `${Q.SENSORS[a.sensor]} said ${a.reading} at tick ${a.at}${a.at > D ? ' (after the moment)' : ''}`).join('. ') + '.' : 'The decision was taken at tick 0, from the prior alone.'}</p></div>
<div class="answer"><span>03 / WHAT COULD STILL BE CHANGED?</span><strong>${verdict} @ tick ${e.tick}</strong><p>Protective slack for this action: ${slack >= 0 ? `+${slack}` : slack} tick${Math.abs(slack) === 1 ? '' : 's'}. ${slack < 0 ? 'The decision point fell after the last reversible moment.' : 'Protection was still possible at the decision.'}</p></div>
<div class="answer"><span>04 / WAS IT WORTH THE COST?</span><strong>${sign(e.utility - none.utility)} versus acting now</strong><p>Same world, same readings, no listening: net ${sign(none.utility)}. On average this policy earns ${sign(exp)}; the exact optimum earns ${sign(opt)}.</p></div></div>
<p class="outcome-note">${late.length && e.hazard && !e.protected ? 'A true warning arrived after the world had changed. It can no longer prevent this harm, but it can still serve accountability, learning or someone else.' : late.length ? 'A reading arrived after the last reversible moment. The truth came; the chance to act on it had already gone.' : e.trace.length === 0 && D === 0 ? 'At tick 0, acting now was the only way to protect.' : slack >= 0 && e.protected ? 'Information arrived while the world could still change.' : 'One episode can be lucky or unlucky. The table below shows exact averages.'}</p>`;
    $('outcome').hidden = false;
  }

  function evidence(s) {
    const css = getComputedStyle(document.documentElement), tok = n => css.getPropertyValue(n).trim();
    const list = [...Q.POLICIES, 'oracle'];
    $('table-title').textContent = `At this setting · ${s.budget} packet${s.budget === 1 ? '' : 's'} · cost ${fmt(s.cost)} · bell @ ${s.bell}`;
    $('results-body').innerHTML = list.map(p => {
      const r = Q.evaluate(s.world, p, s.budget, s.cost);
      return `<tr class="${p === s.policy ? 'active-policy ' : ''}${p === 'oracle' ? 'reference' : ''}"><td>${Q.NAMES[p]}${p === 'oracle' ? ' †' : ''}</td><td>${fmt(r.net)}</td><td>${pct(r.harm)}</td><td>${pct(r.false_alarm)}</td><td>${fmt(r.late)}</td><td>${Number.isNaN(r.slack) ? '—' : '+' + fmt(r.slack, 1)}</td></tr>`;
    }).join('') + (s.policy === 'manual' ? `<tr class="active-policy"><td>You choose (${chosen.map(i => '0' + (i + 1)).join(' → ') || 'silence'})</td><td>${fmt(expect(s))}</td><td colspan="4">exact, fixed order</td></tr>` : '');
    const Ds = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    const series = Object.fromEntries(list.map(p => [p, Ds.map(d => Q.evaluate({...s.world, deadline: d}, p, s.budget, s.cost).net)]));
    const all = Object.values(series).flat(), min = Math.floor(Math.min(...all)), max = Math.ceil(Math.max(...all, 0));
    const W = 500, H = 260, l = 42, r = 480, t = 20, b = 220, X = d => l + (r - l) * d / 8, Y = v => b - (v - min) / ((max - min) || 1) * (b - t);
    const line = tok('--line'), text = tok('--muted'), tint = tok('--tint');
    let svg = `<svg role="img" aria-labelledby="qs2-chart-t qs2-chart-d" viewBox="0 0 ${W} ${H}"><title id="qs2-chart-t">Expected net value by last reversible moment</title><desc id="qs2-chart-d">${list.map(p => `${Q.NAMES[p]}: ${series[p].map(v => fmt(v)).join(', ')}`).join('. ')}.</desc>`;
    for (let j = 0; j < 5; j++) { const v = min + (max - min) * j / 4; svg += `<line x1="${l}" x2="${r}" y1="${Y(v)}" y2="${Y(v)}" stroke="${line}"/><text x="${l - 10}" y="${Y(v) + 4}" text-anchor="end" fill="${text}" font-size="10">${fmt(v, 1)}</text>`; }
    const cur = Math.min(8, s.world.deadline);
    svg += `<rect x="${X(cur) - 6}" y="${t}" width="12" height="${b - t}" fill="${tint}"/>`;
    for (const d of Ds) svg += `<text x="${X(d)}" y="${b + 22}" text-anchor="middle" fill="${text}" font-size="10">${d}</text>`;
    svg += `<text x="260" y="258" text-anchor="middle" fill="${text}" font-size="10">Last reversible moment (tick)</text>`;
    for (const p of list) {
      const c = tok('--chart-' + COLORS[p]);
      svg += `<polyline fill="none" stroke="${c}" stroke-width="${p === 'optimal' || p === s.policy ? 3 : 1.6}"${p === 'oracle' ? ' stroke-dasharray="4 4"' : ''} points="${series[p].map((v, k) => `${X(Ds[k])},${Y(v)}`).join(' ')}"/>`;
    }
    $('chart').innerHTML = svg + '</svg>';
    const same = [];
    list.forEach((p, i) => list.slice(i + 1).forEach(q => { if (series[p].every((v, k) => Math.abs(v - series[q][k]) < 1e-9)) same.push(`${Q.NAMES[p]} = ${Q.NAMES[q]}`); }));
    $('chart-same').textContent = same.length ? `Coinciding lines overlap here: ${same.join('; ')}.` : '';
    $('legend').innerHTML = list.map(p => `<span><i style="background:${tok('--chart-' + COLORS[p])}"></i>${Q.NAMES[p]}</span>`).join('');
  }

  function renderTimelines(s) {
    timelines = {};
    if (!revealed) { $('timeline-body').innerHTML = '<tr><td colspan="4">Run an episode to reveal matched timelines.</td></tr>'; return; }
    const atom = episode.atom, rows = [...Q.POLICIES, ...(s.policy === 'manual' ? ['manual'] : [])].map(p => [p, play(s, p, atom), Q.NAMES[p] || 'You choose']);
    if (s.world.deadline >= 1 && s.policy !== 'manual' && s.bell !== s.world.deadline) {
      const moved = {...s, world: Q.withBell(s.world, s.world.deadline)};
      rows.push(['delivery', Q.replay(moved.world, s.policy, s.budget, s.cost, atom, seed), `${Q.NAMES[s.policy]} · bell moved to tick ${s.world.deadline}`]);
    }
    $('timeline-body').innerHTML = rows.map(([p, e, name]) => {
      timelines[p] = e;
      const reads = e.arrivals.length ? e.arrivals.map(a => `0${a.sensor + 1}:${a.reading} @${a.at}${a.at > s.world.deadline ? '†' : ''}`).join(' · ') : 'Silence';
      const dec = e.protected ? `Protect @${e.tick}` : e.tick > s.world.deadline ? `Too late @${e.tick}` : `Stand down @${e.tick}`;
      return `<tr class="${p === 'delivery' ? 'reference' : ''}" data-policy="${p}" tabindex="0" aria-label="${name}: ${dec}, net ${sign(e.utility)}. Select to watch the companion re-enact this timeline."><td>${name}</td><td>${reads}</td><td>${dec}</td><td>${sign(e.utility)}</td></tr>`;
    }).join('');
  }
  function playTimeline(tr) {
    const p = tr && tr.dataset.policy; if (!p || !timelines[p]) return;
    for (const x of $('timeline-body').rows) x.classList.toggle('is-playing', x === tr);
    enact(timelines[p]);
    $('companion-announcement').textContent = `${QuietCompanion.current.shortName} re-enacts ${tr.cells[0].textContent}: ${tr.cells[2].textContent}, net ${tr.cells[3].textContent}.`;
  }

  function refresh() {
    const s = state();
    if (s.policy !== 'manual') chosen = [];
    chosen = chosen.filter((_, k) => k < s.budget);
    $('budget-value').textContent = `${s.budget} packet${s.budget === 1 ? '' : 's'}`;
    $('bell-value').textContent = String(s.bell);
    $('world-description').textContent = TEXT[s.name][0]; $('lesson').textContent = TEXT[s.name][1];
    $('clock-label').textContent = `THE CLOCK · LAST REVERSIBLE MOMENT: TICK ${s.world.deadline}`;
    $('episode-label').textContent = `WORLD ${seed} · ${revealed ? 'REVEALED' : 'UNREVEALED'}`;
    $('selection-note').textContent = s.policy === 'manual' ? `${chosen.length} / ${s.budget} chosen, in order. Readings arrive one after another.` : 'Changing controls preserves this world.';
    $('run').innerHTML = (revealed ? 'Replay this world' : 'Listen &amp; decide') + ' <span aria-hidden="true">→</span>';
    jar(s); signals(s);
    $('clock').innerHTML = clockSvg(s, revealed ? episode.e : null);
    $('clock-caption').textContent = revealed ? 'Bars show each reading from request to arrival. A dot past the dashed line arrived after the last reversible moment.' : 'Bars show when each reading would arrive if asked first. The shaded span is still reversible.';
    if (!revealed) {
      $('outcome').hidden = true;
      $('silence').textContent = s.world.deadline === 0 ? 'The moment is now.' : 'Every reading costs time.';
      $('pet-status').textContent = 'Acting now is an available choice.';
    }
    evidence(s); renderTimelines(s);
  }
  function reset() { revealed = false; episode = null; rest(); refresh(); }
  function run() {
    const s = state(), atom = Q.draw(s.world, seed);
    const e = play(s, s.policy, atom);
    episode = {atom, e}; revealed = true; refresh(); outcome(s, e); enact(e);
    $('silence').textContent = e.trace.length ? `${QuietCompanion.current.shortName} listens ${e.trace.length === 1 ? 'once' : e.trace.length + ' times'}.` : `${QuietCompanion.current.shortName} acts without listening.`;
    $('pet-status').textContent = e.protected ? `Protection began at tick ${e.tick}.` : e.tick > s.world.deadline ? `Decision at tick ${e.tick}, after the moment.` : `Stood down at tick ${e.tick}.`;
    requestAnimationFrame(() => { const top = $('outcome').getBoundingClientRect().top; if (top > innerHeight - 120) scrollBy({top: top - innerHeight * .3, behavior: isPaused() ? 'auto' : 'smooth'}); });
  }

  function motion() {
    document.documentElement.classList.toggle('motion-paused', paused); document.body.classList.toggle('motion-paused', paused);
    $('motion').textContent = paused ? 'Resume motion' : 'Pause motion'; $('motion').setAttribute('aria-pressed', String(paused));
  }
  document.addEventListener('DOMContentLoaded', () => {
    $('world').onchange = () => {
      const s = $('world').value, [b, c] = DEFAULTS[s];
      $('bell').value = Q.WORLDS[s].delays[2]; $('budget').value = b; $('cost').value = String(c); reset();
    };
    for (const id of ['budget', 'policy', 'cost', 'bell']) $(id).addEventListener('input', reset);
    $('run').onclick = run;
    $('next').onclick = () => { seed += 1; reset(); };
    $('motion').onclick = () => { paused = !paused; motion(); };
    matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', e => { paused = e.matches; motion(); });
    $('timeline-body').addEventListener('click', e => playTimeline(e.target.closest('tr[data-policy]')));
    $('timeline-body').addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); playTimeline(e.target.closest('tr[data-policy]')); } });
    document.addEventListener('quiet:theme', () => evidence(state()));
    document.addEventListener('quiet:companion', () => { step = frame = loops = 0; });
    motion(); refresh();
  });
})();
