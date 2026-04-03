/**
 * TestComplete.jsx — Clean White Theme
 * Results screen matching the CogniMap clean white design system.
 */
import { useLocation, useNavigate } from 'react-router-dom';

const DOMAIN_META = {
  gf:  { icon: '🧩', label: 'Pattern Reasoning',  color: '#6366F1' },
  gv:  { icon: '👁',  label: 'Visual Spatial',     color: '#0891B2' },
  gq:  { icon: '🔢', label: 'Quantitative',        color: '#D97706' },
  gc:  { icon: '💬', label: 'Verbal Reasoning',    color: '#059669' },
  gs:  { icon: '⚡', label: 'Processing Speed',    color: '#DC2626' },
  gwm: { icon: '🧠', label: 'Working Memory',      color: '#8B5CF6' },
};

export default function TestComplete() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const scores = state?.scores;
  const globalScore = scores?.scores?.find(s => s.trait_or_dim === 'global_theta');
  const domainScores = scores?.scores?.filter(s => s.domain !== 'global' && s.domain !== 'cluster') || [];
  const clusters = scores?.scores?.filter(s => s.domain === 'cluster') || [];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #f8fafc 0%, #f1f5f9 50%, #eef2ff 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '32px 16px',
      fontFamily: "'Nunito', sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;900&family=Fredoka+One&display=swap');
        @keyframes tcFadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes barIn { from { width:0; } to { width:var(--w); } }
        @keyframes scorePop { 0%{transform:scale(0.5);opacity:0;} 70%{transform:scale(1.1);} 100%{transform:scale(1);opacity:1;} }
      `}</style>

      {/* Background blob */}
      <div style={{ position:'fixed', width:600, height:600, borderRadius:'50%', top:'-200px', left:'-200px', background:'rgba(99,102,241,0.08)', filter:'blur(90px)', pointerEvents:'none' }} />
      <div style={{ position:'fixed', width:400, height:400, borderRadius:'50%', bottom:'-100px', right:'-100px', background:'rgba(139,92,246,0.07)', filter:'blur(70px)', pointerEvents:'none' }} />

      <div style={{ width:'100%', maxWidth:520, position:'relative', zIndex:1, animation:'tcFadeUp 0.4s ease' }}>

        {/* Header card */}
        <div style={{ background:'#ffffff', border:'1.5px solid #e0e7ff', borderRadius:24, padding:'32px 28px', marginBottom:16, boxShadow:'0 8px 40px rgba(99,102,241,0.1), 0 2px 8px rgba(0,0,0,0.05)', textAlign:'center' }}>
          <div style={{ fontSize:56, marginBottom:12 }}>🏆</div>
          <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:99, padding:'4px 14px', marginBottom:16 }}>
            <span style={{ width:7, height:7, borderRadius:'50%', background:'#22c55e' }} />
            <span style={{ fontSize:11, fontWeight:900, color:'#15803d', letterSpacing:'0.1em', textTransform:'uppercase' }}>Assessment Complete</span>
          </div>
          <h1 style={{ fontFamily:"'Fredoka One', cursive", fontSize:'1.8rem', color:'#1e293b', margin:'0 0 4px', letterSpacing:'-0.5px' }}>Results Summary</h1>
          <p style={{ fontSize:'0.9rem', color:'#64748b', margin:0 }}>Your cognitive profile has been scored</p>

          {globalScore && (
            <div style={{ marginTop:24, padding:'20px 24px', background:'linear-gradient(135deg,#eef2ff,#f5f3ff)', border:'1.5px solid #c7d2fe', borderRadius:16, animation:'scorePop 0.5s 0.2s ease-out both' }}>
              <div style={{ fontFamily:"'Fredoka One', cursive", fontSize:'3rem', color:'#6366F1', lineHeight:1, marginBottom:4 }}>
                {parseFloat(globalScore.raw_score).toFixed(2)}
              </div>
              <div style={{ fontSize:'0.8rem', fontWeight:700, color:'#6366F1', opacity:0.7 }}>
                {globalScore.descriptor || 'Overall Score'}
              </div>
            </div>
          )}
        </div>

        {/* Domain breakdown card */}
        {domainScores.length > 0 && (
          <div style={{ background:'#ffffff', border:'1px solid #e2e8f0', borderRadius:20, padding:'24px 28px', marginBottom:16, boxShadow:'0 2px 12px rgba(0,0,0,0.05)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:18 }}>
              <span style={{ fontSize:13, fontWeight:900, color:'#94a3b8', letterSpacing:'0.12em', textTransform:'uppercase' }}>Domain Scores</span>
              <div style={{ flex:1, height:1, background:'#e2e8f0' }} />
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {domainScores.map(s => {
                const meta = DOMAIN_META[s.domain] || { icon:'📊', label:s.domain, color:'#6366F1' };
                const theta = parseFloat(s.raw_score);
                const pct = Math.max(0, Math.min(100, ((theta + 3) / 6) * 100));
                return (
                  <div key={s.id || s.trait_or_dim} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 12px', background:'#f8fafc', borderRadius:12, border:'1px solid #f1f5f9' }}>
                    <span style={{ fontSize:18, flexShrink:0 }}>{meta.icon}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:10, fontWeight:800, color:'#64748b', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.08em' }}>{meta.label}</div>
                      <div style={{ height:6, borderRadius:99, background:'#e2e8f0', overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${pct}%`, background:`linear-gradient(90deg,${meta.color},${meta.color}99)`, borderRadius:99, transition:'width 1s ease' }} />
                      </div>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <div style={{ fontSize:15, fontWeight:900, fontFamily:'monospace', color:'#1e293b' }}>{theta > 0 ? '+' : ''}{theta.toFixed(2)}</div>
                      <div style={{ fontSize:9, fontWeight:700, color:'#94a3b8', marginTop:1 }}>{s.descriptor}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Clusters card */}
        {clusters.length > 0 && (
          <div style={{ background:'#ffffff', border:'1px solid #e2e8f0', borderRadius:20, padding:'24px 28px', marginBottom:16, boxShadow:'0 2px 12px rgba(0,0,0,0.05)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
              <span style={{ fontSize:13, fontWeight:900, color:'#94a3b8', letterSpacing:'0.12em', textTransform:'uppercase' }}>Aptitude Clusters</span>
              <div style={{ flex:1, height:1, background:'#e2e8f0' }} />
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:10 }}>
              {clusters.map(c => (
                <div key={c.trait_or_dim} style={{ flex:'1 1 120px', padding:'14px 16px', background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:14, textAlign:'center' }}>
                  <div style={{ fontFamily:"'Fredoka One', cursive", fontSize:'1.4rem', color:'#6366F1', marginBottom:2 }}>{parseFloat(c.raw_score).toFixed(2)}</div>
                  <div style={{ fontSize:'0.7rem', fontWeight:700, color:'#64748b', textTransform:'capitalize' }}>{c.trait_or_dim}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA button */}
        <button onClick={() => navigate('/student')} style={{
          width:'100%', padding:'14px 24px',
          background:'linear-gradient(135deg,#6366F1,#8B5CF6)',
          color:'#fff', border:'none', borderRadius:16,
          fontFamily:"'Fredoka One', cursive",
          fontSize:'1rem', cursor:'pointer', letterSpacing:'0.5px',
          display:'flex', alignItems:'center', justifyContent:'center', gap:8,
          boxShadow:'0 6px 24px rgba(99,102,241,0.35)',
          transition:'all 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 32px rgba(99,102,241,0.45)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(99,102,241,0.35)'; }}
        >
          Back to Dashboard →
        </button>

        <div style={{ textAlign:'center', marginTop:14, fontSize:'0.75rem', color:'#94a3b8' }}>
          CogniMap · Assessment Results
        </div>
      </div>
    </div>
  );
}
