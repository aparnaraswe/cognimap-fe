import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

// ── Domain metadata ──────────────────────────────────────────
const DOMAINS = [
  { key: 'gf',  label: 'Fluid Reasoning (Gf)',   icon: '🧩', color: '#6448A8' },
  { key: 'gv',  label: 'Visual Spatial (Gv)',     icon: '👁',  color: '#0F6E56' },
  { key: 'gq',  label: 'Quantitative (Gq)',       icon: '🔢', color: '#854F0B' },
  { key: 'gc',  label: 'Verbal Reasoning (Gc)',   icon: '💬', color: '#185FA5' },
  { key: 'gs',  label: 'Processing Speed (Gs)',   icon: '⚡', color: '#9B1111' },
  { key: 'gwm', label: 'Working Memory (Gwm)',    icon: '🧠', color: '#5B35A0' },
];

const DEFAULT_DOMAIN = {
  tagline: '',
  instructions: ['', '', ''],
  steps: ['', '', ''],
  tip: '',
};

// ── Helpers ──────────────────────────────────────────────────
function clamp(arr, min, max) {
  if (!Array.isArray(arr)) return Array(min).fill('');
  while (arr.length < min) arr = [...arr, ''];
  return arr.slice(0, max);
}

// ── Sub-components ────────────────────────────────────────────

function BulletEditor({ label, value, onChange, placeholder = 'Add a line…', max = 8 }) {
  const items = clamp(value || [], 1, max);

  const update = (i, v) => {
    const next = [...items];
    next[i] = v;
    onChange(next);
  };
  const addRow = () => { if (items.length < max) onChange([...items, '']); };
  const removeRow = (i) => { if (items.length > 1) onChange(items.filter((_, idx) => idx !== i)); };

  return (
    <div>
      <label className="block text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-2">
        {label}
      </label>
      <div className="flex flex-col gap-2">
        {items.map((line, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-stone-300 w-5 text-right flex-shrink-0">{i + 1}.</span>
            <input
              type="text"
              value={line}
              placeholder={placeholder}
              onChange={e => update(i, e.target.value)}
              className="flex-1 px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm text-stone-800 outline-none focus:border-amber-400 transition-colors"
            />
            <button
              onClick={() => removeRow(i)}
              disabled={items.length <= 1}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-stone-300 hover:text-red-400 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-lg leading-none"
            >×</button>
          </div>
        ))}
        {items.length < max && (
          <button
            onClick={addRow}
            className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 hover:text-amber-700 transition-colors mt-1 ml-7"
          >
            <span className="text-base leading-none">+</span> Add line
          </button>
        )}
      </div>
    </div>
  );
}

function DomainCard({ domainMeta, data, onChange }) {
  const { key, label, icon, color } = domainMeta;
  const d = data || { ...DEFAULT_DOMAIN };
  const [open, setOpen] = useState(false);

  const set = (field, val) => onChange({ ...d, [field]: val });

  return (
    <div className="border border-stone-200 rounded-2xl overflow-hidden bg-white">
      {/* Header — click to expand */}
      <button
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-stone-50 transition-colors text-left"
      >
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
          style={{ background: color + '18', border: `1px solid ${color}30` }}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-stone-800">{label}</div>
          <div className="text-xs text-stone-400 mt-0.5 truncate">
            {d.tagline || <span className="italic">No tagline set</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(d.instructions?.filter(Boolean).length > 0 || d.steps?.filter(Boolean).length > 0) && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
              style={{ background: color + '18', color }}>
              Configured
            </span>
          )}
          <svg className={`w-4 h-4 text-stone-400 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Body */}
      {open && (
        <div className="px-5 pb-5 border-t border-stone-100 space-y-6 pt-5">
          {/* Tagline */}
          <div>
            <label className="block text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-2">
              Tagline <span className="normal-case font-normal text-stone-300">(shown on Gateway screen)</span>
            </label>
            <input
              type="text"
              value={d.tagline || ''}
              placeholder={`e.g. Pattern Recognition & Logic`}
              onChange={e => set('tagline', e.target.value)}
              className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm text-stone-800 outline-none focus:border-amber-400 transition-colors"
            />
          </div>

          {/* Gateway steps (What you'll do) */}
          <BulletEditor
            label={'Gateway Steps — "What you\'ll do"'}
            value={d.steps}
            onChange={v => set('steps', v)}
            placeholder="e.g. You will see a grid of shapes…"
            max={6}
          />

          {/* Instructions bullets */}
          <BulletEditor
            label="Instructions — How It Works"
            value={d.instructions}
            onChange={v => set('instructions', v)}
            placeholder="e.g. Look at the pattern and find what comes next"
            max={8}
          />

          {/* Tip */}
          <div>
            <label className="block text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-2">
              Pro Tip <span className="normal-case font-normal text-stone-300">(shown on Gateway screen)</span>
            </label>
            <textarea
              value={d.tip || ''}
              placeholder="e.g. Don't spend too long on any single question — go with your first instinct."
              onChange={e => set('tip', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm text-stone-800 outline-none focus:border-amber-400 resize-none transition-colors"
            />
          </div>

          {/* Practice question hint */}
          <div className="rounded-xl p-4 text-xs text-stone-500 leading-relaxed"
            style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
            <span className="font-bold text-amber-700">💡 Practice Questions</span> — Practice questions are
            pulled automatically from items marked <code className="bg-amber-100 px-1 rounded">is_practice = true</code> in
            the Item Bank for this domain. Mark items as practice there to use them here.
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function DomainInstructionsPage() {
  const [instructions, setInstructions] = useState({}); // { gf: {...}, gv: {...}, ... }
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [error, setError]         = useState('');

  // ── Load existing config ──
  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const { rows } = await api.get('/config/all').catch(() => ({ rows: undefined }));
      // Try direct key fetch as fallback
      const d = await api.get('/settings/domain_instructions').catch(() => null);
      const val = d?.value || null;
      if (val && typeof val === 'object') setInstructions(val);
    } catch { /* start empty */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    // Fetch from /config/student-visible which now includes domain_instructions
    api.get('/config/student-visible')
      .then(d => {
        const val = d?.config?.domain_instructions;
        if (val && typeof val === 'object') setInstructions(val);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // ── Save ──
  const save = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await api.put('/config/domain_instructions', {
        value: instructions,
        label: 'Domain Instructions',
        description: 'Per-domain taglines, gateway steps, instructions, and tips shown to students before each section',
        category: 'content',
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const updateDomain = (key, data) => {
    setInstructions(prev => ({ ...prev, [key]: data }));
  };

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-xl font-black text-stone-800">Domain Instructions</h1>
          <p className="text-xs text-stone-400 mt-1">
            Configure what students see on the Gateway and Instructions screens before each test section.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
              </svg>
              Saved!
            </span>
          )}
          {error && <span className="text-xs font-bold text-red-500">{error}</span>}
          <button
            onClick={save}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60 transition-all"
            style={{ background: 'linear-gradient(135deg,#B45309,#D97706)', boxShadow: '0 3px 0 #92400E' }}
          >
            {saving ? 'Saving…' : 'Save All Changes'}
          </button>
        </div>
      </div>

      {/* Info box */}
      <div className="rounded-2xl p-4 mb-6 flex gap-3 items-start"
        style={{ background: '#EEF2FF', border: '1px solid #C7D2FE' }}>
        <span className="text-xl flex-shrink-0 mt-0.5">ℹ️</span>
        <div className="text-xs text-indigo-800 leading-relaxed">
          <strong>How it works:</strong> Instructions you set here override the default built-in text for each domain.
          Students see the <strong>Gateway</strong> screen (tagline + steps) and <strong>Instructions</strong> screen (how-it-works bullets)
          before starting each section. Leave any field blank to use the built-in defaults.
        </div>
      </div>

      {/* Domain cards */}
      {loading ? (
        <div className="text-center py-12 text-stone-400 text-sm">Loading…</div>
      ) : (
        <div className="flex flex-col gap-3">
          {DOMAINS.map(dm => (
            <DomainCard
              key={dm.key}
              domainMeta={dm}
              data={instructions[dm.key]}
              onChange={data => updateDomain(dm.key, data)}
            />
          ))}
        </div>
      )}

      {/* Bottom save */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="px-6 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60 transition-all"
          style={{ background: 'linear-gradient(135deg,#B45309,#D97706)', boxShadow: '0 3px 0 #92400E' }}
        >
          {saving ? 'Saving…' : 'Save All Changes'}
        </button>
      </div>
    </div>
  );
}
