import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import TokenRenderer, { ShapeToken, ImgToken } from '../components/TokenRenderer';

// ═══════════════════════════════════════════
// DOMAIN METADATA
// ═══════════════════════════════════════════
const DOMAIN_META = {
  gf: { icon: '🧩', label: 'Pattern Reasoning', color: '#6366F1', desc: 'Find the pattern and choose what comes next.' },
  gv: { icon: '👁️', label: 'Visual Spatial', color: '#0891B2', desc: 'Analyse shapes and spatial arrangements.' },
  gq: { icon: '🔢', label: 'Quantitative', color: '#D97706', desc: 'Solve number patterns and math problems.' },
  gc: { icon: '💬', label: 'Verbal Reasoning', color: '#059669', desc: 'Read carefully and choose the best answer.' },
  gs: { icon: '⚡', label: 'Processing Speed', color: '#DC2626', desc: 'Answer as quickly and accurately as you can!' },
};

function shuffle(arr) {
  const a = [...arr]; let i = a.length;
  while (i--) { const j = 0 | Math.random() * (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// ═══════════════════════════════════════════
// SEQUENCE DISPLAY (visual patterns)
// ═══════════════════════════════════════════
function SequenceDisplay({ item, answered, answerToken }) {
  const seq = item.sequence || [];
  const mode = item.displayMode;

  if (mode === 'matrix') {
    return (
      <div className="grid grid-cols-2 gap-2 w-[180px] mx-auto mb-6 p-3 rounded-2xl"
        style={{ border: '1.5px solid var(--border)', background: 'white' }}>
        {seq.map((val, i) => (
          <div key={i} className="w-[72px] h-[72px] rounded-xl flex items-center justify-center"
            style={val === null && !answered
              ? { border: '2px dashed #B45309', background: 'rgba(180,83,9,0.03)' }
              : { border: '1.5px solid var(--border)', background: 'var(--bg-subtle)' }}>
            {val === null
              ? (answered ? <TokenRenderer token={answerToken} sz={34} /> : <span className="text-display font-bold text-xl" style={{ color: '#B45309', opacity: 0.5 }}>?</span>)
              : <TokenRenderer token={val} sz={34} />}
          </div>
        ))}
      </div>
    );
  }

  if (mode === 'odd_one_out') {
    return (
      <div className="flex gap-3 justify-center flex-wrap mb-6">
        {seq.map((val, i) => (
          <div key={i} className="w-[72px] h-[72px] rounded-2xl flex items-center justify-center"
            style={{ border: '1.5px solid var(--border)', background: 'white' }}>
            <TokenRenderer token={val} sz={34} />
          </div>
        ))}
      </div>
    );
  }

  if (mode === 'reflection') {
    return (
      <div className="flex items-center gap-3 justify-center mb-6">
        <div className="w-[72px] h-[72px] rounded-2xl flex items-center justify-center"
          style={{ border: '1.5px solid var(--border)', background: 'white' }}>
          <TokenRenderer token={seq[0]} sz={34} />
        </div>
        <div className="w-[3px] h-[72px] rounded" style={{ background: 'repeating-linear-gradient(180deg,#B45309 0,#B45309 6px,transparent 6px,transparent 12px)' }} />
        {answered
          ? <div className="w-[72px] h-[72px] rounded-2xl flex items-center justify-center" style={{ border: '1.5px solid var(--border)', background: 'white' }}><TokenRenderer token={answerToken} sz={34} /></div>
          : <div className="w-[72px] h-[72px] rounded-2xl border-2 border-dashed flex items-center justify-center" style={{ borderColor: '#B45309', background: 'rgba(180,83,9,0.03)' }}><span className="text-display font-bold text-2xl" style={{ color: '#B45309', opacity: 0.5 }}>?</span></div>}
      </div>
    );
  }

  // Default: linear sequence with arrows
  return (
    <div className="flex items-center gap-2 justify-center flex-wrap mb-6 min-h-[80px]">
      {seq.map((val, i) => (
        <div key={i} className="flex items-center gap-2">
          {i > 0 && <span className="text-lg font-bold flex-shrink-0" style={{ color: 'var(--ink-faint)' }}>›</span>}
          {val === null
            ? (answered
              ? <div className="w-[72px] h-[72px] rounded-2xl flex items-center justify-center" style={{ border: '1.5px solid var(--border)', background: 'white' }}><TokenRenderer token={answerToken} sz={34} /></div>
              : <div className="w-[72px] h-[72px] rounded-2xl border-2 border-dashed flex items-center justify-center" style={{ borderColor: '#B45309', background: 'rgba(180,83,9,0.03)' }}><span className="text-display font-bold text-2xl" style={{ color: '#B45309', opacity: 0.5 }}>?</span></div>)
            : <div className="w-[72px] h-[72px] rounded-2xl flex items-center justify-center" style={{ border: '1.5px solid var(--border)', background: 'white' }}><TokenRenderer token={val} sz={34} /></div>}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════
// TEXT ITEM DISPLAY (Gq text, Gc, Gs text)
// ═══════════════════════════════════════════
function TextSequenceDisplay({ item }) {
  // For sequence strings like "2 → 4 → 8 → ?"
  const seq = item.sequence;
  if (!seq || (Array.isArray(seq) && seq.length === 0)) return null;

  const seqStr = Array.isArray(seq) ? seq.filter(Boolean).join(' → ') : String(seq);
  if (!seqStr) return null;

  // Check if contains img_ tokens
  if (seqStr.includes('img_')) {
    const parts = seqStr.split(/\s*→\s*/);
    return (
      <div className="flex items-center gap-2 justify-center flex-wrap mb-6 p-4 rounded-2xl" style={{ background: 'white', border: '1px solid var(--border)' }}>
        {parts.map((part, i) => (
          <div key={i} className="flex items-center gap-2">
            {i > 0 && <span className="text-lg font-bold" style={{ color: 'var(--ink-faint)' }}>→</span>}
            {part.trim() === '?' 
              ? <span className="text-display font-bold text-xl px-3" style={{ color: '#B45309' }}>?</span>
              : <TokenRenderer token={part.trim()} sz={40} />}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="mb-5 p-4 rounded-2xl text-sm font-semibold leading-relaxed"
      style={{ background: 'white', border: '1px solid var(--border)', color: 'var(--ink)' }}>
      {seqStr}
    </div>
  );
}

// ═══════════════════════════════════════════
// OPTION BUTTON
// ═══════════════════════════════════════════
function OptionBtn({ opt, letter, onClick, state, disabled, isVisual }) {
  const isImg = opt.value && String(opt.value).startsWith('img_');
  const isShape = opt.value && !isImg && !String(opt.value).includes(' ') && String(opt.value).length < 40;
  const showVisual = isVisual || isImg || (isShape && !opt.label);

  let borderColor = 'var(--border)', bg = 'white', labelBg = 'var(--bg-subtle)', labelColor = 'var(--ink-dim)';
  if (state === 'correct') { borderColor = '#059669'; bg = '#ECFDF5'; labelBg = '#059669'; labelColor = 'white'; }
  if (state === 'wrong') { borderColor = '#DC2626'; bg = '#FEF2F2'; labelBg = '#DC2626'; labelColor = 'white'; }
  const faded = state === 'faded';

  if (showVisual && isVisual) {
    return (
      <button disabled={disabled} onClick={onClick}
        className={`aspect-square rounded-2xl flex flex-col items-center justify-center gap-1.5 p-3 relative transition-all duration-200 ${faded ? 'opacity-20 pointer-events-none' : ''} ${!disabled ? 'hover:-translate-y-0.5 hover:shadow-card active:translate-y-0' : ''}`}
        style={{ border: `2px solid ${borderColor}`, background: bg, cursor: disabled ? 'default' : 'pointer' }}>
        <span className="absolute top-1.5 left-2 text-[10px] font-bold font-mono" style={{ color: 'var(--ink-faint)' }}>{letter}</span>
        <TokenRenderer token={opt.value} sz={36} />
        {opt.label && opt.label !== opt.value && (
          <span className="text-[10px] font-semibold capitalize truncate max-w-full" style={{ color: 'var(--ink-soft)' }}>{opt.label}</span>
        )}
      </button>
    );
  }

  // Text/general option
  return (
    <button disabled={disabled} onClick={onClick}
      className={`rounded-2xl flex items-center gap-3 px-4 py-3.5 text-left transition-all duration-200 ${faded ? 'opacity-20 pointer-events-none' : ''} ${!disabled ? 'hover:-translate-y-0.5 hover:shadow-card active:translate-y-0' : ''}`}
      style={{ border: `2px solid ${borderColor}`, background: bg, cursor: disabled ? 'default' : 'pointer' }}>
      <span className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
        style={{ background: labelBg, color: labelColor }}>{letter}</span>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {isImg && <ImgToken token={opt.value} sz={44} />}
        {isShape && !isImg && <ShapeToken token={opt.value} sz={32} />}
        <span className="text-[13px] font-semibold truncate" style={{ color: 'var(--ink)' }}>
          {opt.label || (isImg || isShape ? '' : opt.value)}
        </span>
      </div>
    </button>
  );
}

// ═══════════════════════════════════════════
// DOMAIN INTRO
// ═══════════════════════════════════════════
function DomainIntro({ domain, domainLabel, domainsCompleted, domainsTotal, onStart }) {
  const meta = DOMAIN_META[domain] || { icon: '📝', label: domainLabel, color: '#78716C', desc: 'Answer each question carefully.' };

  return (
    <div className="min-h-screen flex items-center justify-center p-5" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-md text-center p-10 rounded-3xl card animate-scale-in"
        style={{ boxShadow: '0 12px 48px rgba(28,25,23,0.1)' }}>
        <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center text-3xl"
          style={{ background: `${meta.color}12`, border: `2px solid ${meta.color}25` }}>
          {meta.icon}
        </div>
        <h1 className="text-display text-2xl font-bold mb-2" style={{ color: 'var(--ink)' }}>{meta.label}</h1>
        <p className="text-sm mb-6 leading-relaxed" style={{ color: 'var(--ink-dim)' }}>{meta.desc}</p>
        
        {/* Domain progress dots */}
        <div className="flex gap-2 justify-center mb-6">
          {Array.from({ length: domainsTotal }).map((_, i) => (
            <div key={i} className="w-2.5 h-2.5 rounded-full transition-all" style={{
              background: i < domainsCompleted ? '#059669' : i === domainsCompleted ? meta.color : 'var(--border)',
              boxShadow: i === domainsCompleted ? `0 0 8px ${meta.color}40` : 'none',
            }} />
          ))}
        </div>

        <button onClick={onStart} className="btn-primary text-base px-10 py-3.5">
          Begin Section →
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// RESULTS SCREEN
// ═══════════════════════════════════════════
function ResultsScreen({ scores, onDone }) {
  const globalScore = scores?.scores?.find(s => s.trait_or_dim === 'global_theta');
  const domainScores = scores?.scores?.filter(s => s.domain !== 'global' && s.domain !== 'cluster') || [];
  const clusters = scores?.scores?.filter(s => s.domain === 'cluster') || [];

  return (
    <div className="min-h-screen flex items-center justify-center p-5" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-lg text-center p-8 rounded-3xl card animate-scale-in"
        style={{ boxShadow: '0 12px 48px rgba(28,25,23,0.1)' }}>
        <div className="text-5xl mb-3">🏆</div>
        <h1 className="text-display text-2xl font-bold mb-1" style={{ color: 'var(--ink)' }}>Assessment Complete</h1>
        
        {globalScore && (
          <div className="my-5">
            <div className="text-display text-4xl font-bold" style={{ color: '#B45309' }}>
              {parseFloat(globalScore.raw_score).toFixed(2)}
            </div>
            <div className="text-sm font-semibold mt-1" style={{ color: 'var(--ink-dim)' }}>{globalScore.descriptor}</div>
          </div>
        )}

        <div className="space-y-2 mb-6 text-left">
          {domainScores.map(s => {
            const meta = DOMAIN_META[s.domain] || {};
            const theta = parseFloat(s.raw_score);
            const pct = Math.max(0, Math.min(100, ((theta + 3) / 6) * 100));
            return (
              <div key={s.id || s.trait_or_dim} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--bg-subtle)' }}>
                <span className="text-lg">{meta.icon || '📊'}</span>
                <div className="flex-1">
                  <div className="text-xs font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>{meta.label || s.domain}</div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                    <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, background: meta.color || '#78716C' }} />
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold font-mono" style={{ color: 'var(--ink)' }}>{theta.toFixed(2)}</div>
                  <div className="text-[10px] font-semibold" style={{ color: 'var(--ink-dim)' }}>{s.descriptor}</div>
                </div>
              </div>
            );
          })}
        </div>

        {clusters.length > 0 && (
          <div className="mb-5">
            <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--ink-faint)' }}>Aptitude Clusters</div>
            <div className="flex flex-wrap gap-2 justify-center">
              {clusters.map(c => (
                <div key={c.trait_or_dim} className="px-3 py-1.5 rounded-lg text-center" style={{ background: 'var(--bg-subtle)' }}>
                  <div className="text-sm font-bold font-mono" style={{ color: 'var(--ink)' }}>{parseFloat(c.raw_score).toFixed(2)}</div>
                  <div className="text-[9px] font-semibold capitalize" style={{ color: 'var(--ink-dim)' }}>{c.trait_or_dim}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <button onClick={onDone} className="btn-primary text-base px-10 py-3.5">
          Done ✓
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// MAIN TEST RUNNER
// ═══════════════════════════════════════════
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
  const startMsRef = useRef(0);
  const timerRef = useRef(null);
  const timerEndRef = useRef(0);
  const lastDomainRef = useRef(null);

  useEffect(() => {
    api.post(`/sessions/${sessionId}/start`)
      .then(data => {
        if (data.complete) { setScores(data.scores); }
        else { receiveItem(data.item, data.progress); }
      })
      .catch(err => setError(err.message || 'Failed to start'))
      .finally(() => setLoading(false));
  }, [sessionId]);

  const receiveItem = useCallback((newItem, prog) => {
    if (prog && lastDomainRef.current && prog.domain !== lastDomainRef.current) {
      setShowDomainIntro({ domain: prog.domain, label: prog.domainLabel, item: newItem, progress: prog });
      lastDomainRef.current = prog.domain;
      return;
    }
    if (prog) lastDomainRef.current = prog.domain;

    setItem(newItem);
    setProgress(prog);
    setAnswered(false);
    setSelectedIdx(null);

    const indexed = newItem.options.map((o, i) => ({ ...o, origIdx: i }));
    const shuf = shuffle(indexed);
    setShuffledOpts(shuf);
    setCorrectShuffledIdx(shuf.findIndex(o => o.origIdx === newItem.correctIndex));

    startMsRef.current = Date.now();
    clearInterval(timerRef.current);
    timerEndRef.current = Date.now() + newItem.timeLimitSec * 1000;
    setTimerPct(100);
    timerRef.current = setInterval(() => {
      const rem = timerEndRef.current - Date.now();
      if (rem <= 0) { clearInterval(timerRef.current); setTimerPct(0); handleTimeout(); }
      else setTimerPct((rem / (newItem.timeLimitSec * 1000)) * 100);
    }, 50);
  }, []);

  const startDomainSection = useCallback(() => {
    if (!showDomainIntro) return;
    const { item: newItem, progress: prog } = showDomainIntro;
    setShowDomainIntro(null);
    receiveItem(newItem, prog);
  }, [showDomainIntro, receiveItem]);

  const handleTimeout = useCallback(() => {
    if (answered) return;
    setAnswered(true); setSelectedIdx(-1);
    clearInterval(timerRef.current);
    sendResponse(null, false, true);
  }, []);

  const choose = useCallback((si) => {
    if (answered) return;
    clearInterval(timerRef.current);
    setAnswered(true); setSelectedIdx(si);
    const chosen = shuffledOpts[si];
    const correct = si === correctShuffledIdx;
    sendResponse(chosen, correct, false);
  }, [answered, shuffledOpts, correctShuffledIdx]);

  const sendResponse = useCallback(async (chosen, isCorrect, timedOut) => {
    if (!item) return;
    const rt = Date.now() - startMsRef.current;
    try {
      const data = await api.post(`/sessions/${sessionId}/respond`, {
        itemId: item._dbItemId,
        selectedIndex: chosen ? chosen.origIdx : null,
        selectedValue: chosen ? { value: chosen.value, label: chosen.label } : null,
        isCorrect,
        reactionTimeMs: rt,
        timedOut,
      });
      if (data.complete) {
        setTimeout(() => setScores(data.scores), 1200);
      } else {
        setItem(prev => ({ ...prev, _next: data.item, _nextProgress: data.progress }));
      }
    } catch (err) {
      console.error('Response error:', err);
    }
  }, [item, sessionId]);

  const nextItem = useCallback(() => {
    if (!item?._next) return;
    receiveItem(item._next, item._nextProgress);
  }, [item, receiveItem]);

  useEffect(() => () => clearInterval(timerRef.current), []);

  const isCorrect = selectedIdx !== null && selectedIdx >= 0 && selectedIdx === correctShuffledIdx;
  const isWrong = selectedIdx !== null && selectedIdx >= 0 && selectedIdx !== correctShuffledIdx;
  const isTimeout = selectedIdx === -1;
  const answerToken = answered && shuffledOpts[correctShuffledIdx] ? shuffledOpts[correctShuffledIdx].value : null;

  // Determine if visual (shapes) or mixed
  const isVisualDomain = item && ['gf', 'gv'].includes(item.domain);
  const hasVisualSequence = item && item.sequence && item.sequence.length > 0 && item.sequence.some(s => s !== null);
  const isVisual = isVisualDomain && hasVisualSequence;
  const hasImgOptions = item && item.options?.some(o => String(o.value).startsWith('img_'));

  const meta = item ? (DOMAIN_META[item.domain] || { icon: '📝', label: 'Assessment', color: '#78716C' }) : {};

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="text-center animate-pulse-soft">
        <div className="w-12 h-12 rounded-2xl mx-auto mb-3" style={{ background: 'linear-gradient(135deg, #B45309, #D97706)' }} />
        <div className="text-sm font-semibold" style={{ color: 'var(--ink-dim)' }}>Loading assessment...</div>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center p-5" style={{ background: 'var(--bg)' }}>
      <div className="card p-8 max-w-sm text-center" style={{ boxShadow: '0 8px 32px rgba(28,25,23,0.08)' }}>
        <div className="text-4xl mb-3">⚠️</div>
        <div className="text-display font-bold mb-2" style={{ color: 'var(--ink)' }}>Could Not Load Test</div>
        <div className="text-sm mb-4" style={{ color: 'var(--ink-dim)' }}>{error}</div>
        <button onClick={() => navigate(-1)} className="btn-secondary">← Go Back</button>
      </div>
    </div>
  );

  if (scores) return <ResultsScreen scores={scores} onDone={() => navigate('/student')} />;

  if (showDomainIntro) return (
    <DomainIntro
      domain={showDomainIntro.domain}
      domainLabel={showDomainIntro.label}
      domainsCompleted={showDomainIntro.progress?.domainsCompleted || 0}
      domainsTotal={showDomainIntro.progress?.domainsTotal || 5}
      onStart={startDomainSection}
    />
  );

  if (!item) return null;

  const letters = ['A', 'B', 'C', 'D'];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-5" style={{ background: 'var(--bg)' }}>
      {/* Domain & meta */}
      <div className="w-full max-w-lg flex justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <span className="text-sm">{meta.icon}</span>
          <span className="text-[11px] font-semibold" style={{ color: meta.color }}>{meta.label}</span>
          <span className="text-[11px] font-mono" style={{ color: 'var(--ink-faint)' }}>·  Lv.{item.difficulty}</span>
        </div>
        <span className="text-[11px] font-mono" style={{ color: 'var(--ink-faint)' }}>{item.itemId}</span>
      </div>

      {/* Domain dots + item progress */}
      {progress && progress.domainsTotal > 1 && (
        <div className="w-full max-w-lg flex gap-1 mb-1.5">
          {Array.from({ length: progress.domainsTotal }).map((_, i) => (
            <div key={i} className="flex-1 h-1 rounded-full transition-all" style={{
              background: i < progress.domainsCompleted ? '#059669' : i === progress.domainsCompleted ? meta.color : 'var(--border)',
            }} />
          ))}
        </div>
      )}

      <div className="w-full max-w-lg flex items-center gap-3 mb-1.5">
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
          <div className="h-full rounded-full transition-all duration-300" style={{
            background: meta.color,
            width: `${((progress?.itemNumber || 1) / (progress?.maxItems || 15)) * 100}%`,
          }} />
        </div>
        <span className="text-[11px] font-mono font-semibold" style={{ color: 'var(--ink-faint)' }}>
          {progress?.itemNumber || 1}/{progress?.maxItems || 15}
        </span>
      </div>

      {/* Timer bar */}
      <div className="w-full max-w-lg h-1 rounded-full mb-4 overflow-hidden" style={{ background: 'var(--border)' }}>
        <div className="h-full rounded-full" style={{
          background: timerPct < 20 ? '#DC2626' : timerPct < 40 ? '#F59E0B' : meta.color,
          width: `${timerPct}%`, transition: 'width 0.05s linear',
        }} />
      </div>

      {/* Question card */}
      <div className="w-full max-w-lg card p-6 animate-fade-up"
        style={{ boxShadow: '0 8px 32px rgba(28,25,23,0.06)' }} key={item.itemId}>

        {/* Prompt */}
        <div className="text-[15px] font-bold mb-5 leading-relaxed" style={{ color: 'var(--ink)' }}
          dangerouslySetInnerHTML={{
            __html: (item.prompt || '').replace(/<hl>/g, '<span style="display:inline-block;background:#B45309;color:white;padding:0 8px 1px;border-radius:8px;font-size:14px">')
              .replace(/<\/hl>/g, '</span>')
          }} />

        {/* Sequence area */}
        {isVisual && <SequenceDisplay item={item} answered={answered} answerToken={answerToken} />}
        {!isVisual && <TextSequenceDisplay item={item} />}

        {/* Divider */}
        <div className="flex items-center gap-3 mb-4">
          <hr className="flex-1" style={{ border: 'none', borderTop: '1.5px dashed var(--border)' }} />
          <span className="text-[10px] font-semibold uppercase tracking-widest font-mono" style={{ color: 'var(--ink-faint)' }}>Choose one</span>
          <hr className="flex-1" style={{ border: 'none', borderTop: '1.5px dashed var(--border)' }} />
        </div>

        {/* Options */}
        <div className={isVisual ? 'grid grid-cols-3 gap-2' : 'flex flex-col gap-2'}>
          {shuffledOpts.map((opt, si) => {
            let state = null;
            if (answered) {
              if (si === selectedIdx) state = isCorrect ? 'correct' : 'wrong';
              else if (si === correctShuffledIdx && (isWrong || isTimeout)) state = 'correct';
              else state = 'faded';
            }
            return <OptionBtn key={si} opt={opt} letter={letters[si]} onClick={() => choose(si)} state={state} disabled={answered} isVisual={isVisual} />;
          })}
        </div>

        {/* Feedback */}
        {answered && (
          <div className="mt-4 py-2.5 px-4 rounded-xl text-center text-sm font-bold animate-fade-in"
            style={{
              background: isCorrect ? '#ECFDF5' : '#FEF2F2',
              color: isCorrect ? '#059669' : '#DC2626',
              border: `1px solid ${isCorrect ? '#A7F3D0' : '#FECACA'}`,
            }}>
            {isCorrect ? '✓ Correct!' : isTimeout ? "⏱ Time's up!" : `✗ Answer: ${shuffledOpts[correctShuffledIdx]?.label || ''}`}
          </div>
        )}

        {/* Next button */}
        {answered && (
          <button onClick={scores ? () => {} : nextItem}
            className="w-full mt-4 btn-primary py-3.5 text-sm">
            Next →
          </button>
        )}
      </div>
    </div>
  );
}
