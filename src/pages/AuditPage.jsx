import { useState, useEffect } from 'react';
import api from '../utils/api';

export default function AuditPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    api.get(`/audit?page=${page}&limit=50`)
      .then(d => { setLogs(d.logs || d.rows || []); setTotal(d.total || 0); })
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [page]);

  const actionColors = {
    'session.started': 'bg-blue-50 text-blue-600',
    'session.completed': 'bg-emerald-50 text-emerald-600',
    'report.generated': 'bg-purple-50 text-purple-600',
    'report.published': 'bg-emerald-50 text-emerald-600',
    'setting.updated': 'bg-amber-50 text-amber-600',
    'item.uploaded': 'bg-blue-50 text-blue-600',
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-xl font-black text-ink">Audit Log</h1>
        <p className="text-xs text-ink-dim mt-0.5">{total} entries · System activity trail</p>
      </div>

      <div className="bg-white border-2 border-ivory-200 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-ink-faint">Loading...</div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-ivory-200 bg-ivory-100">
                  {['When','User','Action','Resource','Details'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-bold text-ink-faint uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((l, i) => (
                  <tr key={l.id || i} className="border-b border-ivory-200/50 hover:bg-ivory-100/50 transition-colors">
                    <td className="px-4 py-3 text-xs text-ink-faint font-mono whitespace-nowrap">
                      {l.created_at ? new Date(l.created_at).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3 font-semibold text-xs">{l.user_name || l.user_id?.slice(0,8) || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${actionColors[l.action] || 'bg-ivory-100 text-ink-faint'}`}>
                        {l.action || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-faint">{l.resource_type || '—'}</td>
                    <td className="px-4 py-3 text-xs text-ink-faint max-w-xs truncate">
                      {l.details?.description || l.description || JSON.stringify(l.details || {}).slice(0, 100)}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-ink-faint">No audit entries yet</td></tr>
                )}
              </tbody>
            </table>
            {total > 50 && (
              <div className="p-4 flex justify-center gap-3">
                <button disabled={page <= 1} onClick={() => setPage(p => p-1)}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-ivory-100 text-ink-dim disabled:opacity-30">← Prev</button>
                <span className="text-xs text-ink-faint py-1.5">Page {page} of {Math.ceil(total/50)}</span>
                <button disabled={page >= Math.ceil(total/50)} onClick={() => setPage(p => p+1)}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-ivory-100 text-ink-dim disabled:opacity-30">Next →</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
