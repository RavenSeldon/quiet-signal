"""QS-002 foundation tests: pre-run fixtures, two evaluation routes, and a rational oracle."""
import math
import unittest
from fractions import Fraction as F
from itertools import product

from quiet_signal import temporal as T

C = 0.1


class Fixtures(unittest.TestCase):
    """Hand-derived values written in docs/QS002_SPECIFICATION.md before any run."""

    def net(self, world, policy, budget=1, cost=C):
        return T.evaluate(world, policy, budget, cost)['net']

    def test_act_now(self):
        w = T.WORLDS['now']
        for b in range(4):
            for p in ('none', 'aware', 'early', 'optimal'):
                self.assertAlmostEqual(self.net(w, p, b), -3.0, places=9)
        for p in ('information', 'blind'):
            self.assertAlmostEqual(self.net(w, p, 1), -5.1, places=9)

    def test_narrowing_window(self):
        w = T.WORLDS['narrowing']
        for p in ('aware', 'early', 'optimal'):
            self.assertAlmostEqual(self.net(w, p), -1.85, places=9)
        for p in ('information', 'blind'):
            self.assertAlmostEqual(self.net(w, p), -2.6, places=9)

    def test_funeral_bell(self):
        w = T.WORLDS['bell']
        expected_b = .275 * -3 + .725 * -(.0125 / .725 * 10) - .1
        for p in ('aware', 'optimal'):
            self.assertAlmostEqual(self.net(w, p), expected_b, places=9)
        self.assertAlmostEqual(expected_b, -1.05, places=9)
        self.assertAlmostEqual(self.net(w, 'early'), -1.85, places=9)
        for p in ('information', 'blind'):
            r = T.evaluate(w, p, 1, C)
            self.assertAlmostEqual(r['net'], -2.6, places=9)
            self.assertAlmostEqual(r['late'], 1.0, places=12)

    def test_time_to_spare(self):
        w = T.WORLDS['spare']
        for p in ('information', 'blind', 'aware', 'optimal'):
            self.assertAlmostEqual(self.net(w, p), -0.85, places=9)
        self.assertAlmostEqual(self.net(w, 'early'), -1.85, places=9)
        self.assertAlmostEqual(self.net(w, 'oracle'), -0.75, places=12)

    def test_delivery_intervention(self):
        """The same true warning, moved to the last reversible moment, becomes protective."""
        w = T.with_bell(T.WORLDS['bell'], 3)
        self.assertAlmostEqual(self.net(w, 'information'), -0.85, places=9)
        self.assertEqual(T.evaluate(w, 'information', 1, C)['late'], 0)


class SearchedCounterexample(unittest.TestCase):
    def test_two_quiet_warnings(self):
        """Found after the run: deadline-aware myopic silence loses to two-step listening."""
        w = T.SEARCHED['quiet']
        self.assertAlmostEqual(T.evaluate(w, 'aware', 2, .05)['net'], -1.0, places=9)
        self.assertAlmostEqual(T.evaluate(w, 'optimal', 2, .05)['net'], -0.778, places=9)
        self.assertEqual(T.evaluate(w, 'aware', 2, .05)['queries'], 0)


class Consistency(unittest.TestCase):
    def test_two_routes_agree(self):
        """Atom-by-atom accounting equals recursion over beliefs, everywhere in the base grid."""
        for w in T.WORLDS.values():
            for b, c, p in product(range(4), (0, .1, .5, 2), T.POLICIES):
                self.assertAlmostEqual(T.evaluate(w, p, b, c)['net'], T.expected_net(w, p, b, c), places=9)

    def test_optimal_dominates_peers_and_reference_bounds_it(self):
        for w in T.WORLDS.values():
            for b, c in product(range(4), (0, .1, .5, 2)):
                best = T.evaluate(w, 'optimal', b, c)['net']
                for p in T.POLICIES:
                    self.assertLessEqual(T.evaluate(w, p, b, c)['net'], best + 1e-9)
                self.assertLessEqual(best, T.evaluate(w, 'oracle', b, c)['net'] + 1e-9)

    def test_budget_and_clock(self):
        for w in T.WORLDS.values():
            for b, p in product(range(4), T.POLICIES):
                for atom in T.atoms(w):
                    for _, e in T.episodes(w, p, b, C, atom):
                        self.assertLessEqual(len(e['trace']), b)
                        self.assertEqual(len(set(e['trace'])), len(e['trace']))
                        self.assertEqual(e['tick'], sum(w.delays[i] for i in e['trace']))
                        if e['protected']:
                            self.assertLessEqual(e['tick'], w.deadline)

    def test_late_reading_cannot_protect(self):
        """Structural control: once the clock passes D, no reading can start protection."""
        w = T.WORLDS['now']
        for b in (1, 2, 3):
            r = T.evaluate(w, 'information', b, C)
            self.assertEqual(r['protect'], 0)
            self.assertAlmostEqual(r['harm'], w.p, places=12)


class RationalOracle(unittest.TestCase):
    """Independent route: exact fractions over unnormalised joint mass, not posteriors."""

    P = {'spare': F(1, 4), 'narrowing': F(1, 4), 'bell': F(1, 4), 'now': F(1, 2)}
    Q = (F(3, 4), F(19, 20), F(1))
    COSTS = (F(0), F(1, 10), F(1, 2), F(2))

    def atoms(self, name):
        out = []
        for h, *rs in product((0, 1), repeat=4):
            m = self.P[name] if h else 1 - self.P[name]
            for q, r in zip(self.Q, rs):
                m *= q if r == h else 1 - q
            if m:
                out.append((m, h, tuple(rs)))
        return out

    def best(self, world, atoms, hist, budget, cost):
        mass = sum(m for m, *_ in atoms)
        hazard = sum(m for m, h, _ in atoms if h)
        t = sum(world.delays[i] for i, _ in hist)
        protect = t <= world.deadline and 10 * hazard > 3 * mass
        value = -3 * mass if protect else -10 * hazard
        if len(hist) < budget:
            seen = {i for i, _ in hist}
            for i in range(3):
                if i in seen:
                    continue
                v = -cost * mass
                for r in (0, 1):
                    sub = [a for a in atoms if a[2][i] == r]
                    if sub:
                        v += self.best(world, sub, hist + ((i, r),), budget, cost)
                value = max(value, v)
        return value

    def test_optimal_matches_rational_search(self):
        for name, w in T.WORLDS.items():
            atoms = self.atoms(name)
            for b, c in product(range(4), self.COSTS):
                exact = self.best(w, atoms, (), b, c)
                self.assertAlmostEqual(float(exact), T.evaluate(w, 'optimal', b, float(c))['net'], places=9)

    def test_policy_accounting_in_fractions(self):
        """Each policy's per-atom choices, re-scored with exact fractions."""
        for name, w in T.WORLDS.items():
            for b, c, p in product(range(4), self.COSTS, T.POLICIES):
                total = F(0)
                for (m, h, rs), atom in zip(self.atoms(name), T.atoms(w)):
                    for weight, e in T.episodes(w, p, b, float(c), atom):
                        u = -c * len(e['trace']) - (3 if e['protected'] else 0) - (10 if h and not e['protected'] else 0)
                        total += m * F(weight).limit_denominator(1000) * u
                self.assertAlmostEqual(float(total), T.evaluate(w, p, b, float(c))['net'], places=9)


if __name__ == '__main__':
    unittest.main()


class Record(unittest.TestCase):
    """Numbers quoted on the QS-002 page must come from the generated results."""

    def test_page_quotes_generated_results(self):
        import csv, json
        from pathlib import Path
        root = Path(__file__).resolve().parents[1]
        page = (root / 'web/last-reversible-moment/index.html').read_text()
        summary = json.loads((root / 'results/qs002_summary.json').read_text())
        search = json.loads((root / 'results/qs002_search.json').read_text())
        with open(root / 'results/qs002_sensitivity.csv') as f:
            grid = list(csv.DictReader(f))
        from quiet_signal.benchmark_qs002 import summarise
        regenerated = summarise(grid)
        self.assertEqual(regenerated.pop('aware_largest_gap')['gap'], summary['aware_largest_gap']['gap'])
        self.assertEqual(regenerated, {k: v for k, v in summary.items() if k != 'aware_largest_gap'})
        s = summary
        self.assertEqual(s['aware_vs_information']['lose'], 0)
        self.assertEqual(s['aware_vs_blind']['lose'], 0)
        self.assertEqual(s['aware_vs_optimal']['tie'], s['configurations'])
        for text in (f"{s['configurations']:,} configurations", f"won {s['aware_vs_information']['win']}",
                     f"tied {s['aware_vs_information']['tie']}",
                     f"tied the optimum in {s['early_vs_optimal']['tie']} configurations ({round(100 * s['early_vs_optimal']['tie'] / s['configurations'])}%)",
                     f"{search['configurations']:,} wider configurations",
                     f"{search['aware_below_optimal']:,} ({100 * search['share']:.2f}%)",
                     f"by at most {search['largest'][0]['gap']:.3f}"):
            self.assertIn(text, page, text)
        self.assertEqual(s['information_vs_aware_when_bell_late']['lose'], s['aware_vs_information']['win'])
