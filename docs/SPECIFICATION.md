# The smallest honest world · design v0.1

Written before the first comparison run. This is a constructed demonstration,
not a preregistered empirical confirmation or a new Sīdus result.

## World and timing

One decision, one resource unit, two mutually exclusive delivery routes. A safe
reserve action conserves the unit and earns 2 utility. Route 0 or route 1 spends
the unit and earns +8 if it matches the hidden target, −8 otherwise. The episode
then terminates. There are no further transitions or learning. The observatory
and delivery story are CREATION; the tables and calculations are EVIDENCE about
this specified model only.

Hidden state W=(X,Y,Z) has eight possibilities. Bits are independent; X has prior
p, Y and Z are fair. Three sensors each observe one specified bit through an
independent binary symmetric noise channel of reliability q_i. Each channel's
single output is fixed for the whole episode. Enumeration uses the 64 (W,S)
atoms and their product probabilities. Policies know the model, never W or an
unqueried S. Histories are ternary triples: unread / 0 / 1.

At each monitoring step, query one unread sensor or STOP. A query reads and
routes its entire one-bit output, consumes one packet slot, and incurs 0.05
observation cost plus an interruption cost c. At most B∈{0,1,2,3} queries, with
no repeated queries. No free pre-screening and no observation-dependent silence
channel. STOP ends monitoring and is the explicit silence action. The same
rules apply to every peer policy. No sunk query costs are refunded.

Capacity is an integer count of sensor packets, NOT mutual information, tokens,
human attention, money, or computation. Information is reported separately in
Shannon bits. Costs and rewards are in artificial task-utility units; λ=1.

The terminal consumer maximizes posterior expected task utility; ties prefer
reserve, then route 0, then route 1 (tolerance 1e−12). An unused-information
control disconnects the entire transcript from the consumer: it always uses
the prior, including when the allocation algorithm has read the signals.

## Fixtures

* **Distraction:** p=.2; target X; sensors (Y,X,X), q=(.98,.8,.65).
  A reliable but task-irrelevant sensor competes with useful ones.
* **Complementarity:** p=.5; target X XOR Y; sensors (X,Y,Z),
  q=(.9,.9,.98). Neither of the first two alone improves a decision.
* **Alignment:** p=.5; target X; sensors (X,X,X), q=(.9,.7,.6).
  Information and decision value can select the same sensor.
* **Disconnected:** the alignment world with the consumer gate disabled.

Complementarity sensitivity uses P(target=1|X,Y)=(1−α)X+α(X XOR Y).
This adds an independent terminal target draw. The engine integrates it exactly;
the browser uses only α=0 or 1, so replay outcomes there are deterministic.

## Policies

1. No monitoring: STOP.
2. Random: uniformly choose an unread sensor until B is spent. Average over all
   possible query orders exactly; episode replay uses a seeded choice.
3. Maximum information gain: greedily maximize I(W;S_i|history), stop if zero.
   This is full-world information, an explicit and consequential target choice.
4. Severity: fixed priority (1,2,0) for distraction, (0,1,2) otherwise; spend B.
   This is a declared hazard-priority rule, not access to unobserved alerts.
5. Myopic value: query the greatest one-step expected increase in terminal
   utility minus query cost; STOP when no positive improvement exists.
6. Optimal: finite-horizon Bellman recursion including STOP and every unread
   query. Optimize expected utility minus all future query costs.
7. Task information gain: additional rival, maximize I(target;S_i|history).
8. Free full signals: all three noisy signals at zero cost and without a budget.
   An upper reference, NOT a feasible peer. Perfect state utility (8) is a
   separate ceiling in deterministic-target fixtures. No compression claim.

Query-score ties prefer the lowest sensor index. Optimal/myopic ties prefer
STOP. All policies have access to the same known distributions; solver compute
time is not charged. Consequently optimal dominance within this model is a
mathematical consequence, not evidence for a practical universal advantage.

## Measurements and interventions

Enumerate expected gross utility, query and interruption costs, net utility,
capacity/interruptions, world and target information, reserve probability,
avoidable failure (wrong route, which reserve could prevent), action-change
probability, better/worse outcome probabilities against the prior-only action,
and expected utility change under transcript removal. Count read signals and
signals whose individual removal changes the terminal action.

For intervention do(gate=off), fix W, all sensor outputs, the selected query
transcript, costs and budget; replace ONLY the consumer input by its prior.
For single-signal removal, erase that entry from the terminal consumer input,
holding all other entries fixed. Do not rerun the allocator or infer hidden
values from the chosen schedule. These are controlled interventions in the
specified program, not empirical causal estimates or natural total effects.
A signal can be decision-relevant jointly even if an individual effect is zero.

Expectations use the entire finite distribution, not samples or confidence
intervals. Floating-point tolerance is 1e−10 for validation. Episode draws are
illustrations drawn from that distribution, not statistical estimates.

## Hand-derived test fixtures (before execution)

* Alignment, B=0: reserve, U=2.
* Alignment, sensor 0 alone: accuracy .9, gross U=6.4. At c=.20,
  net U=6.15 (cost .25). Noisier channels should not displace it at B=1.
* Complementarity, any one sensor: gross U=2. Signals 0 and 1 together have
  parity accuracy .9²+.1²=.82, gross U=5.12, net U=4.62 at c=.20.
  Myopic stops at U=2; exact optimum at B=2 is 4.62. The severity rule ties it.
* Complementarity, q=.5: no sensor improves task utility; optimal stops.
* Disconnected: gross U=2 for every transcript; information can be positive,
  but no consumer action or outcome can improve. Query costs still apply.
* At zero costs and B=3, constrained optimal equals the free-full reference.
* At c=10, optimal and myopic stop in every base fixture.

## Sensitivity and finish line

Cross reliability q∈{.5,.65,.8,.9,1}, complementarity α∈{0,.25,.5,.75,1},
B∈{0,1,2,3}, and interruption c∈{0,.2,1,3,10}; retain every comparison.
Also run the base fixtures at every B and c. Reliability sweeps set all three
channels to q, explicitly distinct from the heterogeneous base fixtures.
Test normalization, Bayes updates, budget/cost accounting, routing ablation,
Bellman agreement with an independent exhaustive policy-tree enumerator,
deterministic replay and browser/export agreement before UI delivery.
