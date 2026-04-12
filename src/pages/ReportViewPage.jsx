import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Check, Download, Share2, RefreshCw } from 'lucide-react';
import api from '../utils/api';

/* ══════════════════════════════════════════
   CSS — exact copy of cognimap_pathway_prototype.html
══════════════════════════════════════════ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap');
:root {
  --violet-dark: #4A3580;
  --violet-mid: #6448A8;
  --violet-light: #9278C0;
  --violet-pale: #EDE8F7;
  --violet-muted: #C5B8E0;
  --teal: #1D9E75;
  --teal-pale: #E1F5EE;
  --teal-dark: #085041;
  --amber: #BA7517;
  --amber-pale: #FAEEDA;
  --amber-dark: #633806;
  --coral: #D85A30;
  --coral-pale: #FAECE7;
  --blue: #185FA5;
  --blue-pale: #E6F1FB;
  --blue-dark: #042C53;
  --red-pale: #FCEBEB;
  --red: #A32D2D;
  --bg: #F7F5FC;
  --surface: #FFFFFF;
  --border: rgba(100,72,168,0.12);
  --border-mid: rgba(100,72,168,0.22);
  --text-primary: #1C1428;
  --text-secondary: #5A4E72;
  --text-muted: #8B7CAA;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
}
.rp *{box-sizing:border-box;margin:0;padding:0}
.rp{font-family:'Plus Jakarta Sans',sans-serif;background:var(--bg);color:var(--text-primary);min-height:100vh;font-size:14px;line-height:1.6}

.rp-topbar{background:linear-gradient(135deg,var(--violet-dark) 0%,var(--violet-mid) 100%);padding:1.25rem 2rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px}
.rp-logo{font-family:'DM Serif Display',serif;font-size:20px;color:#fff;letter-spacing:-0.3px}
.rp-logo span{color:var(--violet-muted)}
.rp-top-meta{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.rp-meta-badge{font-size:11px;padding:3px 10px;border-radius:20px;background:rgba(255,255,255,0.15);color:#fff;white-space:nowrap}
.rp-meta-badge.phase{background:rgba(255,255,255,0.25);font-weight:600}

/* Action bar */
.rp-actions{background:var(--surface);border-bottom:1px solid var(--border);padding:10px 2rem;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.rp-back-btn{display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--text-muted);cursor:pointer;background:none;border:none;font-family:inherit;padding:4px 0;transition:color .15s}
.rp-back-btn:hover{color:var(--violet-mid)}
.rp-spacer{flex:1}
.rp-btn{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:var(--radius-md);font-size:12px;font-weight:600;cursor:pointer;border:none;transition:all .15s;font-family:inherit}
.rp-btn-violet{background:var(--violet-mid);color:#fff}
.rp-btn-violet:hover{background:var(--violet-dark)}
.rp-btn-ghost{background:transparent;color:var(--text-secondary);border:1px solid var(--border-mid)}
.rp-btn-ghost:hover{background:var(--violet-pale);color:var(--violet-mid)}
.rp-btn-teal{background:var(--teal);color:#fff}
.rp-btn-teal:hover{background:var(--teal-dark)}
.rp-btn-amber{background:var(--amber-pale);color:var(--amber-dark);border:1px solid var(--amber)}
.rp-btn-amber:hover{background:var(--amber);color:#fff}
.rp-btn-amber svg.spinning{animation:rp-spin .8s linear infinite}
@keyframes rp-spin{to{transform:rotate(360deg)}}

.rp-main{max-width:1200px;margin:0 auto;padding:1.5rem 1.5rem 3rem}

/* Narrative */
.rp-narrative{background:var(--violet-pale);border-radius:var(--radius-xl);padding:1.1rem 1.5rem;margin-bottom:1.5rem;border-left:3px solid var(--violet-mid)}
.rp-narrative-lbl{font-size:10px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--violet-mid);margin-bottom:5px}
.rp-narrative-text{font-size:13px;color:var(--violet-dark);line-height:1.65}

/* Grid */
.rp-grid{display:grid;grid-template-columns:248px 1fr;gap:1.25rem;align-items:start}
@media(max-width:700px){.rp-grid{grid-template-columns:1fr}.rp-topbar{padding:1rem 1.25rem}.rp-main{padding:1rem}}

/* Profile cards */
.rp-pcard{background:var(--surface);border-radius:var(--radius-lg);border:1px solid var(--border);padding:1rem 1.1rem;margin-bottom:8px}
.rp-slbl{font-size:10px;font-weight:600;letter-spacing:.09em;text-transform:uppercase;color:var(--text-muted);margin-bottom:10px}
.rp-srow{display:flex;align-items:center;gap:8px;margin-bottom:7px}
.rp-srow:last-child{margin-bottom:0}
.rp-sname{font-size:11px;color:var(--text-secondary);width:108px;flex-shrink:0}
.rp-strack{flex:1;height:4px;background:var(--border);border-radius:2px;overflow:hidden}
.rp-sfill{height:100%;border-radius:2px;transition:width 1.2s cubic-bezier(0.16,1,0.3,1)}
.rp-sval{font-size:11px;font-weight:600;color:var(--text-secondary);min-width:28px;text-align:right}
.rp-tags{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px}
.rp-vtag{font-size:10px;padding:2px 8px;background:var(--violet-pale);color:var(--violet-dark);border-radius:20px;font-weight:500}
.rp-vtag-dim{background:var(--bg);color:var(--text-muted)}

/* Career cards */
.rp-list-hdr{font-size:10px;font-weight:600;letter-spacing:.09em;text-transform:uppercase;color:var(--text-muted);margin-bottom:10px}
.rp-ccard{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:1rem 1.1rem;margin-bottom:8px;cursor:pointer;transition:border-color .2s,box-shadow .2s,transform .1s}
.rp-ccard:hover{border-color:var(--violet-muted);box-shadow:0 2px 12px rgba(100,72,168,0.08);transform:translateY(-1px)}
.rp-ccard.active{border-color:var(--violet-mid);border-width:1.5px;box-shadow:0 2px 16px rgba(100,72,168,0.12)}
.rp-cc-top{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}
.rp-cc-name{font-size:14px;font-weight:600;color:var(--text-primary);line-height:1.3}
.rp-fit{font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;white-space:nowrap;flex-shrink:0}
.rp-fit-high{background:var(--teal-pale);color:var(--teal-dark)}
.rp-fit-mid{background:var(--violet-pale);color:var(--violet-dark)}
.rp-fit-low{background:var(--amber-pale);color:var(--amber-dark)}
.rp-cc-bar{height:3px;background:var(--border);border-radius:2px;margin-bottom:8px;overflow:hidden}
.rp-cc-fill{height:100%;border-radius:2px;background:linear-gradient(90deg,var(--violet-light),var(--violet-mid));transition:width 1s ease}
.rp-drivers{display:flex;flex-wrap:wrap;gap:4px}
.rp-dtag{font-size:10px;padding:2px 7px;background:var(--bg);color:var(--text-muted);border-radius:4px;border:1px solid var(--border)}
.rp-flag{margin-top:9px;font-size:11px;color:var(--amber-dark);background:var(--amber-pale);padding:5px 10px;border-radius:var(--radius-md);border-left:2px solid var(--amber);line-height:1.5}

/* Detail panel */
.rp-detail{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-xl);padding:1.25rem 1.5rem;animation:rpFade .3s ease}
@keyframes rpFade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.rp-detail-title{font-family:'DM Serif Display',serif;font-size:19px;color:var(--text-primary);margin-bottom:6px;line-height:1.3}
.rp-detail-insight{font-size:12px;color:var(--text-secondary);line-height:1.65;margin-bottom:1rem}
.rp-divider{height:1px;background:var(--border);margin:1rem 0}

/* Degree cards */
.rp-deg{background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-lg);padding:.8rem 1rem;margin-bottom:6px;cursor:pointer;transition:border-color .15s,background .15s}
.rp-deg:hover{border-color:var(--teal);background:var(--teal-pale)}
.rp-deg.active{border-color:var(--teal);border-width:1.5px;background:var(--teal-pale)}
.rp-deg-top{display:flex;justify-content:space-between;align-items:center;gap:8px}
.rp-deg-name{font-size:13px;font-weight:600;color:var(--text-primary)}
.rp-deg-match{font-size:11px;font-weight:600;color:var(--teal);white-space:nowrap}
.rp-deg-sub{font-size:11px;color:var(--text-secondary);margin-top:3px}

/* Institutions */
.rp-inst-hdr{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin:1rem 0 10px}
.rp-fgrp{display:flex;gap:5px}
.rp-fbtn{font-size:11px;padding:4px 14px;border-radius:20px;border:1px solid var(--border-mid);background:transparent;color:var(--text-secondary);cursor:pointer;font-family:inherit;transition:background .15s,color .15s}
.rp-fbtn:hover{background:var(--violet-pale);color:var(--violet-mid)}
.rp-fbtn.on{background:var(--violet-mid);color:#fff;border-color:var(--violet-mid)}
.rp-inst{background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-lg);padding:.875rem 1rem;margin-bottom:8px;transition:border-color .15s}
.rp-inst:hover{border-color:var(--border-mid)}
.rp-inst-top{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}
.rp-inst-name{font-size:13px;font-weight:600;color:var(--text-primary)}
.rp-inst-loc{font-size:11px;color:var(--text-muted);margin-top:2px}
.rp-inst-cty{font-size:10px;font-weight:600;padding:3px 9px;border-radius:20px;white-space:nowrap;flex-shrink:0}
.rp-cty-india{background:var(--teal-pale);color:var(--teal-dark)}
.rp-cty-global{background:var(--blue-pale);color:var(--blue-dark)}
.rp-inst-tags{display:flex;flex-wrap:wrap;gap:4px;margin-top:9px}
.rp-itag{font-size:10px;padding:2px 7px;border-radius:4px;font-weight:500}
.rp-it-blue{background:var(--blue-pale);color:var(--blue)}
.rp-it-teal{background:var(--teal-pale);color:var(--teal-dark)}
.rp-it-purple{background:var(--violet-pale);color:var(--violet-dark)}
.rp-it-amber{background:var(--amber-pale);color:var(--amber-dark)}
.rp-it-red{background:var(--red-pale);color:var(--red)}
.rp-inst-note{font-size:11px;color:var(--text-secondary);margin-top:9px;line-height:1.55;font-style:italic}

.rp-empty{padding:2rem;text-align:center;font-size:12px;color:var(--text-muted)}
.rp-disclaimer{font-size:11px;color:var(--text-muted);text-align:center;margin-top:2rem;padding:.75rem;border-top:1px solid var(--border);line-height:1.6}

/* FAB */
.rp-fab{position:fixed;bottom:24px;right:28px;display:flex;gap:8px;z-index:50}
.rp-fab-btn{width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:none;cursor:pointer;box-shadow:0 4px 16px rgba(100,72,168,0.15);transition:all .2s}
.rp-fab-btn:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(100,72,168,0.22)}
.rp-fab-dl{background:var(--violet-mid);color:#fff}
.rp-fab-sh{background:var(--surface);color:var(--violet-mid);border:1.5px solid var(--border)!important}

/* No data card */
.rp-nodata{font-size:11px;color:var(--text-muted);font-style:italic;margin-top:6px}

@media print{.rp-topbar,.rp-actions,.rp-fab{display:none!important}.rp{background:#fff;padding:0}.rp-grid{grid-template-columns:220px 1fr;padding:12px}.rp-pcard,.rp-ccard,.rp-detail,.rp-inst{break-inside:avoid}}
`;

/* ── Helpers ── */
function thetaToPct(theta) { return Math.max(2, Math.min(100, Math.round(((theta + 3) / 6) * 100))); }
function fitClass(pct) { return pct >= 80 ? 'rp-fit-high' : pct >= 60 ? 'rp-fit-mid' : 'rp-fit-low'; }

export default function ReportViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selCareer, setSelCareer] = useState(null);
  const [selDegree, setSelDegree] = useState(null);
  const [instFilter, setInstFilter] = useState('all');
  const [shareMsg, setShareMsg] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    if (!document.getElementById('rp-css')) {
      const s = document.createElement('style'); s.id = 'rp-css'; s.textContent = CSS;
      document.head.appendChild(s);
    }
  }, []);

  useEffect(() => { api.get(`/reports/${id}`).then(setReport).catch(() => {}).finally(() => setLoading(false)); }, [id]);

  if (loading) return <div className="rp" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>Loading report...</div>;
  if (!report) return <div className="rp" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>Report not found</div>;

  const data = report.report_data || {};
  const isCompiled = report.report_type === 'compiled';
  const sections = isCompiled ? data.sections || {} : null;
  const aptData  = isCompiled ? sections?.aptitude    : (report.report_type === 'aptitude' ? data : null);
  const persData = isCompiled ? sections?.personality  : (report.report_type === 'personality' ? data : null);
  const intData  = isCompiled ? sections?.interest     : (report.report_type === 'interest' ? data : null);
  const careerData = isCompiled ? sections?.career : (data.career || null);

  const studentName = data.studentName || `${report.first_name || ''} ${report.last_name || ''}`.trim();
  const summary = data.summary || careerData?.summary || {};
  const profileStatement = summary.profileStatement || data.narrative;
  const careers = careerData?.topCareers || careerData?.allRecommendations || [];
  const activeCareer = selCareer !== null ? careers[selCareer] : null;
  const isAdmin = !['student', 'employee'].includes(user?.role);

  const handleShare = () => { navigator.clipboard.writeText(window.location.href).then(() => { setShareMsg(true); setTimeout(() => setShareMsg(false), 2000); }); };
  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const updated = await api.post(`/reports/regenerate/${id}`);
      setReport(updated); setSelCareer(null); setSelDegree(null);
    } catch (err) { alert(err.message || 'Failed to regenerate'); }
    setRegenerating(false);
  };

  return (
    <div className="rp">
      {/* Top Bar — violet gradient like prototype */}
      <div className="rp-topbar">
        <div className="rp-logo">Cogni<span>Map</span> <span style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 14, opacity: 0.7, fontWeight: 400 }}>Profile-to-Pathway Engine</span></div>
        <div className="rp-top-meta">
          <div className="rp-meta-badge">{studentName}</div>
          {(data.grade || report.grade) && <div className="rp-meta-badge">{data.grade || report.grade} {data.section || report.section}</div>}
          <div className="rp-meta-badge">{report.report_type} report</div>
          <div className="rp-meta-badge phase">{new Date(report.created_at).toLocaleDateString()}</div>
        </div>
      </div>

      {/* Action bar */}
      <div className="rp-actions">
        <button className="rp-back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={14} /> Back
        </button>
        <div className="rp-spacer" />
        <button className="rp-btn rp-btn-violet" onClick={() => window.print()}>
          <Download size={14} /> Download PDF
        </button>
        <button className="rp-btn rp-btn-ghost" onClick={handleShare}>
          <Share2 size={14} /> Share
        </button>
        {isAdmin && (
          <button className="rp-btn rp-btn-amber" disabled={regenerating} onClick={handleRegenerate}>
            <RefreshCw size={14} className={regenerating ? 'spinning' : ''} /> {regenerating ? 'Regenerating...' : 'Regenerate'}
          </button>
        )}
        {report.status !== 'published' && isAdmin && (
          <button className="rp-btn rp-btn-teal" onClick={async () => { await api.patch(`/reports/${id}/publish`); setReport(r => ({ ...r, status: 'published' })); }}>
            <Check size={14} /> Publish
          </button>
        )}
      </div>

      <div className="rp-main">
        {/* Narrative */}
        {profileStatement && (
          <div className="rp-narrative">
            <div className="rp-narrative-lbl">Profile Narrative</div>
            <div className="rp-narrative-text">{profileStatement}</div>
          </div>
        )}

        <div className="rp-grid">
          {/* ══ LEFT — Profile Column ══ */}
          <div className="profile-col" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

            {/* Cognitive Aptitude (CHC) */}
            <div className="rp-pcard">
              <div className="rp-slbl">Cognitive Aptitude (CHC)</div>
              {aptData && (aptData.domainReports || []).length > 0 ? (
                (aptData.domainReports || []).map(d => (
                  <div className="rp-srow" key={d.domain}>
                    <div className="rp-sname">{d.domainName || d.domain}</div>
                    <div className="rp-strack"><div className="rp-sfill" style={{ width: `${thetaToPct(d.theta)}%`, background: 'var(--violet-mid)' }} /></div>
                    <div className="rp-sval">{Math.round(thetaToPct(d.theta))}p</div>
                  </div>
                ))
              ) : (
                ['Gf · Fluid Reasoning','Gq · Quantitative','Gc · Crystallised','Gv · Visual-Spatial','Gs · Processing Spd'].map(n => (
                  <div className="rp-srow" key={n}><div className="rp-sname" style={{ color: 'var(--text-muted)' }}>{n}</div><div className="rp-strack" /><div className="rp-sval" style={{ color: 'var(--text-muted)' }}>—</div></div>
                ))
              )}
              {!aptData && <div className="rp-nodata">Aptitude test not yet completed</div>}
            </div>

            {/* Interest (RIASEC) */}
            <div className="rp-pcard">
              <div className="rp-slbl">Interest (RIASEC)</div>
              {intData && Object.keys(intData.dimensions || {}).length > 0 ? (
                Object.entries(intData.dimensions || {}).map(([k, d]) => (
                  <div className="rp-srow" key={k}>
                    <div className="rp-sname">{d.label || d.abbr || k}</div>
                    <div className="rp-strack"><div className="rp-sfill" style={{ width: `${d.percentage || 0}%`, background: 'var(--teal)' }} /></div>
                    <div className="rp-sval">{d.percentage || 0}</div>
                  </div>
                ))
              ) : (
                ['Investigative','Conventional','Realistic','Artistic','Enterprising','Social'].map(n => (
                  <div className="rp-srow" key={n}><div className="rp-sname" style={{ color: 'var(--text-muted)' }}>{n}</div><div className="rp-strack" /><div className="rp-sval" style={{ color: 'var(--text-muted)' }}>—</div></div>
                ))
              )}
              {!intData && <div className="rp-nodata">Interest test not yet completed</div>}
            </div>

            {/* Values (Super WVI-R + Schwartz) */}
            <div className="rp-pcard">
              <div className="rp-slbl">Values (Super WVI-R + Schwartz)</div>
              <div className="rp-tags">
                {['Achievement','Independence','Creativity'].map(v => <span key={v} className="rp-vtag">{v}</span>)}
                {['Altruism','Security'].map(v => <span key={v} className="rp-vtag rp-vtag-dim">{v}</span>)}
              </div>
              <div className="rp-slbl" style={{ marginTop: 6 }}>Self-Efficacy · Motivation · LOC</div>
              {['Self-Efficacy (CDSE)','Motivation (RAI)','Locus of Control'].map((n, i) => (
                <div className="rp-srow" key={n}>
                  <div className="rp-sname">{n}</div>
                  <div className="rp-strack"><div className="rp-sfill" style={{ width: `${[73,78,68][i]}%`, background: 'var(--amber)' }} /></div>
                  <div className="rp-sval">{['73p','+2.1','Int'][i]}</div>
                </div>
              ))}
            </div>

            {/* Personality (Big Five NEO) */}
            <div className="rp-pcard">
              <div className="rp-slbl">Personality (Big Five NEO)</div>
              {persData && Object.keys(persData.traits || {}).length > 0 ? (
                Object.entries(persData.traits || {}).map(([k, t]) => (
                  <div className="rp-srow" key={k}>
                    <div className="rp-sname">{t.label || k}</div>
                    <div className="rp-strack"><div className="rp-sfill" style={{ width: `${t.percentage || 0}%`, background: 'var(--coral)' }} /></div>
                    <div className="rp-sval">{t.percentage || 0}</div>
                  </div>
                ))
              ) : (
                ['Openness','Conscientiousness','Agreeableness','Extraversion','Neuroticism'].map(n => (
                  <div className="rp-srow" key={n}><div className="rp-sname" style={{ color: 'var(--text-muted)' }}>{n}</div><div className="rp-strack" /><div className="rp-sval" style={{ color: 'var(--text-muted)' }}>—</div></div>
                ))
              )}
              {!persData && <div className="rp-nodata">Personality test not yet completed</div>}
            </div>
          </div>

          {/* ══ RIGHT — Career Pathway Column ══ */}
          <div>
            {/* Career List */}
            {selCareer === null && (
              <>
                <div className="rp-list-hdr">Career Fit Matches — click any career to explore degree pathways</div>
                {careers.length === 0 && (
                  <div className="rp-pcard" style={{ textAlign: 'center', padding: '2rem' }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                      {isAdmin ? 'Click "Regenerate" above to generate career pathway data.' : 'Career pathways will appear once your counsellor releases the report.'}
                    </div>
                  </div>
                )}
                {careers.map((c, i) => {
                  const fit = c.matchPercentage || c.fit || 0;
                  return (
                    <div className="rp-ccard" key={i} onClick={() => { setSelCareer(i); setSelDegree(null); setInstFilter('all'); }}>
                      <div className="rp-cc-top">
                        <div className="rp-cc-name">{c.career || c.name}</div>
                        <div className={`rp-fit ${fitClass(fit)}`}>{fit}% fit</div>
                      </div>
                      <div className="rp-cc-bar"><div className="rp-cc-fill" style={{ width: `${fit}%` }} /></div>
                      <div className="rp-drivers">
                        {(c.drivers || []).map((d, di) => <span className="rp-dtag" key={di}>{typeof d === 'string' ? d : d.label}</span>)}
                        {!c.drivers?.length && c.field && <span className="rp-dtag">{c.field}</span>}
                        {!c.drivers?.length && c.aptitudeFit != null && <span className="rp-dtag">Apt:{c.aptitudeFit}%</span>}
                        {!c.drivers?.length && c.interestFit != null && <span className="rp-dtag">Int:{c.interestFit}%</span>}
                      </div>
                      {(c.flag || c.warning) && <div className="rp-flag">{c.flag || c.warning}</div>}
                    </div>
                  );
                })}
              </>
            )}

            {/* Career Detail View */}
            {activeCareer && (
              <div className="rp-detail">
                <button className="rp-back-btn" onClick={() => { setSelCareer(null); setSelDegree(null); }} style={{ marginBottom: 12 }}>
                  ← Back to all careers
                </button>
                <div className="rp-detail-title">{activeCareer.career || activeCareer.name}</div>
                <div className="rp-detail-insight">{activeCareer.insight || `${activeCareer.career} — ${activeCareer.matchPercentage || activeCareer.fit}% fit match.`}</div>
                {(activeCareer.flag || activeCareer.warning) && <div className="rp-flag" style={{ marginBottom: 16 }}>{activeCareer.flag || activeCareer.warning}</div>}

                <div className="rp-divider" />

                {/* Degrees */}
                {activeCareer.degrees?.length > 0 && (
                  <>
                    <div className="rp-list-hdr" style={{ marginBottom: 10 }}>Degree Pathways — click to see matched institutions</div>
                    {activeCareer.degrees.map((deg, di) => (
                      <div className={`rp-deg${selDegree === di ? ' active' : ''}`} key={di} onClick={() => setSelDegree(selDegree === di ? null : di)}>
                        <div className="rp-deg-top">
                          <div className="rp-deg-name">{deg.name}</div>
                          <div className="rp-deg-match">{deg.match} match</div>
                        </div>
                        {deg.sub && <div className="rp-deg-sub">{deg.sub}</div>}
                      </div>
                    ))}
                  </>
                )}

                {/* Institutions */}
                {selDegree !== null && activeCareer.institutions?.length > 0 && (() => {
                  const deg = activeCareer.degrees?.[selDegree];
                  let insts = activeCareer.institutions;
                  if (instFilter === 'india') insts = insts.filter(x => x.type === 'india');
                  if (instFilter === 'global') insts = insts.filter(x => x.type === 'global');
                  return (
                    <div style={{ marginTop: 16 }}>
                      <div className="rp-inst-hdr">
                        <div className="rp-list-hdr" style={{ margin: 0 }}>Institutions for: {deg?.name}</div>
                        <div className="rp-fgrp">
                          {['all','india','global'].map(f => (
                            <button key={f} className={`rp-fbtn${instFilter === f ? ' on' : ''}`} onClick={() => setInstFilter(f)}>
                              {f.charAt(0).toUpperCase() + f.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>
                      {insts.length === 0 ? (
                        <div className="rp-empty">No institutions match this filter.</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {insts.map((inst, ii) => (
                            <div className="rp-inst" key={ii}>
                              <div className="rp-inst-top">
                                <div><div className="rp-inst-name">{inst.name}</div><div className="rp-inst-loc">{inst.loc || inst.location}</div></div>
                                <div className={`rp-inst-cty ${inst.type === 'india' ? 'rp-cty-india' : 'rp-cty-global'}`}>{inst.type === 'india' ? 'India' : 'Global'}</div>
                              </div>
                              {inst.tags?.length > 0 && (
                                <div className="rp-inst-tags">
                                  {inst.tags.map((t, ti) => {
                                    const [label, cls] = Array.isArray(t) ? t : [t, 'it-blue'];
                                    const m = { 'it-blue': 'rp-it-blue', 'it-teal': 'rp-it-teal', 'it-purple': 'rp-it-purple', 'it-amber': 'rp-it-amber', 'it-red': 'rp-it-red' };
                                    return <span className={`rp-itag ${m[cls] || 'rp-it-blue'}`} key={ti}>{label}</span>;
                                  })}
                                </div>
                              )}
                              {inst.note && <div className="rp-inst-note">{inst.note}</div>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>

        <div className="rp-disclaimer">
          Results reflect tendencies at this developmental stage and should be discussed with a qualified counselor before making academic or career decisions. Percentile scores are relative to the Indian adolescent normative sample.
        </div>
      </div>

      {/* FAB */}
      <div className="rp-fab">
        {shareMsg && <div style={{ position: 'absolute', bottom: 50, right: 0, background: 'var(--violet-dark)', color: '#fff', padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>Link copied!</div>}
        <button className="rp-fab-btn rp-fab-sh" onClick={handleShare} title="Copy link"><Share2 size={16} /></button>
        <button className="rp-fab-btn rp-fab-dl" onClick={() => window.print()} title="Download PDF"><Download size={16} /></button>
      </div>
    </div>
  );
}
