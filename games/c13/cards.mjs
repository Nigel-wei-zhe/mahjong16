import {RANKS as ranks,SUITS as suits} from './engine.mjs';
const assets=new Map();
// Phone-first faces: a large index at the top left, because cards overlap and only the left strip shows.
// cardFace(id) = hand size; cardFace(id,1) = mini (cards under ~40px wide: only rank over suit);
// cardFace(id,2) = hand size without the court picture (for rows that overlap, where half a face would show).
export function cardFace(id,mini){const key=id*3+(+mini||0);if(assets.has(key))return assets.get(key);
 const rank=ranks[id>>2],suit=suits[id%4],color=id%4===1||id%4===2?'#c2183f':'#17172a',court=['J','Q','K'].includes(rank),ten=rank==='10';
 // U+FE0E keeps the suit a text glyph (iOS would otherwise swap in the emoji).
 const s=suit+'︎';let body;
 if(mini===1)body=`<text x="38" y="66" text-anchor="middle" font-size="70" font-weight="bold" ${ten?'textLength="60" lengthAdjust="spacingAndGlyphs"':''}>${rank}</text><text x="38" y="130" text-anchor="middle" font-size="68">${s}</text>`;
 else{
  const bust=`<path d="M28 67L35 46 65 46 72 67Z" fill="${color}"/><path d="M37 45L35 29 43 34 50 24 57 34 65 29 63 45Z" fill="#b5904d"/><path d="M42 46L42 55Q50 66 58 55L58 46" fill="#e7ccb1"/><path d="M32 66L66 48M34 50L68 66" stroke="#b5904d" stroke-width="3"/><path d="M45 50h2m6 0h2" stroke="#292535" stroke-width="2"/>`;
  const art=court&&mini!==2?`<g transform="translate(23 65) scale(.95)"><rect x="25" y="20" width="50" height="50" rx="3" fill="#ece8e3" stroke="${color}" stroke-width=".7"/>${bust}</g>`:`<text x="66" y="${rank==='A'?132:130}" text-anchor="middle" font-size="${rank==='A'?74:62}">${s}</text>`;
  body=`<text x="6" y="41" font-size="46" font-weight="bold" ${ten?'textLength="38" lengthAdjust="spacingAndGlyphs"':''}>${rank}</text><text x="${ten?25:rank==='J'?16:20}" y="78" text-anchor="middle" font-size="38">${s}</text>${art}`;
 }
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="284" viewBox="0 0 100 142"><rect x=".6" y=".6" width="98.8" height="140.8" rx="7" fill="#f4eee3" stroke="#b9aebd" stroke-width="1.2"/><g fill="${color}" font-family="Georgia,serif">${body}</g></svg>`;
 const url='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);assets.set(key,url);return url}
