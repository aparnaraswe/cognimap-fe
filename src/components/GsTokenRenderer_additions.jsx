/**
 * GS TOKEN RENDERER ADDITIONS  v2
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles all Gs-specific token formats from Gs_B1_ItemBank_v2_tokens.xlsx.
 *
 * INTEGRATION — two steps:
 *
 *   STEP 1 — Import at top of TokenRenderer.jsx:
 *     import { GsTokenDispatch } from './GsTokenRenderer_additions';
 *
 *   STEP 2 — Add as the VERY FIRST check inside the TokenRenderer default
 *            export function, before every other handler:
 *
 *     export default function TokenRenderer({ token, sz = 48 }) {
 *       useEffect(() => { loadCustomShapes(); }, []);
 *       if (!token || token === '') return null;
 *
 *       // ↓↓↓  ADD THIS BLOCK FIRST  ↓↓↓
 *       const gsResult = GsTokenDispatch({ token, sz });
 *       if (gsResult !== null) return gsResult;
 *       // ↑↑↑  END OF ADDED BLOCK   ↑↑↑
 *
 *       if (token === '?') { ...           // existing code continues
 *
 * WHY FIRST: tokens like "pos:4", "label:Same", "gs_code:..." all contain
 * characters (: | →) that parseToken() doesn't understand and logs as
 * missing shapes. Intercepting first prevents all false warnings.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DISPATCHER ORDER — critical, do NOT reorder:
 *   1. gs_sym:    target box
 *   2. gs_code:   code table  ← must precede pipe-array, also contains " | " (uses "-" KV separator)
 *   3. pos:N      ordinal badge
 *   4. label:TEXT text chip
 *   5. A vs B     comparison  ← must precede pipe-array, also contains " | "
 *   6. A | B | C  scan strip  ← last Gs check
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { SpriteToken, useSpriteManifest, lookupSprite } from './SpriteSheetRenderer';

const P = {
  pri: '#0891B2', acc: '#D97706', bdr: '#D6D3D1', ink: '#1C1917',
};

const ORD = ['','1st','2nd','3rd','4th','5th','6th','7th','8th','9th','10th'];

// Tokens that are pure text labels — rendered as chips, no SVG
const TEXT_ONLY = new Set([
  'stripe','stripes','dots','lines','empty','solid','striped',
  'apple','cherry','banana','date',
  'red','blue','green','yellow','orange','purple',
]);


// ══════════════════════════════════════════════════════════════════════════════
// GsSymbolSVG
// Renders any Gs token as SVG (complex decorated variants + standard shapes).
// Used inside every other module below.
// ══════════════════════════════════════════════════════════════════════════════
export function GsSymbolSVG({ token, sz = 36 }) {
  // useSpriteManifest ensures this component re-renders once the manifest
  // JSON is loaded, so sprite fallbacks appear correctly even on first load.
  const spriteManifest = useSpriteManifest();

  if (!token) return null;
  const lc = token.toLowerCase().trim();
  const sw = 2.5;
  const s  = '#0369A1';

  // ── Size-aware scaling from _sm / _md (default) / _lg modifier ────────────
  // Scales shape dimensions within the 100×100 viewBox so _sm and _lg tokens
  // render visibly different (fixes GS "two shapes look identical" bug).
  const sizeScale = lc.includes('_lg') ? 1.0 : lc.includes('_sm') ? 0.55 : 0.78;
  const R  = Math.round(42 * sizeScale);   // main radius / half-extent (42 = max)
  const HW = Math.round(40 * sizeScale);   // half-width for rectangle shapes

  // Text-only chip
  if (TEXT_ONLY.has(lc)) {
    return <TextChip text={token.replace(/_/g,' ')} sz={sz} />;
  }

  // Moon
  if (lc === 'moon') {
    return (
      <svg width={sz} height={sz} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        <circle cx="50" cy="50" r="38" fill="#F59E0B" stroke="#D97706" strokeWidth={sw}/>
        <circle cx="64" cy="50" r="30" fill="white"/>
      </svg>
    );
  }

  // Hourglass variants
  if (lc.startsWith('hourglass')) {
    const hasStripes = lc.includes('strip');
    const hasDotTop  = lc.includes('dot_top');
    const hasDotBot  = lc.includes('dot_bottom');
    const uid = `hg${sz}`;
    return (
      <svg width={sz} height={sz} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        <defs>
          <pattern id={`${uid}p`} width="8" height="8" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="8" y2="8" stroke={s} strokeWidth="1.5"/>
          </pattern>
          <clipPath id={`${uid}c`}>
            <path d="M20,10 L80,10 L55,50 L80,90 L20,90 L45,50 Z"/>
          </clipPath>
        </defs>
        <path d="M20,10 L80,10 L55,50 L80,90 L20,90 L45,50 Z"
          fill={hasStripes ? `url(#${uid}p)` : 'rgba(8,145,178,0.15)'}
          clipPath={hasStripes ? `url(#${uid}c)` : undefined}
          stroke={s} strokeWidth={sw} strokeLinejoin="round"/>
        {hasStripes && (
          <path d="M20,10 L80,10 L55,50 L80,90 L20,90 L45,50 Z"
            fill="none" stroke={s} strokeWidth={sw} strokeLinejoin="round"/>
        )}
        {hasDotTop && <circle cx="50" cy="22" r="6" fill={s}/>}
        {hasDotBot && <circle cx="50" cy="78" r="6" fill={s}/>}
      </svg>
    );
  }

  // Wavy circle / square
  if (lc.includes('wavy')) {
    const isSquare = lc.includes('square');
    const da = lc.includes('dashed') ? '6 4' : undefined;
    return (
      <svg width={sz} height={sz} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        {isSquare
          ? <rect x="12" y="12" width="76" height="76" rx="4"
              fill="rgba(8,145,178,0.1)" stroke={s} strokeWidth={sw} strokeDasharray={da}/>
          : <circle cx="50" cy="50" r="38"
              fill="rgba(8,145,178,0.1)" stroke={s} strokeWidth={sw} strokeDasharray={da}/>
        }
        <path d="M20,50 Q30,38 40,50 Q50,62 60,50 Q70,38 80,50"
          fill="none" stroke={s} strokeWidth="2" opacity="0.45"/>
      </svg>
    );
  }

  // Nested triangles
  if (lc.includes('nested') && lc.includes('triangle')) {
    const outerStriped = lc.includes('outer_striped');
    const innerStriped = lc.includes('inner_striped');
    const uid = `nt${sz}`;
    return (
      <svg width={sz} height={sz} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        <defs>
          <pattern id={uid} width="6" height="6" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="6" y2="6" stroke={s} strokeWidth="1.5"/>
          </pattern>
        </defs>
        <polygon points="50,8 92,88 8,88"
          fill={outerStriped ? `url(#${uid})` : 'rgba(8,145,178,0.2)'}
          stroke={s} strokeWidth={sw} strokeLinejoin="round"/>
        <polygon points="50,28 76,72 24,72"
          fill={innerStriped ? `url(#${uid})` : 'rgba(8,145,178,0.5)'}
          stroke={s} strokeWidth={sw} strokeLinejoin="round"/>
      </svg>
    );
  }

  // Star + rings
  if (lc.includes('star') && lc.includes('ring')) {
    const is4 = lc.includes('4ring');
    const r2d = lc.includes('ring2dashed');
    const radii = is4 ? [42,34,26,18] : [42,34,26];
    const pts = Array.from({length:10},(_,j)=>{
      const a=-Math.PI/2+Math.PI*j/5; const r=j%2===0?14:6;
      return `${50+r*Math.cos(a)},${50+r*Math.sin(a)}`;
    }).join(' ');
    return (
      <svg width={sz} height={sz} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        {radii.map((r,i)=>(
          <circle key={i} cx="50" cy="50" r={r} fill="none" stroke={s} strokeWidth="2"
            strokeDasharray={(r2d&&i===1)?'5 3':undefined} opacity="0.7"/>
        ))}
        <polygon points={pts} fill="#0891B2" strokeLinejoin="round"/>
      </svg>
    );
  }

  // Circle inner square
  if (lc.includes('inner_square')) {
    const isRotated = lc.includes('rotated');
    const outerRect = lc.includes('rectangle');
    const iSz = lc.includes('_lg') ? 38 : 22;
    return (
      <svg width={sz} height={sz} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        {outerRect
          ? <rect x="10" y="25" width="80" height="50" rx="4" fill="rgba(8,145,178,0.1)" stroke={s} strokeWidth={sw}/>
          : <circle cx="50" cy="50" r="40" fill="rgba(8,145,178,0.1)" stroke={s} strokeWidth={sw}/>
        }
        <rect x={50-iSz/2} y={50-iSz/2} width={iSz} height={iSz} rx="2"
          fill="rgba(8,145,178,0.4)" stroke={s} strokeWidth={sw}
          transform={isRotated?'rotate(45,50,50)':undefined}/>
      </svg>
    );
  }

  // Diamond with dots
  if (lc.includes('diamond') && (lc.includes('dot1')||lc.includes('dot2'))) {
    const dots = lc.includes('dot2') ? 2 : 1;
    return (
      <svg width={sz} height={sz} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        <polygon points="50,8 92,50 50,92 8,50"
          fill="rgba(5,150,105,0.15)" stroke="#059669" strokeWidth={sw} strokeLinejoin="round"/>
        {dots===1
          ? <circle cx="50" cy="50" r="7" fill="#059669"/>
          : <><circle cx="38" cy="50" r="6" fill="#059669"/><circle cx="62" cy="50" r="6" fill="#059669"/></>
        }
      </svg>
    );
  }

  // Square with dots
  if (lc==='square_md_dot2'||(lc.includes('square')&&lc.includes('dot2'))) {
    return (
      <svg width={sz} height={sz} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        <rect x="10" y="10" width="80" height="80" rx="4" fill="rgba(217,119,6,0.12)" stroke="#D97706" strokeWidth={sw}/>
        <circle cx="36" cy="50" r="7" fill="#D97706"/>
        <circle cx="64" cy="50" r="7" fill="#D97706"/>
      </svg>
    );
  }

  // Circle with line
  if (lc==='circle_md_line') {
    return (
      <svg width={sz} height={sz} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        <circle cx="50" cy="50" r="38" fill="rgba(8,145,178,0.12)" stroke={s} strokeWidth={sw}/>
        <line x1="50" y1="12" x2="50" y2="88" stroke={s} strokeWidth="3"/>
      </svg>
    );
  }

  // Circle shaded
  if (lc==='circle_md_shaded') {
    const uid=`cs${sz}`;
    return (
      <svg width={sz} height={sz} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        <defs>
          <pattern id={`${uid}p`} width="6" height="6" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="6" y2="6" stroke={s} strokeWidth="1.5"/>
          </pattern>
          <clipPath id={`${uid}c`}><circle cx="50" cy="50" r="38"/></clipPath>
        </defs>
        <circle cx="50" cy="50" r="38" fill={`url(#${uid}p)`} clipPath={`url(#${uid}c)`} stroke={s} strokeWidth={sw}/>
        <circle cx="50" cy="50" r="38" fill="none" stroke={s} strokeWidth={sw}/>
      </svg>
    );
  }

  // Striped square
  if (lc.includes('square')&&lc.includes('strip')) {
    const hasBorder=lc.includes('border');
    const uid=`ss${sz}${hasBorder?'b':''}`;
    return (
      <svg width={sz} height={sz} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        <defs>
          <pattern id={`${uid}p`} width="8" height="8" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="8" y2="8" stroke="#D97706" strokeWidth="2"/>
          </pattern>
          <clipPath id={`${uid}c`}><rect x="10" y="10" width="80" height="80" rx="4"/></clipPath>
        </defs>
        <rect x="10" y="10" width="80" height="80" rx="4" fill={`url(#${uid}p)`} clipPath={`url(#${uid}c)`}/>
        <rect x="10" y="10" width="80" height="80" rx="4" fill="none" stroke="#D97706" strokeWidth={hasBorder?sw*2.5:sw}/>
      </svg>
    );
  }

  // Arrows with shading
  if (lc.includes('arrow')&&lc.includes('shaded')) {
    const rot = lc.includes('upper_right') ? -45 : (lc.includes('_up')&&!lc.includes('right')) ? -90 : 0;
    const uid = `ar${sz}${rot}`;
    return (
      <svg width={sz} height={sz} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        <defs>
          <clipPath id={uid}><path d="M18,38 L62,38 L62,26 L84,50 L62,74 L62,62 L18,62 Z"/></clipPath>
        </defs>
        <g transform={`rotate(${rot},50,50)`}>
          <path d="M18,38 L62,38 L62,26 L84,50 L62,74 L62,62 L18,62 Z"
            fill="rgba(87,83,78,0.2)" stroke="#57534E" strokeWidth={sw} strokeLinejoin="round"/>
          {[42,50,58].map(y=>(
            <line key={y} x1="22" y1={y} x2="60" y2={y} stroke="#57534E" strokeWidth="1.5" opacity="0.4" clipPath={`url(#${uid})`}/>
          ))}
        </g>
      </svg>
    );
  }

  // Triangle down — size-aware
  if (lc.includes('triangle_down')) {
    const tx = Math.round(40 * sizeScale);
    const ty1 = Math.round(50 + 38*sizeScale); // bottom tip
    const ty2 = Math.round(50 - 38*sizeScale); // top edge
    return (
      <svg width={sz} height={sz} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        <polygon points={`50,${ty1} ${50-tx},${ty2} ${50+tx},${ty2}`} fill="rgba(99,102,241,0.25)" stroke="#6366F1" strokeWidth={sw} strokeLinejoin="round"/>
      </svg>
    );
  }

  // Triangle up hollow — size-aware
  if (lc.includes('triangle_up_hollow')||(lc.includes('triangle')&&lc.includes('hollow'))) {
    const tx = Math.round(40 * sizeScale);
    const ty1 = Math.round(50 - 38*sizeScale); // top tip
    const ty2 = Math.round(50 + 38*sizeScale); // bottom edge
    return (
      <svg width={sz} height={sz} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        <polygon points={`50,${ty1} ${50+tx},${ty2} ${50-tx},${ty2}`} fill="none" stroke="#6366F1" strokeWidth={sw} strokeLinejoin="round"/>
      </svg>
    );
  }

  // Hexagon — size-aware via R
  if (lc.includes('hexagon')) {
    const hollow=lc.includes('hollow');
    const pts=Array.from({length:6},(_,i)=>{const a=-Math.PI/6+Math.PI*i/3;return `${50+R*Math.cos(a)},${50+R*Math.sin(a)}`;}).join(' ');
    return (
      <svg width={sz} height={sz} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        <polygon points={pts} fill={hollow?'none':'#E11D48'} stroke="#E11D48" strokeWidth={sw} strokeLinejoin="round"/>
      </svg>
    );
  }

  // Pentagon — size-aware via R
  if (lc.includes('pentagon')) {
    const hollow=lc.includes('hollow');
    const pts=Array.from({length:5},(_,i)=>{const a=-Math.PI/2+2*Math.PI*i/5;return `${50+R*Math.cos(a)},${50+R*Math.sin(a)}`;}).join(' ');
    return (
      <svg width={sz} height={sz} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        <polygon points={pts} fill={hollow?'none':'#EA580C'} stroke="#EA580C" strokeWidth={sw} strokeLinejoin="round"/>
      </svg>
    );
  }

  // Colored shapes: red_circle, blue_circle, red_square, *_dot
  const colorMap={red:'#DC2626',blue:'#6366F1',green:'#059669',yellow:'#F59E0B'};
  for(const [cn,ch] of Object.entries(colorMap)){
    if(!lc.startsWith(cn+'_'))continue;
    const rest=lc.slice(cn.length+1);
    const hollow=rest.includes('hollow');
    if(rest.startsWith('circle')||rest.startsWith('dot')){
      const cr = rest.startsWith('dot') ? Math.round(34*sizeScale) : R;
      return(
        <svg width={sz} height={sz} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
          <circle cx="50" cy="50" r={cr} fill={hollow?'none':ch} stroke={ch} strokeWidth={sw}/>
        </svg>
      );
    }
    if(rest.startsWith('square')){
      return(
        <svg width={sz} height={sz} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
          <rect x={50-HW} y={50-HW} width={HW*2} height={HW*2} rx="4" fill={hollow?'none':ch} stroke={ch} strokeWidth={sw}/>
        </svg>
      );
    }
  }

  // Star (plain, sm, md, lg, hollow) — size-aware via R
  if(lc.startsWith('star')){
    const hollow=lc.includes('hollow');
    const ir=R*0.4;
    const pts=Array.from({length:10},(_,i)=>{const a=-Math.PI/2+Math.PI*i/5;const rv=i%2===0?R:ir;return `${50+rv*Math.cos(a)},${50+rv*Math.sin(a)}`;}).join(' ');
    return(
      <svg width={sz} height={sz} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        <polygon points={pts} fill={hollow?'none':'#8B5CF6'} stroke="#8B5CF6" strokeWidth={sw} strokeLinejoin="round"/>
      </svg>
    );
  }

  // Cross / plus
  if(lc.startsWith('cross')){
    return(
      <svg width={sz} height={sz} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        <path d="M35,10 L65,10 L65,35 L90,35 L90,65 L65,65 L65,90 L35,90 L35,65 L10,65 L10,35 L35,35 Z"
          fill="#DC2626" stroke="rgba(255,255,255,0.4)" strokeWidth={sw} strokeLinejoin="round"/>
      </svg>
    );
  }

  // Heart
  if(lc.startsWith('heart')){
    return(
      <svg width={sz} height={sz} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        <path d="M50,85 C8,50 8,18 50,35 C92,18 92,50 50,85Z" fill="#E11D48" stroke="rgba(255,255,255,0.4)" strokeWidth={sw}/>
      </svg>
    );
  }

  // Diamond — size-aware via R
  if(lc.startsWith('diamond')){
    return(
      <svg width={sz} height={sz} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        <polygon points={`50,${50-R} ${50+R},50 50,${50+R} ${50-R},50`} fill="#059669" stroke="rgba(255,255,255,0.4)" strokeWidth={sw} strokeLinejoin="round"/>
      </svg>
    );
  }

  // Square / rectangle — size-aware via HW
  if(lc.startsWith('square')||lc.startsWith('rectangle')){
    const hollow=lc.includes('hollow');
    return(
      <svg width={sz} height={sz} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        <rect x={50-HW} y={50-HW} width={HW*2} height={HW*2} rx="4" fill={hollow?'none':'#D97706'} stroke="#D97706" strokeWidth={sw}/>
      </svg>
    );
  }

  // Triangle (generic) — size-aware
  if(lc.startsWith('triangle')){
    const hollow=lc.includes('hollow');
    const tx = Math.round(40 * sizeScale);
    const ty1 = Math.round(50 - 38*sizeScale); // top tip
    const ty2 = Math.round(50 + 38*sizeScale); // bottom edge
    return(
      <svg width={sz} height={sz} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        <polygon points={`50,${ty1} ${50+tx},${ty2} ${50-tx},${ty2}`} fill={hollow?'none':'#6366F1'} stroke="#6366F1" strokeWidth={sw} strokeLinejoin="round"/>
      </svg>
    );
  }

  // Circle (generic) — size-aware via R
  if(lc.startsWith('circle')||lc.startsWith('oval')){
    const hollow=lc.includes('hollow');
    return(
      <svg width={sz} height={sz} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        <circle cx="50" cy="50" r={R} fill={hollow?'none':'#0891B2'} stroke="#0891B2" strokeWidth={sw}/>
      </svg>
    );
  }

  // Sprite sheet fallback — check manifest before falling back to text chip
  const spriteInfo = lookupSprite(lc, spriteManifest);
  if (spriteInfo) return <SpriteToken token={lc} sz={sz} />;

  // Last resort: text chip label
  return <TextChip text={token.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase()).slice(0,20)} sz={sz}/>;
}

// Tiny helper for text label chips
function TextChip({text,sz}){
  return(
    <div style={{
      display:'inline-flex',alignItems:'center',justifyContent:'center',
      padding:'2px 7px',background:'#F5F5F4',
      border:`1.5px solid ${P.bdr}`,borderRadius:5,
      fontSize:Math.min(14,Math.max(9,sz*0.28)),fontWeight:700,
      color:P.ink,fontFamily:'system-ui',whiteSpace:'nowrap',
    }}>{text}</div>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
// MODULE A: PipeArray  "circle_md | star_md | triangle_md"
// ══════════════════════════════════════════════════════════════════════════════
export function PipeArray({ token, sz = 32, showNumbers = true }) {
  const parts = token.split(' | ').map(p=>p.trim()).filter(Boolean);
  // Each shape gets generous space: at least 60px, scale with sz
  const itemSz = Math.max(60, Math.round(sz / Math.max(parts.length, 1)));
  return(
    <div style={{
      display:'flex',alignItems:'center',justifyContent:'center',gap:8,
      width:'100%',height:'100%',
      flexWrap:'nowrap',
    }}>
      {parts.map((part,i)=>(
        <div key={i} style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:2,flex:'1 1 0%',minWidth:0,height:'100%'}}>
          <GsSymbolSVG token={part} sz={itemSz}/>
          {showNumbers&&(
            <span style={{fontSize:9,fontWeight:700,color:'#78716C',fontFamily:'system-ui',lineHeight:1}}>
              {i+1}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
// MODULE B: VsComparison  "A | B | C vs X | Y | Z"
// ══════════════════════════════════════════════════════════════════════════════
export function VsComparison({ token, sz = 32 }) {
  const vsIdx = token.toLowerCase().indexOf(' vs ');
  if(vsIdx===-1) return <PipeArray token={token} sz={sz} showNumbers={false}/>;
  const left  = token.slice(0,vsIdx).trim();
  const right = token.slice(vsIdx+4).trim();
  return(
    <div style={{
      display:'inline-flex',alignItems:'center',gap:8,
      padding:'6px 10px',background:'rgba(8,145,178,0.04)',
      border:`1px solid ${P.bdr}`,borderRadius:10,
    }}>
      <PipeArray token={left}  sz={sz} showNumbers={false}/>
      <span style={{fontSize:13,fontWeight:900,color:'#B45309',fontFamily:'system-ui',padding:'0 2px'}}>VS</span>
      <PipeArray token={right} sz={sz} showNumbers={false}/>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
// MODULE C: GsSymTarget  "gs_sym:TOKEN"
// ══════════════════════════════════════════════════════════════════════════════
export function GsSymTarget({ token, sz = 48 }) {
  const inner = token.startsWith('gs_sym:') ? token.slice(7) : token;
  return(
    <div style={{display:'inline-flex',flexDirection:'column',alignItems:'center',gap:4}}>
      <div style={{
        display:'flex',alignItems:'center',justifyContent:'center',
        width:sz+16,height:sz+16,
        background:'rgba(8,145,178,0.08)',
        border:`2.5px solid ${P.pri}`,borderRadius:12,
        boxShadow:'0 0 0 4px rgba(8,145,178,0.12)',
      }}>
        <GsSymbolSVG token={inner} sz={sz}/>
      </div>
      <span style={{fontSize:9,fontWeight:600,color:P.pri,fontFamily:'system-ui',textTransform:'uppercase',letterSpacing:'0.06em'}}>
        TARGET
      </span>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
// MODULE D: GsCodeTable  "gs_code:K-V | K-V"
// ⚠ Must be dispatched BEFORE PipeArray — also contains " | "
// Note: uses "-" as key→value separator (not "→") so the backend
// stimulus parser (which splits on "→") doesn't break the token.
// ══════════════════════════════════════════════════════════════════════════════
export function GsCodeTable({ token, sz = 36 }) {
  const inner = token.startsWith('gs_code:') ? token.slice(8) : token;
  const pairs = inner.split(' | ').map(p=>p.trim()).filter(Boolean);

  function renderSide(val){
    // Single uppercase letter, digit, or short numeric string → bold text
    if(/^[A-Z]$/.test(val)||/^\d+$/.test(val)){
      return(
        <span style={{
          fontSize:sz*0.55,fontWeight:900,color:P.ink,fontFamily:'system-ui',
          minWidth:sz*0.5,display:'inline-flex',alignItems:'center',justifyContent:'center',
        }}>{val}</span>
      );
    }
    // Unicode / non-word → symbol glyph
    if(/^[^\w]/.test(val)){
      return <span style={{fontSize:sz*0.65,lineHeight:1,fontFamily:'system-ui'}}>{val}</span>;
    }
    // Shape token
    return <GsSymbolSVG token={val} sz={Math.round(sz*0.8)}/>;
  }

  return(
    <div style={{
      display:'inline-flex',flexDirection:'column',gap:2,
      padding:'6px 10px',background:'rgba(217,119,6,0.05)',
      border:'1.5px solid #D97706',borderRadius:10,
    }}>
      <span style={{fontSize:9,fontWeight:700,color:'#92400E',fontFamily:'system-ui',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:2}}>
        CODE TABLE
      </span>
      <div style={{display:'flex',gap:6,flexWrap:'wrap',justifyContent:'center'}}>
        {pairs.map((pair,i)=>{
          const ai=pair.indexOf('-');
          if(ai===-1)return null;
          const from=pair.slice(0,ai).trim();
          const to=pair.slice(ai+1).trim();
          return(
            <div key={i} style={{
              display:'flex',alignItems:'center',gap:3,
              background:'white',border:`1px solid ${P.bdr}`,borderRadius:6,padding:'3px 5px',
            }}>
              {renderSide(from)}
              <span style={{fontSize:11,fontWeight:700,color:P.acc}}>→</span>
              {renderSide(to)}
            </div>
          );
        })}
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
// MODULE E: PosOrdinal  "pos:4" or "pos_4"
// ══════════════════════════════════════════════════════════════════════════════
export function PosOrdinal({ token, sz = 36 }) {
  // Accepts both "pos:4" (colon) and "pos_4" (underscore) formats
  const n = parseInt(token.replace(/^pos[_:]/,'').trim(),10);
  const ordinal = ORD[n]||`${n}th`;
  return(
    <div style={{
      display:'inline-flex',alignItems:'center',justifyContent:'center',
      minWidth:sz+16,height:sz+4,
      background:'rgba(8,145,178,0.1)',border:`2px solid ${P.pri}`,borderRadius:8,padding:'0 10px',
    }}>
      <span style={{fontSize:Math.max(14,sz*0.4),fontWeight:800,color:P.pri,fontFamily:'system-ui'}}>
        {ordinal}
      </span>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
// MODULE F: LabelToken  "label:Same"  "label:Different, position 3 changed"
// ══════════════════════════════════════════════════════════════════════════════
export function LabelToken({ token, sz = 36 }) {
  // slice(6) strips "label:", then trim() handles "label: Same" (space after colon)
  const text = (token.startsWith('label:') ? token.slice(6) : token).trim();
  const lc = text.toLowerCase();
  let bg='#F5F5F4',border=P.bdr,textColor=P.ink;
  if(lc==='same'){bg='rgba(5,150,105,0.08)';border='#059669';textColor='#065F46';}
  else if(lc.startsWith('different')||lc==='reversed'||lc==='reversed order'||lc==='reverse order'){
    bg='rgba(220,38,38,0.07)';border='#DC2626';textColor='#991B1B';
  } else if(lc==='cannot tell'||lc==='almost same'||lc==='similar but not same'){
    bg='rgba(217,119,6,0.07)';border='#D97706';textColor='#92400E';
  }
  return(
    <div style={{
      display:'inline-flex',alignItems:'center',justifyContent:'center',
      padding:'5px 12px',background:bg,border:`1.5px solid ${border}`,borderRadius:8,maxWidth:240,
    }}>
      <span style={{
        fontSize:Math.max(11,sz*0.28),fontWeight:700,color:textColor,
        fontFamily:'system-ui',textAlign:'center',lineHeight:1.3,whiteSpace:'nowrap',
      }}>{text}</span>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
// MAIN DISPATCHER — call at top of TokenRenderer, before all other checks
// ══════════════════════════════════════════════════════════════════════════════
export function GsTokenDispatch({ token, sz = 48 }) {
  if (!token || typeof token !== 'string') return null;
  const t = token.trim();

  if (t.startsWith('gs_sym:'))  return <GsSymTarget  token={t} sz={sz}/>;
  if (t.startsWith('gs_code:')) return <GsCodeTable  token={t} sz={sz}/>;
  if (t.startsWith('pos:') || t.startsWith('pos_'))
                                return <PosOrdinal   token={t} sz={sz}/>;
  if (t.startsWith('label:'))   return <LabelToken   token={t} sz={sz}/>;
  // VsComparison: "A vs B" or "A | B vs C | D" — pipe-groups on each side are optional
  if (/ vs /i.test(t))          return <VsComparison token={t} sz={sz}/>;
  if (t.includes(' | '))        return <PipeArray    token={t} sz={sz}/>;

  return null;
}

export default GsTokenDispatch;
