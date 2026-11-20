// Standard poker order: 2..A. Card id = rank index * 4 + suit index.
export const RANKS=['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
export const SUITS=['♣','♦','♥','♠'];
export const TYPES=['散牌','一對','兩對','三條','順子','同花','葫蘆','鐵支','同花順'];
export function compare(a,b){for(let i=0;i<Math.max(a.length,b.length);i++){const d=(a[i]||0)-(b[i]||0);if(d)return Math.sign(d)}return 0}
export function evaluate(cards){
 if(![3,5].includes(cards.length)||new Set(cards).size!==cards.length||cards.some(c=>!Number.isInteger(c)||c<0||c>51))throw Error('牌數或牌面無效');
 const ranks=cards.map(c=>(c>>2)+2).sort((a,b)=>b-a),count=new Map();for(const r of ranks)count.set(r,(count.get(r)||0)+1);
 const groups=[...count].sort((a,b)=>b[1]-a[1]||b[0]-a[0]),g=groups.map(x=>x[0]);
 const flush=cards.length===5&&cards.every(c=>c%4===cards[0]%4);
 let straight=0;if(cards.length===5&&count.size===5){if(ranks[0]-ranks[4]===4)straight=ranks[0];else if(ranks.join(',')==='14,5,4,3,2')straight=5}
 if(flush&&straight)return[8,straight];if(groups[0][1]===4)return[7,...g];if(groups[0][1]===3&&groups[1]?.[1]===2)return[6,...g];if(flush)return[5,...ranks];if(straight)return[4,straight];if(groups[0][1]===3)return[3,...g];if(groups[0][1]===2&&groups[1]?.[1]===2)return[2,...g];if(groups[0][1]===2)return[1,...g];return[0,...ranks];
}
export function validLayout(rows){return rows.length===3&&rows.every((r,i)=>r.length===[3,5,5][i])&&new Set(rows.flat()).size===13&&compare(evaluate(rows[2]),evaluate(rows[1]))>=0&&compare(evaluate(rows[1]),evaluate(rows[0]))>=0}
export function settle(layouts){
 const valid=layouts.map(validLayout),scores=[0,0,0,0],ranks=layouts.map((r,s)=>valid[s]?r.map(evaluate):null),duels=[],shots=[0,0,0,0];
 for(let a=0;a<4;a++)for(let b=a+1;b<4;b++){
  const d=!valid[a]&&!valid[b]?[0,0,0]:!valid[a]?[-1,-1,-1]:!valid[b]?[1,1,1]:ranks[a].map((r,i)=>compare(r,ranks[b][i]));
  const shot=d.every(x=>x===1)?a:d.every(x=>x===-1)?b:-1;
  if(shot>=0)shots[shot]++;
  duels.push({a,b,d,shot,total:0,multiplier:shot>=0?2:1});
 }
 const homeruns=shots.map(x=>x===3);
 for(const duel of duels){if(duel.shot>=0&&homeruns[duel.shot])duel.multiplier*=2;
  duel.total=duel.d.reduce((x,y)=>x+y,0)*duel.multiplier;
  scores[duel.a]+=duel.total;scores[duel.b]-=duel.total;
 }return{valid,scores,duels,shots,homeruns};
}
// Explicit projection: future host-only fields cannot accidentally travel in a cloned object.
export function redact(g,seat){
 const out={};for(const k of ['st','game','v','ev','gid','seats','nm','cfg','score','bk','chs','lchs','rdy','pz','sub','co','hand','ph','stat','c13Deadline','c13NextAt','c13Ready','c13Started'])if(g[k]!==undefined)out[k]=JSON.parse(JSON.stringify(g[k]));
 const open=g.ph==='end'||g.st==='over';
 out.c13Hands=(g.c13Hands||[]).map((h,s)=>open||s===seat?h.slice():h.map(()=>-1));
 out.c13Rows=(g.c13Rows||[]).map((r,s)=>open||s===seat?(r?JSON.parse(JSON.stringify(r)):null):null);
 if(open&&g.res)out.res=JSON.parse(JSON.stringify(g.res));return out;
}
export function ownsLayout(hand,rows){
 try{return Array.isArray(hand)&&Array.isArray(rows)&&rows.every(Array.isArray)&&validLayout(rows)&&rows.flat().every(c=>hand.includes(c))}catch{return false}
}
export function profileFor(t={}){return{front:1+((t.pat??1)-1)*.12,middle:1+((t.agg??1)-1)*.08,back:1+((t.risk??1)-1)*.18,mis:(t.whim||0)*.18,st:t.whim>=2?'隨性':t.risk>=2?'尾墩強攻':t.pat>=2?'頭墩搶分':'均衡'}}
function combinations(items,n){const out=[];function rec(start,left,chosen,mask){if(!left){out.push({cards:chosen.slice(),mask,rank:evaluate(chosen)});return}for(let i=start;i<=items.length-left;i++){chosen.push(items[i]);rec(i+1,left-1,chosen,mask|(1<<i));chosen.pop()}}rec(0,n,[],0);return out}
function strength(r,front){const base=front?[0,4,0,12]:[0,1.6,3.5,5,7,8.5,15.5,22,30];let v=base[r[0]];for(let i=1;i<r.length;i++)v+=(r[i]/14)*Math.pow(.065,i-1);return v}
export function arrange(hand,profile={},rng=Math.random){
 if(hand.length!==13||new Set(hand).size!==13)throw Error('需要 13 張不同的牌');
 const fives=combinations(hand,5),threes=combinations(hand,3),byMask=new Map([...fives,...threes].map(c=>[c.mask,c]));let best=null,bestValue=-Infinity,randomChoice=null,legalCount=0;
 // Enumerate all 72,072 ways to split 13 cards into 3 / 5 / 5; all evaluations are cached.
 for(const back of fives){const remainder=8191^back.mask;const indexes=[];for(let i=0;i<13;i++)if(remainder&(1<<i))indexes.push(i);
  // Choose the front 3 among the remaining 8, leaving the middle 5.
  for(let i=0;i<6;i++)for(let j=i+1;j<7;j++)for(let k=j+1;k<8;k++){
   const frontMask=(1<<indexes[i])|(1<<indexes[j])|(1<<indexes[k]),front=byMask.get(frontMask),middle=byMask.get(remainder^frontMask);
   if(compare(back.rank,middle.rank)<0||compare(middle.rank,front.rank)<0)continue;
   // Reward a full house explicitly; the prototype undervalued it against two flushes.
   const house=(back.rank[0]===6||middle.rank[0]===6)?8:0;
   const value=strength(front.rank,true)*(profile.front||1)+strength(middle.rank,false)*(profile.middle||1)+strength(back.rank,false)*(profile.back||1)+house;
   legalCount++;if((profile.mis||0)>0&&rng()<1/legalCount)randomChoice=[front.cards,middle.cards,back.cards];
   if(value>bestValue){bestValue=value;best=[front.cards,middle.cards,back.cards].map(r=>r.slice().sort((a,b)=>b-a))}
  }
 }if(!best)throw Error('找不到合法排法');if(randomChoice&&rng()<(profile.mis||0))best=randomChoice.map(r=>r.slice().sort((a,b)=>b-a));return best;
}
