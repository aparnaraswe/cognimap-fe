/**
 * TOKEN RENDERERS — CogniMap IRT-CAT Visual Engine v4.2 (patched)
 *
 * CHANGES vs v4.1 — surgical, not architectural:
 *   1. ImgBox stripped of chrome (no bg, no border, no padding).
 *      Chrome now belongs to QuestionShell's StimulusSlot / OptionSlot.
 *      Fixes the "white box around SVGs" problem.
 *
 *   2. ExcelImgToken always fills parent (width/height 100%).
 *      Removed the branch that preserved original SVG px dimensions,
 *      since the slot above now dictates size uniformly.
 *      preserveAspectRatio="xMidYMid meet" handles aspect ratios.
 *
 * NOT CHANGED (deliberately):
 *   - SIZE_MULT — sizes (sm/md/lg/xl) are question content, not presentation.
 *     A "small circle vs large circle" item depends on this.
 *   - Token parser logic
 *   - Shape dispatch
 *   - Compositional tokens (pos_, ratio:, img_, ...)
 *   - Sprite / custom-shape / SVG resolution order
 *   - QuizTokenQuestion — left for backwards compat; new code should
 *     use QuestionShell + ItemBankQuestion instead.
 *
 * CONTRACT
 *   The renderer outputs a bare visual that fills 100% of its parent.
 *   It does NOT add padding, borders, or backgrounds.
 *   The parent (a StimulusSlot or OptionSlot) owns all chrome.
 */

import { useState, useEffect } from 'react';
import { GsTokenDispatch, GsSymbolSVG } from './GsTokenRenderer_additions';
import { SpriteToken, loadSpriteManifest, useSpriteManifest, lookupSprite } from './SpriteSheetRenderer';

// ═══ PALETTE ═══
const C = {
  triangle: '#6366F1', circle: '#0891B2', square: '#D97706', star: '#8B5CF6',
  diamond: '#059669', hexagon: '#E11D48', pentagon: '#EA580C', arrow: '#57534E',
  octagon: '#0D9488', cross: '#DC2626', dot: '#0891B2', heart: '#E11D48',
  oval: '#0891B2', rectangle: '#D97706', crescent: '#FBBF24',
  blue: '#6366F1', red: '#DC2626', green: '#059669', yellow: '#F59E0B',
  purple: '#8B5CF6', orange: '#EA580C', cyan: '#0891B2', magenta: '#D946EF',
  darkblue: '#3730A3', lightblue: '#7DD3FC', darkBlue: '#3730A3', lightBlue: '#7DD3FC',
  dark: '#44403C', black: '#1C1917', white: '#FAFAF9',
};
const P = {
  pri: '#0891B2', sec: '#6366F1', acc: '#D97706', ok: '#059669',
  sub: '#A8A29E', bdr: '#D6D3D1', bg: '#FAFAF9', ink: '#1C1917', miss: '#DC2626',
};

const BUILT_IN_SHAPES = [
  'triangle','circle','square','star','diamond','hexagon','pentagon',
  'arrow','octagon','cross','dot','heart','oval','rectangle','crescent',
];

let customShapesCache = null;
let customShapesLoading = false;

async function loadCustomShapes() {
  if (customShapesCache) return customShapesCache;
  if (customShapesLoading) return {};
  customShapesLoading = true;
  try {
    const token = localStorage.getItem('token');
    if (!token) return {};
    const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:3000/api';
    const response = await fetch(`${apiBase}/tokens/svg-shapes`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) return {};
    const data = await response.json();
    const shapesMap = {};
    if (data.shapes) {
      data.shapes.forEach(shape => {
        shapesMap[shape.shape_name] = { svgCode: shape.svg_code, defaultColor: shape.default_color };
        if (!C[shape.shape_name]) C[shape.shape_name] = shape.default_color;
      });
    }
    customShapesCache = shapesMap;
    return shapesMap;
  } catch { return {}; } finally { customShapesLoading = false; }
}

function getAllShapes() {
  const custom = customShapesCache ? Object.keys(customShapesCache) : [];
  return [...BUILT_IN_SHAPES, ...custom];
}

const SHAPES = BUILT_IN_SHAPES;

const POS_MAP = {
  top:[50,20], bottom:[50,80], left:[20,50], right:[80,50], center:[50,50],
  top_left:[22,22], top_right:[78,22], bottom_left:[22,78], bottom_right:[78,78],
  up:[50,20], down:[50,80],
};

const ROT_MAP = {
  up:0, right:90, down:180, left:270, top:0, bottom:180,
  up_right:45, down_left:225, top_left:315, top_right:45,
  bottom_left:225, bottom_right:135,
};

// PRESERVED — sizes are question content. A "small circle vs large circle"
// comparison item depends on this. Do not remove.
const SIZE_MULT = {
  tiny:0.3, small:0.4, medium:0.65, large:1.0, extralarge:1.3,
  extra_large:1.3, extraLarge:1.3,
  xs:0.3, sm:0.4, md:0.65, lg:1.0, xl:1.3,
};
const COUNT_MAP = { one:1, two:2, three:3, four:4, five:5 };

// ═══ UTILITIES ═══
function hashStr(s) { let h=0; for(let i=0;i<s.length;i++){h=((h<<5)-h)+s.charCodeAt(i);h|=0;} return Math.abs(h); }
function seeded(seed) { let s=seed; return ()=>{ s=(s*9301+49297)%233280; return s/233280; }; }

// ═══ MISSING TOKEN TRACKER ═══
const missingTokens = new Map();
export function logMissingToken(token, type='unknown') {
  if (!token) return;
  const key = String(token);
  if (missingTokens.has(key)) { const e=missingTokens.get(key); e.count++; e.lastSeen=new Date(); }
  else missingTokens.set(key, { token:key, type, count:1, firstSeen:new Date(), lastSeen:new Date() });
  console.warn(`[TokenRenderer] Missing token: "${key}" (type: ${type})`);
}
export function getMissingTokens() { return Array.from(missingTokens.values()).sort((a,b)=>b.count-a.count); }
export function clearMissingTokens() { missingTokens.clear(); }

// ═══ SHARED SVG FILTER ═══
const FILTER_ID = 'cogni-shadow';
export function GlobalSvgDefs() {
  return (
    <svg width="0" height="0" style={{ position:'absolute', pointerEvents:'none' }}>
      <defs>
        <filter id={FILTER_ID} x="-10%" y="-10%" width="130%" height="130%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#000" floodOpacity="0.12" />
        </filter>
      </defs>
    </svg>
  );
}

function SvgBox({ children, sz, className='' }) {
  return (
    <svg width={sz} height={sz} viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg" className={className}
      style={{ display:'block' }}>
      {children}
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════
// PATCH #1 — ImgBox stripped of chrome
// ═══════════════════════════════════════════════════════════════════
// Previously added bg, border, padding, and an optional label. That chrome
// now lives in QuestionShell's slots. ImgBox is a transparent passthrough.
// The `label` and `bg` props are accepted for API compat but ignored.
// ═══════════════════════════════════════════════════════════════════
function ImgBox({ children }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%', height: '100%',
    }}>
      {children}
    </div>
  );
}

// ═══ CORE SHAPE DRAWING ═══
function drawShapeSVG(shape, color, rotation=0, hollow=false) {
  const sw = hollow ? 4 : 3;
  const fill = hollow ? 'none' : color;
  const stroke = hollow ? color : 'rgba(255,255,255,0.4)';
  let inner;

  if (customShapesCache && customShapesCache[shape]) {
    const cs = customShapesCache[shape];
    try {
      const svgCode = cs.svgCode
        .replace(/{fill}/g, fill).replace(/{stroke}/g, stroke).replace(/{sw}/g, sw);
      inner = <g dangerouslySetInnerHTML={{ __html: svgCode }} />;
    } catch {
      inner = <circle cx="50" cy="50" r="42" fill={fill} stroke={stroke} strokeWidth={sw} />;
    }
  } else {
    switch (shape) {
      case 'triangle':
        inner = <polygon points="50,12 90,88 10,88" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />;
        break;
      case 'circle': case 'dot':
        inner = <circle cx="50" cy="50" r="42" fill={fill} stroke={stroke} strokeWidth={sw} />;
        break;
      case 'square': case 'rectangle':
        inner = <rect x="10" y="10" width="80" height="80" rx="4" fill={fill} stroke={stroke} strokeWidth={sw} />;
        break;
      case 'diamond':
        inner = <polygon points="50,8 92,50 50,92 8,50" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />;
        break;
      case 'star': {
        const pts=[];
        for(let i=0;i<10;i++){
          const a=-Math.PI/2+Math.PI*i/5;
          const r=i%2===0?42:42*0.4;
          pts.push(`${50+r*Math.cos(a)},${50+r*Math.sin(a)}`);
        }
        inner = <polygon points={pts.join(' ')} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />;
        break;
      }
      case 'hexagon': {
        const pts=[];
        for(let i=0;i<6;i++){
          const a=-Math.PI/6+Math.PI*i/3;
          pts.push(`${50+42*Math.cos(a)},${50+42*Math.sin(a)}`);
        }
        inner = <polygon points={pts.join(' ')} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />;
        break;
      }
      case 'pentagon': {
        const pts=[];
        for(let i=0;i<5;i++){
          const a=-Math.PI/2+2*Math.PI*i/5;
          pts.push(`${50+42*Math.cos(a)},${50+42*Math.sin(a)}`);
        }
        inner = <polygon points={pts.join(' ')} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />;
        break;
      }
      case 'heart':
        inner = <path d="M50,85 C8,50 8,18 50,35 C92,18 92,50 50,85Z" fill={fill} stroke={stroke} strokeWidth={sw} />;
        break;
      case 'arrow':
        inner = <path d="M50,10 L85,50 L65,50 L65,88 L35,88 L35,50 L15,50 Z" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />;
        break;
      case 'octagon': {
        const pts=[];
        for(let i=0;i<8;i++){
          const a=Math.PI*i/4-Math.PI/8;
          pts.push(`${50+44*Math.cos(a)},${50+44*Math.sin(a)}`);
        }
        inner = <polygon points={pts.join(' ')} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />;
        break;
      }
      case 'cross':
        inner = <path d="M35,10 L65,10 L65,35 L90,35 L90,65 L65,65 L65,90 L35,90 L35,65 L10,65 L10,35 L35,35 Z" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />;
        break;
      case 'oval':
        inner = <ellipse cx="50" cy="50" rx="44" ry="32" fill={fill} stroke={stroke} strokeWidth={sw} />;
        break;
      case 'crescent':
        inner = hollow
          ? <circle cx="50" cy="50" r="38" fill="none" stroke={stroke} strokeWidth={sw} />
          : <><circle cx="50" cy="50" r="38" fill={fill} stroke={stroke} strokeWidth={sw} /><circle cx="62" cy="50" r="32" fill="white" /></>;
        break;
      default:
        logMissingToken(shape, 'unknown_shape');
        inner = <circle cx="50" cy="50" r="42" fill={fill} stroke={stroke} strokeWidth={sw} />;
    }
  }

  return (
    <g transform={rotation ? `rotate(${rotation},50,50)` : undefined} filter={`url(#${FILTER_ID})`}>
      {inner}
    </g>
  );
}

// ═══ TOKEN PARSER ═══
function parseToken(token) {
  if (!token) return null;
  let t = token.trim().replace(/^\[/,'').replace(/\]$/,'').trim();
  if (!t) return null;

  let shape='circle', color=null, rotation=0, size=null, count=null, hollow=false;

  const ncm = t.match(/^(\d+)[_]/);
  if (ncm) { count=parseInt(ncm[1],10); t=t.slice(ncm[0].length); }

  if (!count) {
    const cm = t.match(/^(one|two|three|four|five)[_]?/i);
    if (cm) { count=COUNT_MAP[cm[1].toLowerCase()]; t=t.slice(cm[0].length); }
  }

  const allShapesSorted = [...getAllShapes()].sort((a,b)=>b.length-a.length);
  let shapeFirst = false;
  for (const s of allShapesSorted) {
    const lc = t.toLowerCase();
    const matchPlain=lc===s, matchPlural=lc===s+'s';
    const matchUnder=lc.startsWith(s+'_'), matchPluralUnder=lc.startsWith(s+'s_');
    if (matchPlain||matchPlural||matchUnder||matchPluralUnder) {
      shape=s;
      const consumed=(matchPluralUnder||matchPlural)?s+'s':s;
      t=t.slice(consumed.length).replace(/^_/,'');
      shapeFirst=true; break;
    }
  }

  if (shapeFirst) {
    const modifiers=t.toLowerCase().split('_').filter(Boolean);
    for (const mod of modifiers) {
      if (SIZE_MULT[mod]!==undefined) size=mod;
      else if (mod==='hollow') hollow=true;
      else if (mod==='filled') hollow=false;
    }
  } else {
    const sizeRe=/^(extralarge|extra_large|extraLarge|tiny|small|medium|large|xs|sm|md|lg|xl)[_]?/i;
    const sm2=t.match(sizeRe);
    if (sm2) { size=sm2[1].toLowerCase().replace('_',''); t=t.slice(sm2[0].length); }

    const colorNames=Object.keys(C).filter(k=>!SHAPES.includes(k));
    for (const cn of colorNames.sort((a,b)=>b.length-a.length)) {
      if (t.toLowerCase().startsWith(cn.toLowerCase())) {
        const rest=t.slice(cn.length);
        if (rest.length>0&&(rest[0]==='_'||rest[0]===rest[0].toUpperCase())) {
          color=C[cn]||C[cn.toLowerCase()]; t=rest.replace(/^_/,''); break;
        }
      }
    }

    const lc=t.charAt(0).toLowerCase()+t.slice(1);
    const parts=lc.split('_');
    for (const s of SHAPES) {
      if (parts[0]===s||parts[0]===s+'s') { shape=s; break; }
    }

    if (parts.length>1) {
      const last=parts[parts.length-1];
      if (last==='hollow') hollow=true;
      else if (last==='filled') hollow=false;
      const suffix=parts.slice(1).join('_').replace(/_?(hollow|filled)$/,'');
      if (suffix&&ROT_MAP[suffix]!==undefined) rotation=ROT_MAP[suffix];
    }
  }

  if (!color) color=C[shape]||'#78716C';
  return { shape, color, rotation, size, count, hollow };
}

// ═══ MODULE 1: PosToken ═══
export function PosToken({ token, sz=48 }) {
  if (!token) return null;
  const inner = token.startsWith('pos_') ? token.slice(4) : token;
  const p = parseToken(inner);
  if (!p) return <span className="text-xs font-mono" style={{ color:'#78716C' }}>{token}</span>;

  const parts=inner.split('_');
  let posKey='center';
  if (parts.length>=3) {
    const twoWord=parts.slice(-2).join('_');
    if (POS_MAP[twoWord]) posKey=twoWord;
    else if (POS_MAP[parts[parts.length-1]]) posKey=parts[parts.length-1];
  } else if (parts.length>=2&&POS_MAP[parts[parts.length-1]]) {
    posKey=parts[parts.length-1];
  }

  const [px,py]=POS_MAP[posKey]||[50,50];
  const baseShapePct=35;
  const sizeMult=p.size?(SIZE_MULT[p.size]||1.0):1.0;
  const shapePct=baseShapePct*sizeMult;
  const count=p.count||1;
  const gap=shapePct*0.3;

  return (
    <SvgBox sz={sz}>
      <rect x="2" y="2" width="96" height="96" rx="8" fill="white" stroke="#D6D3D1" strokeWidth="2" />
      <circle cx={px} cy={py} r="2" fill="rgba(0,0,0,0.06)" />
      {Array.from({length:count}).map((_,i)=>{
        const offsetX=(i-(count-1)/2)*(shapePct+gap);
        const tx=px+offsetX-shapePct/2;
        const ty=py-shapePct/2;
        return (
          <g key={i} transform={`translate(${tx},${ty}) scale(${shapePct/100})`}>
            {drawShapeSVG(p.shape,p.color,0,p.hollow)}
          </g>
        );
      })}
    </SvgBox>
  );
}

// ═══ MODULE 2: ShapeToken ═══
// SIZE_MULT is preserved — sizes are question content.
export function ShapeToken({ token, sz=48 }) {
  if (!token||token==='?') return (
    <div className="flex items-center justify-center rounded-xl"
      style={{ width:sz+16, height:sz+16, border:'2px dashed #B45309', background:'rgba(180,83,9,0.04)' }}>
      <span style={{ fontSize:sz*0.45, fontWeight:800, color:'#B45309', fontFamily:'system-ui' }}>?</span>
    </div>
  );
  if (token.startsWith('pos_')) return <PosToken token={token} sz={sz} />;

  const p=parseToken(token);
  if (!p) return <span className="text-xs font-mono" style={{ color:'#78716C' }}>{token}</span>;

  const sizeMult=p.size?(SIZE_MULT[p.size]||1.0):1.0;
  const actualSz=Math.round(sz*sizeMult);
  const count=p.count||1;

  if (count>1) {
    const itemSz=Math.max(18,Math.round(actualSz/(count*0.55)));
    return (
      <div className="flex items-center justify-center gap-0.5 flex-wrap" style={{ maxWidth:sz*1.5+20 }}>
        {Array.from({length:count}).map((_,i)=>(
          <SvgBox key={i} sz={itemSz}>{drawShapeSVG(p.shape,p.color,p.rotation,p.hollow)}</SvgBox>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center">
      <SvgBox sz={actualSz}>{drawShapeSVG(p.shape,p.color,p.rotation,p.hollow)}</SvgBox>
    </div>
  );
}

// ═══ MODULE 2b: RatioToken ═══
export function RatioToken({ token, sz=48 }) {
  if (!token||!token.startsWith('ratio:')) return null;
  const parts=token.slice('ratio:'.length).split(':').filter(Boolean);
  const partSz=Math.max(20,Math.round(sz*0.7));
  return (
    <div className="flex items-center gap-1">
      {parts.map((part,i)=>(
        <span key={i} className="flex items-center gap-1">
          {i>0&&<span className="font-bold text-stone-400" style={{ fontSize:Math.max(10,sz*0.22) }}>:</span>}
          <ShapeToken token={part} sz={partSz} />
        </span>
      ))}
    </div>
  );
}

// ═══ MODULE 3: SpriteGrid ═══
function SpriteGrid({ fruit, n, sz }) {
  const count=Math.min(Math.max(n,1),20);
  const cols=Math.min(Math.ceil(Math.sqrt(count)),5);
  const rows=Math.ceil(count/cols);
  const cellW=Math.floor(100/cols), cellH=Math.floor(100/rows);
  const imgSz=Math.min(cellW,cellH)*0.85;
  return (
    <SvgBox sz={sz}>
      {Array.from({length:count}).map((_,i)=>{
        const col=i%cols, row=Math.floor(i/cols);
        const cx=(col+0.5)*cellW, cy=(row+0.5)*cellH;
        return <image key={i} href={`/${fruit}.png`} x={cx-imgSz/2} y={cy-imgSz/2} width={imgSz} height={imgSz} preserveAspectRatio="xMidYMid meet" />;
      })}
    </SvgBox>
  );
}

// ═══ MODULE 4: Seesaw ═══
function Seesaw({ spec, sz }) {
  const lm=spec.match(/left=([^_]+)/);
  const rm=spec.match(/right=([^_\s]+)/);
  const leftStr=lm?lm[1]:'?', rightStr=rm?rm[1]:'?';

  function parseSeesawSide(val) {
    if (val==='?'||!val) return { items:[], unknown:true };
    const addParts=val.split('+');
    const items=[]; let unknown=false;
    for (const part of addParts) {
      if (part==='?'){unknown=true;continue;}
      const m=part.match(/^(\d+)(x|apples?|oranges?|cherries?|strawberries?|grapes?|bananas?|pears?|lemons?|coconuts?|peaches?|watermelons?|pineapples?)?$/i);
      if (m) {
        const num=parseInt(m[1]); let fruit=m[2]||'';
        if (fruit==='x') items.push({num,type:'x'});
        else { fruit=fruit.replace(/ies$/,'y').replace(/s$/,'').toLowerCase(); items.push({num,type:'fruit',fruit:fruit||'apple'}); }
      } else if (part.match(/^\d+$/)) items.push({num:parseInt(part),type:'number'});
    }
    return { items, unknown };
  }

  const left=parseSeesawSide(leftStr), right=parseSeesawSide(rightStr);

  function renderSide(side, cx, cy) {
    if (side.unknown&&side.items.length===0)
      return <text x={cx} y={cy+4} textAnchor="middle" fontSize="16" fontWeight="800" fill="#B45309" fontFamily="system-ui">?</text>;
    const els=[]; let xOff=cx-(side.items.length>1?12:0);
    for (let gi=0;gi<side.items.length;gi++) {
      const group=side.items[gi];
      if (group.type==='x') { els.push(<text key={gi} x={xOff} y={cy+5} textAnchor="middle" fontSize="12" fontWeight="700" fill={P.ink} fontFamily="system-ui">{group.num}x</text>); xOff+=22; }
      else if (group.type==='fruit') {
        const n=Math.min(group.num,8), perRow=Math.min(n,3), rows=Math.ceil(n/perRow), iSz=Math.min(10,28/perRow);
        for (let j=0;j<n;j++) {
          const c=j%perRow, r=Math.floor(j/perRow);
          const ix=xOff-(perRow-1)*iSz*0.55+c*iSz*1.1, iy=cy-rows*iSz*0.4+r*iSz*1.05;
          els.push(<image key={`${gi}-${j}`} href={`/${group.fruit}.png`} x={ix-iSz/2} y={iy-iSz/2} width={iSz} height={iSz} preserveAspectRatio="xMidYMid meet" />);
        }
        els.push(<text key={`lbl${gi}`} x={xOff} y={cy+rows*7+8} textAnchor="middle" fontSize="7" fontWeight="600" fill="#78716C" fontFamily="system-ui">{group.num}</text>);
        xOff+=28;
      } else { els.push(<text key={gi} x={xOff} y={cy+5} textAnchor="middle" fontSize="12" fontWeight="700" fill={P.ink} fontFamily="system-ui">{group.num}</text>); xOff+=20; }
    }
    if (side.unknown) els.push(<text key="q" x={xOff+4} y={cy+5} textAnchor="middle" fontSize="14" fontWeight="800" fill="#B45309" fontFamily="system-ui">?</text>);
    return els;
  }

  return (
    <SvgBox sz={sz}>
      <line x1="5" y1="92" x2="95" y2="92" stroke="#D6D3D1" strokeWidth="2" />
      <polygon points="50,68 38,88 62,88" fill="#78716C" stroke="#57534E" strokeWidth="1" />
      <rect x="8" y="64" width="84" height="6" rx="3" fill="#A16207" stroke="#854D0E" strokeWidth="1" />
      <rect x="13" y="61" width="24" height="3" rx="1" fill="#92400E" />
      <rect x="63" y="61" width="24" height="3" rx="1" fill="#92400E" />
      {renderSide(left,25,45)}
      {renderSide(right,75,45)}
      <text x="25" y="98" textAnchor="middle" fontSize="6" fontWeight="600" fill="#78716C" fontFamily="system-ui">{leftStr.length>15?leftStr.slice(0,15)+'…':leftStr}</text>
      <text x="75" y="98" textAnchor="middle" fontSize="6" fontWeight="600" fill="#78716C" fontFamily="system-ui">{rightStr.length>15?rightStr.slice(0,15)+'…':rightStr}</text>
    </SvgBox>
  );
}

// ═══ MODULE 5: BarToken ═══
function BarToken({ n, sz }) {
  const maxH=80, maxVal=Math.max(n,10);
  const barH=Math.min(maxH,Math.max(6,(n/maxVal)*maxH));
  return (
    <SvgBox sz={sz}>
      <rect x="5" y="5" width="90" height="90" rx="6" fill="#FAFAF9" stroke="#E7E5E4" strokeWidth="1" />
      <rect x="25" y={90-barH} width="50" height={barH} rx="3" fill={P.acc} opacity="0.85" filter={`url(#${FILTER_ID})`} />
      <text x="50" y={87-barH} textAnchor="middle" fontSize="14" fontWeight="700" fill={P.ink} fontFamily="system-ui">{n}</text>
      <line x1="15" y1="90" x2="85" y2="90" stroke="#D6D3D1" strokeWidth="1.5" />
    </SvgBox>
  );
}

// ═══ MODULE 6: FigurePart ═══
function FigurePart({ token, sz }) {
  const cl=token.slice(4);
  const fill='rgba(8,145,178,0.12)', stk=P.pri, mStk=P.miss, mD='6 4';
  const shapes = {
    circle_missing_quarter: ()=>(
      <>
        <path d="M50,50 L50,8 A42,42 0 1,1 92,50 Z" fill={fill} stroke={stk} strokeWidth="3" />
        <path d="M50,50 L92,50 A42,42 0 0,1 50,8" fill="none" stroke={mStk} strokeWidth="3" strokeDasharray={mD} />
      </>
    ),
    quarter_circle: ()=><path d="M50,50 L92,50 A42,42 0 0,0 50,8 Z" fill={P.pri} fillOpacity="0.35" stroke={stk} strokeWidth="3" />,
    circle_quarter: ()=><path d="M50,50 L92,50 A42,42 0 0,0 50,8 Z" fill={P.pri} fillOpacity="0.35" stroke={stk} strokeWidth="3" />,
    half_circle: ()=><path d="M8,50 A42,42 0 0,1 92,50 Z" fill={P.pri} fillOpacity="0.35" stroke={stk} strokeWidth="3" />,
    square_missing_corner: ()=>(
      <>
        <path d="M8,8 L92,8 L92,62 L62,92 L8,92 Z" fill={fill} stroke={stk} strokeWidth="3" strokeLinejoin="round" />
        <path d="M92,62 L92,92 L62,92" fill="none" stroke={mStk} strokeWidth="3" strokeDasharray={mD} />
      </>
    ),
    square_corner: ()=><polygon points="92,62 92,92 62,92" fill={P.pri} fillOpacity="0.35" stroke={stk} strokeWidth="3" strokeLinejoin="round" />,
    square_half: ()=><rect x="8" y="8" width="42" height="84" rx="3" fill={P.pri} fillOpacity="0.35" stroke={stk} strokeWidth="3" />,
    diamond_missing_half: ()=>(
      <>
        <path d="M50,8 L92,50 L50,92 Z" fill={fill} stroke={stk} strokeWidth="3" strokeLinejoin="round" />
        <path d="M50,8 L8,50 L50,92" fill="none" stroke={mStk} strokeWidth="3" strokeDasharray={mD} strokeLinejoin="round" />
      </>
    ),
    diamond_half: ()=><path d="M50,8 L8,50 L50,92 Z" fill={P.pri} fillOpacity="0.35" stroke={stk} strokeWidth="3" strokeLinejoin="round" />,
    triangle_half: ()=><polygon points="50,8 8,92 50,92" fill={P.pri} fillOpacity="0.35" stroke={stk} strokeWidth="3" strokeLinejoin="round" />,
    triangle_piece: ()=><polygon points="8,92 50,92 8,50" fill={P.pri} fillOpacity="0.35" stroke={stk} strokeWidth="3" strokeLinejoin="round" />,
    triangle_corner: ()=><polygon points="8,92 50,92 8,50" fill={P.pri} fillOpacity="0.35" stroke={stk} strokeWidth="3" strokeLinejoin="round" />,
    triangle_side: ()=><line x1="10" y1="50" x2="90" y2="50" stroke={P.pri} strokeWidth="4" strokeLinecap="round" />,
    hexagon_side: ()=><line x1="10" y1="50" x2="90" y2="50" stroke={P.pri} strokeWidth="4" strokeLinecap="round" />,
    rectangle_side: ()=><line x1="10" y1="50" x2="90" y2="50" stroke={P.pri} strokeWidth="4" strokeLinecap="round" />,
    hexagon_missing_side: ()=>{
      const pts=[];
      for(let i=0;i<6;i++){const a=-Math.PI/6+Math.PI*i/3; pts.push([50+42*Math.cos(a),50+42*Math.sin(a)]);}
      return (
        <>
          <path d={pts.slice(0,5).map((pt,i)=>(i===0?'M':'L')+pt[0]+','+pt[1]).join(' ')} fill={fill} stroke={stk} strokeWidth="3" strokeLinejoin="round" />
          <line x1={pts[4][0]} y1={pts[4][1]} x2={pts[5][0]} y2={pts[5][1]} stroke={mStk} strokeWidth="3" strokeDasharray={mD} />
          <line x1={pts[5][0]} y1={pts[5][1]} x2={pts[0][0]} y2={pts[0][1]} stroke={mStk} strokeWidth="3" strokeDasharray={mD} />
        </>
      );
    },
    star_missing_point: ()=>{
      const pts=[]; const or_=38, ir_=or_*0.4;
      for(let i=0;i<10;i++){const a=-Math.PI/2+Math.PI*i/5;const r=i%2===0?or_:ir_;pts.push([50+r*Math.cos(a),50+r*Math.sin(a)]);}
      return (
        <>
          <path d={`M${pts[9][0]},${pts[9][1]} L${pts[1][0]},${pts[1][1]} ${pts.slice(2).map(pt=>`L${pt[0]},${pt[1]}`).join(' ')} Z`} fill={fill} stroke={stk} strokeWidth="3" strokeLinejoin="round" />
          <path d={`M${pts[9][0]},${pts[9][1]} L${pts[0][0]},${pts[0][1]} L${pts[1][0]},${pts[1][1]}`} fill="none" stroke={mStk} strokeWidth="3" strokeDasharray={mD} strokeLinejoin="round" />
        </>
      );
    },
    star_point: ()=>{
      const or_=38, ir_=or_*0.4;
      const top=[50,50-or_];
      const lt=[50+ir_*Math.cos(-Math.PI/2+Math.PI/5),50+ir_*Math.sin(-Math.PI/2+Math.PI/5)];
      const rt=[50+ir_*Math.cos(-Math.PI/2-Math.PI/5),50+ir_*Math.sin(-Math.PI/2-Math.PI/5)];
      return <polygon points={`${rt[0]},${rt[1]} ${top[0]},${top[1]} ${lt[0]},${lt[1]}`} fill={P.pri} fillOpacity="0.35" stroke={stk} strokeWidth="3" strokeLinejoin="round" />;
    },
    correct_segment: ()=><line x1="25" y1="25" x2="80" y2="80" stroke={P.pri} strokeWidth="4" strokeLinecap="round" />,
    mirrored_segment: ()=><line x1="75" y1="25" x2="20" y2="80" stroke={P.pri} strokeWidth="4" strokeLinecap="round" />,
    rotated_segment: ()=><line x1="50" y1="8" x2="50" y2="92" stroke={P.pri} strokeWidth="4" strokeLinecap="round" />,
    complex_shape_missing_segment: ()=>(
      <>
        <circle cx="50" cy="50" r="25" fill={fill} stroke={stk} strokeWidth="3" />
        <rect x="30" y="8" width="40" height="25" rx="3" fill={fill} stroke={stk} strokeWidth="3" />
        <path d="M65,65 L88,88" stroke={mStk} strokeWidth="3" strokeDasharray={mD} />
      </>
    ),
    circle_small: ()=><circle cx="50" cy="50" r="18" fill={P.pri} fillOpacity="0.4" stroke={stk} strokeWidth="3" />,
    triangle_small: ()=><polygon points="50,35 65,65 35,65" fill={P.pri} fillOpacity="0.4" stroke={stk} strokeWidth="3" strokeLinejoin="round" />,
  };

  const renderer=shapes[cl];
  if (!renderer) { logMissingToken(token,'missing_figure_part'); return null; }
  return (
    <ImgBox>
      <SvgBox sz={sz}>{renderer()}</SvgBox>
    </ImgBox>
  );
}

// ═══ MODULE 7: ComplexPattern ═══
function ComplexPattern({ token, sz }) {
  const rand=seeded(hashStr(token));
  const sc=4+Math.floor(rand()*3);
  const shapes=[];
  const types=['circle','triangle','square','hexagon','diamond'];
  const cols=['#6366F1','#0891B2','#059669','#D97706','#DC2626','#8B5CF6'];
  for (let i=0;i<sc;i++) {
    const type=types[Math.floor(rand()*types.length)];
    const color=cols[Math.floor(rand()*cols.length)];
    const cx=10+rand()*80, cy=10+rand()*80, size=10+rand()*28;
    const op=0.15+rand()*0.35, rot=Math.floor(rand()*360);
    if (type==='circle') {
      shapes.push(<circle key={i} cx={cx} cy={cy} r={size/2} fill={color} fillOpacity={op} stroke={color} strokeWidth="1.5" strokeOpacity={op+0.2} />);
    } else {
      const sides=type==='hexagon'?6:type==='triangle'?3:4;
      const pts=[];
      for(let j=0;j<sides;j++){const a=rot*Math.PI/180+(Math.PI*j*2)/sides;pts.push(`${cx+(size/2)*Math.cos(a)},${cy+(size/2)*Math.sin(a)}`);}
      shapes.push(<polygon key={i} points={pts.join(' ')} fill={color} fillOpacity={op} stroke={color} strokeWidth="1.5" strokeOpacity={op+0.2} strokeLinejoin="round" />);
    }
  }
  const tSz=22, tx=50-tSz/2+(rand()-0.5)*40, ty=50-tSz/2+(rand()-0.5)*40;
  shapes.push(<polygon key="t" points={`${tx+tSz/2},${ty} ${tx+tSz},${ty+tSz} ${tx},${ty+tSz}`} fill="none" stroke="#1C1917" strokeWidth="2" strokeOpacity="0.3" strokeLinejoin="round" />);
  return (
    <ImgBox>
      <SvgBox sz={sz+8}>
        <rect x="1" y="1" width="98" height="98" rx="6" fill="transparent" stroke="none" />
        {shapes}
      </SvgBox>
    </ImgBox>
  );
}

// ═══════════════════════════════════════════════════════════════════
// EXCEL IMAGE TOKEN
// ═══════════════════════════════════════════════════════════════════
//
// ALL images live in:  public/custom/<filename>
// Served at URL:       /custom/<filename>
//
// To change the base path (e.g. CDN or BE-served), update this constant:
const CUSTOM_IMAGE_BASE = '/custom/';
//
// If images are served from your backend API instead, use:
//   const CUSTOM_IMAGE_BASE = `${import.meta.env.VITE_API_BASE}/custom/`;
// ═══════════════════════════════════════════════════════════════════

const svgParser = new DOMParser();
const svgSerializer = new XMLSerializer();

function parseSvg(svgText) {
  if (!svgText || !svgText.includes('<svg')) return null;
  try {
    const doc = svgParser.parseFromString(svgText, 'image/svg+xml');
    const svg = doc.querySelector('svg');
    if (!svg || doc.querySelector('parsererror')) return null;
    return svg;
  } catch { return null; }
}

function serializeSvg(svgEl) {
  return svgSerializer.serializeToString(svgEl);
}

// ═══════════════════════════════════════════════════════════════════
// PATCH #2 — normalizeStimulusSvg always fills parent
// ═══════════════════════════════════════════════════════════════════
// Previously preserved original px dimensions when available. That made
// stimulus size vary wildly across questions. Now always fills 100%
// of the slot; preserveAspectRatio="xMidYMid meet" handles AR correctly.
// ═══════════════════════════════════════════════════════════════════
function normalizeStimulusSvg(svgText) {
  const svg = parseSvg(svgText);
  if (!svg) return null;

  const origW = parseFloat(svg.getAttribute('width'))  || 0;
  const origH = parseFloat(svg.getAttribute('height')) || 0;

  // Ensure viewBox exists so the SVG can scale
  if (!svg.getAttribute('viewBox')) {
    const w = origW || 400;
    const h = origH || 400;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  }

  // Always fill parent — slot dictates size. Do NOT preserve original px.
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.setAttribute('style', 'max-width:100%;max-height:100%;');

  return serializeSvg(svg);
}

/**
 * Option thumbnail SVG: remove white bg, compute real content bounding box
 * via DOM parser, crop viewBox, scale tiny shapes. Returns null if no geometry
 * found — caller falls back to normalizeStimulusSvg.
 */
function optimizeSvgForOption(svgText) {
  const svg = parseSvg(svgText);
  if (!svg) return null;

  svg.querySelectorAll('rect').forEach(rect => {
    const fill = (rect.getAttribute('fill') || '').toLowerCase();
    if ((fill === '#ffffff' || fill === 'white' || fill === 'rgb(255, 255, 255)' || fill === 'rgb(255,255,255)')
        && !rect.getAttribute('x') && !rect.getAttribute('y')) {
      rect.remove();
    }
  });

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  const extend = (x, y) => {
    if (isFinite(x) && isFinite(y)) {
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
  };

  svg.querySelectorAll('circle').forEach(el => {
    const cx = parseFloat(el.getAttribute('cx')) || 0;
    const cy = parseFloat(el.getAttribute('cy')) || 0;
    const r  = parseFloat(el.getAttribute('r'))  || 0;
    if (r < 3) return;
    extend(cx - r, cy - r);
    extend(cx + r, cy + r);
  });

  svg.querySelectorAll('ellipse').forEach(el => {
    const cx = parseFloat(el.getAttribute('cx')) || 0;
    const cy = parseFloat(el.getAttribute('cy')) || 0;
    const rx = parseFloat(el.getAttribute('rx')) || 0;
    const ry = parseFloat(el.getAttribute('ry')) || 0;
    extend(cx - rx, cy - ry);
    extend(cx + rx, cy + ry);
  });

  svg.querySelectorAll('rect').forEach(el => {
    const x = parseFloat(el.getAttribute('x')) || 0;
    const y = parseFloat(el.getAttribute('y')) || 0;
    const w = parseFloat(el.getAttribute('width'))  || 0;
    const h = parseFloat(el.getAttribute('height')) || 0;
    if (w < 2 && h < 2) return;
    extend(x, y);
    extend(x + w, y + h);
  });

  svg.querySelectorAll('polygon, polyline').forEach(el => {
    const pts = (el.getAttribute('points') || '').trim().split(/[\s,]+/).map(Number);
    for (let i = 0; i < pts.length - 1; i += 2) {
      if (!isNaN(pts[i]) && !isNaN(pts[i+1])) extend(pts[i], pts[i+1]);
    }
  });

  svg.querySelectorAll('line').forEach(el => {
    extend(parseFloat(el.getAttribute('x1')) || 0, parseFloat(el.getAttribute('y1')) || 0);
    extend(parseFloat(el.getAttribute('x2')) || 0, parseFloat(el.getAttribute('y2')) || 0);
  });

  svg.querySelectorAll('path').forEach(el => {
    const d = el.getAttribute('d') || '';
    let curX = 0, curY = 0;
    const cmdRe = /([MLHVCSQTAZmlhvcsqtaz])\s*([-\d.,\s]*)/g;
    let m;
    while ((m = cmdRe.exec(d)) !== null) {
      const cmd = m[1];
      const nums = (m[2] || '').match(/-?[\d.]+/g)?.map(Number) || [];
      const isRel = cmd === cmd.toLowerCase();
      switch (cmd.toUpperCase()) {
        case 'M': case 'L': case 'T':
          for (let i = 0; i < nums.length - 1; i += 2) {
            curX = isRel ? curX + nums[i] : nums[i];
            curY = isRel ? curY + nums[i+1] : nums[i+1];
            extend(curX, curY);
          }
          break;
        case 'H':
          for (const n of nums) { curX = isRel ? curX + n : n; extend(curX, curY); }
          break;
        case 'V':
          for (const n of nums) { curY = isRel ? curY + n : n; extend(curX, curY); }
          break;
        case 'C':
          for (let i = 0; i < nums.length - 5; i += 6) {
            const bx = isRel ? curX : 0, by = isRel ? curY : 0;
            extend(bx + nums[i], by + nums[i+1]);
            extend(bx + nums[i+2], by + nums[i+3]);
            curX = isRel ? curX + nums[i+4] : nums[i+4];
            curY = isRel ? curY + nums[i+5] : nums[i+5];
            extend(curX, curY);
          }
          break;
        case 'S': case 'Q':
          { const step = cmd.toUpperCase() === 'Q' ? 4 : 4;
            for (let i = 0; i < nums.length - (step-1); i += step) {
              const bx = isRel ? curX : 0, by = isRel ? curY : 0;
              extend(bx + nums[i], by + nums[i+1]);
              curX = isRel ? curX + nums[i+step-2] : nums[i+step-2];
              curY = isRel ? curY + nums[i+step-1] : nums[i+step-1];
              extend(curX, curY);
            }
          }
          break;
        case 'A':
          for (let i = 0; i < nums.length - 6; i += 7) {
            curX = isRel ? curX + nums[i+5] : nums[i+5];
            curY = isRel ? curY + nums[i+6] : nums[i+6];
            extend(curX, curY);
          }
          break;
        case 'Z': break;
      }
    }
  });

  if (minX === Infinity) return null;

  const circles = svg.querySelectorAll('circle');
  let maxRadius = 0;
  circles.forEach(el => {
    const r = parseFloat(el.getAttribute('r')) || 0;
    if (r >= 5 && r > maxRadius) maxRadius = r;
  });
  if (maxRadius > 0 && maxRadius < 40) {
    const scale = Math.min(3, 40 / maxRadius);
    circles.forEach(el => {
      const r = parseFloat(el.getAttribute('r')) || 0;
      if (r >= 5) el.setAttribute('r', (r * scale).toFixed(1));
    });
  }

  const contentW = maxX - minX;
  const contentH = maxY - minY;
  const pad = Math.max(20, Math.min(contentW, contentH) * 0.15);
  svg.setAttribute('viewBox',
    `${Math.max(0, minX - pad).toFixed(1)} ${Math.max(0, minY - pad).toFixed(1)} ${(contentW + pad * 2).toFixed(1)} ${(contentH + pad * 2).toFixed(1)}`);
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  return serializeSvg(svg);
}

// ═══════════════════════════════════════════════════════════════════
// PATCH #3 — ExcelImgToken smart SVG normalization (non-destructive)
// ═══════════════════════════════════════════════════════════════════
// For small vector SVGs we fetch the text, compute the content bbox,
// rewrite the root viewBox tight to that bbox (+ 10% padding), and
// inject inline. This fixes the "image looks tiny inside option"
// problem caused by SVGs whose artwork occupies only 10-30% of their
// declared viewBox — WITHOUT mutating any content (no circle scaling,
// no element removal). Composite stimuli with multiple shapes retain
// their original relative sizes and positions.
//
// Large files (>300KB — likely raster-embedded base64 PNGs) are always
// rendered via <img> since inline injection freezes the browser.
// Fetch failures and parse errors fall back cleanly to <img>.
// Results are cached by URL so repeat renders are instant.
// ═══════════════════════════════════════════════════════════════════
const SVG_NORMALIZE_CACHE = new Map(); // url → 'html' | 'skip' | 'pending:<Promise>'
const SVG_INLINE_MAX_BYTES = 300 * 1024; // 300 KB

function tightenSvgViewBox(svgText) {
  const svg = parseSvg(svgText);
  if (!svg) return null;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const extend = (x, y) => {
    if (isFinite(x) && isFinite(y)) {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  };

  svg.querySelectorAll('circle').forEach(el => {
    const cx = parseFloat(el.getAttribute('cx')) || 0;
    const cy = parseFloat(el.getAttribute('cy')) || 0;
    const r  = parseFloat(el.getAttribute('r'))  || 0;
    if (r < 1) return;
    extend(cx - r, cy - r); extend(cx + r, cy + r);
  });
  svg.querySelectorAll('ellipse').forEach(el => {
    const cx = parseFloat(el.getAttribute('cx')) || 0;
    const cy = parseFloat(el.getAttribute('cy')) || 0;
    const rx = parseFloat(el.getAttribute('rx')) || 0;
    const ry = parseFloat(el.getAttribute('ry')) || 0;
    extend(cx - rx, cy - ry); extend(cx + rx, cy + ry);
  });
  // Read the root viewBox early so we can detect background-filler rects
  const rootVbEarly = (svg.getAttribute('viewBox') || '').split(/\s+/).map(Number);
  const rootVbW = rootVbEarly[2] || 0;
  const rootVbH = rootVbEarly[3] || 0;

  svg.querySelectorAll('rect').forEach(el => {
    const x = parseFloat(el.getAttribute('x')) || 0;
    const y = parseFloat(el.getAttribute('y')) || 0;
    const w = parseFloat(el.getAttribute('width')) || 0;
    const h = parseFloat(el.getAttribute('height')) || 0;
    if (w < 2 && h < 2) return;
    // Background filler rect: positioned at origin AND covers >=90% of the root viewBox.
    // Applies regardless of fill color — SVGs from different domains use white, off-
    // white, light blue, etc. as the backing card. Exclude from bbox so content drives
    // tightening.
    if (rootVbW > 0 && rootVbH > 0) {
      const atOrigin = x <= 1 && y <= 1;
      const coversVb = w >= rootVbW * 0.9 && h >= rootVbH * 0.9;
      if (atOrigin && coversVb) return;
    }
    extend(x, y); extend(x + w, y + h);
  });
  svg.querySelectorAll('polygon, polyline').forEach(el => {
    const pts = (el.getAttribute('points') || '').trim().split(/[\s,]+/).map(Number);
    for (let i = 0; i < pts.length - 1; i += 2) {
      if (!isNaN(pts[i]) && !isNaN(pts[i+1])) extend(pts[i], pts[i+1]);
    }
  });
  svg.querySelectorAll('line').forEach(el => {
    extend(parseFloat(el.getAttribute('x1')) || 0, parseFloat(el.getAttribute('y1')) || 0);
    extend(parseFloat(el.getAttribute('x2')) || 0, parseFloat(el.getAttribute('y2')) || 0);
  });
  svg.querySelectorAll('path').forEach(el => {
    const d = el.getAttribute('d') || '';
    let curX = 0, curY = 0;
    const cmdRe = /([MLHVCSQTAZmlhvcsqtaz])\s*([-\d.,\s]*)/g;
    let m;
    while ((m = cmdRe.exec(d)) !== null) {
      const cmd = m[1];
      const nums = (m[2] || '').match(/-?[\d.]+/g)?.map(Number) || [];
      const isRel = cmd === cmd.toLowerCase();
      switch (cmd.toUpperCase()) {
        case 'M': case 'L': case 'T':
          for (let i = 0; i < nums.length - 1; i += 2) {
            curX = isRel ? curX + nums[i] : nums[i];
            curY = isRel ? curY + nums[i+1] : nums[i+1];
            extend(curX, curY);
          } break;
        case 'H': for (const n of nums) { curX = isRel ? curX + n : n; extend(curX, curY); } break;
        case 'V': for (const n of nums) { curY = isRel ? curY + n : n; extend(curX, curY); } break;
        case 'C':
          for (let i = 0; i < nums.length - 5; i += 6) {
            curX = isRel ? curX + nums[i+4] : nums[i+4];
            curY = isRel ? curY + nums[i+5] : nums[i+5];
            extend(curX, curY);
          } break;
        case 'S': case 'Q':
          for (let i = 0; i < nums.length - 3; i += 4) {
            curX = isRel ? curX + nums[i+2] : nums[i+2];
            curY = isRel ? curY + nums[i+3] : nums[i+3];
            extend(curX, curY);
          } break;
        case 'A':
          for (let i = 0; i < nums.length - 6; i += 7) {
            curX = isRel ? curX + nums[i+5] : nums[i+5];
            curY = isRel ? curY + nums[i+6] : nums[i+6];
            extend(curX, curY);
          } break;
      }
    }
  });

  if (minX === Infinity) return null;
  const contentW = maxX - minX;
  const contentH = maxY - minY;
  if (contentW <= 0 || contentH <= 0) return null;

  // Sanity: bbox must be inside the current viewBox — otherwise our parser missed
  // content (e.g. via <use>, <g transform>) and we'd clip the image. Fall back.
  const vbAttr = svg.getAttribute('viewBox');
  let vbX = 0, vbY = 0, vbW = contentW, vbH = contentH;
  if (vbAttr) {
    [vbX, vbY, vbW, vbH] = vbAttr.split(/\s+/).map(Number);
    if (minX < vbX - 1 || minY < vbY - 1 || maxX > vbX + vbW + 1 || maxY > vbY + vbH + 1) return null;
  }

  // UNIFORM SIZING: every SVG gets the same content-to-viewBox ratio, regardless of
  // its original fill. This is what makes options look the same size across domains.
  // TARGET_FILL = 0.85 means content fills 85% of the new viewBox (7.5% padding each
  // side). When rendered in an option cell via object-fit:contain, content ends up at
  // ~85% of the cell — a generous, uniform size with enough margin to avoid cropping
  // from minor bbox imprecision.
  const TARGET_FILL = 0.85;

  const newVbW = contentW / TARGET_FILL;
  const newVbH = contentH / TARGET_FILL;
  const xOffset = (newVbW - contentW) / 2;
  const yOffset = (newVbH - contentH) / 2;
  svg.setAttribute('viewBox',
    `${(minX - xOffset).toFixed(1)} ${(minY - yOffset).toFixed(1)} ${newVbW.toFixed(1)} ${newVbH.toFixed(1)}`);
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  return serializeSvg(svg);
}

async function fetchNormalizedSvg(src) {
  const cached = SVG_NORMALIZE_CACHE.get(src);
  if (cached && typeof cached === 'string') return cached;
  if (cached && cached.pending) return cached.pending;

  const pending = (async () => {
    try {
      const res = await fetch(src);
      if (!res.ok) return null;
      const clen = parseInt(res.headers.get('content-length') || '0', 10);
      if (clen && clen > SVG_INLINE_MAX_BYTES) { SVG_NORMALIZE_CACHE.set(src, 'skip'); return null; }
      const text = await res.text();
      if (text.length > SVG_INLINE_MAX_BYTES) { SVG_NORMALIZE_CACHE.set(src, 'skip'); return null; }
      if (text.includes('<image ') || text.includes('<use ') || text.includes('<symbol ')) {
        SVG_NORMALIZE_CACHE.set(src, 'skip'); return null;
      }
      const html = tightenSvgViewBox(text);
      if (!html) { SVG_NORMALIZE_CACHE.set(src, 'skip'); return null; }
      SVG_NORMALIZE_CACHE.set(src, html);
      return html;
    } catch { SVG_NORMALIZE_CACHE.set(src, 'skip'); return null; }
  })();

  SVG_NORMALIZE_CACHE.set(src, { pending });
  return pending;
}

export function ExcelImgToken({ token, sz=72, card=false }) {
  if (!token || !token.startsWith('excel_img:')) return null;

  const filename = token.slice('excel_img:'.length);
  const src = `${CUSTOM_IMAGE_BASE}${filename}`;
  const isSvg = filename.toLowerCase().endsWith('.svg');

  const initial = isSvg ? SVG_NORMALIZE_CACHE.get(src) : null;
  const [inlineHtml, setInlineHtml] = useState(
    typeof initial === 'string' && initial !== 'skip' ? initial : null
  );

  useEffect(() => {
    if (!isSvg) return;
    const cached = SVG_NORMALIZE_CACHE.get(src);
    if (typeof cached === 'string' && cached !== 'skip') { setInlineHtml(cached); return; }
    if (cached === 'skip') return;
    let cancelled = false;
    fetchNormalizedSvg(src).then(html => { if (!cancelled && html) setInlineHtml(html); });
    return () => { cancelled = true; };
  }, [src, isSvg]);

  const wrapStyle = {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    maxWidth: card ? '100%' : 200,
    maxHeight: card ? '100%' : 200,
  };

  if (inlineHtml) {
    return <div style={wrapStyle} dangerouslySetInnerHTML={{ __html: inlineHtml }} />;
  }

  // Loading / non-SVG / large SVG / normalization failed → <img> fallback
  return (
    <img
      src={src}
      alt=""
      draggable={false}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        display: 'block',
        maxWidth: card ? '100%' : 200,
        maxHeight: card ? '100%' : 200,
        margin: '0 auto',
      }}
      onError={e => { e.target.style.display = 'none'; }}
    />
  );
}

// ═══ IMG TOKEN DISPATCHER ═══
export function ImgToken({ token, sz=72 }) {
  if (!token||!token.startsWith('img_')) return null;
  const cl=token.slice(4);
  if (cl.startsWith('seesaw')) return (
    <ImgBox>
      <Seesaw spec={cl.replace('seesaw_','')} sz={sz+26} />
    </ImgBox>
  );
  const spriteM=cl.match(/^sprite_(\w+)_(\d+)/);
  if (spriteM) return (
    <ImgBox>
      <SpriteGrid fruit={spriteM[1]} n={parseInt(spriteM[2])} sz={sz} />
    </ImgBox>
  );
  if (token.includes('+')) return (
    <div className="flex items-center gap-1">
      {token.split('+').map((pt,i)=><ImgToken key={i} token={pt.trim()} sz={Math.round(sz*0.65)} />)}
    </div>
  );
  const barM=cl.match(/^bar_(\d+)/);
  if (barM) return (
    <ImgBox><BarToken n={parseInt(barM[1])} sz={sz} /></ImgBox>
  );
  const fp=FigurePart({token,sz});
  if (fp) return fp;
  if (cl.includes('complex')||cl.includes('pattern')) return <ComplexPattern token={token} sz={sz} />;
  const am=cl.match(/^answer_(.+)/);
  if (am) return (
    <div className="flex items-center justify-center px-4 py-2 rounded-lg"
      style={{ background:'#F5F5F4', border:'1.5px solid #D6D3D1', minWidth:sz }}>
      <span className="font-mono font-bold" style={{ fontSize:Math.min(16,sz*0.28), color:P.ink }}>{am[1].replace(/_/g,' ')}</span>
    </div>
  );
  const gm=cl.match(/^grid_(\d+)x(\d+)/);
  if (gm) {
    const rows=Math.min(parseInt(gm[1]),14), cols2=Math.min(parseInt(gm[2]),14);
    const symbols=['*','+','#','%','&','@','~','^'];
    const rand2=seeded(hashStr(token));
    const cells=[]; for(let i=0;i<rows*cols2;i++)cells.push(symbols[Math.floor(rand2()*symbols.length)]);
    const cellSz=Math.min(Math.floor((sz+20)/Math.max(rows,cols2)),18);
    return (
      <div className="rounded-lg" style={{ padding:4 }}>
        <div style={{ display:'grid', gridTemplateColumns:`repeat(${cols2},${cellSz}px)`, gap:1, fontFamily:'monospace', fontSize:Math.max(9,cellSz-4), lineHeight:`${cellSz}px`, textAlign:'center', color:P.ink }}>
          {cells.map((s,i)=><div key={i}>{s}</div>)}
        </div>
      </div>
    );
  }
  if (cl.startsWith('3d')||cl.startsWith('solid')||cl.startsWith('cube')||cl.startsWith('prism')||cl.startsWith('pyramid')||cl.startsWith('net_')||cl.startsWith('isometric')||cl.startsWith('paper_fold')) return (
    <ImgBox>
      <SvgBox sz={sz}><polygon points="50,8 92,35 70,92 30,92 8,35" fill="none" stroke={P.pri} strokeWidth="2" /></SvgBox>
    </ImgBox>
  );
  if (cl.includes('graph')||cl.includes('parabola')||cl.includes('scatter')||cl.includes('histogram')||cl.includes('boxplot')) return (
    <ImgBox>
      <SvgBox sz={sz}>
        <line x1="12" y1="88" x2="12" y2="8" stroke="#78716C" strokeWidth="1.5" />
        <line x1="12" y1="88" x2="92" y2="88" stroke="#78716C" strokeWidth="1.5" />
        <path d="M14,86 Q35,10 55,50 T90,86" fill="none" stroke={P.acc} strokeWidth="2.5" />
      </SvgBox>
    </ImgBox>
  );
  if (cl.startsWith('venn')) return (
    <ImgBox>
      <SvgBox sz={sz}>
        <circle cx="38" cy="45" r="28" fill="none" stroke="#DC2626" strokeWidth="2" opacity="0.6" />
        <circle cx="62" cy="45" r="28" fill="none" stroke="#6366F1" strokeWidth="2" opacity="0.6" />
      </SvgBox>
    </ImgBox>
  );
  if (cl.startsWith('tree')) return (
    <ImgBox>
      <SvgBox sz={sz}>
        <circle cx="50" cy="12" r="6" fill={P.acc} />
        <line x1="50" y1="18" x2="30" y2="50" stroke="#78716C" strokeWidth="1.5" />
        <line x1="50" y1="18" x2="70" y2="50" stroke="#78716C" strokeWidth="1.5" />
        <circle cx="30" cy="54" r="5" fill={P.acc} opacity="0.7" />
        <circle cx="70" cy="54" r="5" fill={P.acc} opacity="0.7" />
      </SvgBox>
    </ImgBox>
  );
  if (cl.startsWith('symbol_matrix')) {
    const symbols=['*','+','#','%','&','@','~','^','=','-'];
    const rand3=seeded(hashStr(token));
    const cells=[]; for(let i=0;i<36;i++)cells.push(symbols[Math.floor(rand3()*symbols.length)]);
    return (
      <div className="rounded-lg" style={{ padding:4 }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(6,18px)', gap:1, fontFamily:'monospace', fontSize:12, lineHeight:'18px', textAlign:'center', color:P.ink }}>
          {cells.map((s,i)=><div key={i}>{s}</div>)}
        </div>
      </div>
    );
  }
  // Generic fallback — no chrome, just a minimal placeholder
  return (
    <ImgBox>
      <SvgBox sz={Math.round(sz*0.5)}>
        <rect x="5" y="5" width="90" height="90" rx="10" fill="none" stroke={P.sub} strokeWidth="3" strokeDasharray="8 6" />
        <text x="50" y="54" textAnchor="middle" dominantBaseline="middle" fontSize="16" fontWeight="600" fill={P.sub} fontFamily="system-ui">IMG</text>
      </SvgBox>
    </ImgBox>
  );
}


// ═══════════════════════════════════════════════════════════════════
// SHAPE RESOLUTION ORDER
//   1. Built-in SVG shapes  (BUILT_IN_SHAPES switch in drawShapeSVG)
//   2. Custom DB shapes      (customShapesCache from /api/tokens/svg-shapes)
//   3. Sprite sheet          (shapes-manifest.json → shapes.png)
//   4. Plain text / ? placeholder (last resort)
// ═══════════════════════════════════════════════════════════════════

function canRenderAsSVG(token) {
  if (!token) return false;
  const lc = token.toLowerCase().trim();
  const allShapes = getAllShapes();
  for (const shape of allShapes.sort((a,b) => b.length - a.length)) {
    if (
      lc === shape ||
      lc === shape + 's' ||
      lc.startsWith(shape + '_') ||
      lc.startsWith(shape + 's_')
    ) return true;
  }
  return false;
}

function SpriteOrShapeToken({ token, sz, textFallback=false }) {
  const manifest = useSpriteManifest();

  if (canRenderAsSVG(token)) {
    return <ShapeToken token={token} sz={sz} />;
  }

  const sprite = lookupSprite(token, manifest);
  if (sprite) return <SpriteToken token={token} sz={sz} />;

  if (textFallback) {
    return <span className="font-semibold" style={{ fontSize:Math.min(16,sz*0.35), color:P.ink }}>{token}</span>;
  }
  return <ShapeToken token={token} sz={sz} />;
}


// ═══════════════════════════════════════════════════════════════════
// UNIVERSAL ENTRY POINT
// ═══════════════════════════════════════════════════════════════════
// card=true → stimulus context; card=false → option context.
// Slot above (StimulusSlot / OptionSlot) owns chrome and dimensions.
export default function TokenRenderer({ token, sz=48, card=false }) {
  useEffect(()=>{ loadCustomShapes(); loadSpriteManifest(); },[]);
  if (!token||token==='') return null;

  const gsResult = GsTokenDispatch({ token, sz });
  if (gsResult !== null) return gsResult;

  if (token==='?') return (
    <div className="flex items-center justify-center rounded-xl"
      style={{ width:sz+16, height:sz+16, border:'2px dashed #B45309', background:'rgba(180,83,9,0.04)' }}>
      <span style={{ fontSize:sz*0.45, fontWeight:800, color:'#B45309', fontFamily:'system-ui' }}>?</span>
    </div>
  );

  if (typeof token==='string'&&token.startsWith('obj:')) return <TokenRenderer token={token.slice(4)} sz={sz} card={card} />;

  if (typeof token==='string'&&token.startsWith('pos_')) return <PosToken token={token} sz={sz} />;
  if (typeof token==='string'&&token.startsWith('img_')) return <ImgToken token={token} sz={sz} />;
  if (typeof token==='string'&&token.startsWith('excel_img:')) return <ExcelImgToken token={token} sz={sz} card={card} />;
  if (typeof token==='string'&&token.startsWith('ratio:')) return <RatioToken token={token} sz={sz} />;
  if (typeof token==='string'&&token.includes('_')&&!token.startsWith('pos_')&&!token.startsWith('img_')&&!token.startsWith('ratio:')) return <GsSymbolSVG token={token} sz={sz} />;
  if (/^-?\d+\.?\d*$/.test(String(token))) return (
    <span className="font-mono font-bold" style={{ fontSize:Math.min(24,sz*0.5), color:P.ink }}>{token}</span>
  );
  if (/^[^\w]+$/.test(String(token))||/^[\u2190-\u27BF\u2900-\u297F\s]+$/.test(String(token))) return (
    <span className="font-mono font-bold" style={{ fontSize:Math.min(28,sz*0.55), color:P.ink, whiteSpace:'nowrap' }}>{token}</span>
  );
  if (typeof token==='string'&&!token.includes('_')&&/[a-zA-Z]/.test(token)&&token.length>0) {
    if (SHAPES.includes(token.toLowerCase())) return <ShapeToken token={token} sz={sz} />;
    return <SpriteOrShapeToken token={token} sz={sz} textFallback={true} />;
  }
  return <SpriteOrShapeToken token={token} sz={sz} />;
}


// ═══════════════════════════════════════════════════════════════════
// QuizTokenQuestion — LEGACY COMPONENT
// Kept for backwards compatibility. New code should use QuestionShell
// + ItemBankQuestion from './QuestionShell'.
// ═══════════════════════════════════════════════════════════════════
export function QuizTokenQuestion({
  question, onSelect, selected, correct, timeUp=false, onNext,
  questionNumber=1, totalQuestions=15, xp=0, xpMax=15,
}) {
  const LABELS = ['A','B','C','D','E','F'];
  const options = question?.options || [];
  const stimulus = question?.stimulus;

  function optionState(token) {
    if (!selected && !timeUp) return 'idle';
    if (correct) {
      if (token===correct) return 'correct';
      if (token===selected&&token!==correct) return 'wrong';
      return 'dim';
    }
    if (selected===token) return 'selected';
    return 'idle';
  }

  const optionStyles = {
    idle:     { border:'1.5px solid rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.06)', color:'#E7E5E4' },
    selected: { border:'2px solid #22C55E', background:'rgba(34,197,94,0.15)', color:'#FAFAF9' },
    correct:  { border:'2px solid #22C55E', background:'rgba(34,197,94,0.18)', color:'#FAFAF9' },
    wrong:    { border:'2px solid #EF4444', background:'rgba(239,68,68,0.12)', color:'#FAFAF9' },
    dim:      { border:'1.5px solid rgba(255,255,255,0.06)', background:'rgba(255,255,255,0.02)', color:'rgba(231,229,228,0.4)' },
  };

  const xpPct = Math.min(100, Math.round((xp / xpMax) * 100));

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #0F172A 0%, #1E1B4B 50%, #0F172A 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px', fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{ width: '100%', maxWidth: 540 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
          <span style={{ fontSize:13, fontWeight:700, color:'#FBBF24', letterSpacing:'0.04em' }}>★ XP</span>
          <div style={{ flex:1, height:8, borderRadius:99, background:'rgba(255,255,255,0.1)', overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${xpPct}%`, borderRadius:99,
              background:'linear-gradient(90deg, #F59E0B, #EF4444)', transition:'width 0.4s ease' }} />
          </div>
          <span style={{ fontSize:13, fontWeight:600, color:'rgba(255,255,255,0.55)', minWidth:32, textAlign:'right' }}>
            {xp}/{xpMax}
          </span>
        </div>
        <div style={{
          background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)',
          borderRadius:20, padding:'28px 24px 24px',
        }}>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:16, marginBottom:24 }}>
            <div style={{
              background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.12)',
              borderRadius:16, padding:'20px 28px', display:'flex',
              alignItems:'center', justifyContent:'center', minWidth:120, minHeight:100,
            }}>
              <TokenRenderer token={stimulus} sz={72} card={true} />
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {options.map((opt, i) => {
              const tok = typeof opt === 'string' ? opt : opt.token;
              const label = typeof opt === 'string' ? null : opt.label;
              const state = optionState(tok);
              const style = optionStyles[state] || optionStyles.idle;
              return (
                <button key={tok} onClick={() => onSelect && onSelect(tok)}
                  disabled={!!selected || timeUp}
                  style={{ ...style, borderRadius: 14, padding: '14px 20px',
                    display: 'flex', alignItems: 'center', gap: 12,
                    cursor: selected || timeUp ? 'default' : 'pointer',
                    transition: 'all 0.2s', width: '100%', textAlign: 'left', outline: 'none' }}>
                  <span style={{ fontSize: 12, fontWeight: 800, minWidth: 24, opacity: 0.7 }}>{LABELS[i]}</span>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <TokenRenderer token={tok} sz={44} card />
                    {label && <span style={{ fontSize: 14, fontWeight: 600 }}>{label}</span>}
                  </div>
                </button>
              );
            })}
          </div>
          {(selected || timeUp) && onNext && (
            <button onClick={onNext} style={{
              marginTop: 18, width: '100%', padding: '13px', borderRadius: 14, border: 'none',
              background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', color: '#fff',
              fontWeight: 900, fontSize: 15, cursor: 'pointer',
            }}>Next →</button>
          )}
        </div>
      </div>
    </div>
  );
}

export function TokenPreviewGrid({ tokens = [], sz = 48 }) {
  if (!tokens.length) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: 8 }}>
      {tokens.map((token, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <TokenRenderer token={token} sz={sz} />
          <span style={{ fontSize: 9, color: '#94a3b8', maxWidth: sz + 16, textAlign: 'center',
            wordBreak: 'break-all', lineHeight: 1.3 }}>{String(token)}</span>
        </div>
      ))}
    </div>
  );
}
