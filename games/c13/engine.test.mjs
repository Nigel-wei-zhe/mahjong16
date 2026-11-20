import assert from 'node:assert/strict';
import {evaluate,compare,arrange,validLayout,ownsLayout,settle,redact,profileFor} from './engine.mjs';
const c=(r,s=0)=>(r-2)*4+s;
assert.equal(evaluate([c(2),c(4),c(8)])[0],0);
assert.equal(evaluate([c(3),c(4,1),c(5,2)])[0],0);
assert.deepEqual(evaluate([c(14),c(2,1),c(3,2),c(4,3),c(5)]),[4,5]);
assert(compare(evaluate([c(14),c(8,1),c(6,2)]),evaluate([c(2),c(8,1),c(6,2)]))>0);
assert.equal(compare(evaluate([c(7),c(7,1),c(2)]),evaluate([c(7,2),c(7,3),c(2,1)])),0);
assert.throws(()=>evaluate([0,0,1]));assert(!ownsLayout(Array.from({length:13},(_,i)=>i),[[0,1,2],[3,4,5,6,7],[8,9,10,11,51]]));assert(!ownsLayout([],null));
// Equal layouts tie. A strictly stronger layout shoots all three opponents: 3 * 2 * 2 = 12 each.
const strong=[[c(14),c(14,1),c(13)],[c(10),c(11,1),c(12,2),c(13,3),c(14,2)],[c(2),c(2,1),c(2,2),c(2,3),c(3)]],weak=[[c(3),c(4,1),c(5,2)],[c(6),c(6,1),c(7),c(8,1),c(9,2)],[c(10),c(10,1),c(11),c(12,1),c(13,2)]];
assert(validLayout(strong));assert(validLayout(weak));let result=settle([strong,weak,weak,weak]);assert.deepEqual(result.scores,[36,-12,-12,-12]);assert(result.homeruns[0]);assert(result.duels[0].multiplier===4);
assert.deepEqual(settle([weak,weak,weak,weak]).scores,[0,0,0,0]);
const foul=[weak[2],weak[1],weak[0]];result=settle([foul,foul,weak,weak]);assert.equal(result.duels[0].total,0);assert.equal(result.duels.find(d=>d.a===0&&d.b===2).total,-6);
// Regression: full-house-capable hand formerly became two flushes in the prototype.
const houseHand=[c(2),c(2,1),c(2,2),c(6),c(6,1),c(8),c(8,1),c(10),c(10,1),c(12),c(12,1),c(14),c(14,1)];
const house=arrange(houseHand);assert(validLayout(house));assert(house.slice(1).some(r=>evaluate(r)[0]===6),'full house should survive the layout heuristic');
for(let game=0;game<40;game++){
 const deck=Array.from({length:52},(_,i)=>i);for(let i=51;i>0;i--){const j=Math.random()*(i+1)|0;[deck[i],deck[j]]=[deck[j],deck[i]]}
 const hands=[0,1,2,3].map(s=>deck.slice(s*13,s*13+13)),layouts=hands.map((h,s)=>arrange(h,profileFor({risk:s%3,pat:(s+1)%3,agg:s%3,whim:s%3})));
 layouts.forEach((r,s)=>{assert(validLayout(r));assert(ownsLayout(hands[s],r));assert.deepEqual(r.flat().sort((a,b)=>a-b),hands[s].slice().sort((a,b)=>a-b))});
 result=settle(layouts);assert.equal(result.scores.reduce((a,b)=>a+b),0);assert(result.scores.every(s=>Math.abs(s)<=36));
 const g={st:'play',game:'c13',ph:'arrange',c13Hands:hands,c13Rows:layouts,c13Ready:[true,true,true,true],c13Ui:{rows:layouts[0]},futureSecret:{cards:hands[3]},res:{hidden:layouts[2]}};
 for(let seat=-1;seat<4;seat++){
  const view=redact(g,seat);assert(!view.c13Ui&&!view.futureSecret&&!view.res);for(let s=0;s<4;s++){assert.deepEqual(view.c13Hands[s],s===seat?hands[s]:Array(13).fill(-1));assert.deepEqual(view.c13Rows[s],s===seat?layouts[s]:null)}
 }
 const opened=redact({...g,ph:'end'},1);assert.deepEqual(opened.c13Hands,hands);assert.deepEqual(opened.c13Rows,layouts);assert.deepEqual(g.c13Hands,hands,'projection must not mutate host state');
}
console.log('PASS: poker, foul, shoot x2, homerun x4, full-house regression, 160 arrangements, zero-sum settlement and all-seat redaction');
