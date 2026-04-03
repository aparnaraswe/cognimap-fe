/**
 * StudentDashboard.jsx — CogniMap Test-Taking UI
 * Matches cognimap-dashboard.html reference design
 * Design tokens: --primary #6448A8, bg #E8E4F5, surface #FFFFFF, surface-2 #F3F0FB
 * Fonts: DM Serif Display (display) + Plus Jakarta Sans (body)
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

/* ─── Battery meta ─── */
const BAT = {
  aptitude:    { label: 'Cognitive Aptitude',  icon: '🧩', abbr: 'CMA', subtitle: 'All domains', color: '#6448A8' },
  personality: { label: 'Personality Profile', icon: '💜', abbr: 'PP',  subtitle: 'Big Five',    color: '#9278C0' },
  interest:    { label: 'Interest Profile',    icon: '🧭', abbr: 'IP',  subtitle: 'RIASEC',      color: '#854F0B' },
  default:     { label: 'Assessment',          icon: '📋', abbr: 'AT',  subtitle: 'General',     color: '#6448A8' },
};
const DOM_LABELS = {
  gf: 'Pattern', gv: 'Visual', gq: 'Quant',
  gc: 'Verbal',  gs: 'Speed',  gwm: 'Memory',
};
const DOM_COLORS = {
  gf: '#6448A8', gv: '#1D9E75', gq: '#D48B10',
  gc: '#1D74D8', gs: '#D85A30', gwm: '#9E1DAE',
};

/* ─── CSS — matching cognimap-dashboard.html reference ─── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

:root {
  --primary:       #6448A8;
  --primary-light: #9278C0;
  --primary-bg:    #EEEDFE;
  --primary-dark:  #3C3489;
  --success:       #1D9E75;
  --success-bg:    #E1F5EE;
  --warning:       #D48B10;
  --warning-bg:    #FEF4E0;
  --error:         #D85A30;
  --error-bg:      #FAECE7;
  --text:          #1A1A2E;
  --text-2:        #555570;
  --text-3:        #9999AA;
  --border:        rgba(100,72,168,0.11);
  --bg:            #E8E4F5;
  --surface:       #FFFFFF;
  --surface-2:     #F3F0FB;
  --divider:       1px solid rgba(100,72,168,0.11);
}

.sd *,.sd *::before,.sd *::after{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}

/* ── Outer wrapper ── */
.sd{
  font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,sans-serif;
  min-height:100vh;
  background:var(--bg);
  display:flex;flex-direction:column;
  -webkit-font-smoothing:antialiased;
}

/* ── App shell ── */
.sd-app{
  width:100%;
  min-height:100vh;
  background:var(--surface);
  display:flex;flex-direction:column;
  overflow:hidden;
}

/* ── Nav bar ── */
.sd-nav{
  height:52px;background:var(--surface);
  border-bottom:var(--divider);
  display:flex;align-items:center;
  padding:0 24px;flex-shrink:0;
}
.sd-nav-logo{
  display:flex;align-items:center;gap:9px;margin-right:auto;
}
.sd-nav-logo-mark{
  width:28px;height:28px;border-radius:8px;
  background:linear-gradient(140deg,#3C3489,#6448A8);
  display:flex;align-items:center;justify-content:center;flex-shrink:0;
}
.sd-nav-logo-text{font-size:13px;font-weight:800;color:var(--text);letter-spacing:-0.3px}
.sd-nav-tabs{display:flex;gap:2px}
.sd-nav-tab{
  padding:7px 14px;font-size:12px;font-weight:600;
  color:var(--text-3);border:none;background:transparent;
  font-family:inherit;cursor:pointer;border-radius:8px;
  transition:color .15s,background .15s;
}
.sd-nav-tab:hover{color:var(--text-2);background:var(--surface-2)}
.sd-nav-tab.on{color:var(--primary);background:var(--primary-bg)}
.sd-nav-avatar{
  width:30px;height:30px;border-radius:50%;
  background:linear-gradient(140deg,#6448A8,#9278C0);
  display:flex;align-items:center;justify-content:center;
  font-size:11px;font-weight:800;color:#fff;
  margin-left:16px;cursor:pointer;flex-shrink:0;
  transition:opacity .15s;
}
.sd-nav-avatar:hover{opacity:0.85}

/* ── Screens ── */
.sd-screen{display:none;flex-direction:column;flex:1;min-height:0;overflow:hidden}
.sd-screen.on{display:flex;animation:sd-fadeSlide .25s cubic-bezier(0.4,0,0.2,1)}
@keyframes sd-fadeSlide{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}

/* ── Scroll area ── */
.sd-scroll{
  flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:24px 28px;
}
.sd-scroll::-webkit-scrollbar{width:5px}
.sd-scroll::-webkit-scrollbar-track{background:transparent}
.sd-scroll::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px}

/* ── Typography ── */
.sd-display{font-family:'DM Serif Display',Georgia,serif;font-weight:400}
.sd-section-label{
  font-size:10px;font-weight:700;color:var(--text-3);
  text-transform:uppercase;letter-spacing:1.2px;margin-bottom:12px;
}

/* ── Pill ── */
.sd-pill{
  display:inline-flex;align-items:center;
  font-size:11px;font-weight:700;
  padding:4px 12px;border-radius:20px;letter-spacing:0.3px;
}

/* ── Buttons ── */
.sd-btn-primary{
  background:var(--primary);color:#fff;
  border:none;border-radius:11px;
  padding:10px 18px;font-size:13px;font-weight:600;
  font-family:inherit;cursor:pointer;
  transition:background .15s,transform .1s,box-shadow .15s;
  box-shadow:0 3px 10px rgba(100,72,168,0.25);
  letter-spacing:0.1px;white-space:nowrap;
}
.sd-btn-primary:hover{background:#5537A0}
.sd-btn-primary:active{transform:scale(.97)}
.sd-btn-sm{padding:7px 14px;font-size:12px;border-radius:9px}

/* ═══════════════════════════
   HOME SCREEN
═══════════════════════════ */
.sd-home-header{padding:22px 28px 0;flex-shrink:0}
.sd-home-header h1{font-size:26px;color:var(--text);line-height:1.2;margin-bottom:3px}
.sd-home-header p{font-size:13px;color:var(--text-2)}

/* Stats strip */
.sd-stats-strip{display:flex;gap:10px;padding:16px 28px 0;flex-shrink:0}
.sd-stat-chip{
  flex:1;background:var(--surface-2);
  border:1.5px solid var(--border);border-radius:13px;
  padding:12px 14px;display:flex;align-items:center;gap:10px;
}
.sd-stat-chip-icon{
  width:32px;height:32px;border-radius:9px;
  display:flex;align-items:center;justify-content:center;flex-shrink:0;
}
.sd-stat-chip-val{font-size:18px;font-weight:800;color:var(--text);line-height:1}
.sd-stat-chip-lbl{font-size:10px;color:var(--text-3);margin-top:2px;font-weight:600}

/* Filter row */
.sd-filter-row{display:flex;gap:6px;padding:14px 28px 0;flex-shrink:0}
.sd-filter-chip{
  padding:5px 14px;font-size:11px;font-weight:700;
  border-radius:20px;cursor:pointer;
  border:1.5px solid var(--border);background:var(--surface);
  color:var(--text-3);font-family:inherit;transition:all .15s;
}
.sd-filter-chip:hover{border-color:var(--primary-light);color:var(--primary)}
.sd-filter-chip.on{background:var(--primary-bg);border-color:var(--primary);color:var(--primary)}

/* Tests grid */
.sd-tests-grid{
  display:grid;grid-template-columns:1fr 1fr;
  gap:12px;padding:14px 0;
}
.sd-test-card{
  background:var(--surface);border:1.5px solid var(--border);
  border-radius:16px;overflow:hidden;
  transition:transform .15s,box-shadow .15s,border-color .15s;
  cursor:pointer;animation:sd-cardIn .35s cubic-bezier(0.4,0,0.2,1) both;
}
.sd-test-card:hover{
  transform:translateY(-2px);
  box-shadow:0 8px 24px rgba(100,72,168,0.12);
  border-color:var(--primary-light);
}
.sd-tc-top{
  padding:16px 16px 12px;border-bottom:var(--divider);
  display:flex;align-items:flex-start;gap:11px;
}
.sd-tc-icon{
  width:40px;height:40px;border-radius:11px;
  display:flex;align-items:center;justify-content:center;
  flex-shrink:0;font-size:18px;
}
.sd-tc-title{font-size:13px;font-weight:700;color:var(--text);line-height:1.35;margin-bottom:3px}
.sd-tc-sub{font-size:11px;color:var(--text-3);font-weight:500}
.sd-tc-body{padding:12px 16px;display:flex;flex-direction:column;gap:7px}
.sd-tc-row{
  display:flex;justify-content:space-between;align-items:center;
  font-size:11px;color:var(--text-2);
}
.sd-tc-row strong{font-weight:700;color:var(--text);font-size:11px}
.sd-tc-footer{
  padding:0 16px 14px;
  display:flex;justify-content:space-between;align-items:center;
}

/* Status badges */
.sd-badge{font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;letter-spacing:0.3px}
.sd-badge-due{background:var(--warning-bg);color:var(--warning)}
.sd-badge-new{background:var(--primary-bg);color:var(--primary)}
.sd-badge-progress{background:rgba(100,72,168,0.12);color:var(--primary-dark)}
.sd-badge-done{background:var(--success-bg);color:var(--success)}

/* Progress bar in card */
.sd-tc-prog{margin:0 16px 10px;background:var(--surface-2);border-radius:20px;height:4px;overflow:hidden}
.sd-tc-prog-fill{height:100%;border-radius:20px;background:var(--primary)}

@keyframes sd-cardIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}

/* ═══════════════════════════
   COMPLETED SCREEN
═══════════════════════════ */
.sd-completed-header{
  padding:22px 28px 16px;flex-shrink:0;
  border-bottom:var(--divider);
  display:flex;align-items:center;justify-content:space-between;
}
.sd-completed-header h1{font-size:22px;color:var(--text)}
.sd-completed-header p{font-size:12px;color:var(--text-3);margin-top:2px}
.sd-sort-select{
  font-size:12px;font-weight:600;color:var(--text-2);
  border:1.5px solid var(--border);border-radius:9px;
  padding:6px 12px;background:var(--surface);
  font-family:inherit;cursor:pointer;outline:none;
}

.sd-results-list{display:flex;flex-direction:column;gap:10px;padding:14px 0}
.sd-result-card{
  background:var(--surface);border:1.5px solid var(--border);
  border-radius:14px;display:flex;overflow:hidden;
  transition:box-shadow .15s;cursor:pointer;
}
.sd-result-card:hover{box-shadow:0 4px 16px rgba(100,72,168,0.09)}
.sd-rc-accent{width:5px;flex-shrink:0}
.sd-rc-body{
  flex:1;padding:14px 16px;
  display:flex;align-items:center;gap:14px;
}
.sd-rc-icon{
  width:38px;height:38px;border-radius:10px;
  display:flex;align-items:center;justify-content:center;flex-shrink:0;
}
.sd-rc-info{flex:1}
.sd-rc-title{font-size:13px;font-weight:700;color:var(--text);margin-bottom:3px}
.sd-rc-meta{font-size:11px;color:var(--text-3);font-weight:500}
.sd-rc-score-block{text-align:right;min-width:46px}
.sd-rc-score{font-size:22px;font-weight:800;line-height:1}
.sd-rc-score-lbl{font-size:10px;color:var(--text-3);font-weight:600;margin-top:2px}

/* Domain bars */
.sd-domain-bars{display:flex;gap:4px;align-items:flex-end;height:32px}
.sd-d-bar-wrap{display:flex;flex-direction:column;align-items:center;gap:3px}
.sd-d-bar{width:16px;border-radius:4px;transition:height .6s cubic-bezier(0.4,0,0.2,1)}
.sd-d-bar-lbl{font-size:8px;font-weight:700;color:var(--text-3);letter-spacing:0.3px}

/* Score ring */
.sd-score-ring{position:relative;width:48px;height:48px;flex-shrink:0}
.sd-score-ring svg{position:absolute;top:0;left:0;transform:rotate(-90deg)}
.sd-score-ring-val{
  position:absolute;inset:0;
  display:flex;align-items:center;justify-content:center;
  font-size:11px;font-weight:800;
}

/* ═══════════════════════════
   PROFILE SCREEN
═══════════════════════════ */
.sd-profile-layout{display:flex;flex:1;min-height:0}
.sd-profile-left{
  width:240px;flex-shrink:0;
  background:linear-gradient(160deg,#2B1E6E 0%,#5438A2 60%,#7B5CC0 100%);
  display:flex;flex-direction:column;align-items:center;
  padding:32px 20px;
}
.sd-profile-avatar{
  width:72px;height:72px;border-radius:50%;
  background:rgba(255,255,255,0.15);
  border:3px solid rgba(255,255,255,0.3);
  display:flex;align-items:center;justify-content:center;
  font-size:26px;font-weight:800;color:#fff;margin-bottom:14px;
}
.sd-profile-name{
  font-family:'DM Serif Display',serif;
  font-size:18px;color:#fff;text-align:center;margin-bottom:5px;
}
.sd-profile-grade{font-size:11px;color:rgba(255,255,255,0.55);font-weight:600;margin-bottom:22px;text-align:center}
.sd-profile-stat-grid{width:100%;display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:24px}
.sd-profile-stat{background:rgba(255,255,255,0.1);border-radius:10px;padding:10px 8px;text-align:center}
.sd-profile-stat-val{font-size:18px;font-weight:800;color:#fff;line-height:1}
.sd-profile-stat-lbl{font-size:9px;color:rgba(255,255,255,0.5);font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-top:3px}
.sd-profile-badges-lbl{font-size:10px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-bottom:10px;align-self:flex-start}
.sd-profile-badges{display:flex;gap:7px;flex-wrap:wrap;justify-content:center}
.sd-p-badge{
  width:34px;height:34px;border-radius:9px;
  display:flex;align-items:center;justify-content:center;
  background:rgba(255,255,255,0.1);font-size:16px;
}
.sd-profile-right{flex:1;overflow-y:auto;padding:24px 26px}
.sd-profile-section{margin-bottom:22px}
.sd-profile-section-title{font-size:11px;font-weight:700;color:var(--text-3);text-transform:uppercase;letter-spacing:1px;margin-bottom:12px}
.sd-info-card{background:var(--surface-2);border:1.5px solid var(--border);border-radius:13px;padding:2px 14px}
.sd-info-row{
  display:flex;justify-content:space-between;align-items:center;
  font-size:13px;padding:9px 0;border-bottom:1px solid rgba(100,72,168,0.07);
}
.sd-info-row:last-child{border-bottom:none}
.sd-info-row label{color:var(--text-2);font-weight:500}
.sd-info-row span{font-weight:700;color:var(--text)}

/* Cognitive profile tiles */
.sd-cog-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.sd-cog-tile{
  background:var(--surface-2);border:1.5px solid var(--border);
  border-radius:12px;padding:12px 10px;text-align:center;
}
.sd-cog-tile-score{font-size:20px;font-weight:800}
.sd-cog-tile-bar{width:100%;height:4px;background:var(--border);border-radius:2px;margin:6px 0 5px;overflow:hidden}
.sd-cog-tile-fill{height:100%;border-radius:2px}
.sd-cog-tile-name{font-size:9px;font-weight:700;color:var(--text-3);text-transform:uppercase;letter-spacing:0.5px}

/* Sign out */
.sd-signout{
  width:100%;padding:10px;border-radius:10px;margin-top:8px;
  border:1.5px solid rgba(216,90,48,0.2);background:var(--error-bg);color:var(--error);
  font-family:inherit;font-size:12px;font-weight:700;
  cursor:pointer;transition:.15s;
}
.sd-signout:hover{background:#FADDD4;border-color:rgba(216,90,48,0.3)}

/* Empty state */
.sd-empty{
  display:flex;flex-direction:column;align-items:center;
  justify-content:center;padding:40px;text-align:center;
  color:var(--text-3);gap:10px;
}
.sd-empty p{font-size:13px}

/* Loading */
.sd-loading{text-align:center;padding:40px 0}
.sd-spinner{
  display:inline-block;width:22px;height:22px;border-radius:50%;
  border:2.5px solid var(--border);border-top-color:var(--primary);
  animation:sd-spin .6s linear infinite;margin-bottom:8px;
}
@keyframes sd-spin{to{transform:rotate(360deg)}}

/* ── Responsive ── */
@media(max-width:620px){
  .sd{padding:0;align-items:flex-start}
  .sd-app{border-radius:0;height:auto;min-height:100vh}
  .sd-tests-grid{grid-template-columns:1fr}
  .sd-profile-layout{flex-direction:column}
  .sd-profile-left{width:100%}
  .sd-stats-strip{flex-wrap:wrap}
  .sd-stat-chip{min-width:calc(50% - 5px)}
}
`;

/* ─── Helpers ─── */
function getProgress(s) {
  const bi = s.battery_info || {};
  const answered = bi.answeredCount ?? s.answered_count ?? s.current_item_index ?? 0;
  const total    = bi.totalItems ?? s.total_items ?? s.item_count ?? 0;
  return { answered, total, pct: total > 0 ? Math.round((answered / total) * 100) : 0 };
}
function thetaToPct(theta) {
  return Math.max(5, Math.min(95, Math.round(((theta + 3) / 6) * 100)));
}
function scoreColor(s) {
  if (s >= 85) return '#1D9E75';
  if (s >= 70) return '#6448A8';
  return '#D85A30';
}
function scoreBg(s) {
  if (s >= 85) return '#E1F5EE';
  if (s >= 70) return '#EEEDFE';
  return '#FAECE7';
}

/* ══════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════ */
export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab]           = useState('home');
  const [filter, setFilter]     = useState('all');
  const [sessions, setSessions] = useState([]);
  const [reports, setReports]   = useState([]);
  const [loading, setLoading]   = useState(true);

  /* Inject CSS once */
  useEffect(() => {
    if (!document.getElementById('sd-css')) {
      const el = document.createElement('style');
      el.id = 'sd-css'; el.textContent = CSS;
      document.head.appendChild(el);
    }
  }, []);

  useEffect(() => {
    Promise.allSettled([
      api.get('/sessions?mine=true'),
      api.get('/reports?limit=30'),
    ]).then(([sR, rR]) => {
      if (sR.status === 'fulfilled') setSessions(sR.value.sessions || []);
      if (rR.status === 'fulfilled') setReports(rR.value.reports || rR.value || []);
    }).finally(() => setLoading(false));
  }, []);

  /* Derived */
  const pending    = sessions.filter(s => ['assigned', 'in_progress'].includes(s.status));
  const inProgress = sessions.filter(s => s.status === 'in_progress');
  const assigned   = sessions.filter(s => s.status === 'assigned');
  const completed  = sessions.filter(s => s.status === 'completed');
  const firstName  = user?.first_name || 'Student';
  const initials   = `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`.toUpperCase() || '?';

  /* Greeting based on time of day */
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  /* Filter logic */
  const filteredPending = filter === 'all'
    ? pending
    : filter === 'in-progress'
      ? inProgress
      : assigned;

  /* Avg score from reports */
  const avgScore = reports.length > 0
    ? Math.round(reports.reduce((sum, r) => {
        const s = r.report_data?.summary?.overallScore ?? r.report_data?.summary?.bestMatch ?? 0;
        return sum + s;
      }, 0) / reports.length)
    : 0;

  function switchTab(t) {
    setTab(t);
  }

  /* ── HOME SCREEN ── */
  function HomeScreen() {
    return (
      <div className="sd-screen on">
        <div className="sd-home-header">
          <h1 className="sd-display">{greeting}, {firstName} 👋</h1>
          <p>Here's what's on your assessment schedule</p>
        </div>

        {/* Stats strip */}
        <div className="sd-stats-strip">
          <div className="sd-stat-chip">
            <div className="sd-stat-chip-icon" style={{ background: '#EEEDFE' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="4" width="12" height="10" rx="2" stroke="#6448A8" strokeWidth="1.5"/>
                <path d="M5 2v3M11 2v3M2 8h12" stroke="#6448A8" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <div className="sd-stat-chip-val">{pending.length}</div>
              <div className="sd-stat-chip-lbl">Upcoming</div>
            </div>
          </div>
          <div className="sd-stat-chip">
            <div className="sd-stat-chip-icon" style={{ background: '#E1F5EE' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 8 L6 12 L14 3.5" stroke="#1D9E75" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <div className="sd-stat-chip-val">{completed.length}</div>
              <div className="sd-stat-chip-lbl">Completed</div>
            </div>
          </div>
          <div className="sd-stat-chip">
            <div className="sd-stat-chip-icon" style={{ background: '#FEF4E0' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="5.5" stroke="#D48B10" strokeWidth="1.5"/>
                <path d="M8 5v3.5l2 1.5" stroke="#D48B10" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <div className="sd-stat-chip-val">{inProgress.length}</div>
              <div className="sd-stat-chip-lbl">In Progress</div>
            </div>
          </div>
          <div className="sd-stat-chip">
            <div className="sd-stat-chip-icon" style={{ background: '#EEEDFE' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 2 L9.6 6.2 L14 6.5 L10.8 9.3 L11.8 13.5 L8 11.2 L4.2 13.5 L5.2 9.3 L2 6.5 L6.4 6.2 Z" stroke="#6448A8" strokeWidth="1.4" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <div className="sd-stat-chip-val">{avgScore || '—'}</div>
              <div className="sd-stat-chip-lbl">Avg. Score</div>
            </div>
          </div>
        </div>

        {/* Filter chips */}
        <div className="sd-filter-row">
          {[
            { id: 'all', label: 'All Tests' },
            { id: 'in-progress', label: 'In Progress' },
            { id: 'assigned', label: 'Not Started' },
          ].map(f => (
            <button
              key={f.id}
              className={`sd-filter-chip${filter === f.id ? ' on' : ''}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Test cards */}
        <div className="sd-scroll" style={{ paddingTop: 0 }}>
          {loading ? (
            <div className="sd-loading">
              <div className="sd-spinner" />
              <div style={{ color: 'var(--text-3)', fontSize: '12px' }}>Loading assessments…</div>
            </div>
          ) : filteredPending.length === 0 ? (
            <div className="sd-empty" style={{ paddingTop: 60 }}>
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <rect x="8" y="12" width="32" height="28" rx="5" stroke="#9999AA" strokeWidth="2"/>
                <path d="M16 6v7M32 6v7M8 24h32" stroke="#9999AA" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <p>{filter === 'all' ? 'No upcoming tests — all caught up!' : 'No tests in this category'}</p>
            </div>
          ) : (
            <div className="sd-tests-grid">
              {filteredPending.map((s, i) => {
                const type = s.battery_type || s.type || 'default';
                const bm   = BAT[type] || BAT.default;
                const { answered, total, pct } = getProgress(s);
                const inProg = s.status === 'in_progress';
                const bi = s.battery_info || {};
                const estMin = bi.estimatedMinutes;
                const estLabel = estMin ? `~${estMin} min` : null;
                const secCount = bi.sectionCount;
                const sectionLabel = secCount ? `${secCount} section${secCount !== 1 ? 's' : ''}` : null;
                const subtitleParts = [sectionLabel || bm.subtitle, estLabel].filter(Boolean).join(' · ');

                return (
                  <div
                    key={s.id}
                    className="sd-test-card"
                    style={{ animationDelay: `${i * 0.05}s` }}
                    onClick={() => navigate(`/test/${s.id}`)}
                  >
                    <div className="sd-tc-top">
                      <div className="sd-tc-icon" style={{ background: `${bm.color}18`, fontSize: 18 }}>
                        {bm.icon}
                      </div>
                      <div>
                        <div className="sd-tc-title">{s.battery_name || bm.label}</div>
                        <div className="sd-tc-sub">{subtitleParts || bm.subtitle}</div>
                      </div>
                    </div>
                    <div className="sd-tc-body">
                      {total > 0 && (
                        <div className="sd-tc-row">
                          <span>Questions</span>
                          <strong>{total}</strong>
                        </div>
                      )}
                      {estLabel && (
                        <div className="sd-tc-row">
                          <span>Duration</span>
                          <strong>{estLabel}</strong>
                        </div>
                      )}
                      {sectionLabel && (
                        <div className="sd-tc-row">
                          <span>Sections</span>
                          <strong>{sectionLabel}</strong>
                        </div>
                      )}
                      {inProg && (
                        <div className="sd-tc-row">
                          <span>Progress</span>
                          <strong>{answered}/{total} ({pct}%)</strong>
                        </div>
                      )}
                    </div>
                    {inProg && (
                      <div className="sd-tc-prog">
                        <div className="sd-tc-prog-fill" style={{ width: `${pct}%` }} />
                      </div>
                    )}
                    <div className="sd-tc-footer">
                      <span className={`sd-badge ${inProg ? 'sd-badge-progress' : 'sd-badge-new'}`}>
                        {inProg ? 'In Progress' : 'Ready'}
                      </span>
                      <button
                        className="sd-btn-primary sd-btn-sm"
                        onClick={e => { e.stopPropagation(); navigate(`/test/${s.id}`); }}
                      >
                        {inProg ? 'Resume →' : 'Start →'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ── COMPLETED SCREEN ── */
  function CompletedScreen() {
    /* Build completed data from reports */
    const completedData = reports.map(r => {
      const type = r.report_type || 'default';
      const bm   = BAT[type] || BAT.default;
      const data = r.report_data || {};
      const score = data.summary?.overallScore ?? data.summary?.bestMatch ?? 0;
      const domains = {};
      if (data.domainReports) {
        data.domainReports.forEach(d => {
          const lbl = DOM_LABELS[d.domain] || d.domain;
          const pct = thetaToPct(d.theta ?? 0);
          domains[lbl] = pct;
        });
      }
      const date = new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      return { id: r.id, title: bm.label, icon: bm.icon, date, score, domains, type, reportType: r.report_type };
    });

    return (
      <div className="sd-screen on">
        <div className="sd-completed-header">
          <div>
            <h1 className="sd-display">Completed Tests</h1>
            <p>{completedData.length} assessment{completedData.length !== 1 ? 's' : ''}{avgScore > 0 ? ` · Avg score ${avgScore}%` : ''}</p>
          </div>
        </div>
        <div className="sd-scroll">
          {loading ? (
            <div className="sd-loading">
              <div className="sd-spinner" />
              <div style={{ color: 'var(--text-3)', fontSize: '12px' }}>Loading results…</div>
            </div>
          ) : completedData.length === 0 ? (
            <div className="sd-empty">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <path d="M12 24 L20 32 L36 14" stroke="#9999AA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <p>No completed tests yet. Finish an assessment to see results here.</p>
            </div>
          ) : (
            <div className="sd-results-list">
              {completedData.map((t, i) => {
                const domainKeys = Object.keys(t.domains);
                const hasBars = domainKeys.length > 1;
                const sc = scoreColor(t.score);
                const sb = scoreBg(t.score);

                return (
                  <div
                    key={t.id}
                    className="sd-result-card"
                    style={{ animation: `sd-cardIn .3s ${i * 0.06}s both` }}
                    onClick={() => navigate(`/student/reports/${t.id}`)}
                  >
                    <div className="sd-rc-accent" style={{ background: sc }} />
                    <div className="sd-rc-body">
                      <div className="sd-rc-icon" style={{ background: sb }}>
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                          <path d="M2 9 L7 14 L16 4" stroke={sc} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <div className="sd-rc-info">
                        <div className="sd-rc-title">{t.title}</div>
                        <div className="sd-rc-meta">{t.date}</div>
                      </div>

                      {/* Domain bars or score ring */}
                      {hasBars ? (
                        <div className="sd-domain-bars">
                          {domainKeys.map(k => {
                            const val = t.domains[k];
                            const col = Object.values(DOM_COLORS)[domainKeys.indexOf(k) % Object.values(DOM_COLORS).length];
                            const h = Math.round((val / 100) * 28);
                            return (
                              <div key={k} className="sd-d-bar-wrap">
                                <div className="sd-d-bar" style={{ height: h, background: col }} />
                                <div className="sd-d-bar-lbl">{k.slice(0, 3).toUpperCase()}</div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="sd-score-ring">
                          <svg width="48" height="48" viewBox="0 0 48 48">
                            <circle cx="24" cy="24" r="20" fill="none" stroke="var(--surface-2)" strokeWidth="4"/>
                            <circle cx="24" cy="24" r="20" fill="none" stroke={sc} strokeWidth="4"
                              strokeDasharray={`${(t.score / 100) * 125.7} ${125.7 - (t.score / 100) * 125.7}`}
                              strokeLinecap="round"
                            />
                          </svg>
                          <div className="sd-score-ring-val" style={{ color: sc }}>{t.score}</div>
                        </div>
                      )}

                      <div className="sd-rc-score-block">
                        <div className="sd-rc-score" style={{ color: sc }}>
                          {t.score}<span style={{ fontSize: 12, fontWeight: 600 }}>%</span>
                        </div>
                        <div className="sd-rc-score-lbl">Score</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ── PROFILE SCREEN ── */
  function ProfileScreen() {
    const roleLabel = (user?.role || '').replace(/_/g, ' ');

    /* Build cognitive profile from latest aptitude report */
    const aptReport = reports.find(r => r.report_type === 'aptitude');
    const cogDomains = (aptReport?.report_data?.domainReports || []).map(d => ({
      abbr: (DOM_LABELS[d.domain] || d.domain).slice(0, 3).toUpperCase(),
      name: DOM_LABELS[d.domain] || d.domain,
      score: thetaToPct(d.theta ?? 0),
      color: DOM_COLORS[d.domain] || '#6448A8',
    }));

    const bestScore = reports.reduce((best, r) => {
      const s = r.report_data?.summary?.overallScore ?? r.report_data?.summary?.bestMatch ?? 0;
      return s > best ? s : best;
    }, 0);

    const lastTaken = reports.length > 0
      ? new Date(reports[0].created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : '—';

    /* Badges based on achievements */
    const badges = [];
    if (completed.length >= 1) badges.push({ emoji: '🎯', title: 'First Test' });
    if (bestScore >= 95) badges.push({ emoji: '⭐', title: 'Perfect Score' });
    if (completed.length >= 5) badges.push({ emoji: '🏆', title: '5 Tests Complete' });
    if (reports.length > 0) badges.push({ emoji: '📊', title: 'Results Available' });

    return (
      <div className="sd-screen on">
        <div className="sd-profile-layout">
          {/* Left panel */}
          <div className="sd-profile-left">
            <div className="sd-profile-avatar">{initials}</div>
            <div className="sd-profile-name">{user?.first_name} {user?.last_name}</div>
            <div className="sd-profile-grade" style={{ textTransform: 'capitalize' }}>{roleLabel || 'Student'}</div>

            <div className="sd-profile-stat-grid">
              <div className="sd-profile-stat">
                <div className="sd-profile-stat-val">{completed.length}</div>
                <div className="sd-profile-stat-lbl">Tests Done</div>
              </div>
              <div className="sd-profile-stat">
                <div className="sd-profile-stat-val">{avgScore || '—'}</div>
                <div className="sd-profile-stat-lbl">Avg Score</div>
              </div>
              <div className="sd-profile-stat">
                <div className="sd-profile-stat-val">{pending.length}</div>
                <div className="sd-profile-stat-lbl">Pending</div>
              </div>
              <div className="sd-profile-stat">
                <div className="sd-profile-stat-val">{reports.length}</div>
                <div className="sd-profile-stat-lbl">Reports</div>
              </div>
            </div>

            {badges.length > 0 && (
              <>
                <div className="sd-profile-badges-lbl">Achievements</div>
                <div className="sd-profile-badges">
                  {badges.map((b, i) => (
                    <div key={i} className="sd-p-badge" title={b.title}>{b.emoji}</div>
                  ))}
                </div>
              </>
            )}

            <button className="sd-signout" style={{ marginTop: 'auto' }} onClick={() => { logout(); navigate('/login'); }}>
              Sign Out
            </button>
          </div>

          {/* Right panel */}
          <div className="sd-profile-right">
            <div className="sd-profile-section">
              <div className="sd-profile-section-title">Personal Info</div>
              <div className="sd-info-card">
                <div className="sd-info-row">
                  <label>Full Name</label>
                  <span>{`${user?.first_name || ''} ${user?.last_name || ''}`.trim() || '—'}</span>
                </div>
                <div className="sd-info-row">
                  <label>Email</label>
                  <span>{user?.email || '—'}</span>
                </div>
                <div className="sd-info-row">
                  <label>Role</label>
                  <span style={{ textTransform: 'capitalize' }}>{roleLabel || '—'}</span>
                </div>
              </div>
            </div>

            {cogDomains.length > 0 && (
              <div className="sd-profile-section">
                <div className="sd-profile-section-title">Cognitive Profile</div>
                <div className="sd-cog-grid">
                  {cogDomains.map(d => (
                    <div key={d.abbr} className="sd-cog-tile">
                      <div className="sd-cog-tile-score" style={{ color: d.color }}>{d.score}</div>
                      <div className="sd-cog-tile-bar">
                        <div className="sd-cog-tile-fill" style={{ width: `${d.score}%`, background: d.color }} />
                      </div>
                      <div className="sd-cog-tile-name">{d.abbr}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="sd-profile-section">
              <div className="sd-profile-section-title">Assessment Summary</div>
              <div className="sd-info-card">
                <div className="sd-info-row">
                  <label>Tests Assigned</label>
                  <span>{sessions.length}</span>
                </div>
                <div className="sd-info-row">
                  <label>Tests Completed</label>
                  <span>{completed.length}</span>
                </div>
                <div className="sd-info-row">
                  <label>Best Score</label>
                  <span style={{ color: bestScore >= 85 ? 'var(--success)' : 'var(--text)' }}>
                    {bestScore > 0 ? `${bestScore}%` : '—'}
                  </span>
                </div>
                <div className="sd-info-row">
                  <label>Last Taken</label>
                  <span>{lastTaken}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Render ── */
  return (
    <div className="sd">
      <div className="sd-app">
        {/* Nav bar */}
        <nav className="sd-nav">
          <div className="sd-nav-logo">
            <div className="sd-nav-logo-mark">
              <svg width="16" height="16" viewBox="0 0 84 84">
                <circle cx="30" cy="34" r="10" fill="rgba(255,255,255,0.9)"/>
                <circle cx="54" cy="34" r="10" fill="rgba(255,255,255,0.55)"/>
                <path d="M22 52 Q42 68 62 52" stroke="rgba(255,255,255,0.75)" strokeWidth="3" fill="none" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="sd-nav-logo-text">CogniMap</span>
          </div>
          <div className="sd-nav-tabs">
            {[
              { id: 'home', label: 'My Tests' },
              { id: 'completed', label: 'Completed' },
              { id: 'profile', label: 'Profile' },
            ].map(t => (
              <button
                key={t.id}
                className={`sd-nav-tab${tab === t.id ? ' on' : ''}`}
                onClick={() => switchTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="sd-nav-avatar" onClick={() => switchTab('profile')} title="Profile">
            {initials}
          </div>
        </nav>

        {/* Screens */}
        {tab === 'home' && <HomeScreen />}
        {tab === 'completed' && <CompletedScreen />}
        {tab === 'profile' && <ProfileScreen />}
      </div>
    </div>
  );
}
