/**
 * SettingsPage — Per-source question limit configuration
 *
 * Lets the admin set how many questions a student answers per
 * cognitive domain / personality trait / interest dimension within a test.
 * Saved into sources.metadata.questionsPerDomain — applies only to the
 * currently active source.
 */
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSource } from '../context/SourceContext';
import api from '../utils/api';
import { Brain, Heart, Compass, Save, Lock, RotateCcw, Info } from 'lucide-react';

// ─── Domain definitions ──────────────────────────────────────────────────────
const SECTIONS = [
  {
    key: 'cognitive',
    label: 'Cognitive Aptitude',
    icon: Brain,
    description: 'Number of questions asked per cognitive domain in one test.',
    domains: [
      { key: 'gf',  name: 'Fluid Reasoning',  short: 'Gf' },
      { key: 'gv',  name: 'Visual Spatial',   short: 'Gv' },
      { key: 'gq',  name: 'Quantitative',     short: 'Gq' },
      { key: 'gc',  name: 'Verbal Reasoning', short: 'Gc' },
      { key: 'gs',  name: 'Processing Speed', short: 'Gs' },
      { key: 'gwm', name: 'Working Memory',   short: 'Gwm' },
    ],
    defaultLimit: 15,
  },
  {
    key: 'personality',
    label: 'Personality (Big Five)',
    icon: Heart,
    description: 'Number of items per personality trait.',
    domains: [
      { key: 'openness',          name: 'Openness',          short: 'O' },
      { key: 'conscientiousness', name: 'Conscientiousness', short: 'C' },
      { key: 'extraversion',      name: 'Extraversion',      short: 'E' },
      { key: 'agreeableness',     name: 'Agreeableness',     short: 'A' },
      { key: 'neuroticism',       name: 'Neuroticism',       short: 'N' },
    ],
    defaultLimit: 10,
  },
  {
    key: 'interest',
    label: 'Interest (RIASEC)',
    icon: Compass,
    description: 'Number of items per RIASEC interest dimension.',
    domains: [
      { key: 'realistic',     name: 'Realistic',     short: 'R' },
      { key: 'investigative', name: 'Investigative', short: 'I' },
      { key: 'artistic',      name: 'Artistic',      short: 'A' },
      { key: 'social',        name: 'Social',        short: 'S' },
      { key: 'enterprising',  name: 'Enterprising',  short: 'E' },
      { key: 'conventional',  name: 'Conventional',  short: 'C' },
    ],
    defaultLimit: 8,
  },
];

// Build a default config object with all domain → defaultLimit
function buildDefaults() {
  const out = {};
  for (const sec of SECTIONS) {
    out[sec.key] = {};
    for (const d of sec.domains) out[sec.key][d.key] = sec.defaultLimit;
  }
  return out;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const { activeSource, activeSourceId } = useSource();
  const [config, setConfig] = useState(buildDefaults);
  const [original, setOriginal] = useState(buildDefaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [error, setError] = useState('');

  // ── Load source settings ──
  const loadSettings = useCallback(async () => {
    if (!activeSourceId) { setLoading(false); return; }
    setLoading(true);
    try {
      const data = await api.get(`/sources/${activeSourceId}/settings`);
      const merged = buildDefaults();
      // Merge stored values over defaults so newly added domains get default values
      for (const sec of SECTIONS) {
        const stored = data?.questionsPerDomain?.[sec.key] || {};
        for (const d of sec.domains) {
          if (stored[d.key] != null) merged[sec.key][d.key] = stored[d.key];
        }
      }
      setConfig(merged);
      setOriginal(merged);
    } catch (err) {
      setError(err.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, [activeSourceId]);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const updateValue = (sectionKey, domainKey, value) => {
    const n = parseInt(value, 10);
    setConfig(prev => ({
      ...prev,
      [sectionKey]: { ...prev[sectionKey], [domainKey]: Number.isFinite(n) ? n : '' },
    }));
  };

  const setSectionAll = (sectionKey, value) => {
    const n = parseInt(value, 10);
    if (!Number.isFinite(n) || n < 1) return;
    const sec = SECTIONS.find(s => s.key === sectionKey);
    const next = { ...config[sectionKey] };
    for (const d of sec.domains) next[d.key] = n;
    setConfig(prev => ({ ...prev, [sectionKey]: next }));
  };

  const resetSection = (sectionKey) => {
    const sec = SECTIONS.find(s => s.key === sectionKey);
    const next = {};
    for (const d of sec.domains) next[d.key] = sec.defaultLimit;
    setConfig(prev => ({ ...prev, [sectionKey]: next }));
  };

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      // Validate — every value must be 1..100
      for (const sec of SECTIONS) {
        for (const d of sec.domains) {
          const v = config[sec.key][d.key];
          if (!Number.isFinite(v) || v < 1 || v > 100) {
            setError(`Invalid value for ${sec.label} → ${d.name}. Must be between 1 and 100.`);
            setSaving(false);
            return;
          }
        }
      }
      await api.put(`/sources/${activeSourceId}/settings`, { questionsPerDomain: config });
      setOriginal(config);
      setSavedAt(Date.now());
      setTimeout(() => setSavedAt(null), 3000);
    } catch (err) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setConfig(original);
    setError('');
  };

  // Has unsaved changes?
  const isDirty = JSON.stringify(config) !== JSON.stringify(original);

  // ── Restricted view if not admin ──
  if (!['super_admin', 'client_admin', 'psychologist'].includes(user?.role)) {
    return (
      <div className="page">
        <div className="max-w-md mx-auto pt-32 px-6 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center"
            style={{ background: 'var(--blush-pale)', color: 'var(--blush)' }}>
            <Lock size={20} />
          </div>
          <h2 className="font-display text-[20px] mb-1" style={{ color: 'var(--ink)' }}>Access restricted</h2>
          <p className="text-[13px]" style={{ color: 'var(--slate-light)' }}>
            Only administrators can configure platform settings.
          </p>
        </div>
      </div>
    );
  }

  // ── No source selected ──
  if (!activeSourceId) {
    return (
      <div className="page">
        <div className="sticky top-0 z-30 flex items-center justify-between px-6 lg:px-8 py-3"
          style={{ background: 'var(--warm)', borderBottom: '1px solid var(--border)' }}>
          <div>
            <h1 className="font-display text-[19px]" style={{ color: 'var(--ink)' }}>Settings</h1>
            <p className="text-[11.5px] mt-0.5" style={{ color: 'var(--slate-light)' }}>Question limits per test section</p>
          </div>
        </div>
        <div className="max-w-md mx-auto pt-20 px-6 text-center">
          <p className="text-[13px]" style={{ color: 'var(--slate-light)' }}>
            Select a source first to configure its settings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      {/* ── Compact sticky topbar ── */}
      <div className="sticky top-0 z-30 flex items-center justify-between px-6 lg:px-8 py-3"
        style={{ background: 'var(--warm)', borderBottom: '1px solid var(--border)' }}>
        <div>
          <h1 className="font-display text-[19px]" style={{ color: 'var(--ink)' }}>
            Test Settings
          </h1>
          <p className="text-[11.5px] mt-0.5" style={{ color: 'var(--slate-light)' }}>
            {activeSource?.display_name && (
              <>For <strong style={{ color: 'var(--ink)' }}>{activeSource.display_name}</strong> · </>
            )}
            How many questions students answer per section
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isDirty && (
            <button onClick={handleReset} className="btn-secondary" disabled={saving}>
              <RotateCcw size={13} /> Discard
            </button>
          )}
          <button onClick={handleSave} className="btn-primary" disabled={saving || !isDirty}>
            <Save size={13} />
            {saving ? 'Saving…' : isDirty ? 'Save changes' : 'Saved'}
          </button>
        </div>
      </div>

      <div className="px-6 lg:px-8 py-5 max-w-3xl mx-auto space-y-4">

        {/* Info banner */}
        <div className="card p-4 flex items-start gap-3">
          <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--sage-pale)', color: 'var(--sage)' }}>
            <Info size={14} />
          </div>
          <div className="text-[12.5px]" style={{ color: 'var(--slate)' }}>
            Configure how many questions each student answers per section in a test.
            For example, if you set <strong>Fluid Reasoning</strong> to <code className="chip">5</code>, every student will see exactly 5 fluid reasoning questions when they start a cognitive test from this source.
          </div>
        </div>

        {/* Saved indicator */}
        {savedAt && (
          <div className="card p-3 flex items-center gap-2 animate-fade-up"
            style={{ background: 'var(--sage-pale)', borderColor: 'var(--sage)' }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--sage)' }} />
            <span className="text-[12px] font-medium" style={{ color: 'var(--sage)' }}>
              Settings saved successfully
            </span>
          </div>
        )}

        {/* Error indicator */}
        {error && (
          <div className="card p-3 flex items-center gap-2"
            style={{ background: 'var(--blush-pale)', borderColor: 'var(--blush)' }}>
            <span className="text-[12px] font-medium" style={{ color: 'var(--blush)' }}>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="card p-12 text-center">
            <div className="text-[13px]" style={{ color: 'var(--slate-light)' }}>Loading settings…</div>
          </div>
        ) : (
          /* ── Section cards ── */
          SECTIONS.map(sec => {
            const Icon = sec.icon;
            return (
              <div key={sec.key} className="card p-5">
                {/* Section header */}
                <div className="flex items-start justify-between mb-4 gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0"
                      style={{ background: 'var(--blush-pale)', color: 'var(--blush)' }}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <div className="section-title">{sec.label}</div>
                      <div className="section-desc">{sec.description}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => resetSection(sec.key)}
                      className="btn-ghost"
                      title="Reset to default">
                      Reset
                    </button>
                    <SetAllDropdown onPick={(n) => setSectionAll(sec.key, n)} />
                  </div>
                </div>

                {/* Domain inputs grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {sec.domains.map(d => {
                    const value = config[sec.key]?.[d.key] ?? '';
                    return (
                      <div key={d.key}
                        className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-md"
                        style={{ background: 'var(--warm)', border: '1px solid var(--border)' }}>
                        <div className="min-w-0">
                          <div className="text-[12.5px] font-medium truncate" style={{ color: 'var(--ink)' }}>
                            {d.name}
                          </div>
                          <div className="text-[10px] uppercase mt-0.5" style={{ color: 'var(--slate-light)', letterSpacing: '1.5px' }}>
                            {d.short}
                          </div>
                        </div>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={value}
                          onChange={e => updateValue(sec.key, d.key, e.target.value)}
                          className="w-14 text-center text-[14px] font-semibold tabular-nums px-2 py-1.5 rounded-md outline-none transition-all"
                          style={{
                            background: 'var(--card)',
                            border: '1px solid var(--border)',
                            color: 'var(--ink)',
                          }}
                          onFocus={e => { e.currentTarget.style.borderColor = 'var(--blush)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(201,125,95,0.10)'; }}
                          onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Total preview */}
                <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px dashed var(--border)' }}>
                  <span className="text-[11px]" style={{ color: 'var(--slate-light)' }}>
                    Total questions per test
                  </span>
                  <span className="text-[14px] font-display tabular-nums" style={{ color: 'var(--ink)' }}>
                    {sec.domains.reduce((sum, d) => {
                      const v = config[sec.key]?.[d.key];
                      return sum + (Number.isFinite(v) ? v : 0);
                    }, 0)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Set-all dropdown ────────────────────────────────────────────────────────
function SetAllDropdown({ onPick }) {
  const [open, setOpen] = useState(false);
  const opts = [5, 10, 15, 20];
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} className="btn-ghost">
        Set all
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 rounded-md overflow-hidden"
            style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}>
            {opts.map(n => (
              <button key={n}
                onClick={() => { onPick(n); setOpen(false); }}
                className="w-full px-4 py-2 text-[12.5px] text-left transition-colors"
                style={{ color: 'var(--ink)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--warm)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                {n} per section
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
