import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBatch } from '../context/BatchContext';
import BatchFilter from '../components/BatchFilter';
import { FileText, Send, Eye, Check, Brain, Heart, Compass, Briefcase, RefreshCw, Shield } from 'lucide-react';
import api from '../utils/api';
import ReportAccessModal from '../components/ReportAccessModal';

const TYPE_META = {
  aptitude:      { icon: Brain,     label: 'Aptitude' },
  personality:   { icon: Heart,     label: 'Personality' },
  interest:      { icon: Compass,   label: 'Interest' },
  compiled:      { icon: Briefcase, label: 'Career Guide' },
  comprehensive: { icon: FileText,  label: 'Full Report' },
};

const STATUS_STYLE = {
  draft:     { background: 'var(--slate-pale)', color: 'var(--slate)' },
  in_review: { background: 'var(--gold-pale)', color: 'var(--gold)' },
  published: { background: 'var(--sage-pale)', color: 'var(--sage)' },
};

const STATUS_LABEL = {
  draft:     'Draft',
  in_review: 'In Review',
  published: 'Published',
};

export default function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '', reportType: '' });
  const [shareModal, setShareModal] = useState(null);
  const [accessModal, setAccessModal] = useState(null);
  const [compileModal, setCompileModal] = useState(null);
  const [students, setStudents] = useState([]);
  const [completedSessions, setCompletedSessions] = useState([]);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeBatchId, activeBatch } = useBatch();

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.status)     params.set('status',     filter.status);
      if (filter.reportType) params.set('reportType', filter.reportType);
      if (activeBatchId)     params.set('batchId',    activeBatchId);
      params.set('limit', '100');
      const data = await api.get(`/reports?${params}`);
      setReports(data.reports || []);
      setTotal(data.total || 0);
    } catch (err) { console.error(err); }
    setLoading(false);
  }, [filter, activeBatchId]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

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

  const unreported = completedSessions.filter(s =>
    !reports.some(r => r.session_id === s.id)
  );

  useEffect(() => {
    const p = new URLSearchParams({ status: 'completed', limit: 200 });
    if (activeBatchId) p.set('batchId', activeBatchId);
    api.get(`/sessions?${p}`).then(d => setCompletedSessions(d.sessions || [])).catch(() => {});
    const up = new URLSearchParams({ role: 'student', limit: 200 });
    if (activeBatchId) up.set('batchId', activeBatchId);
    api.get(`/auth/users?${up}`).then(d => setStudents(d.users || [])).catch(() => {});
  }, [activeBatchId]);

  return (
    <div className="page">
      {/* Compact sticky topbar */}
      <div
        className="sticky top-0 z-30 flex items-center justify-between px-6 lg:px-8 py-3"
        style={{ background: 'var(--warm)', borderBottom: '1px solid var(--border)' }}
      >
        <div>
          <h1 className="font-display text-[19px]" style={{ color: 'var(--ink)' }}>
            Assessment reports
          </h1>
          <p className="text-[11.5px] mt-0.5" style={{ color: 'var(--slate-light)' }}>
            {total} report{total !== 1 ? 's' : ''}
            {activeBatch ? ` · ${activeBatch.name}` : ' · all batches'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCompileModal(true)} className="btn-primary">
            <Briefcase size={14} /> Compile Career Report
          </button>
          <button
            onClick={fetchReports}
            className="btn-secondary !px-3"
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div className="px-6 lg:px-8 py-5 max-w-[1280px] mx-auto space-y-5">
        {/* Batch filter */}
        <BatchFilter />

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <select
            value={filter.status}
            onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}
            className="input-field min-w-[160px] max-w-[220px]"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="in_review">In Review</option>
            <option value="published">Published</option>
          </select>
          <select
            value={filter.reportType}
            onChange={e => setFilter(f => ({ ...f, reportType: e.target.value }))}
            className="input-field min-w-[160px] max-w-[220px]"
          >
            <option value="">All Types</option>
            <option value="aptitude">Aptitude</option>
            <option value="personality">Personality</option>
            <option value="interest">Interest</option>
            <option value="compiled">Career Guide</option>
          </select>
        </div>

        {/* Unreported sessions — needs report generation */}
        {unreported.length > 0 && (
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold" style={{ color: 'var(--ink)' }}>
                  {unreported.length} Completed Session{unreported.length > 1 ? 's' : ''} Without Reports
                </h3>
                <p className="text-xs mt-1" style={{ color: 'var(--slate)' }}>
                  Generate reports for these sessions
                </p>
              </div>
            </div>
            <div>
              {unreported.slice(0, 5).map(s => (
                <div
                  key={s.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-3"
                  style={{ borderBottom: '1px solid var(--border)' }}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate" style={{ color: 'var(--ink)' }}>{s.user_name}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--slate)' }}>{s.battery_name}</div>
                  </div>
                  <button
                    onClick={() => generateReport(s.id)}
                    className="btn-secondary !px-4 !py-2 text-xs flex-shrink-0"
                  >
                    Generate Report
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reports table */}
        <div className="card overflow-hidden animate-fade-up">
          {loading ? (
            <div className="p-16 text-center text-sm" style={{ color: 'var(--slate-light)' }}>Loading reports…</div>
          ) : reports.length === 0 ? (
            <div className="p-20 text-center">
              <div
                className="w-14 h-14 rounded-md flex items-center justify-center mx-auto mb-4"
                style={{ background: 'var(--warm)' }}
              >
                <FileText size={24} style={{ color: 'var(--slate-light)' }} />
              </div>
              <div className="text-base font-semibold" style={{ color: 'var(--ink)' }}>No reports yet</div>
              <p className="text-sm mt-1.5" style={{ color: 'var(--slate)' }}>Complete a session to generate the first report</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-pro">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Source</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map(r => {
                    const tm = TYPE_META[r.report_type] || TYPE_META.comprehensive;
                    const Icon = tm.icon;
                    const statusStyle = STATUS_STYLE[r.status] || STATUS_STYLE.draft;
                    const statusLbl = STATUS_LABEL[r.status] || r.status;
                    return (
                      <tr key={r.id}>
                        <td>
                          <div className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{r.first_name} {r.last_name}</div>
                          <div className="text-xs mt-0.5" style={{ color: 'var(--slate)' }}>{r.grade} {r.section}</div>
                        </td>
                        <td>
                          {r.source_name ? (
                            <span className="chip">{r.source_name}</span>
                          ) : (
                            <span style={{ color: 'var(--slate-light)' }} className="text-xs">—</span>
                          )}
                        </td>
                        <td>
                          <span className="chip">
                            <Icon size={12} /> {tm.label}
                          </span>
                        </td>
                        <td>
                          <span className="badge" style={statusStyle}>
                            {statusLbl}
                          </span>
                        </td>
                        <td className="text-xs tabular-nums" style={{ color: 'var(--slate)' }}>
                          {new Date(r.created_at).toLocaleDateString()}
                        </td>
                        <td>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => navigate(`/admin/reports/${r.id}`)}
                              className="btn-ghost !p-2"
                              title="View"
                            >
                              <Eye size={14} />
                            </button>
                            {r.status !== 'published' && (
                              <button
                                onClick={() => publishReport(r.id)}
                                className="btn-ghost !p-2"
                                title="Publish"
                                style={{ color: 'var(--sage)' }}
                              >
                                <Check size={14} />
                              </button>
                            )}
                            <button
                              onClick={() => setShareModal(r)}
                              className="btn-ghost !p-2"
                              title="Share"
                              style={{ color: 'var(--blush)' }}
                            >
                              <Send size={14} />
                            </button>
                            <button
                              onClick={() => setAccessModal(r)}
                              className="btn-ghost !p-2"
                              title="Report Access"
                            >
                              <Shield size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Share Modal */}
      {shareModal && <ShareModal report={shareModal} onShare={shareReport} onClose={() => setShareModal(null)} />}

      {/* Report Access Modal */}
      {accessModal && (
        <ReportAccessModal
          reportId={accessModal.id}
          studentId={accessModal.user_id}
          onClose={() => setAccessModal(null)}
        />
      )}

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
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: 'rgba(10, 22, 40, 0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="card shadow-lg w-full max-w-md p-6"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-lg font-display" style={{ color: 'var(--ink)' }}>Share Report</h2>
        <p className="text-sm mt-1 mb-5" style={{ color: 'var(--slate)' }}>
          {tm.label} report for {report.first_name} {report.last_name}
        </p>

        <div className="space-y-4 mb-5">
          <div>
            <label className="label-overline block mb-2">Share Method</label>
            <div
              className="flex items-center gap-1 p-1 rounded-md"
              style={{ background: 'var(--warm)', border: '1px solid var(--border)' }}
            >
              {[['dashboard', 'Dashboard'], ['email', 'Email'], ['link', 'Copy Link']].map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setMethod(val)}
                  className="flex-1 px-3 py-2 rounded-sm text-xs font-medium transition-all"
                  style={
                    method === val
                      ? { background: 'var(--blush-pale)', color: 'var(--blush)' }
                      : { background: 'transparent', color: 'var(--slate)' }
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label-overline block mb-2">Share With</label>
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={method === 'dashboard' ? 'student or counselor@school.com' : 'email@example.com'}
              className="input-field"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button
            onClick={() => onShare(report.id, email || 'student', method)}
            disabled={!email && method === 'email'}
            className="btn-primary flex-1"
          >
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
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: 'rgba(10, 22, 40, 0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="card shadow-lg w-full max-w-md p-6"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-lg font-display" style={{ color: 'var(--ink)' }}>Compile Career Report</h2>
        <p className="text-sm mt-1 mb-5" style={{ color: 'var(--slate)' }}>
          Combines all completed assessments (aptitude + personality + interest) into a career guidance
          report with recommendations and match percentages.
        </p>

        <div className="mb-5">
          <label className="label-overline block mb-2">Select Student</label>
          <select
            value={selectedStudent}
            onChange={e => setSelectedStudent(e.target.value)}
            className="input-field"
          >
            <option value="">Choose a student…</option>
            {students.map(s => (
              <option key={s.id} value={s.id}>{s.first_name} {s.last_name} — {s.grade || ''}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button
            onClick={() => onCompile(selectedStudent)}
            disabled={!selectedStudent}
            className="btn-primary flex-1"
          >
            Compile Report
          </button>
        </div>
      </div>
    </div>
  );
}
