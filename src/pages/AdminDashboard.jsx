import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Brain, Heart, Compass, Briefcase, Users, FileText, Activity, Eye, Check, ChevronRight, RefreshCw, Plus } from 'lucide-react';
import api from '../utils/api';

const TYPE_META = {
  aptitude:      { icon: Brain,     label: 'Aptitude' },
  personality:   { icon: Heart,     label: 'Personality' },
  interest:      { icon: Compass,   label: 'Interest' },
  compiled:      { icon: Briefcase, label: 'Career Guide' },
  comprehensive: { icon: FileText,  label: 'Report' },
};

const STATUS_CLS = {
  published:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  in_review:   'bg-amber-50 text-amber-700 border-amber-200',
  draft:       'bg-stone-100 text-stone-600 border-stone-200',
  completed:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
};

function StatusBadge({ status }) {
  const cls = STATUS_CLS[status] || 'bg-stone-100 text-stone-600 border-stone-200';
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${cls}`}>
      {status}
    </span>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({});
  const [recentReports, setRecentReports] = useState([]);
  const [recentSessions, setRecentSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    Promise.all([
      api.get('/sessions?limit=5&sortBy=created_at&sortDir=desc').catch(() => ({ sessions: [] })),
      api.get('/reports?limit=10').catch(() => ({ reports: [], total: 0 })),
      api.get('/items?limit=1').catch(() => ({ total: 0 })),
      api.get('/auth/users?limit=1').catch(() => ({ total: 0 })),
    ]).then(([sessions, reports, items, users]) => {
      setRecentSessions(sessions.sessions || []);
      setRecentReports(reports.reports || []);
      setStats({
        totalReports: reports.total || 0,
        draftReports: (reports.reports || []).filter(r => r.status === 'draft').length,
        totalItems: items.total || 0,
        totalUsers: users.total || (Array.isArray(users) ? users.length : 0),
        completedSessions: (sessions.sessions || []).filter(s => s.status === 'completed').length,
      });
      setLoading(false);
    });
  }, []);

  const publishReport = async (id) => {
    try {
      await api.patch(`/reports/${id}/publish`);
      setRecentReports(prev => prev.map(r => r.id === id ? { ...r, status: 'published' } : r));
    } catch (err) { console.error(err); }
  };

  const generateAndPublish = async (sessionId) => {
    try {
      const report = await api.post(`/reports/generate/${sessionId}`);
      if (report?.id) {
        await api.patch(`/reports/${report.id}/publish`);
        setRecentReports(prev => [{ ...report, status: 'published' }, ...prev]);
        setRecentSessions(prev => prev.filter(s => s.id !== sessionId));
        alert('Report generated and published!');
      }
    } catch (err) {
      console.error('Generate & publish error:', err);
      alert(err?.message || 'Failed to generate report');
    }
  };

  const generateReport = async (sessionId) => {
    try {
      const report = await api.post(`/reports/generate/${sessionId}`);
      if (report?.id) {
        setRecentReports(prev => [{ ...report, status: 'draft' }, ...prev]);
        alert('Report generated as draft!');
      }
    } catch (err) {
      console.error('Generate error:', err);
      alert(err?.message || 'Failed to generate report');
    }
  };

  const regenerateReport = async (reportId) => {
    try {
      const updated = await api.post(`/reports/regenerate/${reportId}`);
      setRecentReports(prev => prev.map(r => r.id === reportId ? { ...r, ...updated, report_data: updated.report_data } : r));
      alert('Report regenerated with latest engine!');
    } catch (err) { console.error(err); alert(err.message || 'Failed to regenerate'); }
  };

  const completedWithoutReports = recentSessions.filter(s => {
    if (s.status !== 'completed') return false;
    return !recentReports.some(r => r.session_id === s.id);
  });

  if (loading) {
    return (
      <div className="page flex items-center justify-center text-sm" style={{ color: 'var(--ink-dim)' }}>
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded-full animate-spin"
            style={{ border: '2px solid var(--gold-line)', borderTopColor: 'var(--blue)' }} />
          Loading
        </div>
      </div>
    );
  }

  const statCards = [
    { label: 'Reports Generated', value: stats.totalReports || 0, icon: FileText },
    { label: 'Drafts Pending',    value: stats.draftReports || 0, icon: Activity, alert: stats.draftReports > 0 },
    { label: 'Item Bank',         value: stats.totalItems || 0,   icon: Brain },
    { label: 'Active Users',      value: stats.totalUsers || 0,   icon: Users },
  ];

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="page">
      {/* ── Compact topbar (matches student-side) ── */}
      <div className="sticky top-0 z-30 flex items-center justify-between px-6 lg:px-8 py-3"
        style={{ background: 'var(--warm)', borderBottom: '1px solid var(--border)' }}>
        <div>
          <h1 className="font-display text-[19px]" style={{ color: 'var(--ink)' }}>
            {greeting}, {user?.first_name || 'Admin'}
          </h1>
          <p className="text-[11.5px] mt-0.5" style={{ color: 'var(--slate-light)' }}>{today}</p>
        </div>
        <button onClick={() => navigate('/admin/setup')} className="btn-primary">
          <Plus size={13} /> Setup &amp; Assign
        </button>
      </div>

      <div className="px-6 lg:px-8 py-5 max-w-[1280px] mx-auto">
        {/* ── Stats — student-style banner cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5 stagger">
          {statCards.map(s => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="stat-tile">
                <div className="flex items-start justify-between mb-2">
                  <div className="stat-tile-label">{s.label}</div>
                  {s.alert ? (
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--blush)' }} />
                  ) : (
                    <Icon size={13} style={{ color: 'var(--slate-light)' }} strokeWidth={1.75} />
                  )}
                </div>
                <div className="stat-tile-value tabular-nums">
                  {s.value}
                </div>
              </div>
            );
          })}
        </div>

        {/* Completed sessions needing reports */}
        {completedWithoutReports.length > 0 && (
          <div className="card p-5 lg:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold">Completed Tests — Generate Reports</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Sessions ready for report generation</p>
              </div>
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                {completedWithoutReports.length} pending
              </span>
            </div>
            <div className="divide-y divide-zinc-100">
              {completedWithoutReports.map(s => (
                <div key={s.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{s.user_name}</div>
                    <div className="text-xs text-zinc-500 mt-0.5">{s.battery_name}</div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => generateReport(s.id)}
                      className="bg-white border border-stone-200 hover:border-stone-300 text-stone-700 font-bold rounded-xl px-3 py-1.5 text-xs transition-colors"
                      title="Generate as draft"
                    >
                      Generate
                    </button>
                    <button
                      onClick={() => generateAndPublish(s.id)}
                      className="bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl px-3 py-1.5 text-xs transition-colors"
                      title="Generate & release to student"
                    >
                      Generate & Release
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Draft reports — need attention */}
        {recentReports.filter(r => r.status === 'draft').length > 0 && (
          <div className="card p-5 lg:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold">Reports Awaiting Review</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Drafts ready to be reviewed and published</p>
              </div>
              <button
                onClick={() => navigate('/admin/reports')}
                className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1"
              >
                View all <ChevronRight size={12} />
              </button>
            </div>
            <div className="divide-y divide-zinc-100">
              {recentReports.filter(r => r.status === 'draft').slice(0, 5).map(r => {
                const tm = TYPE_META[r.report_type] || TYPE_META.comprehensive;
                const Icon = tm.icon;
                return (
                  <div key={r.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-stone-50 border border-stone-100 flex items-center justify-center flex-shrink-0">
                        <Icon size={14} className="text-zinc-500" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">{r.first_name} {r.last_name}</div>
                        <div className="text-xs text-zinc-500 mt-0.5">{tm.label}</div>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => navigate(`/admin/reports/${r.id}`)}
                        className="p-2 rounded-lg hover:bg-stone-100 text-zinc-500"
                        title="View"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => regenerateReport(r.id)}
                        className="p-2 rounded-lg hover:bg-amber-50 text-amber-700"
                        title="Regenerate with latest engine"
                      >
                        <RefreshCw size={14} />
                      </button>
                      <button
                        onClick={() => publishReport(r.id)}
                        className="p-2 rounded-lg hover:bg-emerald-50 text-emerald-700"
                        title="Publish"
                      >
                        <Check size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent reports + Recent sessions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Recent reports */}
          <div className="card p-5 lg:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold">Recent Reports</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Latest generated reports</p>
              </div>
              <button
                onClick={() => navigate('/admin/reports')}
                className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1"
              >
                All <ChevronRight size={12} />
              </button>
            </div>
            {recentReports.length === 0 ? (
              <p className="text-sm text-stone-400 py-8 text-center">No reports yet. Assign a test battery to get started.</p>
            ) : (
              <div className="divide-y divide-zinc-100">
                {recentReports.slice(0, 8).map(r => {
                  const tm = TYPE_META[r.report_type] || TYPE_META.comprehensive;
                  const Icon = tm.icon;
                  return (
                    <div
                      key={r.id}
                      className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 cursor-pointer hover:bg-stone-50/50 -mx-2 px-2 rounded-lg transition-colors"
                      onClick={() => navigate(`/admin/reports/${r.id}`)}
                    >
                      <div className="w-9 h-9 rounded-xl bg-stone-50 border border-stone-100 flex items-center justify-center flex-shrink-0">
                        <Icon size={14} className="text-zinc-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">{r.first_name} {r.last_name}</div>
                        <div className="text-xs text-zinc-500 mt-0.5">
                          {tm.label} • {new Date(r.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <StatusBadge status={r.status} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent sessions */}
          <div className="card p-5 lg:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold">Recent Sessions</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Latest assessment sessions</p>
              </div>
              <button
                onClick={() => navigate('/admin/sessions')}
                className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1"
              >
                All <ChevronRight size={12} />
              </button>
            </div>
            {recentSessions.length === 0 ? (
              <p className="text-sm text-stone-400 py-8 text-center">No sessions yet.</p>
            ) : (
              <div className="divide-y divide-zinc-100">
                {recentSessions.slice(0, 8).map(s => (
                  <div key={s.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{s.user_name}</div>
                      <div className="text-xs text-zinc-500 mt-0.5 truncate">{s.battery_name}</div>
                    </div>
                    <StatusBadge status={s.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
