"""QS-002 The Last Reversible Moment: exact, deadline-aware monitoring. No sampling.

See docs/QS002_SPECIFICATION.md. QS-001 (engine.py) is untouched; nothing here imports it.
"""
from dataclasses import dataclass, replace
from functools import lru_cache
from itertools import product
import math

EPS = 1e-12
LOSS, PROTECT_COST = 10.0, 3.0
SENSORS = ('Fast scout', 'Slow survey', 'The bell')
RELIABILITY = (0.75, 0.95, 1.0)
POLICIES = ('none', 'random', 'information', 'blind', 'aware', 'early', 'optimal')
NAMES = {'none': 'No monitoring', 'random': 'Random', 'information': 'Information first',
         'blind': 'Static value (deadline-blind)', 'aware': 'Deadline-aware value',
         'early': 'Early-stop rule', 'optimal': 'Exact optimal', 'oracle': 'Truth now (reference)'}


@dataclass(frozen=True)
class World:
    name: str
    p: float
    deadline: int
    delays: tuple
    reliability: tuple = RELIABILITY

    def __post_init__(self):
        if not 0 < self.p < 1 or self.deadline < 0:
            raise ValueError('invalid prior or deadline')
        if len(self.delays) != 3 or any(d < 1 for d in self.delays):
            raise ValueError('three sensors, each with delay >= 1')
        if any(not .5 <= q <= 1 for q in self.reliability):
            raise ValueError('reliability in [.5, 1]')


WORLDS = {
    'spare': World('spare', .25, 6, (1, 3, 5)),
    'narrowing': World('narrowing', .25, 2, (1, 3, 5)),
    'bell': World('bell', .25, 3, (1, 3, 4)),
    'now': World('now', .50, 0, (1, 3, 5)),
}

# Found after the run by the adversarial search (quiet_signal/search_qs002.py), not specified
# in advance: different sensors, where two weak warnings are worth hearing together but neither
# alone changes the decision. Deadline-aware myopic value stays silent; the exact optimum listens.
SEARCHED = {
    'quiet': World('quiet', .10, 6, (2, 4, 7), (.75, .80, .90)),
}


def with_bell(world, delay):
    """The delivery intervention: the same true warning, rung at a different tick."""
    return replace(world, delays=world.delays[:2] + (delay,))


def likelihood(world, i, reading, h):
    q = world.reliability[i]
    return q if reading == h else 1 - q


def posterior(world, obs):
    """P(H=1 | obs), obs a tuple of (sensor, reading). None if the history is impossible."""
    a, b = world.p, 1 - world.p
    for i, r in obs:
        a *= likelihood(world, i, r, 1)
        b *= likelihood(world, i, r, 0)
    return None if a + b <= 0 else a / (a + b)


def predictive(world, pi, i):
    """P(reading of sensor i = 1 | belief pi)."""
    q = world.reliability[i]
    return pi * q + (1 - pi) * (1 - q)


def decision_value(pi, feasible):
    """Expected utility of the shared consumer's decision; ties stand down."""
    stand = -pi * LOSS
    return -PROTECT_COST if feasible and pi * LOSS > PROTECT_COST + EPS else stand


def protects(pi, feasible):
    return feasible and pi * LOSS > PROTECT_COST + EPS


def entropy(pi):
    return -sum(x * math.log2(x) for x in (pi, 1 - pi) if x > 0)


def branches(world, obs, i):
    """(probability, next observation tuple) for each reading of sensor i."""
    pi = posterior(world, obs)
    p1 = predictive(world, pi, i)
    return [(pr, obs + ((i, r),)) for r, pr in ((1, p1), (0, 1 - p1)) if pr > 0]


def unqueried(obs):
    seen = {i for i, _ in obs}
    return [i for i in range(3) if i not in seen]


def elapsed(world, obs):
    return sum(world.delays[i] for i, _ in obs)


def choose(world, policy, obs, budget, cost):
    """Next sensor for a deterministic myopic or rule policy, or None to decide now."""
    t, left = elapsed(world, obs), budget - len(obs)
    options = unqueried(obs) if left > 0 else []
    if not options:
        return None
    pi = posterior(world, obs)
    if policy == 'none':
        return None
    if policy == 'information':
        gains = [entropy(pi) - sum(pr * entropy(posterior(world, nxt)) for pr, nxt in branches(world, obs, i))
                 for i in options]
        best = max(gains)
        return options[gains.index(best)] if best > EPS else None
    if policy in ('blind', 'aware'):
        now = decision_value(pi, True if policy == 'blind' else t <= world.deadline)
        values = []
        for i in options:
            ok = True if policy == 'blind' else t + world.delays[i] <= world.deadline
            after = sum(pr * decision_value(posterior(world, nxt), ok) for pr, nxt in branches(world, obs, i))
            values.append(after - now - cost)
        best = max(values)
        return options[values.index(best)] if best > EPS else None
    if policy == 'early':
        if obs:
            return None
        i = min(options, key=lambda k: (world.delays[k], k))
        return i if t + world.delays[i] <= world.deadline else None
    raise ValueError(policy)


@lru_cache(maxsize=None)
def optimal_value(world, obs, budget, cost):
    """Backward induction: (value, action) where action is None (decide) or a sensor."""
    t = elapsed(world, obs)
    best, action = decision_value(posterior(world, obs), t <= world.deadline), None
    if len(obs) < budget:
        for i in unqueried(obs):
            v = -cost + sum(pr * optimal_value(world, nxt, budget, cost)[0] for pr, nxt in branches(world, obs, i))
            if v > best + EPS:
                best, action = v, i
    return best, action


def plans(world, policy, obs, budget, cost):
    """[(weight, next sensor or None)] — random averages uniformly over unqueried sensors."""
    if policy == 'random':
        options = unqueried(obs) if len(obs) < budget else []
        return [(1 / len(options), i) for i in options] if options else [(1.0, None)]
    if policy == 'optimal':
        return [(1.0, optimal_value(world, obs, budget, cost)[1])]
    return [(1.0, choose(world, policy, obs, budget, cost))]


def atoms(world):
    """Every joint (H, readings of all three sensors) with nonzero probability."""
    out = []
    for h, *rs in product((0, 1), repeat=4):
        pr = world.p if h else 1 - world.p
        for i, r in enumerate(rs):
            pr *= likelihood(world, i, r, h)
        if pr > 0:
            out.append((pr, h, tuple(rs)))
    return out


def episodes(world, policy, budget, cost, atom):
    """[(weight, record)] for one atom; random branches over its choices."""
    _, h, rs = atom
    out = []

    def walk(obs, weight):
        for w, i in plans(world, policy, obs, budget, cost):
            if i is None:
                t = elapsed(world, obs)
                pi = posterior(world, obs)
                prot = protects(pi, t <= world.deadline)
                late, clock = 0, 0
                for k, _ in obs:
                    clock += world.delays[k]
                    late += clock > world.deadline
                util = -cost * len(obs) - (PROTECT_COST if prot else 0) - (LOSS if h and not prot else 0)
                out.append((weight * w, dict(trace=tuple(k for k, _ in obs), tick=t, protected=prot,
                                             harm=bool(h and not prot), false_alarm=bool(prot and not h),
                                             late=late, utility=util)))
            else:
                walk(obs + ((i, rs[i]),), weight * w)
    walk((), 1.0)
    return out


def evaluate(world, policy, budget, cost):
    """Exact expectations of every measurement for one configuration."""
    if policy == 'oracle':
        return dict(net=-PROTECT_COST * world.p, harm=0.0, false_alarm=0.0, queries=0.0, tick=0.0,
                    late=0.0, slack=float(world.deadline), protect=world.p)
    acc = dict(net=0.0, harm=0.0, false_alarm=0.0, queries=0.0, tick=0.0, late=0.0, protect=0.0, slack_mass=0.0)
    for atom in atoms(world):
        for w, e in episodes(world, policy, budget, cost, atom):
            m = atom[0] * w
            acc['net'] += m * e['utility']
            acc['harm'] += m * e['harm']
            acc['false_alarm'] += m * e['false_alarm']
            acc['queries'] += m * len(e['trace'])
            acc['tick'] += m * e['tick']
            acc['late'] += m * e['late']
            if e['protected']:
                acc['protect'] += m
                acc['slack_mass'] += m * (world.deadline - e['tick'])
    slack = acc.pop('slack_mass') / acc['protect'] if acc['protect'] > EPS else float('nan')
    return dict(acc, slack=slack)


def expected_net(world, policy, budget, cost):
    """Net utility by recursion over beliefs (a second route to the same number)."""
    def value(obs):
        total = 0.0
        for w, i in plans(world, policy, obs, budget, cost):
            if i is None:
                total += w * decision_value(posterior(world, obs), elapsed(world, obs) <= world.deadline)
            else:
                total += w * (-cost + sum(pr * value(nxt) for pr, nxt in branches(world, obs, i)))
        return total
    return value(())


def replay(world, policy, budget, cost, atom):
    """The record for one fixed atom (random returns its first branch only, for display)."""
    return episodes(world, policy, budget, cost, atom)[0][1]
