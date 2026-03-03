import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Brain, ArrowRight, Key } from 'lucide-react';

export default function LoginPage() {
  const [mode, setMode] = useState('email'); // email | token
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, tokenLogin } = useAuth();
  const navigate = useNavigate();

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const user = await login(email, password);
      if (['super_admin','psychologist','client_admin'].includes(user.role)) navigate('/admin');
      else navigate('/student');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally { setLoading(false); }
  };

  const handleTokenLogin = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const data = await tokenLogin(token);
      if (data.sessionId) navigate(`/test/${data.sessionId}`);
      else navigate('/student');
    } catch (err) {
      setError(err.message || 'Invalid token');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>
      {/* Left panel — branding */}
      <div className="hidden lg:flex w-[480px] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #1C1917 0%, #292524 50%, #44403C 100%)' }}>
        
        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full opacity-5"
          style={{ background: 'radial-gradient(circle, #F59E0B, transparent)' }} />
        <div className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full opacity-5"
          style={{ background: 'radial-gradient(circle, #4D7C5E, transparent)' }} />

        <div>
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
              style={{ background: 'linear-gradient(135deg, #B45309, #F59E0B)' }}>🧠</div>
            <span className="text-display text-white font-bold text-xl tracking-tight">CogniMap</span>
          </div>
          
          <h1 className="text-display text-white text-4xl font-bold leading-tight mb-4">
            Discover Every Mind's<br/>
            <span style={{ color: '#F59E0B' }}>Unique Potential</span>
          </h1>
          <p className="text-[15px] leading-relaxed" style={{ color: '#A8A29E' }}>
            Adaptive cognitive assessment across five dimensions of intelligence. 
            Precision-engineered with IRT psychometrics.
          </p>
        </div>

        <div className="flex gap-4 text-xs font-mono" style={{ color: '#78716C' }}>
          <span>5 Domains</span>
          <span>·</span>
          <span>750 Items</span>
          <span>·</span>
          <span>3 Age Bands</span>
          <span>·</span>
          <span>Adaptive IRT</span>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10 justify-center">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
              style={{ background: 'linear-gradient(135deg, #B45309, #D97706)' }}>🧠</div>
            <span className="text-display font-bold text-xl" style={{ color: 'var(--ink)' }}>CogniMap</span>
          </div>

          <h2 className="text-display text-2xl font-bold mb-1" style={{ color: 'var(--ink)' }}>Welcome back</h2>
          <p className="text-sm mb-8" style={{ color: 'var(--ink-dim)' }}>Sign in to your account to continue</p>

          {/* Mode tabs */}
          <div className="flex gap-1 p-1 rounded-xl mb-6" style={{ background: 'var(--bg-subtle)' }}>
            <button onClick={() => setMode('email')}
              className={`flex-1 py-2.5 rounded-lg text-[13px] font-semibold transition-all ${
                mode === 'email' ? 'bg-white shadow-soft' : ''
              }`}
              style={{ color: mode === 'email' ? 'var(--ink)' : 'var(--ink-dim)' }}>
              Email Login
            </button>
            <button onClick={() => setMode('token')}
              className={`flex-1 py-2.5 rounded-lg text-[13px] font-semibold transition-all flex items-center justify-center gap-1.5 ${
                mode === 'token' ? 'bg-white shadow-soft' : ''
              }`}
              style={{ color: mode === 'token' ? 'var(--ink)' : 'var(--ink-dim)' }}>
              <Key size={13} />
              Student Token
            </button>
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl text-[13px] font-semibold"
              style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>
              {error}
            </div>
          )}

          {mode === 'email' ? (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider mb-1.5 block"
                  style={{ color: 'var(--ink-dim)' }}>Email</label>
                <input className="input-field" type="email" value={email}
                  onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider mb-1.5 block"
                  style={{ color: 'var(--ink-dim)' }}>Password</label>
                <input className="input-field" type="password" value={password}
                  onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
              </div>
              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
                <ArrowRight size={16} />
              </button>
            </form>
          ) : (
            <form onSubmit={handleTokenLogin} className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider mb-1.5 block"
                  style={{ color: 'var(--ink-dim)' }}>Access Code</label>
                <input className="input-field text-center text-lg font-mono tracking-[0.3em]" value={token}
                  onChange={e => setToken(e.target.value.toUpperCase())} placeholder="ABCD1234"
                  maxLength={12} required />
              </div>
              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? 'Verifying...' : 'Enter Assessment'}
                <ArrowRight size={16} />
              </button>
            </form>
          )}

          <p className="text-center text-xs mt-8" style={{ color: 'var(--ink-faint)' }}>
            CogniMap Cognitive Assessment Platform • Powered by IRT Adaptive Testing
          </p>
        </div>
      </div>
    </div>
  );
}
