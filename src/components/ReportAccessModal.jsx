import { useState, useEffect } from 'react';
import api from '../utils/api';

export default function ReportAccessModal({ reportId, studentId, onClose }) {
  const [guardians, setGuardians] = useState([]);
  const [currentAccess, setCurrentAccess] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      // Get all guardians/teachers assigned to this student
      api.get(`/auth/users?role=guardian&limit=200`).catch(() => ({ users: [] })),
      api.get(`/auth/users?role=teacher&limit=200`).catch(() => ({ users: [] })),
      // Get current access list for this report
      api.get(`/guardians/report-access/${reportId}`).catch(() => ({ access: [] })),
    ]).then(([gR, tR, aR]) => {
      const allGuardians = [...(gR.users || []), ...(tR.users || [])];
      setGuardians(allGuardians);
      setCurrentAccess(new Set((aR.access || []).map(a => a.user_id)));
    }).finally(() => setLoading(false));
  }, [reportId, studentId]);

  const toggle = (userId) => {
    setCurrentAccess(prev => {
      const next = new Set(prev);
      next.has(userId) ? next.delete(userId) : next.add(userId);
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.post(`/guardians/report-access/${reportId}`, { userIds: [...currentAccess] });
      onClose();
    } catch (e) { alert(e.message); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl border-2 w-full max-w-md max-h-[80vh] overflow-hidden shadow-2xl"
        style={{ borderColor: 'var(--border)' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-bold" style={{ color: 'var(--ink)' }}>Report Access Control</div>
              <div className="text-[10px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>
                Select who can view this report (guardians & teachers)
              </div>
            </div>
            <button onClick={onClose} className="text-lg" style={{ color: 'var(--ink-faint)' }}>x</button>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-3 max-h-80 overflow-y-auto">
          {loading ? (
            <div className="py-8 text-center text-xs" style={{ color: 'var(--ink-faint)' }}>Loading...</div>
          ) : guardians.length === 0 ? (
            <div className="py-8 text-center">
              <div className="text-2xl mb-2">👥</div>
              <div className="text-xs" style={{ color: 'var(--ink-faint)' }}>
                No guardians or teachers found. Create them in the Users page first.
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--ink-faint)' }}>
                {guardians.length} guardian{guardians.length !== 1 ? 's' : ''} / teacher{guardians.length !== 1 ? 's' : ''} available
              </div>
              {guardians.map(g => (
                <label key={g.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-blue-50 transition-colors"
                  style={{ background: currentAccess.has(g.id) ? '#eef2ff' : undefined }}>
                  <input
                    type="checkbox"
                    checked={currentAccess.has(g.id)}
                    onChange={() => toggle(g.id)}
                    className="rounded"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                      {g.first_name} {g.last_name}
                    </div>
                    <div className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>{g.email}</div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg capitalize"
                    style={{
                      background: g.role === 'teacher' ? '#fef3c7' : '#ede9fe',
                      color: g.role === 'teacher' ? '#92400e' : '#5b21b6'
                    }}>
                    {g.role}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
          <div className="text-[10px] font-semibold" style={{ color: 'var(--ink-faint)' }}>
            {currentAccess.size} selected · {currentAccess.size === 0 ? 'All guardians can view (no restrictions)' : 'Only selected users can view'}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl border"
              style={{ borderColor: 'var(--border)', color: 'var(--ink-soft)' }}>
              Cancel
            </button>
            <button onClick={save} disabled={saving}
              className="px-4 py-2 text-xs font-bold rounded-xl text-white"
              style={{ background: '#6366f1' }}>
              {saving ? 'Saving...' : 'Save Access'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
