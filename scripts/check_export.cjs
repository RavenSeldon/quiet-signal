const assert=require('node:assert/strict');
require('../web/data.js');const R=require('../web/runtime.js'),D=globalThis.QUIET_DATA;
let traces=0,comparisons=0;
function exactRandom(w,c,b,atom,h=[-1,-1,-1]){
 const n=h.filter(v=>v!==-1).length;
 if(!b){return w.rewards[atom.state][w.nodes[h.join(',')].action]-n*(c+.05);}
 const available=h.flatMap((v,i)=>v===-1?[i]:[]);
 if(!available.length)return w.rewards[atom.state][w.nodes[h.join(',')].action]-n*(c+.05);
 return available.reduce((sum,i)=>{const next=[...h];next[i]=atom.signals[i];return sum+exactRandom(w,c,b-1,atom,next)/available.length;},0);
}
for(const w of Object.values(D.worlds))for(const c of D.costs)for(let b=0;b<4;b++)for(const p of Object.keys(D.policies)){
 let expected=0;
 for(const a of w.atoms){
  let value;
  if(p==='random')value=exactRandom(w,c,b,a);
  else{const r=R.replay(w,c,b,p,a);value=r.net;assert(r.trace.length<=(p==='full'?3:b));traces++;}
  expected+=a.probability*value;
 }
 assert(Math.abs(expected-w.summaries[String(c)][p][b].net)<1e-10,`${w.spec.name} ${p} ${b} ${c}`);comparisons++;
}
for(const w of Object.values(D.worlds)){
 for(const b of [0,1,2,3]){
  const r=R.replay(w,.2,b,'manual',R.atom(w,42),7,[0,1,2].slice(0,b));assert.equal(r.trace.length,b);
 }
 assert.deepEqual(R.atom(w,42),R.atom(w,42));
}
assert.throws(()=>R.replay(D.worlds.alignment,.2,1,'manual',D.worlds.alignment.atoms[0],7,[0,1]));
console.log(`${comparisons} Python/browser expectation comparisons; ${traces} deterministic traces passed, plus manual budgets and seeded replay.`);
