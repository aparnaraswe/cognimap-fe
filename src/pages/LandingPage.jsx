/**
 * LandingPage.jsx — CogniMap animated landing
 * Warm paper/blush/sage palette · DM Sans + DM Serif Display
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/* ═══════════════════════════════════════════════════
   HOOKS
   ═══════════════════════════════════════════════════ */
function useOnScreen(ref, threshold = 0.12) {
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [ref, threshold]);
  return vis;
}

function Reveal({ children, delay = 0, className = '', style = {} }) {
  const ref = useRef(null);
  const vis = useOnScreen(ref);
  return (
    <div ref={ref} className={className} style={{
      ...style,
      opacity: vis ? 1 : 0,
      transform: vis ? 'translateY(0)' : 'translateY(36px)',
      transition: `opacity 0.7s cubic-bezier(0.22,1,0.36,1) ${delay * 0.13}s, transform 0.7s cubic-bezier(0.22,1,0.36,1) ${delay * 0.13}s`,
    }}>{children}</div>
  );
}

function Counter({ end, suffix = '', duration = 1800 }) {
  const ref = useRef(null);
  const vis = useOnScreen(ref);
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!vis) return;
    const n = parseInt(end);
    if (isNaN(n)) { setVal(end); return; }
    const start = Date.now();
    const tick = () => {
      const t = Math.min((Date.now() - start) / duration, 1);
      setVal(Math.round((1 - Math.pow(1 - t, 3)) * n));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [vis, end, duration]);
  return <span ref={ref}>{val}{suffix}</span>;
}

/* ═══════════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════════ */
const FEATURES = [
  { icon: '🎯', title: 'Adaptive Cognitive Testing', desc: 'Questions adapt in real-time using Item Response Theory. Accurate measurement in fewer questions — respects students\' time.', span: 2, showDna: true },
  { icon: '🏫', title: 'School Isolation', desc: 'Every school gets its own space — students, items, reports, and settings never cross boundaries.' },
  { icon: '🌐', title: 'Multilingual', desc: 'Students take tests in the language they think in. No comprehension barrier contaminating scores.', showLangs: true },
  { icon: '👨‍👩‍👧', title: 'Parent Portal', desc: 'Auto-created parent accounts with email notifications. Track your child\'s progress and view released reports.' },
  { icon: '📊', title: 'Comprehensive Reports', desc: 'Radar charts, stanine scores, narrative interpretations, and career pathway recommendations — generated in one click.', span: 2 },
];

const ASSESSMENTS = [
  { icon: '🧠', title: 'Cognitive Aptitude', desc: 'Adaptive questions across 6 CHC domains — adjusts to ability in real-time.', color: 'var(--blush)' },
  { icon: '💡', title: 'Personality (Big Five)', desc: 'NEO-style assessment measuring openness, conscientiousness, extraversion, agreeableness, and stability.', color: 'var(--sage)' },
  { icon: '🧭', title: 'Career Interest (RIASEC)', desc: 'Holland\'s model for career pathway guidance across 6 interest dimensions.', color: 'var(--gold)' },
];

const STEPS = [
  { num: '01', title: 'Onboard your school', desc: 'Create a source, bulk-import students via Excel. Parents get auto-created accounts with email notifications.' },
  { num: '02', title: 'Assign assessments', desc: 'Pick a test type, assign to students in one click. Set deadlines and optional access tokens.' },
  { num: '03', title: 'Generate reports', desc: 'Comprehensive reports with charts, scores, and career recommendations. Release them when ready.' },
];

const MARQUEE_ITEMS = [
  { label: 'Adaptive Testing (IRT)', color: 'var(--blush)' },
  { label: 'Multi-Source Isolation', color: 'var(--sage)' },
  { label: 'Hindi · Marathi · English', color: 'var(--gold)' },
  { label: 'Parent Portal', color: 'var(--blush)' },
  { label: 'Detailed Reports', color: 'var(--sage)' },
  { label: 'Bulk Student Import', color: 'var(--gold)' },
  { label: 'Token-based Access', color: 'var(--blush)' },
  { label: 'Per-School Configuration', color: 'var(--sage)' },
];

/* ═══════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════ */
export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [scrollY, setScrollY] = useState(0);
  const [mousePos, setMousePos] = useState({ x: -300, y: -300 });

  useEffect(() => {
    if (user) {
      if (['super_admin', 'psychologist', 'client_admin'].includes(user.role)) navigate('/admin', { replace: true });
      else navigate('/student', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Cursor glow (desktop only)
  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return;
    const onMove = (e) => setMousePos({ x: e.clientX, y: e.clientY });
    document.addEventListener('mousemove', onMove);
    return () => document.removeEventListener('mousemove', onMove);
  }, []);

  const goLogin = () => navigate('/login');
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div style={{ fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif", color: '#1a2332', overflowX: 'hidden', background: '#f5f2ed' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Serif+Display&display=swap');

        /* Animations */
        @keyframes orbFloat {
          0%   { transform: translate(0, 0) scale(1); }
          33%  { transform: translate(60px, -40px) scale(1.1); }
          66%  { transform: translate(-30px, 50px) scale(0.95); }
          100% { transform: translate(40px, -20px) scale(1.05); }
        }
        @keyframes floatCard {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-14px); }
        }
        @keyframes floatCardCenter {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(-14px); }
        }
        @keyframes barFill {
          0% { width: 30%; }
          100% { width: 90%; }
        }
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes badgePulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(95,143,114,0.15); }
          50% { box-shadow: 0 0 0 8px rgba(95,143,114,0); }
        }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes dnaBounce {
          0%, 100% { height: 12px; opacity: 0.3; }
          50% { height: 50px; opacity: 1; }
        }
        @keyframes pillPop {
          0% { opacity: 0; transform: scale(0.5); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes heroLineUp {
          from { transform: translateY(110%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes spinSlow { from { transform: translate(-50%,-50%) rotate(0deg); } to { transform: translate(-50%,-50%) rotate(360deg); } }

        .cm-hero-line { display: block; overflow: hidden; }
        .cm-hero-line span { display: block; transform: translateY(110%); opacity: 0; animation: heroLineUp 0.8s cubic-bezier(0.22,1,0.36,1) forwards; }
        .cm-hero-line:nth-child(1) span { animation-delay: 0.3s; }
        .cm-hero-line:nth-child(2) span { animation-delay: 0.45s; }
        .cm-hero-line:nth-child(3) span { animation-delay: 0.6s; }

        .cm-nav-link { position: relative; font-size: 13px; font-weight: 500; color: #64748b; transition: color 0.2s; cursor: pointer; background: none; border: none; font-family: inherit; padding: 0; }
        .cm-nav-link:hover { color: #1a2332; }
        .cm-nav-link::after { content: ''; position: absolute; bottom: -4px; left: 0; width: 0; height: 2px; background: #c97d5f; border-radius: 1px; transition: width 0.3s cubic-bezier(0.22,1,0.36,1); }
        .cm-nav-link:hover::after { width: 100%; }

        .cm-float-card { transition: transform 0.3s, box-shadow 0.3s; }
        .cm-float-card:hover { transform: translateY(-6px) !important; box-shadow: 0 20px 50px rgba(26,35,50,0.1) !important; }

        .cm-bento-card { transition: transform 0.3s cubic-bezier(0.22,1,0.36,1), box-shadow 0.3s; }
        .cm-bento-card:hover { transform: translateY(-4px); box-shadow: 0 16px 50px rgba(26,35,50,0.08); }

        .cm-step-card { transition: transform 0.3s, box-shadow 0.3s; }
        .cm-step-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(26,35,50,0.08); }

        .cm-btn-primary { transition: transform 0.2s, box-shadow 0.2s; }
        .cm-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(26,35,50,0.18) !important; }

        @media (max-width: 768px) {
          .cm-bento { grid-template-columns: 1fr !important; }
          .cm-bento-span2 { grid-column: span 1 !important; }
          .cm-stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .cm-steps-grid { grid-template-columns: 1fr !important; }
          .cm-hero-visual { height: auto !important; position: static !important; display: flex !important; flex-direction: column !important; gap: 16px !important; }
          .cm-hero-visual > div { position: static !important; width: 100% !important; animation: floatCard 6s ease-in-out infinite !important; }
          .cm-nav-links { display: none !important; }
        }
      `}</style>

      {/* ── Background orbs ── */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', filter: 'blur(80px)', opacity: 0.2, background: 'radial-gradient(circle, #c97d5f, transparent 70%)', top: '-10%', left: '-5%', animation: 'orbFloat 22s ease-in-out infinite alternate' }} />
        <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', filter: 'blur(80px)', opacity: 0.2, background: 'radial-gradient(circle, #5f8f72, transparent 70%)', top: '40%', right: '-10%', animation: 'orbFloat 26s ease-in-out infinite alternate', animationDelay: '-5s' }} />
        <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', filter: 'blur(80px)', opacity: 0.2, background: 'radial-gradient(circle, #c9963e, transparent 70%)', bottom: '-5%', left: '30%', animation: 'orbFloat 18s ease-in-out infinite alternate', animationDelay: '-10s' }} />
      </div>

      {/* ── Cursor glow ── */}
      <div style={{
        position: 'fixed', width: 300, height: 300, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(201,125,95,0.06), transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
        transform: 'translate(-50%, -50%)',
        left: mousePos.x, top: mousePos.y,
        transition: 'left 0.15s ease-out, top 0.15s ease-out',
      }} />

      {/* ═══ NAVBAR ═══ */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '0 clamp(16px, 4vw, 40px)', height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: scrollY > 10 ? 'rgba(245,242,237,0.7)' : 'transparent',
        backdropFilter: scrollY > 10 ? 'blur(16px) saturate(180%)' : 'none',
        borderBottom: scrollY > 10 ? '1px solid rgba(26,35,50,0.08)' : '1px solid transparent',
        transition: 'all 0.3s',
        boxShadow: scrollY > 10 ? '0 4px 30px rgba(26,35,50,0.06)' : 'none',
      }}>
        <div style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 22, letterSpacing: -0.5 }}>
          Cogni<span style={{ color: '#c97d5f' }}>Map</span>
        </div>
        <div className="cm-nav-links" style={{ display: 'flex', gap: 32 }}>
          <button className="cm-nav-link" onClick={() => scrollTo('features')}>Features</button>
          <button className="cm-nav-link" onClick={() => scrollTo('how')}>How it works</button>
          <button className="cm-nav-link" onClick={() => scrollTo('assessments')}>Assessments</button>
          <button className="cm-nav-link" onClick={() => scrollTo('contact')}>Contact</button>
        </div>
        <button onClick={goLogin} className="cm-btn-primary" style={{
          padding: '9px 22px', borderRadius: 8, fontSize: 13, fontWeight: 600,
          background: '#1a2332', color: '#fff', border: 'none', cursor: 'pointer',
        }}>Sign In</button>
      </nav>

      {/* ═══ HERO ═══ */}
      <section style={{
        position: 'relative', zIndex: 1,
        minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: '120px 24px 80px',
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '6px 16px', borderRadius: 50,
          background: 'rgba(95,143,114,0.08)', border: '1px solid rgba(95,143,114,0.15)',
          fontSize: 12, fontWeight: 600, color: '#5f8f72',
          marginBottom: 28, animation: 'badgePulse 3s ease-in-out infinite',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#5f8f72' }} />
          Built for Indian schools · NEP 2020 aligned
        </div>

        <h1 style={{
          fontFamily: "'DM Serif Display', Georgia, serif",
          fontSize: 'clamp(36px, 6vw, 68px)', fontWeight: 400,
          lineHeight: 1.1, letterSpacing: -1.5, maxWidth: 800, marginBottom: 20,
        }}>
          <div className="cm-hero-line"><span>Discover every student's</span></div>
          <div className="cm-hero-line">
            <span style={{
              background: 'linear-gradient(135deg, #c97d5f, #c9963e, #5f8f72)',
              backgroundSize: '200% 200%',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              animation: 'gradientShift 5s ease infinite',
            }}>true potential</span>
          </div>
        </h1>

        <p style={{
          fontSize: 'clamp(15px, 2vw, 18px)', color: '#64748b',
          maxWidth: 560, lineHeight: 1.7, marginBottom: 36,
          opacity: 0, animation: 'heroLineUp 0.7s 0.85s forwards',
        }}>
          AI-powered psychometric assessments that measure cognitive aptitude, personality, and career interests — in English, Hindi, and Marathi. Fair, scientific, beautiful.
        </p>

        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center', opacity: 0, animation: 'heroLineUp 0.7s 1s forwards' }}>
          <button onClick={goLogin} className="cm-btn-primary" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '14px 32px', borderRadius: 10,
            background: '#1a2332', color: '#fff',
            fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
            border: 'none', cursor: 'pointer',
          }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            Start your pilot
          </button>
          <button onClick={() => scrollTo('features')} style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '14px 32px', borderRadius: 10,
            background: '#fff', color: '#1a2332',
            fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
            border: '1px solid rgba(26,35,50,0.08)', cursor: 'pointer',
            transition: 'transform 0.2s, border-color 0.2s',
          }}>
            Learn more
          </button>
        </div>

        {/* Floating cards */}
        <div className="cm-hero-visual" style={{ position: 'relative', width: '100%', maxWidth: 900, height: 340, marginTop: 60 }}>
          {ASSESSMENTS.map((a, i) => {
            const positions = [
              { top: 0, left: '5%', width: 260, delay: '0s' },
              { top: 30, right: '5%', width: 240, delay: '-2s' },
              { bottom: 0, left: '50%', width: 280, delay: '-4s' },
            ];
            const pos = positions[i];
            return (
              <div key={a.title} className="cm-float-card" style={{
                position: 'absolute', ...pos,
                transform: i === 2 ? 'translateX(-50%)' : undefined,
                background: '#fff', border: '1px solid rgba(26,35,50,0.08)', borderRadius: 16,
                padding: '20px 24px', boxShadow: '0 12px 40px rgba(26,35,50,0.06)',
                animation: `${i === 2 ? 'floatCardCenter' : 'floatCard'} 6s ease-in-out infinite`,
                animationDelay: pos.delay,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, marginBottom: 12,
                  background: `${a.color}14`,
                }}>{a.icon}</div>
                <div style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 15, marginBottom: 4 }}>{a.title}</div>
                <div style={{ fontSize: 12, color: '#8898aa', lineHeight: 1.5 }}>{a.desc.slice(0, 60)}...</div>
                <div style={{ marginTop: 14, height: 6, borderRadius: 3, background: '#f5f2ed', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 3, background: `linear-gradient(90deg, ${a.color}, ${a.color}88)`, animation: 'barFill 3s ease-in-out infinite alternate' }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══ MARQUEE ═══ */}
      <div style={{
        position: 'relative', zIndex: 1, overflow: 'hidden',
        borderTop: '1px solid rgba(26,35,50,0.08)', borderBottom: '1px solid rgba(26,35,50,0.08)',
        background: 'rgba(255,255,255,0.4)',
      }}>
        <div style={{ display: 'flex', width: 'max-content', animation: 'marquee 30s linear infinite' }}>
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((m, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '18px 36px', fontSize: 13, fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: m.color, flexShrink: 0 }} />
              {m.label}
            </div>
          ))}
        </div>
      </div>

      {/* ═══ FEATURES — BENTO ═══ */}
      <section id="features" style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', padding: '100px 24px' }}>
        <Reveal>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, color: '#c97d5f', marginBottom: 10 }}>Platform</div>
        </Reveal>
        <Reveal delay={1}>
          <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 'clamp(28px, 4vw, 42px)', lineHeight: 1.2, maxWidth: 500, marginBottom: 50 }}>
            Everything you need to assess, guide, and grow
          </h2>
        </Reveal>

        <div className="cm-bento" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i + 2} className={f.span === 2 ? 'cm-bento-span2' : ''} style={f.span === 2 ? { gridColumn: 'span 2' } : {}}>
              <div className="cm-bento-card" style={{
                background: '#fff', border: '1px solid rgba(26,35,50,0.08)', borderRadius: 18,
                padding: 30, overflow: 'hidden', height: '100%',
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, marginBottom: 18,
                  background: i % 3 === 0 ? 'rgba(201,125,95,0.08)' : i % 3 === 1 ? 'rgba(95,143,114,0.08)' : 'rgba(201,150,62,0.08)',
                }}>{f.icon}</div>
                <div style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 19, marginBottom: 8 }}>{f.title}</div>
                <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>{f.desc}</div>

                {/* DNA visualizer */}
                {f.showDna && (
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginTop: 20, height: 60 }}>
                    {Array.from({ length: 30 }, (_, j) => {
                      const colors = ['#c97d5f', '#5f8f72', '#c9963e'];
                      return (
                        <div key={j} style={{
                          width: 8, borderRadius: 4,
                          background: colors[Math.floor(j / 10)],
                          animation: `dnaBounce 2s ease-in-out infinite`,
                          animationDelay: `${j * 0.1}s`,
                        }} />
                      );
                    })}
                  </div>
                )}

                {/* Language pills */}
                {f.showLangs && (
                  <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
                    {[
                      { label: 'English', bg: 'rgba(201,125,95,0.08)', color: '#c97d5f' },
                      { label: 'हिन्दी', bg: 'rgba(95,143,114,0.08)', color: '#5f8f72' },
                      { label: 'मराठी', bg: 'rgba(201,150,62,0.08)', color: '#c9963e' },
                    ].map((l, j) => (
                      <span key={l.label} style={{
                        padding: '8px 18px', borderRadius: 50,
                        fontSize: 14, fontWeight: 600,
                        background: l.bg, color: l.color,
                        animation: `pillPop 0.5s cubic-bezier(0.34,1.56,0.64,1) both`,
                        animationDelay: `${0.1 + j * 0.15}s`,
                      }}>{l.label}</span>
                    ))}
                  </div>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ═══ STATS ═══ */}
      <section style={{
        position: 'relative', zIndex: 1, padding: '80px 24px',
        background: '#1a2332', color: '#fff', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 20% 50%, rgba(201,125,95,0.15), transparent 60%), radial-gradient(ellipse at 80% 50%, rgba(95,143,114,0.15), transparent 60%)',
        }} />
        <div className="cm-stats-grid" style={{
          position: 'relative', zIndex: 1,
          maxWidth: 900, margin: '0 auto',
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, textAlign: 'center',
        }}>
          {[
            { val: '6', label: 'Cognitive domains' },
            { val: '5', label: 'Personality traits' },
            { val: '6', label: 'Interest dimensions' },
            { val: '3', label: 'Languages' },
          ].map((s, i) => (
            <Reveal key={s.label} delay={i}>
              <div>
                <div style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 'clamp(32px, 5vw, 48px)' }}>
                  <Counter end={s.val} />
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 6 }}>{s.label}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section id="how" style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', padding: '100px 24px' }}>
        <Reveal>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, color: '#c97d5f', marginBottom: 10 }}>How it works</div>
        </Reveal>
        <Reveal delay={1}>
          <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 'clamp(28px, 4vw, 42px)', lineHeight: 1.2, maxWidth: 500, marginBottom: 50 }}>
            Three steps to insight
          </h2>
        </Reveal>

        <div className="cm-steps-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {STEPS.map((s, i) => (
            <Reveal key={s.num} delay={i + 2}>
              <div className="cm-step-card" style={{
                background: '#fff', border: '1px solid rgba(26,35,50,0.08)', borderRadius: 18, padding: 32,
              }}>
                <div style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 48, color: 'rgba(26,35,50,0.08)', lineHeight: 1, marginBottom: 14 }}>{s.num}</div>
                <div style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 18, marginBottom: 8 }}>{s.title}</div>
                <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>{s.desc}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ═══ ASSESSMENTS ═══ */}
      <section id="assessments" style={{
        position: 'relative', zIndex: 1,
        maxWidth: 1100, margin: '0 auto', padding: '0 24px 100px',
      }}>
        <Reveal>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, color: '#5f8f72', marginBottom: 10 }}>Assessments</div>
        </Reveal>
        <Reveal delay={1}>
          <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 'clamp(28px, 4vw, 42px)', lineHeight: 1.2, maxWidth: 500, marginBottom: 50 }}>
            Three assessments. One complete profile.
          </h2>
        </Reveal>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {ASSESSMENTS.map((a, i) => (
            <Reveal key={a.title} delay={i + 2}>
              <div className="cm-bento-card" onClick={goLogin} style={{
                background: '#fff', border: '1px solid rgba(26,35,50,0.08)', borderRadius: 18,
                padding: 28, cursor: 'pointer',
              }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 14,
                  background: `${a.color}14`, color: a.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24, marginBottom: 16,
                }}>{a.icon}</div>
                <div style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 18, marginBottom: 8 }}>{a.title}</div>
                <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.7 }}>{a.desc}</div>
                <div style={{ marginTop: 16, fontSize: 13, fontWeight: 600, color: '#c97d5f', display: 'flex', alignItems: 'center', gap: 6 }}>
                  Start assessment <span style={{ fontSize: 16 }}>→</span>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section id="contact" style={{ position: 'relative', zIndex: 1, padding: '100px 24px', textAlign: 'center' }}>
        <Reveal>
          <div style={{
            maxWidth: 700, margin: '0 auto',
            background: '#fff', border: '1px solid rgba(26,35,50,0.08)',
            borderRadius: 24, padding: '60px 40px',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,125,95,0.1), transparent)' }} />
            <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 'clamp(24px, 3.5vw, 36px)', marginBottom: 14 }}>
              Ready to discover what your students are capable of?
            </h2>
            <p style={{ fontSize: 15, color: '#64748b', marginBottom: 30, lineHeight: 1.6 }}>
              Start a free pilot with your school. No credit card, no commitment — just better assessment data.
            </p>
            <a href="mailto:rasweaparna8@gmail.com" className="cm-btn-primary" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '14px 32px', borderRadius: 10,
              background: '#1a2332', color: '#fff',
              fontSize: 14, fontWeight: 600, textDecoration: 'none',
            }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
              Contact us
            </a>
          </div>
        </Reveal>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer style={{
        position: 'relative', zIndex: 1,
        borderTop: '1px solid rgba(26,35,50,0.08)',
        padding: '40px 24px', textAlign: 'center',
      }}>
        <div style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 18, marginBottom: 8 }}>
          Cogni<span style={{ color: '#c97d5f' }}>Map</span>
        </div>
        <p style={{ fontSize: 12, color: '#8898aa' }}>&copy; {new Date().getFullYear()} CogniMap. Psychometric assessment platform for Indian schools.</p>
      </footer>
    </div>
  );
}
