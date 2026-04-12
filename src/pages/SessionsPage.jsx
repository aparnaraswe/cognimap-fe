import { useState, useEffect, useCallback } from 'react';
import { useBatch } from '../context/BatchContext';
import BatchFilter from '../components/BatchFilter';
import api from '../utils/api';
import { RefreshCw } from 'lucide-react';

const STATUS_COLORS = {
  assigned:    'bg-ivory-100 text-ink-faint',
  in_progress: 'bg-blue-50 text-blue-600',
  completed:   'bg-emerald-50 text-emerald-600',
  timed_out:   'bg-red-50 text-red-600',
  abandoned:   'bg-ivory-100 text-ink-faint',
};

export default function SessionsPage() {
  const { activeBatchId, activeBatch } = useBatch();
  const [sessions, setSessions]         = useState([]);
  const [total, setTotal]               = useState(0);
  const [loading, setLoading]           = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: 100, sortBy: 'created_at', sortDir: 'desc' });
    if (statusFilter)   params.set('status',  statusFilter);
    if (activeBatchId)  params.set('batchId', activeBatchId);
    api.get(`/sessions?${params}`)
      .then(d => { setSessions(d.sessions || []); setTotal(d.total || 0); })
      .catch(() => { setSessions([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [statusFilter, activeBatchId]);

  useEffect(() => { load(); }, [load]);

  const toggleSession = async (id, currentOpen) => {
    try {
      await api.patch(`/sessions/${id}/toggle`, { isOpen: !currentOpen });
      setSessions(ss => ss.map(s => s.id === id ? { ...s, is_open: !currentOpen } : s));
    } catch (err) { alert(err.message); }
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      {/* Page header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-black text-ink">Test Sessions</h1>
          <p className="text-xs text-ink-dim mt-0.5">
            {total} session{total !== 1 ? 's' : ''}
            {activeBatch ? ` · ${activeBatch.name}` : ' · all batches'}
          </p>
        </div>
        <button onClick={load}
          className="p-2.5 rounded-xl border-2 border-ivory-200 text-ink-faint hover:text-ink hover:border-amber-200 transition-colors">
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Batch filter */}
      <div className="mb-5">
        <BatchFilter />
      </div>

      {/* Status filter pills */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {['', 'assigned', 'in_progress', 'completed', 'timed_out'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              statusFilter === s
                ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-sm'
                : 'bg-white border-2 border-ivory-200 text-ink-dim hover:border-amber-200 hover:text-amber-700'
            }`}>
            {s ? s.replace('_', ' ') : 'All'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border-2 border-ivory-200 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center">
            <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <div className="text-sm text-ink-faint">Loading sessions…</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-ivory-200 bg-ivory-100">
                  {['Student', 'Source', 'Battery', 'Status', 'Open', 'Started', 'Completed', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-bold text-ink-faint uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sessions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center">
                      <div className="text-2xl mb-2">📋</div>
                      <div className="text-sm font-bold text-ink-dim">No sessions found</div>
                      {activeBatch && (
                        <div className="text-xs text-ink-faint mt-1">
                          No sessions for <strong>{activeBatch.name}</strong> yet
                        </div>
                      )}
                    </td>
                  </tr>
                ) : sessions.map(s => (
                  <tr key={s.id} className="border-b border-ivory-200/50 hover:bg-ivory-50 transition-colors group">
                    {/* Student */}
                    <td className="px-4 py-3">
                      <div className="font-bold text-[13px] text-ink">{s.user_name}</div>
                      <div className="text-[11px] text-ink-faint">{s.user_email}</div>
                    </td>
                    {/* Source */}
                    <td className="px-4 py-3">
                      {s.source_name ? (
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-lg text-[10px] font-bold">
                          {s.source_name}
                        </span>
                      ) : (
                        <span className="text-ink-faint text-[12px]">—</span>
                      )}
                    </td>
                    {/* Battery */}
                    <td className="px-4 py-3 text-ink-dim text-[12px]">{s.battery_name || '—'}</td>
                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${STATUS_COLORS[s.status] || ''}`}>
                        {s.status?.replace('_', ' ')}
                      </span>
                    </td>
                    {/* Open dot */}
                    <td className="px-4 py-3">
                      <span className={`w-2.5 h-2.5 rounded-full inline-block ${s.is_open ? 'bg-emerald-400' : 'bg-ivory-200'}`} />
                    </td>
                    {/* Dates */}
                    <td className="px-4 py-3 text-[11px] font-mono text-ink-faint whitespace-nowrap">
                      {s.started_at ? new Date(s.started_at).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-[11px] font-mono text-ink-faint whitespace-nowrap">
                      {s.completed_at ? new Date(s.completed_at).toLocaleString() : '—'}
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleSession(s.id, s.is_open)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                          s.is_open
                            ? 'bg-red-50 text-red-600 hover:bg-red-100'
                            : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                        }`}>
                        {s.is_open ? 'Close' : 'Open'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
