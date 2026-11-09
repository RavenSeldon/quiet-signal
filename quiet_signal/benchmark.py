"""Rebuild the full exact benchmark and the browser's tabular engine export."""
import csv, hashlib, json, platform, sys
from dataclasses import asdict, replace
from itertools import product
from pathlib import Path
from .engine import BASE, Model, Solver, EMPTY, POLICIES

ROOT = Path(__file__).resolve().parents[1]
COSTS = [0, .2, 1, 3, 10]
NAMES = {'none':'No monitoring','random':'Random','information':'World information',
         'severity':'Severity rule','myopic':'Myopic value','optimal':'Exact optimal',
         'task_information':'Task information','full':'Free full signals'}


def dump(path, obj):
    path.write_text(json.dumps(obj, indent=2, allow_nan=False)+'\n')


def row(solver, policy, budget, **meta):
    return dict(**meta, policy=policy, budget=budget, interruption=solver.interruption,
                observation=solver.observation, **solver.evaluate(policy,budget))


def export_model(m):
    nodes = {}
    for h in product((-1,0,1),repeat=3):
        try: p = m.posterior(h)
        except ValueError: continue
        a, value = m.decision(h)
        nodes[','.join(map(str,h))] = dict(action=a,value=value,
            target_probability=float(p @ m.target), posterior=p.tolist(),
            information=m.uncertainty(EMPTY)-m.uncertainty(h),
            target_information=m.uncertainty(EMPTY,True)-m.uncertainty(h,True),
            individual_gain=[None if h[i] != -1 else m.information_gain(h,i) for i in range(3)],
            one_step_value=[None if h[i] != -1 else sum(prob*m.decision(new)[1] for prob,new in m.branch(h,i))-value for i in range(3)])
    decisions = {}
    summaries = {}
    for c in COSTS:
        s = Solver(m,c)
        ck = str(c)
        decisions[ck] = {p:{str(b):{key:s.choices(p,tuple(map(int,key.split(','))),b)
                                      for key in nodes} for b in range(4)} for p in POLICIES}
        summaries[ck] = {p:[s.evaluate(p,b) for b in range(4)] for p in (*POLICIES,'full')}
    return dict(spec=asdict(m.world), nodes=nodes, decisions=decisions, summaries=summaries,
                states=m.states.tolist(), target=m.target.tolist(), rewards=m.rewards.tolist(),
                atoms=[dict(state=wi,signals=list(sig),probability=p) for wi,sig,p in m.atoms()])


def write_csv(path, rows):
    with path.open('w', newline='') as f:
        writer=csv.DictWriter(f,fieldnames=list(rows[0])); writer.writeheader(); writer.writerows(rows)


def main():
    out=ROOT/'results'; out.mkdir(exist_ok=True)
    baseline=[]; export={}
    for name,w in BASE.items():
        m=Model(w); export[name]=export_model(m)
        for c,b,policy in product(COSTS,range(4),(*POLICIES,'full')):
            baseline.append(row(Solver(m,c),policy,b,world=name))
    write_csv(out/'benchmark.csv',baseline)
    sensitivity=[]
    for q,alpha in product([.5,.65,.8,.9,1],[0,.25,.5,.75,1]):
        m=Model(replace(BASE['complementarity'],reliability=(q,q,q),alpha=alpha))
        for c in COSTS:
            s=Solver(m,c)
            for b in range(4):
                optimal=s.evaluate('optimal',b)['net']
                for policy in (*POLICIES,'full'):
                    r=row(s,policy,b,reliability=q,complementarity=alpha)
                    if policy != 'full':
                        assert r['capacity'] <= b+1e-10
                        assert r['net'] <= optimal+1e-10
                    sensitivity.append(r)
    write_csv(out/'sensitivity.csv',sensitivity)
    examples=[]
    for name in BASE:
        s=Solver(Model(BASE[name]))
        # A fixed atom, disclosed as an example rather than a random estimate.
        for policy in (*POLICIES,'full'):
            examples.append(dict(world=name,policy=policy,state=[0,1,0],signals=[0,1,0],budget=2,
                                 **s.replay(policy,2,2,(0,1,0),random_seed=7)))
    dump(out/'example_episodes.json',examples)
    data=dict(version='0.1.0',costs=COSTS,observation=.05,policies=NAMES,worlds=export)
    (ROOT/'web/data.js').write_text('globalThis.QUIET_DATA = '+json.dumps(data,separators=(',',':'),allow_nan=False)+';\n')
    dump(out/'environment.json',dict(python=sys.version,numpy=__import__('numpy').__version__,platform=platform.platform(),
         method='Full finite enumeration; no sampling error; float64 arithmetic',
         baseline_rows=len(baseline),sensitivity_rows=len(sensitivity)))
    # Record reproducibility identities, with relative paths and no timestamps.
    paths=[ROOT/'quiet_signal/engine.py',ROOT/'quiet_signal/benchmark.py',ROOT/'docs/SPECIFICATION.md',
           out/'benchmark.csv',out/'sensitivity.csv',out/'example_episodes.json',ROOT/'web/data.js']
    dump(out/'experiment_hashes.json',{str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in paths})
    print(f'Exact benchmark: {len(baseline)} base rows; {len(sensitivity)} sensitivity rows.')
    for name in BASE:
        b=2 if name=='complementarity' else 1
        print(name,'B=',b,{p:round(export[name]['summaries']['0.2'][p][b]['net'],6) for p in NAMES})

if __name__=='__main__': main()
