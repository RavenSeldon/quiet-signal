/* Presentation conveniences only; never reads or changes the experiment.
   After "Listen & decide", bring the outcome into view if it landed below the fold,
   so a phone reader is not left looking at the controls. Respects reduced motion and
   the page's own motion pause. */
(function () {
  function settle() {
    const outcome = document.getElementById('outcome');
    if (!outcome || outcome.hidden) return;
    const top = outcome.getBoundingClientRect().top;
    if (top < window.innerHeight - 120) return;
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches ||
      document.documentElement.classList.contains('motion-paused');
    window.scrollBy({top: top - window.innerHeight * 0.3, behavior: still ? 'auto' : 'smooth'});
  }
  document.addEventListener('DOMContentLoaded', () => {
    const run = document.getElementById('run');
    if (run) run.addEventListener('click', () => requestAnimationFrame(settle));
  });
})();
