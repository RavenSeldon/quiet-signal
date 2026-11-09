/* Replay the generated engine tables. No independent scientific solver here. */
(function(root) {
  'use strict';
  function rng(seed) {
    let x = seed >>> 0;
    return () => { x = (Math.imul(1664525,x)+1013904223)>>>0; return x/4294967296; };
  }
  const key = h => h.join(',');
  function atom(world, seed) {
    const u = rng(seed)(); let p = 0;
    for (const a of world.atoms) { p += a.probability; if (u < p) return a; }
    return world.atoms[world.atoms.length-1];
  }
  function replay(world, cost, budget, policy, a, seed=7, manual=[]) {
    if (!Number.isInteger(budget) || budget<0 || budget>3) throw Error('Invalid packet budget');
    let history=[-1,-1,-1], remaining=policy==='full'?3:budget, trace=[];
    const rand=rng(seed), chosen=[...new Set(manual)].sort();
    if (chosen.some(i=>!Number.isInteger(i)||i<0||i>2) || chosen.length>budget) throw Error('Invalid manual selection');
    while (true) {
      let i;
      if (policy==='manual') i=chosen.shift() ?? -1;
      else if (policy==='full') i=history.findIndex(v=>v===-1);
      else {
        const choices=world.decisions[String(cost)][policy][remaining][key(history)];
        let u=rand(); i=choices[choices.length-1][0];
        for (const [candidate,p] of choices) { u-=p; if (u<0) {i=candidate;break;} }
      }
      if (i===-1) break;
      if (!remaining || history[i]!==-1) throw Error('Exported policy violated budget');
      const before=world.nodes[key(history)].action;
      history[i]=a.signals[i]; remaining--;
      trace.push({sensor:i,signal:a.signals[i],before,after:world.nodes[key(history)].action});
    }
    const node=world.nodes[key(history)], baseline=world.nodes['-1,-1,-1'].action;
    const utility=world.rewards[a.state][node.action];
    const paid=policy==='full'?0:trace.length*(cost+.05);
    return {history,trace,node,action:node.action,baseline,utility,cost:paid,net:utility-paid,
      gain:utility-world.rewards[a.state][baseline],
      used:history.map((v,i)=>{const h=[...history];h[i]=-1;return v!==-1 && world.nodes[key(h)].action!==node.action;})};
  }
  root.QuietRuntime={rng,atom,replay,key};
  if (typeof module!=='undefined') module.exports=root.QuietRuntime;
})(globalThis);
