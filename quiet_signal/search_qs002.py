"""QS-002 adversarial search: where does deadline-aware myopic value lose to the exact optimum?

    python3 -m quiet_signal.search_qs002      (about 90 s; exact, no sampling)
"""
import json
from itertools import product
from pathlib import Path

from quiet_signal import temporal as T

GRID = dict(q_scout=(.6, .75, .9), q_survey=(.8, .95), q_bell=(.7, .9, 1.0), d_scout=(1, 2), d_survey=(2, 3, 4),
            d_bell=tuple(range(1, 8)), deadline=tuple(range(8)), p=(.1, .25, .4, .5), cost=(0, .05, .1, .3), budget=(2, 3))


def main():
    found, n = [], 0
    for qa, qb, qc, da, db, dc, d, p, c, b in product(*GRID.values()):
        w = T.World('search', p, d, (da, db, dc), (qa, qb, qc)); n += 1
        gap = T.evaluate(w, 'optimal', b, c)['net'] - T.evaluate(w, 'aware', b, c)['net']
        if gap > 1e-9:
            found.append(dict(gap=gap, q=(qa, qb, qc), delays=(da, db, dc), deadline=d, p=p, cost=c, budget=b))
    found.sort(key=lambda r: -r['gap'])
    out = dict(grid=GRID, configurations=n, aware_below_optimal=len(found),
               share=len(found) / n, largest=found[:12])
    Path(__file__).resolve().parents[1].joinpath('results/qs002_search.json').write_text(json.dumps(out, indent=1) + '\n')
    print(f'{n} configurations; deadline-aware below optimal in {len(found)} ({100 * len(found) / n:.2f}%); '
          f'largest gap {found[0]["gap"]:.3f}')


if __name__ == '__main__':
    main()
