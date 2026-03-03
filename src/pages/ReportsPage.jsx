import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FileText, Send, Eye, Check, Download, Users, Brain, Heart, Compass, Briefcase, Filter, RefreshCw } from 'lucide-react';
import api from '../utils/api';

const TYPE_META = {
  aptitude:    { icon: Brain,     label: 'Aptitude',    color: '#6366F1', bg: '#EEF2FF' },
  personality: { icon: Heart,     label: 'Personality',  color: '#EC4899', bg: '#FDF2F8' },
  interest:    { icon: Compass,   label: 'Interest',     color: '#F59E0B', bg: '#FFFBEB' },
  compiled:    { icon: Briefcase, label: 'Career Guide', color: '#059669', bg: '#ECFDF5' },
  comprehensive: { icon: FileText, label: 'Full Report', color: '#78716C', bg: '#F5F5F4' },
};

const STATUS_META = {
  draft:      { label: 'Draft',      color: '#78716C', bg: '#F5F5F4' },
  in_review:  { label: 'In Review',  color: '#D97706', bg: '#FFFBEB' },
  published:  { label: 'Published',  color: '#059669', bg: '#ECFDF5' },
};

export default function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '', reportType: '' });
  const [shareModal, setShareModal] = useState(null);
  const [compileModal, setCompileModal] = useState(null);
  const [students, setStudents] = useState([]);
  const [completedSessions, setCompletedSessions] = useState([]);
  const navigate = useNavigate();
  const { user } = useAuth();

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.status) params.set('status', filter.status);
      if (filter.reportType) params.set('reportType', filter.reportType);
      params.set('limit', '100');
      const data = await api.get(`/reports?${params}`);
      setReports(data.reports || []);
      setTotal(data.total || 0);
    } catch (err) { console.error(err); }
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  // Fetch completed sessions without reports (for manual generation)
  useEffect(() => {
    api.get('/sessions?status=completed&limit=200').then(d => setCompletedSessions(d.sessions || [])).catch(() => {});
    api.get('/auth/users?role=student&limit=200').then(d => setStudents(d.users || d || [])).catch(() => {});
  }, []);

  const generateReport = async (sessionId) => {
    try {
      await api.post(`/reports/generate/${sessionId}`);
      fetchReports();
    } catch (err) { alert(err.message || 'Failed'); }
  };

  const compileCareer = async (userId) => {
    try {
      await api.post(`/reports/compile/${userId}`);
      setCompileModal(null);
      fetchReports();
    } catch (err) { alert(err.message || 'No completed assessments found'); }
  };

  const publishReport = async (id) => {
    try {
      await api.patch(`/reports/${id}/publish`);
      fetchReports();
    } catch (err) { alert(err.message || 'Failed'); }
  };

  const shareReport = async (reportId, shareWith, shareMethod) => {
    try {
      const result = await api.patch(`/reports/${reportId}/share`, { shareWith, shareMethod });
      setShareModal(null);
      fetchReports();
      alert(result.message || 'Shared successfully');
    } catch (err) { alert(err.message || 'Failed'); }
  };

  // Reports that don't exist yet (sessions completed but no report)
  const unreported = completedSessions.filter(s =>
    !reports.some(r => r.session_id === s.id)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-800" style={{ fontFamily: "'Playfair Display', serif" }}>Reports</h1>
          <p className="text-sm text-stone-500 mt-1">{total} report{total !== 1 ? 's' : ''} • manage, review, and share</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setCompileModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #059669, #10B981)' }}>
            <Briefcase size={16} /> Compile Career Report
          </button>
          <button onClick={fetchReports} className="p-2.5 rounded-xl border border-stone-200 text-stone-500 hover:text-stone-700">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}
          className="px-3 py-2 rounded-xl border border-stone-200 text-sm font-medium bg-white">
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="in_review">In Review</option>
          <option value="published">Published</option>
        </select>
        <select value={filter.reportType} onChange={e => setFilter(f => ({ ...f, reportType: e.target.value }))}
          className="px-3 py-2 rounded-xl border border-stone-200 text-sm font-medium bg-white">
          <option value="">All Types</option>
          <option value="aptitude">Aptitude</option>
          <option value="personality">Personality</option>
          <option value="interest">Interest</option>
          <option value="compiled">Career Guide</option>
        </select>
      </div>

      {/* Unreported sessions — needs report generation */}
      {unreported.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <h3 className="text-sm font-bold text-amber-800 mb-2">⚡ {unreported.length} Completed Session{unreported.length > 1 ? 's' : ''} Without Reports</h3>
          <div className="space-y-2">
            {unreported.slice(0, 5).map(s => (
              <div key={s.id} className="flex items-center justify-between bg-white rounded-xl p-3 border border-amber-100">
                <div>
                  <span className="text-sm font-semibold text-stone-800">{s.user_name}</span>
                  <span className="text-xs text-stone-400 ml-2">{s.battery_name}</span>
                </div>
                <button onClick={() => generateReport(s.id)}
                  className="text-xs font-bold text-amber-700 hover:text-amber-900 px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200">
                  Generate Report
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reports table */}
      <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-stone-400">Loading reports…</div>
        ) : reports.length === 0 ? (
          <div className="p-12 text-center">
            <FileText size={40} className="mx-auto mb-3 text-stone-300" />
            <p className="text-stone-500">No reports yet</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Student</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Date</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {reports.map(r => {
                const tm = TYPE_META[r.report_type] || TYPE_META.comprehensive;
                const sm = STATUS_META[r.status] || STATUS_META.draft;
                const Icon = tm.icon;
                return (
                  <tr key={r.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="text-sm font-semibold text-stone-800">{r.first_name} {r.last_name}</div>
                      <div className="text-xs text-stone-400">{r.grade} {r.section}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold"
                        style={{ color: tm.color, background: tm.bg }}>
                        <Icon size={12} /> {tm.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2.5 py-1 rounded-lg text-xs font-bold"
                        style={{ color: sm.color, background: sm.bg }}>
                        {sm.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-400">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => navigate(`/admin/reports/${r.id}`)}
                          className="p-2 rounded-lg hover:bg-stone-100 text-stone-500 hover:text-stone-700" title="View">
                          <Eye size={14} />
                        </button>
                        {r.status !== 'published' && (
                          <button onClick={() => publishReport(r.id)}
                            className="p-2 rounded-lg hover:bg-green-50 text-stone-500 hover:text-green-600" title="Publish">
                            <Check size={14} />
                          </button>
                        )}
                        <button onClick={() => setShareModal(r)}
                          className="p-2 rounded-lg hover:bg-blue-50 text-stone-500 hover:text-blue-600" title="Share">
                          <Send size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Share Modal */}
      {shareModal && <ShareModal report={shareModal} onShare={shareReport} onClose={() => setShareModal(null)} />}

      {/* Compile Career Report Modal */}
      {compileModal && <CompileModal students={students} onCompile={compileCareer} onClose={() => setCompileModal(null)} />}
    </div>
  );
}

function ShareModal({ report, onShare, onClose }) {
  const [email, setEmail] = useState('');
  const [method, setMethod] = useState('dashboard');
  const tm = TYPE_META[report.report_type] || TYPE_META.comprehensive;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-stone-800 mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>Share Report</h2>
        <p className="text-sm text-stone-500 mb-4">{tm.label} report for {report.first_name} {report.last_name}</p>

        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Share Method</label>
            <div className="flex gap-2">
              {[['dashboard', 'Dashboard'], ['email', 'Email'], ['link', 'Copy Link']].map(([val, label]) => (
                <button key={val} onClick={() => setMethod(val)}
                  className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${method === val ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-stone-200 text-stone-500'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Share With</label>
            <input value={email} onChange={e => setEmail(e.target.value)}
              placeholder={method === 'dashboard' ? 'student or counselor@school.com' : 'email@example.com'}
              className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm font-medium bg-stone-50 focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/10 outline-none" />
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 px-4 py-3 rounded-xl border border-stone-200 text-sm font-semibold text-stone-600">Cancel</button>
          <button onClick={() => onShare(report.id, email || 'student', method)} disabled={!email && method === 'email'}
            className="flex-1 px-4 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #B45309, #D97706)' }}>
            Share
          </button>
        </div>
      </div>
    </div>
  );
}

function CompileModal({ students, onCompile, onClose }) {
  const [selectedStudent, setSelectedStudent] = useState('');

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-stone-800 mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>Compile Career Report</h2>
        <p className="text-sm text-stone-500 mb-4">
          Combines all completed assessments (aptitude + personality + interest) into a career guidance report with recommendations and match percentages.
        </p>

        <div className="mb-4">
          <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Select Student</label>
          <select value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm font-medium bg-stone-50 focus:border-amber-500 outline-none">
            <option value="">Choose a student...</option>
            {students.map(s => (
              <option key={s.id} value={s.id}>{s.first_name} {s.last_name} — {s.grade || ''}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 px-4 py-3 rounded-xl border border-stone-200 text-sm font-semibold text-stone-600">Cancel</button>
          <button onClick={() => onCompile(selectedStudent)} disabled={!selectedStudent}
            className="flex-1 px-4 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #059669, #10B981)' }}>
            Compile Report
          </button>
        </div>
      </div>
    </div>
  );
}
