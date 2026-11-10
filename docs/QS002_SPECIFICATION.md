# QS—002 · The Last Reversible Moment · Specification

**Status:** WORKING. This is a separate experiment within The Quiet Signal. QS—001, its four worlds, engine, data and results are frozen and unchanged.
**Source:** `docs/QS002_PROPOSAL.md`, the author's proposal of 9 November 2026, preserved verbatim.
**Question:** does a deadline-aware attention policy outperform policies that optimise information, or static decision value, without representing the shrinking opportunity to intervene? A simple early-stop rule is allowed to win.

## World

- **Hidden state:** H ∈ {0, 1}. H = 1 means a hazard is developing. The prior is P(H = 1) = p.
- **Clock:** the clock starts at tick 0. The **last reversible moment** D is the latest tick at which the protective action can still begin. D is a stated, known property of each world. The agent is never given H, and never given any reading before it arrives.
- **Sensors:** three, each conditionally independent given H. Each is queried at most once. A reading equals H with probability q, its reliability.

| Sensor | Reliability q | Delay δ (ticks) |
|---|---|---|
| 01 Fast scout | 0.75 | 1 |
| 02 Slow survey | 0.95 | 3 |
| 03 The bell | 1.00 (always true) | set by the world |

- **Querying:** one query at a time. Querying sensor i at tick t costs c (an attention packet) and moves the clock to t + δᵢ, when its reading arrives. The budget is B ∈ {0, 1, 2, 3} packets.
- **Deciding:** at the decision tick t the agent either
  - **protects** (only if t ≤ D), which costs K = 3 and prevents the loss; or
  - **stands down**, which loses L = 10 if H = 1.

  A reading that arrives after D is still true, but it cannot change whether protection happened.
- **Utility:** −c × (number of queries) − K × [protected] − L × [H = 1 and not protected].
- **Consumer:** the same for every policy. It protects if and only if t ≤ D and π·L > K + 10⁻¹², where π is the posterior P(H = 1 | readings). Ties go to standing down.

### Worlds (fixed before any run)

| World | p | D | Bell delay | Purpose |
|---|---|---|---|---|
| `spare` · Time to spare | 0.25 | 6 | 5 | Everything can arrive in time. Information-first can tie the optimum; the early-stop rule should lose. |
| `narrowing` · The narrowing window | 0.25 | 2 | 5 | Only the fast scout returns in time. Deadline-blind policies are tested. |
| `bell` · The Funeral Bell | 0.25 | 3 | 4 | A perfectly true warning arrives exactly one tick too late; the slow survey still fits. |
| `now` · Act now | 0.50 | 0 | 5 | Any query forecloses protection. Silence is the only way to act. |

## Policies (peers share budget, costs, consumer and model knowledge)

1. **No monitoring:** decide at t = 0 from the prior.
2. **Random:** query a uniformly random unqueried sensor until the budget is spent, then decide. Evaluated exactly by averaging over every choice sequence.
3. **Information first:** query the sensor with the largest expected information gain about H. It ignores time, and stops only when the budget is spent or no gain remains.
4. **Static value (deadline-blind):** myopic value of information with cost c, *assuming the decision stays available after the reading*. It queries while the best value is positive.
5. **Deadline-aware value:** the same myopic rule, but the value after a reading uses feasibility at t + δᵢ.
6. **Early-stop rule:** a single fixed rule for every world, with no per-world tuning. If protection would still be possible when the fastest unqueried sensor returns, query it once; then decide.
7. **Exact optimal:** backward induction over (tick, readings), knowing p, q, δ, D, c and B.

**Reference only (not a peer):** *Truth now*, which knows H at tick 0 at no cost. Its value is −K·p.

## Measurements

All of these are exact expectations over H and every reading, with no sampling:
- net utility;
- P(harm) = P(H = 1 and not protected);
- P(false alarm) = P(H = 0 and protected);
- expected queries;
- expected decision tick;
- **late truths:** the expected number of readings that arrive after D;
- **protective slack** σ = D − (decision tick), relative to this protective action only. Mean σ is computed over episodes in which protection began.

Slack is a diagnostic. It is not proof that protection occurred.

**Matched replay:** one atom (H plus all three readings, drawn from a seeded generator) is held fixed while the policy or the bell's delay changes.

## Pre-run expected values (hand-derived; c = 0.1)

| Fixture | Configuration | Expected net utility |
|---|---|---|
| F1 | `now`, any B: No monitoring, Deadline-aware, Early-stop, Optimal | −3.00 (protect at tick 0, since 0.5 × 10 > 3) |
| F1′ | `now`, B = 1: Information first and Static value | −5.10. Both choose the bell (1 bit; the largest value if time were free), so protection is lost. |
| F2 | `narrowing`, B = 1: Deadline-aware, Early-stop, Optimal | −1.85: query the scout. P(1) = 0.375 → π = 0.5 → protect; P(0) = 0.625 → π = 0.1 → stand down. 0.375 × (−3) + 0.625 × (−1) − 0.1 |
| F2′ | `narrowing`, B = 1: Information first, Static value | −2.60: the bell returns at tick 5, after D = 2 |
| F3 | `bell`, B = 1: Deadline-aware, Optimal | −1.05: the survey returns at tick 3 = D. P(1) = 0.275 → protect; P(0) = 0.725 → π ≈ 0.0172. 0.275 × (−3) + 0.725 × (−0.1724) − 0.1 |
| F3′ | `bell`, B = 1: Early-stop | −1.85; Information first and Static value: −2.60, with exactly one late truth |
| F4 | `spare`, B = 1: Information first, Static value, Deadline-aware, Optimal | −0.85 (the bell in time: −0.1 − 3 × 0.25); Early-stop −1.85; Truth now −0.75 |
| F5 | Intervention: `bell` with the bell moved to tick 3, B = 1, Information first | −0.85: the same true warning, delivered in time |

**Acceptance:** the solver must reproduce every fixture to 10⁻⁹. An independent rational oracle must agree with the solver on every base configuration. The JavaScript runtime used by the page must agree with the Python results on every base configuration.
