# Presentation update · v0.6 (Reactions)

Presentation v0.6 over scientific model v0.1. Ben Amuwo requested it on 9 November 2026: link the experiment's outcomes to more of the Hatchery companions' animations, built to the standard of the live page.

## Two Layers: What Happened and How Good the Policy Is

One episode is a single draw, and a poor policy can get lucky. So the page separates two things.

**The companion re-enacts the episode** (`web/reactions.js`). The sequence is read only from the runtime's own replay result:

| What the engine computed | Companion row (from its Record) |
|---|---|
| Before any episode | waiting (6), as before |
| Each monitor read, in order | running-right (1), toward the monitors |
| Silence: the policy stopped without reading | waiting (6) |
| Readings arrived but the action did not change | review (8) |
| The delivery succeeds (+8) | jumping (4), three loops |
| The delivery fails (−8) | failed (5), three loops |
| The resource is conserved (+2) | waving (3), three loops |
| Afterwards | idle (0) |

**The terrarium shows the policy's exact average.** It uses the exported expectations for the selected world, cost and budget:
- The green root light grows with the policy's expected gain over silence, measured against the best possible gain.
- The constellation lights only when the policy matches the exact optimum.
- The root signal greys when the policy does worse than silence.
- A caption states the numbers, for example "Jar · exact average +2.62 vs silence · matches the exact optimum".
- Manual selections have no exported expectation, so the jar says so rather than estimating one.

The two layers can disagree, and that disagreement is the lesson. In the missing-half world with seed 42, Exact optimal fills the jar but the delivery fails in this draw, while Myopic value's silence happens to conserve the resource.

**Alternate timelines:** selecting a row of the alternate-timeline table, by click, Enter or Space, has the companion re-enact that policy in the same world with the same noise. The episode's outcome text never changes, and a status line announces the re-enactment.

## Accessibility and Motion

- When motion is paused or reduced, the companion holds the first frame of the outcome pose, so the meaning survives without movement.
- The text outcome and the screen-reader status remain the main way the result is announced. The animation is never the only signal.
- Timeline rows are focusable, show a green focus ring and carry descriptive labels.

## Boundaries

- **Presentation only:** neither layer computes or changes a result.
- **Unchanged files:** `runtime.js`, `data.js`, `companions.js`, `pets.js`, the engine, both CSVs and the primary figure are byte-identical. The tests assert these.
- **`app.js` changed on purpose,** to hand episodes to `reactions.js` and to make timeline rows selectable. `docs/reactions_baseline.json` records its v0.3 and v0.6 identities and the new file, and the tests check both.
- **Companion rows 9 and 10 are not used,** because the Hatchery has not documented their meaning.
- The security policy (CSP) is unchanged.

## Verification (9 November 2026)

| Check | Result |
|---|---|
| Python tests | 14 passed (identity baseline plus reactions record) |
| `check_export.cjs` | 640 comparisons, 35,840 traces passed |
| `check_browser.cjs` | Passed |
| `check_reactions.cjs` (new) | Passed locally and through the real blog under the release CSP: observed sequences optimal [1,5,0], myopic [6,3,0], closed gate [1,8,3,0], each matching the episode's outcome; jar levels 1 / 0 / below-silence / neutral; keyboard timeline re-enactment; pause holds the outcome pose; no page errors (`results/reactions_checks.json`) |
| `check_hosted.cjs` | No CSP violations, errors or off-origin requests |
| Release `site-2026-11-09-r6` | zip SHA-256 `d78d4efd…8c56`; receipt `19df3a42…36a0` |
