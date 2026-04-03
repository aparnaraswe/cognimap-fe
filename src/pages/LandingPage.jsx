/**
 * LandingPage.jsx — Full-width modern landing with smooth animations
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/* ── Intersection Observer hook ── */
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
function Reveal({ children, delay = 0, className = '' }) {
  const ref = useRef(null);
  const vis = useOnScreen(ref);
  return (
    <div ref={ref} className={className} style={{
      opacity: vis ? 1 : 0,
      transform: vis ? 'translateY(0)' : 'translateY(32px)',
      transition: `opacity 0.7s cubic-bezier(0.22,1,0.36,1) ${delay * 0.12}s, transform 0.7s cubic-bezier(0.22,1,0.36,1) ${delay * 0.12}s`,
    }}>{children}</div>
  );
}

/* ── Animated counter ── */
function Counter({ end, suffix = '', duration = 1800 }) {
  const ref = useRef(null);
  const vis = useOnScreen(ref);
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!vis) return;
    const isNum = !isNaN(parseInt(end));
    if (!isNum) { setVal(end); return; }
    const target = parseInt(end);
    const start = Date.now();
    const tick = () => {
      const t = Math.min((Date.now() - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(ease * target));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [vis, end, duration]);
  return <span ref={ref}>{val}{suffix}</span>;
}

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [scrollY, setScrollY] = useState(0);

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

  const goLogin = () => navigate('/login');

  const DOMAINS = [
    { icon: '🧩', name: 'Pattern Reasoning', code: 'Gf', desc: 'Identify rules in visual sequences and predict what comes next', color: '#6366F1' },
    { icon: '👁️', name: 'Visual Processing', code: 'Gv', desc: 'Rotate, reflect, and mentally transform spatial patterns', color: '#8B5CF6' },
    { icon: '⚡', name: 'Processing Speed', code: 'Gs', desc: 'Quickly scan, compare, and make decisions under time pressure', color: '#F59E0B' },
    { icon: '🧠', name: 'Working Memory', code: 'Gwm', desc: 'Hold and manipulate information in your mind over short intervals', color: '#EC4899' },
    { icon: '🔢', name: 'Quantitative', code: 'Gq', desc: 'Apply mathematical reasoning to solve novel number problems', color: '#14B8A6' },
    { icon: '📖', name: 'Comprehension', code: 'Gc', desc: 'Understand language, vocabulary, and verbal relationships', color: '#3B82F6' },
  ];

  const STATS = [
    { value: '6', label: 'Cognitive domains', suffix: '' },
    { value: '3', label: 'Assessment types', suffix: '' },
    { value: 'IRT', label: 'Adaptive scoring', suffix: '' },
    { value: 'Live', label: 'Real-time results', suffix: '' },
  ];

  const ASSESSMENTS = [
    { icon: '🧠', title: 'Cognitive Aptitude', desc: 'Adaptive questions across six domains — adjusts to your ability in real-time using Item Response Theory.', gradient: 'linear-gradient(135deg, #6366F1, #8B5CF6)' },
    { icon: '🎭', title: 'Personality Profile', desc: 'Discover how you approach the world — your traits, preferences, and interaction style using the Big Five model.', gradient: 'linear-gradient(135deg, #EC4899, #F472B6)' },
    { icon: '🎯', title: 'Interest Profile', desc: 'Explore what activities and career paths energise you most across Holland RIASEC dimensions.', gradient: 'linear-gradient(135deg, #14B8A6, #5EEAD4)' },
  ];

  const navOpaque = scrollY > 60;

  return (
    <div style={{ fontFamily: "'Inter', 'DM Sans', system-ui, sans-serif", color: '#0f172a', overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @keyframes cm-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
        @keyframes cm-pulse { 0%,100% { opacity: 0.6; } 50% { opacity: 1; } }
        @keyframes cm-gradient { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        @keyframes cm-lineUp { from { transform: translateY(110%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes cm-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .cm-hero-line { display: block; overflow: hidden; }
        .cm-hero-line span { display: block; transform: translateY(110%); opacity: 0; animation: cm-lineUp 0.8s cubic-bezier(0.22,1,0.36,1) forwards; }
        .cm-hero-line:nth-child(1) span { animation-delay: 0.3s; }
        .cm-hero-line:nth-child(2) span { animation-delay: 0.45s; }
        .cm-hero-line:nth-child(3) span { animation-delay: 0.6s; }
        .cm-domain-card:hover { transform: translateY(-6px) !important; box-shadow: 0 20px 40px rgba(0,0,0,0.12) !important; }
        .cm-assess-card:hover { transform: translateY(-4px) scale(1.02) !important; }
        .cm-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(99,102,241,0.4) !important; }
      `}</style>

      {/* ══ NAV ══ */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
        padding: '0 clamp(16px, 4vw, 48px)', height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: navOpaque ? 'rgba(255,255,255,0.92)' : 'transparent',
        backdropFilter: navOpaque ? 'blur(16px)' : 'none',
        borderBottom: navOpaque ? '1px solid rgba(0,0,0,0.06)' : 'none',
        transition: 'all 0.3s',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 12, fontWeight: 800, letterSpacing: 1,
          }}>CM</div>
          <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: -0.5 }}>CogniMap</span>
        </div>
        <button onClick={goLogin} className="cm-btn-primary" style={{
          background: '#0f172a', color: '#fff', border: 'none', borderRadius: 10,
          padding: '10px 24px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
          transition: 'all 0.2s', letterSpacing: 0.3,
        }}>Sign In</button>
      </nav>

      {/* ══ HERO ══ */}
      <section style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        padding: 'clamp(100px, 15vh, 160px) clamp(20px, 6vw, 80px) clamp(60px, 10vh, 120px)',
        background: 'linear-gradient(160deg, #f8fafc 0%, #eef2ff 40%, #faf5ff 70%, #fdf2f8 100%)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative orbs */}
        <div style={{ position: 'absolute', top: '15%', right: '10%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.08), transparent 70%)', animation: 'cm-float 8s ease-in-out infinite', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '10%', left: '5%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(236,72,153,0.06), transparent 70%)', animation: 'cm-float 10s ease-in-out infinite 2s', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '50%', right: '30%', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(20,184,166,0.06), transparent 70%)', animation: 'cm-float 6s ease-in-out infinite 4s', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 800 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#6366F1', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 20, opacity: 0, animation: 'cm-lineUp 0.6s 0.1s forwards' }}>
            Psychometric Assessment Platform
          </div>
          <h1 style={{ fontSize: 'clamp(2.8rem, 6vw, 4.8rem)', fontWeight: 900, lineHeight: 1.05, letterSpacing: -2, color: '#0f172a' }}>
            <div className="cm-hero-line"><span>Discover how</span></div>
            <div className="cm-hero-line"><span style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6, #EC4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundSize: '200% 200%', animation: 'cm-gradient 4s ease infinite' }}>your mind works</span></div>
            <div className="cm-hero-line"><span>from the inside.</span></div>
          </h1>
          <p style={{ fontSize: 'clamp(15px, 1.8vw, 18px)', color: '#64748b', lineHeight: 1.75, maxWidth: 560, marginTop: 28, opacity: 0, animation: 'cm-lineUp 0.7s 0.85s forwards' }}>
            CogniMap uses <strong style={{ color: '#0f172a' }}>adaptive IRT-based assessments</strong> to measure your cognitive abilities across six domains, personality traits, and interest profiles — all scored in real-time.
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 36, opacity: 0, animation: 'cm-lineUp 0.7s 1s forwards', flexWrap: 'wrap' }}>
            <button onClick={goLogin} className="cm-btn-primary" style={{
              background: 'linear-gradient(135deg, #6366F1, #4F46E5)', color: '#fff', border: 'none',
              borderRadius: 14, padding: '16px 36px', fontSize: 15, fontWeight: 700,
              cursor: 'pointer', transition: 'all 0.25s', boxShadow: '0 8px 24px rgba(99,102,241,0.25)',
            }}>Get Started</button>
            <button onClick={goLogin} style={{
              background: 'rgba(255,255,255,0.7)', color: '#0f172a', border: '1.5px solid #e2e8f0',
              borderRadius: 14, padding: '16px 32px', fontSize: 15, fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.2s', backdropFilter: 'blur(8px)',
            }}>Learn More</button>
          </div>
        </div>
      </section>

      {/* ══ STATS BAR ══ */}
      <section style={{ background: '#0f172a', padding: 'clamp(32px, 5vw, 56px) clamp(20px, 4vw, 48px)', display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 0 }}>
        {STATS.map((s, i) => (
          <div key={i} style={{
            flex: '1 1 180px', maxWidth: 260, padding: '20px 32px', textAlign: 'center',
            borderRight: i < STATS.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none',
          }}>
            <div style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 900, color: '#fff', lineHeight: 1 }}>
              <Counter end={s.value} suffix={s.suffix} />
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 6, fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </section>

      {/* ══ COGNITIVE DOMAINS ══ */}
      <section style={{ padding: 'clamp(60px, 10vw, 100px) clamp(20px, 4vw, 48px)', background: '#fff' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Reveal><div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#6366F1', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>What We Measure</div>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 800, lineHeight: 1.15, letterSpacing: -1 }}>Six dimensions of<br /><span style={{ color: '#6366F1' }}>cognitive ability</span></h2>
          </div></Reveal>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {DOMAINS.map((d, i) => (
              <Reveal key={d.code} delay={i + 1}>
                <div className="cm-domain-card" style={{
                  padding: 24, borderRadius: 16,
                  background: '#fafafa', border: '1px solid #f1f5f9',
                  transition: 'all 0.3s cubic-bezier(0.22,1,0.36,1)',
                  cursor: 'default',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 12,
                      background: `${d.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 22,
                    }}>{d.icon}</div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>{d.name}</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: d.color, letterSpacing: 1 }}>{d.code}</div>
                    </div>
                  </div>
                  <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.65 }}>{d.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══ ASSESSMENTS ══ */}
      <section style={{
        padding: 'clamp(60px, 10vw, 100px) clamp(20px, 4vw, 48px)',
        background: 'linear-gradient(180deg, #f8fafc, #eef2ff)',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Reveal><div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#8B5CF6', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>Your Journey</div>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 800, lineHeight: 1.15, letterSpacing: -1 }}>Three assessments.<br /><span style={{ color: '#8B5CF6' }}>One complete profile.</span></h2>
            <p style={{ fontSize: 15, color: '#64748b', lineHeight: 1.7, maxWidth: 520, margin: '16px auto 0' }}>Each assessment adapts to your level, scores in real-time, and builds toward a comprehensive cognitive profile.</p>
          </div></Reveal>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
            {ASSESSMENTS.map((a, i) => (
              <Reveal key={a.title} delay={i + 1}>
                <div className="cm-assess-card" onClick={goLogin} style={{
                  padding: 28, borderRadius: 20,
                  background: '#fff', border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                  cursor: 'pointer', transition: 'all 0.3s',
                }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 14,
                    background: a.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 24, marginBottom: 16, boxShadow: `0 6px 20px ${a.gradient.includes('#6366') ? 'rgba(99,102,241,0.2)' : a.gradient.includes('#EC48') ? 'rgba(236,72,153,0.2)' : 'rgba(20,184,166,0.2)'}`,
                  }}>{a.icon}</div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{a.title}</h3>
                  <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.7 }}>{a.desc}</p>
                  <div style={{ marginTop: 16, fontSize: 13, fontWeight: 600, color: '#6366F1', display: 'flex', alignItems: 'center', gap: 6 }}>
                    Start assessment <span style={{ fontSize: 16 }}>→</span>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA ══ */}
      <section style={{
        padding: 'clamp(60px, 10vw, 100px) clamp(20px, 6vw, 80px)',
        background: 'linear-gradient(135deg, #0f172a, #1e293b)',
        textAlign: 'center', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 600, height: 600, borderRadius: '50%', border: '1px solid rgba(99,102,241,0.08)', animation: 'cm-spin 30s linear infinite', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 400, height: 400, borderRadius: '50%', border: '1px solid rgba(139,92,246,0.06)', animation: 'cm-spin 20s linear infinite reverse', pointerEvents: 'none' }} />
        <Reveal>
          <h2 style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 800, color: '#fff', lineHeight: 1.15, letterSpacing: -1, position: 'relative' }}>
            Ready to map<br /><span style={{ background: 'linear-gradient(135deg, #818CF8, #C084FC)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>your mind?</span>
          </h2>
        </Reveal>
        <Reveal delay={1}><p style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, maxWidth: 420, margin: '20px auto 32px', position: 'relative' }}>
          It takes just a few minutes to discover how you think, reason, and learn.
        </p></Reveal>
        <Reveal delay={2}>
          <button onClick={goLogin} className="cm-btn-primary" style={{
            background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', color: '#fff', border: 'none',
            borderRadius: 14, padding: '18px 44px', fontSize: 16, fontWeight: 700,
            cursor: 'pointer', transition: 'all 0.25s', boxShadow: '0 8px 32px rgba(99,102,241,0.35)',
            position: 'relative',
          }}>Get Started Free</button>
        </Reveal>
      </section>

      {/* ══ FOOTER ══ */}
      <footer style={{ background: '#0f172a', padding: '28px clamp(20px, 4vw, 48px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 9, fontWeight: 800 }}>CM</div>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>CogniMap</span>
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>Assessment Platform · {new Date().getFullYear()}</div>
      </footer>
    </div>
  );
}
