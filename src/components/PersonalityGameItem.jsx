import { useState, useEffect, useRef } from 'react';

function Stars() {
  const stars = useRef(
    Array.from({ length: 30 }, (_, i) => ({
      id: i, x: Math.random() * 100, y: Math.random() * 50,
      size: Math.random() * 2 + 1, opacity: Math.random() * 0.6 + 0.3,
      delay: Math.random() * 3,
    }))
  );
  return (
    <div className="absolute inset-0 pointer-events-none">
      {stars.current.map(s => (
        <div key={s.id} className="absolute rounded-full" style={{
          left: s.x + '%', top: s.y + '%', width: s.size, height: s.size,
          background: '#fff', opacity: s.opacity,
          animation: 'twinkle ' + (2 + s.delay) + 's ease-in-out infinite alternate',
          animationDelay: s.delay + 's',
        }} />
      ))}
    </div>
  );
}

function Typewriter({ text, onDone, speed = 25 }) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  const idx = useRef(0);
  useEffect(() => {
    setDisplayed(''); setDone(false); idx.current = 0;
    const t = setInterval(() => {
      if (idx.current < text.length) {
        setDisplayed(text.slice(0, idx.current + 1));
        idx.current++;
      } else { clearInterval(t); setDone(true); onDone && onDone(); }
    }, speed);
    return () => clearInterval(t);
  }, [text]);
  return (
    <div onClick={() => { setDisplayed(text); setDone(true); idx.current = text.length; onDone && onDone(); }}
      className="cursor-pointer select-none">
      <span>{displayed}</span>
      {!done && <span className="animate-pulse text-yellow-300">|</span>}
    </div>
  );
}

function ChoiceButton({ label, onClick, disabled, selected }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      className="relative px-4 py-3 rounded-xl font-bold text-sm transition-all duration-200 border-2 w-full text-left"
      style={{
        background: selected ? '#FFD700' : hovered ? '#fff8dc' : 'rgba(255,215,0,0.12)',
        borderColor: selected ? '#FFD700' : hovered ? '#FFD700' : 'rgba(255,215,0,0.35)',
        color: selected || hovered ? '#2d1b69' : '#fff',
        transform: hovered && !disabled ? 'scale(1.02) translateY(-1px)' : 'scale(1)',
        boxShadow: selected ? '0 6px 20px rgba(255,215,0,0.5)' : hovered ? '0 4px 16px rgba(255,215,0,0.3)' : 'none',
        opacity: disabled && !selected ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}>
      {label}
    </button>
  );
}

export default function PersonalityGameItem({ item, progress, onAnswer }) {
  const [charX, setCharX] = useState(-100);
  const [charState, setCharState] = useState('walk');
  const [dialogueReady, setDialogueReady] = useState(false);
  const [choicesReady, setChoicesReady] = useState(false);
  const [chosen, setChosen] = useState(null);
  const [reaction, setReaction] = useState('');
  const [npcReacted, setNpcReacted] = useState(false);

  const options = item && item.options ? item.options : [];
  const statement = (item && (item.statement || item.narration || item.prompt)) || 'What would you do?';

  useEffect(() => {
    setCharX(-100); setCharState('walk');
    setDialogueReady(false); setChoicesReady(false);
    setChosen(null); setReaction(''); setNpcReacted(false);
    const t1 = setTimeout(() => setCharX(60), 80);
    const t2 = setTimeout(() => { setCharState('idle'); setDialogueReady(true); }, 900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [item && item.itemId]);

  const handleChoice = (opt, idx) => {
    if (chosen !== null) return;
    setChosen(idx);
    setNpcReacted(true);
    setCharState(idx % 2 === 0 ? 'react_a' : 'react_b');
    const reactions = ['Wow, bold choice!', 'A wise decision!', 'Interesting!', 'That shows character!', 'Well considered!'];
    setReaction(reactions[idx % reactions.length]);
    setTimeout(() => onAnswer(opt, idx), 1200);
  };

  const charEmoji = { walk: String.fromCodePoint(0x1F6B6), idle: String.fromCodePoint(0x1F9D9), react_a: String.fromCodePoint(0x2694, 0xFE0F), react_b: String.fromCodePoint(0x1F914) };
  const itemNum = progress && progress.itemNumber ? progress.itemNumber : 1;
  const maxItems = progress && progress.maxItems ? progress.maxItems : 10;
  const pct = (itemNum / maxItems) * 100;
  const sectionLabel = (progress && progress.sectionLabel) || 'Personality';

  const containerStyle = { background: '#1a1a4e', fontFamily: 'Nunito, sans-serif' };

  return (
    <div className="relative w-full min-h-screen flex flex-col overflow-hidden" style={containerStyle}>
      <style dangerouslySetInnerHTML={{ __html: '@keyframes twinkle { from { opacity: 0.2; } to { opacity: 1; } } @keyframes floatUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } } @keyframes popIn { 0% { transform: scale(0.6); opacity: 0; } 70% { transform: scale(1.08); } 100% { transform: scale(1); opacity: 1; } } @keyframes reactionFloat { 0% { opacity: 0; transform: translateY(0); } 50% { opacity: 1; } 100% { opacity: 0; transform: translateY(-40px); } }' }} />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #0d0d2b 0%, #1a1a4e 40%, #2d1b69 100%)' }} />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 120% 50% at 50% 100%, rgba(61,26,110,0.33) 0%, transparent 70%)' }} />
      <Stars />
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{ height: '35%' }}>
        <svg viewBox="0 0 1200 200" preserveAspectRatio="none" className="w-full h-full">
          <polygon points="0,200 0,120 150,60 300,100 450,40 600,80 750,30 900,70 1050,50 1200,90 1200,200" fill="#2a1550" opacity="0.8" />
          <polygon points="0,200 0,150 100,110 250,130 400,90 550,120 700,80 850,110 1000,85 1150,115 1200,100 1200,200" fill="#1a0d3d" opacity="0.9" />
        </svg>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-16" style={{ background: 'linear-gradient(0deg, #0d0820 0%, transparent 100%)' }} />

      <div className="relative z-10 flex items-center justify-between px-5 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-pink-400 text-sm">&#128150;</span>
          <span className="text-pink-300 text-xs font-bold tracking-wide">{sectionLabel}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-yellow-300 text-xs font-mono font-bold">{itemNum} / {maxItems}</span>
          <div className="w-28 h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,215,0,0.3)' }}>
            <div className="h-full rounded-full transition-all duration-700" style={{ width: pct + '%', background: 'linear-gradient(90deg, #EC4899, #FFD700)' }} />
          </div>
        </div>
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-end pb-6 px-4">
        <div className="w-full max-w-2xl flex items-end justify-between mb-5 px-6" style={{ minHeight: 110 }}>
          <div className="flex flex-col items-center gap-1 transition-all duration-700 ease-out" style={{ transform: 'translateX(' + charX + 'px)' }}>
            <div className="text-5xl select-none" style={{ filter: 'drop-shadow(0 4px 12px rgba(99,102,241,0.6))' }}>{charEmoji[charState] || charEmoji.idle}</div>
            <span className="text-[10px] font-bold text-blue-300 opacity-60">You</span>
          </div>
          {reaction && (
            <div className="text-yellow-300 font-bold text-base text-center px-2" style={{ animation: 'reactionFloat 1.2s ease-out forwards' }}>{reaction}</div>
          )}
          <div className="flex flex-col items-center gap-1">
            <div className="text-5xl select-none transition-all duration-300" style={{ filter: 'drop-shadow(0 4px 12px rgba(255,215,0,0.5))', transform: npcReacted ? 'scale(1.25)' : 'scale(1)' }}>
              {npcReacted ? String.fromCodePoint(0x1F438, 0x2728) : String.fromCodePoint(0x1F438)}
            </div>
            <span className="text-[10px] font-bold text-yellow-300 opacity-60">Guide</span>
          </div>
        </div>

        {dialogueReady && (
          <div className="w-full max-w-2xl rounded-2xl p-5"
            style={{ background: 'rgba(45,27,105,0.96)', border: '2px solid #FFD700', boxShadow: '0 0 40px rgba(255,215,0,0.15)', animation: 'floatUp 0.35s ease-out' }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm">&#128056;</span>
              <span className="text-yellow-400 text-xs font-bold tracking-wider">GUIDE</span>
              <div className="flex-1 h-px" style={{ background: 'rgba(255,215,0,0.25)' }} />
            </div>
            <div className="text-white text-base leading-relaxed mb-5" style={{ minHeight: 52 }}>
              <Typewriter text={statement} onDone={() => setChoicesReady(true)} speed={22} />
            </div>
            {choicesReady && options.length > 0 && (
              <div className={options.length === 2 ? 'grid grid-cols-2 gap-3' : 'grid grid-cols-1 gap-3'} style={{ animation: 'popIn 0.3s ease-out' }}>
                {options.map((opt, i) => (
                  <ChoiceButton key={i} label={opt.text || opt.label || ('Option ' + (i + 1))} onClick={() => handleChoice(opt, i)} disabled={chosen !== null} selected={chosen === i} />
                ))}
              </div>
            )}
            {choicesReady && options.length === 0 && (
              <div className="flex gap-2 justify-center" style={{ animation: 'popIn 0.3s ease-out' }}>
                {[{v:1,label:'Strongly\nDisagree'},{v:2,label:'Disagree'},{v:3,label:'Neutral'},{v:4,label:'Agree'},{v:5,label:'Strongly\nAgree'}].map(function(item) {
                  var v = item.v; var label = item.label;
                  return (
                    <button key={v} onClick={() => handleChoice({ value: v, score: v }, v - 1)} disabled={chosen !== null}
                      className="flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all flex-1"
                      style={{ borderColor: chosen === v - 1 ? '#FFD700' : 'rgba(255,255,255,0.15)', background: chosen === v - 1 ? 'rgba(255,215,0,0.2)' : 'rgba(255,255,255,0.04)', color: chosen === v - 1 ? '#FFD700' : '#ccc', transform: chosen === v - 1 ? 'scale(1.08)' : 'scale(1)' }}>
                      <span className="text-lg font-bold">{v}</span>
                      <span className="text-[9px] text-center leading-tight whitespace-pre-line">{label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}