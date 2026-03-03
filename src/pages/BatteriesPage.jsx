import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const DOMAINS = { gf:'Fluid Reasoning (Gf)', gv:'Visual Spatial (Gv)', gq:'Quantitative (Gq)', gc:'Verbal (Gc)', gs:'Processing Speed (Gs)', personality:'Personality', interest:'Interest' };

export default function BatteriesPage() {
  const [batteries, setBatteries] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.get('/batteries');
      setBatteries(d.batteries || []);
      setTotal(d.total || 0);
    } catch { setBatteries([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-black text-ink">Test Batteries</h1>
          <p className="text-xs text-ink-dim mt-0.5">{total} batteries configured</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="px-5 py-2.5 bg-copper text-white font-bold rounded-xl text-sm shadow-[0_3px_0_#92400E] hover:-translate-y-0.5 transition-all">
          + Create Battery
        </button>
      </div>

      {showCreate && <CreateBattery onClose={() => { setShowCreate(false); fetch(); }}/>}

      <div className="flex flex-col gap-3">
        {loading ? <div className="p-8 text-center text-sm text-ink-faint">Loading...</div> :
         batteries.length === 0 ? <div className="bg-white border-2 border-ivory-200 rounded-2xl p-8 text-center text-sm text-ink-faint">
            No batteries yet. Create one to start assigning tests.
          </div> :
         batteries.map(b => (
          <div key={b.id} className="bg-white border-2 border-ivory-200 rounded-2xl p-5 hover:border-gold/50 transition-all">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-bold text-ink">{b.name}</div>
                {b.description && <div className="text-xs text-ink-faint mt-0.5">{b.description}</div>}
                <div className="flex gap-2 mt-2">
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-ivory-100 text-ink-dim">{b.audience}</span>
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-ivory-100 text-ink-dim">{b.section_count} section{b.section_count !== 1 ? 's' : ''}</span>
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-ivory-100 text-ink-dim">{b.session_count} session{b.session_count !== 1 ? 's' : ''}</span>
                  {!b.is_active && <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-red-50 text-red-600">Inactive</span>}
                </div>
              </div>
              <div className="text-xs font-mono text-ink-faint">{new Date(b.created_at).toLocaleDateString()}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CreateBattery({ onClose }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [audience, setAudience] = useState('student');
  const [sections, setSections] = useState([{ name: 'Pattern Reasoning', domain: 'gf', selectionMode: 'auto', config: { count: 50, difficultyRange: [1, 4] } }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const addSection = () => setSections(s => [...s, { name: '', domain: 'personality', selectionMode: 'auto', config: { count: 20, difficultyRange: [1, 5] } }]);
  const removeSection = (i) => setSections(s => s.filter((_, j) => j !== i));
  const updateSection = (i, key, val) => setSections(s => s.map((sec, j) => j === i ? {...sec, [key]: val} : sec));
  const updateConfig = (i, key, val) => setSections(s => s.map((sec, j) => j === i ? {...sec, config: {...sec.config, [key]: val}} : sec));

  const save = async () => {
    if (!name) { setError('Battery name is required'); return; }
    if (sections.some(s => !s.name || !s.domain)) { setError('All sections need a name and domain'); return; }
    setSaving(true); setError('');
    try {
      await api.post('/batteries', { name, description: desc, audience, type: 'custom', sections });
      onClose();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="bg-white border-2 border-gold rounded-2xl p-6 mb-6 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-ink">Create New Battery</h2>
        <button onClick={onClose} className="text-xs font-bold text-ink-faint hover:text-ink">✕ Cancel</button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <label className="block">
          <span className="text-[10px] font-bold text-ink-faint uppercase tracking-wider">Battery Name *</span>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            className="w-full mt-1 px-3 py-2 bg-ivory-100 border-2 border-ivory-200 rounded-xl text-sm font-semibold outline-none focus:border-gold"
            placeholder="e.g. Career Guidance Battery (8-11)"/>
        </label>
        <label className="block">
          <span className="text-[10px] font-bold text-ink-faint uppercase tracking-wider">Audience</span>
          <select value={audience} onChange={e => setAudience(e.target.value)}
            className="w-full mt-1 px-3 py-2 bg-ivory-100 border-2 border-ivory-200 rounded-xl text-sm font-bold outline-none focus:border-gold">
            <option value="student">Student</option>
            <option value="employee">Employee</option>
            <option value="both">Both</option>
          </select>
        </label>
      </div>
      <label className="block mb-4">
        <span className="text-[10px] font-bold text-ink-faint uppercase tracking-wider">Description</span>
        <input type="text" value={desc} onChange={e => setDesc(e.target.value)}
          className="w-full mt-1 px-3 py-2 bg-ivory-100 border-2 border-ivory-200 rounded-xl text-sm font-semibold outline-none focus:border-gold"
          placeholder="Optional description"/>
      </label>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-ink-faint uppercase tracking-wider">Test Sections</span>
          <button onClick={addSection} className="text-xs font-bold text-gold hover:text-gold-dark">+ Add Section</button>
        </div>
        <div className="flex flex-col gap-2">
          {sections.map((sec, i) => (
            <div key={i} className="bg-ivory-100 rounded-xl p-3 flex gap-3 items-end">
              <label className="flex-1">
                <span className="text-[9px] font-bold text-ink-faint">Section Name</span>
                <input type="text" value={sec.name} onChange={e => updateSection(i, 'name', e.target.value)}
                  className="w-full mt-0.5 px-2 py-1.5 bg-white border border-ivory-200 rounded-lg text-xs font-semibold outline-none focus:border-gold"
                  placeholder="e.g. Pattern Reasoning"/>
              </label>
              <label className="w-36">
                <span className="text-[9px] font-bold text-ink-faint">Domain</span>
                <select value={sec.domain} onChange={e => updateSection(i, 'domain', e.target.value)}
                  className="w-full mt-0.5 px-2 py-1.5 bg-white border border-ivory-200 rounded-lg text-xs font-bold outline-none focus:border-gold">
                  {Object.entries(DOMAINS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </label>
              <label className="w-20">
                <span className="text-[9px] font-bold text-ink-faint">Items</span>
                <input type="number" value={sec.config.count} onChange={e => updateConfig(i, 'count', parseInt(e.target.value) || 20)}
                  className="w-full mt-0.5 px-2 py-1.5 bg-white border border-ivory-200 rounded-lg text-xs font-bold outline-none focus:border-gold text-center"/>
              </label>
              {sections.length > 1 && (
                <button onClick={() => removeSection(i)} className="text-xs font-bold text-red-600 hover:text-red-700 pb-1">✕</button>
              )}
            </div>
          ))}
        </div>
      </div>

      {error && <div className="mb-3 px-3 py-2 bg-red-50 border border-danger/20 rounded-xl text-xs font-bold text-red-600">{error}</div>}

      <button onClick={save} disabled={saving}
        className="w-full py-3 bg-copper text-white font-black rounded-2xl text-sm shadow-[0_4px_0_#92400E] hover:-translate-y-0.5 active:translate-y-0.5 transition-all disabled:opacity-50">
        {saving ? 'Creating...' : 'Create Battery'}
      </button>
    </div>
  );
}
