import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const DOMAIN_LABELS = { gf: 'Fluid Reasoning', gv: 'Visual Spatial', gq: 'Quantitative', gc: 'Verbal', gs: 'Speed' };
const DOMAIN_COLORS = { gf: '#6366F1', gv: '#0891B2', gq: '#D97706', gc: '#059669', gs: '#DC2626' };
const TYPE_META = {
  aptitude: { label: 'Aptitude', icon: '🧩', color: '#6366F1' },
  personality: { label: 'Personality', icon: '💖', color: '#EC4899' },
  interest: { label: 'Interest', icon: '🧭', color: '#F59E0B' },
  compiled: { label: 'Career Guide', icon: '🎯', color: '#059669' },
  comprehensive: { label: 'Report', icon: '📊', color: '#78716C' },
};

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      api.get('/sessions?mine=true'),
      api.get('/reports?limit=20'),
    ]).then(([sesR, repR]) => {
      if (sesR.status === 'fulfilled') setSessions(sesR.value.sessions || []);
      if (repR.status === 'fulfilled') setReports(repR.value.reports || repR.value || []);
    }).finally(() => setLoading(false));
  }, []);

  const pending = sessions.filter(s => ['assigned', 'in_progress'].includes(s.status));
  const completed = sessions.filter(s => s.status === 'completed');

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-800" style={{ fontFamily: "'Playfair Display', serif" }}>
          Hi, {user?.first_name}! 👋
        </h1>
        <p className="text-sm text-stone-500 mt-1">Here are your assessments and results.</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-sm text-stone-400">Loading...</div>
      ) : (
        <>
          {/* Pending Tests */}
          {pending.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">🎯 Ready to Take</h2>
              <div className="flex flex-col gap-3">
                {pending.map(s => (
                  <div key={s.id} className="bg-white border-2 border-stone-200 rounded-2xl p-5 flex items-center justify-between shadow-sm hover:border-amber-300 transition-all">
                    <div>
                      <div className="font-bold text-stone-800">{s.battery_name || 'Assessment'}</div>
                      <div className="text-xs text-stone-400 mt-0.5">
                        {s.status === 'in_progress' ? '⏳ In progress — continue where you left off' : '📝 Ready to start'}
                      </div>
                    </div>
                    <button onClick={() => navigate(`/test/${s.id}`)}
                      className="px-5 py-2.5 text-white font-bold rounded-xl text-sm flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #B45309, #D97706)', boxShadow: '0 3px 0 #92400E' }}>
                      {s.status === 'in_progress' ? 'Continue →' : 'Start →'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Published Reports */}
          {reports.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">📑 Your Reports</h2>
              <div className="flex flex-col gap-3">
                {reports.map(r => {
                  const tm = TYPE_META[r.report_type] || TYPE_META.comprehensive;
                  const data = r.report_data || {};
                  return (
                    <div key={r.id} className="bg-white border border-stone-200 rounded-2xl p-5 cursor-pointer hover:border-stone-300 transition-all"
                      onClick={() => navigate(`/student/reports/${r.id}`)}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{tm.icon}</span>
                          <span className="text-sm font-bold text-stone-800">{tm.label} Report</span>
                        </div>
                        <span className="text-xs text-stone-400">{new Date(r.created_at).toLocaleDateString()}</span>
                      </div>
                      {/* Show quick scores based on report type */}
                      {r.report_type === 'aptitude' && data.domainReports && (
                        <div className="space-y-1.5">
                          {data.domainReports.map(d => (
                            <div key={d.domain} className="flex items-center gap-2">
                              <span className="text-[10px] font-semibold text-stone-400 w-16 text-right">{DOMAIN_LABELS[d.domain] || d.domain}</span>
                              <div className="flex-1 h-2.5 rounded-full bg-stone-100 overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${Math.max(5, ((d.theta + 3) / 6) * 100)}%`, backgroundColor: DOMAIN_COLORS[d.domain] || '#888' }} />
                              </div>
                              <span className="text-[10px] font-bold text-stone-500 w-8">{d.theta}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {r.report_type === 'compiled' && data.summary && (
                        <div className="flex gap-3 flex-wrap">
                          <div className="px-3 py-1.5 rounded-lg bg-green-50 text-xs font-bold text-green-700">{data.summary.bestField}</div>
                          <div className="px-3 py-1.5 rounded-lg bg-indigo-50 text-xs font-bold text-indigo-700">{data.summary.hollandCode}</div>
                          <div className="px-3 py-1.5 rounded-lg bg-amber-50 text-xs font-bold text-amber-700">{data.summary.bestMatch}% match</div>
                        </div>
                      )}
                      {r.report_type === 'personality' && data.traits && (
                        <div className="flex gap-2 flex-wrap">
                          {Object.entries(data.traits).slice(0, 5).map(([k, t]) => (
                            <div key={k} className="px-2 py-1 rounded-lg bg-stone-50 text-[10px] font-bold text-stone-600">
                              {t.icon} {t.abbr}: {t.percentage}%
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Completed but no report yet */}
          {completed.filter(s => !reports.some(r => r.session_id === s.id)).length > 0 && (
            <div className="mb-8">
              <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">⏳ Awaiting Reports</h2>
              {completed.filter(s => !reports.some(r => r.session_id === s.id)).map(s => (
                <div key={s.id} className="bg-stone-50 border border-stone-200 rounded-2xl p-4 text-sm text-stone-500">
                  {s.battery_name} — Completed, report being generated...
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {sessions.length === 0 && reports.length === 0 && (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">📚</div>
              <div className="font-bold text-stone-800 mb-1">No tests assigned yet</div>
              <div className="text-sm text-stone-500">Your teacher will assign tests when they're ready.</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
