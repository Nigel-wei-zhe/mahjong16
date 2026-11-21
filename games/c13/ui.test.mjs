import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import * as engine from './engine.mjs';import {MEASURED} from './stats.mjs';
let now=100000,queue=[];const nodes=new Map();function el(id){if(!nodes.has(id))nodes.set(id,{id,dataset:{},style:{setProperty(){}},hidden:false,textContent:'',innerHTML:'',offsetWidth:0,querySelector:()=>null,classList:{toggle(){},add(){},remove(){}},addEventListener(){},click(){}});return nodes.get(id)}
const ctx={...engine,scoreRound:engine.settle,privateView:engine.redact,cardFace:c=>'card:'+c,MEASURED,TRAIT:Array.from({length:8},()=>({agg:1,risk:1,pat:1,whim:0})),GAMES:{c13:{}},GAME_AI:{},Math,Set,Map,Number,Array,Error,JSON,URL,console,Date:{now:()=>now},R:null,myAuto:false,AUTO:false,SPEED:1,pending:false,G:{st:'play',game:'c13',gid:'ui',v:0,seats:['me','','',''],chs:[0,1,2,3],score:[0,0,0,0],bk:{me:10000},cfg:{b:100,r:4,s:60}},document:{getElementById:el,createElement:()=>el('created'),head:{appendChild(){}}},$:el,root:{appendChild(){}},RW:755,RH:395,window:{AVATARS:[]},W:{bal:10000},BOTS:['A','B','C','D'],CCOL:[],cfg:()=>ctx.G.cfg,chr:s=>ctx.G.chs[s],isBot:s=>s!==0,mySeat:()=>0,meId:()=>'me',bump:()=>ctx.G.v++,seg:()=>'',setTimeout:f=>queue.push(f),assignSeats(){},allReady:()=>false,humans:()=>[0],money:n=>'$'+n,fmt:n=>(n>0?'+':'')+n,esc:s=>s,nameOf:s=>'player'+s,show(){},settle(d){d.forEach((v,s)=>ctx.G.score[s]+=v);ctx.G.bk.me+=d[0]},doAct:a=>ctx.GAMES.c13.act(0,a)};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(new URL('./game.mjs',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replaceAll('import.meta.url',"'http://test/games/c13/game.mjs'"),ctx);
const J=x=>JSON.parse(JSON.stringify(x)),U=()=>vm.runInContext('ui',ctx),btn=id=>({target:{closest:selector=>selector==='button'?{id,hasAttribute:()=>false}:null}}),target=(kind,data)=>({target:{closest:selector=>selector===kind?{dataset:data}:null}}),cardsShown=()=>(el('c13-hand').innerHTML.match(/data-c13-card=/g)||[]).length;
ctx.GAMES.c13.newGame();ctx.renderC13();
// Arrange starts empty: the thirteen cards wait in the hand under the mask.
const inHand=()=>(el('c13-pool').innerHTML.match(/data-c13-in=/g)||[]).length,card=c=>target('[data-c13-card]',{c13Card:String(c)}),hc=c=>target('[data-c13-in]',{c13In:String(c)});
assert.equal(cardsShown(),0);assert.equal(inHand(),13);assert.deepEqual(J(U().rows),[[],[],[]]);assert.equal(U().cur,2);
const hand0=ctx.G.c13Hands[0].slice().sort((a,b)=>b-a);
// Hand cards fill the back row first, then the middle.
for(const c of hand0.slice(0,6))await ctx.onClick(hc(c));
assert.deepEqual(J(U().rows[2]),hand0.slice(0,5));assert.deepEqual(J(U().rows[1]),[hand0[5]]);assert.equal(U().cur,1);assert.equal(inHand(),7);
// A placed card: tap twice = back to the hand; tap one then another = swap; lift one then tap a hand card = replace.
const a=hand0[5];await ctx.onClick(card(a));assert.equal(U().sel,a);assert(el('c13-hand').innerHTML.includes('c13-selected'));await ctx.onClick(card(a));assert.deepEqual(J(U().rows[1]),[]);assert.equal(inHand(),8);assert.equal(U().sel,-1);
await ctx.onClick(card(hand0[0]));await ctx.onClick(card(hand0[4]));assert.equal(U().rows[2][0],hand0[4]);assert.equal(U().rows[2][4],hand0[0]);
await ctx.onClick(card(hand0[1]));await ctx.onClick(hc(a));assert.equal(U().rows[2][1],a);assert(ctx.left().includes(hand0[1]));assert.equal(U().rows.flat().length,5);
// The row label picks the row; whole-row swap; 全部收回 empties the rows.
await ctx.onClick(target('[data-c13-row]',{c13Row:'0'}));assert.equal(U().cur,0);await ctx.onClick(hc(hand0[12]));assert.deepEqual(J(U().rows[0]),[hand0[12]]);
const back=U().rows[2].slice();await ctx.onClick(btn('c13-swap'));assert.deepEqual(J(U().rows[1]),J(back));assert.deepEqual(J(U().rows[2]),[]);
await ctx.onClick(btn('c13-clear'));assert.deepEqual(J(U().rows),[[],[],[]]);assert.equal(inHand(),13);assert.equal(U().cur,2);
// The ladder lists every type; the ones still in the hand are buttons. A type goes into the current row; the same type again swaps in the next one.
{const hand=[0,4,8,12,16, 1,5, 2,6,10, 21,26,31].map(Number),cs=ctx.combosOf(hand);   // clubs 2-6 (straight flush), pairs/trips of 2 and 3
 assert.equal(cs[8].length,1);assert(cs[6].length>=1&&cs[3].length>=1&&cs[1].length>=2&&cs[2].length>=1);assert.equal(cs[7].length,0);
 for(let t=1;t<9;t++)for(const c of cs[t])if(c.length===5)assert.equal(engine.evaluate(c)[0],t,'candidate is the type it is listed under');
 const u=U(),keep=ctx.G.c13Hands[0];ctx.G.c13Hands[0]=hand;u.rows=[[],[],[]];u.cur=2;u.last=null;ctx.renderC13();
 assert.equal((el('c13-types').innerHTML.match(/<button/g)||[]).length,9);assert(el('c13-types').innerHTML.includes('data-c13-type="8"'));assert(!el('c13-types').innerHTML.includes('data-c13-type="7"'));
 await ctx.onClick(target('[data-c13-type]',{c13Type:'8'}));assert.equal(engine.evaluate(u.rows[2])[0],8,'first type goes to the back row');assert.equal(u.cur,1);
 await ctx.onClick(target('[data-c13-type]',{c13Type:'1'}));assert.equal(u.rows[1].length,2,'next type goes to the middle row');assert.equal(engine.evaluate(u.rows[2])[0],8,'back row untouched');
 const first=u.rows[1].slice();await ctx.onClick(target('[data-c13-type]',{c13Type:'1'}));assert.equal(u.rows[1].length,2);assert.notDeepEqual(J(u.rows[1]),J(first),'same type again: next candidate');assert.equal(new Set(u.rows.flat()).size,7);
 ctx.G.c13Hands[0]=keep;u.rows=[[],[],[]];u.cur=2;u.last=null}
// 倒水 is marked on the row that is too strong and the confirm button stays off.
{const u=U(),good=engine.arrange(ctx.G.c13Hands[0]),foul=[good[0],good[2],good[1]];if(!engine.validLayout(foul)){u.rows=foul.map(r=>r.slice());ctx.renderC13();assert(el('c13-hand').innerHTML.includes('倒水'));assert(el('c13-submit').disabled)}await ctx.onClick(btn('c13-clear'))}
const auto=ctx.onClick(btn('c13-suggest'));assert(U().busy);while(queue.length)queue.shift()();await auto;assert(engine.validLayout(U().rows));assert(!el('c13-submit').disabled);assert(!el('c13-hand').innerHTML.includes('倒水'));
await ctx.onClick(btn('c13-submit'));assert(ctx.G.c13Ready[0]);now+=1000;ctx.GAMES.c13.hostTick();ctx.renderC13();assert.equal(ctx.G.ph,'end');
// Reveal (seen from seat 0): front and middle one seat at a time from 東, gun warning if any, back row mine first then stake seats last.
const res=ctx.G.res,plan=ctx.revealPlan(res,0),maxLen=Math.max(...[-1,0,1,2,3].map(s=>ctx.revealPlan(res,s).len)),tBack=plan.steps.find(x=>x.row===2).t,tCmp2=plan.steps.find(x=>x.k==='cmp'&&x.row===2).t,t0=ctx.G.c13RevealAt,rowsOf=s=>el('c13-rv-rows'+s).innerHTML.split('<div class="c13-rv-row ').slice(1),upCount=()=>[0,1,2,3].map(s=>rowsOf(s).map(r=>r.startsWith('c13-rv-up')?1:0));
assert.equal(t0,now);for(const row of [0,1]){const f=plan.steps.filter(x=>x.row===row&&x.k==='flip'),c=plan.steps.find(x=>x.row===row&&x.k==='cmp');assert.equal(f.map(x=>x.s).join(),'0,1,2,3','row '+row+' opens one seat at a time from 東');assert(f.every(x=>x.t<c.t))}
assert(plan.steps.filter(x=>x.k==='big').every(x=>plan.steps.some(y=>(y.k==='flip'||y.k==='slow')&&y.s===x.s&&y.row===x.row&&y.t<x.t)),'a big hand beat follows its flip');
{const back=plan.steps.filter(x=>x.row===2&&(x.k==='flip'||x.k==='sus'));assert.equal(back[0].s,0,'my back row opens first');assert.equal(back.map(x=>x.s).sort().join(),'0,1,2,3');
 const stakes=[1,2,3].filter(o=>{const d=res.duels.find(x=>x.a===0&&x.b===o).d;return d[0]+d[1]===2||d[0]+d[1]===-2});
 assert.equal(plan.steps.some(x=>x.k==='warn'),stakes.length>0,'gun warning only when someone is 2-0');assert.equal(back.slice(back.length-stakes.length).map(x=>x.k).join(),stakes.map(()=>'sus').join(),'stake seats open last')}
assert.equal(ctx.G.c13NextAt,t0+maxLen+15000,'next-hand countdown starts when the longest reveal ends');
assert(el('c13-results').hidden&&!el('c13-rv').hidden,'reveal plays on the table before the result panel');
assert.deepEqual(upCount(),[[1,0,0],[0,0,0],[0,0,0],[0,0,0]],'東 opens the front row alone');assert(!el('c13-rv-rows0').innerHTML.includes('c13-rv-mark'));
assert(el('c13-rv').innerHTML.includes('$'+(ctx.G.bk.me-res.d[0])),'balance stays at the pre-hand value during the reveal');
const tCmp0=plan.steps.find(x=>x.k==='cmp'&&x.row===0).t;now=t0+tCmp0+1;ctx.frameC13();assert.deepEqual(upCount(),[[1,0,0],[1,0,0],[1,0,0],[1,0,0]]);assert([0,1,2,3].every(s=>(el('c13-rv-rows'+s).innerHTML.match(/c13-rv-mark/g)||[]).length===1),'front row compared before the middle row opens');
now=t0+tBack+1;ctx.frameC13();assert.deepEqual(upCount(),[[1,1,1],[1,1,0],[1,1,0],[1,1,0]],'my back row opens first');
now=t0+tCmp2+1;ctx.frameC13();assert.deepEqual(upCount(),[[1,1,1],[1,1,1],[1,1,1],[1,1,1]]);assert([0,1,2,3].every(s=>(el('c13-rv-rows'+s).innerHTML.match(/c13-rv-mark/g)||[]).length===3));
now=t0+plan.len-1;ctx.frameC13();assert(el('c13-results').hidden,'table waits for the last beat');
ctx.myAuto=true;ctx.GAMES.c13.hostTick();assert.equal(ctx.G.ph,'end');now=t0+maxLen+14999;ctx.GAMES.c13.hostTick();assert.equal(ctx.G.ph,'end','auto-next waits reveal + 15 s');ctx.myAuto=false;
now=t0+plan.len;ctx.frameC13();assert(!el('c13-results').hidden&&el('c13-rv').hidden);assert(el('c13-results').innerHTML.includes('data-c13-next'));assert(el('c13-results').innerHTML.includes('$'+ctx.G.bk.me),'table shows the new balance');
now=t0+100;ctx.frameC13();assert(!el('c13-results').hidden,'a finished reveal never restarts');
// Shots and home run: timeline from a fixed result.
const fake={duels:[{a:0,b:1,shot:0,multiplier:4},{a:0,b:2,shot:0,multiplier:4},{a:0,b:3,shot:0,multiplier:4},{a:1,b:2,shot:2,multiplier:2},{a:1,b:3,shot:-1,multiplier:1},{a:2,b:3,shot:-1,multiplier:1}],homeruns:[true,false,false,false]},fp=ctx.revealPlan(fake),tail=fp.steps.filter(x=>x.k==='shot'||x.k==='hr');
assert.deepEqual(JSON.parse(JSON.stringify(tail.map(x=>[x.k,x.s,x.to??-1]))),[['shot',2,1],['hr',0,-1]]);assert.equal(tail[1].t-tail[0].t,800);assert.equal(fp.len,tail[1].t+1500+300);
// Tap anywhere skips (this screen only: no action, no state change).
const play=async()=>{ctx.GAMES.c13.nextHand();ctx.renderC13();const rows=engine.arrange(ctx.G.c13Hands[0]);ctx.GAMES.c13.act(0,{t:'set',gid:ctx.G.gid,hand:ctx.G.hand,rows});now+=1000;ctx.GAMES.c13.hostTick();ctx.renderC13()};
await play();assert.equal(ctx.G.ph,'end');assert(el('c13-results').hidden&&!el('c13-rv').hidden);const v=ctx.G.v;
// Tap: on to the next part (middle row, back row, shots if any, then the table).
{const tap=()=>ctx.onClick({target:{closest:()=>null}}),row=()=>vm.runInContext('ui',ctx).rvPlan.steps[vm.runInContext('ui',ctx).rvStep];
 await tap();assert(!el('c13-rv').hidden);assert.equal(row().row,1,'first tap: middle row');await tap();if(row().k==='warn')await tap();assert.equal(row().row,2,'next tap: back row (after the gun warning, if any)');
 for(let i=0;i<10&&el('c13-results').hidden;i++)await tap()}
assert(!el('c13-results').hidden&&el('c13-rv').hidden,'taps end at the table');assert.equal(ctx.G.v,v);assert.equal(ctx.G.ph,'end');
// Fast simulation / AUTO: no reveal, and the countdown is the plain 15 s.
ctx.SPEED=100;await play();assert(!el('c13-results').hidden&&el('c13-rv').hidden,'SPEED>50 goes straight to the table');assert.equal(ctx.G.c13NextAt,ctx.G.c13RevealAt+15000);ctx.SPEED=1;
ctx.AUTO=true;await play();assert(!el('c13-results').hidden&&el('c13-rv').hidden,'AUTO goes straight to the table');assert.equal(ctx.G.c13NextAt,ctx.G.c13RevealAt+15000);ctx.AUTO=false;
// Reduced motion is local: the host timer keeps the full length, this screen shows the table at once.
ctx.matchMedia=()=>({matches:true});ctx.G.hand=0;await play();assert(!el('c13-results').hidden&&el('c13-rv').hidden,'reduced motion goes straight to the table');assert(ctx.G.c13NextAt>ctx.G.c13RevealAt+15000);delete ctx.matchMedia;
// Time is up: what is on screen goes in as it is, 倒水 included.
{ctx.GAMES.c13.nextHand();ctx.renderC13();const u=U(),good=engine.arrange(ctx.G.c13Hands[0]),foul=[good[0],good[2],good[1]];
 if(!engine.validLayout(foul)){u.rows=foul.map(r=>r.slice());now=ctx.G.c13Deadline-401;ctx.frameC13();assert(!ctx.G.c13Ready[0]);now=ctx.G.c13Deadline-399;ctx.frameC13();assert(ctx.G.c13Ready[0],'sent at the deadline');assert.deepEqual(JSON.parse(JSON.stringify(ctx.G.c13Rows[0])),foul);}}
// Time is up with cards still in hand: they fill the empty slots as they are (big cards to the back) and go in.
{now+=1000;ctx.GAMES.c13.hostTick();ctx.GAMES.c13.nextHand();ctx.renderC13();const u=U(),h=ctx.G.c13Hands[0].slice().sort((a,b)=>a-b);u.rows=[[h[0]],[],[]];now=ctx.G.c13Deadline-399;ctx.frameC13();assert(ctx.G.c13Ready[0],'sent at the deadline');const r=ctx.G.c13Rows[0];
 assert.deepEqual([r[0].length,r[1].length,r[2].length],[3,5,5]);assert(r[0].includes(h[0]));assert.deepEqual(J(r[2]).sort((a,b)=>b-a),h.slice(1).sort((a,b)=>b-a).slice(0,5))}
assert(!('c13Ui' in ctx.G),'draft is not in game state');
assert(!el('c13-players').innerHTML.includes('$'),'scores use fmt');
assert(!el('c13-results').innerHTML.match(/<strong[^>]*>[^<]*\$/),'result scores must not use money');
ctx.G.st='over';ctx.renderC13();const standings=el('c13-results').innerHTML;
assert(standings.includes('名次')&&standings.includes('本場表現'));
assert(!standings.includes('c13-reveal')&&!standings.includes('c13-result-cards'),'match totals have no partial card animation');
assert.equal((standings.match(/data-c13-profile=/g)||[]).length,4);
console.log('PASS: formal editor 13-card render, multi-select, placement, clear, worker fallback suggestion, host submit and result rendering');
console.log('PASS: reveal order (rows front→middle→back, East first), compare beats, shot/home-run timeline, tap-to-skip, fast/AUTO/reduced-motion straight to table, countdown after reveal, pre-hand balance');
