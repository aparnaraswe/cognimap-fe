import { useState, useEffect } from 'react';
import api from '../utils/api';

export default function SessionsPage() {
  const [sessions, setSessions] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    const params = new URLSearchParams({ limit: 50, sortBy: 'created_at', sortDir: 'desc' });
    if (statusFilter) params.set('status', statusFilter);
    api.get(`/sessions?${params}`)
      .then(data => { setSessions(data.sessions || []); setTotal(data.total || 0); })
      .catch(() => { setSessions([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [statusFilter]);

  const toggleSession = async (id, currentOpen) => {
    try {
      await api.patch(`/sessions/${id}/toggle`, { isOpen: !currentOpen });
      setSessions(ss => ss.map(s => s.id === id ? {...s, is_open: !currentOpen} : s));
    } catch (err) { alert(err.message); }
  };

  const statusColors = {
    assigned: 'bg-ivory-100 text-ink-faint',
    in_progress: 'bg-blue-50 text-blue-600',
    completed: 'bg-emerald-50 text-emerald-600',
    timed_out: 'bg-red-50 text-red-600',
    abandoned: 'bg-ivory-100 text-ink-faint',
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-black text-ink">Test Sessions</h1>
          <p className="text-xs text-ink-dim mt-0.5">{total} sessions total</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-5">
        {['','assigned','in_progress','completed','timed_out'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === s ? 'bg-copper text-white' : 'bg-white border-2 border-ivory-200 text-ink-dim hover:border-gold'
            }`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border-2 border-ivory-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-ivory-200 bg-ivory-100">
              {['Student','Battery','Status','Open','Started','Completed','Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[10px] font-bold text-ink-faint uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-ink-faint">Loading...</td></tr>
            ) : sessions.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-ink-faint">No sessions found.</td></tr>
            ) : sessions.map(s => (
              <tr key={s.id} className="border-b border-ivory-200/50 hover:bg-ivory-100/50 transition-colors">
                <td className="px-4 py-3 font-semibold">{s.user_name || s.user_id?.slice(0,8)}</td>
                <td className="px-4 py-3 text-ink-dim">{s.battery_name || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${statusColors[s.status] || ''}`}>
                    {s.status?.replace('_',' ')}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`w-2.5 h-2.5 rounded-full inline-block ${s.is_open ? 'bg-emerald-400' : 'bg-ivory-200'}`}/>
                </td>
                <td className="px-4 py-3 text-xs font-mono text-ink-faint">{s.started_at ? new Date(s.started_at).toLocaleString() : '—'}</td>
                <td className="px-4 py-3 text-xs font-mono text-ink-faint">{s.completed_at ? new Date(s.completed_at).toLocaleString() : '—'}</td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleSession(s.id, s.is_open)}
                    className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
                      s.is_open ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                    }`}>
                    {s.is_open ? 'Close' : 'Open'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
