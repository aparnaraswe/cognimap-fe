import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

// ══════════════════════════════════════════════════════════
// ACCESS CONTROL & DYNAMIC CONFIGURATION
// Super admin can configure everything from this UI:
//   • Passing criteria & classification bands
//   • Student form fields (add/remove/reorder onboarding fields)
//   • Report section visibility (what students see)
//   • Test type definitions
//   • Validation rules
// ══════════════════════════════════════════════════════════

const TABS = [
  { id: 'passing', label: 'Passing Criteria', icon: '🎯' },
  { id: 'fields', label: 'Form Builder', icon: '📋' },
  { id: 'visibility', label: 'Report Visibility', icon: '👁️' },
  { id: 'tests', label: 'Test Types', icon: '🧪' },
  { id: 'general', label: 'General Settings', icon: '⚙️' },
];

// ── PASSING CRITERIA TAB ──
function PassingCriteriaTab() {
  const [criteria, setCriteria] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get('/config/passing-criteria').then(d => setCriteria(d.criteria)).catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/config/passing-criteria', { criteria });
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch (e) { alert(e.message); }
    setSaving(false);
  };

  if (!criteria) return <div className="p-6 text-sm text-ink-faint">Loading...</div>;

  const cls = criteria.classifications || {};

  return (
    <div className="space-y-6">
      <div className="bg-white border-2 border-ivory-200 rounded-2xl p-6">
        <h3 className="text-sm font-black text-ink-DEFAULT mb-4">Classification Bands</h3>
        <p className="text-xs text-ink-faint mb-4">Define theta score ranges for each classification. Students scoring above the minimum theta for a band receive that classification.</p>
        <div className="grid grid-cols-1 gap-3">
          {Object.entries(cls).map(([key, band]) => (
            <div key={key} className="flex items-center gap-4 bg-ivory-100 rounded-xl px-4 py-3">
              <input type="color" value={band.color || '#888'} onChange={e => {
                const c = { ...criteria, classifications: { ...cls, [key]: { ...band, color: e.target.value } } };
                setCriteria(c);
              }} className="w-8 h-8 rounded-lg border-0 cursor-pointer" />
              <input value={band.label} onChange={e => {
                const c = { ...criteria, classifications: { ...cls, [key]: { ...band, label: e.target.value } } };
                setCriteria(c);
              }} className="flex-1 px-3 py-1.5 bg-white border-2 border-ivory-200 rounded-xl text-sm font-bold focus:border-gold focus:outline-none" />
              <div className="flex items-center gap-2">
                <span className="text-xs text-ink-faint">Min θ:</span>
                <input type="number" step="0.1" value={band.min === -Infinity || band.min === -999 ? '' : band.min}
                  placeholder="—∞" onChange={e => {
                    const v = e.target.value === '' ? -999 : parseFloat(e.target.value);
                    const c = { ...criteria, classifications: { ...cls, [key]: { ...band, min: v } } };
                    setCriteria(c);
                  }} className="w-20 px-2 py-1.5 bg-white border-2 border-ivory-200 rounded-xl text-sm font-bold text-center focus:border-gold focus:outline-none" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border-2 border-ivory-200 rounded-2xl p-6">
        <h3 className="text-sm font-black text-ink-DEFAULT mb-4">Global Passing Threshold</h3>
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="text-[10px] font-bold text-ink-faint uppercase tracking-wider">Minimum Global Theta</span>
            <input type="number" step="0.1" value={criteria.globalThetaMin ?? 0}
              onChange={e => setCriteria({ ...criteria, globalThetaMin: parseFloat(e.target.value) })}
              className="w-full mt-1 px-3 py-2 bg-ivory-100 border-2 border-ivory-200 rounded-xl text-sm font-bold focus:border-gold focus:outline-none" />
          </label>
          <label className="block">
            <span className="text-[10px] font-bold text-ink-faint uppercase tracking-wider">Min Domains Above Threshold</span>
            <input type="number" value={criteria.minDomainsAboveThreshold ?? 3}
              onChange={e => setCriteria({ ...criteria, minDomainsAboveThreshold: parseInt(e.target.value) })}
              className="w-full mt-1 px-3 py-2 bg-ivory-100 border-2 border-ivory-200 rounded-xl text-sm font-bold focus:border-gold focus:outline-none" />
          </label>
        </div>
      </div>

      <div className="bg-white border-2 border-ivory-200 rounded-2xl p-6">
        <h3 className="text-sm font-black text-ink-DEFAULT mb-4">Per-Domain Minimum Theta</h3>
        <div className="grid grid-cols-5 gap-3">
          {['gf', 'gv', 'gq', 'gc', 'gs'].map(d => (
            <label key={d} className="block">
              <span className="text-[10px] font-bold text-ink-faint uppercase">{d}</span>
              <input type="number" step="0.1" value={criteria.domainThetaMin?.[d] ?? -0.5}
                onChange={e => setCriteria({
                  ...criteria, domainThetaMin: { ...criteria.domainThetaMin, [d]: parseFloat(e.target.value) }
                })}
                className="w-full mt-1 px-2 py-1.5 bg-ivory-100 border-2 border-ivory-200 rounded-xl text-sm font-bold text-center focus:border-gold focus:outline-none" />
            </label>
          ))}
        </div>
      </div>

      <div className="bg-white border-2 border-ivory-200 rounded-2xl p-6">
        <h3 className="text-sm font-black text-ink-DEFAULT mb-4">Auto-Flag Rules</h3>
        <p className="text-xs text-ink-faint mb-3">Students matching these criteria are flagged for manual review by a psychologist.</p>
        <div className="grid grid-cols-3 gap-4">
          <label className="block">
            <span className="text-[10px] font-bold text-ink-faint uppercase tracking-wider">Flag if θ below</span>
            <input type="number" step="0.1" value={criteria.flagForReview?.thetaBelow ?? -1.0}
              onChange={e => setCriteria({
                ...criteria, flagForReview: { ...criteria.flagForReview, thetaBelow: parseFloat(e.target.value) }
              })}
              className="w-full mt-1 px-3 py-2 bg-ivory-100 border-2 border-ivory-200 rounded-xl text-sm font-bold focus:border-gold focus:outline-none" />
          </label>
          <label className="block">
            <span className="text-[10px] font-bold text-ink-faint uppercase tracking-wider">Consecutive Timeouts</span>
            <input type="number" value={criteria.flagForReview?.consecutiveTimeouts ?? 3}
              onChange={e => setCriteria({
                ...criteria, flagForReview: { ...criteria.flagForReview, consecutiveTimeouts: parseInt(e.target.value) }
              })}
              className="w-full mt-1 px-3 py-2 bg-ivory-100 border-2 border-ivory-200 rounded-xl text-sm font-bold focus:border-gold focus:outline-none" />
          </label>
          <label className="block">
            <span className="text-[10px] font-bold text-ink-faint uppercase tracking-wider">Total Time Under (sec)</span>
            <input type="number" value={criteria.flagForReview?.totalTimeUnder ?? 120}
              onChange={e => setCriteria({
                ...criteria, flagForReview: { ...criteria.flagForReview, totalTimeUnder: parseInt(e.target.value) }
              })}
              className="w-full mt-1 px-3 py-2 bg-ivory-100 border-2 border-ivory-200 rounded-xl text-sm font-bold focus:border-gold focus:outline-none" />
          </label>
        </div>
      </div>

      <button onClick={save} disabled={saving}
        className="w-full py-3 bg-copper text-white font-black rounded-2xl text-sm shadow-[0_4px_0_#92400E] hover:-translate-y-0.5 active:translate-y-0.5 transition-all disabled:opacity-50">
        {saved ? '✓ Saved!' : saving ? 'Saving...' : 'Save Passing Criteria'}
      </button>
    </div>
  );
}

// ── FORM BUILDER TAB ──
const FIELD_TYPES = ['text', 'email', 'number', 'date', 'select', 'checkbox', 'textarea', 'tel'];

function FormBuilderTab() {
  const [fields, setFields] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [formType, setFormType] = useState('student_registration');

  useEffect(() => {
    api.get(`/config/form-fields/${formType}`).then(d => setFields(d.fields || [])).catch(() => {});
  }, [formType]);

  const addField = () => {
    setFields(f => [...f, { id: `field_${Date.now()}`, label: 'New Field', type: 'text', required: false, group: 'custom' }]);
  };

  const updateField = (i, key, val) => {
    setFields(f => f.map((field, j) => j === i ? { ...field, [key]: val } : field));
  };

  const removeField = (i) => {
    setFields(f => f.filter((_, j) => j !== i));
  };

  const moveField = (i, dir) => {
    const f = [...fields];
    const ni = i + dir;
    if (ni < 0 || ni >= f.length) return;
    [f[i], f[ni]] = [f[ni], f[i]];
    setFields(f);
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/config/form-fields/${formType}`, { fields });
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch (e) { alert(e.message); }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 mb-4">
        {[
          { key: 'student_registration', label: 'Student Registration' },
          { key: 'test_config', label: 'Test Configuration' },
          { key: 'report_output', label: 'Report Fields' },
        ].map(ft => (
          <button key={ft.key} onClick={() => setFormType(ft.key)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${formType === ft.key ? 'bg-copper text-white' : 'bg-white border-2 border-ivory-200 text-ink-dim hover:border-gold'}`}>
            {ft.label}
          </button>
        ))}
      </div>

      <div className="bg-white border-2 border-ivory-200 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-black text-ink">Form Fields</h3>
            <p className="text-xs text-ink-faint mt-0.5">Add, remove, or reorder fields. Changes apply immediately to the relevant UI forms.</p>
          </div>
          <button onClick={addField} className="px-4 py-2 bg-copper text-white text-xs font-bold rounded-xl">+ Add Field</button>
        </div>

        <div className="space-y-2">
          {fields.map((field, i) => (
            <div key={field.id || i} className="bg-ivory-100 rounded-xl p-3 flex gap-3 items-end">
              <div className="flex flex-col gap-1 flex-shrink-0">
                <button onClick={() => moveField(i, -1)} disabled={i === 0} className="text-xs text-ink-faint hover:text-ink-DEFAULT disabled:opacity-20">▲</button>
                <button onClick={() => moveField(i, 1)} disabled={i === fields.length - 1} className="text-xs text-ink-faint hover:text-ink-DEFAULT disabled:opacity-20">▼</button>
              </div>
              <label className="flex-1">
                <span className="text-[9px] font-bold text-ink-faint">Field ID</span>
                <input value={field.id} onChange={e => updateField(i, 'id', e.target.value)}
                  className="w-full mt-0.5 px-2 py-1.5 bg-white border border-ivory-200 rounded-lg text-xs font-mono focus:border-gold focus:outline-none" />
              </label>
              <label className="flex-1">
                <span className="text-[9px] font-bold text-ink-faint">Label</span>
                <input value={field.label} onChange={e => updateField(i, 'label', e.target.value)}
                  className="w-full mt-0.5 px-2 py-1.5 bg-white border border-ivory-200 rounded-lg text-xs font-semibold focus:border-gold focus:outline-none" />
              </label>
              <label className="w-24">
                <span className="text-[9px] font-bold text-ink-faint">Type</span>
                <select value={field.type} onChange={e => updateField(i, 'type', e.target.value)}
                  className="w-full mt-0.5 px-2 py-1.5 bg-white border border-ivory-200 rounded-lg text-xs font-bold focus:border-gold focus:outline-none">
                  {FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
              <label className="w-20">
                <span className="text-[9px] font-bold text-ink-faint">Group</span>
                <input value={field.group || ''} onChange={e => updateField(i, 'group', e.target.value)}
                  className="w-full mt-0.5 px-2 py-1.5 bg-white border border-ivory-200 rounded-lg text-xs font-semibold focus:border-gold focus:outline-none" />
              </label>
              <label className="flex items-center gap-1 cursor-pointer flex-shrink-0 pb-0.5">
                <input type="checkbox" checked={field.required || false} onChange={e => updateField(i, 'required', e.target.checked)}
                  className="w-3.5 h-3.5 rounded accent-amber-500" />
                <span className="text-[9px] font-bold text-ink-faint">Req</span>
              </label>
              {field.type === 'select' && (
                <label className="w-40">
                  <span className="text-[9px] font-bold text-ink-faint">Options (comma sep)</span>
                  <input value={(field.options || []).join(',')} onChange={e => updateField(i, 'options', e.target.value.split(',').map(s => s.trim()))}
                    className="w-full mt-0.5 px-2 py-1.5 bg-white border border-ivory-200 rounded-lg text-xs focus:border-gold focus:outline-none" />
                </label>
              )}
              <button onClick={() => removeField(i)} className="text-xs font-bold text-red-600 hover:text-red-700 pb-1 flex-shrink-0">✕</button>
            </div>
          ))}
          {fields.length === 0 && (
            <div className="text-center py-6 text-xs text-ink-faint">No fields defined. Click "Add Field" to create one.</div>
          )}
        </div>
      </div>

      <button onClick={save} disabled={saving}
        className="w-full py-3 bg-copper text-white font-black rounded-2xl text-sm shadow-[0_4px_0_#92400E] hover:-translate-y-0.5 active:translate-y-0.5 transition-all disabled:opacity-50">
        {saved ? '✓ Saved!' : saving ? 'Saving...' : `Save ${fields.length} Fields`}
      </button>
    </div>
  );
}

// ── REPORT VISIBILITY TAB ──
function ReportVisibilityTab() {
  const [sections, setSections] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get('/config/student-visible').then(d => {
      setSections(d.config?.report_sections_visible || {
        overall_score: true, domain_breakdown: true, domain_narratives: true,
        career_clusters: true, career_suggestions: true, strengths_weaknesses: true,
        theta_bars: true, percentiles: false, raw_scores: false, clinical_notes: false,
      });
    }).catch(() => {});
  }, []);

  const labels = {
    overall_score: { label: 'Overall Score & Classification', desc: 'The global theta and Exceptional/Advanced/etc badge' },
    domain_breakdown: { label: 'Domain Score Bars', desc: 'Visual bars showing theta for each domain (Gf, Gv, etc)' },
    domain_narratives: { label: 'Domain Narratives', desc: 'Written descriptions of performance in each domain' },
    career_clusters: { label: 'Career Aptitude Clusters', desc: 'Analytical, Design, Communication, Operational, Strategic scores' },
    career_suggestions: { label: 'Career Suggestions', desc: 'Specific career paths suggested per cluster' },
    strengths_weaknesses: { label: 'Strengths & Development Areas', desc: 'Top 2 strengths and areas to work on' },
    theta_bars: { label: 'Theta Score Numbers', desc: 'Show actual numeric theta values' },
    percentiles: { label: 'Percentile Ranks', desc: 'Percentile rank compared to age-band norms' },
    raw_scores: { label: 'Raw Scores', desc: 'Number of items correct per domain' },
    clinical_notes: { label: 'Clinical Notes', desc: 'Psychologist notes (usually kept private)' },
  };

  const toggle = (key) => setSections(s => ({ ...s, [key]: !s[key] }));

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/config/report_sections_visible', { value: sections, label: 'Report Sections Visible to Students', category: 'visibility' });
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch (e) { alert(e.message); }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border-2 border-ivory-200 rounded-2xl p-6">
        <h3 className="text-sm font-black text-ink-DEFAULT mb-1">Report Section Visibility</h3>
        <p className="text-xs text-ink-faint mb-4">Toggle which sections students and parents can see in published reports. Admins always see everything.</p>
        <div className="space-y-1">
          {Object.entries(labels).map(([key, meta]) => (
            <div key={key} className="flex items-center justify-between py-3 border-b border-ivory-200/50 last:border-0">
              <div className="flex-1 mr-4">
                <div className="text-sm font-bold text-ink">{meta.label}</div>
                <div className="text-[10px] text-ink-faint mt-0.5">{meta.desc}</div>
              </div>
              <button onClick={() => toggle(key)}
                className={`relative w-12 h-6 rounded-full transition-all ${sections[key] ? 'bg-emerald-500' : 'bg-ivory-200'}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${sections[key] ? 'left-[26px]' : 'left-0.5'}`} />
              </button>
            </div>
          ))}
        </div>
      </div>
      <button onClick={save} disabled={saving}
        className="w-full py-3 bg-copper text-white font-black rounded-2xl text-sm shadow-[0_4px_0_#92400E] hover:-translate-y-0.5 active:translate-y-0.5 transition-all disabled:opacity-50">
        {saved ? '✓ Saved!' : saving ? 'Saving...' : 'Save Visibility Settings'}
      </button>
    </div>
  );
}

// ── TEST TYPES TAB ──
function TestTypesTab() {
  const [types, setTypes] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get('/config/test-types').then(d => setTypes(d.testTypes || [])).catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/config/test-types', { testTypes: types });
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch (e) { alert(e.message); }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border-2 border-ivory-200 rounded-2xl p-6">
        <h3 className="text-sm font-black text-ink-DEFAULT mb-1">Test Type Definitions</h3>
        <p className="text-xs text-ink-faint mb-4">Define available test types. Each type specifies which domains it uses, age bands, and scoring method. When you upload Excel files, items are mapped to the right test type based on domain.</p>

        {types.map((tt, i) => (
          <div key={tt.id} className={`bg-ivory-100 rounded-2xl p-5 mb-3 border-2 ${tt.active ? 'border-emerald-200' : 'border-ivory-200'}`}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm font-black text-ink">{tt.name}</div>
                <div className="text-[10px] text-ink-faint">ID: {tt.id} · {tt.domains?.length || 0} domains · {tt.ageBands?.join(', ')}</div>
              </div>
              <button onClick={() => {
                const upd = [...types]; upd[i] = { ...tt, active: !tt.active }; setTypes(upd);
              }} className={`px-3 py-1.5 rounded-xl text-xs font-bold ${tt.active ? 'bg-emerald-50 text-emerald-600' : 'bg-ivory-200 text-ink-faint'}`}>
                {tt.active ? 'Active' : 'Inactive'}
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {tt.domains?.map(d => (
                <span key={d} className="px-2.5 py-1 bg-white rounded-lg text-xs font-bold text-ink-dim border border-ivory-200">
                  {tt.domainLabels?.[d] || d}
                </span>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3 text-[10px]">
              <div><span className="font-bold text-ink-faint">Items/Domain:</span> {tt.itemsPerDomain}</div>
              <div><span className="font-bold text-ink-faint">Adaptive:</span> {tt.hasAdaptiveEngine ? 'Yes' : 'No'}</div>
              <div><span className="font-bold text-ink-faint">Report:</span> {tt.reportType}</div>
            </div>
          </div>
        ))}
      </div>
      <button onClick={save} disabled={saving}
        className="w-full py-3 bg-copper text-white font-black rounded-2xl text-sm shadow-[0_4px_0_#92400E] hover:-translate-y-0.5 active:translate-y-0.5 transition-all disabled:opacity-50">
        {saved ? '✓ Saved!' : saving ? 'Saving...' : 'Save Test Types'}
      </button>
    </div>
  );
}

// ── GENERAL SETTINGS TAB ──
function GeneralSettingsTab() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/settings').then(d => setSettings(d.settings || {})).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const updateSetting = async (key, value) => {
    await api.put(`/settings/${key}`, { value });
    const d = await api.get('/settings');
    setSettings(d.settings || {});
  };

  if (loading) return <div className="p-6 text-sm text-ink-faint">Loading...</div>;

  const allSettings = Object.values(settings).flat();

  return (
    <div className="bg-white border-2 border-ivory-200 rounded-2xl p-6">
      <h3 className="text-sm font-black text-ink-DEFAULT mb-4">All Platform Settings</h3>
      <div className="space-y-1">
        {allSettings.map(s => {
          const val = s.setting_value?.value;
          const isBool = typeof val === 'boolean';
          return (
            <div key={s.setting_key} className="flex items-center justify-between py-3 border-b border-ivory-200/50 last:border-0">
              <div className="flex-1 mr-4">
                <div className="text-sm font-bold text-ink">{s.label || s.setting_key}</div>
                <div className="text-[10px] text-ink-faint">{s.description}</div>
              </div>
              {isBool ? (
                <button onClick={() => updateSetting(s.setting_key, !val)}
                  className={`relative w-12 h-6 rounded-full transition-all ${val ? 'bg-emerald-500' : 'bg-ivory-200'}`}>
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${val ? 'left-[26px]' : 'left-0.5'}`} />
                </button>
              ) : (
                <span className="px-3 py-1 bg-ivory-100 border-2 border-ivory-200 rounded-xl text-xs font-bold min-w-[60px] text-center">
                  {JSON.stringify(val).slice(0, 40)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── MAIN PAGE ──
export default function AccessControlPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState('passing');

  if (user?.role !== 'super_admin') {
    return (
      <div className="p-8 text-center">
        <div className="text-4xl mb-3">🔒</div>
        <div className="font-bold text-ink">Access Restricted</div>
        <div className="text-sm text-ink-faint mt-1">Only super admins can access the control panel.</div>
      </div>
    );
  }

  const TabContent = {
    passing: PassingCriteriaTab,
    fields: FormBuilderTab,
    visibility: ReportVisibilityTab,
    tests: TestTypesTab,
    general: GeneralSettingsTab,
  }[tab];

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-xl font-black text-ink">Access Control & Configuration</h1>
        <p className="text-xs text-ink-dim mt-0.5">Configure passing criteria, form fields, report visibility, and test types — no code changes needed.</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 bg-ivory-100 rounded-2xl p-1 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${tab === t.id ? 'bg-white text-ink-DEFAULT shadow-sm' : 'text-ink-dim hover:text-ink'}`}>
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      <TabContent />
    </div>
  );
}
