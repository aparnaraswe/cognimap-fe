/**
 * TOKEN RENDERERS
 * 
 * Handles ALL visual tokens in the assessment:
 * 1. Shape tokens (triangle_up, blueCircle, etc.) → SVG shapes
 * 2. img_ tokens (img_dots_7, img_bar_12, img_grid_6x6, etc.) → Visual representations
 * 3. Text tokens → Plain text display
 */

const COLORS = {
  blue:'#6366F1', red:'#DC2626', green:'#059669', yellow:'#F59E0B',
  purple:'#8B5CF6', orange:'#EA580C', cyan:'#0891B2', magenta:'#D946EF',
  darkBlue:'#3730A3', lightBlue:'#7DD3FC', darkblue:'#3730A3', lightblue:'#7DD3FC',
  dark:'#44403C', black:'#1C1917', white:'#FAFAF9',
};

const SHAPE_NAMES = ['triangle','circle','square','star','diamond','hexagon','pentagon','arrow','octagon','cross','dot','heart','oval','rectangle'];

// ── Parse a shape token string into components ──
function parseToken(token) {
  if (!token) return null;
  let t = token.trim();
  let shape = 'circle', color = null, rotation = 0, size = null, count = null;

  // Count prefix (oneTriangle, twoCircle)
  const countMap = { one:1, two:2, three:3, four:4, five:5 };
  const cm = t.match(/^(one|two|three|four|five)([A-Z]\w*)/);
  if (cm) { count = countMap[cm[1]]; t = cm[2]; }

  // Size prefix  
  const sm = t.match(/^(extraLarge|extra_large|small|medium|large)([A-Z]\w*)/);
  if (sm) { size = sm[1]; t = sm[2]; }

  // Color prefix
  for (const [c, hex] of Object.entries(COLORS)) {
    if (t.toLowerCase().startsWith(c.toLowerCase()) && t.length > c.length) {
      const rest = t.slice(c.length);
      if (rest[0] === rest[0]?.toUpperCase() || rest[0] === '_') {
        color = hex;
        t = rest.replace(/^_/, '');
        break;
      }
    }
  }

  // Shape
  const lc = (t.charAt(0).toLowerCase() + t.slice(1));
  const parts = lc.split('_');
  for (const s of SHAPE_NAMES) {
    if (parts[0] === s || parts[0] === s + 's') { shape = s; break; }
  }

  // Rotation suffix
  const rotMap = { up:0, right:90, down:180, left:270, top:0, bottom:180 };
  if (parts.length > 1) {
    const suffix = parts.slice(1).join('_');
    if (rotMap[suffix] !== undefined) rotation = rotMap[suffix];
    if (suffix === 'up_right') rotation = 45;
    if (suffix === 'down_left') rotation = 225;
  }

  return { shape, color, rotation, size, count };
}

// ── Draw an SVG shape ──
function drawShape(shape, sz, color, rotation) {
  const h = sz/2, sw = 2, fill = color || '#A8A29E', stroke = color ? 'rgba(255,255,255,0.3)' : '#78716C';
  let inner;

  switch(shape) {
    case 'triangle':
      inner = <polygon points={`${h},${sw+2} ${sz-sw-1},${sz-sw-1} ${sw+1},${sz-sw-1}`} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/>;
      break;
    case 'circle': case 'dot':
      inner = <circle cx={h} cy={h} r={h-sw-1} fill={fill} stroke={stroke} strokeWidth={sw}/>;
      break;
    case 'square': case 'rectangle':
      inner = <rect x={sw+1} y={sw+1} width={sz-sw*2-2} height={sz-sw*2-2} rx={3} fill={fill} stroke={stroke} strokeWidth={sw}/>;
      break;
    case 'diamond':
      inner = <polygon points={`${h},${sw+1} ${sz-sw-1},${h} ${h},${sz-sw-1} ${sw+1},${h}`} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/>;
      break;
    case 'star': {
      const pts = []; const or = h-sw-2, ir = or*0.4;
      for(let i=0;i<10;i++){const a=-Math.PI/2+Math.PI*i/5;const r=i%2===0?or:ir;pts.push(`${h+r*Math.cos(a)},${h+r*Math.sin(a)}`);}
      inner = <polygon points={pts.join(' ')} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/>;
      break;
    }
    case 'hexagon': {
      const pts=[];for(let i=0;i<6;i++){const a=-Math.PI/6+Math.PI*i/3;pts.push(`${h+(h-sw-2)*Math.cos(a)},${h+(h-sw-2)*Math.sin(a)}`);}
      inner = <polygon points={pts.join(' ')} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/>;
      break;
    }
    case 'pentagon': {
      const pts=[];for(let i=0;i<5;i++){const a=-Math.PI/2+2*Math.PI*i/5;pts.push(`${h+(h-sw-2)*Math.cos(a)},${h+(h-sw-2)*Math.sin(a)}`);}
      inner = <polygon points={pts.join(' ')} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/>;
      break;
    }
    case 'heart':
      inner = <path d={`M${h},${sz*0.8} C${sw},${h} ${sw},${sw+4} ${h},${h*0.6} C${sz-sw},${sw+4} ${sz-sw},${h} ${h},${sz*0.8}Z`} fill={fill} stroke={stroke} strokeWidth={sw}/>;
      break;
    case 'arrow':
      inner = <path d={`M${h},${sw+2} L${sz-sw-2},${h} L${h},${sz-sw-2} L${h},${h+4} L${sw+4},${h+4} L${sw+4},${h-4} L${h},${h-4} Z`} fill={fill} stroke={stroke} strokeWidth={sw}/>;
      break;
    case 'cross':
      const w3 = sz/3;
      inner = <path d={`M${w3},${sw} L${w3*2},${sw} L${w3*2},${w3} L${sz-sw},${w3} L${sz-sw},${w3*2} L${w3*2},${w3*2} L${w3*2},${sz-sw} L${w3},${sz-sw} L${w3},${w3*2} L${sw},${w3*2} L${sw},${w3} L${w3},${w3} Z`} fill={fill} stroke={stroke} strokeWidth={1.5}/>;
      break;
    default:
      inner = <circle cx={h} cy={h} r={h-sw-1} fill={fill} stroke={stroke} strokeWidth={sw}/>;
  }

  return (
    <svg width={sz} height={sz} viewBox={`0 0 ${sz} ${sz}`}>
      <g transform={rotation ? `rotate(${rotation},${h},${h})` : undefined}>{inner}</g>
    </svg>
  );
}

// ── Shape Token (non-img_) ──
export function ShapeToken({ token, sz = 40 }) {
  if (!token || token === '?') {
    return (
      <div className="flex items-center justify-center rounded-xl" 
        style={{ width: sz+16, height: sz+16, border: '2px dashed #B45309', background: 'rgba(180,83,9,0.04)' }}>
        <span className="text-display font-bold" style={{ fontSize: sz*0.45, color: '#B45309' }}>?</span>
      </div>
    );
  }
  const p = parseToken(token);
  if (!p) return <span className="text-xs font-mono" style={{ color: 'var(--ink-dim)' }}>{token}</span>;
  
  let actualSz = sz;
  if (p.size) {
    const m = { small: sz*0.55, medium: sz*0.75, large: sz, extraLarge: sz*1.15, extra_large: sz*1.15 };
    actualSz = m[p.size] || sz;
  }

  return (
    <div className="flex items-center justify-center">
      {drawShape(p.shape, actualSz, p.color, p.rotation)}
    </div>
  );
}

// ── EMOJI LOOKUP for img_ abstract tokens ──
const IMG_EMOJI = {
  dog:'🐕',puppy:'🐶',cat:'🐱',kitten:'🐈',bird:'🐦',fish:'🐟',
  book:'📖',ruler:'📏',clock:'🕐',camera:'📷',
  sun:'☀️',moon:'🌙',stars:'⭐',tree:'🌳',flower:'🌸',seed:'🌰',
  apple:'🍎',banana:'🍌',carrot:'🥕',
  hospital:'🏥',school:'🏫',ship:'🛳️',
  doctor:'👨‍⚕️',captain:'👨‍✈️',
  hot:'🌡️',cold:'🥶',
  iron:'⚙️',copper:'🔶',gold:'🥇',wood:'🪵',
  hypothesis:'💡',experiment:'🧪',catalyst:'⚡',
  symphony:'🎵',instrument:'🎸',conductor:'🎼',
  democracy:'🏛️',monarchy:'👑',geography:'🗺️',
  telescope:'🔭',lens:'🔍',
  scale:'⚖️',thermometer:'🌡️',
  hammer:'🔨',saw:'🪚',
  cube:'🧊',pyramid:'🔺',prism:'🔷',cylinder:'🫙',cone:'📐',
};

// ── Image Token Renderer ──
export function ImgToken({ token, sz = 56 }) {
  if (!token || !token.startsWith('img_')) return null;
  const clean = token.slice(4); // remove 'img_'

  // Dot arrays: img_dots_N
  const dotsMatch = clean.match(/^dots_(\d+)/);
  if (dotsMatch) {
    const n = parseInt(dotsMatch[1]);
    const cols = Math.min(Math.ceil(Math.sqrt(n)), 8);
    return (
      <div className="flex flex-col items-center gap-1 p-2 rounded-xl" style={{ background: 'rgba(180,83,9,0.04)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 10px)`, gap: 3 }}>
          {Array.from({length: Math.min(n, 64)}).map((_, i) => (
            <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: '#D97706' }} />
          ))}
        </div>
        <span className="text-[10px] font-semibold" style={{ color: 'var(--ink-dim)' }}>{n}</span>
      </div>
    );
  }

  // Bar charts: img_bar_N
  const barMatch = clean.match(/^bar_(\d+\.?\d*)/);
  if (barMatch) {
    const n = parseFloat(barMatch[1]);
    const h = Math.max(8, Math.min(56, n * 0.6));
    return (
      <div className="flex flex-col items-center justify-end gap-1 p-2 rounded-xl" style={{ background: 'rgba(180,83,9,0.04)', border: '1px solid var(--border)', minHeight: 60 }}>
        <div style={{ width: 20, height: h, background: 'linear-gradient(to top, #B45309, #F59E0B)', borderRadius: '3px 3px 0 0' }} />
        <span className="text-[10px] font-mono font-semibold" style={{ color: 'var(--ink-dim)' }}>{n}</span>
      </div>
    );
  }

  // Coins: img_coins_N
  const coinsMatch = clean.match(/^coins_(\d+)/);
  if (coinsMatch) {
    const n = parseInt(coinsMatch[1]);
    return (
      <div className="flex flex-col items-center gap-1 p-2 rounded-xl" style={{ background: 'rgba(180,83,9,0.04)', border: '1px solid var(--border)' }}>
        <div className="flex flex-wrap gap-0.5 justify-center" style={{ maxWidth: 60 }}>
          {Array.from({length: Math.min(n, 12)}).map((_, i) => <span key={i} style={{ fontSize: 11 }}>🪙</span>)}
        </div>
        <span className="text-[10px] font-semibold" style={{ color: 'var(--ink-dim)' }}>{n} coins</span>
      </div>
    );
  }

  // Blocks: img_blocks_N
  const blocksMatch = clean.match(/^blocks_(\d+)/);
  if (blocksMatch) {
    const n = parseInt(blocksMatch[1]);
    const cols = Math.min(Math.ceil(Math.sqrt(n)), 6);
    return (
      <div className="flex flex-col items-center gap-1 p-2 rounded-xl" style={{ background: 'rgba(180,83,9,0.04)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 9px)`, gap: 2 }}>
          {Array.from({length: Math.min(n, 36)}).map((_, i) => (
            <div key={i} style={{ width: 9, height: 9, background: '#0891B2', borderRadius: 1.5 }} />
          ))}
        </div>
        <span className="text-[10px] font-semibold" style={{ color: 'var(--ink-dim)' }}>{n}</span>
      </div>
    );
  }

  // Answer labels: img_answer_X
  const answerMatch = clean.match(/^answer_(.+)/);
  if (answerMatch) {
    const val = answerMatch[1].replace(/_/g, ' ');
    return (
      <div className="flex items-center justify-center px-3 py-1.5 rounded-lg" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
        <span className="font-mono font-bold text-sm" style={{ color: 'var(--ink)' }}>{val}</span>
      </div>
    );
  }

  // Grid for Gs: img_grid_NxN
  const gridMatch = clean.match(/^grid_(\d+)x(\d+)/);
  if (gridMatch) {
    const rows = Math.min(parseInt(gridMatch[1]), 10);
    const cols = Math.min(parseInt(gridMatch[2]), 10);
    const symbols = ['★','☆','▲','△','■','□','●','○','♦','♣','♥','♠'];
    // Use a seeded random for consistency
    const cells = [];
    let seed = rows * 1000 + cols;
    for (let i = 0; i < rows * cols; i++) {
      seed = (seed * 9301 + 49297) % 233280;
      cells.push(symbols[seed % symbols.length]);
    }
    return (
      <div className="p-2 rounded-xl" style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 18px)`, gap: 1, fontFamily: 'monospace', fontSize: 11, lineHeight: '18px', textAlign: 'center' }}>
          {cells.map((s, i) => <div key={i}>{s}</div>)}
        </div>
      </div>
    );
  }

  // Scale/balance: img_scale_*
  if (clean.startsWith('scale')) {
    return (
      <div className="flex flex-col items-center gap-1 p-2 rounded-xl" style={{ background: 'rgba(180,83,9,0.04)', border: '1px solid var(--border)' }}>
        <span style={{ fontSize: 28 }}>⚖️</span>
        <span className="text-[9px] font-semibold text-center" style={{ color: 'var(--ink-dim)', maxWidth: 70 }}>{clean.replace(/scale_?/, '').replace(/_/g, ' ')}</span>
      </div>
    );
  }

  // Complex patterns for Gv (SVG)
  if (clean.includes('complex') || clean.includes('pattern') || clean.includes('figure')) {
    return (
      <div className="flex flex-col items-center gap-1 p-2 rounded-xl" style={{ background: 'rgba(8,145,178,0.04)', border: '1px solid var(--border)' }}>
        <svg width="44" height="44" viewBox="0 0 44 44">
          <circle cx="22" cy="22" r="18" fill="none" stroke="#0891B2" strokeWidth="1.5" opacity="0.5"/>
          <polygon points="22,6 40,34 4,34" fill="none" stroke="#6366F1" strokeWidth="1.5" opacity="0.5"/>
          <rect x="10" y="10" width="24" height="24" fill="none" stroke="#059669" strokeWidth="1.5" opacity="0.3" rx="2"/>
        </svg>
        <span className="text-[9px] font-semibold text-center" style={{ color: 'var(--ink-dim)', maxWidth: 70 }}>{clean.replace(/_/g, ' ').slice(0, 20)}</span>
      </div>
    );
  }

  // Missing piece tokens (figure completion)
  if (clean.includes('missing')) {
    return (
      <div className="flex flex-col items-center gap-1 p-2 rounded-xl" style={{ background: 'rgba(8,145,178,0.04)', border: '1px solid var(--border)' }}>
        <svg width="40" height="40" viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="16" fill="none" stroke="#0891B2" strokeWidth="2" strokeDasharray="70 25"/>
        </svg>
        <span className="text-[9px] font-semibold text-center" style={{ color: 'var(--ink-dim)', maxWidth: 70 }}>{clean.replace(/_/g, ' ').slice(0, 20)}</span>
      </div>
    );
  }

  // 3D objects
  if (clean.startsWith('3d') || clean.startsWith('solid') || clean.startsWith('cube') || clean.startsWith('prism') || clean.startsWith('pyramid') || clean.startsWith('net_')) {
    return (
      <div className="flex flex-col items-center gap-1 p-2 rounded-xl" style={{ background: 'rgba(8,145,178,0.04)', border: '1px solid var(--border)' }}>
        <svg width="44" height="44" viewBox="0 0 44 44">
          <polygon points="22,4 40,18 32,40 12,40 4,18" fill="none" stroke="#0891B2" strokeWidth="1.5"/>
          <line x1="22" y1="4" x2="22" y2="28" stroke="#0891B2" strokeWidth="1" opacity="0.4"/>
        </svg>
        <span className="text-[9px] font-semibold text-center" style={{ color: 'var(--ink-dim)', maxWidth: 70 }}>{clean.replace(/_/g, ' ').slice(0, 20)}</span>
      </div>
    );
  }

  // Graph/chart tokens
  if (clean.includes('graph') || clean.includes('parabola') || clean.includes('line_') || clean.includes('scatter') || clean.includes('histogram') || clean.includes('boxplot')) {
    return (
      <div className="flex flex-col items-center gap-1 p-2 rounded-xl" style={{ background: 'rgba(217,119,6,0.04)', border: '1px solid var(--border)' }}>
        <svg width="44" height="44" viewBox="0 0 44 44">
          <line x1="6" y1="38" x2="6" y2="4" stroke="var(--ink-faint)" strokeWidth="1"/>
          <line x1="6" y1="38" x2="40" y2="38" stroke="var(--ink-faint)" strokeWidth="1"/>
          <path d="M8,36 Q20,4 38,36" fill="none" stroke="#D97706" strokeWidth="2"/>
        </svg>
        <span className="text-[9px] font-semibold text-center" style={{ color: 'var(--ink-dim)', maxWidth: 70 }}>{clean.replace(/_/g, ' ').slice(0, 20)}</span>
      </div>
    );
  }

  // Venn diagram
  if (clean.startsWith('venn')) {
    return (
      <div className="flex flex-col items-center gap-1 p-2 rounded-xl" style={{ background: 'rgba(217,119,6,0.04)', border: '1px solid var(--border)' }}>
        <svg width="44" height="44" viewBox="0 0 44 44">
          <circle cx="17" cy="19" r="12" fill="none" stroke="#DC2626" strokeWidth="1.5" opacity="0.6"/>
          <circle cx="27" cy="19" r="12" fill="none" stroke="#6366F1" strokeWidth="1.5" opacity="0.6"/>
          <circle cx="22" cy="28" r="12" fill="none" stroke="#059669" strokeWidth="1.5" opacity="0.6"/>
        </svg>
        <span className="text-[9px] font-semibold" style={{ color: 'var(--ink-dim)' }}>Venn</span>
      </div>
    );
  }

  // Tree diagram
  if (clean.startsWith('tree')) {
    return (
      <div className="flex flex-col items-center gap-1 p-2 rounded-xl" style={{ background: 'rgba(217,119,6,0.04)', border: '1px solid var(--border)' }}>
        <svg width="44" height="44" viewBox="0 0 44 44">
          <circle cx="22" cy="8" r="4" fill="#D97706"/>
          <line x1="22" y1="12" x2="12" y2="24" stroke="var(--ink-faint)" strokeWidth="1"/>
          <line x1="22" y1="12" x2="32" y2="24" stroke="var(--ink-faint)" strokeWidth="1"/>
          <circle cx="12" cy="27" r="3" fill="#D97706" opacity="0.7"/>
          <circle cx="32" cy="27" r="3" fill="#D97706" opacity="0.7"/>
          <line x1="12" y1="30" x2="7" y2="39" stroke="var(--ink-faint)" strokeWidth="1"/>
          <line x1="12" y1="30" x2="17" y2="39" stroke="var(--ink-faint)" strokeWidth="1"/>
          <line x1="32" y1="30" x2="27" y2="39" stroke="var(--ink-faint)" strokeWidth="1"/>
          <line x1="32" y1="30" x2="37" y2="39" stroke="var(--ink-faint)" strokeWidth="1"/>
        </svg>
        <span className="text-[9px] font-semibold" style={{ color: 'var(--ink-dim)' }}>P-tree</span>
      </div>
    );
  }

  // Emoji fallback
  const key = clean.split('_')[0];
  const emoji = IMG_EMOJI[key] || IMG_EMOJI[clean] || '📎';
  return (
    <div className="flex flex-col items-center gap-1 p-2 rounded-xl" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
      <span style={{ fontSize: 24 }}>{emoji}</span>
      <span className="text-[9px] font-semibold text-center" style={{ color: 'var(--ink-dim)', maxWidth: 70 }}>{clean.replace(/_/g, ' ').slice(0, 25)}</span>
    </div>
  );
}

// ── Universal Token Renderer ──
export default function TokenRenderer({ token, sz = 40 }) {
  if (!token || token === '') return null;
  if (token === '?' || token === null) return <ShapeToken token="?" sz={sz} />;
  if (typeof token === 'string' && token.startsWith('img_')) return <ImgToken token={token} sz={sz} />;
  return <ShapeToken token={token} sz={sz} />;
}
