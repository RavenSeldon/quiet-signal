'use strict';
const D=globalThis.QUIET_DATA, R=globalThis.QuietRuntime, $=id=>document.getElementById(id);
const colors={};
const text={
 distraction:{description:'A bright sensor sees the background very clearly. Two others see the route risk less clearly. Only X determines which route succeeds; learning Y cannot help. Before monitoring, P(X=1)=20%; Y and Z are fair.',names:['The bright distraction','The route warning','The second opinion'],desc:['Observes Y · 98% reliable','Observes X · 80% reliable','Observes X · 65% reliable'],lesson:'At one packet, compare World information with Myopic value. Then try Task information: naming the right uncertainty can close the gap.'},
 complementarity:{description:'The successful route is X XOR Y: route 1 when the two hidden bits differ, route 0 when they match. X and Y are fair and independent. Neither half tells the whole story. Z is unrelated to the delivery.',names:['The first half','The second half','The distant weather'],desc:['Observes X · 90% reliable','Observes Y · 90% reliable','Observes Z · 98% reliable'],lesson:'Give Myopic value two packets. It stays silent. Switch to Exact optimal or Severity rule: paying for both halves can help, even when neither helps alone.'},
 alignment:{description:'All three monitors watch the same fair route bit X, at different reliabilities. This is a world where information and decision value can agree. Route X is the successful one.',names:['The clear warning','The softer warning','The faint warning'],desc:['Observes X · 90% reliable','Observes X · 70% reliable','Observes X · 60% reliable'],lesson:'At one packet, several policies tie. Raise the interruption cost to 10: both value policies prefer reserve and silence.'},
 disconnected:{description:'The sensors still see the fair bit X, which determines the successful route. But their connection to the decision mechanism is deliberately cut. The consumer always uses its prior and reserves the resource.',names:['The clear warning','The softer warning','The faint warning'],desc:['Observes X · 90% · gate closed','Observes X · 70% · gate closed','Observes X · 60% · gate closed'],lesson:'Choose World information and listen. Information arrives, but the closed gate prevents any change in action. Costs are still paid.'}
};
let seed=42, revealed=false, result=null, selected=[], paused=matchMedia('(prefers-reduced-motion: reduce)').matches, timelines={};
const fmt=(x,n=2)=>Math.abs(x)<1e-10?(0).toFixed(n):x.toFixed(n);
const sign=x=>(x>1e-10?'+':'')+fmt(x);
const action=a=>['Reserve','Route 0','Route 1'][a];
const state=()=>({name:$('world').value,world:D.worlds[$('world').value],budget:Number($('budget').value),cost:Number($('cost').value),policy:$('policy').value});
function refresh(){
 const s=state(), t=text[s.name];
 QuietReactions.jar(s);
 $('budget-value').textContent=`${s.budget} packet${s.budget===1?'':'s'}`;
 $('world-description').textContent=t.description; $('lesson').textContent=t.lesson;
 $('episode-label').textContent=`WORLD ${seed} · ${revealed?'REVEALED':'UNREVEALED'}`;
 $('selection-note').textContent=s.policy==='manual'?`${selected.length} / ${s.budget} packets selected. The route decision uses only these readings.`:'The policy can stop before spending its budget. Changing controls preserves this world.';
 $('run').innerHTML=(revealed?'Replay this world':'Listen & decide')+' <span aria-hidden="true">→</span>';
 $('signals').replaceChildren();
 for(let i=0;i<3;i++){
  const read=result && result.history[i]!==-1;
  const b=document.createElement('button');b.type='button';b.className='signal'+(read?' read':'')+(selected.includes(i)&&s.policy==='manual'?' selected':'');
  b.disabled=s.policy!=='manual';b.setAttribute('aria-pressed',String(selected.includes(i)));
  b.setAttribute('aria-label',`${t.names[i]}. ${t.desc[i]}.${s.policy==='manual'?' Select this monitor.':''}`);
  b.innerHTML=`<span class="sensor-number">0${i+1}</span><span><span class="sensor-name">${t.names[i]}</span><span class="sensor-desc">${t.desc[i]}</span></span><span class="sensor-reading">${read?`READ<strong>${result.history[i]}</strong>`:s.policy==='manual'?(selected.includes(i)?'SELECTED':'SELECT'):'UNREAD'}</span>`;
  b.onclick=()=>{if(selected.includes(i))selected=selected.filter(j=>j!==i);else if(selected.length<s.budget)selected.push(i);else{$('selection-note').textContent='Budget full. Deselect a monitor or increase the packet budget.';return;}reset();$('signals').children[i].focus();};
  $('signals').append(b);
 }
 if(!revealed){$('outcome').hidden=true;$('silence').textContent=s.budget===0?'Silence is the whole budget.':'Listening begins with a choice.';$('pet-status').textContent='Quiet is an available action.';}
 renderEvidence(s); renderTimelines(s);
}
function reset(){revealed=false;result=null;QuietReactions.rest();refresh();}
function renderEvidence(s){
 const summaries=s.world.summaries[String(s.cost)];
 const css=getComputedStyle(document.documentElement), token=n=>css.getPropertyValue(n).trim();
 for(const [p,c] of Object.entries({none:'none',random:'random',information:'info',severity:'severity',myopic:'myopic',optimal:'optimal',task_information:'task',full:'full'}))colors[p]=token('--chart-'+c);
 const chartLine=token('--line'),chartText=token('--muted'),chartPanel=token('--panel'),chartTint=token('--tint');
 $('table-title').textContent=`At ${s.budget} packet${s.budget===1?'':'s'} · exact averages`;
 $('results-body').innerHTML=Object.keys(D.policies).map(p=>{const r=summaries[p][s.budget];return `<tr class="${p===s.policy?'active-policy ':''}${p==='full'?'reference':''}"><td>${D.policies[p]}${p==='full'?' †':''}</td><td>${fmt(r.net)}</td><td>${fmt(r.capacity)}</td><td>${fmt(r.information)}</td><td>${fmt(r.failure*100,1)}%</td></tr>`;}).join('');
 const policies=['none','random','information','severity','myopic','optimal','task_information','full'];
 const all=policies.flatMap(p=>summaries[p].map(r=>r.net)), min=Math.floor(Math.min(...all)), max=Math.ceil(Math.max(...all));
 const width=500,height=260,left=42,right=480,top=20,bottom=220;
 const X=b=>left+(right-left)*b/3,Y=v=>bottom-(v-min)/(max-min||1)*(bottom-top);
 let svg=`<svg role="img" aria-labelledby="chart-title chart-desc" viewBox="0 0 ${width} ${height}"><title id="chart-title">Expected net value by packet budget</title><desc id="chart-desc">${policies.map(p=>D.policies[p]+': '+summaries[p].map(r=>fmt(r.net)).join(', ')).join('. ')}. Exact enumerated results; table provides current-budget values.</desc>`;
 for(let j=0;j<5;j++){let v=min+(max-min)*j/4;svg+=`<line x1="${left}" x2="${right}" y1="${Y(v)}" y2="${Y(v)}" stroke="${chartLine}"/><text x="${left-10}" y="${Y(v)+4}" text-anchor="end" fill="${chartText}" font-size="10">${fmt(v,1)}</text>`;}
 svg+=`<rect x="${X(s.budget)-6}" y="${top}" width="12" height="${bottom-top}" fill="${chartTint}"/>`;
 for(let b=0;b<4;b++)svg+=`<text x="${X(b)}" y="${bottom+22}" text-anchor="middle" fill="${chartText}" font-size="10">${b}</text>`;
 svg+=`<text x="260" y="258" text-anchor="middle" fill="${chartText}" font-size="10">Packet budget</text>`;
 for(const p of policies){const pts=summaries[p].map((r,b)=>`${X(b)},${Y(r.net)}`).join(' ');svg+=`<polyline points="${pts}" fill="none" stroke="${colors[p]}" stroke-width="${p==='optimal'?2.5:1.5}" ${p==='full'||p==='severity'||p==='task_information'?'stroke-dasharray="4 5"':''}/>`;for(let b=0;b<4;b++){svg+=`<circle cx="${X(b)}" cy="${Y(summaries[p][b].net)}" r="${p==='optimal'?4:2}" fill="${p==='optimal'?chartPanel:colors[p]}" stroke="${colors[p]}" stroke-width="1.5"/>`;}}
 $('chart').innerHTML=svg+'</svg>';
 $('legend').innerHTML=policies.map(p=>`<span><i style="background:${colors[p]}"></i>${D.policies[p]}</span>`).join('');
}
function run(){
 const s=state(), a=R.atom(s.world,seed);
 result=R.replay(s.world,s.cost,s.budget,s.policy,a,seed+901,selected);revealed=true;refresh();
 const r=result, node=r.node, names=r.trace.map(x=>`0${x.sensor+1} → ${x.signal}`), truth=s.world.states[a.state];
 QuietReactions.play(r);
 $('silence').textContent=r.trace.length?`${r.trace.length} signal${r.trace.length===1?'':'s'}. One decision.`:`${QuietCompanion.current.shortName} chooses silence.`;
 $('pet-status').textContent=r.trace.length?`${action(r.action)} · monitor posterior P(route 1) = ${fmt(node.target_probability*100,1)}%`:s.budget===0?'No packet slots available.':s.policy==='none'?'No monitoring is the selected policy.':s.policy==='manual'?'You chose to leave every monitor unread.':'This policy found no query worth taking.';
 const gate=s.name==='disconnected';
 const after=r.net-s.world.rewards[a.state][r.baseline];
 const worth=after>1e-10?'The change paid off in this world.':after< -1e-10?'The change did not pay off in this world.':'No net difference in this world.';
 const expectations=s.policy==='manual'?'':` Expected net under this policy: ${fmt(s.world.summaries[String(s.cost)][s.policy][s.budget].net)}.`;
 $('outcome').innerHTML=`<div class="outcome-header"><h3>${action(r.action)}. ${r.utility===8?'The delivery succeeds.':r.utility===-8?'The delivery fails.':'The resource is conserved.'}</h3><p>Gross ${sign(r.utility)} − cost ${fmt(r.cost)} = net ${sign(r.net)}</p></div><div class="answers"><div class="answer"><span>01 / WHAT WAS KNOWN?</span><strong>Sensor outputs: ${a.signals.join(' · ')}</strong><p>Revealed now: X=${truth[0]}, Y=${truth[1]}, Z=${truth[2]}. Successful route: ${s.world.target[a.state]}. Unqueried outputs were hidden from the policy.</p></div><div class="answer"><span>02 / WHAT WAS COMMUNICATED?</span><strong>${names.length?names.join(' / '):'Silence · no packets'}</strong><p>${gate?'Signals read, but the consumer gate is closed.':`${r.trace.length} packet(s) routed to the consumer.`} ${r.used.filter(Boolean).length} individual signal removal(s) would change its final action.</p></div><div class="answer"><span>03 / WHAT CHANGED?</span><strong>${action(r.baseline)} → ${action(r.action)}</strong><p>Holding this world fixed, removing all messages changes gross utility by ${sign(-r.gain)}. Query costs stay paid in that intervention.</p></div><div class="answer"><span>04 / WAS IT WORTH THE COST?</span><strong>${sign(after)} versus no monitoring</strong><p>${worth}${expectations}</p></div></div><p class="outcome-note">${gate?'Information arrived. The disconnected consumer could not use it.':r.trace.length===0&&s.name==='complementarity'&&s.budget>=2?'Silence has a blind spot here: each half looks useless alone. Compare the exact policy on this same world.':'One episode can surprise you. Judge a policy by the exact averages below.'}</p>`;
 $('outcome').hidden=false;
}
function renderTimelines(s){
 timelines={};
 if(!revealed){$('timeline-body').innerHTML='<tr><td colspan="6">Waiting for an episode.</td></tr>';return;}
 const a=R.atom(s.world,seed);
 $('timeline-body').innerHTML=Object.keys(D.policies).map(p=>{const r=R.replay(s.world,s.cost,s.budget,p,a,seed+901);timelines[p]=r;return `<tr class="${p==='full'?'reference':''}" data-policy="${p}" tabindex="0" aria-label="${D.policies[p]}: ${action(r.action)}, net ${sign(r.net)}. Select to watch the companion re-enact this timeline."><td>${D.policies[p]}</td><td>${r.trace.map(x=>`0${x.sensor+1}:${x.signal}`).join(' · ')||'Silence'}</td><td>${action(r.action)}</td><td>${sign(r.utility)}</td><td>${fmt(r.cost)}</td><td>${sign(r.net)}</td></tr>`;}).join('');
}
for(const id of ['world','policy','cost'])$(id).onchange=()=>{if(id==='world'){$('budget').value=$('world').value==='complementarity'?'2':'1';selected=[];}reset();};
$('budget').oninput=()=>{selected=selected.slice(0,Number($('budget').value));reset();};
$('run').onclick=run;
$('next').onclick=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;reset();};
function motion(){document.documentElement.classList.toggle('motion-paused',paused);document.body.classList.toggle('motion-paused',paused);$('motion').textContent=paused?'Resume motion':'Pause motion';$('motion').setAttribute('aria-pressed',String(paused));}
$('motion').onclick=()=>{paused=!paused;motion();};
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',e=>{paused=e.matches;motion();});
function playTimeline(tr){const p=tr&&tr.dataset.policy;if(!p||!timelines[p])return;for(const x of $('timeline-body').rows)x.classList.toggle('is-playing',x===tr);QuietReactions.play(timelines[p]);$('companion-announcement').textContent=`${QuietCompanion.current.shortName} re-enacts ${D.policies[p]}: ${action(timelines[p].action)}, net ${sign(timelines[p].net)}.`;}
$('timeline-body').addEventListener('click',e=>playTimeline(e.target.closest('tr[data-policy]')));
$('timeline-body').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();playTimeline(e.target.closest('tr[data-policy]'));}});
document.addEventListener('quiet:theme',()=>renderEvidence(state()));
document.addEventListener('quiet:companion',()=>{QuietReactions.restart();if(revealed && result && !result.trace.length)$('silence').textContent=`${QuietCompanion.current.shortName} chooses silence.`;});
motion();refresh();
