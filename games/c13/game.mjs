import {RANKS,SUITS,TYPES,evaluate,compare,validLayout,ownsLayout,settle as scoreRound,redact as privateView,arrange,profileFor} from './engine.mjs';
import {cardFace} from './cards.mjs';
import {MEASURED} from './stats.mjs';
const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('./style.css',import.meta.url);document.head.appendChild(css);
const C=GAMES.c13,ids=[0,1,2,3],caps=[3,5,5],rowNames=['頭墩','中墩','尾墩'];
const ai=TRAIT.map((t,i)=>({...profileFor(t),g:MEASURED[i].grade}));
GAME_AI.c13={name:'十三支',ai,stat:MEASURED.map(x=>[x.win,x.shot]),lab:['贏分率','打槍率'],styd:{均衡:'三墩兼顧，先排出不倒水的穩定組合。',尾墩強攻:'把較多牌力留給尾墩，追求強牌與打槍機會。',頭墩搶分:'多照顧頭墩，爭取每一墩的小優勢。',隨性:'偶爾跳過最穩的排法，讓牌局多一點變化。'}};
function rules(c){return{b:[100,300,500].includes(+c?.b)?+c.b:100,r:[4,8].includes(+c?.r)?+c.r:4,s:[30,60,90].includes(+c?.s)?+c.s:60}}
function deal(){
 const deck=Array.from({length:52},(_,i)=>i);for(let i=51;i>0;i--){const j=Math.random()*(i+1)|0;[deck[i],deck[j]]=[deck[j],deck[i]]}
 G.c13Hands=ids.map(s=>deck.slice(s*13,s*13+13));G.c13Rows=ids.map(()=>null);G.c13Ready=[false,false,false,false];G.res=null;G.rdy=[0,0,0,0];G.ph='arrange';G.c13Started=G.c13ClockAt=Date.now();G.c13Deadline=Date.now()+cfg().s*1000;G.c13NextAt=0;bump();
}
function finish(){
 if(G.ph!=='arrange'||!G.c13Ready.every(Boolean))return;
 const result=scoreRound(G.c13Rows),d=result.scores.map(n=>n*cfg().b);
 if(d.reduce((a,b)=>a+b,0)!==0)throw Error('c13 non-zero settlement');
 settle(d);for(const s of ids){if(result.scores[s]>0)G.stat[s][0]++;G.stat[s][1]+=result.shots[s];if(result.homeruns[s])G.stat[s][2]++}
 G.res={...result,d,w:result.scores.indexOf(Math.max(...result.scores))};G.ph='end';G.rdy=[0,0,0,0];
 // Every client replays the same reveal from this moment; the ready countdown and auto-next start after it.
 G.c13RevealAt=Date.now();G.c13NextAt=G.c13RevealAt+(quick()?0:Math.max(...[-1,...ids].map(s=>revealPlan(G.res,s).len)))+15000;bump({s:G.res.w,t:'c13:reveal'});
}
// late: at the deadline the layout on the player's screen is taken as it is, 倒水 included (user rule 2026-11-21).
function ownsCards(hand,rows){try{return rows.length===3&&rows.every((r,i)=>Array.isArray(r)&&r.length===caps[i])&&new Set(rows.flat()).size===13&&rows.flat().every(c=>hand.includes(c))}catch{return false}}
function submit(s,rows,late){
 if(!Number.isInteger(s)||s<0||s>3||G.ph!=='arrange'||G.c13Ready[s]||!(ownsLayout(G.c13Hands[s],rows)||(late&&ownsCards(G.c13Hands[s],rows))))return false;
 G.c13Rows[s]=rows.map(r=>r.slice());G.c13Ready[s]=true;bump();finish();return true;
}
// Reveal timeline: rows 頭→中→尾. Front and middle turn over for all four at once.
// Seen from a seat (me>=0, 2026-11-21 user-approved prototype proto/c13rv): after the middle row, opponents I beat
// in both rows get a gun sight ("aim") and those who beat me in both are a threat ("danger"); the back row then opens
// mine first, the no-stake seats, then the stake seats last (danger last of all), each with a heartbeat pause,
// cards turning one at a time, and the result at once (shot / escaped / dodged). Spectators keep the plain order.
// seg marks where a tap jumps to; lit:o lights the back-row head-to-head dot of seat o.
const LATE=1500;   // grace around the deadline for a player's own (possibly foul) layout to arrive
const RV={flip:600,cmp:1000,warn:1500,mine:900,sus:1600,card:480,hold:500,res:1100,hit:1500,shot:800,hr:1500,tail:300};
const slowLen=n=>n*RV.card+RV.card*.8+RV.hold;
function duelOf(res,a,b){return res?.duels?.find(x=>(x.a===a&&x.b===b)||(x.a===b&&x.b===a))}
function vsMe(res,me,o,row){const d=duelOf(res,me,o);return d?.d?(d.a===me?1:-1)*d.d[row]:0}
function stakeOf(res,me,o){if(me<0||o===me)return'';const n=vsMe(res,me,o,0)+vsMe(res,me,o,1);return n===2?'aim':n===-2?'danger':''}
function revealPlan(res,me=-1){
 const steps=[];let t=0;const add=(ms,x)=>{steps.push({t,...x});t+=ms};
 add(RV.flip,{k:'flip',row:0,s:ids[ids.length-1],all:1});add(RV.cmp,{k:'cmp',row:0});
 add(RV.flip,{k:'flip',row:1,s:ids[ids.length-1],all:1,seg:1});add(RV.cmp,{k:'cmp',row:1});
 const opp=ids.filter(o=>o!==me),aims=opp.filter(o=>stakeOf(res,me,o)==='aim'),dangers=opp.filter(o=>stakeOf(res,me,o)==='danger'),played=new Set();
 if(aims.length||dangers.length)add(RV.warn,{k:'warn',row:1,seg:1});
 if(me<0)ids.forEach((s,i)=>add(RV.flip,{k:'flip',row:2,s,...(i?{}:{seg:1})}));
 else{
  add(RV.mine,{k:'flip',row:2,s:me,seg:1});
  for(const o of opp)if(!aims.includes(o)&&!dangers.includes(o))add(RV.flip,{k:'flip',row:2,s:o,lit:o});
  for(const o of [...aims,...dangers]){const st=stakeOf(res,me,o),d=duelOf(res,me,o);
   add(RV.sus,{k:'sus',row:2,s:o,st});add(slowLen(3+2),{k:'slow',row:2,s:o,st});
   if(d.shot>=0){played.add(d);add(RV.hit,{k:'shot',row:2,s:d.shot,to:d.shot===d.a?d.b:d.a,m:d.multiplier,lit:o,seg:1})}
   else add(RV.res,{k:st==='aim'?'miss':'dodge',row:2,s:o,lit:o,seg:1})}
 }
 add(RV.cmp,{k:'cmp',row:2,seg:played.size?1:0});
 // Remaining shots one by one; a home run replaces its three single shots with one bigger beat at the end.
 let first=1;for(const d of res?.duels||[])if(d.shot>=0&&!played.has(d)&&!res.homeruns?.[d.shot]){add(RV.shot,{k:'shot',s:d.shot,to:d.shot===d.a?d.b:d.a,m:d.multiplier,...(first?{seg:1}:{})});first=0}
 (res?.homeruns||[]).forEach((h,s)=>{if(h){add(RV.hr,{k:'hr',s,...(first?{seg:1}:{})});first=0}});
 return{steps,len:t+RV.tail};
}
function quick(){return(typeof SPEED!=='undefined'&&SPEED>50)||AUTO}
function calm(){return typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches}
function clock(){if(G.ph!=='arrange')return;const now=Date.now();if(now-(G.c13ClockAt||now)>1500)G.c13Deadline=now+cfg().s*1000;G.c13ClockAt=now}
Object.assign(C,{
 cfg0:{b:100,r:4,s:60},cfgKey:'c13Cfg',loadCfg(){try{return rules(JSON.parse(localStorage.getItem('c13Cfg')||'null'))}catch{return rules()}},cfgFix(c){Object.assign(c,rules(c))},
 cfgPill:c=>`<span>十三支</span><i>·</i><b>${c.r}</b><span>局</span><i>·</i><span>底</span><b>${c.b}</b><i>·</i><b>${c.s}</b><span>秒</span>`,
 cfgSheet:()=>`<div class="opt"><span>局數</span>${seg('r',[[4,'小局','4 局'],[8,'續攤','8 局']])}</div><div class="opt"><span>底</span>${seg('b',[[100,'小玩','100'],[300,'中注','300'],[500,'豪賭','500']])}</div><div class="opt"><span>排牌</span>${seg('s',[[30,'快手','30 秒'],[60,'標準','60 秒'],[90,'悠閒','90 秒']])}</div>`,
 buyIn:c=>c.b*30,
 newGame(){if(R&&!R.setG){G.st='lobby';flashMsg('十三支需要私密連線，請使用網路或 TURN 包廂。',true);bump();return}G.hand=0;G.stat=ids.map(()=>[0,0,0]);deal()},
 act(s,a){if(a.t==='set'&&a.hand===G.hand&&a.gid===G.gid)submit(s,a.rows,Date.now()>=G.c13Deadline-LATE)},timers:clock,
 hostTick(){
  const before=G.c13Deadline;clock();if(before!==G.c13Deadline)bump();const now=Date.now();
  if(G.ph==='arrange'){
   for(const s of ids){if(G.c13Ready[s])continue;if((isBot(s)&&now-G.c13Started>=700)||now>=G.c13Deadline+(isBot(s)?0:LATE))submit(s,arrange(G.c13Hands[s],ai[chr(s)]));if(G.ph!=='arrange')break}
  }else if(G.ph==='end'&&((R&&allReady())||((R||myAuto||AUTO)&&now>=G.c13NextAt)))C.nextHand();
 },
 ended:()=>G.ph==='end',nextHand(){if(G.ph!=='end')return;G.hand++;if(G.hand>=cfg().r){G.st='over';G.ph='';G.rdy=[0,0,0,0];bump();return}assignSeats();deal()},
 redact:privateView,
 // Presence actions are otherwise broadcast by the shell, even when G is redacted.
 redactPresence(p,sender,recipient){if(sender===recipient||p?.a?.t!=='set')return p;const copy={...p};delete copy.a;return copy},
 handKey:()=>(G.gid||'x')+':c13:'+G.hand,delta:()=>G.res?.d||null,
 histCfg:c=>[c.b,c.r,c.s],histStats:s=>(G.stat?.[s]||[0,0,0]).slice(),histRow:e=>({rule:`${e.c?.[1]||4} 局・底 ${e.c?.[0]||100}`,stats:`贏<b>${e.s?.[0]||0}</b>局・打槍<b>${e.s?.[1]||0}</b>次・全壘打<b>${e.s?.[2]||0}</b>次`}),
 render:renderC13,frame:frameC13,revealPlan
});
// Selection and unsubmitted drafts stay local to this module. Only accepted layouts enter G.
// handKey resets the editor on the next hand; incoming snapshots do not erase local work.
const ui={key:'',rows:[[],[],[]],sel:-1,claim:[null,null,null],last:null,peek:null,combos:null,moved:null,drag:null,dragAt:0,ready:[0,0,0,0],was:null,notice:'',waiting:null,retryAt:0,busy:false,job:0,seen:'',rvKey:'',rvAt:0,rvPlan:null,rvStep:-1,rvDone:''};
let worker=null,nextJob=0;const jobs=new Map();
function fallbackWorker(){worker?.terminate();worker=null;for(const [id,j]of jobs){jobs.delete(id);setTimeout(()=>{try{j.resolve(arrange(j.hand,j.profile))}catch(e){j.reject(e)}},0)}}
try{worker=new Worker(new URL('./arranger.mjs',import.meta.url),{type:'module'});worker.onmessage=({data})=>{const j=jobs.get(data.id);if(!j)return;jobs.delete(data.id);data.error?j.reject(Error(data.error)):j.resolve(data.rows)};worker.onerror=e=>{e.preventDefault();fallbackWorker()}}catch{}
function suggest(hand,profile){return new Promise((resolve,reject)=>{if(worker){const id=++nextJob;jobs.set(id,{hand,profile,resolve,reject});worker.postMessage({id,hand,profile})}else setTimeout(()=>{try{resolve(arrange(hand,profile))}catch(e){reject(e)}},0)})}
function mount(){let el=$('c13-game');if(el)return el;el=document.createElement('div');el.id='c13-game';el.innerHTML=`<div class="c13-felt"></div><header class="c13-head"><div><b>十三支</b><small id="c13-round"></small></div><div class="c13-tools"><button id="c13-auto-toggle">託管</button><button id="c13-settings">設定</button></div></header><div id="c13-players"></div><section id="c13-board"><div id="c13-hand"></div><div id="c13-types"></div></section><section id="c13-dock"><div class="c13-dock-l"><button id="c13-suggest">自動排牌</button><button id="c13-clear">重來</button></div><div id="c13-status" role="status"></div><div class="c13-dock-r"><span id="c13-clock"></span><button id="c13-submit" class="c13-primary">確認排好</button></div></section><span id="c13-balance"></span><section id="c13-rv" hidden></section><section id="c13-results" hidden></section>`;root.appendChild(el);
 el.addEventListener('click',onClick);el.addEventListener('pointerdown',onDown);el.addEventListener('pointermove',onMove);el.addEventListener('pointerup',onUp);el.addEventListener('pointercancel',onUp);return el}
function cardLabel(c){return SUITS[c%4]+RANKS[c>>2]}
function type(r){return [3,5].includes(r?.length)?TYPES[evaluate(r)[0]]:'尚未排滿'}
function canEdit(){const s=mySeat();return G.st==='play'&&G.ph==='arrange'&&s>=0&&!G.c13Ready?.[s]&&!G.pz&&!ui.waiting&&!ui.busy&&!myAuto&&!AUTO}
// The thirteen cards always sit in the three rows (no separate hand): dealt in rank order, big cards at the back.
function dealtRows(hand){const l=(hand||[]).filter(c=>c>=0).sort((a,b)=>b-a);return l.length===13?[l.slice(10),l.slice(5,10),l.slice(0,5)]:[[],[],[]]}
function resetEditor(){const key=C.handKey();if(ui.key===key)return;const me=mySeat();ui.key=key;ui.rows=G.c13Rows?.[me]?.map(r=>r.slice())||dealtRows(G.c13Hands?.[me]);ui.sel=-1;ui.claim=[null,null,null];ui.last=null;ui.peek=null;ui.combos=null;ui.notice='';ui.waiting=null;ui.busy=false;ui.job++;ui.drag=null;ui.ready=[0,0,0,0];ui.was=(G.c13Ready||[]).slice()}
// Hand types found in my thirteen cards, strongest first; each candidate is the cards that make the type.
function combosOf(hand){
 const by=Array.from({length:13},()=>[]),suit=[[],[],[],[]],out=TYPES.map(()=>[]),seen=new Set();for(const c of hand.slice().sort((a,b)=>b-a)){by[c>>2].push(c);suit[c%4].push(c)}
 const put=(t,cs)=>{const k=t+':'+cs.slice().sort((a,b)=>a-b).join();if(!seen.has(k)&&out[t].length<6){seen.add(k);out[t].push(cs)}},hi=[12,11,10,9,8,7,6,5,4,3,2,1,0];
 const runs=[];for(let h=12;h>=4;h--)runs.push([h,h-1,h-2,h-3,h-4]);runs.push([12,3,2,1,0]);
 for(const s of suit)for(const run of runs){const cs=run.map(r=>s.find(c=>c>>2===r));if(cs.every(c=>c!==undefined))put(8,cs)}
 const pairs=hi.filter(r=>by[r].length>=2),trips=hi.filter(r=>by[r].length>=3);
 for(const r of hi)if(by[r].length===4)put(7,by[r].slice());
 for(const t of trips)for(const p of pairs)if(p!==t)put(6,[...by[t].slice(0,3),...by[p].slice(0,2)]);
 for(const s of suit){const n=s.length;if(n<5)continue;const rec=(i,cs)=>{if(out[5].length>=6)return;if(cs.length===5){if(evaluate(cs)[0]===5)put(5,cs.slice());return}for(let j=i;j<=n-(5-cs.length);j++){cs.push(s[j]);rec(j+1,cs);cs.pop()}};rec(0,[])}
 for(const run of runs){if(!run.every(r=>by[r].length))continue;const cs=run.map(r=>by[r][0]);if(evaluate(cs)[0]===8){const i=run.findIndex(r=>by[r].length>1);if(i<0)continue;cs[i]=by[run[i]][1]}put(4,cs)}
 for(const t of trips)put(3,by[t].slice(0,3));
 for(let i=0;i<pairs.length;i++)for(let j=i+1;j<pairs.length;j++)put(2,[...by[pairs[i]].slice(0,2),...by[pairs[j]].slice(0,2)]);
 for(const p of pairs)put(1,by[p].slice(0,2));
 return out}
// Tapping a type puts it straight into a row: the back row first, then the middle; the same type again shows the next one.
function pickCombo(t){
 const list=ui.combos?.[t]||[];if(!list.length)return null;const n=list[0].length,same=ui.last?.t===t;
 let row=same?ui.last.row:[2,1,0].find(r=>!ui.claim[r]&&caps[r]>=n);if(row===undefined)row=ui.last&&caps[ui.last.row]>=n?ui.last.row:2;
 const busy=new Set(ui.claim.flatMap((c,r)=>c&&r!==row?c:[])),ok=list.filter(cs=>!cs.some(c=>busy.has(c)));if(!ok.length)return null;
 const i=same?(ui.last.i+1)%ok.length:0;return{t,row,i,cards:ok[i]}}
function where(c){for(let r=0;r<3;r++){const i=ui.rows[r].indexOf(c);if(i>=0)return[r,i]}return null}
function staleClaims(){for(let r=0;r<3;r++)if(ui.claim[r]&&!ui.claim[r].every(c=>ui.rows[r].includes(c))){ui.claim[r]=null;if(ui.last?.row===r)ui.last=null}}
function applyCombo(p){
 const row=ui.rows[p.row],inc=p.cards.filter(c=>!row.includes(c)),out=row.filter(c=>!p.cards.includes(c)).sort((a,b)=>a-b);
 inc.forEach((c,k)=>{const [q,i]=where(c),e=out[k];ui.rows[q][i]=e;row[row.indexOf(e)]=c});
 ui.rows[p.row]=[...p.cards,...row.filter(c=>!p.cards.includes(c)).sort((a,b)=>b-a)];ui.claim[p.row]=p.cards.slice();ui.last={t:p.t,row:p.row,i:p.i};ui.moved=p.cards.slice();staleClaims();ui.sel=-1}
function swapCards(a,b){const x=where(a),y=where(b);if(!x||!y||a===b)return;ui.rows[x[0]][x[1]]=b;ui.rows[y[0]][y[1]]=a;ui.moved=[a,b];staleClaims();ui.sel=-1}
function swapRows(){[ui.rows[1],ui.rows[2]]=[ui.rows[2],ui.rows[1]];[ui.claim[1],ui.claim[2]]=[ui.claim[2],ui.claim[1]];if(ui.last&&ui.last.row>0)ui.last.row=3-ui.last.row;ui.moved=[...ui.rows[1],...ui.rows[2]];ui.sel=-1}
// A row is marked when it is stronger than the row behind it (倒水).
function fouls(rows){if(rows.flat().length!==13)return[false,false,false];const e=rows.map(evaluate);return[compare(e[0],e[1])>0,compare(e[1],e[2])>0,false]}
function portrait(s,key='n'){const a=window.AVATARS?.[chr(s)]||{};if(!a[key])key='n';const wide=(a.nx||[]).includes(key);return `<div class="c13-window ${wide?'c13-wide':''}">${a[key]?`<img alt="${esc(BOTS[chr(s)]||'')}" src="${a[key]}">`:''}</div>`}
// Seats face each other like the mahjong table. An opponent who finishes arranging changes pose and her name tag lights once.
function players(){const me=mySeat(),pov=Math.max(0,me),now=Date.now();return ids.map(s=>{const rel=(s-pov+4)%4;if(!rel)return `<div class="c13-player c13-pos0">${portrait(s)}</div>`;const ready=G.ph==='arrange'&&G.c13Ready?.[s];if(ready&&ui.was&&!ui.was[s]){ui.was[s]=true;ui.ready[s]=now}
 return `<div class="c13-player c13-pos${rel} ${ready&&now-ui.ready[s]<900?'c13-readied':''}">${portrait(s,ready?'n2':'n')}<div class="c13-player-info"><b>${esc(nameOf(s))}</b><small>${fmt(G.score[s])}</small><span class="${ready?'c13-ok':''}">${G.st==='over'?'整場結束':G.ph==='end'?(G.rdy?.[s]?'已準備':'已開牌'):ready?'已排好':'排牌中…'}</span></div></div>`}).join('')}
function put(id,html){const e=$(id);if(e._h!==html){e._h=html;e.innerHTML=html}}
function renderC13(){
 const el=mount(),on=G.game==='c13'&&(G.st==='play'||G.st==='over');el.hidden=!on;if(!on)return;
 show('table',false);show('result',false);resetEditor();const me=mySeat();
 $('c13-round').textContent=`第 ${Math.min(G.hand+1,cfg().r)}／${cfg().r} 局 · 底 ${cfg().b}`;
 put('c13-players',players());$('c13-auto-toggle').textContent=myAuto?'取消託管':'託管';
 el.style.setProperty('--c13-ww',(RW>=820?100:84)+'px');
 const open=G.ph==='end'||G.st==='over';$('c13-players').hidden=open;$('c13-board').hidden=open;$('c13-dock').hidden=open;$('c13-balance').hidden=open;if(!open)ui.seen=C.handKey();
 const rv=open?revealNow():null;$('c13-rv').hidden=!rv;$('c13-results').hidden=!open||!!rv;
 if(open){if(rv)renderReveal(rv);else renderResults();frameC13();return}
 const submitted=!!G.c13Ready?.[me],current=submitted?(G.c13Rows?.[me]||ui.rows):ui.rows,editable=canEdit(),full=current.flat().length===13,bad=fouls(current),legal=full&&!bad.some(Boolean);
 if(submitted){ui.waiting=null;ui.busy=false}
 if(!ui.combos&&full)ui.combos=combosOf(current.flat());
 // Card size: three rows in the height between the top seat and the buttons, five cards in the width between the side seats.
 const bw=$('c13-board').offsetWidth||520,wide=RW>=820,lw=wide?74:64,tw=wide?86:76,cw=Math.floor(Math.max(34,Math.min((RH-78-62-10)/3/1.42,(bw-lw-tw-22-16)/5)));
 el.style.setProperty('--c13-cw',cw+'px');el.style.setProperty('--c13-ww',(wide?100:84)+'px');el.style.setProperty('--c13-lw',lw+'px');el.style.setProperty('--c13-tw',tw+'px');
 const peek=ui.peek?.cards||[],moved=ui.moved||[];
 put('c13-hand',current.map((r,i)=>`<div class="c13-row ${bad[i]?'c13-foul':''}"><div class="c13-rl">${i===2&&editable?'<button id="c13-swap" aria-label="中墩和尾墩整排對調"><svg viewBox="0 0 24 24" width="14" height="14"><path d="M8 4v15m0 0l-4-4m4 4l4-4M16 20V5m0 0l-4 4m4-4l4 4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>':''}<b>${rowNames[i]}</b><span>${type(r)}</span>${bad[i]?'<em>倒水</em>':''}</div><div class="c13-rc">${r.map(c=>`<button class="c13-card ${ui.sel===c?'c13-selected':''} ${peek.includes(c)?'c13-peek':''} ${moved.includes(c)?'c13-moved':''}" data-c13-card="${c}" aria-label="${cardLabel(c)}" aria-pressed="${ui.sel===c}" ${editable?'':'disabled'}><img alt="${cardLabel(c)}" src="${cardFace(c)}" draggable="false"></button>`).join('')}</div></div>`).join(''));
 put('c13-types',editable&&ui.combos?[8,7,6,5,4,3,2,1].filter(t=>ui.combos[t].length).map(t=>`<button data-c13-type="${t}" class="${ui.last?.t===t?'c13-on':''}">${TYPES[t]}${ui.combos[t].length>1?`<i>×${ui.combos[t].length}</i>`:''}</button>`).join(''):'');
 $('c13-status').textContent=submitted?'已排好，等其他人':ui.waiting?'送出中…':ui.busy?'排牌中…':ui.notice;
 $('c13-balance').textContent=`餘額 ${money(G.bk?.[meId()]??W.bal)}`;
 $('c13-submit').disabled=!editable||!legal;$('c13-submit').hidden=submitted;$('c13-clear').disabled=!editable;$('c13-suggest').disabled=!editable;frameC13();
}
function sendDraft(){if(!ui.waiting)return;ui.retryAt=Date.now()+800;if(!pending)doAct({t:'set',gid:G.gid,hand:G.hand,rows:ui.waiting.map(r=>r.slice())})}
// Drag one card onto another to swap them (a tap on two cards does the same). Pointer deltas are turned into table pixels.
function onDown(e){
 const t=e.target.closest?.('[data-c13-type]'),card=e.target.closest?.('[data-c13-card]');if(!canEdit()||e.button>0)return;
 if(t){ui.peek=pickCombo(+t.dataset.c13Type);renderC13();return}   // hold: see which cards before they move
 if(card)ui.drag={id:e.pointerId,c:+card.dataset.c13Card,x:e.clientX,y:e.clientY,on:false}}
function onMove(e){
 const d=ui.drag;if(!d||e.pointerId!==d.id)return;const dx=e.clientX-d.x,dy=e.clientY-d.y;if(!d.on&&Math.hypot(dx,dy)<10)return;
 const el=$('c13-hand').querySelector?.(`[data-c13-card="${d.c}"]`);if(!el){ui.drag=null;return}
 if(!d.on){d.on=true;ui.sel=-1;el.classList.add('c13-drag')}
 const z=typeof UIZ==='number'?UIZ:1,turned=typeof rot!=='undefined'&&rot;el.style.transform=`translate(${(turned?dy:dx)/z}px,${(turned?-dx:dy)/z}px) scale(1.06)`}
function onUp(e){
 if(ui.peek){ui.peek=null;setTimeout(renderC13,0)}
 const d=ui.drag;if(!d||e.pointerId!==d.id)return;ui.drag=null;if(!d.on)return;ui.dragAt=Date.now();
 const el=$('c13-hand').querySelector?.(`[data-c13-card="${d.c}"]`);if(el){el.classList.remove('c13-drag');el.style.transform=''}
 const to=e.type==='pointerup'&&document.elementFromPoint?.(e.clientX,e.clientY)?.closest?.('[data-c13-card]');if(to&&canEdit())swapCards(d.c,+to.dataset.c13Card);renderC13()}
async function onClick(e){
 const b=e.target.closest('button'),card=e.target.closest('[data-c13-card]'),kind=e.target.closest('[data-c13-type]');
 if(b?.id==='c13-settings'){$('cfgBtn').click();return}
 if(b?.id==='c13-auto-toggle'){$('auto').click();return}
 if(revealNow()){ui.rvTapped=1;const h=$('c13-rv-hint');if(h)h.hidden=true;revealSkip();renderC13();return}   // tap anywhere: on to the next part, this screen only
 if(b?.hasAttribute('data-c13-next')){doAct({t:'next'});renderC13();return}
 if(b?.hasAttribute('data-c13-leave')){leaveRoom();return}
 if(b?.hasAttribute('data-c13-profile')){openProf(chr(+b.dataset.c13Profile));return}
 if(!canEdit()||Date.now()-(ui.dragAt||0)<350)return;ui.moved=null;
 if(card){const c=+card.dataset.c13Card;if(ui.sel<0)ui.sel=c;else if(ui.sel===c)ui.sel=-1;else swapCards(ui.sel,c);renderC13();return}
 if(kind){const p=pickCombo(+kind.dataset.c13Type);if(p)applyCombo(p);else ui.notice='這幾張已經用在別墩了';renderC13();return}
 if(b?.id==='c13-swap'){swapRows();renderC13();return}
 if(b?.id==='c13-clear'){ui.rows=dealtRows(G.c13Hands[mySeat()]);ui.sel=-1;ui.claim=[null,null,null];ui.last=null;ui.notice='';renderC13();return}
 if(b?.id==='c13-submit'&&validLayout(ui.rows)){ui.waiting=ui.rows.map(r=>r.slice());sendDraft();renderC13();return}
 if(b?.id==='c13-suggest'){
  const key=ui.key,job=++ui.job;ui.busy=true;ui.sel=-1;renderC13();try{const rows=await suggest(G.c13Hands[mySeat()].slice(),profileFor({pat:1,risk:1,agg:1,whim:0}));if(ui.key!==key||ui.job!==job)return;ui.rows=rows;ui.claim=[null,null,null];ui.last=null;ui.notice=''}catch{ui.notice='暫時無法自動排牌'}finally{if(ui.key===key&&ui.job===job){ui.busy=false;renderC13()}}
 }
}
// Local reveal position. The host timestamp is used when this client has it; guests count from the moment
// they saw the hand open (redact does not forward c13RevealAt, and clocks differ between devices).
// A tab that never saw this hand being arranged (reload, late join) goes straight to the table.
function revealNow(){
 if(G.st!=='play'||G.ph!=='end'||!G.res)return null;const key=C.handKey();
 if(ui.rvKey!==key){ui.rvKey=key;ui.rvAt=ui.seen===key?Date.now():0;ui.rvPlan=revealPlan(G.res,mySeat());ui.rvStep=-1;ui.rvSkip=0}
 if(ui.rvDone===key)return null;
 const e=Math.max(0,Date.now()-(G.c13RevealAt??ui.rvAt))+(ui.rvSkip||0);
 if(quick()||calm()||e>=ui.rvPlan.len){ui.rvDone=key;return null}
 let i=0;while(i+1<ui.rvPlan.steps.length&&ui.rvPlan.steps[i+1].t<=e)i++;
 return{i,step:ui.rvPlan.steps[i]};
}
// A tap moves this screen on to the next part (next row, then the shots, then the table); the host clock is untouched.
function revealSkip(){
 const p=ui.rvPlan,e=Math.max(0,Date.now()-(G.c13RevealAt??ui.rvAt))+(ui.rvSkip||0),first=f=>p.steps.find(f)?.t;
 const next=first(x=>x.seg&&x.t>e);
 if(next===undefined)ui.rvDone=C.handKey();else ui.rvSkip=(ui.rvSkip||0)+next-e}
function renderReveal(rv){
 const el=$('c13-rv'),key=C.handKey(),me=mySeat(),pov=Math.max(0,me),res=G.res,st=rv.step,who=s=>s===me?'你':esc(nameOf(s));
 const sight='<svg class="c13-rv-sight" viewBox="0 0 92 92" aria-hidden="true"><g fill="none" stroke="#ff8ad8" stroke-width="2.4"><circle cx="46" cy="46" r="36"/><circle cx="46" cy="46" r="4" fill="#fff6fc"/><path d="M46 2v20M46 70v20M2 46h20M70 46h20"/></g></svg>';
 if(el.dataset.key!==key){
  el.dataset.key=key;ui.rvStep=-1;
  // Scores and balance stay at their pre-hand values until the table appears.
  // Head-to-head lights (頭 中 尾, from my side) only for a seated player.
  const h2h=s=>me>=0?`<span class="c13-rv-h2h" id="c13-rv-h2h${s}"><i>頭</i><i>中</i><i>尾</i></span>`:'';
  const seat=s=>`<div class="c13-rv-seat c13-rv-pos${(s-pov+4)%4}" id="c13-rv-seat${s}">${s===pov?'':`<div class="c13-rv-who"><span class="c13-rv-wb" id="c13-rv-win${s}">${portrait(s)}${me>=0?`${sight}<em class="c13-rv-tag c13-rv-tag-a">再一墩就打槍</em><em class="c13-rv-tag c13-rv-tag-d">她在瞄你</em>`:''}</span><b>${esc(nameOf(s))}</b><small>${fmt(G.score[s]-res.d[s])}</small>${h2h(s)}${validLayout(G.c13Rows[s])?'':'<em class="c13-rv-foul">倒水</em>'}</div>`}<div class="c13-rv-rows" id="c13-rv-rows${s}"></div></div>`;
  el.innerHTML=`${ids.filter(s=>s!==pov).map(seat).join('')}<div class="c13-rv-mid"><div id="c13-rv-banner"></div></div><div class="c13-rv-mine"><div class="c13-rv-me" id="c13-rv-win${pov}">${portrait(pov)}${me>=0?'<em class="c13-rv-tag c13-rv-tag-d">小心被打槍</em>':''}</div>${seat(pov)}${me>=0?'<div class="c13-rv-sum">本局<i id="c13-rv-sum"></i></div>':''}</div><footer><span>${validLayout(G.c13Rows[pov])?'':'<em class="c13-rv-foul">你倒水了</em> '}餘額 ${money((G.bk?.[meId()]??W.bal)-(me>=0?res.d[me]:0))}</span><span id="c13-rv-hint"${ui.rvTapped?' hidden':''}>點一下跳到下一段</span></footer>`;
 }
 if(ui.rvStep===rv.i)return;ui.rvStep=rv.i;
 const base=cfg().b,best=row=>Math.max(...ids.map(s=>pts(s,row))),cur=st.row??3,pts=(s,row)=>res.duels.reduce((n,d)=>n+(d.a===s?d.d[row]:d.b===s?-d.d[row]:0),0);
 const past=ui.rvPlan.steps.slice(0,rv.i+1),hit=s=>past.some(x=>x.k==='shot'?x.to===s:x.k==='hr'&&x.s!==s);
 const compared=row=>past.some(x=>x.k==='cmp'&&x.row===row),warned=past.some(x=>x.k==='warn'),settled=o=>compared(2)||past.some(x=>x.lit===o);
 const stake=o=>warned&&!settled(o)?stakeOf(res,me,o):'';
 // Back row: a seat is face up once its own flip (or slow flip) has started.
 const opened=(s,row)=>row<cur||(row===cur&&(st.k==='cmp'||past.some(x=>x.row===row&&(x.k==='flip'||x.k==='slow')&&(x.all||x.s===s))));
 if(ui.rvSfx!==key+':'+rv.i){ui.rvSfx=key+':'+rv.i;const n0=me>=0&&st.k==='cmp'?pts(me,st.row):0,snd=k=>{try{if(typeof sfx==='function')sfx(k)}catch{}},later=(k,ms)=>setTimeout(()=>{if(ui.rvSfx===key+':'+rv.i)snd(k)},ms);
  if(st.k==='slow')for(let j=0;j<5;j++)later('clack',j*RV.card+(j===4?RV.card*.8:0));
  else if(st.k==='sus'){snd('beat');later('beat',800)}
  else if(st.k==='warn'){const a=ids.filter(o=>stakeOf(res,me,o)==='aim').length;snd(a?'lock':'alarm');if(a&&ids.some(o=>stakeOf(res,me,o)==='danger'))later('alarm',400)}
  else snd(st.k==='flip'?'clack':st.k==='shot'?(st.to===me?'kan':'pon'):st.k==='hr'?'win':st.k==='miss'?'drawgame':st.k==='dodge'?'other':n0>0?'other':n0<0?'lose':'turn')}
 for(const s of ids){
  const slow=st.k==='slow'&&st.s===s;
  $('c13-rv-rows'+s).innerHTML=(G.c13Rows[s]||[[],[],[]]).map((r,row)=>{
   const up=opened(s,row),now=!slow&&st.k==='flip'&&st.row===row&&(st.all||st.s===s),done=row<cur||(row===cur&&(st.k==='cmp'||st.k==='warn'));
   // Every seat shows its own net for the row (the four add up to zero), in the same unit as the table.
   const n=pts(s,row);
   const mark=done?`<em class="c13-rv-mark ${n>0?'c13-rv-win':n<0?'c13-rv-lose':'c13-rv-tie'} ${row===cur?'c13-rv-pop':''}"><i>${fmt(n*base)}</i></em>`:'';
   // Only the row being compared is shown large; finished and waiting rows shrink to one line (mine: small cards).
   const big=row===cur,sl=slow&&row===2;
   // Only the best hand of the compared row lights up; rows still face down carry no text.
   const frame=done&&big&&n>0&&n===best(row)?'c13-rv-w':'';
   return `<div class="c13-rv-row ${up?'c13-rv-up':'c13-rv-wait'} ${now?'c13-rv-now':''} ${sl?'c13-rv-slow':''} ${big?'c13-rv-cur':''} ${frame}"><div class="c13-rv-cards">${r.map((c,j)=>`<span class="c13-rv-card" style="--j:${j}${sl?`;--d:${j*RV.card+(j===r.length-1?RV.card*.8:0)}ms`:''}">${up?`<img src="${cardFace(c,big?(s===pov&&j===r.length-1?0:2):1)}" alt="${cardLabel(c)}">`:''}</span>`).join('')}</div><div class="c13-rv-lab">${up?`<b>${rowNames[row]} ${type(r)}</b>`:''}${mark}</div></div>`;
  }).join('');
  const role=st.k==='flip'?(st.all||st.s===s?'c13-rv-on':''):st.k==='sus'||st.k==='slow'?(st.s===s?'c13-rv-spot':''):st.k==='shot'?(st.s===s?'c13-rv-shooter':st.to===s?'c13-rv-hit':''):st.k==='hr'?(st.s===s?'c13-rv-shooter':'c13-rv-hit'):'';
  const sk=s===me?'':stake(s);
  $('c13-rv-seat'+s).className='c13-rv-seat c13-rv-pos'+((s-pov+4)%4)+' '+role+(sk?' c13-rv-'+sk:'');
  el.classList?.toggle('c13-rv-fx',st.k==='shot'||st.k==='hr');   // the cut-in owns the middle: opponents' row lists step aside
  // Seats that have been shot so far swap their window to the dejected pose (no dimming, no extra art).
  const w=$('c13-rv-win'+s),pose=hit(s)?'X':'n';if(w&&w.dataset.pose!==pose){w.dataset.pose=pose;const o=w.querySelector('.c13-window');if(o)o.outerHTML=portrait(s,pose);else w.innerHTML=portrait(s,pose);w.classList?.toggle('c13-rv-down',pose==='X')}
  // Head-to-head lights: row by row; the back-row light of a seat comes on when that seat is settled.
  const hh=$('c13-rv-h2h'+s);if(hh){const dots=hh.querySelectorAll?.('i')||[];[0,1,2].forEach(row=>{const v=vsMe(res,me,s,row),on=row<2?compared(row):settled(s),c=on?(v>0?'c13-rv-hw':v<0?'c13-rv-hl':'c13-rv-ht'):'';if(dots[row]&&dots[row].className!==c)dots[row].className=c})}
 }
 // My window: red while someone still has me in her sights.
 const mw=$('c13-rv-win'+pov);if(mw&&me>=0)mw.classList?.toggle('c13-rv-danger',ids.some(o=>stake(o)==='danger'));
 const net=me>=0&&st.k==='cmp'?pts(me,st.row):0;
 // Running total of this hand in points: rows compared so far, doubled once the shot or home run has played.
 if(me>=0&&$('c13-rv-sum')){const rowsDone=row=>row<cur||(row===cur&&(st.k==='cmp'||st.k==='warn'));let sum=0;
  for(const d of res.duels){if(d.a!==me&&d.b!==me)continue;const sign=d.a===me?1:-1,other=d.shot===d.a?d.b:d.a,played=d.shot>=0&&past.some(x=>res.homeruns[d.shot]?x.k==='hr'&&x.s===d.shot:x.k==='shot'&&x.s===d.shot&&x.to===other);
   sum+=sign*(played?d.total:[0,1,2].reduce((n,row)=>n+(rowsDone(row)?d.d[row]:0),0))}
  const e=$('c13-rv-sum');e.textContent=fmt(sum*base);e.className=sum<0?'c13-negative':''}
 const art=(s,k,cls)=>{const a=window.AVATARS?.[chr(s)]||{};return a[k]?`<img class="c13-rv-art ${cls}" src="${a[k]}" alt="">`:''};
 const step=(b,sub,cls='')=>`<div class="c13-rv-step ${cls}"><b>${b}</b><span>${sub}</span></div>`,names=l=>l.map(o=>esc(nameOf(o))).join('、');
 const aimL=ids.filter(o=>stakeOf(res,me,o)==='aim'),dgL=ids.filter(o=>stakeOf(res,me,o)==='danger');
 $('c13-rv-banner').innerHTML=st.k==='flip'?(st.row===2&&st.s===me?step('尾墩',`你亮牌：${type(G.c13Rows[me][2])}`):step(rowNames[st.row],st.all?'四家一起開牌':`${'東南西北'[st.s]}家 ${who(st.s)} 開牌`))
  :st.k==='warn'?step('槍口對準了',[aimL.length?`你瞄準 ${names(aimL)}`:'',dgL.length?`${names(dgL)} 瞄準你`:''].filter(Boolean).join('・'),aimL.length?'c13-rv-pk':'c13-rv-rd')
  :st.k==='sus'||st.k==='slow'?(st.st==='aim'?step(`${esc(nameOf(st.s))}……`,'贏這墩就打槍','c13-rv-pk'):step(`${esc(nameOf(st.s))}……`,'輸這墩就被打槍','c13-rv-rd'))
  :st.k==='miss'?step('被她逃了',`${esc(nameOf(st.s))} 尾墩 ${type(G.c13Rows[st.s][2])}`)
  :st.k==='dodge'?step('閃過！',`你的${type(G.c13Rows[me][2])}擋下來了`,'c13-rv-pk')
  :st.k==='cmp'?`<div class="c13-rv-step c13-rv-cmp"><b>${rowNames[st.row]}比牌</b>${me>=0?`<i class="${net<0?'c13-negative':''}">${fmt(net*base)}</i>`:''}</div>`
  :st.k==='shot'?`<div class="c13-rv-shot ${st.to===me?'c13-rv-shot-me':''}">${art(st.s,'p','c13-rv-a')}<b>${st.to===me?'被打槍！':'打槍！'}</b><span>${who(st.s)} <u>▶</u> ${who(st.to)} <i>×${st.m}</i></span></div>`
  :`<div class="c13-rv-shot c13-rv-hr">${art(st.s,'W','c13-rv-a')}<b>全壘打！</b><span>${who(st.s)} 通殺三家 <i>×4</i></span></div>`;
}
function renderResults(){
 const el=$('c13-results'),key=G.gid+':'+G.hand+':'+G.st+':'+(G.rdy||[]).join('');if(el.dataset.key===key)return;el.dataset.key=key;
 const me=mySeat(),res=G.res,over=G.st==='over',players=ids.slice().sort((a,b)=>G.score[b]-G.score[a]);
 el.classList.toggle('c13-match-over',over);
 const title=over?'今晚的勝負':res?.homeruns?.[me]?'全壘打！':res?.shots?.[me]?'打槍得分！':'三墩見真章';
 const ready=R&&humans().length>1?`<span class="c13-ready">${humans().filter(s=>G.rdy?.[s]).length}／${humans().length} 人準備</span>`:'';
 const head=`<header class="c13-result-head"><div><small>${over?`整場結束 · 共 ${cfg().r} 局`:`第 ${G.hand+1} 局開牌`}</small><h2>${title}</h2></div><div>${ready}<button data-c13-next class="c13-primary" ${R&&G.rdy?.[me]?'disabled':''}>${R&&G.rdy?.[me]?'已準備':over?'再來一場':'下一局'}<span id="c13-next-clock"></span></button><button data-c13-leave>離開</button></div></header>`;
 const person=(s,note)=>`<button class="c13-result-person" data-c13-profile="${s}">${portrait(s)}<b>${esc(nameOf(s))}</b><small>${note}</small></button>`;
 let body;
 if(over){
  // Match totals have no delayed card reveal: fast simulated matches and restored tabs render completely.
  body=`<div class="c13-result-grid c13-labels"><span>名次</span><span>牌搭子</span><span>本場表現</span><span>本場輸贏</span></div>`+players.map(s=>{
   const rank=players.findIndex(p=>G.score[p]===G.score[s])+1,st=G.stat?.[s]||[0,0,0];
   return `<div class="c13-result-grid ${s===me?'c13-me':''}"><span class="c13-rank">${rank}</span>${person(s,G.rdy?.[s]?'已準備':s===me?'你':'牌搭子')}<div class="c13-match-stats">贏 ${st[0]} 局 · 打槍 ${st[1]} 次<small>全壘打 ${st[2]} 次</small></div><strong class="${G.score[s]<0?'c13-negative':''}">${fmt(G.score[s])}</strong></div>`;
  }).join('');
 }else{
  body=`<div class="c13-result-grid c13-labels"><span>牌搭子</span><span>頭墩</span><span>中墩</span><span>尾墩</span><span>本局</span></div>`+ids.map(s=>{
   const duel=s===me?null:res.duels.find(x=>x.a===Math.min(s,me)&&x.b===Math.max(s,me));
   const note=G.rdy?.[s]?'已準備':!validLayout(G.c13Rows[s])?'倒水':res.homeruns[s]?'全壘打 ×4':duel?.shot>=0?`${duel.shot===me?'你':'對方'}打槍 ×${duel.multiplier}`:res.shots[s]?`打槍 ${res.shots[s]} 家`:'已開牌';
   return `<div class="c13-result-grid ${s===me?'c13-me':''}">${person(s,note)}${G.c13Rows[s].map((r,i)=>{
    const d=duel?duel.d[i]*(duel.a===me?1:-1):null;
    return `<div class="c13-reveal" style="--c13-delay:${i*160}ms"><div class="c13-result-cards">${r.map(c=>`<img src="${cardFace(c,1)}" alt="${cardLabel(c)}">`).join('')}</div><small>${type(r)}${d===null?'':d>0?' · 你贏':d<0?' · 你輸':' · 平手'}</small></div>`;
   }).join('')}<strong class="${res.d[s]<0?'c13-negative':''}">${fmt(res.d[s])}</strong></div>`;
  }).join('');
 }
 el.innerHTML=head+body+`<footer class="c13-result-foot"><span>你的餘額 ${money(G.bk?.[meId()]??W.bal)}</span><span>每墩 1 分 · 打槍 ×2 · 全壘打再 ×2 · 1 分＝${cfg().b}</span></footer>`;
}

function frameC13(){
 const el=$('c13-game');if(!el||el.hidden)return;
 if(G.st==='play'&&G.ph==='end'){const rv=revealNow();if(rv)renderReveal(rv);else if(!$('c13-rv').hidden)renderC13()}
 const clockEl=$('c13-clock');if(clockEl){clockEl.hidden=G.ph!=='arrange';const left=G.ph==='arrange'?Math.max(0,Math.ceil((G.c13Deadline-Date.now())/1000)):0;const txt=G.ph==='arrange'?`${G.pz?'暫停 ':''}${left}`:'';if(clockEl.textContent!==txt){clockEl.textContent=txt;const hot=left<=10&&!G.pz;clockEl.classList.toggle('c13-hot',hot);if(hot&&clockEl.animate&&!calm())clockEl.animate([{transform:'scale(1.35)'},{transform:'scale(1)'}],{duration:260,easing:'ease-out'})}}
 if(G.ph==='arrange'&&ui.ready.some(t=>t&&Date.now()-t>=900&&Date.now()-t<1200))put('c13-players',players());
 const me=mySeat();if(G.st==='play'&&G.ph==='arrange'&&!G.pz&&me>=0&&!G.c13Ready?.[me]&&!ui.waiting&&!myAuto&&!AUTO&&ui.rows.flat().length===13&&Date.now()>=G.c13Deadline-400){ui.waiting=ui.rows.map(r=>r.slice());sendDraft();renderC13();return}   // time is up: what is on screen goes in
 if(ui.waiting&&G.ph==='arrange'&&!G.pz&&Date.now()>=ui.retryAt&&!G.c13Ready?.[me])sendDraft();
 const next=$('c13-next-clock');if(next)next.textContent=G.st!=='over'&&(R||myAuto)?` ${Math.max(0,Math.ceil((G.c13NextAt-Date.now())/1000))}`:'';
}
