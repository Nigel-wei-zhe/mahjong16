import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import * as engine from './engine.mjs';import {MEASURED} from './stats.mjs';
let now=100000,settlements=0;const traits=Array.from({length:8},()=>({agg:1,risk:1,pat:1,whim:0}));
const ctx={...engine,scoreRound:engine.settle,privateView:engine.redact,cardFace:()=>'',MEASURED,TRAIT:traits,GAMES:{c13:{}},GAME_AI:{},Math,Set,Map,Number,Array,Error,JSON,URL,console,Date:{now:()=>now},R:null,myAuto:false,AUTO:false,SPEED:1,G:{st:'play',game:'c13',gid:'test',v:0,seats:['me','','',''],chs:[0,1,2,3],score:[0,0,0,0],bk:{me:10000},cfg:{b:100,r:4,s:60}},document:{createElement:()=>({}),head:{appendChild(){}}},root:{},cfg:()=>ctx.G.cfg,chr:s=>ctx.G.chs[s],isBot:s=>s!==0||ctx.AUTO,mySeat:()=>0,meId:()=>'me',bump:()=>ctx.G.v++,seg:()=>'',setTimeout(){},assignSeats(){},allReady:()=>false,settle(d){settlements++;d.forEach((v,s)=>ctx.G.score[s]+=v);ctx.G.bk.me+=d[0]},flashMsg(){}};
vm.createContext(ctx);let source=fs.readFileSync(new URL('./game.mjs',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replaceAll('import.meta.url',"'http://test/games/c13/game.mjs'");vm.runInContext(source,ctx);const game=ctx.GAMES.c13;
game.newGame();assert.equal(ctx.G.ph,'arrange');assert.equal(new Set(ctx.G.c13Hands.flat()).size,52);assert.equal(ctx.G.c13Deadline-now,60000);
ctx.resetEditor();const draft=vm.runInContext('ui',ctx);draft.selected=[ctx.G.c13Hands[0][0]];
assert(!('c13Ui' in ctx.G),'editor must never enter host state');
ctx.G=JSON.parse(JSON.stringify(ctx.G));ctx.resetEditor();assert.equal(vm.runInContext('ui',ctx),draft,'incoming state must preserve module-local draft');
assert.equal(vm.runInContext('ui.selected.length',ctx),1);assert(!('c13Ui' in game.redact(ctx.G,0)));
const rows=engine.arrange(ctx.G.c13Hands[0]);
game.act(-1,{t:'set',gid:'test',hand:0,rows});assert.equal(ctx.G.c13Ready[0],false);
game.act(0,{t:'set',gid:'old',hand:0,rows});assert.equal(ctx.G.c13Ready[0],false);
game.act(0,{t:'set',gid:'test',hand:1,rows});assert.equal(ctx.G.c13Ready[0],false);
game.act(0,{t:'set',gid:'test',hand:0,rows:engine.arrange(ctx.G.c13Hands[1])});assert.equal(ctx.G.c13Ready[0],false);
game.act(0,{t:'set',gid:'test',hand:0,rows});assert.equal(ctx.G.c13Ready[0],true);game.act(0,{t:'set',gid:'test',hand:0,rows});assert.equal(settlements,0);
const secret={a:{t:'set',rows},nm:'guest',bal:10000};assert(!game.redactPresence(secret,'a','b').a);assert.equal(game.redactPresence(secret,'a','a'),secret);assert.equal(secret.a.rows,rows);
now+=1000;game.hostTick();assert.equal(ctx.G.ph,'end');assert.equal(settlements,1);assert.equal(ctx.G.score.reduce((a,b)=>a+b),0);assert.equal(ctx.G.bk.me,10000+ctx.G.score[0]);game.hostTick();assert.equal(settlements,1);
// Readiness goes through the shell; the game's nextHand performs match progression only once.
game.nextHand();assert.equal(ctx.G.hand,1);const old=ctx.G.c13Hands[0].slice();game.nextHand();assert.equal(ctx.G.hand,1);assert.deepEqual(ctx.G.c13Hands[0],old);
// Deadline (2026-11-21): a foul layout is refused while the clock runs and taken as it is once time is up;
// the host only arranges for a human seat that never answered, after a short grace.
{const good=engine.arrange(ctx.G.c13Hands[0]),foul=[good[0],good[2],good[1]];
 if(!engine.validLayout(foul)){game.act(0,{t:'set',gid:'test',hand:1,rows:foul});assert.equal(ctx.G.c13Ready[0],false,'foul refused before the deadline');
  ctx.G.c13Deadline=now;game.act(0,{t:'set',gid:'test',hand:1,rows:foul});assert.equal(ctx.G.c13Ready[0],true,'foul taken at the deadline');game.hostTick();assert.equal(ctx.G.ph,'end');assert(ctx.G.res.d[0]<0,'a foul hand loses to everyone');assert.equal(ctx.G.res.d.reduce((a,b)=>a+b),0)}
 else{ctx.G.c13Deadline=now-1501;game.hostTick()}}
assert.equal(ctx.G.ph,'end');assert.equal(settlements,2);
game.nextHand();ctx.G.c13Deadline=now-1;game.hostTick();assert.equal(ctx.G.ph,'arrange','grace before the host arranges for a silent human');ctx.G.c13Deadline=now-1501;game.hostTick();assert.equal(ctx.G.ph,'end','timeout auto-submits a silent human');
game.nextHand();ctx.G.c13Deadline=now-1501;game.hostTick();
game.nextHand();assert.equal(ctx.G.st,'over');assert.equal(settlements,4);assert.equal(ctx.G.bk.me,10000+ctx.G.score[0]);
console.log('PASS: host ownership/stale-action rejection, private presence, 60-second clock, timeout, once-only settlement, ledger and four-hand match');
