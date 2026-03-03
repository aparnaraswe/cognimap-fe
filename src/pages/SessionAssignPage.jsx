import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

export default function SessionAssignPage() {
  const navigate = useNavigate();
  const [batteries, setBatteries] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedBattery, setSelectedBattery] = useState('');
  const [selectedStudents, setSelectedStudents] = useState(new Set());
  const [generateTokens, setGenerateTokens] = useState(true);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [searchQ, setSearchQ] = useState('');

  useEffect(() => {
    api.get('/batteries?status=active').then(d => setBatteries(d.batteries || [])).catch(() => {});
    // Fetch students — in real app this would be paginated/filtered
    api.get('/auth/users?role=student&limit=200').then(d => setStudents(d.users || d || [])).catch(() => {});
  }, []);

  const toggleStudent = (id) => {
    setSelectedStudents(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    const filtered = filteredStudents.map(s => s.id);
    if (filtered.every(id => selectedStudents.has(id))) {
      setSelectedStudents(prev => { const n = new Set(prev); filtered.forEach(id => n.delete(id)); return n; });
    } else {
      setSelectedStudents(prev => { const n = new Set(prev); filtered.forEach(id => n.add(id)); return n; });
    }
  };

  const assign = async () => {
    if (!selectedBattery) { setError('Select a battery'); return; }
    if (selectedStudents.size === 0) { setError('Select at least one student'); return; }
    setSaving(true); setError('');
    try {
      const d = await api.post('/sessions/assign', {
        batteryId: selectedBattery,
        userIds: [...selectedStudents],
        generateTokens
      });
      setResult(d);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const filteredStudents = students.filter(s => {
    if (!searchQ) return true;
    const q = searchQ.toLowerCase();
    return (s.first_name||'').toLowerCase().includes(q) ||
           (s.last_name||'').toLowerCase().includes(q) ||
           (s.email||'').toLowerCase().includes(q) ||
           (s.grade||'').toLowerCase().includes(q);
  });

  // Success screen
  if (result) return (
    <div className="p-6 lg:p-8 max-w-2xl">
      <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-6 text-center">
        <div className="text-4xl mb-3">✅</div>
        <div className="text-lg font-black text-emerald-700 mb-2">Tests Assigned!</div>
        <div className="text-sm text-emerald-600 mb-4">
          {result.sessions?.length || 0} sessions created
          {result.tokens?.length > 0 && ` · ${result.tokens.length} access tokens generated`}
        </div>

        {result.tokens?.length > 0 && (
          <div className="bg-white rounded-xl p-4 mb-4 text-left max-h-60 overflow-auto">
            <div className="text-[10px] font-bold text-ink-faint uppercase tracking-wider mb-2">Access Tokens</div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-ivory-200">
                  <th className="text-left py-1 font-bold text-ink-faint">Student</th>
                  <th className="text-left py-1 font-bold text-ink-faint">Token</th>
                </tr>
              </thead>
              <tbody>
                {result.tokens.map((t, i) => (
                  <tr key={i} className="border-b border-ivory-200/30">
                    <td className="py-1.5 text-ink-dim">{t.userId?.slice(0,8)}</td>
                    <td className="py-1.5 font-mono font-bold text-gold tracking-widest">{t.token}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <button onClick={() => navigate('/admin/sessions')}
            className="px-5 py-2.5 bg-copper text-white font-bold rounded-xl text-sm">View Sessions →</button>
          <button onClick={() => { setResult(null); setSelectedStudents(new Set()); }}
            className="px-5 py-2.5 bg-white border-2 border-ivory-200 text-ink-dim font-bold rounded-xl text-sm hover:border-gold">
            Assign More</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <button onClick={() => navigate('/admin/sessions')} className="text-xs font-bold text-gold hover:text-gold-dark mb-4 inline-block">
        ← Back to Sessions
      </button>
      <h1 className="text-xl font-black text-ink-DEFAULT mb-2">Assign Test Battery</h1>
      <p className="text-sm text-ink-dim mb-6">Select a battery and choose which students should take it.</p>

      {/* Step 1: Battery */}
      <div className="mb-6">
        <label className="text-xs font-bold text-ink-faint uppercase tracking-wider">1 · Select Battery *</label>
        <select value={selectedBattery} onChange={e => setSelectedBattery(e.target.value)}
          className="block w-full mt-1.5 px-4 py-3 bg-white border-2 border-ivory-200 rounded-xl text-sm font-bold outline-none focus:border-gold">
          <option value="">Choose a battery...</option>
          {batteries.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        {batteries.length === 0 && (
          <p className="text-xs text-ink-faint mt-1">No batteries found. <button onClick={() => navigate('/admin/batteries')} className="text-gold font-bold">Create one first →</button></p>
        )}
      </div>

      {/* Step 2: Students */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-bold text-ink-faint uppercase tracking-wider">2 · Select Students ({selectedStudents.size} selected)</label>
          <button onClick={selectAll} className="text-xs font-bold text-gold hover:text-gold-dark">Toggle All</button>
        </div>
        <input type="text" value={searchQ} onChange={e => setSearchQ(e.target.value)}
          className="w-full mb-2 px-3 py-2 bg-white border-2 border-ivory-200 rounded-xl text-xs font-semibold outline-none focus:border-gold"
          placeholder="Search by name, email, or grade..."/>
        <div className="bg-white border-2 border-ivory-200 rounded-2xl max-h-72 overflow-auto">
          {filteredStudents.length === 0 ? (
            <div className="p-6 text-center text-xs text-ink-faint">No students found. Register students first via the API.</div>
          ) : filteredStudents.map(s => (
            <label key={s.id} className={`flex items-center gap-3 px-4 py-2.5 border-b border-ivory-200/30 cursor-pointer hover:bg-ivory-100/50 transition-colors ${selectedStudents.has(s.id) ? 'bg-amber-50/50' : ''}`}>
              <input type="checkbox" checked={selectedStudents.has(s.id)} onChange={() => toggleStudent(s.id)}
                className="w-4 h-4 rounded accent-amber-500"/>
              <div className="flex-1">
                <div className="text-sm font-semibold text-ink">{s.first_name} {s.last_name || ''}</div>
                <div className="text-[10px] text-ink-faint">{s.email || 'No email'} {s.grade ? `· ${s.grade}` : ''} {s.section ? s.section : ''}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Options */}
      <label className="flex items-center gap-3 mb-6 cursor-pointer">
        <input type="checkbox" checked={generateTokens} onChange={e => setGenerateTokens(e.target.checked)}
          className="w-4 h-4 rounded accent-amber-500"/>
        <div>
          <div className="text-sm font-bold text-ink">Generate access tokens</div>
          <div className="text-[10px] text-ink-faint">Create short codes students can use to access their test without logging in</div>
        </div>
      </label>

      {error && <div className="mb-4 px-4 py-2.5 bg-red-50 border border-danger/20 rounded-xl text-xs font-bold text-red-600">{error}</div>}

      <button onClick={assign} disabled={saving}
        className="w-full py-3.5 bg-copper text-white font-black rounded-2xl text-sm shadow-[0_4px_0_#92400E] hover:-translate-y-0.5 active:translate-y-0.5 transition-all disabled:opacity-50">
        {saving ? 'Assigning...' : `Assign to ${selectedStudents.size} Student${selectedStudents.size !== 1 ? 's' : ''}`}
      </button>
    </div>
  );
}
