import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import {
  Sliders, Briefcase, Target, LayoutList, GitBranch, FileText,
  Plus, Trash2, Edit, Save, ChevronDown, ChevronRight, Search, X
} from 'lucide-react';

// ══════════════════════════════════════════════════════════
// REPORT CONFIGURATION PAGE
// Super admin can configure:
//   • Career match weights (aptitude/interest/personality)
//   • Career database (CRUD)
//   • Scoring thresholds
//   • Report sections toggle
//   • Cluster formulas
//   • Narrative templates
// ══════════════════════════════════════════════════════════

const TABS = [
  { id: 'weights', label: 'Match Weights', icon: Sliders },
  { id: 'careers', label: 'Career Database', icon: Briefcase },
  { id: 'thresholds', label: 'Scoring Thresholds', icon: Target },
  { id: 'sections', label: 'Report Sections', icon: LayoutList },
  { id: 'formulas', label: 'Cluster Formulas', icon: GitBranch },
  { id: 'narratives', label: 'Narrative Templates', icon: FileText },
];

const CLUSTERS = ['analytical', 'design', 'communication', 'operational', 'strategic'];
const DOMAINS = ['gf', 'gv', 'gq', 'gc', 'gs'];
const PERSONALITY_TRAITS = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'];
const RIASEC_DIMS = ['realistic', 'investigative', 'artistic', 'social', 'enterprising', 'conventional'];
const LEVELS_4 = ['exceptional', 'advanced', 'age_appropriate', 'developing'];
const LEVELS_3 = ['high', 'moderate', 'low'];
const INTEREST_LEVELS = ['strong', 'moderate', 'low'];

function Toast({ message, type, onClose }) {
  if (!message) return null;
  return (
    <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl text-sm font-bold shadow-lg transition-all ${type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}`}>
      {message}
      <button onClick={onClose} className="ml-3 opacity-70 hover:opacity-100">
        <X size={14} />
      </button>
    </div>
  );
}

// ── MATCH WEIGHTS TAB ──
function MatchWeightsTab({ config, onSave }) {
  const initial = config?.career_match_weights || { aptitude: 0.40, interest: 0.35, personality: 0.25 };
  const [weights, setWeights] = useState({
    aptitude: Math.round(initial.aptitude * 100),
    interest: Math.round(initial.interest * 100),
    personality: Math.round(initial.personality * 100),
  });
  const [saving, setSaving] = useState(false);

  const total = weights.aptitude + weights.interest + weights.personality;

  const handleChange = (key, val) => {
    setWeights(w => ({ ...w, [key]: Number(val) }));
  };

  const save = async () => {
    if (total !== 100) return;
    setSaving(true);
    await onSave('career_match_weights', {
      aptitude: weights.aptitude / 100,
      interest: weights.interest / 100,
      personality: weights.personality / 100,
    });
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border-2 border-ivory-200 rounded-2xl p-6">
        <h3 className="text-sm font-black text-ink-DEFAULT mb-1">Career Match Weights</h3>
        <p className="text-xs text-ink-faint mb-6">Adjust how much each dimension contributes to the overall career match score. Values must sum to 100.</p>

        {['aptitude', 'interest', 'personality'].map(key => (
          <div key={key} className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-ink capitalize">{key}</span>
              <span className="text-sm font-black text-ink">{weights[key]}%</span>
            </div>
            <input
              type="range" min="0" max="100" value={weights[key]}
              onChange={e => handleChange(key, e.target.value)}
              className="w-full h-2 bg-ivory-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
            />
          </div>
        ))}

        <div className={`flex items-center justify-between mt-4 px-4 py-3 rounded-xl ${total === 100 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          <span className="text-sm font-bold">Total</span>
          <span className="text-sm font-black">{total}% {total === 100 ? '(Valid)' : '(Must equal 100)'}</span>
        </div>
      </div>

      <button onClick={save} disabled={saving || total !== 100}
        className="w-full py-3 bg-copper text-white font-black rounded-2xl text-sm shadow-[0_4px_0_#92400E] hover:-translate-y-0.5 active:translate-y-0.5 transition-all disabled:opacity-50">
        {saving ? 'Saving...' : 'Save Match Weights'}
      </button>
    </div>
  );
}

// ── CAREER DATABASE TAB ──
function CareerDatabaseTab({ onToast }) {
  const [careers, setCareers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [fieldFilter, setFieldFilter] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const emptyCareer = {
    name: '', field: '', aptitude_cluster: 'analytical', min_aptitude: 0, riasec: '',
    personality_traits: {}, flag_condition: '', degrees: [], institutions: [],
  };
  const [form, setForm] = useState({ ...emptyCareer });

  const loadCareers = async () => {
    try {
      const d = await api.get('/report-config/careers');
      setCareers(d.careers || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { loadCareers(); }, []);

  const fields = [...new Set(careers.map(c => c.field).filter(Boolean))];

  const filtered = careers.filter(c => {
    const matchSearch = !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.field?.toLowerCase().includes(search.toLowerCase());
    const matchField = !fieldFilter || c.field === fieldFilter;
    return matchSearch && matchField;
  });

  const startEdit = (career) => {
    setForm({ ...emptyCareer, ...career });
    setEditingId(career.id);
    setShowForm(true);
  };

  const startAdd = () => {
    setForm({ ...emptyCareer });
    setEditingId(null);
    setShowForm(true);
  };

  const handleSave = async () => {
    try {
      if (editingId) {
        await api.put(`/report-config/careers/${editingId}`, form);
      } else {
        await api.post('/report-config/careers', form);
      }
      onToast(editingId ? 'Career updated' : 'Career created', 'success');
      setShowForm(false);
      setEditingId(null);
      loadCareers();
    } catch (e) {
      onToast(e.message, 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this career?')) return;
    try {
      await api.del(`/report-config/careers/${id}`);
      onToast('Career deleted', 'success');
      loadCareers();
    } catch (e) {
      onToast(e.message, 'error');
    }
  };

  // Dynamic list helpers
  const addDegree = () => setForm(f => ({ ...f, degrees: [...f.degrees, { name: '', match: '', sub: '' }] }));
  const removeDegree = (i) => setForm(f => ({ ...f, degrees: f.degrees.filter((_, j) => j !== i) }));
  const updateDegree = (i, key, val) => setForm(f => ({ ...f, degrees: f.degrees.map((d, j) => j === i ? { ...d, [key]: val } : d) }));

  const addInstitution = () => setForm(f => ({ ...f, institutions: [...f.institutions, { name: '', loc: '', type: 'india', tags: [], note: '' }] }));
  const removeInstitution = (i) => setForm(f => ({ ...f, institutions: f.institutions.filter((_, j) => j !== i) }));
  const updateInstitution = (i, key, val) => setForm(f => ({ ...f, institutions: f.institutions.map((inst, j) => j === i ? { ...inst, [key]: val } : inst) }));

  if (loading) return <div className="p-6 text-sm text-ink-faint">Loading...</div>;

  return (
    <div className="space-y-4">
      {/* Search & Filter */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search careers..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-ivory-200 rounded-xl text-sm font-semibold focus:border-gold focus:outline-none" />
        </div>
        <select value={fieldFilter} onChange={e => setFieldFilter(e.target.value)}
          className="px-4 py-2.5 bg-white border-2 border-ivory-200 rounded-xl text-sm font-semibold focus:border-gold focus:outline-none">
          <option value="">All Fields</option>
          {fields.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <button onClick={startAdd} className="px-4 py-2.5 bg-copper text-white text-sm font-bold rounded-xl flex items-center gap-2">
          <Plus size={16} /> Add Career
        </button>
      </div>

      {/* Career Form (inline) */}
      {showForm && (
        <div className="bg-white border-2 border-gold rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-black text-ink">{editingId ? 'Edit Career' : 'Add Career'}</h3>
            <button onClick={() => { setShowForm(false); setEditingId(null); }}><X size={18} className="text-ink-faint" /></button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-[10px] font-bold text-ink-faint uppercase tracking-wider">Name</span>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full mt-1 px-3 py-2 bg-ivory-100 border-2 border-ivory-200 rounded-xl text-sm font-bold focus:border-gold focus:outline-none" />
            </label>
            <label className="block">
              <span className="text-[10px] font-bold text-ink-faint uppercase tracking-wider">Field</span>
              <input value={form.field} onChange={e => setForm(f => ({ ...f, field: e.target.value }))}
                className="w-full mt-1 px-3 py-2 bg-ivory-100 border-2 border-ivory-200 rounded-xl text-sm font-bold focus:border-gold focus:outline-none" />
            </label>
            <label className="block">
              <span className="text-[10px] font-bold text-ink-faint uppercase tracking-wider">Aptitude Cluster</span>
              <select value={form.aptitude_cluster} onChange={e => setForm(f => ({ ...f, aptitude_cluster: e.target.value }))}
                className="w-full mt-1 px-3 py-2 bg-ivory-100 border-2 border-ivory-200 rounded-xl text-sm font-bold focus:border-gold focus:outline-none">
                {CLUSTERS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-[10px] font-bold text-ink-faint uppercase tracking-wider">Min Aptitude</span>
              <input type="number" value={form.min_aptitude} onChange={e => setForm(f => ({ ...f, min_aptitude: Number(e.target.value) }))}
                className="w-full mt-1 px-3 py-2 bg-ivory-100 border-2 border-ivory-200 rounded-xl text-sm font-bold focus:border-gold focus:outline-none" />
            </label>
            <label className="block">
              <span className="text-[10px] font-bold text-ink-faint uppercase tracking-wider">RIASEC (3 chars)</span>
              <input value={form.riasec} maxLength={3} onChange={e => setForm(f => ({ ...f, riasec: e.target.value.toUpperCase() }))}
                className="w-full mt-1 px-3 py-2 bg-ivory-100 border-2 border-ivory-200 rounded-xl text-sm font-bold font-mono focus:border-gold focus:outline-none" />
            </label>
            <label className="block">
              <span className="text-[10px] font-bold text-ink-faint uppercase tracking-wider">Flag Condition (optional)</span>
              <input value={form.flag_condition || ''} onChange={e => setForm(f => ({ ...f, flag_condition: e.target.value }))}
                className="w-full mt-1 px-3 py-2 bg-ivory-100 border-2 border-ivory-200 rounded-xl text-sm font-bold focus:border-gold focus:outline-none" />
            </label>
          </div>

          {/* Personality traits */}
          <div>
            <span className="text-[10px] font-bold text-ink-faint uppercase tracking-wider">Personality Traits</span>
            <div className="grid grid-cols-5 gap-3 mt-2">
              {PERSONALITY_TRAITS.map(trait => (
                <div key={trait} className="bg-ivory-100 rounded-xl p-3">
                  <label className="flex items-center gap-2 mb-2">
                    <input type="checkbox" checked={!!form.personality_traits?.[trait]}
                      onChange={e => {
                        const pt = { ...form.personality_traits };
                        if (e.target.checked) pt[trait] = 'high'; else delete pt[trait];
                        setForm(f => ({ ...f, personality_traits: pt }));
                      }}
                      className="w-3.5 h-3.5 rounded accent-amber-500" />
                    <span className="text-xs font-bold text-ink capitalize">{trait}</span>
                  </label>
                  {form.personality_traits?.[trait] && (
                    <select value={form.personality_traits[trait]}
                      onChange={e => setForm(f => ({ ...f, personality_traits: { ...f.personality_traits, [trait]: e.target.value } }))}
                      className="w-full px-2 py-1 bg-white border border-ivory-200 rounded-lg text-xs font-bold focus:border-gold focus:outline-none">
                      <option value="high">High</option>
                      <option value="moderate">Moderate</option>
                      <option value="low">Low</option>
                    </select>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Degrees */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-ink-faint uppercase tracking-wider">Degrees</span>
              <button onClick={addDegree} className="text-xs font-bold text-copper flex items-center gap-1"><Plus size={12} /> Add</button>
            </div>
            {form.degrees.map((deg, i) => (
              <div key={i} className="flex gap-2 mb-2 items-end">
                <input value={deg.name} onChange={e => updateDegree(i, 'name', e.target.value)} placeholder="Degree name"
                  className="flex-1 px-3 py-2 bg-ivory-100 border-2 border-ivory-200 rounded-xl text-sm font-semibold focus:border-gold focus:outline-none" />
                <input value={deg.match} onChange={e => updateDegree(i, 'match', e.target.value)} placeholder="Match"
                  className="w-24 px-3 py-2 bg-ivory-100 border-2 border-ivory-200 rounded-xl text-sm font-semibold focus:border-gold focus:outline-none" />
                <input value={deg.sub} onChange={e => updateDegree(i, 'sub', e.target.value)} placeholder="Sub"
                  className="w-32 px-3 py-2 bg-ivory-100 border-2 border-ivory-200 rounded-xl text-sm font-semibold focus:border-gold focus:outline-none" />
                <button onClick={() => removeDegree(i)} className="text-red-500 p-2"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>

          {/* Institutions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-ink-faint uppercase tracking-wider">Institutions</span>
              <button onClick={addInstitution} className="text-xs font-bold text-copper flex items-center gap-1"><Plus size={12} /> Add</button>
            </div>
            {form.institutions.map((inst, i) => (
              <div key={i} className="bg-ivory-100 rounded-xl p-3 mb-2">
                <div className="flex gap-2 mb-2">
                  <input value={inst.name} onChange={e => updateInstitution(i, 'name', e.target.value)} placeholder="Institution name"
                    className="flex-1 px-3 py-2 bg-white border border-ivory-200 rounded-lg text-sm font-semibold focus:border-gold focus:outline-none" />
                  <input value={inst.loc} onChange={e => updateInstitution(i, 'loc', e.target.value)} placeholder="Location"
                    className="w-32 px-3 py-2 bg-white border border-ivory-200 rounded-lg text-sm font-semibold focus:border-gold focus:outline-none" />
                  <select value={inst.type} onChange={e => updateInstitution(i, 'type', e.target.value)}
                    className="w-28 px-2 py-2 bg-white border border-ivory-200 rounded-lg text-sm font-bold focus:border-gold focus:outline-none">
                    <option value="india">India</option>
                    <option value="global">Global</option>
                  </select>
                  <button onClick={() => removeInstitution(i)} className="text-red-500 p-2"><Trash2 size={14} /></button>
                </div>
                <div className="flex gap-2">
                  <input value={(inst.tags || []).map(t => Array.isArray(t) ? t.join(':') : t).join(', ')}
                    onChange={e => updateInstitution(i, 'tags', e.target.value.split(',').map(s => s.trim().split(':')))}
                    placeholder="Tags (label:class, ...)"
                    className="flex-1 px-3 py-1.5 bg-white border border-ivory-200 rounded-lg text-xs font-semibold focus:border-gold focus:outline-none" />
                  <input value={inst.note || ''} onChange={e => updateInstitution(i, 'note', e.target.value)} placeholder="Note"
                    className="flex-1 px-3 py-1.5 bg-white border border-ivory-200 rounded-lg text-xs font-semibold focus:border-gold focus:outline-none" />
                </div>
              </div>
            ))}
          </div>

          <button onClick={handleSave}
            className="w-full py-3 bg-copper text-white font-black rounded-2xl text-sm shadow-[0_4px_0_#92400E] hover:-translate-y-0.5 active:translate-y-0.5 transition-all">
            <Save size={14} className="inline mr-2" />
            {editingId ? 'Update Career' : 'Create Career'}
          </button>
        </div>
      )}

      {/* Career Table */}
      <div className="bg-white border-2 border-ivory-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-ivory-100 border-b-2 border-ivory-200">
              <th className="text-left px-4 py-3 text-[10px] font-black text-ink-faint uppercase tracking-wider">Career</th>
              <th className="text-left px-4 py-3 text-[10px] font-black text-ink-faint uppercase tracking-wider">Field</th>
              <th className="text-left px-4 py-3 text-[10px] font-black text-ink-faint uppercase tracking-wider">Cluster</th>
              <th className="text-left px-4 py-3 text-[10px] font-black text-ink-faint uppercase tracking-wider">RIASEC</th>
              <th className="text-left px-4 py-3 text-[10px] font-black text-ink-faint uppercase tracking-wider">Min Apt</th>
              <th className="text-left px-4 py-3 text-[10px] font-black text-ink-faint uppercase tracking-wider">Fit %</th>
              <th className="text-right px-4 py-3 text-[10px] font-black text-ink-faint uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <>
                <tr key={c.id} className="border-b border-ivory-200/50 hover:bg-ivory-50 cursor-pointer"
                  onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}>
                  <td className="px-4 py-3 font-bold text-ink flex items-center gap-2">
                    {expandedId === c.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    {c.name}
                  </td>
                  <td className="px-4 py-3 text-ink-dim">{c.field}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-lg">{c.aptitude_cluster}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-ink-dim">{c.riasec}</td>
                  <td className="px-4 py-3 text-ink-dim">{c.min_aptitude}</td>
                  <td className="px-4 py-3 text-ink-dim">{c.fit_percent ?? '--'}%</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={e => { e.stopPropagation(); startEdit(c); }} className="text-gold hover:text-amber-700 mr-2"><Edit size={14} /></button>
                    <button onClick={e => { e.stopPropagation(); handleDelete(c.id); }} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                  </td>
                </tr>
                {expandedId === c.id && (
                  <tr key={`${c.id}-detail`} className="bg-ivory-50">
                    <td colSpan={7} className="px-6 py-4">
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-[10px] font-black text-ink-faint uppercase mb-2">Degrees</h4>
                          {(c.degrees || []).length === 0 ? <span className="text-xs text-ink-faint">None</span> : (
                            <div className="space-y-1">
                              {c.degrees.map((d, i) => (
                                <div key={i} className="text-xs text-ink"><span className="font-bold">{d.name}</span> — {d.match} {d.sub && `(${d.sub})`}</div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div>
                          <h4 className="text-[10px] font-black text-ink-faint uppercase mb-2">Institutions</h4>
                          {(c.institutions || []).length === 0 ? <span className="text-xs text-ink-faint">None</span> : (
                            <div className="space-y-1">
                              {c.institutions.map((inst, i) => (
                                <div key={i} className="text-xs text-ink"><span className="font-bold">{inst.name}</span> — {inst.loc} ({inst.type})</div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-ink-faint">No careers found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── SCORING THRESHOLDS TAB ──
function ScoringThresholdsTab({ config, onSave }) {
  const initial = config?.scoring_thresholds || {};
  const [thresholds, setThresholds] = useState({
    aptitude_classification: {
      exceptional: initial.aptitude_classification?.exceptional ?? 1.5,
      advanced: initial.aptitude_classification?.advanced ?? 0.5,
      age_appropriate: initial.aptitude_classification?.age_appropriate ?? -0.5,
      developing: initial.aptitude_classification?.developing ?? -999,
    },
    personality_cutoffs: {
      high: initial.personality_cutoffs?.high ?? 70,
      moderate: initial.personality_cutoffs?.moderate ?? 40,
    },
    interest_strength: {
      strong: initial.interest_strength?.strong ?? 70,
      moderate: initial.interest_strength?.moderate ?? 40,
    },
    fit_level_bands: {
      high: initial.fit_level_bands?.high ?? 80,
      mid: initial.fit_level_bands?.mid ?? 50,
    },
  });
  const [saving, setSaving] = useState(false);

  const update = (section, key, val) => {
    setThresholds(t => ({ ...t, [section]: { ...t[section], [key]: Number(val) } }));
  };

  const save = async () => {
    setSaving(true);
    await onSave('scoring_thresholds', thresholds);
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      {/* Aptitude Classification */}
      <div className="bg-white border-2 border-ivory-200 rounded-2xl p-6">
        <h3 className="text-sm font-black text-ink-DEFAULT mb-1">Aptitude Classification</h3>
        <p className="text-xs text-ink-faint mb-4">Minimum theta score for each classification band.</p>
        <div className="grid grid-cols-4 gap-4">
          {LEVELS_4.map(level => (
            <label key={level} className="block">
              <span className="text-[10px] font-bold text-ink-faint uppercase tracking-wider capitalize">{level.replace('_', ' ')}</span>
              <input type="number" step="0.1" value={thresholds.aptitude_classification[level]}
                onChange={e => update('aptitude_classification', level, e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-ivory-100 border-2 border-ivory-200 rounded-xl text-sm font-bold text-center focus:border-gold focus:outline-none" />
            </label>
          ))}
        </div>
      </div>

      {/* Personality Cutoffs */}
      <div className="bg-white border-2 border-ivory-200 rounded-2xl p-6">
        <h3 className="text-sm font-black text-ink-DEFAULT mb-1">Personality Cutoffs</h3>
        <p className="text-xs text-ink-faint mb-4">Percentage thresholds for high and moderate personality levels.</p>
        <div className="grid grid-cols-2 gap-4">
          {['high', 'moderate'].map(level => (
            <label key={level} className="block">
              <span className="text-[10px] font-bold text-ink-faint uppercase tracking-wider capitalize">{level} %</span>
              <input type="number" value={thresholds.personality_cutoffs[level]}
                onChange={e => update('personality_cutoffs', level, e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-ivory-100 border-2 border-ivory-200 rounded-xl text-sm font-bold text-center focus:border-gold focus:outline-none" />
            </label>
          ))}
        </div>
      </div>

      {/* Interest Strength */}
      <div className="bg-white border-2 border-ivory-200 rounded-2xl p-6">
        <h3 className="text-sm font-black text-ink-DEFAULT mb-1">Interest Strength</h3>
        <p className="text-xs text-ink-faint mb-4">Percentage thresholds for strong and moderate interest levels.</p>
        <div className="grid grid-cols-2 gap-4">
          {['strong', 'moderate'].map(level => (
            <label key={level} className="block">
              <span className="text-[10px] font-bold text-ink-faint uppercase tracking-wider capitalize">{level} %</span>
              <input type="number" value={thresholds.interest_strength[level]}
                onChange={e => update('interest_strength', level, e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-ivory-100 border-2 border-ivory-200 rounded-xl text-sm font-bold text-center focus:border-gold focus:outline-none" />
            </label>
          ))}
        </div>
      </div>

      {/* Fit Level Bands */}
      <div className="bg-white border-2 border-ivory-200 rounded-2xl p-6">
        <h3 className="text-sm font-black text-ink-DEFAULT mb-1">Fit Level Bands</h3>
        <p className="text-xs text-ink-faint mb-4">Percentage thresholds for high and mid career fit levels.</p>
        <div className="grid grid-cols-2 gap-4">
          {['high', 'mid'].map(level => (
            <label key={level} className="block">
              <span className="text-[10px] font-bold text-ink-faint uppercase tracking-wider capitalize">{level} %</span>
              <input type="number" value={thresholds.fit_level_bands[level]}
                onChange={e => update('fit_level_bands', level, e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-ivory-100 border-2 border-ivory-200 rounded-xl text-sm font-bold text-center focus:border-gold focus:outline-none" />
            </label>
          ))}
        </div>
      </div>

      <button onClick={save} disabled={saving}
        className="w-full py-3 bg-copper text-white font-black rounded-2xl text-sm shadow-[0_4px_0_#92400E] hover:-translate-y-0.5 active:translate-y-0.5 transition-all disabled:opacity-50">
        {saving ? 'Saving...' : 'Save Scoring Thresholds'}
      </button>
    </div>
  );
}

// ── REPORT SECTIONS TAB ──
function ReportSectionsTab({ config, onSave }) {
  const initial = config?.report_sections || {};
  const [sections, setSections] = useState({
    aptitude: initial.aptitude ?? true,
    personality: initial.personality ?? true,
    interest: initial.interest ?? true,
    career: initial.career ?? true,
    summary: initial.summary ?? true,
  });
  const [saving, setSaving] = useState(false);

  const toggle = (key) => setSections(s => ({ ...s, [key]: !s[key] }));

  const save = async () => {
    setSaving(true);
    await onSave('report_sections', sections);
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border-2 border-ivory-200 rounded-2xl p-6">
        <h3 className="text-sm font-black text-ink-DEFAULT mb-1">Report Section Toggles</h3>
        <p className="text-xs text-ink-faint mb-4">Enable or disable sections that appear in generated reports.</p>
        <div className="space-y-1">
          {Object.entries(sections).map(([key, enabled]) => (
            <div key={key} className="flex items-center justify-between py-3 border-b border-ivory-200/50 last:border-0">
              <span className="text-sm font-bold text-ink capitalize">{key}</span>
              <button onClick={() => toggle(key)}
                className={`relative w-12 h-6 rounded-full transition-all ${enabled ? 'bg-emerald-500' : 'bg-ivory-200'}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${enabled ? 'left-[26px]' : 'left-0.5'}`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <button onClick={save} disabled={saving}
        className="w-full py-3 bg-copper text-white font-black rounded-2xl text-sm shadow-[0_4px_0_#92400E] hover:-translate-y-0.5 active:translate-y-0.5 transition-all disabled:opacity-50">
        {saving ? 'Saving...' : 'Save Report Sections'}
      </button>
    </div>
  );
}

// ── CLUSTER FORMULAS TAB ──
function ClusterFormulasTab({ config, onSave }) {
  const initial = config?.cluster_formulas || {};
  const defaultWeights = { gf: 0, gv: 0, gq: 0, gc: 0, gs: 0 };
  const [formulas, setFormulas] = useState(
    Object.fromEntries(CLUSTERS.map(c => [c, { ...defaultWeights, ...(initial[c] || {}) }]))
  );
  const [saving, setSaving] = useState(false);

  const update = (cluster, domain, val) => {
    setFormulas(f => ({ ...f, [cluster]: { ...f[cluster], [domain]: Number(val) } }));
  };

  const save = async () => {
    setSaving(true);
    await onSave('cluster_formulas', formulas);
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      {CLUSTERS.map(cluster => (
        <div key={cluster} className="bg-white border-2 border-ivory-200 rounded-2xl p-6">
          <h3 className="text-sm font-black text-ink-DEFAULT mb-1 capitalize">{cluster}</h3>
          <p className="text-xs text-ink-faint mb-4">
            {cluster} = {DOMAINS.map(d => `${d} x [w]`).join(' + ')}
          </p>
          <div className="grid grid-cols-5 gap-4">
            {DOMAINS.map(domain => (
              <label key={domain} className="block">
                <span className="text-[10px] font-bold text-ink-faint uppercase">{domain}</span>
                <input type="number" step="0.05" min="0" max="1" value={formulas[cluster][domain]}
                  onChange={e => update(cluster, domain, e.target.value)}
                  className="w-full mt-1 px-2 py-2 bg-ivory-100 border-2 border-ivory-200 rounded-xl text-sm font-bold text-center focus:border-gold focus:outline-none" />
              </label>
            ))}
          </div>
        </div>
      ))}

      <button onClick={save} disabled={saving}
        className="w-full py-3 bg-copper text-white font-black rounded-2xl text-sm shadow-[0_4px_0_#92400E] hover:-translate-y-0.5 active:translate-y-0.5 transition-all disabled:opacity-50">
        {saving ? 'Saving...' : 'Save Cluster Formulas'}
      </button>
    </div>
  );
}

// ── NARRATIVE TEMPLATES TAB ──
function NarrativeTemplatesTab({ config, onSave }) {
  const initial = config?.narrative_templates || {};
  const [templates, setTemplates] = useState({
    aptitude: Object.fromEntries(DOMAINS.map(d => [d, Object.fromEntries(LEVELS_4.map(l => [l, initial.aptitude?.[d]?.[l] || '']))])),
    personality: Object.fromEntries(PERSONALITY_TRAITS.map(t => [t, Object.fromEntries(LEVELS_3.map(l => [l, initial.personality?.[t]?.[l] || '']))])),
    interest: Object.fromEntries(RIASEC_DIMS.map(d => [d, Object.fromEntries(INTEREST_LEVELS.map(l => [l, initial.interest?.[d]?.[l] || '']))])),
  });
  const [expanded, setExpanded] = useState({});
  const [saving, setSaving] = useState(false);

  const toggleExpand = (key) => setExpanded(e => ({ ...e, [key]: !e[key] }));

  const updateTemplate = (section, item, level, val) => {
    setTemplates(t => ({
      ...t,
      [section]: { ...t[section], [item]: { ...t[section][item], [level]: val } }
    }));
  };

  const save = async () => {
    setSaving(true);
    await onSave('narrative_templates', templates);
    setSaving(false);
  };

  const renderSection = (title, section, items, levels) => (
    <div className="bg-white border-2 border-ivory-200 rounded-2xl overflow-hidden">
      <div className="px-6 py-4 bg-ivory-100 border-b-2 border-ivory-200">
        <h3 className="text-sm font-black text-ink-DEFAULT">{title}</h3>
      </div>
      <div className="divide-y divide-ivory-200/50">
        {items.map(item => {
          const key = `${section}-${item}`;
          const isOpen = expanded[key];
          return (
            <div key={item}>
              <button onClick={() => toggleExpand(key)}
                className="w-full flex items-center justify-between px-6 py-3 hover:bg-ivory-50 transition-colors">
                <span className="text-sm font-bold text-ink capitalize">{item.replace('_', ' ')}</span>
                {isOpen ? <ChevronDown size={16} className="text-ink-faint" /> : <ChevronRight size={16} className="text-ink-faint" />}
              </button>
              {isOpen && (
                <div className="px-6 pb-4 space-y-3">
                  {levels.map(level => (
                    <label key={level} className="block">
                      <span className="text-[10px] font-bold text-ink-faint uppercase tracking-wider capitalize">{level.replace('_', ' ')}</span>
                      <textarea value={templates[section][item][level]}
                        onChange={e => updateTemplate(section, item, level, e.target.value)}
                        rows={3}
                        className="w-full mt-1 px-3 py-2 bg-ivory-100 border-2 border-ivory-200 rounded-xl text-sm focus:border-gold focus:outline-none resize-y" />
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {renderSection('Aptitude Narratives', 'aptitude', DOMAINS, LEVELS_4)}
      {renderSection('Personality Narratives', 'personality', PERSONALITY_TRAITS, LEVELS_3)}
      {renderSection('Interest Narratives', 'interest', RIASEC_DIMS, INTEREST_LEVELS)}

      <button onClick={save} disabled={saving}
        className="w-full py-3 bg-copper text-white font-black rounded-2xl text-sm shadow-[0_4px_0_#92400E] hover:-translate-y-0.5 active:translate-y-0.5 transition-all disabled:opacity-50">
        {saving ? 'Saving...' : 'Save Narrative Templates'}
      </button>
    </div>
  );
}

// ── MAIN PAGE ──
export default function ReportConfigPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState('weights');
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: '', type: '' });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: '' }), 3000);
  };

  useEffect(() => {
    api.get('/report-config')
      .then(d => setConfig(d.settings || {}))
      .catch(() => showToast('Failed to load config', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const saveConfig = async (key, value) => {
    try {
      await api.put(`/report-config/${key}`, { value });
      const d = await api.get('/report-config');
      setConfig(d.settings || {});
      showToast('Saved successfully');
    } catch (e) {
      showToast(e.message || 'Save failed', 'error');
    }
  };

  if (user?.role !== 'super_admin') {
    return (
      <div className="p-8 text-center">
        <div className="text-4xl mb-3">🔒</div>
        <div className="font-bold text-ink">Access Restricted</div>
        <div className="text-sm text-ink-faint mt-1">Only super admins can access report configuration.</div>
      </div>
    );
  }

  const renderTab = () => {
    if (loading) return <div className="bg-white border-2 border-ivory-200 rounded-2xl p-8 text-center text-sm text-ink-faint">Loading...</div>;
    switch (tab) {
      case 'weights': return <MatchWeightsTab config={config} onSave={saveConfig} />;
      case 'careers': return <CareerDatabaseTab onToast={showToast} />;
      case 'thresholds': return <ScoringThresholdsTab config={config} onSave={saveConfig} />;
      case 'sections': return <ReportSectionsTab config={config} onSave={saveConfig} />;
      case 'formulas': return <ClusterFormulasTab config={config} onSave={saveConfig} />;
      case 'narratives': return <NarrativeTemplatesTab config={config} onSave={saveConfig} />;
      default: return null;
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />

      <div className="mb-6">
        <h1 className="text-xl font-black text-ink">Report Configuration</h1>
        <p className="text-xs text-ink-dim mt-0.5">Configure career matching, scoring thresholds, cluster formulas, and narrative templates.</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 bg-ivory-100 rounded-2xl p-1 overflow-x-auto">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${tab === t.id ? 'bg-white text-ink-DEFAULT shadow-sm' : 'text-ink-dim hover:text-ink'}`}>
              <Icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {renderTab()}
    </div>
  );
}
