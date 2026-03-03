import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Brain, Heart, Compass, Briefcase, Users, FileText, Activity, Eye, Check, Send, ChevronRight } from 'lucide-react';
import api from '../utils/api';

const TYPE_META = {
  aptitude:    { icon: Brain,     label: 'Aptitude',    color: '#6366F1', bg: '#EEF2FF' },
  personality: { icon: Heart,     label: 'Personality',  color: '#EC4899', bg: '#FDF2F8' },
  interest:    { icon: Compass,   label: 'Interest',     color: '#F59E0B', bg: '#FFFBEB' },
  compiled:    { icon: Briefcase, label: 'Career Guide', color: '#059669', bg: '#ECFDF5' },
  comprehensive: { icon: FileText, label: 'Report',     color: '#78716C', bg: '#F5F5F4' },
};

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

  if (loading) return <div className="flex items-center justify-center min-h-[400px] text-stone-400">Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-800" style={{ fontFamily: "'Playfair Display', serif" }}>
            Welcome back, {user?.first_name || 'Admin'}
          </h1>
          <p className="text-sm text-stone-500 mt-1">CogniMap Assessment Platform</p>
        </div>
        <button onClick={() => navigate('/admin/setup')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #B45309, #D97706)', boxShadow: '0 4px 16px rgba(180,83,9,0.2)' }}>
          + Setup & Assign Test
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Reports', value: stats.totalReports, icon: FileText, color: '#6366F1' },
          { label: 'Draft Reports', value: stats.draftReports, icon: Activity, color: '#D97706', alert: stats.draftReports > 0 },
          { label: 'Item Bank', value: stats.totalItems, icon: Brain, color: '#0891B2' },
          { label: 'Students', value: stats.totalUsers, icon: Users, color: '#059669' },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`p-4 rounded-2xl border ${s.alert ? 'border-amber-200 bg-amber-50' : 'border-stone-200 bg-white'}`}>
              <div className="flex items-center justify-between mb-2">
                <Icon size={16} style={{ color: s.color }} />
                {s.alert && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
              </div>
              <div className="text-2xl font-bold text-stone-800">{s.value || 0}</div>
              <div className="text-xs font-semibold text-stone-500">{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Draft reports — need attention */}
      {recentReports.filter(r => r.status === 'draft').length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-amber-800">📋 Reports Awaiting Review</h3>
            <button onClick={() => navigate('/admin/reports')} className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1">
              View all <ChevronRight size={12} />
            </button>
          </div>
          <div className="space-y-2">
            {recentReports.filter(r => r.status === 'draft').slice(0, 5).map(r => {
              const tm = TYPE_META[r.report_type] || TYPE_META.comprehensive;
              const Icon = tm.icon;
              return (
                <div key={r.id} className="flex items-center justify-between bg-white rounded-xl p-3 border border-amber-100">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: tm.bg }}>
                      <Icon size={14} style={{ color: tm.color }} />
                    </span>
                    <div>
                      <span className="text-sm font-semibold text-stone-800">{r.first_name} {r.last_name}</span>
                      <span className="text-xs text-stone-400 ml-2">{tm.label}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => navigate(`/admin/reports/${r.id}`)}
                      className="p-2 rounded-lg hover:bg-stone-100 text-stone-500" title="View"><Eye size={14} /></button>
                    <button onClick={() => publishReport(r.id)}
                      className="p-2 rounded-lg hover:bg-green-50 text-green-600" title="Publish"><Check size={14} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent reports — all types */}
      <div className="rounded-2xl border border-stone-200 bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-stone-800">Recent Reports</h3>
          <button onClick={() => navigate('/admin/reports')} className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1">
            All reports <ChevronRight size={12} />
          </button>
        </div>
        {recentReports.length === 0 ? (
          <p className="text-sm text-stone-400 py-8 text-center">No reports yet. Assign a test battery to get started.</p>
        ) : (
          <div className="space-y-2">
            {recentReports.slice(0, 8).map(r => {
              const tm = TYPE_META[r.report_type] || TYPE_META.comprehensive;
              const Icon = tm.icon;
              return (
                <div key={r.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-stone-50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/admin/reports/${r.id}`)}>
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: tm.bg }}>
                    <Icon size={14} style={{ color: tm.color }} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-stone-800 truncate">{r.first_name} {r.last_name}</div>
                    <div className="text-xs text-stone-400">{tm.label} • {new Date(r.created_at).toLocaleDateString()}</div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${r.status === 'published' ? 'text-green-600 bg-green-50' : r.status === 'in_review' ? 'text-amber-600 bg-amber-50' : 'text-stone-500 bg-stone-100'}`}>
                    {r.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent sessions */}
      <div className="rounded-2xl border border-stone-200 bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-stone-800">Recent Sessions</h3>
          <button onClick={() => navigate('/admin/sessions')} className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1">
            All sessions <ChevronRight size={12} />
          </button>
        </div>
        <div className="space-y-2">
          {recentSessions.slice(0, 5).map(s => (
            <div key={s.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-stone-50">
              <div>
                <div className="text-sm font-semibold text-stone-800">{s.user_name}</div>
                <div className="text-xs text-stone-400">{s.battery_name}</div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${s.status === 'completed' ? 'text-green-600 bg-green-50' : s.status === 'in_progress' ? 'text-blue-600 bg-blue-50' : 'text-stone-500 bg-stone-100'}`}>
                {s.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
