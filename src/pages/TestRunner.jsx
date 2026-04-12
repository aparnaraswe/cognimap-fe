import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import TokenRenderer, { ShapeToken, ImgToken, PosToken, RatioToken, GlobalSvgDefs } from '../components/TokenRenderer';
import MissingTokensPanel from '../components/MissingTokensPanel';
import PersonalityGameItem from '../components/PersonalityGameItem';

// ═══════════════════════════════════════════════════════════════════════════════
// COGNIMAP UNIVERSAL TEST RENDERER v5.0
// ═══════════════════════════════════════════════════════════════════════════════
// Supports ALL domains: Gf, Gv, Gs, Gc, Gq, Gwm
// Display modes: matrix | linear | reflection | odd_one_out | text | text_passage
//                | image_single | image_compare | memory_reveal
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════
// DOMAIN METADATA (ALL 6 CHC DOMAINS)
// ═══════════════════════════════════════════
const DOMAIN_META = {
  gf:  { icon: '🧩', label: 'Pattern Reasoning',  color: '#6366F1', desc: 'Find the pattern and choose what comes next.' },
  gv:  { icon: '👁',  label: 'Visual Spatial',     color: '#0891B2', desc: 'Analyse shapes and spatial arrangements.' },
  gq:  { icon: '🔢', label: 'Quantitative',       color: '#D97706', desc: 'Solve number patterns and math problems.' },
  gc:  { icon: '💬', label: 'Verbal Reasoning',   color: '#059669', desc: 'Read carefully and choose the best answer.' },
  gs:  { icon: '⚡', label: 'Processing Speed',   color: '#DC2626', desc: 'Answer as quickly and accurately as you can!' },
  gwm: { icon: '🧠', label: 'Working Memory',     color: '#8B5CF6', desc: 'Remember what you see and hear, then answer.' },
};

// Per-domain introduction instructions shown on DomainIntro screen
const DOMAIN_INSTRUCTIONS = {
  gf:  'You will see patterns made of shapes or images. Find the rule and pick what comes next or fills the gap.',
  gv:  'You will see shapes, rotations and spatial puzzles. Analyse how objects look from different angles.',
  gq:  'You will solve maths questions. Some use numbers and text, others use pictures like clocks or charts.',
  gc:  'You will answer vocabulary, general knowledge and reading questions. Read each question carefully.',
  gs:  'Speed matters here! Match symbols and spot differences as fast as you can.',
  gwm: 'You will be shown something to remember — numbers, letters or pictures. Then you will answer from memory.',
};

const GUIDE_MESSAGES = {
  correct: [
    "Brilliant! You shattered that challenge! ✨",
    "Quest mastered! The pattern bows to you! 🏆",
    "Incredible! Your mind sees what others miss! 🌟",
    "Flawless! The ancient puzzle crumbles! 🧙",
  ],
  wrong: [
    "Not quite — but every hero learns from battle! 🛡",
    "Almost! Study the answer — it will serve you! 📖",
    "The pattern hid well this time — onwards! ⚔️",
    "Even wizards stumble. Rise and continue! 🧙",
  ],
  timeout: [
    "The clock ran out — but your quest continues! ⚔️",
    "Time flies in the realm of patterns! Press on! ⏱",
  ],
};

// Practice-specific guide messages
const PRACTICE_MESSAGES = {
  correct: [
    "Great job! You've got the hang of it! 🎯",
    "Perfect! That's exactly how these work! ✅",
  ],
  wrong: [
    "No worries — this is just practice! Let's keep going. 💪",
    "Practice makes perfect! You'll get the next one. 🌱",
  ],
  timeout: [
    "Don't worry about the clock during practice! Let's continue. ⏳",
  ],
};

function shuffle(arr) {
  const a = [...arr]; let i = a.length;
  while (i--) { const j = 0 | Math.random() * (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function randomGuide(type, isPractice) {
  const msgs = isPractice ? PRACTICE_MESSAGES[type] : GUIDE_MESSAGES[type];
  return msgs[Math.floor(Math.random() * msgs.length)];
}

// ═══════════════════════════════════════════
// DIFFICULTY LEVEL DISPLAY HELPER
// ═══════════════════════════════════════════
const DIFFICULTY_DISPLAY = { easy: 1, medium: 2, hard: 3, very_hard: 4 };
function getDifficultyLevel(diff) {
  if (typeof diff === 'number') return diff;
  return DIFFICULTY_DISPLAY[diff] ?? diff;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RENDER-MODE RESOLVER — the single source of truth for how an item renders
// ═══════════════════════════════════════════════════════════════════════════════
// This replaces the old hardcoded isVisualDomain check.
// It reads item.displayMode from the API (which maps to Excel col I "Display Mode")
// and returns a render category that drives which component is used.
//
// Return values:
//   'visual_grid'      → matrix grid (2×2, 3×3, etc.)
//   'visual_linear'    → linear sequence with arrows
//   'visual_reflection'→ analogy A:B :: C:?
//   'visual_odd_one'   → odd-one-out row
//   'visual_single'    → single uploaded image as stimulus
//   'visual_compare'   → two images side by side
//   'text'             → pure text prompt + text options
//   'text_passage'     → reading passage above question
//   'memory_reveal'    → show-then-hide for working memory
//   'gs_speed'         → processing speed special layout
// ═══════════════════════════════════════════════════════════════════════════════
function resolveRenderMode(item) {
  if (!item) return 'text';
  const dm = (item.displayMode || '').toLowerCase().trim();
  console.log("dmdmdmdmdmdmdmdm", dm)
  // Explicit display modes from Excel
  if (dm === 'matrix')         return 'visual_grid';
  if (dm === 'linear')         return 'visual_linear';
  if (dm === 'reflection')     return 'visual_reflection';
  if (dm === 'odd_one_out')    return 'visual_odd_one';
  if (dm === 'image_single')   return 'visual_single';
  if (dm === 'image_compare')  return 'visual_compare';
  if (dm === 'text')           return 'text';
  if (dm === 'text_passage')   return 'text_passage';
  if (dm === 'memory_reveal')  return 'memory_reveal';
  if (dm === 'sequential')     return 'memory_reveal';
  // Gwm domain always uses memory reveal (show-then-hide pattern)
  if (item.domain === 'gwm')   return 'memory_reveal';

  // Fallback: auto-detect from content when displayMode is missing or 'image'/'mixed'
  const seq = item.sequence || [];
  const opts = item.options || [];
  const hasExcelImg = seq.some(s => s && String(s).startsWith('excel_img:')) ||
                      opts.some(o => String(o.value || '').startsWith('excel_img:'));
  const hasImgToken = seq.some(s => s && String(s).startsWith('img_')) ||
                      opts.some(o => String(o.value || '').startsWith('img_'));
  const hasPosToken = opts.some(o => String(o.value || '').startsWith('pos_'));
  const hasShapeToken = seq.some(s => s && !String(s).startsWith('img_') && !String(s).startsWith('excel_img:') &&
                        String(s).includes('_') && String(s).length < 40 && !/\s/.test(String(s)));

  // Gs domain always gets speed layout
  // if (item.domain === 'gs') return 'gs_speed';

  // If we detect image content, route to visual
  if (hasExcelImg || hasImgToken) {
    if (seq.length === 1) return 'visual_single';
    if (dm === 'image' || dm === 'mixed') return 'visual_linear';
    return 'visual_linear';
  }
  if (hasPosToken || hasShapeToken) return 'visual_linear';

  // Default fallback
  return 'text';
}

// Helper: is the render mode a visual mode?
// gs_speed only affects the stimulus display — options use their own token type detection
function isVisualMode(mode) {
  return mode.startsWith('visual_');
}

// ═══════════════════════════════════════════
// STAR BACKGROUND
// ═══════════════════════════════════════════
function StarField({ count = 40 }) {
  const [stars] = useState(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 85,
      size: Math.random() * 2.2 + 0.6,
      delay: Math.random() * 3,
      dur: 2 + Math.random() * 3,
    }))
  );
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {stars.map(s => (
        <div key={s.id} className="absolute rounded-full bg-white"
          style={{
            left: `${s.x}%`, top: `${s.y}%`,
            width: s.size, height: s.size,
            opacity: 0.5,
            animation: `twinkle ${s.dur}s ease-in-out ${s.delay}s infinite alternate`,
          }} />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════
// MOUNTAIN SILHOUETTE
// ═══════════════════════════════════════════
function Mountains() {
  return (
    <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{ height: '38%', zIndex: 0 }}>
      <svg viewBox="0 0 1200 220" preserveAspectRatio="none" className="w-full h-full">
        <polygon points="0,220 0,130 120,70 280,110 420,50 580,90 720,35 880,75 1020,55 1200,95 1200,220" fill="#041e0f" opacity="0.9" />
        <polygon points="0,220 0,160 100,120 240,140 380,100 520,130 680,90 820,120 980,95 1200,115 1200,220" fill="#021208" opacity="0.97" />
      </svg>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VISUAL SEQUENCE DISPLAY — handles matrix, linear, reflection, odd_one_out
// ═══════════════════════════════════════════════════════════════════════════════
function SequenceDisplay({ item, answered, answerToken, renderMode }) {
  const seq = item.sequence || [];

  const isImg = seq.some(s => s && (String(s).startsWith('img_') || String(s).startsWith('pos_') || String(s).startsWith('excel_img:')));
  const hasExcelImg = seq.some(s => s && String(s).startsWith('excel_img:'));
  const isSingleExcelImg = seq.filter(Boolean).length === 1 && hasExcelImg;

  // Stimulus SVGs are often wide rectangles (480x140, 656x150, etc.)
  // So stimulus containers should NOT be forced square — let SVG fill width
  const stimCardStyle = {
    border: '1px solid #e8eaf0',
    background: '#ffffff',
    borderRadius: 14,
    overflow: 'hidden',
    padding: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    maxWidth: '100%',
    maxHeight: '100%',
    boxSizing: 'border-box',
  };

  const questionMark = <span style={{ fontSize: 28, fontWeight: 900, color: '#6366F1', fontFamily: "'Fredoka One', cursive" }}>?</span>;
  const blankCardStyle = {
    ...stimCardStyle,
    background: '#eef2ff',
    border: '2px dashed #a5b4fc',
  };

  // ── Helper: render a single stimulus SVG full-width ──
  // Most stimulus SVGs are wide images (480x140, 656x150, etc.)
  // They should fill the available width, not be crammed into tiny square boxes
  const renderStimCard = (token, isBlank = false) => {
    if (isBlank && !answered) {
      return (
        <div style={blankCardStyle}>
          {questionMark}
        </div>
      );
    }
    const t = isBlank && answered ? answerToken : token;
    return (
      <div style={stimCardStyle}>
        <TokenRenderer token={t} sz={400} card={hasExcelImg} />
      </div>
    );
  };
  // ── Gs (Processing Speed) ──
  if (renderMode === 'gs_speed') {
    const gsSeq = seq.filter(Boolean).map(String);
    const gsHasImg = gsSeq.some(s => s.startsWith('excel_img:'));
    if (gsHasImg) {
      return (
        <div style={{ position: 'absolute', inset: 0, background: '#ffffff', border: '1px solid #e8eaf0', borderRadius: 14, padding: 8, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <TokenRenderer token={gsSeq[0]} sz={600} card />
        </div>
      );
    }
    // Token-based stimulus (gs_sym: or bare shape token) — compact layout
    const gsStim = gsSeq.join(' | ');
    return (
      <div className="flex items-center justify-center mb-5 px-2 py-4 rounded-2xl"
        style={{ border: '1.5px solid #e2e8f0', background: '#f8fafc', minHeight: 88 }}>
        <TokenRenderer token={gsStim} sz={64} />
      </div>
    );
  }

  // ── For excel_img stimuli: show ONLY the stim SVG image(s) — ignore shape tokens and nulls ──
  // The stim SVG already contains the full visual layout (shapes, grid, etc.)
  if (hasExcelImg) {
    // Filter to only excel_img tokens — shape tokens and nulls are part of the SVG already
    const imgTokens = seq.filter(s => s && String(s).startsWith('excel_img:'));
    if (imgTokens.length <= 1) {
      // Single stim image — fills the entire card
      return (
        <div style={{ position: 'absolute', inset: 0, background: '#ffffff', border: '1px solid #e8eaf0', borderRadius: 14, padding: 10, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <TokenRenderer token={imgTokens[0] || seq.find(s => s !== null)} sz={600} card />
        </div>
      );
    }
    // Multiple stim images — horizontal row, each fills equal share of width
    return (
      <div style={{ position: 'absolute', inset: 6, display: 'flex', flexDirection: 'row', alignItems: 'stretch', gap: 8 }}>
        {seq.map((val, i) => {
          const isBlank = val === null;
          const isBlankUnanswered = isBlank && !answered;
          const token = isBlank && answered ? answerToken : val;
          return (
            <div key={i} style={{ flex: '1 1 0%', minWidth: 0, position: 'relative' }}>
              <div style={{
                position: 'absolute', inset: 0,
                border: isBlankUnanswered ? '2px dashed #a5b4fc' : '1.5px solid #e8eaf0',
                background: isBlankUnanswered ? '#eef2ff' : '#ffffff',
                borderRadius: 14, overflow: 'hidden', boxSizing: 'border-box',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}>
                {isBlankUnanswered
                  ? <span style={{ fontSize: 28, fontWeight: 900, color: '#6366F1', fontFamily: "'Fredoka One', cursive" }}>?</span>
                  : token && <TokenRenderer token={token} sz={400} card />}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ── MATRIX MODE — absolute-fills stim-inner; each cell uses stim-cell for edge-to-edge image fill ──
  if (renderMode === 'visual_grid') {
    const seqLen = seq.length;
    let gridCols = 2;
    if (seqLen === 9 || seqLen === 6) gridCols = 3;
    else if (seqLen === 16) gridCols = 4;
    const gridRows = Math.ceil(seqLen / gridCols);
    return (
      <div style={{
        position: 'absolute', inset: 6,
        display: 'grid',
        gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
        gridTemplateRows: `repeat(${gridRows}, 1fr)`,
        gap: 8,
        boxSizing: 'border-box',
      }}>
        {seq.map((val, i) => {
          const isBlank = val === null && !answered;
          const content = val === null ? answerToken : val;
          return (
            <div key={i} style={{
              position: 'relative', overflow: 'hidden',
              border: isBlank ? '2px dashed #a5b4fc' : '1.5px solid #e8eaf0',
              background: isBlank ? '#eef2ff' : '#ffffff',
              borderRadius: 12, boxSizing: 'border-box',
              boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            }}>
              {isBlank
                ? <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>{questionMark}</div>
                : <div className="stim-cell"><TokenRenderer token={content} sz={400} /></div>}
            </div>
          );
        })}
      </div>
    );
  }

  // ── Helper: renders one cell that absolute-fills its flex-1 parent ──
  // Uses stim-cell for edge-to-edge image fill (max-width/max-height constrain sprites; excel_img fills fully)
  const seqCell = (val, i, isBlankSlot = false) => {
    const isBlank = isBlankSlot && !answered;
    const content = isBlankSlot && answered ? answerToken : val;
    return (
      <div key={i} style={{ flex: '1 1 0%', minWidth: 0, position: 'relative' }}>
        <div style={{
          position: 'absolute', inset: 0,
          border: isBlank ? '2px dashed #a5b4fc' : '1.5px solid #e8eaf0',
          background: isBlank ? '#eef2ff' : '#ffffff',
          borderRadius: 14, overflow: 'hidden', boxSizing: 'border-box',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}>
          {isBlank
            ? <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>{questionMark}</div>
            : <div className="stim-cell"><TokenRenderer token={content} sz={400} /></div>}
        </div>
      </div>
    );
  };

  // ── ODD ONE OUT (non-image tokens) ──
  if (renderMode === 'visual_odd_one') {
    return (
      <div style={{ position: 'absolute', inset: 6, display: 'flex', flexDirection: 'row', alignItems: 'stretch', gap: 8 }}>
        {seq.map((val, i) => seqCell(val, i, false))}
      </div>
    );
  }

  // ── REFLECTION / ANALOGY (non-image tokens) ──
  if (renderMode === 'visual_reflection') {
    const leftPair = seq.slice(0, 2);
    const rightPair = seq.slice(2);
    return (
      <div style={{ position: 'absolute', inset: 6, display: 'flex', flexDirection: 'row', alignItems: 'stretch', gap: 6 }}>
        {leftPair.map((val, i) => seqCell(val, i))}
        {/* divider */}
        <div style={{ width: 2, flexShrink: 0, alignSelf: 'stretch', background: '#e2e8f0', borderRadius: 2 }} />
        {rightPair.map((val, i) => {
          const isBlank = val === null;
          return seqCell(val, i + 2, isBlank);
        })}
      </div>
    );
  }

  // ── DEFAULT: LINEAR (non-image tokens) ──
  return (
    <div style={{ position: 'absolute', inset: 6, display: 'flex', flexDirection: 'row', alignItems: 'stretch', gap: seq.length > 6 ? 5 : 8 }}>
      {seq.map((val, i) => {
        const isBlank = val === null;
        return seqCell(val, i, isBlank);
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// IMAGE STIMULUS DISPLAY — for image_single and image_compare
// ═══════════════════════════════════════════════════════════════════════════════
// Renders uploaded PNGs (excel_img: or img_ references) as large centered images.
// Used for Gq clocks, fraction circles, pictographs, and any domain with custom PNGs.
function ImageStimulusDisplay({ item, answered, answerToken, renderMode }) {
  const seq = item.sequence || [];
  const cleanCard = {
    border: '1px solid #e8eaf0',
    background: '#ffffff',
    borderRadius: 18,
  };

  if (renderMode === 'visual_compare') {
    const img1 = seq[0] || null;
    const img2 = seq[1] || null;
    return (
      <div className="flex items-center gap-3 justify-center p-3 rounded-2xl" style={{ ...cleanCard, width: '100%', height: '100%', boxSizing: 'border-box' }}>
        {img1 && (
          <div className="flex items-center justify-center rounded-xl"
            style={{ background: '#ffffff', flex: '1 1 0%', height: '100%', maxHeight: '100%', overflow: 'hidden', border: '1px solid #e8eaf0', padding: 6 }}>
            <TokenRenderer token={img1} sz={300} card />
          </div>
        )}
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <div className="w-px h-6" style={{ background: '#e2e8f0' }} />
          <span className="text-[10px] font-black" style={{ color: '#6366F1' }}>VS</span>
          <div className="w-px h-6" style={{ background: '#e2e8f0' }} />
        </div>
        {img2 && (
          <div className="flex items-center justify-center rounded-xl"
            style={{ background: '#ffffff', flex: '1 1 0%', height: '100%', maxHeight: '100%', overflow: 'hidden', border: '1px solid #e8eaf0', padding: 6 }}>
            <TokenRenderer token={img2} sz={300} card />
          </div>
        )}
      </div>
    );
  }

  // image_single — one large centered image, fills available space
  const imgToken = seq.find(s => s && (String(s).startsWith('excel_img:') || String(s).startsWith('img_'))) || seq[0];
  return (
    <div className="flex items-center justify-center p-3 rounded-2xl" style={{ ...cleanCard, width: '100%', height: '100%', boxSizing: 'border-box' }}>
      <div className="flex items-center justify-center rounded-xl"
        style={{ background: '#ffffff', width: '100%', height: '100%', overflow: 'hidden', border: '1px solid #e8eaf0', padding: 8 }}>
        {imgToken
          ? <TokenRenderer token={imgToken} sz={400} card />
          : <div className="text-center" style={{ color: 'rgba(0,0,0,0.25)' }}>
              <div style={{ fontSize: 40 }}>🖼️</div>
              <div className="text-xs mt-2 font-bold">No image</div>
            </div>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEXT ITEM DISPLAY — for text and text_passage display modes
// ═══════════════════════════════════════════════════════════════════════════════
// Handles Gc vocabulary, word classification, reading comprehension,
// Gq arithmetic (text-only), Gwm text recall, verbal analogies, etc.
function TextItemDisplay({ item, renderMode }) {
  const seq = item.sequence;
  const seqStr = Array.isArray(seq) ? seq.filter(Boolean).join(' → ') : String(seq || '');
  const cardStyle = {
    background: '#f8fafc',
    border: '1.5px solid #e2e8f0',
    borderRadius: 14,
  };

  // text_passage: show reading passage in a scrollable card, then question below
  if (renderMode === 'text_passage') {
    // The passage is in sequence/stimulus, the question is in prompt
    const passage = seqStr || '';
    if (!passage) return null;
    return (
      <div className="mb-5">
        <div className="text-[10px] font-black uppercase tracking-widest mb-2"
          style={{ color: '#94a3b8' }}>
          📖 Read the passage
        </div>
        <div className="p-5 rounded-2xl text-sm leading-relaxed overflow-y-auto"
          style={{
            ...cardStyle,
            color: '#374151',
            maxHeight: 260,
            lineHeight: '1.75',
          }}>
          {passage}
        </div>
      </div>
    );
  }

  // Regular text: show stimulus if present
  if (!seqStr) return null;

  // Check if it's a template placeholder (no real content yet)
  if (/\b\w+\s+stimulus:\s*\w+/i.test(seqStr.trim())) {
    return (
      <div className="mb-5 flex flex-col items-center justify-center gap-3 py-7 px-5 rounded-2xl"
        style={{
          background: '#fffbeb',
          border: '1.5px dashed #FDE68A',
          borderRadius: 18,
        }}>
        <div style={{ fontSize: 36 }}>🖼️</div>
        <div className="text-sm font-bold text-center" style={{ color: '#D97706' }}>
          Visual content pending
        </div>
        <div className="text-xs text-center leading-relaxed" style={{ color: '#92400e', opacity: 0.7, maxWidth: 260 }}>
          The image for this question hasn't been uploaded yet.
        </div>
      </div>
    );
  }

  // Analogy format: A :: B (verbal analogy)
  if (seqStr.includes('::')) {
    return (
      <div className="mb-5 p-5 text-center text-base font-semibold leading-relaxed" style={cardStyle}>
        <span style={{ color: '#1e293b' }}>
          {seqStr.split('::').map((side, si) => (
            <span key={si}>
              {si > 0 && <span className="mx-2 font-bold" style={{ color: '#94a3b8' }}>::</span>}
              {side.trim().split(/\s*→\s*/).map((part, pi) => (
                <span key={pi}>
                  {pi > 0 && <span className="mx-1.5 font-bold" style={{ color: '#94a3b8' }}>→</span>}
                  {part.trim() === '?'
                    ? <span className="inline-block px-2.5 py-0.5 rounded-lg font-bold" style={{ color: '#6366F1', background: '#eef2ff' }}>?</span>
                    : <span>{part.trim()}</span>}
                </span>
              ))}
            </span>
          ))}
        </span>
      </div>
    );
  }

  // Mixed: text + image tokens
  if (seqStr.includes('img_') || seqStr.includes('excel_img:')) {
    const parts = seqStr.split(/\s*→\s*/);
    return (
      <div className="flex items-center gap-2 justify-center flex-wrap mb-5 p-4" style={cardStyle}>
        {parts.map((part, i) => (
          <div key={i} className="flex items-center gap-2">
            {i > 0 && <span className="text-lg font-bold" style={{ color: '#94a3b8' }}>→</span>}
            {part.trim() === '?'
              ? <span style={{ fontSize: 24, fontWeight: 900, color: '#6366F1', fontFamily: "'Fredoka One', cursive" }}>?</span>
              : <TokenRenderer token={part.trim()} sz={56} />}
          </div>
        ))}
      </div>
    );
  }

  // Mathematical / numeric stimulus (e.g. "2 + 3 = ?", "2, 4, 6, 8, ?")
  const isMathLike = /[+\-×÷=<>%]/.test(seqStr) || /\d+\s*,\s*\d+/.test(seqStr);
  if (isMathLike) {
    return (
      <div className="mb-5 p-5 text-center rounded-2xl" style={cardStyle}>
        <span className="text-xl font-black font-mono tracking-wider" style={{ color: '#1e293b' }}>
          {seqStr}
        </span>
      </div>
    );
  }

  // Plain text stimulus
  return (
    <div className="mb-5 p-4 text-base font-semibold leading-relaxed" style={{ ...cardStyle, color: '#374151' }}>
      {seqStr}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MEMORY REVEAL DISPLAY — for Gwm items (show → hide → question)
// ═══════════════════════════════════════════════════════════════════════════════
// Phase 1: "Get Ready" (1.5s)
// Phase 2: Show stimulus for revealDuration seconds (default 5s from item.timeLimitSec * 0.4)
// Phase 3: Stimulus hidden, "Now answer!" — options become active
function MemoryRevealDisplay({ item, onRevealComplete }) {
  const [phase, setPhase] = useState('ready'); // ready | showing | hidden
  const [countdown, setCountdown] = useState(3);
  const [revealPct, setRevealPct] = useState(100);
  const [currentTokenIdx, setCurrentTokenIdx] = useState(0);
  const timerRef = useRef(null);
  const cdRef = useRef(null);
  const revealStarted = useRef(false);
  // Keep callback in a ref so the interval closure always calls the latest version
  const onCompleteRef = useRef(onRevealComplete);
  onCompleteRef.current = onRevealComplete;

  // How long to show the stimulus (40% of total time, min 3s, max 10s)
  const totalTime = item.timeLimitSec || 20;
  const revealDuration = Math.max(3, Math.min(10, Math.round(totalTime * 0.4)));

  // Build the ordered list of tokens to show one-by-one — memoised to avoid
  // recomputation on every 50ms timer re-render.
  const tokensToShow = useMemo(() => {
    const s = item.sequence || [];
    // 1. Explicit excel_img: in stimulusRow1
    const sr1 = String(item.stimulusRow1 || '').trim();
    // 2. All excel_img: tokens in the sequence
    const seqImgs = s.filter(t => t && String(t).startsWith('excel_img:'));

    if (sr1.startsWith('excel_img:')) {
      return seqImgs.length > 0 ? seqImgs : [sr1];
    }
    if (seqImgs.length > 0) return seqImgs;

    // 3. Derive single stim image from item ID if any non-text token exists
    const isTextOnly = s.every(tok => {
      if (!tok) return true;
      const v = String(tok).trim();
      if (!v || v === '?') return true;
      if (/^-?\d+$/.test(v)) return true;
      if (/^[a-zA-Z]$/.test(v)) return true;
      if (v.includes(' ')) return true;
      if (!v.includes('_') && !v.startsWith('obj:')) return true;
      return false;
    });
    if (!isTextOnly && item.itemId) {
      return [`excel_img:gwm_svg/${item.itemId}_stim.svg`];
    }

    // 4. Pure text sequence — show each token separately
    return s.filter(Boolean);
  }, [item.itemId, item.stimulusRow1, JSON.stringify(item.sequence)]);

  const isVisualTokens = tokensToShow.length > 0 &&
    String(tokensToShow[0]).startsWith('excel_img:');

  // Each token gets at least 2 s; spread total reveal time across all tokens
  const perItemDuration = Math.max(2, Math.floor(revealDuration / Math.max(tokensToShow.length, 1)));

  useEffect(() => {
    // Guard: prevent double-fire (React StrictMode) or re-fire for same item
    if (revealStarted.current) return;
    revealStarted.current = true;

    // Phase 1: countdown 3, 2, 1
    let step = 3;
    setPhase('ready');
    setCountdown(3);
    setCurrentTokenIdx(0);
    setRevealPct(100);

    // Capture values at effect-creation time
    const tokens = tokensToShow;
    const perDur = perItemDuration;

    cdRef.current = setInterval(() => {
      step--;
      if (step <= 0) {
        clearInterval(cdRef.current);
        cdRef.current = null;
        setPhase('showing');

        // Phase 2: show tokens one by one
        let idx = 0;
        const showNext = () => {
          setCurrentTokenIdx(idx);
          setRevealPct(100);
          const endMs = Date.now() + perDur * 1000;
          timerRef.current = setInterval(() => {
            const remaining = endMs - Date.now();
            if (remaining <= 0) {
              clearInterval(timerRef.current);
              timerRef.current = null;
              idx++;
              if (idx < tokens.length) {
                showNext();
              } else {
                setRevealPct(0);
                setPhase('hidden');
                onCompleteRef.current();
              }
            } else {
              setRevealPct((remaining / (perDur * 1000)) * 100);
            }
          }, 50);
        };
        showNext();
      } else {
        setCountdown(step);
      }
    }, 600);

    return () => {
      clearInterval(cdRef.current);
      clearInterval(timerRef.current);
      cdRef.current = null;
      timerRef.current = null;
      revealStarted.current = false;
    };
  }, [item.itemId]);

  const cardStyle = {
    background: '#faf5ff',
    border: '2px solid #e9d5ff',
    borderRadius: 18,
  };

  // Phase 1: Ready
  if (phase === 'ready') {
    return (
      <div style={{ ...cardStyle, position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 12, overflow: 'hidden', animation: 'popIn 0.3s ease-out' }}>
        <div style={{ fontSize: 10, fontWeight: 900, color: 'rgba(139,92,246,0.7)',
          textTransform: 'uppercase', letterSpacing: '0.12em' }}>
          🧠 Get Ready to Remember
        </div>
        <div style={{ fontSize: 'clamp(36px, 8vw, 64px)', fontWeight: 900,
          color: '#8B5CF6', fontFamily: "'Fredoka One', cursive" }}>
          {countdown}
        </div>
      </div>
    );
  }

  // Phase 2: Showing stimulus — one token at a time
  if (phase === 'showing') {
    const currentTok = tokensToShow[currentTokenIdx] ?? null;
    const total = tokensToShow.length;
    const showCounter = total > 1;

    return (
      <div style={{
        ...cardStyle,
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
        padding: isVisualTokens ? 6 : '10px 12px',
        gap: isVisualTokens ? 4 : 8,
        animation: 'popIn 0.25s ease-out',
      }}>
        {/* Sequential counter badge */}
        {showCounter && (
          <div style={{
            fontSize: 10, fontWeight: 900, color: 'rgba(139,92,246,0.75)',
            textTransform: 'uppercase', letterSpacing: '0.12em', flexShrink: 0,
          }}>
            {isVisualTokens ? '👀' : '🔢'} Remember&nbsp;
            <span style={{ color: '#8B5CF6' }}>{currentTokenIdx + 1}</span>
            &nbsp;of&nbsp;
            <span style={{ color: '#8B5CF6' }}>{total}</span>
          </div>
        )}
        {!showCounter && (
          <div style={{ fontSize: 10, fontWeight: 900, color: 'rgba(139,92,246,0.7)',
            textTransform: 'uppercase', letterSpacing: '0.12em', flexShrink: 0 }}>
            👀 Remember This
          </div>
        )}

        {/* Token display */}
        {isVisualTokens ? (
          <div style={{
            flex: 1, minHeight: 0, width: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
          }}>
            {currentTok && <TokenRenderer token={currentTok} sz={500} card />}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
            flex: 1, minHeight: 0 }}>
            <div style={{
              color: '#1e293b', fontFamily: "'Fredoka One', cursive",
              fontSize: 'clamp(24px, 5vw, 56px)', fontWeight: 900,
              background: '#f3e8ff', borderRadius: 14, padding: '12px 28px',
              border: '2px solid #e9d5ff', minWidth: 64, textAlign: 'center',
              animation: 'popIn 0.25s ease-out',
            }}>
              {currentTok}
            </div>
          </div>
        )}

        {/* Timer bar */}
        <div style={{ width: '80%', height: 4, borderRadius: 99,
          overflow: 'hidden', background: '#e9d5ff', flexShrink: 0 }}>
          <div style={{
            width: `${revealPct}%`, height: '100%', borderRadius: 99,
            background: revealPct < 25 ? '#ef4444' : '#8B5CF6',
            transition: 'width 0.05s linear',
          }} />
        </div>

        {!isVisualTokens && (
          <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(139,92,246,0.5)', flexShrink: 0 }}>
            Memorise before time runs out!
          </div>
        )}
      </div>
    );
  }

  // Phase 3: Hidden — stimulus gone, prompt + options now visible
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'rgba(139,92,246,0.04)',
      border: '2px dashed rgba(139,92,246,0.25)',
      borderRadius: 18,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 10, overflow: 'hidden',
      animation: 'popIn 0.3s ease-out',
    }}>
      <div style={{ fontSize: 28 }}>🔒</div>
      <div style={{ fontSize: 13, fontWeight: 900, color: 'rgba(139,92,246,0.8)' }}>
        Stimulus Hidden
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(139,92,246,0.55)' }}>
        Read the question above and choose your answer
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// OPTION BUTTON — clean white theme (supports text AND visual)
// ═══════════════════════════════════════════════════════════════════════════════
function OptionBtn({ opt, letter, onClick, state, disabled, isVisual }) {
  // Strip obj: prefix — it's an internal GWM qualifier, never shown to the user
  const val = String(opt.value || '').replace(/^obj:/, '');
  const isImg = val.startsWith('img_');
  const isExcelImg = val.startsWith('excel_img:');
  const isPos = val.startsWith('pos_');
  const isRatio = val.startsWith('ratio:');
  const isGsLabel = val.startsWith('label:');
  const isPlainText = !isRatio && !isGsLabel && !isExcelImg && (val.includes(' ') || val.length >= 40);
  const isNumber = /^-?\d+\.?\d*$/.test(val);
  const isShape = !isImg && !isExcelImg && !isPos && !isRatio && !isPlainText && !isGsLabel && !isNumber && val.length < 40 && val.includes('_');
  // Always use visual grid for image tokens (excel_img / img_) regardless of domain render mode.
  // Shape/pos/ratio/gs tokens only trigger visual grid when the item itself is in a visual mode.
  const showVisualGrid = isExcelImg || isImg || (isVisual && (isPos || isShape || isRatio || isGsLabel));
  const faded = state === 'faded';
  const isPending = state === 'pending';
  let border = '#e2e8f0';
  let bg = '#ffffff';
  let letterBg = '#f1f5f9';
  let letterColor = '#64748b';
  let shadow = '0 1px 4px rgba(0,0,0,0.06)';
  if (state === 'correct') {
    border = '#22c55e'; bg = '#f0fdf4';
    letterBg = '#22c55e'; letterColor = '#fff';
  }
  if (state === 'wrong') {
    border = '#ef4444'; bg = '#fef2f2';
    letterBg = '#ef4444'; letterColor = '#fff';
  }
  if (isPending) {
    border = '#6366F1'; bg = '#eef2ff';
    letterBg = '#6366F1'; letterColor = '#fff';
  }
  const baseTransition = 'all 0.18s cubic-bezier(.22,1,.36,1)';

  // ── VISUAL OPTION: image fills the entire button, letter badge overlaid top-left ──
  if (showVisualGrid) {
    const isXlImg = val.startsWith('excel_img:');
    return (
      <button
        disabled={disabled}
        onClick={onClick}
        className={`${faded ? 'opacity-15 pointer-events-none' : ''}`}
        style={{
          border: `2.5px solid ${border}`,
          background: isXlImg ? 'transparent' : (state ? bg : '#f8fafc'),
          cursor: disabled ? 'default' : 'pointer',
          boxShadow: shadow,
          transition: 'border-color 0.18s, box-shadow 0.18s, opacity 0.18s',
          padding: 0,
          flex: '1 1 0%',
          minHeight: 0,
          overflow: 'hidden',
          borderRadius: 14,
          position: 'relative',
          display: 'block',
          width: '100%',
        }}>
        {/* Image fills the entire button, edge-to-edge */}
        <div className="opt-thumb" style={{ position: 'absolute', inset: 0 }}>
          <TokenRenderer token={opt.value} sz={200} />
        </div>
        {/* Letter badge — absolute overlay, top-left corner */}
        <div style={{
          position: 'absolute', top: 8, left: 8, zIndex: 2,
          width: 26, height: 26, borderRadius: 7,
          background: letterBg, color: letterColor,
          border: '1.5px solid rgba(255,255,255,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 900, fontFamily: 'monospace',
          boxShadow: '0 1px 4px rgba(0,0,0,0.22)',
          pointerEvents: 'none',
        }}>
          {letter}
        </div>
      </button>
    );
  }
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`rounded-2xl flex items-center gap-3 px-4 py-3.5 text-left transition-all duration-200 ${faded ? 'opacity-20 pointer-events-none' : ''}`}
      style={{
        border: `2px solid ${border}`,
        background: bg,
        cursor: disabled ? 'default' : 'pointer',
        boxShadow: shadow,
        transition: baseTransition,
        minHeight: 56,
      }}>
      <span className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
        style={{ background: letterBg, color: letterColor }}>
        {letter}
      </span>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {isImg && <ImgToken token={opt.value} sz={52} />}
        {isExcelImg && <TokenRenderer token={opt.value} sz={52} />}
        {isPos && <PosToken token={opt.value} sz={44} />}
        {isRatio && <RatioToken token={opt.value} sz={40} />}
        {isShape && !isImg && !isExcelImg && !isPos && !isRatio && <TokenRenderer token={opt.value} sz={40} />}
        {isGsLabel && <TokenRenderer token={opt.value} sz={40} />}
        <span className="text-[14px] font-semibold leading-snug" style={{ color: '#1e293b' }}>
          {opt.label || (!isImg && !isExcelImg && !isShape && !isPos && !isRatio && !isGsLabel ? opt.value : '')}
        </span>
      </div>
    </button>
  );
}

// ═══════════════════════════════════════════
// ═══════════════════════════════════════════
// DOMAIN INTRO — multi-step flow: Gateway → Instructions → Practice → Feedback → Ready
// Practice questions and instructions are static placeholders.
// ═══════════════════════════════════════════

// Static domain config (colors, steps, practice content)
const DOMAIN_CFG = {
  gf:  {
    abbr: 'Gf', tagline: 'Pattern Recognition & Logic',
    color: '#6448A8', bg: '#EEEDFE', dark: '#3C3489',
    time: '~8 min', items: 12,
    steps: [
      'Look for patterns across rows and columns',
      'Shapes may change in size, colour, or number',
      'Pick the answer that completes the pattern',
    ],
    tip: 'Scan the full grid before deciding — the rule usually spans both rows and columns.',
    instructions: [
      'You will see a grid of shapes with one piece missing.',
      'Study how shapes change across each row and down each column.',
      'Choose the option that correctly fills the missing space.',
    ],
    practiceQ: 'What completes the pattern?',
    practiceSub: 'Look at how shapes change across rows and down columns.',
    practiceOpts: ['Large circle', 'Small triangle', 'Large square', 'Small circle'],
    practiceCorrect: 0,
    practiceExplain: 'Shapes grow bigger moving right and alternate between circle and square. The missing piece follows this rule.',
  },
  gv:  {
    abbr: 'Gv', tagline: 'Shape Rotation & Comparison',
    color: '#0F6E56', bg: '#E1F5EE', dark: '#085041',
    time: '~7 min', items: 10,
    steps: [
      'Look at the original shape carefully',
      'Imagine rotating or flipping it in your mind',
      'Find the matching answer among the options',
    ],
    tip: 'Picture the shape slowly turning before you commit to an answer.',
    instructions: [
      'You will see shapes that have been rotated or reflected.',
      'Mentally rotate the original shape to match one of the options.',
      'Choose the option that is the same shape in a different orientation.',
    ],
    practiceQ: 'Which shows the shape rotated 90° clockwise?',
    practiceSub: 'Imagine the original turning to the right.',
    practiceOpts: ['Option A', 'Option B', 'Option C', 'Option D'],
    practiceCorrect: 2,
    practiceExplain: 'Rotating 90° clockwise: the top points right, the left side points up.',
  },
  gq:  {
    abbr: 'Gq', tagline: 'Number Patterns & Rules',
    color: '#854F0B', bg: '#FAEEDA', dark: '#633806',
    time: '~8 min', items: 11,
    steps: [
      'Read the number sequence carefully',
      'Find the rule before you calculate',
      'Choose the number that follows the rule',
    ],
    tip: 'Find the pattern first — once you see the rule, the answer is easy.',
    instructions: [
      'You will see number sequences or patterns.',
      'Identify the mathematical rule connecting the numbers.',
      'Select the answer that correctly continues or completes the pattern.',
    ],
    practiceQ: 'What comes next in the sequence?',
    practiceSub: '2, 5, 8, 11, ___',
    practiceOpts: ['12', '13', '14', '15'],
    practiceCorrect: 2,
    practiceExplain: 'Each number increases by 3: 2, 5, 8, 11, so 11 + 3 = 14.',
  },
  gc:  {
    abbr: 'Gc', tagline: 'Vocabulary & Learned Knowledge',
    color: '#185FA5', bg: '#E6F1FB', dark: '#0C447C',
    time: '~9 min', items: 13,
    steps: [
      'Read each question or word pair carefully',
      'Think about the relationship between the words',
      'Choose the best answer using your knowledge',
    ],
    tip: 'Trust what you know — this section rewards your learning journey.',
    instructions: [
      'You will answer vocabulary and general knowledge questions.',
      'Some questions may include a short reading passage.',
      'Choose the most accurate answer based on the information given.',
    ],
    practiceQ: 'Which word is most similar in meaning to "Elated"?',
    practiceSub: 'Choose the word closest in meaning.',
    practiceOpts: ['Sad', 'Joyful', 'Tired', 'Angry'],
    practiceCorrect: 1,
    practiceExplain: '"Elated" means extremely happy or joyful. The closest synonym is "Joyful".',
  },
  gs:  {
    abbr: 'Gs', tagline: 'Symbol Matching & Speed',
    color: '#9B1111', bg: '#FDEDED', dark: '#7A0F0F',
    time: '~6 min', items: 15,
    steps: [
      'Work as quickly and accurately as you can',
      'Match symbols or spot the odd one out',
      'Speed and accuracy both count',
    ],
    tip: 'Keep your eyes moving — don\'t dwell too long on any one item.',
    instructions: [
      'You will see symbols or patterns that require quick decisions.',
      'Answer as fast as you can without sacrificing accuracy.',
      'There are more questions here — pace yourself evenly.',
    ],
    practiceQ: 'Which symbol on the right matches the one on the left?',
    practiceSub: 'Find the exact match as quickly as you can.',
    practiceOpts: ['Symbol A', 'Symbol B', 'Symbol C', 'Symbol D'],
    practiceCorrect: 1,
    practiceExplain: 'Symbol B is an exact match — same orientation, same detail. Speed counts here!',
  },
  gwm: {
    abbr: 'Gwm', tagline: 'Memory & Recall',
    color: '#5B35A0', bg: '#EDE9FB', dark: '#3D1E82',
    time: '~7 min', items: 10,
    steps: [
      'Pay close attention when the information appears',
      'Remember what you see — it will disappear',
      'Then answer the question from memory',
    ],
    tip: 'Say the items quietly to yourself as they appear — this helps you remember them.',
    instructions: [
      'You will be shown a sequence of items for a short time.',
      'The items will then disappear from the screen.',
      'Answer the question using only what you remember.',
    ],
    practiceQ: 'What was the third number shown?',
    practiceSub: 'You saw: 7, 3, 9, 2 — now answer from memory.',
    practiceOpts: ['7', '3', '9', '2'],
    practiceCorrect: 2,
    practiceExplain: 'The sequence was 7, 3, 9, 2. The third number shown was 9.',
  },
};

// ── Static SVG visuals per domain ──
// Used in Instructions "Example" and Practice "Stimulus" panels
const DOMAIN_EXAMPLE_SVG = {
  gf: (
    <svg viewBox="0 0 200 160" style={{ width: '100%', maxHeight: 160 }}>
      {/* 2×2 matrix — small circle, large circle / small square, ? */}
      <rect x="10" y="10" width="80" height="65" rx="8" fill="#EEEDFE" stroke="#6448A8" strokeWidth="1.5"/>
      <circle cx="50" cy="42" r="12" fill="#6448A8" opacity="0.5"/>
      <rect x="110" y="10" width="80" height="65" rx="8" fill="#EEEDFE" stroke="#6448A8" strokeWidth="1.5"/>
      <circle cx="150" cy="42" r="22" fill="#6448A8" opacity="0.85"/>
      <rect x="10" y="87" width="80" height="65" rx="8" fill="#EEEDFE" stroke="#6448A8" strokeWidth="1.5"/>
      <rect x="35" y="107" width="24" height="24" rx="3" fill="#6448A8" opacity="0.5"/>
      <rect x="110" y="87" width="80" height="65" rx="8" fill="#EEEDFE" stroke="#6448A8" strokeWidth="1.5" strokeDasharray="5,3"/>
      <text x="150" y="128" textAnchor="middle" fontSize="28" fontWeight="800" fill="#6448A8" fontFamily="sans-serif">?</text>
      {/* Arrow hint */}
      <text x="100" y="52" textAnchor="middle" fontSize="18" fill="#9278C0">→</text>
      <text x="100" y="127" textAnchor="middle" fontSize="18" fill="#9278C0">→</text>
    </svg>
  ),
  gv: (
    <svg viewBox="0 0 200 130" style={{ width: '100%', maxHeight: 130 }}>
      {/* Original L-shape + rotated version */}
      <text x="50" y="16" textAnchor="middle" fontSize="10" fill="#9999AA" fontFamily="sans-serif">Original</text>
      <rect x="20" y="22" width="16" height="45" rx="2" fill="#0F6E56"/>
      <rect x="20" y="51" width="45" height="16" rx="2" fill="#0F6E56"/>
      {/* Rotation arrow */}
      <path d="M88 55 Q100 35 112 55" stroke="#9278C0" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <polygon points="112,55 108,45 118,50" fill="#9278C0"/>
      <text x="100" y="80" textAnchor="middle" fontSize="9" fill="#9999AA" fontFamily="sans-serif">90° CW</text>
      {/* Rotated shape */}
      <text x="155" y="16" textAnchor="middle" fontSize="10" fill="#9999AA" fontFamily="sans-serif">Rotated</text>
      <rect x="130" y="22" width="45" height="16" rx="2" fill="#0F6E56" opacity="0.85"/>
      <rect x="159" y="22" width="16" height="45" rx="2" fill="#0F6E56" opacity="0.85"/>
    </svg>
  ),
  gq: (
    <svg viewBox="0 0 200 100" style={{ width: '100%', maxHeight: 100 }}>
      {['2','5','8','11','?'].map((n, i) => (
        <g key={i}>
          <rect x={12 + i*38} y="20" width="32" height="36" rx="7"
            fill={n === '?' ? '#EEEDFE' : '#F3F0FB'}
            stroke={n === '?' ? '#854F0B' : 'rgba(100,72,168,0.15)'}
            strokeWidth={n === '?' ? '2' : '1.5'}
            strokeDasharray={n === '?' ? '4,3' : 'none'}/>
          <text x={28 + i*38} y="45" textAnchor="middle" fontSize={n === '?' ? '18' : '16'}
            fontWeight="700" fill={n === '?' ? '#854F0B' : '#1A1A2E'}
            fontFamily="sans-serif">{n}</text>
          {i < 4 && <text x={50 + i*38} y="43" fontSize="13" fill="#9999AA" fontFamily="sans-serif">+3</text>}
        </g>
      ))}
      <text x="100" y="85" textAnchor="middle" fontSize="11" fill="#854F0B" fontFamily="sans-serif" fontWeight="700">Rule: add 3 each time → answer is 14</text>
    </svg>
  ),
  gc: (
    <svg viewBox="0 0 200 120" style={{ width: '100%', maxHeight: 120 }}>
      <rect x="10" y="10" width="180" height="45" rx="10" fill="#E6F1FB" stroke="#185FA5" strokeWidth="1.5"/>
      <text x="100" y="30" textAnchor="middle" fontSize="12" fill="#185FA5" fontWeight="700" fontFamily="sans-serif">Happy  :  Joyful</text>
      <text x="100" y="48" textAnchor="middle" fontSize="11" fill="#555570" fontFamily="sans-serif">::</text>
      <rect x="10" y="65" width="180" height="45" rx="10" fill="#EEEDFE" stroke="#6448A8" strokeWidth="1.5" strokeDasharray="5,3"/>
      <text x="100" y="85" textAnchor="middle" fontSize="12" fill="#6448A8" fontWeight="700" fontFamily="sans-serif">Sad  :  ?</text>
      <text x="100" y="103" textAnchor="middle" fontSize="11" fill="#1D9E75" fontWeight="700" fontFamily="sans-serif">→  Unhappy ✓</text>
    </svg>
  ),
  gs: (
    <svg viewBox="0 0 200 110" style={{ width: '100%', maxHeight: 110 }}>
      <text x="100" y="14" textAnchor="middle" fontSize="10" fill="#9999AA" fontFamily="sans-serif">Find the matching symbol</text>
      {/* Target symbol */}
      <rect x="20" y="22" width="50" height="50" rx="8" fill="#FDEDED" stroke="#9B1111" strokeWidth="2"/>
      <text x="45" y="54" textAnchor="middle" fontSize="22" fill="#9B1111" fontFamily="monospace" fontWeight="900">★</text>
      <text x="45" y="82" textAnchor="middle" fontSize="9" fill="#9999AA" fontFamily="sans-serif">Target</text>
      {/* Options */}
      {['◆','★','●'].map((sym, i) => (
        <g key={i}>
          <rect x={90 + i*36} y="22" width="30" height="30" rx="6"
            fill={sym === '★' ? '#E1F5EE' : '#F3F0FB'}
            stroke={sym === '★' ? '#1D9E75' : 'rgba(100,72,168,0.15)'}
            strokeWidth={sym === '★' ? '2' : '1.5'}/>
          <text x={105 + i*36} y="43" textAnchor="middle" fontSize="14"
            fill={sym === '★' ? '#1D9E75' : '#1A1A2E'} fontFamily="monospace">{sym}</text>
        </g>
      ))}
      <text x="155" y="72" textAnchor="middle" fontSize="9" fill="#1D9E75" fontFamily="sans-serif">★ = Match ✓</text>
    </svg>
  ),
  gwm: (
    <svg viewBox="0 0 200 120" style={{ width: '100%', maxHeight: 120 }}>
      {/* Show sequence → disappear → question */}
      <rect x="5" y="8" width="190" height="40" rx="8" fill="#EDE9FB" stroke="#5B35A0" strokeWidth="1.5"/>
      <text x="100" y="24" textAnchor="middle" fontSize="9" fill="#5B35A0" fontWeight="700" fontFamily="sans-serif">YOU SEE (for 4 seconds):</text>
      {['7','3','9','2'].map((n, i) => (
        <text key={i} x={42 + i*32} y="42" textAnchor="middle" fontSize="17" fontWeight="800" fill="#3D1E82" fontFamily="monospace">{n}</text>
      ))}
      {/* Disappear arrow */}
      <text x="100" y="62" textAnchor="middle" fontSize="10" fill="#9999AA" fontFamily="sans-serif">↓ disappears ↓</text>
      {/* Question */}
      <rect x="5" y="70" width="190" height="40" rx="8" fill="#EEEDFE" stroke="#5B35A0" strokeWidth="1.5" strokeDasharray="5,3"/>
      <text x="100" y="87" textAnchor="middle" fontSize="9" fill="#5B35A0" fontWeight="700" fontFamily="sans-serif">QUESTION: What was the 3rd number?</text>
      <text x="100" y="103" textAnchor="middle" fontSize="11" fill="#1D9E75" fontWeight="700" fontFamily="sans-serif">Answer: 9 ✓</text>
    </svg>
  ),
};

const DOMAIN_PRACTICE_SVG = {
  gf: (
    <svg viewBox="0 0 220 220" style={{ width: '100%', maxHeight: 220 }}>
      {/* 2×2 matrix practice */}
      {[[0,0,'sm-circle'],[1,0,'lg-circle'],[0,1,'sm-square'],[1,1,'?']].map(([col, row, type], idx) => (
        <g key={idx}>
          <rect x={10 + col*108} y={10 + row*108} width="100" height="100" rx="10"
            fill={type === '?' ? '#EEEDFE' : '#F3F0FB'}
            stroke={type === '?' ? '#6448A8' : 'rgba(100,72,168,0.15)'}
            strokeWidth={type === '?' ? 2.5 : 1.5}
            strokeDasharray={type === '?' ? '6,4' : 'none'}/>
          {type === 'sm-circle' && <circle cx={60 + col*108} cy={60 + row*108} r={16} fill="#6448A8" opacity="0.55"/>}
          {type === 'lg-circle' && <circle cx={60 + col*108} cy={60 + row*108} r={32} fill="#6448A8" opacity="0.85"/>}
          {type === 'sm-square' && <rect x={44 + col*108} y={44 + row*108} width="32" height="32" rx="4" fill="#6448A8" opacity="0.55"/>}
          {type === '?' && <text x={60 + col*108} y={70 + row*108} textAnchor="middle" fontSize="36" fontWeight="900" fill="#6448A8" fontFamily="sans-serif">?</text>}
        </g>
      ))}
    </svg>
  ),
  gv: (
    <svg viewBox="0 0 220 180" style={{ width: '100%', maxHeight: 180 }}>
      <text x="110" y="18" textAnchor="middle" fontSize="11" fill="#085041" fontFamily="sans-serif" fontWeight="700">Rotate 90° clockwise →</text>
      {/* Original */}
      <rect x="20" y="30" width="20" height="60" rx="3" fill="#0F6E56" opacity="0.85"/>
      <rect x="20" y="70" width="60" height="20" rx="3" fill="#0F6E56" opacity="0.85"/>
      <text x="50" y="110" textAnchor="middle" fontSize="10" fill="#9999AA" fontFamily="sans-serif">Original</text>
      {/* Arrow */}
      <path d="M100 75 L130 75" stroke="#9278C0" strokeWidth="2.5" strokeLinecap="round" markerEnd="url(#arr)"/>
      <defs><marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9278C0"/></marker></defs>
      {/* Rotated shape */}
      <rect x="140" y="30" width="60" height="20" rx="3" fill="#0F6E56" opacity="0.85"/>
      <rect x="180" y="30" width="20" height="60" rx="3" fill="#0F6E56" opacity="0.85"/>
      <text x="170" y="110" textAnchor="middle" fontSize="10" fill="#9999AA" fontFamily="sans-serif">Which option?</text>
      <rect x="20" y="130" width="190" height="40" rx="8" fill="#EEEDFE" stroke="#6448A8" strokeWidth="1" strokeDasharray="4,3"/>
      <text x="115" y="157" textAnchor="middle" fontSize="11" fill="#555570" fontFamily="sans-serif">Choose from options on the right →</text>
    </svg>
  ),
  gq: (
    <svg viewBox="0 0 220 130" style={{ width: '100%', maxHeight: 130 }}>
      <text x="110" y="16" textAnchor="middle" fontSize="11" fill="#633806" fontFamily="sans-serif" fontWeight="700">What comes next?</text>
      {['2','5','8','11','?'].map((n, i) => (
        <g key={i}>
          <rect x={8 + i*42} y="24" width="36" height="50" rx="8"
            fill={n === '?' ? '#FAEEDA' : '#FFF8EE'}
            stroke={n === '?' ? '#854F0B' : 'rgba(133,79,11,0.2)'}
            strokeWidth={n === '?' ? 2.5 : 1.5}
            strokeDasharray={n === '?' ? '5,3' : 'none'}/>
          <text x={26 + i*42} y="56" textAnchor="middle" fontSize={n === '?' ? '20' : '18'}
            fontWeight="800" fill={n === '?' ? '#854F0B' : '#1A1A2E'} fontFamily="monospace">{n}</text>
          {i < 4 && <text x={50 + i*42} y="56" fontSize="10" fill="#9999AA" fontFamily="sans-serif">+3</text>}
        </g>
      ))}
      <text x="110" y="100" textAnchor="middle" fontSize="11" fill="#555570" fontFamily="sans-serif">Find the rule → select the answer</text>
    </svg>
  ),
  gc: (
    <svg viewBox="0 0 220 140" style={{ width: '100%', maxHeight: 140 }}>
      <rect x="10" y="10" width="200" height="115" rx="12" fill="#E6F1FB" stroke="#185FA5" strokeWidth="1.5"/>
      <text x="110" y="38" textAnchor="middle" fontSize="14" fontWeight="700" fill="#185FA5" fontFamily="sans-serif">Which word is most</text>
      <text x="110" y="56" textAnchor="middle" fontSize="14" fontWeight="700" fill="#185FA5" fontFamily="sans-serif">similar to "Elated"?</text>
      <line x1="30" y1="68" x2="190" y2="68" stroke="#185FA5" strokeWidth="1" opacity="0.3"/>
      <text x="110" y="90" textAnchor="middle" fontSize="12" fill="#555570" fontFamily="sans-serif">Choose from the four options →</text>
      <text x="110" y="112" textAnchor="middle" fontSize="11" fill="#9999AA" fontFamily="sans-serif">(Sad / Joyful / Tired / Angry)</text>
    </svg>
  ),
  gs: (
    <svg viewBox="0 0 220 150" style={{ width: '100%', maxHeight: 150 }}>
      <text x="110" y="16" textAnchor="middle" fontSize="11" fill="#7A0F0F" fontFamily="sans-serif" fontWeight="700">Match the target symbol exactly</text>
      <rect x="60" y="24" width="100" height="80" rx="10" fill="#FDEDED" stroke="#9B1111" strokeWidth="2.5"/>
      <text x="110" y="80" textAnchor="middle" fontSize="46" fill="#9B1111" fontFamily="monospace" fontWeight="900">★</text>
      <text x="110" y="120" textAnchor="middle" fontSize="10" fill="#9999AA" fontFamily="sans-serif">Target — find this exact symbol</text>
      <text x="110" y="140" textAnchor="middle" fontSize="10" fill="#555570" fontFamily="sans-serif">Work as fast as you can →</text>
    </svg>
  ),
  gwm: (
    <svg viewBox="0 0 220 160" style={{ width: '100%', maxHeight: 160 }}>
      <rect x="10" y="8" width="200" height="55" rx="10" fill="#EDE9FB" stroke="#5B35A0" strokeWidth="2"/>
      <text x="110" y="26" textAnchor="middle" fontSize="10" fill="#3D1E82" fontWeight="700" fontFamily="sans-serif">REMEMBER these numbers:</text>
      {['7','3','9','2'].map((n, i) => (
        <text key={i} x={48 + i*34} y="52" textAnchor="middle" fontSize="20" fontWeight="900" fill="#5B35A0" fontFamily="monospace">{n}</text>
      ))}
      <text x="110" y="82" textAnchor="middle" fontSize="20" fill="#9278C0" fontFamily="sans-serif">↓</text>
      <text x="110" y="102" textAnchor="middle" fontSize="10" fill="#9999AA" fontFamily="sans-serif">(they will disappear)</text>
      <rect x="10" y="112" width="200" height="38" rx="10" fill="#EEEDFE" stroke="#5B35A0" strokeWidth="1.5" strokeDasharray="5,3"/>
      <text x="110" y="128" textAnchor="middle" fontSize="10" fill="#5B35A0" fontWeight="700" fontFamily="sans-serif">What was the 3rd number?</text>
      <text x="110" y="145" textAnchor="middle" fontSize="10" fill="#555570" fontFamily="sans-serif">Select from options on the right →</text>
    </svg>
  ),
};

function DomainIntro({ domain, domainLabel, domainsCompleted, domainsTotal, maxItems, batteryInfo, onStart }) {
  const [step, setStep] = useState('gateway'); // gateway | instructions | practice | feedback | ready
  const [selectedPracOpt, setSelectedPracOpt] = useState(null);
  const [practiceAnswered, setPracticeAnswered] = useState(false);
  // GWM practice: reuse the same MemoryRevealDisplay component as actual items
  const [gwmRevealDone, setGwmRevealDone] = useState(false);

  // ── Dynamic data from DB ──
  const [dbPracticeItem, setDbPracticeItem] = useState(null);   // item from /items/practice
  const [dbInstructions, setDbInstructions] = useState(null);   // per-domain instructions from /config/student-visible

  useEffect(() => {
    // Fetch practice items for this domain (falls back to easiest regular items on backend)
    api.get(`/items/practice?domain=${domain}`)
      .then(d => {
        console.log(`[DomainIntro] Practice items for ${domain}:`, d.items?.length || 0, d.items?.[0]?.content ? 'has content' : 'no content');
        if (d.items?.length) setDbPracticeItem(d.items[0]);
      })
      .catch(err => console.warn(`[DomainIntro] Failed to fetch practice items for ${domain}:`, err));
    // Fetch admin-configured domain instructions
    api.get('/config/student-visible')
      .then(d => {
        const all = d.config?.domain_instructions;
        if (all?.[domain]) setDbInstructions(all[domain]);
      })
      .catch(() => {});
  }, [domain]);

  const meta = DOMAIN_META[domain] || { icon: '📝', label: domainLabel, color: '#78716C', desc: 'Answer each question carefully.' };
  const cfgStatic = DOMAIN_CFG[domain] || {
    abbr: domain.toUpperCase(), tagline: '', color: meta.color, bg: '#e8f3ec', dark: '#3d6b52',
    time: '~7 min', items: 10, steps: [], tip: '', instructions: [],
    practiceQ: 'Sample question', practiceSub: '', practiceOpts: ['A','B','C','D'], practiceCorrect: 0, practiceExplain: '',
  };

  // Merge DB instructions over static defaults
  const cfg = {
    ...cfgStatic,
    ...(dbInstructions ? {
      tagline:      dbInstructions.tagline      || cfgStatic.tagline,
      steps:        dbInstructions.steps?.length  ? dbInstructions.steps  : cfgStatic.steps,
      instructions: dbInstructions.instructions?.length ? dbInstructions.instructions : cfgStatic.instructions,
      tip:          dbInstructions.tip          || cfgStatic.tip,
    } : {}),
  };

  // Resolve practice question — DB item takes priority over static DOMAIN_CFG
  // Real items use: content.promptText (question), content.stimulusRow1/stimulusRow2 (stimulus),
  // content.options [{value, label, tag}], content.correctIndex, content.explanation/distractorRationale
  const dbC = dbPracticeItem?.content;
  const hasDbItem = !!dbC;
  const pracQ       = hasDbItem
                        ? (dbC.promptText || dbC.question || dbC.prompt || cfg.practiceQ)
                        : cfg.practiceQ;
  const pracSub     = hasDbItem
                        ? (dbC.sub || dbC.practiceSub || cfg.practiceSub)
                        : cfg.practiceSub;
  const pracOpts    = hasDbItem && Array.isArray(dbC.options) && dbC.options.length > 0
                        ? dbC.options.map(o => typeof o === 'string' ? o : (o.value ?? o.label ?? o.text ?? String(o)))
                        : cfg.practiceOpts;
  const pracCorrect = hasDbItem && dbC.correctIndex != null
                        ? dbC.correctIndex
                        : cfg.practiceCorrect;
  const pracExplain = hasDbItem
                        ? (dbC.explanation || dbC.distractorRationale || cfg.practiceExplain)
                        : cfg.practiceExplain;

  const { color, bg, dark } = cfg;

  // Build a GWM practice item object for MemoryRevealDisplay (must be at top level for hooks rules)
  const pracRevealItem = useMemo(() => {
    if (domain !== 'gwm' || !dbPracticeItem || !dbC) return null;
    const parseStim = (str) => {
      if (!str || typeof str !== 'string') return [];
      let s = str.trim().replace(/^Row\s*\d+\s*:\s*/i, '');
      let parts;
      if (s.includes('→')) parts = s.split(/\s*→\s*/);
      else if (s.includes('::')) parts = s.split(/\s*::\s*/).flatMap(h => h.split(/\s*:\s*/));
      else if (s.includes('|')) parts = s.split(/\s*\|\s*/);
      else parts = [s];
      return parts.map(r => { const cl = r.trim().replace(/^\[/, '').replace(/\]$/, '').trim(); return (cl === '?' || cl === '') ? null : cl; });
    };
    const seq = (dbC.sequence && Array.isArray(dbC.sequence) && dbC.sequence.length > 0)
      ? dbC.sequence
      : (() => { const s = parseStim(dbC.stimulusRow1); if (dbC.stimulusRow2) s.push(...parseStim(dbC.stimulusRow2)); return s.length > 0 ? s : []; })();
    return {
      itemId:        String(dbPracticeItem.itemId || dbPracticeItem.item_id || dbPracticeItem.id || ''),
      domain:        'gwm',
      timeLimitSec:  dbC.timeLimitSec || 15,
      sequence:      seq,
      stimulusRow1:  dbC.stimulusRow1 || '',
      stimulusRow2:  dbC.stimulusRow2 || '',
      prompt:        pracQ,
    };
  }, [domain, dbPracticeItem, dbC, pracQ]);

  const handlePickPrac = (idx) => {
    if (practiceAnswered) return;
    if (domain === 'gwm' && !gwmRevealDone) return; // block until memory reveal finishes
    setSelectedPracOpt(idx);
    setPracticeAnswered(true);
    setTimeout(() => setStep('feedback'), 650);
  };

  const isPracCorrect = selectedPracOpt === pracCorrect;

  // ── Shared CSS injected with every DomainIntro render ──
  const DOMAIN_INTRO_CSS = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
    .cg-shell{width:100%;max-width:1040px;height:clamp(540px,calc(100vh - 40px),690px);background:#FFFFFF;display:flex;flex-direction:column;border-radius:20px;overflow:hidden;border:1px solid rgba(26,35,50,0.08);box-shadow:0 8px 48px rgba(26,35,50,0.09);animation:cgSlideIn .3s cubic-bezier(.4,0,.2,1);}
    .cg-split{display:flex;flex:1;min-height:0;}
    .cg-left{width:56%;flex-shrink:0;display:flex;flex-direction:column;overflow-y:auto;}
    .cg-right{flex:1;background:#FFFFFF;display:flex;flex-direction:column;overflow-y:auto;padding:28px 26px;}
    .cg-btn-primary{background:#1a2332;color:#fff;border:none;border-radius:12px;padding:14px 22px;font-size:14px;font-weight:600;font-family:'DM Serif Display',serif;cursor:pointer;width:100%;transition:background .18s,transform .12s;letter-spacing:0.2px;}
    .cg-btn-primary:hover{background:#2d3d52;}
    .cg-btn-primary:active{transform:scale(.99);}
    .cg-btn-secondary{background:transparent;color:#4a5568;border:1px solid rgba(26,35,50,0.08);border-radius:12px;padding:12px 22px;font-size:13px;font-weight:500;font-family:inherit;cursor:pointer;width:100%;transition:background .15s,border-color .15s;}
    .cg-btn-secondary:hover{background:#f0f2f5;border-color:#8898aa;}
    .cg-display{font-family:'DM Serif Display',Georgia,serif!important;font-weight:400!important;}
    .cg-pill{display:inline-flex;align-items:center;font-size:11px;font-weight:600;padding:4px 12px;border-radius:20px;letter-spacing:0.3px;}
    .cg-card{background:#f5f2ed;border-radius:13px;padding:16px;}
    .cg-section-label{font-size:10px;font-weight:600;color:#8898aa;text-transform:uppercase;letter-spacing:2px;margin-bottom:10px;display:block;}
    .cg-step-item{display:flex;align-items:flex-start;gap:11px;font-size:13px;line-height:1.55;color:#4a5568;}
    .cg-step-num{width:25px;height:25px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;margin-top:1px;}
    .cg-opt{border:2px solid rgba(26,35,50,0.1);border-radius:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;min-height:80px;padding:10px 14px;transition:border-color .15s,background .15s,transform .1s,box-shadow .15s;background:#fff;font-size:13px;font-weight:500;color:#1a2332;text-align:center;gap:8px;}
    .cg-opt:hover{border-color:#c97d5f;transform:translateY(-2px);box-shadow:0 4px 14px rgba(26,35,50,0.07);}
    .cg-opt.correct{border-color:#5f8f72!important;background:#e8f3ec!important;color:#5f8f72!important;pointer-events:none;}
    .cg-opt.incorrect{border-color:#c97d5f!important;background:#faeae4!important;color:#c97d5f!important;pointer-events:none;}
    .cg-opt.locked{pointer-events:none;opacity:0.6;}
    @keyframes cgSlideIn{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}
    @keyframes cgPopIn{0%{transform:scale(0.4);opacity:0}65%{transform:scale(1.12)}100%{transform:scale(1);opacity:1}}
    @keyframes cgPulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.04);opacity:0.85}}
    @media(max-width:680px){.cg-split{flex-direction:column}.cg-left{width:100%!important;max-height:50vh}.cg-right{padding:18px 20px}}
  `;

  // ── Warm domain colors for section intro screens ──
  const domainWarmColors = {
    gf:  { bg: '#e8f3ec', color: '#5f8f72', dark: '#3d6b52' },
    gv:  { bg: '#faeae4', color: '#c97d5f', dark: '#9b5f44' },
    gq:  { bg: '#fef3dc', color: '#c9963e', dark: '#9a7230' },
    gc:  { bg: '#e8f3ec', color: '#5f8f72', dark: '#3d6b52' },
    gs:  { bg: '#faeae4', color: '#c97d5f', dark: '#9b5f44' },
    gwm: { bg: '#eeecf8', color: '#8b7ec8', dark: '#5d5296' },
  };
  const warmCol = domainWarmColors[domain] || { bg: '#e8f3ec', color: '#5f8f72', dark: '#3d6b52' };

  // ── Shared shell wrapper ──
  const Shell = ({ children }) => (
    <div style={{
      width: '100%', height: '100vh',
      background: '#f5f2ed',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      fontFamily: "'DM Sans', sans-serif",
      WebkitFontSmoothing: 'antialiased',
    }}>
      <style dangerouslySetInnerHTML={{ __html: DOMAIN_INTRO_CSS }} />
      <div className="cg-shell">{children}</div>
    </div>
  );

  // ── Domain dots progress ──
  const DomainDots = () => (
    <div style={{ display: 'flex', gap: 5, marginBottom: 14 }}>
      {Array.from({ length: domainsTotal }).map((_, i) => (
        <div key={i} style={{
          height: 5, flex: 1, borderRadius: 3,
          background: i < domainsCompleted ? warmCol.color : i === domainsCompleted ? warmCol.color+'88' : '#ede9e3',
          border: '1px solid rgba(26,35,50,0.08)',
          transition: 'background .4s',
        }} />
      ))}
    </div>
  );

  // ══ S2 GATEWAY ══
  if (step === 'gateway') {
    return (
      <Shell>
        <div className="cg-split">
          {/* Left: Domain identity + stats */}
          <div className="cg-left" style={{ background: '#fdfaf5', borderRight: '1px solid rgba(26,35,50,0.08)', padding: '34px 30px', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', right: -60, bottom: -60, width: 200, height: 200, borderRadius: '50%', background: `radial-gradient(circle, ${warmCol.color}15 0%, transparent 70%)`, pointerEvents: 'none' }} />
            <DomainDots />
            <div style={{ width: 84, height: 84, borderRadius: '50%', background: warmCol.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, border: `2px solid ${warmCol.color}30`, filter: `drop-shadow(0 5px 14px ${warmCol.color}33)`, fontSize: 38, zIndex: 1 }}>
              {meta.icon}
            </div>
            <span className="cg-pill" style={{ background: warmCol.bg, color: warmCol.dark, border: `1px solid ${warmCol.color}40`, marginBottom: 11, zIndex: 1 }}>
              {cfg.abbr} · {cfg.tagline}
            </span>
            <h2 className="cg-display" style={{ fontSize: 29, color: '#1a2332', marginBottom: 10, zIndex: 1 }}>{meta.label}</h2>
            <p style={{ fontSize: 13, color: '#4a5568', lineHeight: 1.7, marginBottom: 22, maxWidth: 290, zIndex: 1 }}>{meta.desc}</p>
            <div style={{ display: 'flex', gap: 8, zIndex: 1 }}>
              {(() => {
                const secInfo = batteryInfo?.sectionInfo?.[domain];
                const dynTime = secInfo?.estimatedMinutes ? `~${secInfo.estimatedMinutes} min` : cfg.time;
                const dynItems = secInfo?.itemCount || maxItems || cfg.items;
                const dynPractice = secInfo?.practiceCount != null ? secInfo.practiceCount : (dbPracticeItem ? 1 : 2);
                return [
                  ['Duration', dynTime],
                  ['Questions', `${dynItems} questions`],
                  ['Practice', `${dynPractice} item${dynPractice !== 1 ? 's' : ''}`],
                ];
              })().map(([lbl, val]) => (
                <div key={lbl} style={{ flex: 1, background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(26,35,50,0.08)', borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
                  <p style={{ fontSize: 10, color: '#8898aa', marginBottom: 3 }}>{lbl}</p>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#1a2332' }}>{val}</p>
                </div>
              ))}
            </div>
          </div>
          {/* Right: Steps + CTA */}
          <div className="cg-right" style={{ justifyContent: 'space-between' }}>
            <div>
              <p className="cg-section-label">What you'll do</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {cfg.steps.map((s, i) => (
                  <div key={i} className="cg-step-item">
                    <div className="cg-step-num" style={{ background: warmCol.bg, color: warmCol.dark }}>{i + 1}</div>
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button className="cg-btn-primary" onClick={() => setStep('instructions')}>See Instructions</button>
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  // ══ S3 INSTRUCTIONS ══
  if (step === 'instructions') {
    return (
      <Shell>
        <div className="cg-split">
          {/* Left: Steps */}
          <div className="cg-left" style={{ background: '#fdfaf5', borderRight: '1px solid rgba(26,35,50,0.08)', padding: '34px 30px' }}>
            <div style={{ marginBottom: 20 }}>
              <span className="cg-pill" style={{ background: warmCol.bg, color: warmCol.dark, border: `1px solid ${warmCol.color}40`, marginBottom: 11, display: 'inline-flex' }}>
                {cfg.abbr} · Instructions
              </span>
              <h2 className="cg-display" style={{ fontSize: 26, color: '#1a2332', marginBottom: 5 }}>How it works</h2>
              <p style={{ fontSize: 12, color: '#8898aa' }}>Read these before you start</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
              {cfg.instructions.map((s, i) => (
                <div key={i} className="cg-step-item">
                  <div className="cg-step-num" style={{ background: warmCol.color, color: '#fff' }}>{i + 1}</div>
                  <span style={{ color: '#1a2332', fontWeight: 500 }}>{s}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Right: Example visual + CTA */}
          <div className="cg-right" style={{ justifyContent: 'space-between' }}>
            <div className="cg-card">
              <p className="cg-section-label">Example</p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 0' }}>
                {DOMAIN_EXAMPLE_SVG[domain] || (
                  <p style={{ fontSize: 12, color: '#9999AA', textAlign: 'center' }}>Visual example for {cfg.abbr}</p>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button className="cg-btn-primary" onClick={() => setStep('practice')}>Try Practice Questions</button>
              <button className="cg-btn-secondary" onClick={() => setStep('gateway')}>Back</button>
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  // ══ S4 PRACTICE ══
  if (step === 'practice') {
    // Build sequence from DB item for visual rendering (same parsing as cat-engine formatItemForClient)
    const dbSeq = (() => {
      if (!dbC) return null;
      if (dbC.sequence && Array.isArray(dbC.sequence) && dbC.sequence.length > 0) return dbC.sequence;
      const parseStim = (str) => {
        if (!str || typeof str !== 'string') return [];
        let s = str.trim().replace(/^Row\s*\d+\s*:\s*/i, '');
        let parts;
        if (s.includes('→')) parts = s.split(/\s*→\s*/);
        else if (s.includes('::')) parts = s.split(/\s*::\s*/).flatMap(h => h.split(/\s*:\s*/));
        else if (s.includes('|')) parts = s.split(/\s*\|\s*/);
        else parts = [s];
        return parts.map(r => { const cl = r.trim().replace(/^\[/, '').replace(/\]$/, '').trim(); return (cl === '?' || cl === '') ? null : cl; });
      };
      const seq = parseStim(dbC.stimulusRow1);
      if (dbC.stimulusRow2) seq.push(...parseStim(dbC.stimulusRow2));
      return seq.length > 0 ? seq : null;
    })();

    // Detect if tokens are visual (shape tokens like circle_md, or excel_img:)
    const isVisualToken = (t) => t && ((String(t).includes('_') && !/\s/.test(String(t)) && String(t).length < 40) || String(t).startsWith('excel_img:'));
    const seqHasTokens = dbSeq && dbSeq.some(t => t && isVisualToken(t));
    const seqHasText   = dbSeq && !seqHasTokens && domain !== 'gwm' && dbSeq.filter(Boolean).length > 0;
    const optsAreTokens = hasDbItem && pracOpts.some(o => isVisualToken(o));

    const isGwmPractice = domain === 'gwm' && !!dbPracticeItem;
    const gwmLocked     = isGwmPractice && !gwmRevealDone;

    // ── GWM practice: use the exact same card layout as actual test items ──
    if (isGwmPractice) {
      const letters = ['A','B','C','D','E','F','G','H'];
      const pracOptsWrapped = pracOpts.map((o, i) => ({ value: o, origIdx: i }));
      const pracIsVisual = optsAreTokens;
      return (
        <div className="relative h-screen flex flex-col overflow-hidden"
          style={{
            background: '#E8E4F5',
            backgroundImage: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(100,72,168,0.10), transparent)',
            fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
          }}>
          <style>{`
            @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
            @keyframes popIn { 0% { transform: scale(0.82); opacity: 0; } 70% { transform: scale(1.04); } 100% { transform: scale(1); opacity: 1; } }
            @keyframes slideInCard { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
            .opt-thumb { display:flex!important; align-items:center!important; justify-content:center!important; overflow:hidden!important; border-radius:11px!important; }
            .opt-thumb > div { width:100%!important; height:100%!important; display:flex!important; align-items:center!important; justify-content:center!important; }
            .opt-thumb svg { display:block!important; width:100%!important; height:100%!important; }
            .opt-thumb img { display:block!important; width:100%!important; height:100%!important; object-fit:contain!important; }
          `}</style>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: '8px 12px 12px' }}>
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              background: '#FFFFFF', borderRadius: 18,
              border: '1px solid rgba(100,72,168,0.11)',
              boxShadow: '0 1px 1px rgba(100,72,168,0.06), 0 4px 12px rgba(100,72,168,0.08), 0 16px 40px rgba(100,72,168,0.10)',
              animation: 'slideInCard 0.3s cubic-bezier(.4,0,.2,1)',
              overflow: 'hidden', position: 'relative', minHeight: 0,
            }}>
              {/* Top accent line */}
              <div style={{ position: 'absolute', top: 0, left: '8%', right: '8%', height: 2,
                background: `linear-gradient(90deg,transparent,${color},transparent)`,
                borderRadius: 99, zIndex: 1 }} />

              {/* BODY: left | divider | right — same grid as actual test */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr', flex: 1, minHeight: 0, overflow: 'hidden' }}>

                {/* ── LEFT: stimulus ── */}
                <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0, background: '#fdfaf5' }}>
                  {/* Domain chip */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, marginBottom: 8 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px',
                      borderRadius: 20, background: warmCol.bg, border: `1px solid ${warmCol.color}30`,
                      fontSize: 10, fontWeight: 700, color: warmCol.dark, letterSpacing: '0.3px' }}>
                      {meta.icon} Practice
                    </div>
                  </div>

                  {/* Prompt — shown only after reveal */}
                  {gwmRevealDone && (
                    <div style={{ fontFamily: "'DM Serif Display', Georgia, serif", color: '#1A1A2E',
                      fontSize: 'clamp(13px,1.4vw,17px)', flexShrink: 0, marginBottom: 8, lineHeight: 1.45,
                      animation: 'popIn 0.3s ease-out' }}>
                      {pracQ}
                    </div>
                  )}

                  {/* Stimulus card */}
                  <div style={{
                    flex: 1, minHeight: 0, background: '#FFFFFF', borderRadius: 10,
                    border: '1.5px solid rgba(26,35,50,0.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: 4, overflow: 'hidden', position: 'relative',
                  }}>
                    <div style={{ width: '100%', height: '100%', position: 'relative',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {!gwmRevealDone && pracRevealItem && (
                        <MemoryRevealDisplay item={pracRevealItem} onRevealComplete={() => setGwmRevealDone(true)} />
                      )}
                      {gwmRevealDone && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(139,92,246,0.04)',
                          border: '2px dashed rgba(139,92,246,0.25)', borderRadius: 10,
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                          gap: 10, animation: 'popIn 0.3s ease-out' }}>
                          <div style={{ fontSize: 28 }}>🔒</div>
                          <div style={{ fontSize: 13, fontWeight: 900, color: 'rgba(139,92,246,0.8)' }}>Stimulus Hidden</div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(139,92,246,0.55)' }}>
                            Read the question above and choose your answer
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* VERTICAL DIVIDER */}
                <div style={{ background: 'rgba(26,35,50,0.08)', width: 1 }} />

                {/* ── RIGHT: options ── */}
                <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexShrink: 0 }}>
                    <hr style={{ flex: 1, border: 'none', borderTop: '1px solid rgba(26,35,50,0.08)' }} />
                    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1.2px',
                      color: gwmLocked ? color : '#9999AA',
                      textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                      {gwmLocked ? '🧠 Memorise the stimulus...' : 'Choose one answer'}
                    </span>
                    <hr style={{ flex: 1, border: 'none', borderTop: '1px solid rgba(26,35,50,0.08)' }} />
                  </div>

                  {/* Options — hidden during reveal, shown after */}
                  {gwmLocked ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, opacity: 0.45 }}>
                      <div style={{ fontSize: 36 }}>🧠</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#8B5CF6', textAlign: 'center' }}>
                        Options will appear after<br/>the stimulus is hidden
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minHeight: 0,
                      overflow: 'hidden', animation: 'popIn 0.3s ease-out' }}>
                      {pracOptsWrapped.map((opt, si) => {
                        let state = null;
                        if (practiceAnswered) {
                          if (si === pracCorrect) state = 'correct';
                          else if (si === selectedPracOpt) state = 'wrong';
                          else state = 'faded';
                        }
                        return (
                          <OptionBtn key={si} opt={opt} letter={letters[si]}
                            onClick={() => handlePickPrac(si)} state={state}
                            disabled={practiceAnswered} isVisual={pracIsVisual} />
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* FOOTER */}
              <div style={{ borderTop: '1px solid rgba(26,35,50,0.08)', padding: '10px 22px 14px',
                display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0,
                background: '#FFFFFF', minHeight: 56 }}>
                {!practiceAnswered && (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8,
                    fontSize: 11, fontWeight: 600, color: '#9999AA' }}>
                    <span style={{ width: 26, height: 26, borderRadius: 8,
                      background: '#f5f2ed', border: '1px solid rgba(26,35,50,0.1)',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>👆</span>
                    {gwmLocked ? 'Watch the stimulus carefully...' : 'Select an answer from the options'}
                  </div>
                )}
                {practiceAnswered && (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      flex: 1, padding: '9px 14px', borderRadius: 12, fontWeight: 700, fontSize: 12,
                      background: selectedPracOpt === pracCorrect ? '#E1F5EE' : '#FAECE7',
                      border: selectedPracOpt === pracCorrect ? '1.5px solid rgba(29,158,117,0.3)' : '1.5px solid rgba(216,90,48,0.3)',
                      color: selectedPracOpt === pracCorrect ? '#1D9E75' : '#D85A30',
                    }}>
                      {selectedPracOpt === pracCorrect ? '✓ Correct!' : '✗ Not quite'}
                      {pracExplain && <span style={{ fontWeight: 400, marginLeft: 8 }}>— {pracExplain}</span>}
                    </div>
                    <button onClick={() => setStep('feedback')} style={{
                      padding: '10px 28px', borderRadius: 13, border: 'none', cursor: 'pointer',
                      background: '#6448A8', color: '#fff', fontWeight: 600, fontSize: 14,
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      boxShadow: '0 4px 14px rgba(100,72,168,0.28)', flexShrink: 0,
                      animation: 'popIn 0.3s ease-out',
                    }}>
                      Continue →
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // ── Non-GWM practice: same full-screen card layout as actual test ──
    const letters = ['A','B','C','D','E','F','G','H'];
    const pracOptsWrapped = pracOpts.map((o, i) => ({ value: o, origIdx: i }));
    const pracIsVisual = optsAreTokens;
    return (
      <div className="relative h-screen flex flex-col overflow-hidden"
        style={{
          background: '#f5f2ed',
          fontFamily: "'DM Sans', sans-serif",
          WebkitFontSmoothing: 'antialiased',
        }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
          @keyframes popIn { 0% { transform: scale(0.82); opacity: 0; } 70% { transform: scale(1.04); } 100% { transform: scale(1); opacity: 1; } }
          @keyframes slideInCard { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
          .opt-thumb { display:flex!important; align-items:center!important; justify-content:center!important; overflow:hidden!important; border-radius:11px!important; }
          .opt-thumb > div { width:100%!important; height:100%!important; display:flex!important; align-items:center!important; justify-content:center!important; }
          .opt-thumb svg { display:block!important; width:100%!important; height:100%!important; }
          .opt-thumb img { display:block!important; width:100%!important; height:100%!important; object-fit:contain!important; }
          .stim-inner { overflow:hidden; }
          .stim-inner > div { width:100%!important; height:100%!important; display:flex!important; align-items:center!important; justify-content:center!important; }
          .stim-inner svg { display:block!important; max-width:100%!important; max-height:100%!important; width:auto!important; height:auto!important; }
          .stim-inner img { display:block!important; max-width:100%!important; max-height:100%!important; object-fit:contain!important; }
        `}</style>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: '8px 12px 12px' }}>
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            background: '#FFFFFF', borderRadius: 18,
            border: '1px solid rgba(26,35,50,0.08)',
            boxShadow: '0 1px 1px rgba(26,35,50,0.04), 0 4px 12px rgba(26,35,50,0.06), 0 16px 40px rgba(26,35,50,0.08)',
            animation: 'slideInCard 0.3s cubic-bezier(.4,0,.2,1)',
            overflow: 'hidden', position: 'relative', minHeight: 0,
          }}>
            {/* Top accent line */}
            <div style={{ position: 'absolute', top: 0, left: '8%', right: '8%', height: 2,
              background: `linear-gradient(90deg,transparent,${color},transparent)`,
              borderRadius: 99, zIndex: 1 }} />

            {/* BODY: left | divider | right */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr', flex: 1, minHeight: 0, overflow: 'hidden' }}>

              {/* ── LEFT: question + stimulus ── */}
              <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0, background: '#F3F0FB' }}>
                {/* Domain chip */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, marginBottom: 8 }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px',
                    borderRadius: 20, background: bg, border: `1px solid ${color}30`,
                    fontSize: 10, fontWeight: 700, color: dark, letterSpacing: '0.3px' }}>
                    {meta.icon} Practice
                  </div>
                </div>

                {/* Prompt */}
                <div style={{ fontFamily: "'DM Serif Display', Georgia, serif", color: '#1A1A2E',
                  fontSize: 'clamp(13px,1.4vw,17px)', flexShrink: 0, marginBottom: 8, lineHeight: 1.45 }}>
                  {pracQ}
                </div>
                {pracSub && (
                  <p style={{ fontSize: 12, color: '#9999AA', lineHeight: 1.5, marginBottom: 8, flexShrink: 0 }}>{pracSub}</p>
                )}

                {/* Stimulus card */}
                <div style={{
                  flex: 1, minHeight: 0, background: '#FFFFFF', borderRadius: 10,
                  border: '1.5px solid rgba(26,35,50,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: 4, overflow: 'hidden', position: 'relative',
                }}>
                  <div className="stim-inner" style={{ width: '100%', height: '100%', position: 'relative',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                    flexWrap: 'wrap', gap: 6, padding: 8 }}>
                    {seqHasTokens ? (
                      /* Visual tokens from DB (shapes / images) */
                      dbSeq.map((token, idx) => (
                        <div key={idx} style={{
                          border: token === null ? '2px dashed #a5b4fc' : '1px solid #e8eaf0',
                          borderRadius: 10, padding: 6,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: token === null ? '#eef2ff' : '#fff', minWidth: 56, minHeight: 56,
                        }}>
                          {token === null
                            ? <span style={{ fontSize: 22, fontWeight: 900, color: '#6366F1', fontFamily: "'Fredoka One', cursive" }}>?</span>
                            : <TokenRenderer token={token} sz={120} card={String(token).startsWith('excel_img:')} />}
                        </div>
                      ))
                    ) : seqHasText ? (
                      /* Text sequence from DB (numbers, letters, words) */
                      (() => {
                        const nonNull = dbSeq.filter(Boolean);
                        const isPassage = dbC?.displayMode === 'text_passage' ||
                          (nonNull.length === 1 && String(nonNull[0]).length > 80);
                        if (isPassage) {
                          return (
                            <div style={{ padding: '10px 4px', width: '100%', overflowY: 'auto' }}>
                              <p style={{ fontSize: 14, lineHeight: 1.75, color: '#1A1A2E',
                                fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 400, textAlign: 'left', margin: 0 }}>
                                {nonNull.join(' ')}
                              </p>
                            </div>
                          );
                        }
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
                            gap: 8, flexWrap: 'wrap', width: '100%' }}>
                            {dbSeq.map((tok, i) => (
                              <div key={i} style={{
                                color: tok === null ? dark : '#1A1A2E',
                                background: tok === null ? bg : '#FFFFFF',
                                borderRadius: 10, padding: '8px 16px',
                                fontFamily: "'Fredoka One', cursive", fontWeight: 900,
                                fontSize: 'clamp(18px, 3vw, 30px)',
                                border: tok === null ? `2px dashed ${color}` : `1.5px solid ${color}33`,
                                minWidth: 44, textAlign: 'center',
                              }}>
                                {tok === null ? '?' : tok}
                              </div>
                            ))}
                          </div>
                        );
                      })()
                    ) : hasDbItem ? (
                      /* DB item exists but has no sequence — text-only question (prompt is shown above) */
                      <div style={{ textAlign: 'center', padding: 16 }}>
                        <div style={{ fontSize: 40, marginBottom: 6 }}>{meta.icon}</div>
                        <p style={{ fontSize: 12, color: '#9999AA' }}>Read the question above and choose your answer</p>
                      </div>
                    ) : DOMAIN_PRACTICE_SVG[domain] ? (
                      /* No DB item at all — fall back to static illustrative SVG */
                      DOMAIN_PRACTICE_SVG[domain]
                    ) : (
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 40, marginBottom: 6 }}>{meta.icon}</div>
                        <p style={{ fontSize: 11, color: '#9999AA' }}>Practice question</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* VERTICAL DIVIDER */}
              <div style={{ background: 'rgba(26,35,50,0.08)', width: 1 }} />

              {/* ── RIGHT: options ── */}
              <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexShrink: 0 }}>
                  <hr style={{ flex: 1, border: 'none', borderTop: '1px solid rgba(26,35,50,0.08)' }} />
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1.2px',
                    color: '#9999AA', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    Choose one answer
                  </span>
                  <hr style={{ flex: 1, border: 'none', borderTop: '1px solid rgba(26,35,50,0.08)' }} />
                </div>

                {/* Options */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minHeight: 0, overflow: 'hidden' }}>
                  {pracOptsWrapped.map((opt, si) => {
                    let state = null;
                    if (practiceAnswered) {
                      if (si === pracCorrect) state = 'correct';
                      else if (si === selectedPracOpt) state = 'wrong';
                      else state = 'faded';
                    }
                    return (
                      <OptionBtn key={si} opt={opt} letter={letters[si]}
                        onClick={() => handlePickPrac(si)} state={state}
                        disabled={practiceAnswered} isVisual={pracIsVisual} />
                    );
                  })}
                </div>
              </div>
            </div>

            {/* FOOTER */}
            <div style={{ borderTop: '1px solid rgba(26,35,50,0.08)', padding: '10px 22px 14px',
              display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0,
              background: '#FFFFFF', minHeight: 56 }}>
              {!practiceAnswered && (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8,
                  fontSize: 11, fontWeight: 600, color: '#9999AA' }}>
                  <span style={{ width: 26, height: 26, borderRadius: 8,
                    background: '#f5f2ed', border: '1px solid rgba(26,35,50,0.1)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>👆</span>
                  Select an answer from the options
                </div>
              )}
              {practiceAnswered && (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    flex: 1, padding: '9px 14px', borderRadius: 12, fontWeight: 700, fontSize: 12,
                    background: selectedPracOpt === pracCorrect ? '#e8f3ec' : '#faeae4',
                    border: selectedPracOpt === pracCorrect ? '1.5px solid rgba(95,143,114,0.3)' : '1.5px solid rgba(201,125,95,0.3)',
                    color: selectedPracOpt === pracCorrect ? '#5f8f72' : '#c97d5f',
                  }}>
                    {selectedPracOpt === pracCorrect ? '✓ Correct!' : '✗ Not quite'}
                    {pracExplain && <span style={{ fontWeight: 400, marginLeft: 8 }}>— {pracExplain}</span>}
                  </div>
                  <button onClick={() => setStep('feedback')} style={{
                    padding: '10px 28px', borderRadius: 13, border: 'none', cursor: 'pointer',
                    background: '#1a2332', color: '#fff', fontWeight: 600, fontSize: 14,
                    fontFamily: "'DM Sans', sans-serif",
                    flexShrink: 0,
                    animation: 'popIn 0.3s ease-out',
                  }}>
                    Continue →
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );

  }

  // ══ S5 FEEDBACK ══
  if (step === 'feedback') {
    return (
      <Shell>
        <div className="cg-split">
          {/* Left: Result indicator */}
          <div className="cg-left" style={{ background: isPracCorrect ? '#e8f3ec' : '#faeae4', padding: '34px 30px', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <div style={{ width: 78, height: 78, borderRadius: '50%', background: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18, animation: 'cgPopIn .5s cubic-bezier(0.34,1.56,0.64,1)' }}>
              {isPracCorrect
                ? <svg width="38" height="38" viewBox="0 0 38 38"><path d="M6 19 L16 29 L32 11" stroke="#5f8f72" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                : <svg width="38" height="38" viewBox="0 0 38 38"><path d="M10 10 L28 28 M28 10 L10 28" stroke="#c97d5f" strokeWidth="4" fill="none" strokeLinecap="round"/></svg>
              }
            </div>
            <h2 className="cg-display" style={{ fontSize: 30, color: '#1a2332', marginBottom: 10 }}>
              {isPracCorrect ? "That's correct!" : 'Not quite!'}
            </h2>
            <p style={{ fontSize: 13, color: '#4a5568', lineHeight: 1.7, maxWidth: 270 }}>
              {isPracCorrect ? 'Great reasoning! You identified the rule perfectly.' : "Here's why the correct answer works:"}
            </p>
          </div>
          {/* Right: Reasoning + CTA */}
          <div className="cg-right" style={{ justifyContent: 'space-between' }}>
            <div className="cg-card" style={{ flex: 1 }}>
              <p className="cg-section-label">The reasoning</p>
              <p style={{ fontSize: 13, color: '#4a5568', lineHeight: 1.65 }}>{pracExplain || 'Review the options and think about the pattern before choosing your answer.'}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 18 }}>
              <button className="cg-btn-primary" onClick={() => setStep('ready')}>I'm Ready to Begin!</button>
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  // ══ S6 READY ══
  if (step === 'ready') {
    return (
      <Shell>
        <div className="cg-split">
          {/* Left: Icon + identity */}
          <div className="cg-left" style={{ background: '#fdfaf5', padding: '34px 30px', alignItems: 'center', justifyContent: 'center', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', right: -40, bottom: -40, width: 180, height: 180, borderRadius: '50%', background: `radial-gradient(circle, ${warmCol.color}12 0%, transparent 70%)`, pointerEvents: 'none' }} />
            <div style={{ width: 84, height: 84, borderRadius: '50%', background: warmCol.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18, filter: `drop-shadow(0 6px 16px ${warmCol.color}33)`, animation: 'cgPulse 2s ease-in-out infinite', zIndex: 1 }}>
              <svg width="38" height="38" viewBox="0 0 38 38"><polygon points="10,6 32,19 10,32" fill={warmCol.color}/></svg>
            </div>
            <span className="cg-pill" style={{ background: warmCol.bg, color: warmCol.dark, border: `1px solid ${warmCol.color}40`, marginBottom: 12, zIndex: 1 }}>
              {cfg.abbr} · {meta.label}
            </span>
            <h2 className="cg-display" style={{ fontSize: 30, color: '#1a2332', marginBottom: 10, zIndex: 1 }}>You're all set!</h2>
            <p style={{ fontSize: 13, color: '#4a5568', lineHeight: 1.7, maxWidth: 260, zIndex: 1 }}>
              The real questions begin now. Trust your instincts — there's always one right answer.
            </p>
          </div>
          {/* Right: Tip + Start */}
          <div className="cg-right" style={{ justifyContent: 'center', gap: 20 }}>
            <div>
              <p className="cg-section-label" style={{ textAlign: 'center' }}>Strategy tip</p>
              <div style={{ borderRadius: 13, padding: '14px 18px', fontSize: 13, fontWeight: 500, lineHeight: 1.6, textAlign: 'center', width: '100%', background: warmCol.bg, color: warmCol.dark, border: `1px solid ${warmCol.color}30` }}>
                {cfg.tip}
              </div>
            </div>
            <button className="cg-btn-primary" onClick={onStart} style={{ marginTop: 8 }}>
              Start {meta.label} →
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  return null;
}

// ═══════════════════════════════════════════
// RESULTS SCREEN
// ═══════════════════════════════════════════
function ResultsScreen({ scores, onDone }) {
  const globalScore = scores?.scores?.find(s => s.trait_or_dim === 'global_theta');
  const domainScores = scores?.scores?.filter(s => s.domain !== 'global' && s.domain !== 'cluster') || [];
  const clusters = scores?.scores?.filter(s => s.domain === 'cluster') || [];
  return (
    <div style={{
      width: '100%', height: '100vh',
      background: '#f5f2ed',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, fontFamily: "'DM Sans', sans-serif",
      WebkitFontSmoothing: 'antialiased',
    }}>
      <style>{`@keyframes cgScaleIn { from { transform: scale(0.88); opacity: 0; } to { transform: scale(1); opacity: 1; } }`}</style>
      <div style={{
        width: '100%', maxWidth: 600, background: '#FFFFFF',
        borderRadius: 20, padding: 40, textAlign: 'center',
        border: '1px solid rgba(26,35,50,0.08)',
        boxShadow: '0 8px 48px rgba(26,35,50,0.09)',
        animation: 'cgScaleIn 0.35s ease-out',
      }}>
        {/* Final illustration */}
        <svg width="84" height="84" viewBox="0 0 96 96" style={{ marginBottom: 16, filter: 'drop-shadow(0 8px 24px rgba(26,35,50,0.15))' }}>
          <circle cx="48" cy="48" r="44" fill="#e8f3ec"/>
          <circle cx="33" cy="40" r="8" fill="#5f8f72"/>
          <circle cx="63" cy="40" r="8" fill="#5f8f72"/>
          <circle cx="48" cy="60" r="8" fill="#c97d5f"/>
          <circle cx="18" cy="58" r="5" fill="#a8ccb4" opacity=".5"/>
          <circle cx="78" cy="58" r="5" fill="#a8ccb4" opacity=".5"/>
        </svg>
        <p style={{ fontSize: 10, letterSpacing: '2.5px', color: '#5f8f72', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Assessment Complete</p>
        <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 36, color: '#1a2332', lineHeight: 1.15, marginBottom: 12 }}>Amazing work!</h2>
        {globalScore && (
          <div style={{ margin: '16px 0', padding: '14px 0', borderTop: '1px solid rgba(26,35,50,0.08)', borderBottom: '1px solid rgba(26,35,50,0.08)' }}>
            <div style={{ fontSize: 36, fontWeight: 700, color: '#5f8f72' }}>{parseFloat(globalScore.raw_score).toFixed(2)}</div>
            <div style={{ fontSize: 13, color: '#4a5568', marginTop: 4 }}>{globalScore.descriptor}</div>
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20, textAlign: 'left' }}>
          {domainScores.map(s => {
            const dm = DOMAIN_META[s.domain] || {};
            const dcfg = DOMAIN_CFG[s.domain] || {};
            const theta = parseFloat(s.raw_score);
            const pct = Math.max(0, Math.min(100, ((theta + 3) / 6) * 100));
            return (
              <div key={s.id || s.trait_or_dim} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 12, background: '#f5f2ed', border: '1px solid rgba(26,35,50,0.08)' }}>
                <span style={{ fontSize: 18 }}>{dm.icon || '📊'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#4a5568', marginBottom: 4 }}>{dm.label || s.domain}</div>
                  <div style={{ height: 5, borderRadius: 3, overflow: 'hidden', background: '#ede9e3' }}>
                    <div style={{ height: '100%', borderRadius: 3, width: `${pct}%`, background: dcfg.color || dm.color || '#5f8f72', transition: 'width 1s ease' }} />
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'monospace', color: '#1a2332' }}>{theta.toFixed(2)}</div>
                  <div style={{ fontSize: 10, color: '#8898aa' }}>{s.descriptor}</div>
                </div>
              </div>
            );
          })}
        </div>
        {clusters.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '2px', color: '#8898aa', marginBottom: 8 }}>Aptitude Clusters</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              {clusters.map(c => (
                <div key={c.trait_or_dim} style={{ padding: '6px 14px', borderRadius: 10, background: '#e8f3ec', border: '1px solid rgba(95,143,114,0.2)' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'monospace', color: '#5f8f72' }}>{parseFloat(c.raw_score).toFixed(2)}</div>
                  <div style={{ fontSize: 9, fontWeight: 600, color: '#a8ccb4', textTransform: 'capitalize' }}>{c.trait_or_dim}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        <button onClick={onDone} style={{
          padding: '14px 40px', borderRadius: 12, border: 'none', cursor: 'pointer',
          background: '#1a2332', color: '#fff', fontWeight: 600, fontSize: 14,
          fontFamily: "'DM Serif Display', serif",
          letterSpacing: '0.2px', transition: 'background 0.18s',
        }}
          onMouseEnter={e => { e.currentTarget.style.background = '#2d3d52'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#1a2332'; }}>
          View My Results
        </button>
        <p style={{ fontSize: 11, color: '#8898aa', marginTop: 12 }}>Thank you for your focus and effort today</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// WELCOME SCREEN — CogniMap Design v3
// ═══════════════════════════════════════════
function WelcomeScreen({ testType, batteryInfo, onStart }) {
  const sectionDots = [
    { label: 'Verbal reasoning',  color: '#5f8f72' },
    { label: 'Numerical aptitude', color: '#c97d5f' },
    { label: 'Abstract thinking',  color: '#c9963e' },
    { label: 'Working memory',     color: '#8b7ec8' },
    { label: 'Spatial reasoning',  color: '#8fa8d0' },
    { label: 'Processing speed',   color: '#a8ccb4' },
  ];

  return (
    <div style={{
      width: '100%', height: '100vh',
      background: '#f5f2ed',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '32px 20px',
      fontFamily: "'DM Sans', sans-serif",
      WebkitFontSmoothing: 'antialiased',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
        .wi-shell { width:100%; max-width:980px; display:grid; grid-template-columns:1fr 380px; min-height:580px; border-radius:20px; overflow:hidden; border:1px solid rgba(26,35,50,0.08); box-shadow:0 8px 48px rgba(26,35,50,0.09); }
        .wi-left { background:#fdfaf5; padding:48px 44px; display:flex; flex-direction:column; justify-content:space-between; position:relative; overflow:hidden; border-right:1px solid rgba(26,35,50,0.08); }
        .wi-left::before { content:''; position:absolute; right:-60px; bottom:-60px; width:260px; height:260px; border-radius:50%; background:radial-gradient(circle, rgba(95,143,114,0.1) 0%, transparent 70%); pointer-events:none; }
        .wi-left::after { content:''; position:absolute; left:-40px; top:40px; width:180px; height:180px; border-radius:50%; background:radial-gradient(circle, rgba(201,125,95,0.07) 0%, transparent 70%); pointer-events:none; }
        .wi-right { background:#ffffff; padding:48px 40px; display:flex; flex-direction:column; justify-content:center; }
        .wi-back { display:inline-flex; align-items:center; gap:6px; font-size:12.5px; color:#8898aa; cursor:pointer; margin-bottom:40px; transition:color .15s; background:none; border:none; font-family:'DM Sans',sans-serif; padding:0; }
        .wi-back:hover { color:#4a5568; }
        .wi-brand { font-size:10px; letter-spacing:2.5px; text-transform:uppercase; color:#5f8f72; font-weight:600; margin-bottom:14px; }
        .wi-headline { font-family:'DM Serif Display',serif; font-size:36px; color:#1a2332; line-height:1.2; letter-spacing:-0.3px; margin-bottom:16px; }
        .wi-headline em { color:#c97d5f; font-style:italic; }
        .wi-desc { font-size:14px; color:#4a5568; line-height:1.7; max-width:340px; margin-bottom:32px; }
        .wi-pills-label { font-size:10px; letter-spacing:2px; text-transform:uppercase; color:#8898aa; margin-bottom:8px; }
        .wi-pills { display:flex; gap:8px; flex-wrap:wrap; }
        .wi-spill { display:flex; align-items:center; gap:6px; padding:7px 13px; background:#ffffff; border:1px solid rgba(26,35,50,0.08); border-radius:20px; font-size:12px; color:#4a5568; font-weight:400; }
        .wi-spill-dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; }
        .wi-right-label { font-size:10px; letter-spacing:2px; text-transform:uppercase; color:#8898aa; margin-bottom:20px; }
        .wi-info-rows { display:flex; flex-direction:column; border:1px solid rgba(26,35,50,0.08); border-radius:12px; overflow:hidden; margin-bottom:28px; }
        .wi-info-row { display:flex; align-items:center; justify-content:space-between; padding:14px 18px; border-bottom:1px solid rgba(26,35,50,0.08); transition:background .12s; }
        .wi-info-row:last-child { border-bottom:none; }
        .wi-info-row:hover { background:#f5f2ed; }
        .wi-info-key { font-size:13px; color:#8898aa; display:flex; align-items:center; gap:8px; }
        .wi-info-key svg { width:13px; height:13px; stroke:#8898aa; fill:none; stroke-width:1.6; flex-shrink:0; }
        .wi-info-val { font-size:13px; font-weight:600; color:#1a2332; }
        .wi-divider { display:flex; align-items:center; gap:12px; margin-bottom:24px; }
        .wi-divider-line { flex:1; height:1px; background:rgba(26,35,50,0.08); }
        .wi-divider-text { font-size:11px; color:#8898aa; }
        .wi-reassurances { display:flex; flex-direction:column; gap:8px; margin-bottom:28px; }
        .wi-reassure { display:flex; align-items:center; gap:9px; font-size:12.5px; color:#4a5568; }
        .wi-reassure svg { width:14px; height:14px; stroke:#5f8f72; fill:none; stroke-width:1.8; flex-shrink:0; }
        .wi-begin { width:100%; padding:15px; background:#1a2332; color:white; border:none; border-radius:12px; font-size:14px; font-weight:600; font-family:'DM Serif Display',serif; cursor:pointer; letter-spacing:0.2px; transition:background .18s, transform .12s; display:flex; align-items:center; justify-content:center; gap:8px; }
        .wi-begin:hover { background:#2d3d52; }
        .wi-begin:active { transform:scale(0.99); }
        .wi-begin svg { width:15px; height:15px; stroke:white; fill:none; stroke-width:2; }
        .wi-note { text-align:center; font-size:11.5px; color:#8898aa; margin-top:12px; }
        @keyframes wiFadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .wi-left > *:nth-child(1) { animation:wiFadeUp .5s .05s ease both; }
        .wi-pills { animation:wiFadeUp .5s .15s ease both; }
        .wi-right-label { animation:wiFadeUp .45s .08s ease both; }
        .wi-info-rows { animation:wiFadeUp .45s .14s ease both; }
        .wi-divider { animation:wiFadeUp .45s .20s ease both; }
        .wi-reassurances { animation:wiFadeUp .45s .24s ease both; }
        .wi-begin { animation:wiFadeUp .45s .30s ease both; }
        .wi-note { animation:wiFadeUp .45s .34s ease both; }
        @media(max-width:620px) { .wi-shell { grid-template-columns:1fr; } .wi-left { border-right:none; border-bottom:1px solid rgba(26,35,50,0.08); padding:32px 28px; } .wi-right { padding:32px 28px; } }
      `}</style>

      <div className="wi-shell">

        {/* LEFT */}
        <div className="wi-left">
          <div style={{ zIndex: 1 }}>
            <button className="wi-back" onClick={() => window.history.back()}>
              <svg viewBox="0 0 14 14" width="14" height="14"><path d="M9 2L4 7l5 5" stroke="currentColor" fill="none" strokeWidth="1.6"/></svg>
              Back to dashboard
            </button>

            <div className="wi-brand">CogniMap · Assessment</div>

            <div className="wi-headline">
              Discover how<br/>
              your <em>mind works</em>
            </div>

            <div className="wi-desc">
              A journey through {batteryInfo ? batteryInfo.sectionCount : '—'} sections — designed just for you.<br/>
              No right or wrong answers, just your best thinking.
            </div>
          </div>

          <div style={{ zIndex: 1 }}>
            <div className="wi-pills-label">What you'll explore</div>
            <div className="wi-pills">
              {sectionDots.map(s => (
                <div key={s.label} className="wi-spill">
                  <div className="wi-spill-dot" style={{ background: s.color }} />
                  {s.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="wi-right">
          <div className="wi-right-label">About this assessment</div>

          <div className="wi-info-rows">
            {[
              { icon: <svg viewBox="0 0 13 13"><circle cx="6.5" cy="6.5" r="5.5"/><path d="M6.5 3.5V6.5l2 2"/></svg>, label: 'Total time', val: batteryInfo ? `~${batteryInfo.estimatedMinutes} minutes` : '—' },
              { icon: <svg viewBox="0 0 13 13"><path d="M2 10V4a1 1 0 011-1h7a1 1 0 011 1v6"/><path d="M1 10h11"/><path d="M5 6h3"/><path d="M5 8h2"/></svg>, label: 'Questions', val: batteryInfo?.totalItems ? `${batteryInfo.totalItems} questions` : '—' },
              { icon: <svg viewBox="0 0 13 13"><rect x="1.5" y="1.5" width="4" height="4" rx="1"/><rect x="7.5" y="1.5" width="4" height="4" rx="1"/><rect x="1.5" y="7.5" width="4" height="4" rx="1"/><rect x="7.5" y="7.5" width="4" height="4" rx="1"/></svg>, label: 'Sections', val: batteryInfo ? `${batteryInfo.sectionCount} section${batteryInfo.sectionCount !== 1 ? 's' : ''}` : '—' },
              { icon: <svg viewBox="0 0 13 13"><path d="M6.5 1v2M6.5 10v2M1 6.5h2M10 6.5h2"/><circle cx="6.5" cy="6.5" r="3"/></svg>, label: 'Practice rounds', val: batteryInfo?.hasPracticeItems ? 'Before every section' : 'Not included' },
              { icon: <svg viewBox="0 0 13 13"><path d="M2 6.5h9M8 4l3 2.5L8 9"/></svg>, label: 'Short breaks', val: batteryInfo?.hasBreaks ? 'Between sections' : 'None' },
            ].map(row => (
              <div key={row.label} className="wi-info-row">
                <span className="wi-info-key">{row.icon}{row.label}</span>
                <span className="wi-info-val">{row.val}</span>
              </div>
            ))}
          </div>

          <div className="wi-divider">
            <div className="wi-divider-line" />
            <span className="wi-divider-text">before you begin</span>
            <div className="wi-divider-line" />
          </div>

          <div className="wi-reassurances">
            <div className="wi-reassure">
              <svg viewBox="0 0 14 14"><path d="M2 7l3 3 7-6"/></svg>
              Your progress is saved automatically
            </div>
            <div className="wi-reassure">
              <svg viewBox="0 0 14 14"><path d="M2 7l3 3 7-6"/></svg>
              You can pause and return any time
            </div>
            <div className="wi-reassure">
              <svg viewBox="0 0 14 14"><path d="M2 7l3 3 7-6"/></svg>
              Find a quiet space with no distractions
            </div>
          </div>

          <button className="wi-begin" onClick={onStart}>
            Begin assessment
            <svg viewBox="0 0 15 15"><path d="M3 7.5h9M9 4l4 3.5L9 11"/></svg>
          </button>

          <div className="wi-note">Take it at your own pace · No time pressure</div>
        </div>

      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN TEST RUNNER — UNIVERSAL
// ═══════════════════════════════════════════════════════════════════════════════
export default function TestRunner() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [progress, setProgress] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [shuffledOpts, setShuffledOpts] = useState([]);
  const [correctShuffledIdx, setCorrectShuffledIdx] = useState(0);
  const [timerPct, setTimerPct] = useState(100);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scores, setScores] = useState(null);
  const [showDomainIntro, setShowDomainIntro] = useState(null);
  const [testType, setTestType] = useState('cognitive');
  const [likertValue, setLikertValue] = useState(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const [pendingStart, setPendingStart] = useState(null);
  const [batteryInfo, setBatteryInfo] = useState(null);
  const [guideMsg, setGuideMsg] = useState(null);
  // Memory reveal: options locked until reveal completes
  const [memoryOptionsLocked, setMemoryOptionsLocked] = useState(false);
  // Pending choice: selected but not yet submitted
  const [pendingChoice, setPendingChoice] = useState(null);
  const startMsRef = useRef(0);
  const timerRef = useRef(null);
  const timerEndRef = useRef(0);
  const lastDomainRef = useRef(null);
  const sendResponseRef = useRef(null);

  useEffect(() => {
    api.post(`/sessions/${sessionId}/start`)
      .then(data => {

        console.log("")
        if (data.testType) setTestType(data.testType);
        if (data.batteryInfo) setBatteryInfo(data.batteryInfo);
        if (data.complete) { navigate(`/test/${sessionId}/complete`, { state: { scores: data.scores } }); setShowWelcome(false); }
        else {
          setPendingStart({ item: data.item, progress: data.progress });
        }
      })
      .catch(err => setError(err.message || 'Failed to start'))
      .finally(() => setLoading(false));
  }, [sessionId]);

  const receiveItem = useCallback((newItem, prog) => {
    if (!newItem) return;
    if (prog && prog.testType !== 'personality' && prog.testType !== 'interest' &&
        (lastDomainRef.current === null || prog.domain !== lastDomainRef.current)) {
      setShowDomainIntro({ domain: prog.domain, label: prog.domainLabel, item: newItem, progress: prog });
      lastDomainRef.current = prog.domain;
      return;
    }
    if (prog) lastDomainRef.current = prog.domain || prog.section;
    setItem(newItem);
    setProgress(prog);
    setAnswered(false);
    setSelectedIdx(null);
    setPendingChoice(null);
    setLikertValue(null);
    setGuideMsg(null);

    // Check if this is a memory_reveal item — lock options until reveal completes
    const rm = resolveRenderMode(newItem);
    if (rm === 'memory_reveal') {
      setMemoryOptionsLocked(true);
    } else {
      setMemoryOptionsLocked(false);
    }

    if (newItem.options && newItem.options.length > 0) {
      // ── Auto-derive excel_img option paths from stim token ──
      // If the sequence has "excel_img:folder/Base_stim.ext" tokens and options are NOT excel_img tokens,
      // replace each option value with "excel_img:folder/Base_optA.ext", "…_optB.ext", etc.
      const OPT_LETTERS = ['A','B','C','D','E'];
      const stimToken = (newItem.sequence || []).find(t => typeof t==='string' && t.startsWith('excel_img:') && t.includes('_stim.'));
      const optionsNeedImageDerive = stimToken && newItem.options.every(o => !String(o.value||'').startsWith('excel_img:'));
      let derivedOptions = newItem.options;
      if (stimToken && optionsNeedImageDerive) {
        // e.g. "excel_img:matrix_2x2/Gf_B1_031_stim.svg" → base="excel_img:matrix_2x2/Gf_B1_031"
        const stimBase = stimToken.replace(/_stim\.[^.]+$/, '');
        const ext = stimToken.match(/_stim(\.[^.]+)$/)?.[1] || '.svg';
        derivedOptions = newItem.options.map((o, i) => ({
          ...o,
          value: `${stimBase}_opt${OPT_LETTERS[i] || i}${ext}`,
        }));
      }
      const indexed = derivedOptions.map((o, i) => ({ ...o, origIdx: i }));
      // memory_reveal (GWM) options must stay in the exact Excel order — do not shuffle
      const shuf = rm === 'memory_reveal' ? indexed : shuffle(indexed);
      setShuffledOpts(shuf);
      // Prefer tag='correct' on options (most reliable), fall back to correctIndex
      const tagIdx = indexed.findIndex(o => o.tag === 'correct');
      const correctOrigIdx = tagIdx >= 0 ? tagIdx : (newItem.correctIndex ?? 0);
      setCorrectShuffledIdx(shuf.findIndex(o => o.origIdx === correctOrigIdx));
    } else {
      setShuffledOpts([]);
      setCorrectShuffledIdx(-1);
    }
    startMsRef.current = Date.now();
    clearInterval(timerRef.current);

    // For memory_reveal, don't start the answer timer until reveal completes
    if (rm !== 'memory_reveal' && newItem.timeLimitSec && newItem.timeLimitSec > 0) {
      timerEndRef.current = Date.now() + newItem.timeLimitSec * 1000;
      setTimerPct(100);
      timerRef.current = setInterval(() => {
        const rem = timerEndRef.current - Date.now();
        if (rem <= 0) { clearInterval(timerRef.current); setTimerPct(0); handleTimeout(); }
        else setTimerPct((rem / (newItem.timeLimitSec * 1000)) * 100);
      }, 50);
    } else {
      setTimerPct(100);
    }
  }, []);

  // Called when MemoryRevealDisplay finishes showing stimulus
  const handleMemoryRevealComplete = useCallback(() => {
    setMemoryOptionsLocked(false);
    startMsRef.current = Date.now(); // reset RT to after reveal
    // Start the answer timer (remaining time after reveal)
    if (item && item.timeLimitSec) {
      const revealDuration = Math.max(3, Math.min(10, Math.round(item.timeLimitSec * 0.4)));
      const answerTime = Math.max(5, item.timeLimitSec - revealDuration);
      timerEndRef.current = Date.now() + answerTime * 1000;
      setTimerPct(100);
      timerRef.current = setInterval(() => {
        const rem = timerEndRef.current - Date.now();
        if (rem <= 0) { clearInterval(timerRef.current); setTimerPct(0); handleTimeout(); }
        else setTimerPct((rem / (answerTime * 1000)) * 100);
      }, 50);
    }
  }, [item]);

  const startDomainSection = useCallback(() => {
    if (!showDomainIntro) return;
    const { item: newItem, progress: prog } = showDomainIntro;
    setShowDomainIntro(null);
    receiveItem(newItem, prog);
  }, [showDomainIntro, receiveItem]);

  // ── Scoring helpers ──
  const resolveAgeBand = useCallback((itm) => {
    const band = itm?.ageBand || itm?.content?.ageBand || null;
    if (band) return band;
    const minAge = itm?.age_band_min;
    if (minAge != null) {
      if (minAge <= 10) return '8-10';
      if (minAge <= 13) return '11-13';
      return '14-18';
    }
    return '8-10';
  }, []);

  const computeScore = useCallback((itm, chosenOrigIdx, isCorrect) => {
    if (!itm) return { rawScore: isCorrect ? 1 : 0, weightedScore: isCorrect ? 1 : 0, ageMultiplier: 1, posMultiplier: 1 };
    const baseScore = itm.baseScore ?? 1;
    const equalDist = itm.equalDistribute ?? false;
    const ageWeightage = itm.ageWeightage ?? null;
    const options = itm.options ?? [];
    let rawScore = 0;
    if (chosenOrigIdx !== null && chosenOrigIdx >= 0 && chosenOrigIdx < options.length) {
      const opt = options[chosenOrigIdx];
      if (opt?.score !== undefined && opt.score !== null) {
        rawScore = opt.score;
      } else {
        rawScore = isCorrect ? baseScore : 0;
      }
    }
    if (equalDist && isCorrect) {
      const correctCount = options.filter(o => o.tag === 'correct' || (o.score ?? 0) > 0).length;
      rawScore = correctCount > 0 ? baseScore / correctCount : baseScore;
    }
    let ageMultiplier = 1;
    let posMultiplier = 1;
    if (ageWeightage) {
      const ageBand = resolveAgeBand(itm);
      ageMultiplier = ageWeightage.standard?.[ageBand] ?? 1;
      if (isCorrect) {
        posMultiplier = ageWeightage.positive?.[ageBand] ?? 1;
      }
    }
    const weightedScore = rawScore * ageMultiplier * posMultiplier;
    return { rawScore, weightedScore, ageMultiplier, posMultiplier };
  }, [resolveAgeBand]);

  const sendResponse = useCallback(async (chosen, isCorrect, timedOut) => {
    if (!item) return;
    const rt = Date.now() - startMsRef.current;
    try {
      const chosenOrigIdx = chosen ? chosen.origIdx : null;
      const scoring = computeScore(item, chosenOrigIdx, isCorrect && !timedOut);
      const payload = {
        itemId: item._dbItemId,
        reactionTimeMs: rt,
        timedOut,
        rawScore: scoring.rawScore,
        weightedScore: scoring.weightedScore,
        ageMultiplier: scoring.ageMultiplier,
        posMultiplier: scoring.posMultiplier,
      };
      if (testType === 'personality' || testType === 'interest') {
        payload.likertValue = likertValue;
        payload.selectedIndex = likertValue;
      } else {
        payload.selectedIndex = chosen ? chosen.origIdx : null;
        payload.selectedValue = chosen ? { value: chosen.value, label: chosen.label } : null;
      }
      const data = await api.post(`/sessions/${sessionId}/respond`, payload);
      if (data.complete) {
        setTimeout(() => navigate(`/test/${sessionId}/complete`, { state: { scores: data.scores } }), testType === 'cognitive' ? 1200 : 400);
      } else {
        setItem(prev => ({ ...prev, _next: data.item, _nextProgress: data.progress }));
      }
    } catch (err) {
      console.error('Response error:', err);
    }
  }, [item, sessionId, testType, likertValue]);

  // Stage 1: just highlight the selection
  const choose = useCallback((si) => {
    if (answered || memoryOptionsLocked) return;
    setPendingChoice(si);
  }, [answered, memoryOptionsLocked]);

  // Stage 2: confirm + submit
  const submitAnswer = useCallback(() => {
    if (pendingChoice === null || answered || memoryOptionsLocked) return;
    clearInterval(timerRef.current);
    setAnswered(true); setSelectedIdx(pendingChoice);
    const chosen = shuffledOpts[pendingChoice];
    const correct = pendingChoice === correctShuffledIdx;
    setGuideMsg(randomGuide(correct ? 'correct' : 'wrong', item?.isPractice));
    sendResponse(chosen, correct, false);
  }, [pendingChoice, answered, memoryOptionsLocked, shuffledOpts, correctShuffledIdx, item, sendResponse]);

  sendResponseRef.current = sendResponse;

  const handleTimeout = useCallback(() => {
    setPendingChoice(null);
    setAnswered(true); setSelectedIdx(-1);
    clearInterval(timerRef.current);
    setGuideMsg(randomGuide('timeout', item?.isPractice));
    sendResponseRef.current?.(null, false, true);
  }, [item]);

  const nextItem = useCallback(() => {
    if (!item?._next) return;
    receiveItem(item._next, item._nextProgress);
  }, [item, receiveItem]);

  useEffect(() => () => clearInterval(timerRef.current), []);

  // ── Auto-advance: once answered AND the API has returned the next item,
  //    show feedback for 1 s then move on automatically (no "Next" button needed)
  useEffect(() => {
    if (!answered || !item?._next) return;
    const t = setTimeout(() => {
      receiveItem(item._next, item._nextProgress);
    }, 1000);
    return () => clearTimeout(t);
  }, [answered, item, receiveItem]);

  const isCorrect = selectedIdx !== null && selectedIdx >= 0 && selectedIdx === correctShuffledIdx;
  const isWrong = selectedIdx !== null && selectedIdx >= 0 && selectedIdx !== correctShuffledIdx;
  const isTimeout = selectedIdx === -1;
  const answerToken = answered && shuffledOpts[correctShuffledIdx] ? shuffledOpts[correctShuffledIdx].value : null;

  // ═══ UNIVERSAL RENDER MODE — replaces hardcoded isVisualDomain ═══
  const renderMode = item ? resolveRenderMode(item) : 'text';
  const isVisual = isVisualMode(renderMode);

  const meta = item ? (DOMAIN_META[item.domain] || { icon: '📝', label: 'Assessment', color: '#6366F1' }) : {};

  // ─── Loading ───
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#E8E4F5', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', margin: '0 auto 12px', border: '3px solid rgba(100,72,168,0.2)', borderTopColor: '#6448A8', animation: 'spin 0.65s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#555570' }}>Loading assessment…</div>
      </div>
    </div>
  );
  // ─── Error ───
  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: '#E8E4F5', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ padding: 32, maxWidth: 360, textAlign: 'center', borderRadius: 22, background: '#fff', border: '1.5px solid rgba(100,72,168,0.11)', boxShadow: '0 8px 32px rgba(100,72,168,0.1)' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#1A1A2E', marginBottom: 8 }}>Failed to Load</div>
        <div style={{ fontSize: 13, marginBottom: 16, color: '#555570' }}>{error}</div>
        <button onClick={() => navigate(-1)} style={{ padding: '10px 24px', borderRadius: 12, border: '1.5px solid rgba(100,72,168,0.2)', background: '#F3F0FB', color: '#555570', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
          ← Go Back
        </button>
      </div>
    </div>
  );
  if (scores) return <ResultsScreen scores={scores} onDone={() => navigate('/student')} />;
  // ─── Welcome ───
  if (showWelcome) return (
    <WelcomeScreen
      testType={testType}
      batteryInfo={batteryInfo}
      onStart={() => {
        setShowWelcome(false);
        if (pendingStart) {
          receiveItem(pendingStart.item, pendingStart.progress);
          setPendingStart(null);
        }
      }}
    />
  );
  // ─── Domain Intro ───
  if (showDomainIntro) return (
    <DomainIntro
      domain={showDomainIntro.domain}
      domainLabel={showDomainIntro.label}
      domainsCompleted={showDomainIntro.progress?.domainsCompleted || 0}
      domainsTotal={showDomainIntro.progress?.domainsTotal || 5}
      maxItems={showDomainIntro.progress?.maxItems}
      batteryInfo={batteryInfo}
      onStart={startDomainSection}
    />
  );
  if (!item) return null;

  // ═══ PERSONALITY / INTEREST TEST UI ═══
  if (testType === 'personality' || testType === 'interest') {
    const isPers = testType === 'personality';
    if (isPers) {
      return (
        <PersonalityGameItem
          item={item}
          progress={progress}
          onAnswer={(opt, idx) => {
            const val = opt?.score ?? opt?.value ?? (idx + 1);
            setLikertValue(val);
            setAnswered(true);
            const rt = Date.now() - startMsRef.current;
            api.post(`/sessions/${sessionId}/respond`, {
              itemId: item._dbItemId,
              likertValue: val,
              selectedIndex: val,
              reactionTimeMs: rt,
              timedOut: false,
            }).then(data => {
              if (data.complete) {
                setTimeout(() => navigate(`/test/${sessionId}/complete`, { state: { scores: data.scores } }), 400);
              } else {
                setTimeout(() => receiveItem(data.item, data.progress), 400);
              }
            }).catch(err => console.error('Personality response error:', err));
          }}
        />
      );
    }
    const labels = item.likertLabels || [
      { value: 1, label: 'Not at all' },
      { value: 2, label: 'A little' },
      { value: 3, label: 'Somewhat' },
      { value: 4, label: 'Quite a lot' },
      { value: 5, label: 'Very much' },
    ];
    const sectionLabel = progress?.sectionLabel || 'Interest';
    const sectionColor = '#F59E0B';
    const handleLikert = (val) => {
      setLikertValue(val);
      setAnswered(true);
      const rt = Date.now() - startMsRef.current;
      api.post(`/sessions/${sessionId}/respond`, {
        itemId: item._dbItemId,
        likertValue: val,
        selectedIndex: val,
        reactionTimeMs: rt,
        timedOut: false,
      }).then(data => {
        if (data.complete) {
          setTimeout(() => navigate(`/test/${sessionId}/complete`, { state: { scores: data.scores } }), 400);
        } else {
          setTimeout(() => receiveItem(data.item, data.progress), 400);
        }
      }).catch(err => console.error('Likert response error:', err));
    };
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-5" style={{ background: 'var(--bg)' }}>
        <div className="w-full max-w-lg flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <span className="text-sm">🧭</span>
            <span className="text-xs font-bold" style={{ color: sectionColor }}>{sectionLabel}</span>
          </div>
          <span className="text-xs font-mono" style={{ color: 'var(--ink-faint)' }}>
            {progress?.itemNumber || 1}/{progress?.maxItems || 10}
          </span>
        </div>
        <div className="w-full max-w-lg mb-3">
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
            <div className="h-full rounded-full transition-all duration-300" style={{
              background: sectionColor,
              width: `${((progress?.itemNumber || 1) / (progress?.maxItems || 10)) * 100}%`,
            }} />
          </div>
        </div>
        <div className="w-full max-w-lg bg-white rounded-2xl p-6 border border-stone-200 shadow-sm" key={item.itemId}>
          <div className="text-lg font-bold text-stone-800 leading-relaxed mb-6 text-center">
            {item.activity || item.statement || item.prompt || 'Rate this activity'}
          </div>
          <div className="text-xs text-stone-400 text-center mb-4">How much would you enjoy this activity?</div>
          <div className="flex gap-2 justify-center">
            {labels.map(l => {
              const selected = likertValue === l.value;
              return (
                <button key={l.value} onClick={() => !answered && handleLikert(l.value)}
                  disabled={answered}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all flex-1 max-w-[80px]"
                  style={{
                    borderColor: selected ? sectionColor : '#E7E5E4',
                    background: selected ? `${sectionColor}15` : 'white',
                    transform: selected ? 'scale(1.05)' : 'scale(1)',
                  }}>
                  <div className="text-xl font-bold" style={{ color: selected ? sectionColor : '#A8A29E' }}>{l.value}</div>
                  <div className="text-[9px] font-semibold text-center leading-tight" style={{ color: selected ? sectionColor : '#78716C' }}>{l.label}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // COGNITIVE TEST UI — CLEAN WHITE THEME
  // ═══════════════════════════════════════════════════════════════════════════════
  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

  // ── CogniMap design tokens for the test runner ──
  const cgColor     = meta.color || '#6448A8';
  const cgColorBg   = DOMAIN_CFG[item?.domain]?.bg  || '#EEEDFE';
  const cgColorDark = DOMAIN_CFG[item?.domain]?.dark || '#3C3489';

  return (
    <div className="relative h-screen flex flex-col overflow-hidden"
      style={{
        background: '#E8E4F5',
        backgroundImage: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(100,72,168,0.10), transparent)',
        fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
        @keyframes twinkle { from { opacity: 0.15; } to { opacity: 0.9; } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes popIn { 0% { transform: scale(0.82); opacity: 0; } 70% { transform: scale(1.04); } 100% { transform: scale(1); opacity: 1; } }
        @keyframes slideInCard { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes xpPulse { 0%,100% { opacity:1; } 50% { opacity:0.6; } }
        @keyframes cardGlow { 0%,100% { box-shadow:0 1px 1px rgba(100,72,168,.06),0 4px 12px rgba(100,72,168,.08); } 50% { box-shadow:0 1px 1px rgba(100,72,168,.08),0 8px 32px rgba(100,72,168,.14); } }
        @keyframes selectPop { 0%{box-shadow:0 0 0 0 rgba(100,72,168,.4)} 100%{box-shadow:0 0 0 8px rgba(100,72,168,0)} }
        @keyframes timerPulse { 0%,100%{box-shadow:0 0 6px 2px rgba(216,90,48,0.55);} 50%{box-shadow:0 0 16px 6px rgba(216,90,48,0.85);} }
        @keyframes timerShimmer { 0%{left:-60%;} 100%{left:130%;} }
        /* ── Option thumb: fills entire button, SVG/img contained inside ── */
        .opt-thumb { display:flex!important; align-items:center!important; justify-content:center!important; overflow:hidden!important; border-radius:11px!important; }
        .opt-thumb > div { width:100%!important; height:100%!important; display:flex!important; align-items:center!important; justify-content:center!important; }
        .opt-thumb svg { display:block!important; width:100%!important; height:100%!important; }
        .opt-thumb img { display:block!important; width:100%!important; height:100%!important; object-fit:contain!important; }
        /* ── Stimulus white card: SVG/img fills the card fully ── */
        .stim-inner { overflow:hidden; }
        .stim-inner > div { margin:0!important; }
        .stim-inner svg { display:block; max-width:100%!important; max-height:100%!important; }
        .stim-inner img { display:block; max-width:100%!important; max-height:100%!important; object-fit:contain!important; }
        /* ── Stimulus cell: SVG/img fills each grid/sequence cell ── */
        .stim-cell { position:absolute; inset:4px; display:flex; align-items:center; justify-content:center; overflow:hidden; }
        .stim-cell > div { max-width:100%!important; max-height:100%!important; display:flex!important; align-items:center!important; justify-content:center!important; }
        .stim-cell svg { display:block!important; max-width:100%!important; max-height:100%!important; }
        .stim-cell img { display:block!important; max-width:100%!important; max-height:100%!important; object-fit:contain!important; }
      `}</style>
      <GlobalSvgDefs />
      {/* SVG filter: strip white/near-white pixels from option-button PNGs */}
      <svg style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }} aria-hidden="true">
        <defs>
          <filter id="rm-white-bg" colorInterpolationFilters="sRGB">
            {/* α′ = –R –G –B + 3  →  white→0, bold colours→≥1 (clamped to 1) */}
            <feColorMatrix type="matrix"
              values="1 0 0 0 0
                      0 1 0 0 0
                      0 0 1 0 0
                     -1 -1 -1 0 3" />
          </filter>
        </defs>
      </svg>
      {/* ── TOP BAR — CogniMap design ── */}
      <div style={{
        height: 42, background: '#FFFFFF', borderBottom: '1px solid rgba(100,72,168,0.11)',
        display: 'flex', alignItems: 'center', gap: 14, padding: '0 20px', flexShrink: 0,
      }}>
        {/* Domain dots */}
        {progress && progress.domainsTotal > 1 && (
          <div style={{ display: 'flex', gap: 5 }}>
            {Array.from({ length: progress.domainsTotal }).map((_, i) => (
              <div key={i} style={{
                width: 26, height: 5, borderRadius: 3,
                background: i < progress.domainsCompleted ? cgColor : i === progress.domainsCompleted ? cgColor + '88' : '#F3F0FB',
                border: '1px solid rgba(100,72,168,0.11)',
                transition: 'background .4s, transform .2s',
                transform: i === progress.domainsCompleted ? 'scaleY(1.5)' : 'none',
              }} />
            ))}
          </div>
        )}
        {/* Progress bar */}
        <div style={{ flex: 1, height: 5, background: '#F3F0FB', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${((progress?.itemNumber || 1) / (progress?.maxItems || 15)) * 100}%`,
            background: `linear-gradient(90deg, ${cgColor}, ${cgColor}aa)`,
            borderRadius: 3, transition: 'width .6s cubic-bezier(.4,0,.2,1)',
          }} />
        </div>
        {/* Domain pill */}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 20, background: cgColorBg, color: cgColorDark, fontSize: 11, fontWeight: 700, letterSpacing: '0.3px', border: `1px solid ${cgColor}30` }}>
          {meta.icon} {meta.label}
          {item.isPractice && <span style={{ marginLeft: 4, opacity: 0.7 }}>· Practice</span>}
        </span>
        {/* Q counter */}
        <span style={{ fontSize: 12, color: '#9999AA', minWidth: 30, textAlign: 'right' }}>
          <span style={{ fontWeight: 700, color: '#1A1A2E' }}>{progress?.itemNumber || 1}</span>
          <span> / </span>
          <span style={{ fontWeight: 700, color: '#1A1A2E' }}>{progress?.maxItems || 15}</span>
        </span>
      </div>
      {/* ── TIMER ROW (only when timed) ── */}
      {!memoryOptionsLocked && item.timeLimitSec && (
        <div style={{ padding: '6px 20px 0', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            flexShrink: 0, minWidth: 36, height: 22, borderRadius: 7, padding: '0 6px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, fontFamily: 'monospace',
            background: timerPct < 20 ? '#FAECE7' : timerPct < 40 ? '#fef3c7' : '#F3F0FB',
            border: `1.5px solid ${timerPct < 20 ? '#D85A30' : timerPct < 40 ? '#fde68a' : 'rgba(100,72,168,0.2)'}`,
            color: timerPct < 20 ? '#D85A30' : timerPct < 40 ? '#d97706' : '#9999AA',
            transition: 'all 0.4s',
            animation: timerPct < 20 ? 'timerPulse 0.85s ease-in-out infinite' : 'none',
          }}>
            {Math.ceil((timerPct / 100) * item.timeLimitSec)}s
          </span>
          <div style={{ flex: 1, height: 5, borderRadius: 3, overflow: 'hidden', background: '#F3F0FB' }}>
            <div style={{
              height: '100%', borderRadius: 3,
              width: `${timerPct}%`,
              background: timerPct < 20
                ? 'linear-gradient(90deg,#D85A30,#e88b6e)'
                : timerPct < 40
                ? 'linear-gradient(90deg,#b45309,#f59e0b)'
                : `linear-gradient(90deg,${cgColor},${cgColor}aa)`,
              transition: 'width 0.05s linear, background 0.5s',
            }} />
          </div>
        </div>
      )}
      {/* ══ MAIN CONTENT — two-column card ══ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: '8px 12px 12px' }}>

        {/* ── THE ONE CARD ── */}
        <div key={item.itemId} style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          background: '#FFFFFF',
          borderRadius: 18,
          border: '1px solid rgba(100,72,168,0.11)',
          boxShadow: '0 1px 1px rgba(100,72,168,0.06), 0 4px 12px rgba(100,72,168,0.08), 0 16px 40px rgba(100,72,168,0.10)',
          animation: 'slideInCard 0.3s cubic-bezier(.4,0,.2,1)',
          overflow: 'hidden', position: 'relative', minHeight: 0,
        }}>
          {/* Top accent line */}
          <div style={{ position: 'absolute', top: 0, left: '8%', right: '8%', height: 2,
            background: `linear-gradient(90deg,transparent,${cgColor},transparent)`,
            borderRadius: 99, zIndex: 1 }} />

          {/* ── BODY: left | divider | right ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr', flex: 1, minHeight: 0, overflow: 'hidden' }}>

            {/* ── LEFT: question SVG ── */}
            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0, background: '#F3F0FB' }}>

              {/* Domain chip */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, marginBottom: 8 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px',
                  borderRadius: 20, background: cgColorBg, border: `1px solid ${cgColor}30`,
                  fontSize: 10, fontWeight: 700, color: cgColorDark, letterSpacing: '0.3px' }}>
                  {meta.icon} {meta.label}
                </div>
              </div>

              {/* Prompt — hidden during memory reveal, shown once stimulus is gone */}
              {(renderMode !== 'memory_reveal' || !memoryOptionsLocked) && item.prompt && (
                <div style={{ fontFamily: "'DM Serif Display', Georgia, serif", color: '#1A1A2E', fontSize: 'clamp(13px,1.4vw,17px)', flexShrink: 0, marginBottom: 8, lineHeight: 1.45,
                  ...(renderMode === 'memory_reveal' ? { animation: 'popIn 0.3s ease-out' } : {}) }}
                  dangerouslySetInnerHTML={{ __html: (item.prompt || '').replace(/<hl>/g, `<span style="display:inline-block;background:${cgColor};color:white;padding:0 8px 1px;border-radius:8px;font-size:13px">`).replace(/<\/hl>/g, '</span>') }} />
              )}

              {/* Stimulus card — fills all remaining space, SVG contained inside */}
              <div style={{
                flex: 1, minHeight: 0,
                background: '#FFFFFF',
                borderRadius: 10,
                border: '1.5px solid rgba(100,72,168,0.11)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 4, overflow: 'hidden', position: 'relative',
              }}>
                <div className="stim-inner" style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {renderMode === 'memory_reveal' && <MemoryRevealDisplay item={item} onRevealComplete={handleMemoryRevealComplete} />}
                  {(renderMode === 'visual_single' || renderMode === 'visual_compare') && <ImageStimulusDisplay item={item} answered={answered} answerToken={answerToken} renderMode={renderMode} />}
                  {(renderMode === 'visual_grid' || renderMode === 'visual_linear' || renderMode === 'visual_reflection' || renderMode === 'visual_odd_one' || renderMode === 'gs_speed') && <SequenceDisplay item={item} answered={answered} answerToken={answerToken} renderMode={renderMode} />}
                  {(renderMode === 'text' || renderMode === 'text_passage') && <TextItemDisplay item={item} renderMode={renderMode} />}
                </div>
              </div>
            </div>

            {/* ── VERTICAL DIVIDER ── */}
            <div style={{ background: 'rgba(100,72,168,0.11)', width: 1 }} />

            {/* ── RIGHT: options ── */}
            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexShrink: 0 }}>
                <hr style={{ flex: 1, border: 'none', borderTop: '1px solid rgba(26,35,50,0.08)' }} />
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1.2px',
                  color: memoryOptionsLocked ? cgColor : '#9999AA',
                  textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                  {memoryOptionsLocked ? '🧠 Memorise the stimulus...' : 'Choose one answer'}
                </span>
                <hr style={{ flex: 1, border: 'none', borderTop: '1px solid rgba(26,35,50,0.08)' }} />
              </div>

              {/* Options list — completely hidden during GWM memory reveal, shown after */}
              {memoryOptionsLocked ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, opacity: 0.45 }}>
                  <div style={{ fontSize: 36 }}>🧠</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#8B5CF6', textAlign: 'center' }}>
                    Options will appear after<br/>the stimulus is hidden
                  </div>
                </div>
              ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minHeight: 0,
                overflow: 'hidden',
                animation: renderMode === 'memory_reveal' ? 'popIn 0.3s ease-out' : 'none' }}>
                {shuffledOpts.map((opt, si) => {
                  let state = null;
                  if (answered) {
                    if (si === selectedIdx) state = isCorrect ? 'correct' : 'wrong';
                    else state = 'faded';
                  } else if (pendingChoice !== null) {
                    state = si === pendingChoice ? 'pending' : null;
                  }
                  return (
                    <OptionBtn key={si} opt={opt} letter={letters[si]}
                      onClick={() => choose(si)} state={state}
                      disabled={answered || memoryOptionsLocked} isVisual={isVisual} />
                  );
                })}
              </div>
              )}
            </div>
          </div>

          {/* ── FOOTER ── */}
          <div style={{ borderTop: '1px solid rgba(26,35,50,0.08)', padding: '10px 22px 14px',
            display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0,
            background: '#FFFFFF', minHeight: 56 }}>

            {/* Idle: hint */}
            {!answered && pendingChoice === null && (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8,
                fontSize: 11, fontWeight: 600, color: '#9999AA' }}>
                <span style={{ width: 26, height: 26, borderRadius: 8,
                  background: '#F3F0FB', border: '1px solid rgba(100,72,168,0.15)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>👆</span>
                Select an answer from the options on the right
              </div>
            )}

            {/* Selected — save + continue button */}
            {!answered && pendingChoice !== null && (
              <>
                <div style={{ flex: 1, fontSize: 11, fontWeight: 700, color: '#1D9E75' }}>
                  ✓ Answer selected
                </div>
                <button onClick={submitAnswer} style={{
                  padding: '10px 28px', borderRadius: 13, border: 'none', cursor: 'pointer',
                  background: '#6448A8',
                  color: '#fff', fontWeight: 600, fontSize: 14,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  boxShadow: '0 4px 14px rgba(100,72,168,0.28)',
                  transition: 'all 0.15s', animation: 'popIn 0.3s ease-out',
                  flexShrink: 0,
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#5537A0'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#6448A8'; }}>
                  Save &amp; Continue →
                </button>
              </>
            )}

            {/* Answered: correct feedback */}
            {answered && isCorrect && (
              <div style={{
                flex: 1, display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 14px', borderRadius: 12, fontWeight: 700, fontSize: 12,
                background: '#E1F5EE', border: '1.5px solid rgba(29,158,117,0.3)', color: '#1D9E75',
              }}>
                ✓ Correct!
                {item.isPractice && <span style={{ padding: '2px 8px', borderRadius: 7, background: 'rgba(29,158,117,0.12)', color: '#1D9E75', fontSize: 10, fontWeight: 700, marginLeft: 8 }}>Practice ✓</span>}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}