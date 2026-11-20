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
 G.c13RevealAt=Date.now();G.c13NextAt=G.c13RevealAt+(quick()?0:revealPlan(G.res).len)+15000;bump({s:G.res.w,t:'c13:reveal'});
}
function submit(s,rows){
 if(!Number.isInteger(s)||s<0||s>3||G.ph!=='arrange'||G.c13Ready[s]||!ownsLayout(G.c13Hands[s],rows))return false;
 G.c13Rows[s]=rows.map(r=>r.slice());G.c13Ready[s]=true;bump();finish();return true;
}
// Reveal timeline: rows 頭→中→尾, seats East first; then one compare beat per row, shots one by one, home run last.
const RV={flip:600,cmp:1000,shot:800,hr:1500,tail:300};
function revealPlan(res){
 const steps=[];let t=0;const add=(ms,x)=>{steps.push({t,...x});t+=ms};
 for(let row=0;row<3;row++){for(const s of ids)add(RV.flip,{k:'flip',row,s});add(RV.cmp,{k:'cmp',row})}
 // A home run replaces its three single shots with one bigger beat.
 for(const d of res?.duels||[])if(d.shot>=0&&!res.homeruns?.[d.shot])add(RV.shot,{k:'shot',s:d.shot,to:d.shot===d.a?d.b:d.a,m:d.multiplier});
 (res?.homeruns||[]).forEach((h,s)=>{if(h)add(RV.hr,{k:'hr',s})});
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
 act(s,a){if(a.t==='set'&&a.hand===G.hand&&a.gid===G.gid)submit(s,a.rows)},timers:clock,
 hostTick(){
  const before=G.c13Deadline;clock();if(before!==G.c13Deadline)bump();const now=Date.now();
  if(G.ph==='arrange'){
   for(const s of ids){if(G.c13Ready[s])continue;if((isBot(s)&&now-G.c13Started>=700)||now>=G.c13Deadline)submit(s,arrange(G.c13Hands[s],ai[chr(s)]));if(G.ph!=='arrange')break}
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
const ui={key:'',rows:[[],[],[]],selected:[],notice:'',waiting:null,retryAt:0,busy:false,job:0,seen:'',rvKey:'',rvAt:0,rvPlan:null,rvStep:-1,rvDone:''};
let worker=null,nextJob=0;const jobs=new Map();
function fallbackWorker(){worker?.terminate();worker=null;for(const [id,j]of jobs){jobs.delete(id);setTimeout(()=>{try{j.resolve(arrange(j.hand,j.profile))}catch(e){j.reject(e)}},0)}}
try{worker=new Worker(new URL('./arranger.mjs',import.meta.url),{type:'module'});worker.onmessage=({data})=>{const j=jobs.get(data.id);if(!j)return;jobs.delete(data.id);data.error?j.reject(Error(data.error)):j.resolve(data.rows)};worker.onerror=e=>{e.preventDefault();fallbackWorker()}}catch{}
function suggest(hand,profile){return new Promise((resolve,reject)=>{if(worker){const id=++nextJob;jobs.set(id,{hand,profile,resolve,reject});worker.postMessage({id,hand,profile})}else setTimeout(()=>{try{resolve(arrange(hand,profile))}catch(e){reject(e)}},0)})}
function mount(){let el=$('c13-game');if(el)return el;el=document.createElement('div');el.id='c13-game';el.innerHTML=`<div class="c13-felt"></div><header class="c13-head"><div><b>十三支</b><small id="c13-round"></small></div><span id="c13-clock"></span><div class="c13-tools"><button id="c13-auto-toggle">託管</button><button id="c13-settings">設定</button></div></header><div id="c13-players"></div><section id="c13-editor"><div id="c13-zones"></div><div id="c13-validation"></div></section><section id="c13-dock"><div id="c13-status" role="status"></div><div id="c13-hand"></div><footer><span id="c13-balance"></span><div><button id="c13-clear">收回全部</button><button id="c13-suggest">自動排牌</button><button id="c13-submit" class="c13-primary">確認排好</button></div></footer></section><section id="c13-rv" hidden></section><section id="c13-results" hidden></section>`;root.appendChild(el);
 el.addEventListener('click',onClick);el.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-c13-add]')){e.preventDefault();addRow(+e.target.dataset.c13Add)}});return el}
function cardLabel(c){return SUITS[c%4]+RANKS[c>>2]}
function type(r){return [3,5].includes(r?.length)?TYPES[evaluate(r)[0]]:'尚未排滿'}
function canEdit(){const s=mySeat();return G.st==='play'&&G.ph==='arrange'&&s>=0&&!G.c13Ready?.[s]&&!G.pz&&!ui.waiting&&!ui.busy&&!myAuto&&!AUTO}
function resetEditor(){const key=C.handKey();if(ui.key===key)return;ui.key=key;ui.rows=G.c13Rows?.[mySeat()]?.map(r=>r.slice())||[[],[],[]];ui.selected=[];ui.notice='選手牌，再點頭／中／尾墩放入';ui.waiting=null;ui.busy=false;ui.job++}
function portrait(s){const a=window.AVATARS?.[chr(s)]||{},wide=(a.nx||[]).includes('n');return `<div class="c13-window ${wide?'c13-wide':''}">${a.n?`<img alt="${esc(BOTS[chr(s)]||'')}" src="${a.n}">`:''}</div>`}
function players(){const me=mySeat();return ids.filter(s=>s!==me).map(s=>{const rel=(s-Math.max(0,me)+4)%4;return `<div class="c13-player c13-pos${rel}">${portrait(s)}<div class="c13-player-info"><b>${esc(nameOf(s))}</b><span>${G.st==='over'?'整場結束':G.ph==='end'?(G.rdy?.[s]?'已準備':'已開牌'):G.c13Ready?.[s]?'已排好':'排牌中'}</span><small>${fmt(G.score[s])}</small></div></div>`}).join('')}
function renderC13(){
 const el=mount(),on=G.game==='c13'&&(G.st==='play'||G.st==='over');el.hidden=!on;if(!on)return;
 show('table',false);show('result',false);resetEditor();const me=mySeat();
 $('c13-round').textContent=`第 ${Math.min(G.hand+1,cfg().r)}／${cfg().r} 局 · 底 ${cfg().b}`;
 $('c13-players').innerHTML=players();$('c13-auto-toggle').textContent=myAuto?'取消託管':'託管';
 const open=G.ph==='end'||G.st==='over';$('c13-players').hidden=open;$('c13-editor').hidden=open;$('c13-dock').hidden=open;if(!open)ui.seen=C.handKey();
 const rv=open?revealNow():null;$('c13-rv').hidden=!rv;$('c13-results').hidden=!open||!!rv;
 if(open){if(rv)renderReveal(rv);else renderResults();frameC13();return}
 const submitted=!!G.c13Ready?.[me],hand=G.c13Hands?.[me]||[],current=submitted?(G.c13Rows?.[me]||ui.rows):ui.rows,used=new Set(current.flat()),pool=hand.filter(c=>c>=0&&!used.has(c)).sort((a,b)=>b-a),editable=canEdit();
 if(submitted){ui.waiting=null;ui.busy=false}
 $('c13-zones').innerHTML=current.map((r,i)=>`<div class="c13-zone ${editable&&ui.selected.length?'c13-target':''}"><div class="c13-zone-head"><button data-c13-add="${i}" ${editable?'':'disabled'}><b>${rowNames[i]}</b><small>${['最小','居中','最大'][i]}</small></button><span>${r.length}／${caps[i]}</span></div><div class="c13-slots" data-c13-add="${i}" role="button" tabindex="${editable?0:-1}" aria-label="放入${rowNames[i]}">${r.map(c=>`<button class="c13-zone-card" data-c13-remove="${c}" data-c13-row="${i}" aria-label="收回${cardLabel(c)}" ${editable?'':'disabled'}><img src="${cardFace(c)}" alt="${cardLabel(c)}"></button>`).join('')}</div><div class="c13-type">${type(r)}</div></div>`).join('');
 const available=Math.max(240,RW-80),cw=RH<=420?59:68,step=Math.max(16,Math.min(41,(available-cw-20)/Math.max(1,pool.length-1)));
 $('c13-hand').innerHTML=pool.map((c,i)=>{const t=pool.length>1?i/(pool.length-1)*2-1:0;return `<button class="c13-card ${ui.selected.includes(c)?'c13-selected':''}" data-c13-card="${c}" aria-label="${cardLabel(c)}" aria-pressed="${ui.selected.includes(c)}" ${editable?'':'disabled'} style="--c13-card:${cw}px;--c13-x:${(i-(pool.length-1)/2)*step}px;--c13-angle:${t*10}deg;--c13-rise:${(1-t*t)*13}px"><img alt="${cardLabel(c)}" src="${cardFace(c)}" draggable="false"></button>`}).join('');
 const complete=validLayout(current),full=current.flat().length===13,v=$('c13-validation');v.className=full?(complete?'c13-good':'c13-bad'):'';v.textContent=full?(complete?'排牌成立 · 尾墩 ≥ 中墩 ≥ 頭墩':'這樣會倒水，請調整三墩強弱'):'頭墩 3 張 · 中墩 5 張 · 尾墩 5 張';
 $('c13-status').textContent=submitted?'已排好，等待其他玩家':ui.waiting?'正在送出排法…':ui.busy?'正在找合適的排法…':full&&!complete?'這樣會倒水，請調整三墩強弱':ui.notice;
 $('c13-balance').textContent=`${esc(nameOf(me))} · 餘額 ${money(G.bk?.[meId()]??W.bal)}`;
 $('c13-submit').disabled=!editable||!complete;$('c13-clear').disabled=!editable;$('c13-suggest').disabled=!editable;frameC13();
}
function addRow(i){if(!canEdit())return;if(!ui.selected.length){ui.notice='先選下方的手牌，再點墩位';renderC13();return}if(ui.selected.length>caps[i]-ui.rows[i].length){ui.notice=`${rowNames[i]}還能放 ${caps[i]-ui.rows[i].length} 張`;renderC13();return}ui.rows[i].push(...[...ui.selected].sort((a,b)=>b-a));ui.selected=[];ui.notice='點已排的牌可收回，排好後確認';renderC13()}
function sendDraft(){if(!ui.waiting)return;ui.retryAt=Date.now()+800;if(!pending)doAct({t:'set',gid:G.gid,hand:G.hand,rows:ui.waiting.map(r=>r.slice())})}
async function onClick(e){
 const b=e.target.closest('button'),card=e.target.closest('[data-c13-card]'),remove=e.target.closest('[data-c13-remove]');
 if(b?.id==='c13-settings'){$('cfgBtn').click();return}
 if(b?.id==='c13-auto-toggle'){$('auto').click();return}
 if(revealNow()){ui.rvDone=C.handKey();renderC13();return}   // tap anywhere: straight to the table, this screen only
 if(b?.hasAttribute('data-c13-next')){doAct({t:'next'});renderC13();return}
 if(b?.hasAttribute('data-c13-leave')){leaveRoom();return}
 if(b?.hasAttribute('data-c13-profile')){openProf(chr(+b.dataset.c13Profile));return}
 if(!canEdit())return;
 if(card){const c=+card.dataset.c13Card;ui.selected.includes(c)?ui.selected=ui.selected.filter(x=>x!==c):ui.selected.push(c);ui.notice=ui.selected.length?`已選 ${ui.selected.length} 張 · 點上方墩位放入`:'選牌後點墩位放入';renderC13();return}
 if(remove){const c=+remove.dataset.c13Remove,i=+remove.dataset.c13Row;ui.rows[i]=ui.rows[i].filter(x=>x!==c);renderC13();return}
 const add=e.target.closest('[data-c13-add]');if(add){addRow(+add.dataset.c13Add);return}
 if(b?.id==='c13-clear'){ui.rows=[[],[],[]];ui.selected=[];ui.notice='已收回全部手牌';renderC13()}
 if(b?.id==='c13-submit'&&validLayout(ui.rows)){ui.waiting=ui.rows.map(r=>r.slice());sendDraft();renderC13()}
 if(b?.id==='c13-suggest'){
  const key=ui.key,job=++ui.job;ui.busy=true;ui.selected=[];renderC13();try{const rows=await suggest(G.c13Hands[mySeat()].slice(),profileFor({pat:1,risk:1,agg:1,whim:0}));if(ui.key!==key||ui.job!==job)return;ui.rows=rows;ui.notice='已排好建議，可收回牌微調，再確認'}catch{ui.notice='暫時無法自動排牌，仍可手動安排'}finally{if(ui.key===key&&ui.job===job){ui.busy=false;renderC13()}}
 }
}
// Local reveal position. The host timestamp is used when this client has it; guests count from the moment
// they saw the hand open (redact does not forward c13RevealAt, and clocks differ between devices).
// A tab that never saw this hand being arranged (reload, late join) goes straight to the table.
function revealNow(){
 if(G.st!=='play'||G.ph!=='end'||!G.res)return null;const key=C.handKey();
 if(ui.rvKey!==key){ui.rvKey=key;ui.rvAt=ui.seen===key?Date.now():0;ui.rvPlan=revealPlan(G.res);ui.rvStep=-1}
 if(ui.rvDone===key)return null;
 const e=Math.max(0,Date.now()-(G.c13RevealAt??ui.rvAt));
 if(quick()||calm()||e>=ui.rvPlan.len){ui.rvDone=key;return null}
 let i=0;while(i+1<ui.rvPlan.steps.length&&ui.rvPlan.steps[i+1].t<=e)i++;
 return{i,step:ui.rvPlan.steps[i]};
}
function renderReveal(rv){
 const el=$('c13-rv'),key=C.handKey(),me=mySeat(),pov=Math.max(0,me),res=G.res,st=rv.step,who=s=>s===me?'你':esc(nameOf(s));
 if(el.dataset.key!==key){
  el.dataset.key=key;ui.rvStep=-1;
  // Scores and balance stay at their pre-hand values until the table appears.
  const seat=s=>`<div class="c13-rv-seat" id="c13-rv-seat${s}">${s===pov?'':`<div class="c13-rv-who">${portrait(s)}<b>${esc(nameOf(s))}</b><small>${fmt(G.score[s]-res.d[s])}</small></div>`}<div class="c13-rv-rows" id="c13-rv-rows${s}"></div></div>`;
  el.innerHTML=`<div class="c13-rv-top">${ids.filter(s=>s!==pov).map(seat).join('')}</div><div class="c13-rv-mid"><div id="c13-rv-beam" hidden></div><div id="c13-rv-banner"></div></div><div class="c13-rv-mine">${seat(pov)}</div><footer><span>${esc(nameOf(pov))} · 餘額 ${money((G.bk?.[meId()]??W.bal)-(me>=0?res.d[me]:0))}</span><span>點一下畫面跳過</span></footer>`;
 }
 if(ui.rvStep===rv.i)return;ui.rvStep=rv.i;
 const cur=st.k==='flip'||st.k==='cmp'?st.row:3,pts=(s,row)=>res.duels.reduce((n,d)=>n+(d.a===s?d.d[row]:d.b===s?-d.d[row]:0),0);
 const vs=(s,row)=>{const d=res.duels.find(x=>x.a===Math.min(s,me)&&x.b===Math.max(s,me));return d.d[row]*(d.a===me?1:-1)};
 for(const s of ids){
  $('c13-rv-rows'+s).innerHTML=(G.c13Rows[s]||[[],[],[]]).map((r,row)=>{
   const now=st.k==='flip'&&st.row===row&&st.s===s,up=row<cur||(row===cur&&(st.k==='cmp'||s<=st.s)),done=row<cur||(row===cur&&st.k==='cmp');
   // Every number is from your side of the table: opponents show your result against them, your own rows your net.
   const n=me<0||s===me?pts(s,row):vs(s,row),tag=me<0||s===me?'':n>0?'你贏 ':n<0?'你輸 ':'平手 ';
   const mark=done?`<em class="c13-rv-mark ${n>0?'c13-rv-win':n<0?'c13-rv-lose':'c13-rv-tie'} ${row===cur?'c13-rv-pop':''}">${tag}<i>${fmt(n)}</i></em>`:'';
   return `<div class="c13-rv-row ${up?'c13-rv-up':''} ${now?'c13-rv-now':''}"><div class="c13-rv-cards">${r.map((c,j)=>`<span class="c13-rv-card" style="--j:${j}">${up?`<img src="${cardFace(c)}" alt="${cardLabel(c)}">`:''}</span>`).join('')}</div><div class="c13-rv-lab"><b>${s===pov?rowNames[row]+(up?' · ':''):''}${up?type(r):s===pov?'':rowNames[row]}</b>${mark}</div></div>`;
  }).join('');
  const role=st.k==='flip'?(st.s===s?'c13-rv-on':''):st.k==='shot'?(st.s===s?'c13-rv-shooter':st.to===s?'c13-rv-hit':'c13-rv-dim'):st.k==='hr'?(st.s===s?'c13-rv-shooter':'c13-rv-hit'):'';
  $('c13-rv-seat'+s).className='c13-rv-seat '+role;
 }
 const net=me>=0&&st.k==='cmp'?pts(me,st.row):0;
 $('c13-rv-banner').innerHTML=st.k==='flip'?`<div class="c13-rv-step"><b>${rowNames[st.row]}</b><span>${'東南西北'[st.s]}家 ${who(st.s)} 開牌</span></div>`
  :st.k==='cmp'?`<div class="c13-rv-step c13-rv-cmp"><b>${rowNames[st.row]}比牌</b>${me>=0?`<i class="${net<0?'c13-negative':''}">${fmt(net)}</i>`:''}</div>`
  :st.k==='shot'?`<div class="c13-rv-shot"><b>打槍！</b><span>${who(st.s)} <u>▶</u> ${who(st.to)} <i>×${st.m}</i></span></div>`
  :`<div class="c13-rv-shot c13-rv-hr"><b>全壘打！</b><span>${who(st.s)} 通殺三家 <i>×4</i></span></div>`;
 // The shot beam runs from the shooter's seat to the victim's (layout offsets: unaffected by the root zoom).
 const beam=$('c13-rv-beam'),a=$('c13-rv-seat'+st.s),b=st.k==='shot'&&$('c13-rv-seat'+st.to);beam.hidden=!(b&&a?.offsetWidth);
 if(!beam.hidden){const at=(e,s)=>[e.offsetLeft+e.offsetWidth/2,s===pov?e.offsetTop-4:e.offsetTop+e.offsetHeight+4],[x1,y1]=at(a,st.s),[x2,y2]=at(b,st.to);
  beam.style.cssText=`left:${x1}px;top:${y1}px;width:${Math.hypot(x2-x1,y2-y1)}px;transform:rotate(${Math.atan2(y2-y1,x2-x1)}rad)`;beam.className='';void beam.offsetWidth;beam.className='c13-rv-go'}
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
   const note=G.rdy?.[s]?'已準備':res.homeruns[s]?'全壘打 ×4':duel?.shot>=0?`${duel.shot===me?'你':'對方'}打槍 ×${duel.multiplier}`:res.shots[s]?`打槍 ${res.shots[s]} 家`:'已開牌';
   return `<div class="c13-result-grid ${s===me?'c13-me':''}">${person(s,note)}${G.c13Rows[s].map((r,i)=>{
    const d=duel?duel.d[i]*(duel.a===me?1:-1):null;
    return `<div class="c13-reveal" style="--c13-delay:${i*160}ms"><div class="c13-result-cards">${r.map(c=>`<img src="${cardFace(c)}" alt="${cardLabel(c)}">`).join('')}</div><small>${type(r)}${d===null?'':d>0?' · 你贏':d<0?' · 你輸':' · 平手'}</small></div>`;
   }).join('')}<strong class="${res.d[s]<0?'c13-negative':''}">${fmt(res.d[s])}</strong></div>`;
  }).join('');
 }
 el.innerHTML=head+body+`<footer class="c13-result-foot"><span>你的餘額 ${money(G.bk?.[meId()]??W.bal)}</span><span>每墩 1 分 · 打槍 ×2 · 全壘打再 ×2 · 1 分＝${cfg().b}</span></footer>`;
}

function frameC13(){
 const el=$('c13-game');if(!el||el.hidden)return;
 if(G.st==='play'&&G.ph==='end'){const rv=revealNow();if(rv)renderReveal(rv);else if(!$('c13-rv').hidden)renderC13()}
 const clockEl=$('c13-clock');if(clockEl){clockEl.hidden=G.ph!=='arrange';const left=G.ph==='arrange'?Math.max(0,Math.ceil((G.c13Deadline-Date.now())/1000)):0;clockEl.textContent=G.ph==='arrange'?`${G.pz?'暫停 · ':''}${left} 秒`:'';clockEl.classList.toggle('c13-hot',left<=10)}
 if(ui.waiting&&G.ph==='arrange'&&!G.pz&&Date.now()>=ui.retryAt&&!G.c13Ready?.[mySeat()])sendDraft();
 const next=$('c13-next-clock');if(next)next.textContent=G.st!=='over'&&(R||myAuto)?` ${Math.max(0,Math.ceil((G.c13NextAt-Date.now())/1000))}`:'';
}
