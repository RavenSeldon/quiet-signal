"""Finite model, exact Bayes consumer and adaptive allocation. No sampling."""
from dataclasses import dataclass
from functools import lru_cache
from itertools import product
import numpy as np

EMPTY = (-1, -1, -1)
POLICIES = ('none', 'random', 'information', 'severity', 'myopic', 'optimal', 'task_information')
EPS = 1e-12


def entropy(p):
    p = np.asarray(p, dtype=float)
    p = p[p > 0]
    return float(-(p * np.log2(p)).sum())


def winner(values):
    """Stable lowest-index maximizer, with explicit floating point tie tolerance."""
    top = max(values)
    return next(i for i, v in enumerate(values) if v >= top - EPS)


@dataclass(frozen=True)
class World:
    name: str
    p: float
    channels: tuple
    reliability: tuple
    alpha: float = 0.0
    connected: bool = True
    priority: tuple = (0, 1, 2)

    def __post_init__(self):
        if not 0 < self.p < 1 or not 0 <= self.alpha <= 1:
            raise ValueError('Invalid prior or complementarity')
        if len(self.channels) != 3 or any(i not in range(3) for i in self.channels):
            raise ValueError('Exactly three bit sensors required')
        if len(self.reliability) != 3 or any(not .5 <= q <= 1 for q in self.reliability):
            raise ValueError('Reliability must be in [.5, 1]')
        if sorted(self.priority) != [0, 1, 2]:
            raise ValueError('Priority must be a permutation')


BASE = {
    'distraction': World('distraction', .2, (1, 0, 0), (.98, .8, .65), priority=(1, 2, 0)),
    'complementarity': World('complementarity', .5, (0, 1, 2), (.9, .9, .98), alpha=1),
    'alignment': World('alignment', .5, (0, 0, 0), (.9, .7, .6)),
    'disconnected': World('disconnected', .5, (0, 0, 0), (.9, .7, .6), connected=False),
}


class Model:
    def __init__(self, world):
        self.world = world
        self.states = np.array(list(product((0, 1), repeat=3)))
        self.prior = np.where(self.states[:, 0] == 1, world.p, 1-world.p) / 4
        self.target = ((1-world.alpha) * self.states[:, 0]
                       + world.alpha * (self.states[:, 0] ^ self.states[:, 1]))
        self.rewards = np.column_stack((np.full(8, 2.), 8-16*self.target, 16*self.target-8))
        self.likelihood = np.empty((3, 2, 8))
        for i, (source, q) in enumerate(zip(world.channels, world.reliability)):
            for s in (0, 1):
                self.likelihood[i, s] = np.where(self.states[:, source] == s, q, 1-q)

    @lru_cache(None)
    def posterior(self, history):
        p = self.prior.copy()
        for i, s in enumerate(history):
            if s != -1:
                p *= self.likelihood[i, s]
        mass = float(p.sum())
        if mass <= 0:
            raise ValueError('Impossible transcript')
        return p / mass

    def branch(self, history, i):
        if history[i] != -1:
            raise ValueError('Cannot query twice')
        p = self.posterior(history)
        for s in (0, 1):
            prob = float(p @ self.likelihood[i, s])
            if prob > 0:
                new = list(history)
                new[i] = s
                yield prob, tuple(new)

    @lru_cache(None)
    def decision(self, history, force_disconnected=False):
        read = EMPTY if force_disconnected or not self.world.connected else history
        values = self.posterior(read) @ self.rewards
        a = winner(values)
        return a, float(values[a])

    def uncertainty(self, history, target=False):
        p = self.posterior(history)
        if target:
            t = float(p @ self.target)
            return entropy([1-t, t])
        return entropy(p)

    def information_gain(self, history, i, target=False):
        return self.uncertainty(history, target) - sum(
            prob*self.uncertainty(new, target) for prob, new in self.branch(history, i))

    def atoms(self):
        for wi, state in enumerate(self.states):
            for signal in product((0, 1), repeat=3):
                probability = float(self.prior[wi] * np.prod([
                    self.likelihood[i, s, wi] for i, s in enumerate(signal)]))
                if probability > 0:
                    yield wi, signal, probability


class Solver:
    def __init__(self, model, interruption=.2, observation=.05):
        if not np.isfinite(interruption) or not np.isfinite(observation) or min(interruption, observation) < 0:
            raise ValueError('Costs must be finite and nonnegative')
        self.model, self.interruption, self.observation = model, interruption, observation
        self.cost = interruption + observation

    @lru_cache(None)
    def optimal(self, history, remaining):
        best = self.model.decision(history)[1]
        choice = -1
        if remaining:
            for i, s in enumerate(history):
                if s == -1:
                    value = -self.cost + sum(p*self.optimal(h, remaining-1)[0]
                                            for p, h in self.model.branch(history, i))
                    if value > best + EPS:
                        best, choice = value, i
        return best, choice

    @lru_cache(None)
    def choices(self, policy, history, remaining):
        available = [i for i, s in enumerate(history) if s == -1]
        if not remaining or not available or policy == 'none':
            return ((-1, 1.),)
        if policy == 'random':
            return tuple((i, 1/len(available)) for i in available)
        if policy == 'optimal':
            return ((self.optimal(history, remaining)[1], 1.),)
        if policy == 'severity':
            return ((next(i for i in self.model.world.priority if i in available), 1.),)
        if policy == 'myopic':
            scores = [sum(p*self.model.decision(h)[1] for p, h in self.model.branch(history, i))
                      - self.model.decision(history)[1] - self.cost for i in available]
        elif policy in ('information', 'task_information'):
            scores = [self.model.information_gain(history, i, policy == 'task_information') for i in available]
        else:
            raise ValueError(f'Unknown policy: {policy}')
        k = winner(scores)
        return ((available[k] if scores[k] > EPS else -1, 1.),)

    def terminal_metrics(self, history, n, free=False):
        m = self.model
        p = m.posterior(history)
        action, _ = m.decision(history)
        baseline = m.decision(EMPTY)[0]
        utility = float(p @ m.rewards[:, action])
        gain = m.rewards[:, action] - m.rewards[:, baseline]
        # For mixed alpha, enumerate target outcome here, not signs of expected rewards.
        improved = harmed = failure = 0.
        for wi in range(8):
            for t, pt in ((0, 1-m.target[wi]), (1, m.target[wi])):
                rewards = (2, 8 if t == 0 else -8, 8 if t == 1 else -8)
                improved += p[wi]*pt*(rewards[action] > rewards[baseline])
                harmed += p[wi]*pt*(rewards[action] < rewards[baseline])
                failure += p[wi]*pt*(action != 0 and action-1 != t)
        used = 0
        for i, s in enumerate(history):
            if s != -1:
                removed = list(history); removed[i] = -1
                used += m.decision(tuple(removed))[0] != action
        return dict(utility=utility, net=utility-(0 if free else n*self.cost),
                    capacity=float(n), interruptions=float(n),
                    observation_cost=0. if free else n*self.observation,
                    interruption_cost=0. if free else n*self.interruption,
                    information=m.uncertainty(EMPTY)-m.uncertainty(history),
                    target_information=m.uncertainty(EMPTY, True)-m.uncertainty(history, True),
                    failure=float(failure), reserve=float(action == 0),
                    read=float(n), decision_dependent_signals=float(used),
                    action_changed=float(action != baseline), improved=float(improved), harmed=float(harmed),
                    routing_utility_gain=float(p @ gain))

    def evaluate(self, policy, budget):
        if budget not in range(4):
            raise ValueError('Budget must be 0, 1, 2, or 3')
        @lru_cache(None)
        def visit(h, remaining):
            if policy == 'full':
                choices = ((next((i for i, s in enumerate(h) if s == -1), -1), 1.),)
            else:
                choices = self.choices(policy, h, remaining)
            result = None
            for i, chance in choices:
                if i == -1:
                    term = self.terminal_metrics(h, sum(s != -1 for s in h), free=policy == 'full')
                    children = [(chance, term)]
                else:
                    children = [(chance*p, visit(new, remaining-1)) for p, new in self.model.branch(h, i)]
                for prob, child in children:
                    if result is None:
                        result = {k: 0. for k in child}
                    for k, v in child.items():
                        result[k] += prob*v
            return result
        return visit(EMPTY, 3 if policy == 'full' else budget)

    def replay(self, policy, budget, wi, signals, random_seed=7):
        if budget not in range(4):
            raise ValueError('Invalid budget')
        rng = np.random.default_rng(random_seed)
        h, remaining, trace = EMPTY, (3 if policy == 'full' else budget), []
        while True:
            choices = (((next((i for i, s in enumerate(h) if s == -1), -1), 1.),)
                       if policy == 'full' else self.choices(policy, h, remaining))
            i = choices[int(rng.choice(len(choices), p=[v for _, v in choices]))][0]
            if i == -1:
                break
            previous = self.model.decision(h)[0]
            new = list(h); new[i] = signals[i]; h = tuple(new)
            trace.append(dict(sensor=i, signal=signals[i], action_before=previous,
                              action_after=self.model.decision(h)[0]))
            remaining -= 1
        a = self.model.decision(h)[0]
        gross = float(self.model.rewards[wi, a])
        return dict(history=h, action=a, trace=trace, utility=gross,
                    net=gross-(0 if policy == 'full' else len(trace)*self.cost))
