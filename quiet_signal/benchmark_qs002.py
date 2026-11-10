"""QS-002 benchmark: base grid, sensitivity grid and summary. Exact; no sampling.

    python3 -m quiet_signal.benchmark_qs002
"""
import csv
import json
import math
from itertools import product
from pathlib import Path

from quiet_signal import temporal as T

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'results'
FIELDS = ('net', 'harm', 'false_alarm', 'queries', 'tick', 'late', 'protect', 'slack')


def clean(x):
    return '' if isinstance(x, float) and math.isnan(x) else repr(float(x))


def base():
    rows = []
    for (name, w), b, c in product(T.WORLDS.items(), range(4), (0, .1, .5, 2)):
        for p in T.POLICIES + ('oracle',):
            r = T.evaluate(w, p, b, c)
            rows.append(dict(world=name, budget=b, cost=c, policy=p, **{k: clean(r[k]) for k in FIELDS}))
    return rows


def sensitivity():
    rows = []
    for d, bell, p, c, b in product(range(7), range(1, 8), (.1, .25, .5), (0, .1, .5), (1, 2, 3)):
        w = T.World(f'grid', p, d, (1, 3, bell))
        nets = {k: T.evaluate(w, k, b, c)['net'] for k in T.POLICIES}
        rows.append(dict(deadline=d, bell_delay=bell, p=p, cost=c, budget=b, **{k: repr(v) for k, v in nets.items()}))
    return rows


def compare(rows, a, b):
    win = sum(float(r[a]) > float(r[b]) + 1e-9 for r in rows)
    lose = sum(float(r[a]) < float(r[b]) - 1e-9 for r in rows)
    return dict(win=win, tie=len(rows) - win - lose, lose=lose)


def summarise(grid):
    s = {'configurations': len(grid)}
    for other in ('information', 'blind', 'early', 'none', 'random'):
        s[f'aware_vs_{other}'] = compare(grid, 'aware', other)
    for p in ('aware', 'early', 'information', 'blind'):
        s[f'{p}_vs_optimal'] = compare(grid, p, 'optimal')
    gaps = [(float(r['optimal']) - float(r['aware']), r) for r in grid]
    worst = max(gaps, key=lambda g: g[0])
    s['aware_largest_gap'] = dict(gap=worst[0], **{k: worst[1][k] for k in ('deadline', 'bell_delay', 'p', 'cost', 'budget')})
    late = [r for r in grid if int(r['bell_delay']) > int(r['deadline'])]
    s['bell_late_cells'] = len(late)
    s['information_vs_aware_when_bell_late'] = compare(late, 'information', 'aware')
    return s


def main():
    OUT.mkdir(exist_ok=True)
    rows = base()
    with open(OUT / 'qs002_benchmark.csv', 'w', newline='') as f:
        wr = csv.DictWriter(f, fieldnames=list(rows[0]))
        wr.writeheader(); wr.writerows(rows)
    grid = sensitivity()
    with open(OUT / 'qs002_sensitivity.csv', 'w', newline='') as f:
        wr = csv.DictWriter(f, fieldnames=list(grid[0]))
        wr.writeheader(); wr.writerows(grid)
    summary = summarise(grid)
    (OUT / 'qs002_summary.json').write_text(json.dumps(summary, indent=2) + '\n')
    print(f'{len(rows)} base rows, {len(grid)} sensitivity configurations')
    print(json.dumps(summary, indent=1))


if __name__ == '__main__':
    main()
