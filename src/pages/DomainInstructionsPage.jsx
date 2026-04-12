import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { ChevronDown, Check, Plus, X, Info, Save, Lightbulb } from 'lucide-react';

// ── Domain metadata ──────────────────────────────────────────
const DOMAINS = [
  { key: 'gf',  label: 'Fluid Reasoning (Gf)' },
  { key: 'gv',  label: 'Visual Spatial (Gv)' },
  { key: 'gq',  label: 'Quantitative (Gq)' },
  { key: 'gc',  label: 'Verbal Reasoning (Gc)' },
  { key: 'gs',  label: 'Processing Speed (Gs)' },
  { key: 'gwm', label: 'Working Memory (Gwm)' },
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

const inputCls = 'w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-800 outline-none focus:border-amber-400 focus:bg-white transition-colors';
const labelCls = 'block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-2';

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
      <label className={labelCls}>{label}</label>
      <div className="flex flex-col gap-2">
        {items.map((line, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-stone-400 w-5 text-right flex-shrink-0">{i + 1}.</span>
            <input
              type="text"
              value={line}
              placeholder={placeholder}
              onChange={e => update(i, e.target.value)}
              className={inputCls}
            />
            <button
              onClick={() => removeRow(i)}
              disabled={items.length <= 1}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-stone-400 hover:text-rose-500 hover:bg-rose-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <X size={14} />
            </button>
          </div>
        ))}
        {items.length < max && (
          <button
            onClick={addRow}
            className="flex items-center gap-1.5 text-xs font-bold text-amber-700 hover:text-amber-800 transition-colors mt-1 ml-7"
          >
            <Plus size={13} /> Add line
          </button>
        )}
      </div>
    </div>
  );
}

function DomainCard({ domainMeta, data, onChange }) {
  const { label } = domainMeta;
  const d = data || { ...DEFAULT_DOMAIN };
  const [open, setOpen] = useState(false);

  const set = (field, val) => onChange({ ...d, [field]: val });

  const isConfigured = (d.instructions?.filter(Boolean).length > 0 || d.steps?.filter(Boolean).length > 0);

  return (
    <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
      {/* Header — click to expand */}
      <button
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-stone-50/60 transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-stone-900">{label}</div>
          <div className="text-xs text-stone-500 mt-0.5 truncate">
            {d.tagline || <span className="italic text-stone-400">No tagline set</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isConfigured && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Configured
            </span>
          )}
          <ChevronDown size={16} className={`text-stone-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Body */}
      {open && (
        <div className="px-5 pb-5 border-t border-stone-100 space-y-6 pt-5">
          {/* Tagline */}
          <div>
            <label className={labelCls}>
              Tagline <span className="normal-case font-normal text-stone-400">(shown on Gateway screen)</span>
            </label>
            <input
              type="text"
              value={d.tagline || ''}
              placeholder="e.g. Pattern Recognition & Logic"
              onChange={e => set('tagline', e.target.value)}
              className={inputCls}
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
            <label className={labelCls}>
              Pro Tip <span className="normal-case font-normal text-stone-400">(shown on Gateway screen)</span>
            </label>
            <textarea
              value={d.tip || ''}
              placeholder="e.g. Don't spend too long on any single question — go with your first instinct."
              onChange={e => set('tip', e.target.value)}
              rows={2}
              className={`${inputCls} resize-none`}
            />
          </div>

          {/* Practice question hint */}
          <div className="rounded-xl p-4 flex gap-3 text-xs text-stone-600 leading-relaxed bg-amber-50/60 border border-amber-100">
            <Lightbulb size={16} className="text-amber-700 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-800">Practice Questions</span> — Practice questions are
              pulled automatically from items marked <code className="bg-amber-100 px-1 rounded font-mono">is_practice = true</code> in
              the Item Bank for this domain. Mark items as practice there to use them here.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function DomainInstructionsPage() {
  const [instructions, setInstructions] = useState({});
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [error, setError]         = useState('');

  // ── Load existing config ──
  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const { rows } = await api.get('/config/all').catch(() => ({ rows: undefined }));
      const d = await api.get('/settings/domain_instructions').catch(() => null);
      const val = d?.value || null;
      if (val && typeof val === 'object') setInstructions(val);
    } catch { /* start empty */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
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
    <div className="min-h-screen bg-stone-50">
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-black text-stone-900">Domain Instructions</h1>
            <p className="text-sm text-stone-500 mt-1">
              Configure what students see on the Gateway and Instructions screens before each test section.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {saved && (
              <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                <Check size={14} /> Saved
              </span>
            )}
            {error && <span className="text-xs font-bold text-rose-600">{error}</span>}
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-2 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl px-5 py-2.5 text-sm transition-colors disabled:opacity-50"
            >
              <Save size={14} />
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Info box */}
        <div className="bg-white border border-stone-200 rounded-2xl p-4 mb-6 flex gap-3 items-start">
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
            <Info size={14} className="text-blue-600" />
          </div>
          <div className="text-xs text-stone-600 leading-relaxed">
            <strong className="text-stone-900">How it works:</strong> Instructions you set here override the default built-in text for each domain.
            Students see the <strong className="text-stone-900">Gateway</strong> screen (tagline + steps) and <strong className="text-stone-900">Instructions</strong> screen (how-it-works bullets)
            before starting each section. Leave any field blank to use the built-in defaults.
          </div>
        </div>

        {/* Domain cards */}
        {loading ? (
          <div className="bg-white border border-stone-200 rounded-2xl p-12 text-center">
            <div className="w-8 h-8 border-2 border-stone-300 border-t-stone-900 rounded-full animate-spin mx-auto mb-3" />
            <div className="text-sm text-stone-500">Loading…</div>
          </div>
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
            className="flex items-center gap-2 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl px-5 py-2.5 text-sm transition-colors disabled:opacity-50"
          >
            <Save size={14} />
            {saving ? 'Saving…' : 'Save All Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
