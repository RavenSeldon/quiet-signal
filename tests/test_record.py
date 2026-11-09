"""Checks the published record against executable outputs, without regenerating it."""
import csv,hashlib,json,unittest
from pathlib import Path
from quiet_signal.engine import Model,Solver,BASE
ROOT=Path(__file__).resolve().parents[1]

class RecordTests(unittest.TestCase):
    def test_report_table_matches_engine(self):
        rows=[x for x in (ROOT/'docs/RESEARCH_NOTE.md').read_text().splitlines() if x.startswith('| ')]
        policies=['none','random','information','severity','myopic','optimal','task_information','full']
        for line,p in zip(rows[2:],policies):
            values=[float(x.strip()) for x in line.split('|')[2:6]]
            for value,name,b in zip(values,BASE,[1,2,1,1]):
                self.assertAlmostEqual(value,Solver(Model(BASE[name])).evaluate(p,b)['net'],delta=.000501)

    def test_sensitivity_tallies(self):
        rows=list(csv.DictReader((ROOT/'results/sensitivity.csv').read_text().splitlines()))
        self.assertEqual(len(rows),4000)
        data={(r['reliability'],r['complementarity'],r['budget'],r['interruption'],r['policy']):float(r['net']) for r in rows}
        for rival,expected in [('information',[235,237,28]),('task_information',[157,329,14]),('severity',[310,162,28])]:
            tally=[0,0,0]
            for k,v in data.items():
                if k[-1]=='myopic':
                    d=v-data[(*k[:-1],rival)];tally[0 if d>1e-10 else 2 if d< -1e-10 else 1]+=1
            self.assertEqual(tally,expected)

    def test_experiment_identities(self):
        for p,h in json.loads((ROOT/'results/experiment_hashes.json').read_text()).items():
            self.assertEqual(hashlib.sha256((ROOT/p).read_bytes()).hexdigest(),h,p)

    def test_asset_identities(self):
        p=ROOT/'web/assets/piko';r=json.loads((p/'record.json').read_text())
        self.assertEqual(hashlib.sha256((p/'spritesheet.webp').read_bytes()).hexdigest(),r['measured']['spritesheet']['file_sha256'])
        self.assertEqual(hashlib.sha256((p/'pet.json').read_bytes()).hexdigest(),r['measured']['pet_json']['file_sha256'])
        self.assertEqual((ROOT/'results/primary_figure.png').read_bytes(),(ROOT/'web/assets/primary_figure.png').read_bytes())
        for entry in json.loads((ROOT/'docs/companion_sources.json').read_text()):
            self.assertEqual(hashlib.sha256((ROOT/entry['copy']).read_bytes()).hexdigest(),entry['sha256'])
        for entry in json.loads((ROOT/'docs/font_sources.json').read_text()):
            self.assertEqual(hashlib.sha256((ROOT/entry['path']).read_bytes()).hexdigest(),entry['sha256'])
        for path,digest in json.loads((ROOT/'docs/presentation_baseline.json').read_text()).items():
            self.assertEqual(hashlib.sha256((ROOT/path).read_bytes()).hexdigest(),digest)
        for path,digest in json.loads((ROOT/'docs/identity_baseline.json').read_text()).items():
            self.assertEqual(hashlib.sha256((ROOT/path).read_bytes()).hexdigest(),digest,path)
        for entry in json.loads((ROOT/'docs/identity_font_sources.json').read_text()):
            self.assertEqual(hashlib.sha256((ROOT/entry['path']).read_bytes()).hexdigest(),entry['sha256'])

if __name__=='__main__':unittest.main()
