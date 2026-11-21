/* offline cache (2026-11-21). tools/swstamp.py (run by deploy-pages.sh) stamps V and FILES at deploy time.
   one cache per version, swapped as a whole (no mixing new index.html with old art); the page asks before switching.
   same-origin GET = cache first; Google Fonts = stale-while-revalidate; everything else (TURN api, PeerJS) untouched. */
const V='2026.1121.1127',FILES=["avatars.js", "tiles.js", "voices.js", "manifest.webmanifest", "lib/three.module.min.js", "lib/RoundedBoxGeometry.js", "lib/peerjs.min.js", "img/gf_boom.webp", "img/gf_ham.webp", "img/gf_kiss.webp", "img/gf_rkt.webp", "img/gf_spk.webp", "img/icon-180.png", "img/icon-192.png", "img/icon-512.png", "img/plate.webp", "img/road_enter.webp", "img/road_room.webp", "img/road_solo.webp", "img/room.webp", "img/serin.webp", "games/c13/arranger.mjs", "games/c13/cards.mjs", "games/c13/engine.mjs", "games/c13/game.mjs", "games/c13/stats.mjs", "games/c13/style.css", "games/mahjong/table3d.js"],C='mj-'+V,FONT='mj-font';
const SCOPE=new URL('./',self.location).pathname;
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(['./',...FILES].map(u=>new Request(u,{cache:'no-cache'})))))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('mj-')&&k!==C&&k!==FONT).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('message',e=>{if(e.data==='skip')self.skipWaiting()});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);
  if(u.origin===self.location.origin){
    if(u.pathname===SCOPE+'sw.js')return;
    const page=r.mode==='navigate'&&(u.pathname===SCOPE||u.pathname===SCOPE+'index.html');
    e.respondWith(caches.open(C).then(c=>c.match(page?'./':r,{ignoreSearch:true})).then(h=>h||fetch(r)));return}
  if(u.hostname==='fonts.googleapis.com'||u.hostname==='fonts.gstatic.com')
    e.respondWith(caches.open(FONT).then(c=>c.match(r).then(h=>{const n=fetch(r).then(x=>{if(x.ok||x.type==='opaque')c.put(r,x.clone());return x}).catch(()=>h||Response.error());return h||n})))});
