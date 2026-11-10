# Assistance, inheritance and design log

Commission dated November 8, 2026 (America/Vancouver). The original supplied text
is preserved in `COMMISSION.md`. The project is isolated in `quiet-signal/`.
No Sīdus or Hatchery source files were edited. `source_ledger.json` records hashes
for the local sources used; `scripts/verify_sources.py` checks those identities.

| Label | Source or choice | Use and boundary |
| --- | --- | --- |
| EVIDENCE | Sīdus E0 protocol, E0-A summary and controls | Existing local records explicitly distinguish information and causal use. Their numbers are not new Quiet Signal results. |
| EVIDENCE | E0-B frozen specification, development report, pilot implementation | Read for consumer dependence and experimental discipline; development status is not confused with later confirmation. No E0-B experiment executed. |
| EVIDENCE | E1 RC4 protocol and Nov 4 canonical claim freeze | Current local record is a narrowly scoped PASS. Older protocol statements about remaining gates are historical. |
| EVIDENCE | Hatchery README, site README, selected BDP sections, Piko Record | Existing production and rights constraints; no new pet or new art generated. |
| EVIDENCE | Piko sprite hash | Copied sheet matches the Record; that check is not a new artistic or rights adjudication. |
| QUESTION | Expected decision value under scarcity | Tested through constructed finite fixtures; not a claim of novelty or universality. |
| CREATION | Observatory, route delivery story, Piko's silence captions | Presentation metaphors only. Pet movement is not a measurement. |

## Consequential design decisions

- Reduced the environment to one decision and a two-route resource allocation.
  This permits exhaustive checks. Longer time horizons are deferred.
- Capacity counts query-and-route packets. Observation, communication and
  interruption are coupled in v0.1; no free alert pre-screening is allowed.
  A silence decision occurs before a query, preventing hidden free information.
- Added task-information gain as a stronger rival. The full-state information
  objective can waste capacity on irrelevant state; that distinction is shown,
  not concealed. Both information policies are explicitly greedy.
- Added a free full-signal upper reference without artificial processing costs.
  No compression advantage is claimed.
- Exact optimal includes stopping, and uses adaptive histories. Its computation
  is free in the model, just like all other policy computation. Practical compute
  efficiency is not established.
- No PyTorch, server, accounts, tracking, remote inference, or external runtime
  request is needed. The prototype opens directly from `web/index.html`.
- Reused Piko as a companion in this local prototype under the supplied commission
  and the Record's pet-use licence. Copied its files unchanged, retained its name
  and attribution, and did not bundle a commercial licence or publish it.
- The interface renders the Python solver's exported decision tables. It does
  not substitute scripted scientific outcomes. Seeded episodes and fixed example
  atoms are labelled distinctly from exact distribution averages.
- The commission calls E1 developing. The inspected November 4 freeze says its
  stated RC4 test passed. This discrepancy is recorded rather than rewriting
  either source.

## Assistance and execution

Codex (called “Maitreyan” conversationally) authored this implementation, tests,
analysis and presentation in response to Ben Amuwo's commission. The nickname
implies no spiritual status. No subagents or external human reviewers were used.
The user supplied the project intent, values, research lineage and creative assets.
Existing Piko production used AI assistance as disclosed in its original Record.

The fixture specification and hand-derived assertions were written before running
policy comparisons. The scientific comparison was run only after the foundational
tests passed. This order is a self-recorded development log, not a trusted timestamp,
preregistration, or independent confirmation. The same assistant designed and
checked the experiment; rational enumeration is an independent implementation,
not an independent investigator.

The environment installation initially failed inside the network sandbox; it
succeeded with approved escalation into this project's own `.venv`. A browser
launch likewise requires permission to start Chromium outside the process sandbox.
Neither action modifies an inherited scientific environment. No canonical
training runs, publishing, messages to other people, or remote account changes
were performed.

The first byte-repeat audit compared outputs originally generated with system
NumPy against the isolated wheel installation and failed byte identity. This
was investigated, not discarded: all 74,240 metric cells were compared, with
maximum absolute difference 1.4210854715202004e−14, below the specified 1e−10.
The final artifacts were regenerated in the isolated environment. Two consecutive
runs there produced identical bytes for the seven primary outputs. The numerical
and byte-repeat checks are preserved separately in `results/`.

## Human work still outstanding

No external replication, subjective creative approval or human comprehension test
is represented as done. Reproduction commands and all required local inputs are
included. The defensible finish line is a tested, reproducible computational
prototype and an honest account of its constructed successes and failures.

## Presentation v0.2

The user subsequently requested alignment with benamuwo.com and more Hatchery
companions, then explicitly added Ochre and Buer. Ten original companions are
now included, with offline Space Mono and portfolio-derived light/dark themes.
See `PRESENTATION_V02.md` for this update’s sources and checks. Scientific model
and output identities are unchanged. The v0.1 statements above describe the
initial release; no broader scientific or artistic approval is implied.

## Presentation v0.3 and hosting

Codex produced the v0.3 Blackout Broadcast identity. Claude (Anthropic, Opus 5.5),
asked by the author on 9 November 2026 to finish Codex's work and host it at
benamuwo.me/quiet-signal, wrote `PRESENTATION_V03.md`, added footer links to
Neurascape, replaced absolute home paths in the ledgers with `~/`, extended the
record tests to the identity baseline, and built the release, blog blueprint,
droplet installer and hosted browser check. The blueprint was applied to the
blog's working tree only. Claude made no commit, push, release or server change;
those remain the author's. See `PRESENTATION_V03.md` and `deploy/DEPLOY.md`.

## Presentation v0.4 (Seal edition)

Ben supplied the Maitrism glyph (`docs/seal/maitrism-glyph.svg`, unchanged) on
9 November 2026 as the main favicon and unifying palette. Claude derived the
favicon, palette layer (`web/seal.css`), outcome placement, `web/ux.js` and link
preview metadata. No experiment file changed. See `PRESENTATION_V04.md`.

## QS—002 · The Last Reversible Moment

Ben Amuwo supplied the proposal (`QS002_PROPOSAL.md`, preserved verbatim, including its stray link fragments) on 9 November 2026. Claude (Anthropic, Opus 5.5) wrote:
- the specification and its pre-run fixtures;
- `quiet_signal/temporal.py`, the benchmark and the adversarial search;
- the tests, including a rational oracle;
- the browser model and the page;
- the checks.

The searched counterexample (world 05) was added after the run and is labelled as such. No commit, push, release or server change was made by Claude.
