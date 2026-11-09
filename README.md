# The Quiet Signal

A small, exact experiment in what deserves attention. **Presentation v0.3 / scientific model v0.1.** Commissioned by **Ben Amuwo**,
November 8, 2026. Built with Codex assistance. This is an isolated research prototype,
not an amendment to Sīdus or a new Hatchery release.

**Online:** https://benamuwo.me/quiet-signal/ (prepared; see [`deploy/DEPLOY.md`](deploy/DEPLOY.md) for the author steps that make it live).

**Play locally:** open [`web/index.html`](web/index.html) in a browser. It works directly
from disk with no server, accounts or network requests. On macOS, double-click
`Play.command`. Everything needed to play is already included.

**Read:** [`docs/RESEARCH_NOTE.md`](docs/RESEARCH_NOTE.md), or the formatted research
note linked inside the prototype. **See:** [`results/primary_figure.png`](results/primary_figure.png).

## Companions and appearance

Choose **Companion** beside the observatory, or open **Your companions** for the
field guide. Piko, Aster, Nacre, Bookworm, Ajita, Batrina, Hel, Jayke, Shai-Ochre
and Buer are included. Companion changes preserve the current episode. Light
and dark themes use the original Blackout Broadcast identity: near-black surfaces,
electric citron, ultraviolet and coral, with interrupted signal ribbons.
Hatchery and Seventh Seat informed its atmosphere; IBM Plex and Libre Baskerville are
bundled from the Hatchery site for offline use.
Your theme and companion preferences are saved locally when browser storage is
available. No analytics or account is involved.

See `docs/PRESENTATION_V03.md` for the current design, sources and verification.
The v0.2 record remains available as release history.

## A three-minute visit

1. Start with **The bright distraction**, one packet and cost 0.20. Compare
   **World information**, **Myopic value**, and **Task information**. The last two
   agree; learning the wrong aspect of the world wastes a query.
2. Switch to **The missing half**, two packets. Myopic value stays silent.
   **Exact optimal** and the simple **Severity rule** query both halves. Replay
   preserves the world and sensor noise, so differences are modeled interventions.
3. Open **The closed gate** with **World information**. A reading arrives but
   cannot affect the consumer's action. It still costs something.
4. Try **You choose** to select monitors yourself. An empty selection explicitly
   chooses silence. The consumer selects the route from the readings you choose.

A single episode can fail even under a good policy. The lower table shows exact
averages over every world and noisy sensor outcome. The upper panel shows one
seeded episode. **New world** changes it; the other controls preserve it.

## Reproduce the science

Python 3.12+ with NumPy is sufficient for the engine and tests. The tested runtime
was Python 3.15, NumPy 2.5.4, Matplotlib 3.11.2 on macOS arm64; details are in
`results/environment.json`. The bundled environment is not needed to play.
The pinned packages in `requirements-lock.txt` reproduce the tested scientific
stack; installing them needs internet access. Core equations are not version-specific.
Floating-point results are checked to 1e−10. Identical package versions do not
guarantee identical numerical-library builds; cross-environment artifact bytes
are not promised. The final isolated-environment repeat was byte-identical for
all seven primary outputs; the two-installation numeric check is recorded in
`results/cross_environment_check.json`.

From the project directory:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements-lock.txt
.venv/bin/python -m unittest discover -s tests -v
.venv/bin/python -m quiet_signal.benchmark
.venv/bin/python -m quiet_signal.figures
.venv/bin/python scripts/sync_figure.py
node scripts/check_export.cjs
```

The benchmark rebuilds the 640 base rows, 4,000 sensitivity rows, example episodes,
and browser policy tables. Figures read the generated CSVs, never illustrative
values. `sync_figure.py` copies the generated primary figure into the static site.
No inherited code or private source path is required for reproduction.

Node is used only for browser/export checks, not the scientific engine. To rerun
UI checks, install the development-only Playwright dependency and its browser:

```sh
npm ci
npx playwright install chromium
node scripts/check_browser.cjs
```

For an existing Playwright installation, set `PLAYWRIGHT_MODULE` to its module
path. The UI test writes desktop/mobile/replay screenshots and `browser_checks.json`.
It checks interaction, same-world replay, four widths down to 320px, keyboard
budget control, reduced-motion handling, page errors and external requests.
These are automated checks, not a full assistive-technology audit or user study.

## Files and evidence

| Path | Purpose |
| --- | --- |
| `docs/COMMISSION.md` | User's original brief, unchanged |
| `docs/SPECIFICATION.md` | State, observations, actions, rewards, costs, policies, estimands, pre-run expected fixtures |
| `quiet_signal/engine.py` | NumPy reference model, adaptive exact solver, evaluators and replay |
| `tests/test_engine.py` | Foundation tests including separate rational all-policy-tree enumeration |
| `tests/test_record.py` | Report, generated table and evidence integrity checks |
| `results/benchmark.csv` | Every baseline measurement, unrounded |
| `results/sensitivity.csv` | Complete reliability × complementarity × cost × budget grid |
| `results/example_episodes.json` | Disclosed fixed-atom examples with query traces |
| `results/primary_figure.png` / `.svg` | Main exact-results figure |
| `results/budget_figure.png` | Performance versus monitoring budget |
| `results/experiment_hashes.json` | Specification, engine and experiment-output identities |
| `web/` | Self-contained playable prototype and formatted research note |
| `docs/PROVENANCE.md` / `source_ledger.json` | AI assistance, sources, permissions and design departures |
| `docs/ACCEPTANCE.md` | Acceptance gates, concrete evidence, remaining limitations |
| `scripts/build_release.py` | Hosted release `dist/quiet-signal/` + `RELEASE.json` + deterministic zip |
| `deploy/` | Blog blueprint, droplet installer and runbook for benamuwo.me/quiet-signal/ |

The optional `python3 scripts/verify_sources.py` checks the recorded original
files on the author's machine. An external collaborator does not need those
private paths: all scientific reproduction inputs and the companion's original
Record are included. Original Sīdus sources are not redistributed in this package.

## What the result warrants

Value selection can beat world-information selection in the constructed
irrelevant-state case. Task information and a simple rule can tie it. Greedy
value and greedy task information fail on pure complementary signals. Known
costs can make silence optimal. Information can be measurable yet causally unused.

Optimal dominance follows from the objective and known model. It is not evidence
of a deployable universal advantage. No compression, learned allocator, human
attention, consciousness, clinical or poverty claim is tested. External replication
and human comprehension remain future work; publication readiness is not claimed.

## Asset rights and authorship

The ten existing Hatchery companions retain their unchanged sprite sheets,
manifests and original Records under `web/assets/<id>/`. Each Record names its
designer and production history. Each stated licence allows pet use,
including at work, and prohibits commercial replication or resale. This project
does not grant broader rights. The original Records disclose their AI-assisted
production. IBM Plex and Libre Baskerville are bundled under their original SIL Open Font
Licences; Space Mono (v0.2 history, not loaded by v0.3 pages) likewise. Codex authored this
prototype's code, tests, analysis and interface in response to Ben's commission; Claude
closed out the v0.3 record and prepared the hosted release (`docs/PRESENTATION_V03.md`). No independent reviewer participated.
