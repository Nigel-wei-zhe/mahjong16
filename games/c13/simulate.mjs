import {arrange,settle,profileFor} from './engine.mjs';
import {writeFileSync} from 'node:fs';
const traits=[{agg:1,risk:1,pat:2,bluff:2,whim:0},{agg:2,risk:2,pat:0,bluff:1,whim:0},{agg:1,risk:2,pat:0,bluff:1,whim:2},{agg:0,risk:0,pat:2,bluff:1,whim:0},{agg:2,risk:1,pat:0,bluff:0,whim:0},{agg:0,risk:0,pat:2,bluff:2,whim:0},{agg:0,risk:0,pat:1,bluff:0,whim:1},{agg:2,risk:2,pat:1,bluff:1,whim:0}];
let seed=20261120;const rng=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296),n=Number(process.argv[2]||240),stats=traits.map(()=>({win:0,shot:0,points:0,homerun:0}));
for(let game=0;game<n;game++){
 const deck=Array.from({length:52},(_,i)=>i);for(let i=51;i>0;i--){const j=rng()*(i+1)|0;[deck[i],deck[j]]=[deck[j],deck[i]]}const hands=[0,1,2,3].map(s=>deck.slice(s*13,s*13+13)),others=hands.slice(1).map(h=>arrange(h,{},rng));
 for(let c=0;c<8;c++){const result=settle([arrange(hands[0],profileFor(traits[c]),rng),...others]),s=stats[c];if(result.scores[0]>0)s.win++;s.shot+=result.shots[0];s.points+=result.scores[0];if(result.homeruns[0])s.homerun++}
}
const ranking=stats.map((s,i)=>({i,points:s.points})).sort((a,b)=>b.points-a.points),grade=Array(8);ranking.forEach((s,i)=>grade[s.i]=i<3?'A':i<6?'B':'C');
const measured=stats.map((s,i)=>({grade:grade[i],win:+(s.win/n*100).toFixed(1),shot:+(s.shot/(n*3)*100).toFixed(1),points:s.points,homerun:s.homerun,games:n}));
writeFileSync(new URL('./stats.mjs',import.meta.url),`// Measured against three neutral profiles; seed 20261120, ${n} shared deals. Reproduce: node games/c13/simulate.mjs ${n}\nexport const MEASURED=${JSON.stringify(measured)};\n`);console.log(JSON.stringify(measured,null,2));
