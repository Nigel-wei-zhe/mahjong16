/* 麻將的 3D 牌桌（three.js）：2026-11-20 從 index.html 的 inline module 搬出來，由 loadGame('mahjong') 在進店／開桌時才載入（要先載 tiles.js，牌面貼圖從它的 CSS 讀） */
import * as THREE from 'three';
import {RoundedBoxGeometry} from '../../lib/RoundedBoxGeometry.js';
/* ---------- 3D table (three.js): rebuilt from the snapshot renderTable() hands to T3.draw(), rendered only when something changes ---------- */
const byId=id=>document.getElementById(id);
const glFail=()=>{byId('glmsg').classList.remove('hide');window.T3={fail:1}};
let renderer=null;
try{renderer=new THREE.WebGLRenderer({canvas:byId('gl'),antialias:true,alpha:true,powerPreference:'high-performance'})}catch(e){renderer=null}

/* tile face art: the SVGs that tiles.js puts into .k0-.k41 */
function faceURL(k){
  for(const sh of document.styleSheets){let rules;try{rules=sh.cssRules}catch(e){continue}
    for(const r of rules)if(r.selectorText==='.k'+k){const m=r.style.backgroundImage.match(/url\("?(.*?)"?\)$/);return m&&m[1]}}
  return null}
const loadImg=src=>new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=src});

async function init(){
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(30,16/9,1,400);
  const FELT=23,RIM=2.2,TW=1,TH=1.333,TT=.78,BACK=.36;

  // table: felt 23 tile-widths square inside a wooden frame
  let lipM=null;const wood=new THREE.MeshStandardMaterial({color:0x17101e,roughness:.3,metalness:.25});
  const rim=new THREE.Mesh(new RoundedBoxGeometry(FELT+RIM*2,1.6,FELT+RIM*2,3,.6),wood);rim.position.y=-.8;rim.receiveShadow=true;scene.add(rim);
  { // felt with a soft centre spotlight baked into its texture
    const c=document.createElement('canvas');c.width=c.height=512;const g=c.getContext('2d');
    const gr=g.createRadialGradient(256,270,40,256,256,380);gr.addColorStop(0,'#2b3062');gr.addColorStop(.6,'#1d2046');gr.addColorStop(1,'#10112a');
    g.fillStyle=gr;g.fillRect(0,0,512,512);
    for(let i=0;i<9000;i++){g.fillStyle=`rgba(255,255,255,${Math.random()*.035})`;g.fillRect(Math.random()*512,Math.random()*512,1,1)}
    {const v=g.createRadialGradient(256,262,150,256,256,372);v.addColorStop(0,'#0000');v.addColorStop(1,'#000a');g.fillStyle=v;g.fillRect(0,0,512,512)}   // corners fall into shadow
    const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=8;
    // felt fibres: a height field of short random strokes turned into a tiling normal map
    const N=256,hc2=document.createElement('canvas');hc2.width=hc2.height=N;const h2=hc2.getContext('2d');h2.fillStyle='#808080';h2.fillRect(0,0,N,N);
    for(let i=0;i<5200;i++){const x=Math.random()*N,y=Math.random()*N,a=Math.random()*Math.PI,l=2+Math.random()*5,b=Math.random()<.5?255:0;
      h2.strokeStyle=`rgba(${b},${b},${b},${.08+Math.random()*.14})`;h2.lineWidth=.6+Math.random()*.8;
      for(const [ox,oy] of [[0,0],[-N,0],[N,0],[0,-N],[0,N]]){h2.beginPath();h2.moveTo(x+ox,y+oy);h2.lineTo(x+ox+Math.cos(a)*l,y+oy+Math.sin(a)*l);h2.stroke()}}
    const hd=h2.getImageData(0,0,N,N).data,nd=h2.createImageData(N,N),H=(x,y)=>hd[(((y+N)%N)*N+((x+N)%N))*4]/255;
    for(let y=0;y<N;y++)for(let x=0;x<N;x++){const dx=(H(x+1,y)-H(x-1,y))*2.2,dy=(H(x,y+1)-H(x,y-1))*2.2,l=Math.hypot(dx,dy,1),o=(y*N+x)*4;
      nd.data[o]=(-dx/l*.5+.5)*255;nd.data[o+1]=(dy/l*.5+.5)*255;nd.data[o+2]=(1/l*.5+.5)*255;nd.data[o+3]=255}
    h2.putImageData(nd,0,0);const ntex=new THREE.CanvasTexture(hc2);ntex.wrapS=ntex.wrapT=THREE.RepeatWrapping;ntex.repeat.set(7,7);ntex.anisotropy=8;
    const felt=new THREE.Mesh(new THREE.PlaneGeometry(FELT,FELT),new THREE.MeshPhysicalMaterial({map:tex,roughness:.93,normalMap:ntex,normalScale:new THREE.Vector2(.55,.55),sheen:.35,sheenRoughness:.5,sheenColor:new THREE.Color(0x9a6ae0),}));
    felt.rotation.x=-Math.PI/2;felt.position.y=.01;felt.receiveShadow=true;scene.add(felt);
    lipM=new THREE.MeshStandardMaterial({color:0xff6fcf,emissive:0xff2fae,emissiveIntensity:3.2,roughness:.4,metalness:0});const lip=new THREE.Mesh(new THREE.BoxGeometry(FELT+.5,.25,FELT+.5),lipM);lip.position.y=-.2;scene.add(lip)}

  // centre compass: round, tiles left, the four winds and scores facing their seats; redrawn when any of it changes
  const cc=document.createElement('canvas');cc.width=cc.height=1024;const cg=cc.getContext('2d');
  const ctex=new THREE.CanvasTexture(cc);ctex.colorSpace=THREE.SRGBColorSpace;ctex.anisotropy=8;
  const cside=new THREE.MeshStandardMaterial({color:0x2a2234,metalness:.5,roughness:.35}),ctop=new THREE.MeshStandardMaterial({map:ctex,roughness:.25,metalness:.05,emissive:0xffffff,emissiveMap:ctex,emissiveIntensity:.7});
  const cbox=new THREE.Mesh(new RoundedBoxGeometry(5.6,.35,5.6,2,.3),[cside,cside,ctop,cside,cside,cside]);
  cbox.position.y=.17;cbox.castShadow=true;cbox.receiveShadow=true;scene.add(cbox);
  const SERIF='"Noto Serif TC","Songti TC","PMingLiU",serif',SANS='system-ui,-apple-system,"PingFang TC","Noto Sans TC",sans-serif';
  let cKey='';
  /* Mahjong Soul style: glossy black plate, double gold rim, a recessed round window, the seat to play lit by a gold bar on its side */
  function drawCompass(v){
    const T=window.__dialT==null?1:window.__dialT;
    const key=[v.round,v.lian,v.left,v.winds,v.scores,v.dealer,v.turn,T,window.__dialFx||''].join('|');if(key===cKey)return;cKey=key;window.__dialV=v;
    const g=cg;g.setTransform(2,0,0,2,0,0);g.clearRect(0,0,512,512);
    const rr=(x,y,w,h,r)=>{g.beginPath();g.roundRect(x,y,w,h,r)};
    const NG='"Zen Maru Gothic",sans-serif',LED='"DotGothic16",monospace',PK='#ff2fae',PKC='#fff6fc',CY='#14c8ff',CYC='#effcff',AMB='#ffc35a';
    const fx=window.__dialFx||'';
    // acrylic plate of an automatic table: smoked black, thin chrome rim
    let q=g.createRadialGradient(256,230,30,256,256,360);q.addColorStop(0,'#1d1830');q.addColorStop(.6,'#0d0b16');q.addColorStop(1,'#050409');
    g.fillStyle=q;rr(8,8,496,496,56);g.fill();
    g.lineWidth=3;g.strokeStyle='#3a3448';rr(11,11,490,490,54);g.stroke();
    g.lineWidth=1;g.strokeStyle='#ffffff10';rr(22,22,468,468,46);g.stroke();
    // faint acrylic reflection
    q=g.createLinearGradient(0,0,512,512);q.addColorStop(0,'#ffffff0c');q.addColorStop(.35,'#ffffff00');g.fillStyle=q;rr(8,8,496,496,56);g.fill();
    const tube=(x0,x1,y,col,on,w=7)=>{g.save();g.lineCap='round';
      if(on){g.shadowColor=col;g.shadowBlur=26;g.strokeStyle=col;g.lineWidth=w+6;g.globalAlpha=.55;g.beginPath();g.moveTo(x0,y);g.lineTo(x1,y);g.stroke();
        g.globalAlpha=1;g.shadowBlur=14;g.strokeStyle='#fff';g.lineWidth=w*.55;g.beginPath();g.moveTo(x0,y);g.lineTo(x1,y);g.stroke()}
      else{g.strokeStyle='#f6e2ee3a';g.lineWidth=w;g.beginPath();g.moveTo(x0,y);g.lineTo(x1,y);g.stroke();g.strokeStyle='#f6e2ee10';g.lineWidth=1;g.stroke()}
      g.restore()};
    [0,-Math.PI/2,Math.PI,Math.PI/2].forEach((a,pos)=>{
      const on=v.turn===pos||fx==='hu',dl=pos===v.dealer;g.save();g.translate(256,256);g.rotate(a);
      const up=(x,y,f)=>{g.save();g.translate(x,y);if(window.UPRIGHT)g.rotate(-a);f();g.restore()};
      // edge tube: unlit glass, the seat to play lit pink; my own turn drains from both ends toward the middle
      const L=190,warn=on&&T<.25&&fx!=='hu',col=fx==='hu'?PK:warn?'#ff4d5e':PK;
      tube(-L,L,226,col,false);
      if(on&&fx!=='end'){const h=L*(v.turn===pos&&fx!=='hu'?T:1);if(h>2)tube(-h,h,226,col,true)}
      // wind letter: neon when it is her turn, dim glass otherwise
      g.textAlign='center';g.textBaseline='middle';g.font=`900 40px ${NG}`;
      up(-168,186,()=>{if(on&&fx!=='end'){g.shadowColor=PK;g.shadowBlur=18;g.fillStyle=PKC;g.fillText(v.winds[pos],0,0);g.shadowBlur=8;g.fillText(v.winds[pos],0,0)}
        else{g.lineWidth=1.4;g.strokeStyle='#f6e2ee66';g.strokeText(v.winds[pos],0,0)}});
      // dealer lamp (red LED) + streak count
      if(dl){up(-128,166,()=>{g.shadowColor='#ff3048';g.shadowBlur=14;g.fillStyle='#ff5a6a';g.beginPath();g.arc(0,0,6,0,7);g.fill();g.shadowBlur=0;
        if(v.lian){g.font=`400 20px ${LED}`;g.fillStyle='#ff8a94';g.textAlign='left';g.fillText('連'+v.lian,10,1)}})}
      // score: amber dot-matrix
      const sc=v.scores[pos],sx=sc>0?'+'+sc:String(sc);g.font=`400 46px ${LED}`;g.fillStyle=sc<0?'#ff8a94':AMB;g.shadowColor=sc<0?'#ff4d5e':'#ff8a00';g.shadowBlur=10;
      if(window.UPRIGHT){const side=pos%2===1,mw=side?88:190,w=g.measureText(sx).width;if(w>mw)g.font=`400 ${Math.floor(46*mw/w)}px ${LED}`;g.textAlign='center';up(10,188,()=>g.fillText(sx,0,0))}
      else{g.textAlign='center';g.fillText(sx,18,190)}g.shadowBlur=0;
      g.restore()});
    // dice dome in the middle: glass bubble with a cyan ring tube
    g.save();g.shadowColor='#000';g.shadowBlur=22;q=g.createRadialGradient(236,222,10,256,256,96);q.addColorStop(0,'#2a2440');q.addColorStop(.7,'#0e0c18');q.addColorStop(1,'#07060c');
    g.fillStyle=q;g.beginPath();g.arc(256,250,104,0,7);g.fill();g.restore();
    g.save();g.shadowColor=CY;g.shadowBlur=18;g.strokeStyle=fx==='end'?'#7fe9ff33':'#7fe9ff';g.lineWidth=3;g.beginPath();g.arc(256,250,104,0,7);g.stroke();g.restore();
    q=g.createLinearGradient(190,170,300,300);q.addColorStop(0,'#ffffff22');q.addColorStop(.4,'#ffffff00');g.fillStyle=q;g.beginPath();g.arc(256,250,90,0,7);g.fill();   // glass highlight
    g.textAlign='center';g.textBaseline='middle';
    const r=String(v.round),r1=r.slice(0,2),r2=r.slice(2);
    const w1=r1,w2=r2.slice(0,1),TY=222;g.font=`900 55px ${NG}`;   // round + dealer and the tiles-left line form one block centred in the dome (r 104, centre y 250)
    const W1=g.measureText(w1).width,W2=g.measureText(w2).width,x0=256-(W1+W2+6)/2;g.textAlign='left';
    const lit=fx!=='end';g.fillStyle=lit?CYC:'#f6e2ee55';g.shadowColor=CY;g.shadowBlur=lit?20:0;g.fillText(w1,x0,TY);if(lit){g.shadowBlur=7;g.fillText(w1,x0,TY)}
    g.fillStyle=lit?PKC:'#f6e2ee55';g.shadowColor=PK;g.shadowBlur=lit?24:0;g.fillText(w2,x0+W1+6,TY);if(lit){g.shadowBlur=8;g.fillText(w2,x0+W1+6,TY)}g.shadowBlur=0;g.textAlign='center';
    // tiles left: LED under the dome, red and blinking-ready when 8 or fewer remain
    const low=v.left<=8,nt=String(v.left).padStart(2,'0'),LY=287;g.textAlign='left';
    g.font=`400 28px ${LED}`;const lw=g.measureText('餘').width;g.font=`400 50px ${LED}`;const nw=g.measureText(nt).width,lx=256-(lw+8+nw)/2;   // label + number centred as one unit
    g.font=`400 28px ${LED}`;g.fillStyle='#cfc6dc';g.fillText('餘',lx,LY+3);
    g.font=`400 50px ${LED}`;g.fillStyle=low?'#ff5a6a':AMB;g.shadowColor=low?'#ff3048':'#ff8a00';g.shadowBlur=12;g.fillText(nt,lx+lw+8,LY);g.shadowBlur=0;g.textAlign='center';
    ctex.needsUpdate=true}
  document.fonts&&document.fonts.load('400 40px "DotGothic16"').then(()=>document.fonts.load('900 40px "Zen Maru Gothic"')).then(()=>{cKey='';if(window.__dialV)drawCompass(window.__dialV)});
  window.__redial=()=>{cKey='';if(window.__dialV)drawCompass(window.__dialV)};

  let ENV=null;scene.add(new THREE.HemisphereLight(0xfff2dc,0x40202a,.75));
  { // reflections: a dark private room, a warm lamp panel overhead and two dim side panels, prefiltered once
    const pm=new THREE.PMREMGenerator(renderer),es=new THREE.Scene();
    es.add(new THREE.Mesh(new THREE.BoxGeometry(80,40,80),new THREE.MeshBasicMaterial({color:0x1a0f12,side:THREE.BackSide})));
    const pan=(c,k,w,h,x,y,z,rx,ry)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color(c).multiplyScalar(k),side:THREE.DoubleSide}));m.position.set(x,y,z);m.rotation.set(rx,ry||0,0);es.add(m)};
    pan(0xffd9a8,6,14,14,0,19,2,Math.PI/2);pan(0xff8fb0,1.2,30,8,-38,8,0,0,Math.PI/2);pan(0x8fb8ff,1,30,8,38,8,0,0,-Math.PI/2);pan(0xffe2c0,1.5,40,6,0,10,-38,0);
    ENV=pm.fromScene(es,.04).texture;pm.dispose();if(lipM){lipM.envMap=ENV;lipM.envMapIntensity=.8;lipM.needsUpdate=true}}
  const lamp=new THREE.SpotLight(0xffc58a,30,70,.5,.8,1);lamp.position.set(0,30,3);lamp.target.position.set(0,0,1.5);scene.add(lamp,lamp.target);   // the warm lamp over the table
  const sun=new THREE.DirectionalLight(0xfff0d8,1.7);sun.position.set(-8,30,14);sun.castShadow=true;
  sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-14,right:14,top:14,bottom:-14,near:5,far:70});sun.shadow.radius=3;sun.shadow.bias=-.0006;scene.add(sun);
  const fill=new THREE.PointLight(0xffc98a,40,40,1.6);fill.position.set(0,9,4);scene.add(fill);

  // tile faces: one 2048 atlas, 8 columns x 6 rows, cell k = tile code k
  const ATL=document.createElement('canvas');ATL.width=ATL.height=2048;const ag=ATL.getContext('2d'),CWD=256,CHT=2048/6;
  await Promise.all([...Array(42).keys()].map(k=>{const u=faceURL(k);return u?loadImg(u).then(img=>{const x=(k%8)*CWD,y=(k/8|0)*CHT;ag.drawImage(img,x+CWD*.02,y+CHT*.016,CWD*.96,CHT*.968)}).catch(()=>{}):0}));
  const atlas=new THREE.CanvasTexture(ATL);atlas.colorSpace=THREE.SRGBColorSpace;atlas.anisotropy=renderer.capabilities.getMaxAnisotropy();

  // tile bodies and faces are three instanced meshes: ivory body, blue back, face plane (its atlas cell per instance)
  const MAX=200;
  const gIvory=new RoundedBoxGeometry(TW,TT-BACK+.06,TH,2,.1),gBlue=new RoundedBoxGeometry(TW,BACK,TH,2,.1),gFace=new THREE.PlaneGeometry(TW*.9,TH*.9).rotateX(-Math.PI/2);
  const aCell=new THREE.InstancedBufferAttribute(new Float32Array(MAX*2),2);aCell.setUsage(THREE.DynamicDrawUsage);gFace.setAttribute('aCell',aCell);
  const GL={clearcoat:.8,clearcoatRoughness:.16,envMap:ENV,envMapIntensity:.45};   // polished tiles: a hard clear layer that catches the lamp
  const mIvory=new THREE.MeshPhysicalMaterial({color:0xffffff,roughness:.38,...GL}),mBlue=new THREE.MeshPhysicalMaterial({color:0x2f8fd0,roughness:.36,...GL});
  const mFace=new THREE.MeshPhysicalMaterial({map:atlas,transparent:true,depthWrite:false,roughness:.38,...GL,polygonOffset:true,polygonOffsetFactor:-2});
  mFace.onBeforeCompile=sh=>{sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute vec2 aCell;')
    .replace('#include <uv_vertex>','#include <uv_vertex>\n\tvMapUv=vMapUv*vec2(.125,1./6.)+aCell;')};
  const iIv=new THREE.InstancedMesh(gIvory,mIvory,MAX),iBl=new THREE.InstancedMesh(gBlue,mBlue,MAX),iFc=new THREE.InstancedMesh(gFace,mFace,MAX);
  const IVORY=new THREE.Color(0xf6f3ea),IVHI=new THREE.Color(0xffe39a),WHITE=new THREE.Color(0xffffff),FCHI=new THREE.Color(0xfff0c4);
  const IVSAME=new THREE.Color(0x6cc2ff),FCSAME=new THREE.Color(0x9ad6ff);let hiK3=-1;   // the kind of tile picked up in my hand: its face-up copies are tinted blue
  for(const m of [iIv,iBl,iFc]){m.frustumCulled=false;m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);m.count=0;scene.add(m)}
  iIv.castShadow=iBl.castShadow=true;iIv.receiveShadow=iBl.receiveShadow=true;
  iIv.setColorAt(0,IVORY);iFc.setColorAt(0,WHITE);

  // last discard: a gold glow on the felt around it (additive), and its body tinted gold
  const gc=document.createElement('canvas');gc.width=160;gc.height=200;{const g=gc.getContext('2d');
    g.shadowColor='#ffc840';g.shadowBlur=22;g.strokeStyle='#ffe08a';g.lineWidth=7;g.beginPath();g.roundRect(34,34,92,132,13);g.stroke();g.stroke();g.shadowBlur=0;g.lineWidth=3;g.strokeStyle='#fff6d0';g.stroke()}
  const gtex=new THREE.CanvasTexture(gc);gtex.colorSpace=THREE.SRGBColorSpace;
  const glow=new THREE.Mesh(new THREE.PlaneGeometry(1.98,2.3).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({map:gtex,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));
  glow.visible=false;glow.renderOrder=2;scene.add(glow);

  /* ---------- placing tiles ---------- */
  const SEATROT=[0,Math.PI/2,Math.PI,-Math.PI/2];   // seat frames: owner at +z; me, right, top, left
  const RX=new THREE.Matrix4().makeRotationX(-Math.PI/2);  // stands a face-down tile up, its blue back toward the table centre
  const _Y=new THREE.Vector3(0,1,0),_M=new THREE.Matrix4(),_T=new THREE.Matrix4(),_X=new THREE.Matrix4(),_A=new THREE.Matrix4(),_v=new THREE.Vector3();
  let nIv=0,nBl=0,nFc=0;
  function put(mesh,i,M,oy){_T.makeTranslation(0,oy,0);_X.multiplyMatrices(M,_T);mesh.setMatrixAt(i,_X)}
  function placeParts(r,M){
    if(r.up){put(iBl,r.bl,M,BACK/2);put(iIv,r.iv,M,BACK+(TT-BACK)/2-.03);if(r.fc>=0)put(iFc,r.fc,M,TT+.002)}
    else{put(iIv,r.iv,M,(TT-BACK)/2+.03);put(iBl,r.bl,M,TT-BACK/2)}}
  // mode: 1 face up, 0 face down, 2 standing; x,z in the seat's frame
  function tileAt(pos,x,z,k,mode,sc){
    if(nIv>=MAX)return null;
    _M.makeRotationY(SEATROT[pos]);_M.multiply(_T.makeTranslation(x,0,z));
    if(mode===2){_M.multiply(_T.makeTranslation(0,TH/2*sc,0));_M.multiply(RX)}
    _M.multiply(_T.makeScale(sc,sc,sc));
    const r={M:_M.clone(),up:mode===1,iv:nIv++,bl:nBl++,fc:mode===1&&k>=0?nFc++:-1};
    const same=r.fc>=0&&k===hiK3;iIv.setColorAt(r.iv,same?IVSAME:IVORY);if(r.fc>=0){iFc.setColorAt(r.fc,same?FCSAME:WHITE);aCell.setXY(r.fc,(k%8)/8,1-((k/8|0)+1)/6)}
    placeParts(r,r.M);return r}

  const DS=1.12,DP=1.02*DS,DR=1.4*DS,MS=1.1,MP=1.12,MG=.35;
  const RANGE=[null,[-9.1,11.15],[-9.1,11.15],[-9.1,11.15]];   // usable stretch of each opponent's edge, in its own x
  // an opponent's edge: concealed tiles standing from the owner's left, melds then flowers face up from the right; shrinks to fit
  function strip(pos,s,hm){
    const [A,B]=RANGE[pos],nh=s.hand,gs=s.melds,fl=s.fl;
    let L=nh+(nh&&(gs.length||fl.length)?.5:0);gs.forEach((g,i)=>L+=g.length*MP+(i?MG:0));if(fl.length)L+=(gs.length?MG:0)+fl.length*MP;
    const sc=Math.min(1,(B-A)/Math.max(1,L)),z=11.38-TH*MS*sc/2;
    SR[pos]={hand:[],melds:[],hx:A+nh*sc/2};
    for(let j=0;j<nh;j++){const r=tileAt(pos,A+(j+.5)*sc,10.75,-1,2,sc);if(r)SR[pos].hand.push(r)}
    let x=B-MS*sc/2,hr=null;   // hr: the marked tile of meld hm (搶槓)
    gs.forEach((g,gi)=>{SR[pos].melds[gi]=[];for(let j=g.length-1;j>=0;j--){const r=tileAt(pos,x,z,g[j],g[j]<0?0:1,MS*sc);if(r)SR[pos].melds[gi].push(r);if(gi===hm&&j===g.length-1)hr=r;x-=MP*sc}x-=MG*sc});
    if(!gs.length)x+=MG*sc;
    for(const k of fl){const r=tileAt(pos,x,z,k,1,MS*sc);if(hm===-2&&!hr)hr=r;x-=MP*sc}return hr}

  let cur=null,lastSig='',animKey='',anim=null,raf=0,calls=0,SR=[],PREV=null,TWS=[],LR=null,from0=null;
  /* tweens: short moves layered over the table as drawn; each picks its tiles again after every redraw (the instances are rebuilt) */
  const _R=new THREE.Matrix4(),_S=new THREE.Vector3(),_E=new THREE.Vector3(),RM=matchMedia('(prefers-reduced-motion: reduce)');
  const seatPt=(pos,x,y,z)=>new THREE.Vector3(x,y,z).applyAxisAngle(_Y,SEATROT[pos]);
  const easeOut=t=>1-Math.pow(1-t,3),back=t=>{const c=1.5;t-=1;return 1+(c+1)*t*t*t+c*t*t};
  function tween(o){o.t0=performance.now();o.recs=o.pick();TWS.push(o);return o}
  /* a discard is thrown from the hand: an arc with a spin, landing flat with a small bounce; the clack sounds as it lands */
  function throwFrom(pos){
    if(pos===0){ // mine: from the tile I just let go of (screen point handed over by the page), else from below my side of the table
      if(from0&&performance.now()-from0.t<1500){_v.set(from0.x/W*2-1,1-from0.y/H*2,.5).unproject(camera).sub(camera.position).normalize();
        const k=(1.4-camera.position.y)/_v.y;if(k>0)return camera.position.clone().addScaledVector(_v,k)}
      return seatPt(0,0,1.4,12.4)}
    return seatPt(pos,SR[pos]?SR[pos].hx:0,1.3,10.3)}
  function throwM(r,t,o){
    const ft=Math.min(1,t/.72),e=1-Math.pow(1-ft,2);_E.setFromMatrixPosition(r.M);
    let x=o.S.x+(_E.x-o.S.x)*e,z=o.S.z+(_E.z-o.S.z)*e,y=o.S.y+(_E.y-o.S.y)*e+Math.sin(ft*Math.PI)*.9;
    if(t>.72){const b=(t-.72)/.28;y=_E.y+Math.sin(b*Math.PI)*.14*(1-b)}
    _R.copy(r.M).setPosition(0,0,0);
    return _A.makeTranslation(x,y,z).multiply(_T.makeRotationY(o.spin*(1-e))).multiply(_T.makeRotationX(-Math.sin(ft*Math.PI)*.45)).multiply(_R)}
  function applyTweens(now){
    let any=false;
    for(let i=TWS.length-1;i>=0;i--){const o=TWS[i],t=(now-o.t0)/o.dur;
      o.recs.forEach((r,j)=>{if(!r)return;const tj=Math.max(0,Math.min(1,t-(o.lag||0)*j));placeParts(r,tj>=1?r.M:o.f(r,tj,o,j))});
      if(o.land&&!o.landed&&t>=.72){o.landed=1;o.land()}
      if(t-(o.lag||0)*Math.max(0,o.recs.length-1)>=1){if(o.land&&!o.landed)o.land();TWS.splice(i,1)}else any=true}
    if(TWS.length||any)for(const m of [iIv,iBl,iFc])m.instanceMatrix.needsUpdate=true;
    return any}
  const clack=()=>{try{window.sfx&&window.sfx('clack')}catch(e){}};
  function draw(v){
    const sig=JSON.stringify(v);if(sig===lastSig)return;lastSig=sig;cur=v;hiK3=v.hi==null?-1:v.hi;
    nIv=nBl=nFc=0;let lastRec=null;SR=[];
    v.seats.forEach((s,pos)=>{
      // river: rows of 6 shifted toward the owner's left (pinwheel); a long river widens its rows instead of growing toward the edge
      const n=s.disc.length,rows=pos===0?3:4,per=Math.max(6,Math.ceil(n/rows)),x0=-2.5*DP-.35-(per-6)*DP;
      s.disc.forEach((k,j)=>{const r=tileAt(pos,x0+(j%per)*DP,3.75+Math.floor(j/per)*DR,k,1,DS);if(v.last&&v.last.pos===pos&&v.last.i===j)lastRec=r});
      if(pos){const r=strip(pos,s,v.last&&v.last.pos===pos?(v.last.fl?-2:v.last.m!=null?v.last.m:-1):-1);if(r)lastRec=r}});
    LR=lastRec;
    // what changed since the last snapshot: an opponent drew (one more standing tile) or called (one more meld)
    const P0=PREV,sumD=a=>a.reduce((n,x)=>n+x.d,0);PREV=v.seats.map(s=>({h:s.hand,m:s.melds.length,d:s.disc.length}));
    const calm=!P0||v.fast||v.intro||RM.matches||sumD(PREV)<sumD(P0);
    if(calm)TWS=TWS.filter(o=>o.k==='thr');
    else for(let pos=1;pos<4;pos++){const s=v.seats[pos],p=P0[pos],q=PREV[pos];if(s.show)continue;
      if(q.m===p.m+1){const S=seatPt(pos,SR[pos].hx,1.1,10.4),gi=q.m-1;   // the called tiles fly from her hand to her meld row
        tween({k:'m'+pos,dur:320,lag:.14,pick:()=>(SR[pos]&&SR[pos].melds[gi]||[]).slice().reverse(),S,
          f:(r,t,o)=>{const e=easeOut(t);_E.setFromMatrixPosition(r.M);_R.copy(r.M).setPosition(0,0,0);
            return _A.makeTranslation(o.S.x+(_E.x-o.S.x)*e,o.S.y+(_E.y-o.S.y)*e+Math.sin(t*Math.PI)*.7,o.S.z+(_E.z-o.S.z)*e).multiply(_R)}})}
      else if(q.h===p.h+1&&q.m===p.m){const off=seatPt(pos,.6,1.1,-1.5);   // a drawn tile slides in from the wall side and settles
        tween({k:'d'+pos,dur:260,pick:()=>(SR[pos]&&SR[pos].hand.slice(-1))||[],f:(r,t)=>{const e=1-back(t);return _A.makeTranslation(off.x*e,Math.max(0,off.y*e),off.z*e).multiply(r.M)}})}}
    for(const o of TWS)o.recs=o.pick();
    if(lastRec){
      iIv.setColorAt(lastRec.iv,IVHI);if(lastRec.fc>=0)iFc.setColorAt(lastRec.fc,FCHI);
      glow.position.setFromMatrixPosition(lastRec.M);glow.position.y=.03;glow.rotation.y=SEATROT[v.last.pos];glow.visible=true;
      if(v.lastKey!==animKey){animKey=v.lastKey;
        if(v.last.i!=null){TWS=TWS.filter(o=>o.k!=='thr');
          if(v.fast||RM.matches){clack();anim=null;glow.material.opacity=1}
          else{glow.material.opacity=0;anim=null;tween({k:'thr',dur:430,pick:()=>LR?[LR]:[],S:throwFrom(v.last.pos),spin:(Math.random()<.5?-1:1)*(1.6+Math.random()*1.4),f:throwM,land:()=>{clack();glow.material.opacity=1}})}}
        else anim={rec:lastRec,t0:performance.now()}}
      else if(anim)anim.rec=lastRec}
    else{glow.visible=false;anim=null}
    iIv.count=nIv;iBl.count=nBl;iFc.count=nFc;
    applyTweens(performance.now());
    for(const m of [iIv,iBl,iFc])m.instanceMatrix.needsUpdate=true;
    iIv.instanceColor.needsUpdate=iFc.instanceColor.needsUpdate=true;aCell.needsUpdate=true;
    drawCompass(v);req()}
  function req(){if(!raf)raf=requestAnimationFrame(frame)}
  /* camera: base pose from fit(); a push toward a winner and shakes on top of it (no idle drift: the user found it pointless) */
  const camP0=new THREE.Vector3(),camT0=new THREE.Vector3(),camT=new THREE.Vector3();
  let shk=null,foc=null,lastR=0;
  function shake(ms,amp){if(RM.matches)return;shk={t0:performance.now(),ms,amp};req()}
  function focus(pos,ms){if(RM.matches||(cur&&cur.fast))return;foc={pos,t0:performance.now(),ms:ms||1900};req()}
  function camera0(now){
    let w=0,fp=null;if(foc){const t=now-foc.t0;w=t<350?easeOut(t/350):t<foc.ms?1:t<foc.ms+700?1-easeOut((t-foc.ms)/700):0;if(t>=foc.ms+700)foc=null;else fp=seatPt(foc.pos,0,0,foc.pos?8.4:7.4)}
    camT.copy(camT0);if(fp)camT.lerp(fp,.3*w);
    camera.position.copy(camP0).sub(camT0).multiplyScalar(1-.1*w).add(camT);
    if(shk){const t=(now-shk.t0)/shk.ms;if(t>=1)shk=null;else{const a=shk.amp*(1-t)*(1-t);camera.position.x+=(Math.random()*2-1)*a;camera.position.y+=(Math.random()*2-1)*a*.6;camera.position.z+=(Math.random()*2-1)*a}}
    camera.lookAt(camT);camera.updateMatrixWorld();
    return !!(shk||foc)}
  function frame(){
    raf=0;const now=performance.now();let busy=false;
    const camBusy=camera0(now);
    busy=applyTweens(now)||busy;
    if(anim){ // a marked meld tile or flower drops into place
      const t=Math.min(1,(now-anim.t0)/250),e=1-Math.pow(1-t,3);
      _A.makeTranslation(0,(1-e)*1.6,0).multiply(anim.rec.M);placeParts(anim.rec,_A);
      for(const m of [iIv,iBl,iFc])m.instanceMatrix.needsUpdate=true;glow.material.opacity=e;
      if(t>=1)anim=null;else busy=true}
    renderer.render(scene,camera);calls=renderer.info.render.calls;lastR=now;needR=false
    if(busy||camBusy)req()}
  let needR=true;
  /* ---------- framing: Mahjong Soul style high camera, everything kept between the screen top and my hand row ---------- */
  let W=1,H=1,HT=1;const lay={};
  const P=(x,y,z)=>{_v.set(x,y,z).project(camera);return{x:(_v.x+1)/2*W,y:(1-_v.y)/2*H}};
  const along=(f,want,a,b)=>{for(let i=0;i<32;i++){const m=(a+b)/2;if(f(m)<want)a=m;else b=m}return (a+b)/2};   // f increasing
  function fit(){
    const el=56*Math.PI/180,top=3,bot=HT-4,tgt=new THREE.Vector3(0,0,1.5);camera.fov=30;camera.aspect=W/H;let d=40;
    for(let it=0;it<80;it++){
      camera.position.set(0,Math.sin(el)*d,tgt.z+Math.cos(el)*d);camera.lookAt(tgt);camera.updateProjectionMatrix();camera.updateMatrixWorld();
      // side hands near 16%/84% of the width; the top player's tiles below the screen top; my third river row above my hand
      const rx=P(10.75,0,0).x,yT=Math.min(P(0,TH,-10.75).y,P(0,.9,-11.4).y),yB=P(0,0,3.75+2*DR+TH*DS/2).y,yC=P(0,0,0).y;
      d*=Math.pow(Math.max((rx-W/2)/(W*.335),(yB-yT)/(bot-top)),.8);
      tgt.z+=Math.min(yT-top,Math.max(yB-bot,yC-H*.45))/H*5}
    camera.updateMatrixWorld();camP0.copy(camera.position);camT0.copy(tgt);
    // windows live in the strips outside the side hands, the top player's at the top right, mine above my hand at the left
    const sw=Math.round(H*.18),sh=sw*1.3;byId('root').style.setProperty('--cw',sw+'px');
    const hl=P(-11.6,0,-3),hr=P(11.6,0,-3),EG=(parseFloat(getComputedStyle(byId('mine')).paddingLeft)||40)+14;   // window edge = screen edge margin + the name plate overhang
    Object.assign(lay,{L:{x:Math.max(EG,Math.min(W*.02,hl.x-sw-4)),y:H*.2},R:{x:Math.min(W-sw-EG,Math.max(W*.98-sw,hr.x+4)),y:H*.2},T:{x:W*.66,y:sw*.3},B:{x:W*.2,y:HT-sh-24}});   // 24: room under my name plate for the wallet line (.wbal) above my hand
    // the top player's window must stay left of the right player's tile row (its far end runs up into the top-right corner); 22px leaves room for the label overhang
    lay.T.x=Math.min(lay.T.x,Math.min(P(10.2,0,-11.4).x,P(10.2,0,-6).x)-sw-22);
    for(const k in lay){const o=lay[k];o.w=sw;o.h=sh;const d=byId('sw'+k);d.style.left=o.x+'px';d.style.top=o.y+'px';d.style.removeProperty('--cw')}
    { // the far seat's window is drawn smaller (it sits farther away) so its bottom and label stay above the right player's river
      const T=lay.T,f=.8,w=Math.round(sw*f),d=byId('swT');T.x+=sw-w;T.w=w;T.h=w*1.3;d.style.setProperty('--cw',w+'px');d.style.left=T.x+'px'}
    // usable stretch of each opponent's edge: on screen, above my hand row, clear of the top-right buttons and the top window
    const zL=h=>z=>P(-10.7,h,z).y,zR=h=>z=>P(10.7,h,z).y;
    RANGE[3]=[Math.max(-9.1,along(zL(TH),4,-12,12)),Math.min(11.15,along(zL(0),bot,-12,12))];
    RANGE[1]=[Math.max(-9.1,-along(zR(0),bot,-12,12)),Math.min(11.15,-along(zR(.9),54,-12,12))];
    // my window keeps clear of the left player's melds at the near end of that edge
    lay.B.x=Math.max(W*.2,P(-9.8,0,RANGE[3][1]).x+8);byId('swB').style.left=lay.B.x+'px';
    const xT=x=>P(x,0,-10.75).x,T=lay.T,stripBot=P(0,0,-9.9).y;
    RANGE[2]=[Math.max(-9.1,T.y-T.h*.45<stripBot?-along(xT,T.x-4,-12,12):-99),Math.min(11.15,-along(xT,4,-12,12))]}

  function resize(w,h,ht){
    W=w;H=h;HT=ht;renderer.setPixelRatio(Math.min((devicePixelRatio||1)*(window.UIZ||1),2))   /* 2026-11-19: was 3; a 3x phone drew 2.25x the pixels for no visible gain */;renderer.setSize(W,H,false);fit();
    needR=true;if(cur){lastSig='';draw(cur)}else req()}

  const ptSeat=(pos,x,z)=>{_v.set(x,0,z).applyAxisAngle(_Y,SEATROT[pos]).project(camera);return{x:(_v.x+1)/2*W,y:(1-_v.y)/2*H}};
  const ptLast=()=>{if(!glow.visible)return null;_v.copy(glow.position).project(camera);return{x:(_v.x+1)/2*W,y:(1-_v.y)/2*H}};
  const hi=k=>{if(cur&&(cur.hi==null?-1:cur.hi)!==k){lastSig='';draw(Object.assign({},cur,{hi:k}))}};
  const throwPt=(x,y)=>{from0={x,y,t:performance.now()}};
  const ptAt=(x,y,z)=>{_v.set(x,y,z).project(camera);return{x:(_v.x+1)/2*W,y:(1-_v.y)/2*H}};
  const redial=()=>{cKey='';if(window.__dialV){drawCompass(window.__dialV);req()}};
  const api={draw,resize,lay,hi,calls:()=>calls,renderer,scene,camera,shake,focus,throwPt,ptSeat,ptLast,ptAt,redial};
  try{const w=renderer.compileAsync?renderer.compileAsync(scene,camera):Promise.resolve(renderer.compile(scene,camera));w.catch(()=>{})}catch(e){}   // compile every material up front (in the menu), not on the first frame of the intro
  window.T3=api;if(window.onT3)window.onT3()}
if(!renderer)glFail();else init().catch(e=>{console.warn('3D table',e);glFail()});
