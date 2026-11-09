"""Standalone research figures, generated solely from benchmark CSVs."""
import csv, os
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
os.environ.setdefault('MPLCONFIGDIR',str(ROOT/'.cache/matplotlib'))
os.environ.setdefault('XDG_CACHE_HOME',str(ROOT/'.cache'))
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np


def main():
    rows=list(csv.DictReader((ROOT/'results/benchmark.csv').open()))
    names=['none','random','information','severity','myopic','optimal','task_information','full']
    labels=['None','Random','World IG','Severity','Myopic value','Exact optimal','Task IG','Free full*']
    colors=['#83919c','#bc8a9b','#c7a256','#849dc1','#9b83c2','#42846d','#5a9ca9','#485560']
    plt.rcParams.update({'font.family':'DejaVu Sans','font.size':9,'axes.spines.top':False,
                         'axes.spines.right':False,'axes.titleweight':'bold','svg.hashsalt':'quiet-signal-v0.1'})
    fig,axes=plt.subplots(2,2,figsize=(12,8),layout='constrained')
    cases=[('distraction',1,'A · Irrelevant information'),('complementarity',2,'B · Complementary signals'),
           ('alignment',1,'C · Information and value agree'),('disconnected',1,'D · Information without use')]
    for ax,(world,b,title) in zip(axes.flat,cases):
        vals=[float(next(r['net'] for r in rows if r['world']==world and int(r['budget'])==b
                        and float(r['interruption'])==.2 and r['policy']==p)) for p in names]
        bars=ax.barh(labels[::-1],vals[::-1],color=colors[::-1],height=.65)
        ax.set_xlim(0,7.3);ax.axvline(vals[0],color='#69757e',lw=.8,ls='--')
        ax.set_title(f'{title}  |  B = {b}',loc='left',pad=15,fontsize=11)
        ax.set_xlabel('Expected net utility (higher is better)')
        ax.tick_params(axis='y',length=0);ax.grid(axis='x',alpha=.15);ax.set_axisbelow(True)
        ax.bar_label(bars,labels=[f'{v:.3f}' for v in vals[::-1]],padding=4,fontsize=8)
    fig.suptitle('The Quiet Signal · what changes a decision?',fontsize=17,fontweight='bold')
    fig.supxlabel('Exact enumeration · observation 0.05 + interruption 0.20 per query\n* Free full: all three noisy signals, no cost or budget; upper reference, not a peer.',fontsize=9)
    for ext in ('png','svg'):
        fig.savefig(ROOT/f'results/primary_figure.{ext}',dpi=180,metadata={'Date':None} if ext=='svg' else None)
    plt.close(fig)
    fig,axes=plt.subplots(2,2,figsize=(12,7.5),layout='constrained')
    styles=[':','--','-.','--',':','-','-.','--']
    marks=['s','x','v','+','D','o','^',None]
    for ax,(world,_,title) in zip(axes.flat,cases):
        for p,label,color,ls,marker in zip(names,labels,colors,styles,marks):
            vals=[float(next(r['net'] for r in rows if r['world']==world and int(r['budget'])==b
                            and float(r['interruption'])==.2 and r['policy']==p)) for b in range(4)]
            ax.plot(range(4),vals,label=label,color=color,ls=ls,marker=marker,lw=1.5,
                    markersize=6 if p=='optimal' else 4,markerfacecolor='white' if p=='optimal' else color)
        ax.set_title(title,loc='left');ax.set_xticks(range(4));ax.set_xlabel('Packet budget B');ax.set_ylabel('Expected net utility');ax.grid(alpha=.15)
    handles,labels=axes[0,0].get_legend_handles_labels()
    fig.legend(handles,labels,loc='outside lower center',ncol=4,frameon=False)
    fig.suptitle('Performance across binding and nonbinding budgets',fontsize=16,fontweight='bold')
    fig.savefig(ROOT/'results/budget_figure.png',dpi=180)
    plt.close(fig)
    print('Wrote primary_figure.png/.svg and budget_figure.png from benchmark.csv')

if __name__=='__main__':main()
