/**
 * GuardianDashboard.jsx — CogniMap Guardian/Teacher Portal
 * Shows assigned students and their report access
 */
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const DOM_LABELS = {
  gf: 'Pattern', gv: 'Visual', gq: 'Quant',
  gc: 'Verbal', gs: 'Speed', gwm: 'Memory',
};
const DOM_COLORS = {
  gf: '#6448A8', gv: '#1D9E75', gq: '#D48B10',
  gc: '#1D74D8', gs: '#D85A30', gwm: '#9E1DAE',
};

function thetaToPct(theta) {
  return Math.max(5, Math.min(95, Math.round(((theta + 3) / 6) * 100)));
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

.gd *,.gd *::before,.gd *::after{box-sizing:border-box;margin:0;padding:0}
.gd{
  font-family:'Plus Jakarta Sans',-apple-system,sans-serif;
  min-height:100vh;background:#E8E4F5;
  display:flex;flex-direction:column;-webkit-font-smoothing:antialiased;
}
.gd-app{width:100%;min-height:100vh;background:#fff;display:flex;flex-direction:column}
.gd-nav{
  height:52px;background:#fff;border-bottom:1px solid rgba(100,72,168,0.11);
  display:flex;align-items:center;padding:0 24px;flex-shrink:0;
}
.gd-nav-logo{display:flex;align-items:center;gap:9px;margin-right:auto}
.gd-nav-logo-mark{
  width:28px;height:28px;border-radius:8px;
  background:linear-gradient(140deg,#3C3489,#6448A8);
  display:flex;align-items:center;justify-content:center;
}
.gd-nav-logo-text{font-size:13px;font-weight:800;color:#1A1A2E;letter-spacing:-0.3px}
.gd-nav-tabs{display:flex;gap:2px}
.gd-nav-tab{
  padding:7px 14px;font-size:12px;font-weight:600;color:#9999AA;
  border:none;background:transparent;font-family:inherit;cursor:pointer;border-radius:8px;
  transition:color .15s,background .15s;
}
.gd-nav-tab:hover{color:#555570;background:#F3F0FB}
.gd-nav-tab.on{color:#6448A8;background:#EEEDFE}
.gd-nav-avatar{
  width:30px;height:30px;border-radius:50%;
  background:linear-gradient(140deg,#6448A8,#9278C0);
  display:flex;align-items:center;justify-content:center;
  font-size:11px;font-weight:800;color:#fff;margin-left:16px;cursor:pointer;
}
.gd-body{flex:1;overflow-y:auto;padding:24px 28px}
.gd-display{font-family:'DM Serif Display',Georgia,serif;font-weight:400}

/* Student cards */
.gd-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;margin-top:16px}
.gd-scard{
  background:#fff;border:1.5px solid rgba(100,72,168,0.11);border-radius:16px;
  padding:18px;cursor:pointer;transition:all .18s;
}
.gd-scard:hover{border-color:#9278C0;transform:translateY(-2px);box-shadow:0 8px 24px rgba(100,72,168,0.12)}
.gd-scard-top{display:flex;align-items:center;gap:12px;margin-bottom:14px}
.gd-scard-avatar{
  width:42px;height:42px;border-radius:50%;
  background:linear-gradient(140deg,#6448A8,#9278C0);
  color:#fff;display:flex;align-items:center;justify-content:center;
  font-size:14px;font-weight:800;flex-shrink:0;
}
.gd-scard-name{font-size:14px;font-weight:700;color:#1A1A2E}
.gd-scard-meta{font-size:11px;color:#9999AA;margin-top:2px}
.gd-scard-stats{display:flex;gap:8px}
.gd-scard-stat{
  flex:1;background:#F3F0FB;border-radius:10px;padding:10px 8px;text-align:center;
}
.gd-scard-stat-val{font-size:18px;font-weight:800;color:#6448A8}
.gd-scard-stat-lbl{font-size:9px;font-weight:700;color:#9999AA;text-transform:uppercase;letter-spacing:0.5px;margin-top:2px}
.gd-scard-rel{
  display:inline-block;font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;
  background:#EEEDFE;color:#6448A8;text-transform:capitalize;margin-top:10px;
}

/* Report cards */
.gd-rcard{
  background:#fff;border:1.5px solid rgba(100,72,168,0.11);border-radius:14px;
  display:flex;overflow:hidden;margin-bottom:10px;cursor:pointer;transition:box-shadow .15s;
}
.gd-rcard:hover{box-shadow:0 4px 16px rgba(100,72,168,0.09)}
.gd-rc-accent{width:5px;flex-shrink:0}
.gd-rc-body{flex:1;padding:14px 16px;display:flex;align-items:center;gap:14px}
.gd-rc-icon{
  width:38px;height:38px;border-radius:10px;
  display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;
}
.gd-rc-title{font-size:13px;font-weight:700;color:#1A1A2E;margin-bottom:3px}
.gd-rc-meta{font-size:11px;color:#9999AA;font-weight:500}
.gd-rc-score{font-size:22px;font-weight:800;line-height:1;min-width:46px;text-align:right}
.gd-rc-score-lbl{font-size:10px;color:#9999AA;font-weight:600;margin-top:2px;text-align:right}
.gd-domain-bars{display:flex;gap:4px;align-items:flex-end;height:28px}
.gd-d-bar{width:14px;border-radius:3px}
.gd-d-bar-lbl{font-size:7px;font-weight:700;color:#9999AA;text-align:center}

/* Back button */
.gd-back{
  display:inline-flex;align-items:center;gap:6px;
  font-size:12px;font-weight:600;color:#6448A8;cursor:pointer;
  border:none;background:none;font-family:inherit;margin-bottom:16px;
}
.gd-back:hover{text-decoration:underline}

.gd-empty{text-align:center;padding:48px 20px;color:#9999AA}
.gd-empty-icon{font-size:48px;margin-bottom:12px}
.gd-empty-title{font-size:16px;font-weight:800;color:#1A1A2E;margin-bottom:4px}
.gd-loading{text-align:center;padding:48px 0}
.gd-spinner{
  display:inline-block;width:22px;height:22px;border-radius:50%;
  border:2.5px solid rgba(100,72,168,0.11);border-top-color:#6448A8;
  animation:gd-spin .6s linear infinite;margin-bottom:8px;
}
@keyframes gd-spin{to{transform:rotate(360deg)}}
.gd-signout{
  padding:7px 14px;border-radius:8px;border:1.5px solid rgba(100,72,168,0.18);
  background:#fff;color:#6448A8;font-family:inherit;font-size:12px;font-weight:700;
  cursor:pointer;transition:all .15s;
}
.gd-signout:hover{background:#6448A8;color:#fff;border-color:#6448A8}

@media(max-width:620px){
  .gd-grid{grid-template-columns:1fr}
  .gd-nav-tabs{display:none}
}
`;

const BAT_META = {
  aptitude:    { label: 'Cognitive Aptitude', icon: '🧩', color: '#6448A8' },
  personality: { label: 'Personality Profile', icon: '💜', color: '#9278C0' },
  interest:    { label: 'Interest Profile', icon: '🧭', color: '#854F0B' },
  default:     { label: 'Assessment', icon: '📋', color: '#6448A8' },
};

export default function GuardianDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState('students'); // students | reports
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingReports, setLoadingReports] = useState(false);

  useEffect(() => {
    if (!document.getElementById('gd-css')) {
      const el = document.createElement('style');
      el.id = 'gd-css'; el.textContent = CSS;
      document.head.appendChild(el);
    }
  }, []);

  useEffect(() => {
    api.get('/guardians/my-students')
      .then(d => setStudents(d.students || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const initials = `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`.toUpperCase();
  const roleLabel = user?.role === 'teacher' ? 'Teacher' : 'Guardian';

  const viewStudentReports = async (student) => {
    setSelectedStudent(student);
    setView('reports');
    setLoadingReports(true);
    try {
      const d = await api.get(`/guardians/my-students/${student.id}/reports`);
      setReports(d.reports || []);
    } catch (e) {
      setReports([]);
    }
    setLoadingReports(false);
  };

  const backToStudents = () => {
    setView('students');
    setSelectedStudent(null);
    setReports([]);
  };

  function scoreColor(s) {
    if (s >= 85) return '#1D9E75';
    if (s >= 70) return '#6448A8';
    return '#D85A30';
  }

  return (
    <div className="gd">
      <div className="gd-app">
        {/* Nav */}
        <nav className="gd-nav">
          <div className="gd-nav-logo">
            <div className="gd-nav-logo-mark">
              <svg width="16" height="16" viewBox="0 0 84 84">
                <circle cx="30" cy="34" r="10" fill="rgba(255,255,255,0.9)"/>
                <circle cx="54" cy="34" r="10" fill="rgba(255,255,255,0.55)"/>
                <path d="M22 52 Q42 68 62 52" stroke="rgba(255,255,255,0.75)" strokeWidth="3" fill="none" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="gd-nav-logo-text">CogniMap</span>
          </div>
          <div className="gd-nav-tabs">
            <button className={`gd-nav-tab${view === 'students' ? ' on' : ''}`} onClick={backToStudents}>My Students</button>
            {selectedStudent && (
              <button className={`gd-nav-tab${view === 'reports' ? ' on' : ''}`} onClick={() => {}}>
                {selectedStudent.first_name}'s Reports
              </button>
            )}
          </div>
          <button className="gd-signout" onClick={() => { logout(); navigate('/login'); }}>Sign out</button>
          <div className="gd-nav-avatar">{initials}</div>
        </nav>

        {/* Body */}
        <div className="gd-body">
          {/* ══ STUDENTS VIEW ══ */}
          {view === 'students' && (
            <>
              <div>
                <h1 className="gd-display" style={{ fontSize: 26, color: '#1A1A2E', marginBottom: 3 }}>
                  Welcome, {user?.first_name} 👋
                </h1>
                <p style={{ fontSize: 13, color: '#555570' }}>
                  {roleLabel} Dashboard · {students.length} student{students.length !== 1 ? 's' : ''} assigned to you
                </p>
              </div>

              {loading ? (
                <div className="gd-loading"><div className="gd-spinner" /><div style={{ color: '#9999AA', fontSize: 12 }}>Loading students...</div></div>
              ) : students.length === 0 ? (
                <div className="gd-empty">
                  <div className="gd-empty-icon">👨‍👩‍👧‍👦</div>
                  <div className="gd-empty-title">No Students Assigned</div>
                  <div style={{ fontSize: 13 }}>Contact your administrator to get students assigned to your account.</div>
                </div>
              ) : (
                <div className="gd-grid">
                  {students.map(s => {
                    const si = `${s.first_name?.[0] || ''}${s.last_name?.[0] || ''}`.toUpperCase();
                    return (
                      <div key={s.id} className="gd-scard" onClick={() => viewStudentReports(s)}>
                        <div className="gd-scard-top">
                          <div className="gd-scard-avatar">{si}</div>
                          <div>
                            <div className="gd-scard-name">{s.first_name} {s.last_name}</div>
                            <div className="gd-scard-meta">
                              {s.grade && `Grade ${s.grade}`}{s.section && `, Section ${s.section}`}
                              {s.gender && ` · ${s.gender}`}
                            </div>
                          </div>
                        </div>
                        <div className="gd-scard-stats">
                          <div className="gd-scard-stat">
                            <div className="gd-scard-stat-val">{s.report_count || 0}</div>
                            <div className="gd-scard-stat-lbl">Reports</div>
                          </div>
                          <div className="gd-scard-stat">
                            <div className="gd-scard-stat-val">{s.tests_completed || 0}</div>
                            <div className="gd-scard-stat-lbl">Completed</div>
                          </div>
                          <div className="gd-scard-stat">
                            <div className="gd-scard-stat-val">{s.tests_total || 0}</div>
                            <div className="gd-scard-stat-lbl">Total Tests</div>
                          </div>
                        </div>
                        <div className="gd-scard-rel">{s.relationship}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ══ REPORTS VIEW ══ */}
          {view === 'reports' && selectedStudent && (
            <>
              <button className="gd-back" onClick={backToStudents}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                Back to Students
              </button>
              <div style={{ marginBottom: 16 }}>
                <h1 className="gd-display" style={{ fontSize: 22, color: '#1A1A2E', marginBottom: 3 }}>
                  {selectedStudent.first_name} {selectedStudent.last_name}'s Reports
                </h1>
                <p style={{ fontSize: 13, color: '#555570' }}>
                  {selectedStudent.grade && `Grade ${selectedStudent.grade}`}{selectedStudent.section && `, Section ${selectedStudent.section}`}
                  {' · '}{reports.length} report{reports.length !== 1 ? 's' : ''} available
                </p>
              </div>

              {loadingReports ? (
                <div className="gd-loading"><div className="gd-spinner" /><div style={{ color: '#9999AA', fontSize: 12 }}>Loading reports...</div></div>
              ) : reports.length === 0 ? (
                <div className="gd-empty">
                  <div className="gd-empty-icon">📊</div>
                  <div className="gd-empty-title">No Reports Available</div>
                  <div style={{ fontSize: 13 }}>Reports will appear here once the student completes assessments.</div>
                </div>
              ) : (
                <div>
                  {reports.map(r => {
                    const type = r.report_type || 'default';
                    const bm = BAT_META[type] || BAT_META.default;
                    const data = r.report_data || {};
                    const score = data.summary?.overallScore ?? data.summary?.bestMatch ?? 0;
                    const sc = scoreColor(score);
                    const date = new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                    const domainReports = data.domainReports || [];

                    return (
                      <div key={r.id} className="gd-rcard" onClick={() => navigate(`/guardian/reports/${r.id}`)}>
                        <div className="gd-rc-accent" style={{ background: sc }} />
                        <div className="gd-rc-body">
                          <div className="gd-rc-icon" style={{ background: `${bm.color}18` }}>
                            {bm.icon}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div className="gd-rc-title">{bm.label}</div>
                            <div className="gd-rc-meta">{date}</div>
                          </div>
                          {domainReports.length > 1 && (
                            <div className="gd-domain-bars">
                              {domainReports.map(d => {
                                const pct = thetaToPct(d.theta ?? 0);
                                const col = DOM_COLORS[d.domain] || '#6448A8';
                                return (
                                  <div key={d.domain} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                                    <div className="gd-d-bar" style={{ height: Math.round(pct * 0.28), background: col }} />
                                    <div className="gd-d-bar-lbl">{(DOM_LABELS[d.domain] || d.domain).slice(0, 3)}</div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          <div>
                            <div className="gd-rc-score" style={{ color: sc }}>
                              {score > 0 ? score : '—'}<span style={{ fontSize: 12, fontWeight: 600 }}>{score > 0 ? '%' : ''}</span>
                            </div>
                            <div className="gd-rc-score-lbl">Score</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
