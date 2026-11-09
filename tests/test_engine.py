import unittest
from fractions import Fraction as F
from itertools import product
from dataclasses import replace
import numpy as np
from quiet_signal.engine import BASE, Model, Solver, EMPTY, POLICIES


def exhaustive(world, budget, cost):
    """Independent rational enumeration of all policy trees; no engine internals."""
    atoms = []
    for state in product((0, 1), repeat=3):
        prior = (F(str(world.p)) if state[0] else 1-F(str(world.p))) / 4
        target = state[0] ^ state[1] if world.alpha == 1 else state[0]
        for signal in product((0, 1), repeat=3):
            p = prior
            for i in range(3):
                q = F(str(world.reliability[i]))
                p *= q if signal[i] == state[world.channels[i]] else 1-q
            if p: atoms.append((signal, target, p))
    def visit(rows, remaining, available):
        mass = sum(p for _, _, p in rows)
        stop = max(sum(p*(2 if a == 0 else 8 if a-1 == t else -8)
                       for _, t, p in rows) for a in range(3))
        values = [stop]
        if remaining:
            for i in available:
                rest = [j for j in available if j != i]
                branches = [[r for r in rows if r[0][i] == s] for s in (0, 1)]
                lv, rv = [visit(rs, remaining-1, rest) if rs else [F(0)] for rs in branches]
                values.extend(a+b-mass*cost for a in lv for b in rv)
        return values
    return max(visit(atoms, budget, list(range(3))))


class EngineTests(unittest.TestCase):
    def test_distribution_and_bayes(self):
        for w in BASE.values():
            m = Model(w)
            self.assertAlmostEqual(sum(p for _,_,p in m.atoms()), 1)
            for h in product((-1,0,1), repeat=3):
                bystate = np.zeros(8)
                for wi,s,prob in m.atoms():
                    if all(v == -1 or s[i] == v for i,v in enumerate(h)): bystate[wi] += prob
                np.testing.assert_allclose(m.posterior(h), bystate/bystate.sum(), atol=1e-12)

    def test_hand_derived_alignment(self):
        s = Solver(Model(BASE['alignment']))
        self.assertEqual(s.model.decision(EMPTY)[0], 0)
        self.assertAlmostEqual(s.evaluate('none',0)['net'], 2)
        for p in ('optimal','myopic','information','severity','task_information'):
            self.assertAlmostEqual(s.evaluate(p,1)['net'], 6.15)
        self.assertAlmostEqual(s.evaluate('optimal',1)['utility'], 6.4)

    def test_complementarity_counterexample(self):
        s = Solver(Model(BASE['complementarity']))
        for i in range(3):
            self.assertAlmostEqual(sum(p*s.model.decision(h)[1] for p,h in s.model.branch(EMPTY,i)), 2)
        for policy, expected in [('myopic',2),('optimal',4.62),('severity',4.62),('information',1.5),('task_information',2)]:
            self.assertAlmostEqual(s.evaluate(policy,2)['net'], expected)

    def test_rational_exhaustive_policy_trees(self):
        for name in ('alignment','complementarity','distraction'):
            for b in range(4):
                for c in (F(0), F(1,4), F(4)):
                    with self.subTest(world=name,budget=b,cost=c):
                        s = Solver(Model(BASE[name]), interruption=float(c), observation=0)
                        expected = float(exhaustive(BASE[name],b,c))
                        self.assertAlmostEqual(s.optimal(EMPTY,b)[0], expected, places=10)
                        self.assertAlmostEqual(s.evaluate('optimal',b)['net'], expected, places=10)

    def test_budgets_costs_dominance_and_full_reference(self):
        for w in BASE.values():
            s = Solver(Model(w))
            for b in range(4):
                for policy in POLICIES:
                    r = s.evaluate(policy,b)
                    self.assertLessEqual(r['capacity'],b+1e-10)
                    self.assertAlmostEqual(r['utility']-r['net'],r['capacity']*.25)
                    self.assertAlmostEqual(r['interruptions'],r['capacity'])
                    self.assertLessEqual(r['net'],s.evaluate('optimal',b)['net']+1e-10)
                    self.assertLessEqual(r['utility'],s.evaluate('full',3)['utility']+1e-10)
            free = Solver(Model(w),interruption=0,observation=0)
            self.assertAlmostEqual(free.evaluate('optimal',3)['net'],free.evaluate('full',3)['net'])

    def test_informative_unused_routing_intervention(self):
        connected, unused = [Solver(Model(BASE[n])) for n in ('alignment','disconnected')]
        for s in (connected,unused): self.assertGreater(s.evaluate('severity',1)['information'],.5)
        r = unused.evaluate('severity',1)
        self.assertAlmostEqual(r['utility'],2)
        self.assertAlmostEqual(r['net'],1.75)
        for k in ('routing_utility_gain','decision_dependent_signals','action_changed'): self.assertAlmostEqual(r[k],0)
        for wi,sig,_ in connected.model.atoms():
            a,b = [s.replay('severity',1,wi,sig) for s in (connected,unused)]
            self.assertEqual(a['history'],b['history'])
            self.assertEqual(b['action'],0)
            self.assertNotEqual(a['action'],b['action'])
        m = connected.model
        self.assertNotEqual(m.likelihood[0,1,0],m.likelihood[0,1,4])
        self.assertNotEqual(m.decision((0,-1,-1))[0],m.decision((1,-1,-1))[0])
        self.assertEqual(unused.model.decision((0,-1,-1))[0],unused.model.decision((1,-1,-1))[0])

    def test_silence_when_uninformative_or_expensive(self):
        for w in BASE.values():
            for p in ('optimal','myopic'): self.assertEqual(Solver(Model(w),interruption=10).evaluate(p,3)['capacity'],0)
            self.assertEqual(Solver(Model(replace(w,reliability=(.5,.5,.5)))).evaluate('optimal',3)['capacity'],0)

    def test_replay_matches_exact_evaluation(self):
        for w in BASE.values():
            s = Solver(Model(w))
            for policy in POLICIES:
                if policy != 'random':
                    for b in range(4):
                        value = sum(p*s.replay(policy,b,wi,sig)['net'] for wi,sig,p in s.model.atoms())
                        self.assertAlmostEqual(value,s.evaluate(policy,b)['net'])
                a = s.replay(policy,2,3,(1,0,1),random_seed=101)
                self.assertEqual(a,s.replay(policy,2,3,(1,0,1),random_seed=101))

    def test_mixed_target_accounting(self):
        s = Solver(Model(replace(BASE['complementarity'],alpha=.5)))
        for p in POLICIES:
            r = s.evaluate(p,3)
            self.assertLessEqual(r['improved']+r['harmed'],1+1e-10)
            self.assertGreaterEqual(r['failure'],0)

    def test_invalid_inputs(self):
        with self.assertRaises(ValueError): Solver(Model(BASE['alignment']),interruption=-1)
        with self.assertRaises(ValueError): Solver(Model(BASE['alignment'])).evaluate('optimal',4)
        with self.assertRaises(ValueError): replace(BASE['alignment'],reliability=(1.1,.5,.5))

if __name__ == '__main__': unittest.main()
