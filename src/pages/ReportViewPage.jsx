import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Brain, Heart, Compass, Briefcase, ArrowLeft, Send, Check, ChevronRight } from 'lucide-react';
import api from '../utils/api';

const DOMAIN_COLORS = { gf: '#6366F1', gv: '#0891B2', gq: '#D97706', gc: '#059669', gs: '#DC2626' };

export default function ReportViewPage() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary');
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    api.get(`/reports/${id}`).then(setReport).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex items-center justify-center min-h-[400px] text-stone-400">Loading report…</div>;
  if (!report) return <div className="p-8 text-center text-stone-500">Report not found</div>;

  const data = report.report_data || {};
  const isCompiled = report.report_type === 'compiled';
  const sections = isCompiled ? data.sections || {} : null;

  // Determine which tabs to show
  const tabs = [{ key: 'summary', label: 'Summary', icon: Briefcase }];
  if (isCompiled) {
    if (sections.aptitude)    tabs.push({ key: 'aptitude',    label: 'Aptitude',    icon: Brain });
    if (sections.personality) tabs.push({ key: 'personality',  label: 'Personality',  icon: Heart });
    if (sections.interest)    tabs.push({ key: 'interest',     label: 'Interest',     icon: Compass });
    if (sections.career)      tabs.push({ key: 'career',       label: 'Career Guide', icon: Briefcase });
  } else if (report.report_type === 'aptitude') {
    tabs.length = 0;
    tabs.push({ key: 'aptitude', label: 'Aptitude', icon: Brain });
  } else if (report.report_type === 'personality') {
    tabs.length = 0;
    tabs.push({ key: 'personality', label: 'Personality', icon: Heart });
  } else if (report.report_type === 'interest') {
    tabs.length = 0;
    tabs.push({ key: 'interest', label: 'Interest', icon: Compass });
  }

  // For non-compiled reports, get data directly
  const aptData    = isCompiled ? sections?.aptitude    : (report.report_type === 'aptitude' ? data : null);
  const persData   = isCompiled ? sections?.personality  : (report.report_type === 'personality' ? data : null);
  const intData    = isCompiled ? sections?.interest     : (report.report_type === 'interest' ? data : null);
  const careerData = isCompiled ? sections?.career       : null;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl border border-stone-200 hover:bg-stone-50">
          <ArrowLeft size={16} className="text-stone-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-stone-800" style={{ fontFamily: "'Playfair Display', serif" }}>
            {data.studentName || `${report.first_name} ${report.last_name}`}
          </h1>
          <p className="text-sm text-stone-500">{data.grade || report.grade} {data.section || report.section} • {report.report_type} report • {new Date(report.created_at).toLocaleDateString()}</p>
        </div>
        {report.status !== 'published' && !['student', 'employee'].includes(user?.role) && (
          <button onClick={async () => { await api.patch(`/reports/${id}/publish`); setReport(r => ({ ...r, status: 'published' })); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #059669, #10B981)' }}>
            <Check size={14} /> Publish
          </button>
        )}
      </div>

      {/* Tabs */}
      {tabs.length > 1 && (
        <div className="flex gap-1 bg-stone-100 rounded-2xl p-1 mb-6">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex-1 justify-center ${active ? 'bg-white shadow text-stone-800' : 'text-stone-500 hover:text-stone-700'}`}>
                <Icon size={14} /> {tab.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Content */}
      {(activeTab === 'summary' && isCompiled) && <SummarySection data={data} careerData={careerData} />}
      {(activeTab === 'aptitude' || (!isCompiled && report.report_type === 'aptitude')) && aptData && <AptitudeSection data={aptData} />}
      {(activeTab === 'personality' || (!isCompiled && report.report_type === 'personality')) && persData && <PersonalitySection data={persData} />}
      {(activeTab === 'interest' || (!isCompiled && report.report_type === 'interest')) && intData && <InterestSection data={intData} />}
      {activeTab === 'career' && careerData && <CareerSection data={careerData} />}
    </div>
  );
}

// ═══════════════════════════════════════
// SUMMARY TAB (compiled overview)
// ═══════════════════════════════════════
function SummarySection({ data, careerData }) {
  const summary = data.summary || careerData?.summary || {};
  return (
    <div className="space-y-4">
      <Card>
        <h2 className="text-lg font-bold text-stone-800 mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>Career Guidance Summary</h2>
        <p className="text-sm text-stone-600 leading-relaxed">{summary.profileStatement}</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <StatBox label="Best Field" value={summary.bestField || '—'} color="#059669" />
          <StatBox label="Match Score" value={`${summary.bestMatch || 0}%`} color="#D97706" />
          <StatBox label="Holland Code" value={summary.hollandCode || '—'} color="#6366F1" />
          <StatBox label="Strongest" value={summary.strongestAptitude || '—'} color="#0891B2" />
        </div>
      </Card>
      {careerData?.topCareers?.length > 0 && (
        <Card>
          <h3 className="text-sm font-bold text-stone-800 mb-3">Top Career Recommendations</h3>
          <div className="space-y-2">
            {careerData.topCareers.slice(0, 5).map((c, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-stone-50">
                <span className="text-lg font-bold text-stone-300 w-6">#{i + 1}</span>
                <div className="flex-1">
                  <div className="text-sm font-bold text-stone-800">{c.career}</div>
                  <div className="text-xs text-stone-400">{c.field}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold" style={{ color: c.matchPercentage >= 70 ? '#059669' : c.matchPercentage >= 50 ? '#D97706' : '#DC2626' }}>{c.matchPercentage}%</div>
                  <div className="text-[10px] text-stone-400">match</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════
// APTITUDE TAB
// ═══════════════════════════════════════
function AptitudeSection({ data }) {
  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-stone-800" style={{ fontFamily: "'Playfair Display', serif" }}>Cognitive Aptitude</h2>
          <div className="text-right">
            <div className="text-2xl font-bold" style={{ color: data.globalClassification?.color || '#D97706' }}>{data.globalTheta}</div>
            <div className="text-xs font-semibold text-stone-500">{data.globalClassification?.label}</div>
          </div>
        </div>
        <div className="space-y-3">
          {(data.domainReports || []).map(d => (
            <div key={d.domain} className="flex items-center gap-3">
              <div className="w-24 text-xs font-semibold text-stone-600 truncate">{d.domainName}</div>
              <div className="flex-1 h-3 rounded-full bg-stone-100 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.max(2, ((d.theta + 3) / 6) * 100)}%`, background: DOMAIN_COLORS[d.domain] || '#78716C' }} />
              </div>
              <div className="text-xs font-bold text-stone-700 w-10 text-right">{d.theta}</div>
              <div className="text-[10px] font-semibold w-20 text-right" style={{ color: d.classification?.color }}>{d.classification?.label}</div>
            </div>
          ))}
        </div>
      </Card>
      {/* Clusters */}
      {data.clusterReports?.length > 0 && (
        <Card>
          <h3 className="text-sm font-bold text-stone-800 mb-3">Aptitude Clusters</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {data.clusterReports.map(c => (
              <div key={c.cluster} className="p-3 rounded-xl bg-stone-50 text-center">
                <div className="text-lg font-bold text-stone-800">{c.percentage}%</div>
                <div className="text-xs font-semibold text-stone-500">{c.clusterName}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
      {/* Narratives */}
      {(data.domainReports || []).map(d => d.narrative && (
        <Card key={d.domain}>
          <h4 className="text-sm font-bold mb-1" style={{ color: DOMAIN_COLORS[d.domain] || '#78716C' }}>{d.domainName}</h4>
          <p className="text-sm text-stone-600 leading-relaxed">{d.narrative}</p>
        </Card>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════
// PERSONALITY TAB
// ═══════════════════════════════════════
function PersonalitySection({ data }) {
  const traits = data.traits || {};
  return (
    <div className="space-y-4">
      <Card>
        <h2 className="text-lg font-bold text-stone-800 mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>Personality Profile (Big Five)</h2>
        <div className="space-y-4">
          {Object.entries(traits).map(([key, t]) => (
            <div key={key}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-base">{t.icon}</span>
                  <span className="text-sm font-bold text-stone-800">{t.label}</span>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-lg"
                  style={{ color: t.level === 'high' ? '#059669' : t.level === 'moderate' ? '#D97706' : '#DC2626',
                           background: t.level === 'high' ? '#ECFDF5' : t.level === 'moderate' ? '#FFFBEB' : '#FEF2F2' }}>
                  {t.label_display || t.label_level || t.level?.charAt(0).toUpperCase() + t.level?.slice(1)}
                </span>
              </div>
              <div className="h-3 rounded-full bg-stone-100 overflow-hidden mb-1">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${t.percentage || 0}%`, background: t.color || '#6366F1' }} />
              </div>
              <p className="text-xs text-stone-500 leading-relaxed">{t.narrative}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════
// INTEREST TAB
// ═══════════════════════════════════════
function InterestSection({ data }) {
  const dims = data.dimensions || {};
  return (
    <div className="space-y-4">
      <Card>
        <h2 className="text-lg font-bold text-stone-800 mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>Interest Profile (Holland RIASEC)</h2>
        {data.hollandCode && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-50 mb-4">
            <span className="text-xs font-semibold text-indigo-400">Holland Code</span>
            <span className="text-lg font-bold text-indigo-600 tracking-widest">{data.hollandCode}</span>
          </div>
        )}
        <div className="space-y-4">
          {Object.entries(dims).map(([key, d]) => (
            <div key={key}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-base">{d.icon}</span>
                  <span className="text-sm font-bold text-stone-800">{d.label} ({d.abbr})</span>
                </div>
                <span className="text-sm font-bold text-stone-700">{d.percentage || 0}%</span>
              </div>
              <div className="h-3 rounded-full bg-stone-100 overflow-hidden mb-1">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${d.percentage || 0}%`, background: d.color || '#6366F1' }} />
              </div>
              <p className="text-xs text-stone-500">{d.narrative}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════
// CAREER TAB
// ═══════════════════════════════════════
function CareerSection({ data }) {
  const [showAll, setShowAll] = useState(false);
  const recs = showAll ? (data.allRecommendations || []) : (data.topCareers || []);
  return (
    <div className="space-y-4">
      <Card>
        <h2 className="text-lg font-bold text-stone-800 mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>Career Recommendations</h2>
        <div className="space-y-2">
          {recs.map((c, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-stone-100 hover:border-stone-200 transition-colors">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                style={{ color: c.matchPercentage >= 70 ? '#059669' : c.matchPercentage >= 50 ? '#D97706' : '#78716C',
                         background: c.matchPercentage >= 70 ? '#ECFDF5' : c.matchPercentage >= 50 ? '#FFFBEB' : '#F5F5F4' }}>
                {c.matchPercentage}%
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold text-stone-800">{c.career}</div>
                <div className="text-xs text-stone-400">{c.field}</div>
              </div>
              <div className="flex gap-3 text-[10px]">
                <div className="text-center"><div className="font-bold text-indigo-600">{c.aptitudeFit}%</div><div className="text-stone-400">Aptitude</div></div>
                <div className="text-center"><div className="font-bold text-amber-600">{c.interestFit}%</div><div className="text-stone-400">Interest</div></div>
                <div className="text-center"><div className="font-bold text-pink-600">{c.personalityFit}%</div><div className="text-stone-400">Personality</div></div>
              </div>
            </div>
          ))}
        </div>
        {!showAll && data.allRecommendations?.length > 10 && (
          <button onClick={() => setShowAll(true)}
            className="mt-3 text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1">
            Show all {data.allRecommendations.length} careers <ChevronRight size={12} />
          </button>
        )}
      </Card>
    </div>
  );
}

function Card({ children, className = '' }) {
  return <div className={`rounded-2xl border border-stone-200 bg-white p-5 ${className}`}>{children}</div>;
}

function StatBox({ label, value, color }) {
  return (
    <div className="p-3 rounded-xl" style={{ background: `${color}08` }}>
      <div className="text-lg font-bold" style={{ color }}>{value}</div>
      <div className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">{label}</div>
    </div>
  );
}
