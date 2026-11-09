/* The Quiet Signal / Reactions / presentation 0.6.
   Two layers, both presentation only; neither computes nor changes a result.
   - The companion re-enacts the episode the engine already computed: it runs toward each
     monitor it reads, reviews when a reading changes nothing, then shows the outcome of this
     one draw (jumping for a successful delivery, failed for a failed one, waving for a
     conserved resource). One episode can be lucky, so this layer shows what happened.
   - The terrarium shows how good the chosen policy is on average, from the exact expected
     values already exported: the root light scales with the policy's expected gain over
     silence relative to the best possible gain, and the constellation lights only when the
     policy matches the exact optimum. This layer shows judgement, not luck.
   Before an episode the companion waits, as before; afterwards it settles into idle.
   Rows follow each companion's Record (hatchery-record/0); undocumented rows 9-10 are unused. */
(function (root) {
  'use strict';
  const ROW = {idle: 0, toward: 1, wave: 3, jump: 4, fail: 5, wait: 6, review: 8};
  const OUTCOME = {8: ROW.jump, '-8': ROW.fail, 2: ROW.wave};
  let steps = [{row: ROW.wait, loops: Infinity}], step = 0, frame = 0, loops = 0, still = ROW.wait;

  const frames = row => root.QuietCompanion.frames(row);
  const paused = () => document.hidden || document.documentElement.classList.contains('motion-paused');
  const fmt = x => (Math.abs(x) < 1e-10 ? 0 : x).toFixed(2);
  const sign = x => (x > 1e-10 ? '+' : '') + fmt(x);

  function draw(row, f) {
    const pet = document.getElementById('pet');
    if (pet) pet.style.backgroundPosition = `${-192 * f}px ${-208 * row}px`;
  }

  /* The choreography for one replayed episode, read only from the runtime's own result. */
  function sequence(r) {
    const seq = r.trace.length ? r.trace.map(() => ({row: ROW.toward, loops: 1}))
                               : [{row: ROW.wait, loops: 1}];
    if (r.trace.length && r.action === r.baseline) seq.push({row: ROW.review, loops: 1});
    const outcome = OUTCOME[r.utility] ?? ROW.idle;
    seq.push({row: outcome, loops: 3}, {row: ROW.idle, loops: Infinity});
    return {seq, outcome};
  }

  function start(seq, rest) {
    steps = seq; still = rest; step = 0; frame = 0; loops = 0;
    draw(paused() ? still : steps[0].row, 0);
  }
  const play = r => { const {seq, outcome} = sequence(r); start(seq, outcome); };
  const rest = () => start([{row: ROW.wait, loops: Infinity}], ROW.wait);
  const restart = () => start(steps, still);

  function tick() {
    if (paused()) { draw(still, 0); return; }
    frame += 1;
    if (frame >= frames(steps[step].row)) {
      frame = 0; loops += 1;
      if (loops >= steps[step].loops && step < steps.length - 1) { step += 1; loops = 0; }
    }
    draw(steps[step].row, frame);
  }

  /* The jar: exact expectations for the selected policy at this world, cost and budget. */
  function jar(s) {
    const svg = document.querySelector('.terrarium'), note = document.getElementById('jar-status');
    if (!svg || !note) return;
    const table = s.world.summaries[String(s.cost)];
    if (!table[s.policy]) {
      svg.style.removeProperty('--jar');
      svg.classList.remove('is-optimal', 'is-below');
      note.textContent = 'The jar lights for a named policy. Your own picks are judged by the episode.';
      return;
    }
    const none = table.none[s.budget].net, best = table.optimal[s.budget].net - none;
    const gain = table[s.policy][s.budget].net - none;
    const optimal = Math.abs(gain - best) < 1e-9;
    const level = best > 1e-10 ? Math.min(1, Math.max(0, gain / best)) : (Math.abs(gain) < 1e-10 ? 1 : 0);
    svg.style.setProperty('--jar', level.toFixed(3));
    svg.classList.toggle('is-optimal', optimal);
    svg.classList.toggle('is-below', gain < -1e-10);
    note.textContent = `Jar · exact average ${sign(gain)} vs silence · ` +
      (optimal ? 'matches the exact optimum' : `best possible ${sign(best)}`);
  }

  setInterval(tick, 180);
  root.QuietReactions = {play, rest, restart, jar, sequence, ROW};
})(globalThis);
