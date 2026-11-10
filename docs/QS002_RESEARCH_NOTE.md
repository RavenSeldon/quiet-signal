# QS—002 · The Last Reversible Moment · Research Note

**Status:** WORKING, 9 November 2026. This is a second room in The Quiet Signal, proposed by Ben Amuwo (`QS002_PROPOSAL.md`) and built with Claude's assistance. QS—001 is unchanged. The note is about this specified model only.

## Question

Does a deadline-aware attention policy outperform policies that optimise information, or static decision value, without representing the shrinking opportunity to intervene?

## Model

The full model is in `QS002_SPECIFICATION.md`.
- **Hazard and clock:** one hidden hazard, one protective action and one decision. The clock is discrete, and the last reversible moment D is known.
- **Sensors:** three. A fast scout (75%, 1 tick), a slow survey (95%, 3 ticks), and a perfectly true bell whose delay is set by the world.
- **Querying:** one reading at a time. Each costs attention and time.
- **Evaluation:** everything is exact enumeration, with no sampling. Seven peer policies and one unconstrained reference are compared.

## Results

1. **Pre-registered fixtures.** All of them held exactly (F1–F5). In the Funeral Bell:
   - Information first and Static value both wait for the bell. It rings one tick after D, so both lose protection (−2.60, one late truth per episode).
   - Deadline-aware value takes the survey, which lands exactly at D (−1.05).
   - The Early-stop rule takes the scout (−1.85).
   - **Delivery intervention:** moving the same true bell to tick 3 turns Information first from −2.60 into −0.85.
2. **Sensitivity grid.** The grid covers 1,323 configurations: deadline 0–6, bell delay 1–7, prior {0.1, 0.25, 0.5}, cost {0, 0.1, 0.5} and budget {1, 2, 3}.
   - Deadline-aware value never lost to Information first or Static value. It won 681 configurations and tied 642.
   - All 681 wins were where the bell rang after the deadline.
   - In this family, Deadline-aware value equalled the exact optimum in every configuration.
   - The Early-stop rule tied the optimum in 387 configurations (29%) and never beat it.
   - Information first and Static value were identical throughout, because both always chose the perfect bell first. **This family does not distinguish them.**
3. **Adversarial search.** We then tried to prove ourselves wrong, with 193,536 wider configurations that varied every sensor's reliability and delay.
   - Deadline-aware value fell below the exact optimum in 4,227 of them (2.18%), by at most 0.222.
   - In the largest case (world 05, "Two quiet warnings"), neither weak warning changes the decision alone, but together they do. One-step value stays silent; the optimum listens twice.
   - **Knowing the deadline is not the same as looking ahead.** This is QS—001's complementarity lesson, with a clock.

## Answer, at the Scope Tested

Yes, deadline-aware value outperforms deadline-blind policies, precisely when warnings can arrive late, and it never does worse in this family. But it is still myopic. Full lookahead beats it in a small share of a wider space. A fixed early-stop heuristic is optimal in about three in ten configurations of the base family, so simplicity often suffices, but not reliably.

## Limits

- The deadline is known exactly. Uncertain deadlines are the next warranted experiment. The agent must not be handed a deadline it could not know.
- There is one hazard and one action, the deadline is a hard step, and there are no repeated decisions or partial protection.
- Optimal dominance follows from knowing the true model. It is not evidence of a deployable advantage.
- **Late truths are given no value.** In this utility a late truth is worth nothing, by design. In the world, it can still serve accountability, learning or other people. The page says so instead of pricing it.
- **Prior art:** delayed value of information, and the distinction between disseminating a warning and enabling protective action, are established ideas. The contribution is a small, exact, replayable combination, not a new theory.
- No claim about human attention, clinical practice, emergency management or real institutions.

## Reproduce

```sh
python3 -m unittest discover -s tests          # QS-001 and QS-002, including the rational oracle
python3 -m quiet_signal.benchmark_qs002          # results/qs002_benchmark.csv, qs002_sensitivity.csv, qs002_summary.json
python3 -m quiet_signal.search_qs002             # results/qs002_search.json (about 90 s)
node scripts/check_qs002_export.cjs              # browser model equals Python on all 512 base rows
node scripts/check_qs002.cjs                     # page checks (Playwright)
```
