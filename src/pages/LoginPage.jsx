/**
 * LoginPage.jsx — Modern minimal login
 * Matches CogniMap landing page design system.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [mode, setMode] = useState('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(null);
  const { login, tokenLogin } = useAuth();
  const navigate = useNavigate();

  const handleEmailLogin = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const user = await login(email, password);
      if (['super_admin', 'psychologist', 'client_admin'].includes(user.role)) navigate('/admin');
      else navigate('/student');
    } catch (err) { setError(err.message || 'Login failed'); }
    finally { setLoading(false); }
  };

  const handleTokenLogin = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const data = await tokenLogin(token);
      if (data.sessionId) navigate(`/test/${data.sessionId}`);
      else navigate('/student');
    } catch (err) { setError(err.message || 'Invalid token'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      fontFamily: "'Inter', system-ui, sans-serif",
      background: '#f8fafc',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @keyframes lp-fadeIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes lp-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        @keyframes lp-shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        .lp-input:focus { border-color: #6366F1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.1) !important; background: #fff !important; }
        .lp-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 28px rgba(99,102,241,0.4) !important; }
        .lp-btn:active:not(:disabled) { transform: translateY(0); }
      `}</style>

      {/* ── Left panel: branding ── */}
      <div style={{
        width: 'clamp(280px, 35vw, 400px)', flexShrink: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(160deg, #0f172a, #1e293b 50%, #312e81)',
        padding: 'clamp(32px, 4vw, 56px)', position: 'relative', overflow: 'hidden',
        minHeight: '100vh',
      }}>
        {/* Decorative elements */}
        <div style={{ position: 'absolute', top: '8%', left: '5%', width: 160, height: 160, borderRadius: '50%', border: '1px solid rgba(99,102,241,0.1)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '12%', right: '8%', width: 100, height: 100, borderRadius: '50%', border: '1px solid rgba(139,92,246,0.08)', animation: 'lp-float 8s ease-in-out infinite', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 280, textAlign: 'center' }}>
          {/* Logo */}
          <div style={{
            width: 44, height: 44, borderRadius: 12, margin: '0 auto 16px',
            background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 14, fontWeight: 900, letterSpacing: 1,
            boxShadow: '0 6px 24px rgba(99,102,241,0.3)',
          }}>CM</div>

          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: -0.3, marginBottom: 8 }}>
            CogniMap
          </h1>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, marginBottom: 28 }}>
            Adaptive assessments that discover how you think and learn.
          </p>

          {/* Feature pills */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
            {[
              { icon: '🧩', text: '6 Domains' },
              { icon: '📊', text: 'IRT Adaptive' },
              { icon: '⚡', text: 'Live Scoring' },
            ].map(f => (
              <div key={f.text} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 14px', borderRadius: 8,
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)',
                fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: 500,
              }}>
                <span style={{ fontSize: 13 }}>{f.icon}</span>{f.text}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom credit */}
        <div style={{ position: 'absolute', bottom: 24, fontSize: 11, color: 'rgba(255,255,255,0.15)' }}>
          Assessment Platform · {new Date().getFullYear()}
        </div>
      </div>

      {/* ── Right panel: login form ── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: 'clamp(32px, 4vw, 56px)',
        background: '#fff',
        animation: 'lp-fadeIn 0.5s ease-out',
      }}>
        <div style={{ width: '100%', maxWidth: 360 }}>

          {/* Welcome */}
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', letterSpacing: -0.3 }}>Welcome back</h2>
            <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>Sign in to continue to your assessments</p>
          </div>

          {/* Mode toggle */}
          <div style={{
            display: 'flex', gap: 4, padding: 4, marginBottom: 24,
            background: '#f1f5f9', borderRadius: 12, border: '1px solid #e2e8f0',
          }}>
            {[
              { key: 'email', label: 'Email Login', icon: '📧' },
              { key: 'token', label: 'Access Code', icon: '🔑' },
            ].map(t => (
              <button key={t.key} onClick={() => { setMode(t.key); setError(''); }} style={{
                flex: 1, padding: '10px 0', borderRadius: 9, border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 700, fontFamily: "'Inter', system-ui",
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                transition: 'all 0.2s',
                background: mode === t.key ? 'linear-gradient(135deg, #6366F1, #4F46E5)' : 'transparent',
                color: mode === t.key ? '#fff' : '#94a3b8',
                boxShadow: mode === t.key ? '0 2px 12px rgba(99,102,241,0.3)' : 'none',
              }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10,
              padding: '10px 14px', marginBottom: 16, fontSize: 13, fontWeight: 600, color: '#dc2626',
              display: 'flex', alignItems: 'center', gap: 6,
              animation: 'lp-fadeIn 0.2s ease-out',
            }}>
              <span style={{ fontSize: 14 }}>⚠️</span> {error}
            </div>
          )}

          {/* Email form */}
          {mode === 'email' ? (
            <form onSubmit={handleEmailLogin}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', display: 'block', marginBottom: 6 }}>
                  Email
                </label>
                <input
                  className="lp-input"
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com" required autoComplete="email"
                  onFocus={() => setFocused('email')} onBlur={() => setFocused(null)}
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: 10,
                    border: `1.5px solid ${focused === 'email' ? '#6366F1' : '#e2e8f0'}`,
                    background: '#f8fafc', fontSize: 14, fontWeight: 500, color: '#0f172a',
                    fontFamily: "'Inter', system-ui", outline: 'none', transition: 'all 0.15s',
                  }}
                />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', display: 'block', marginBottom: 6 }}>
                  Password
                </label>
                <input
                  className="lp-input"
                  type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password" required autoComplete="current-password"
                  onFocus={() => setFocused('pass')} onBlur={() => setFocused(null)}
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: 10,
                    border: `1.5px solid ${focused === 'pass' ? '#6366F1' : '#e2e8f0'}`,
                    background: '#f8fafc', fontSize: 14, fontWeight: 500, color: '#0f172a',
                    fontFamily: "'Inter', system-ui", outline: 'none', transition: 'all 0.15s',
                  }}
                />
              </div>
              <button type="submit" className="lp-btn" disabled={loading} style={{
                width: '100%', padding: 14, borderRadius: 12, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', color: '#fff',
                fontSize: 14, fontWeight: 700, fontFamily: "'Inter', system-ui",
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 4px 20px rgba(99,102,241,0.3)',
                transition: 'all 0.2s', opacity: loading ? 0.6 : 1,
              }}>
                {loading ? 'Signing in...' : 'Sign In'}
                {!loading && <span style={{ fontSize: 16 }}>→</span>}
              </button>
            </form>
          ) : (
            <form onSubmit={handleTokenLogin}>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', display: 'block', marginBottom: 6 }}>
                  Student Access Code
                </label>
                <input
                  className="lp-input"
                  type="text" value={token}
                  onChange={e => setToken(e.target.value.toUpperCase())}
                  placeholder="ABCD1234" maxLength={12} required
                  autoComplete="off" autoCapitalize="characters" spellCheck={false}
                  onFocus={() => setFocused('token')} onBlur={() => setFocused(null)}
                  style={{
                    width: '100%', padding: '14px 16px', borderRadius: 10,
                    border: `1.5px solid ${focused === 'token' ? '#6366F1' : '#e2e8f0'}`,
                    background: '#f8fafc', fontSize: 20, fontWeight: 800, color: '#0f172a',
                    fontFamily: "'Inter', monospace", outline: 'none', transition: 'all 0.15s',
                    textAlign: 'center', letterSpacing: '0.2em',
                  }}
                />
                <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 6, textAlign: 'center' }}>
                  Enter the code provided by your administrator
                </p>
              </div>
              <button type="submit" className="lp-btn" disabled={loading} style={{
                width: '100%', padding: 14, borderRadius: 12, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', color: '#fff',
                fontSize: 14, fontWeight: 700, fontFamily: "'Inter', system-ui",
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 4px 20px rgba(99,102,241,0.3)',
                transition: 'all 0.2s', opacity: loading ? 0.6 : 1,
              }}>
                {loading ? 'Verifying...' : 'Enter Assessment'}
                {!loading && <span style={{ fontSize: 16 }}>→</span>}
              </button>
            </form>
          )}

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0 0' }}>
            <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
            <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Secure</span>
            <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
          </div>
          <p style={{ fontSize: 11, color: '#cbd5e1', textAlign: 'center', marginTop: 10, lineHeight: 1.6 }}>
            Your data is encrypted and assessments are scored in real-time.
          </p>
        </div>
      </div>
    </div>
  );
}
