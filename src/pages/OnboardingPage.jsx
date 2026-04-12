import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import {
  Building2, Plus, Pencil, CheckCircle2, XCircle, Search,
  ChevronRight, Mail, MapPin, Info,
  Users, Rocket, ArrowRight, RefreshCw, Lock
} from 'lucide-react';

// ─── Source type options ──────────────────────────────────────────────────────
const SOURCE_TYPES = [
  { value: 'school',   label: 'School'  },
  { value: 'tuition',  label: 'Tuition' },
  { value: 'company',  label: 'Company' },
  { value: 'clinic',   label: 'Clinic'  },
  { value: 'other',    label: 'Other'   },
];

// ─── Smart abbreviation extractor ────────────────────────────────────────────
const STOP_WORDS = new Set(['the','a','an','of','and','for','in','at','by','to','or']);

function smartCode(name) {
  if (!name || !name.trim()) return '';
  const words = name.trim().split(/\s+/).filter(w => !STOP_WORDS.has(w.toLowerCase()));
  if (!words.length) return '';

  const first = words[0];
  if (/^[A-Z]{2,6}$/.test(first)) {
    return first.toLowerCase();
  }

  if (words.length === 1) {
    return first.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12);
  }

  return words.map(w => w[0]).join('').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10);
}

const labelCls = 'block text-[10px] font-semibold uppercase tracking-[0.14em] mb-1.5';
const labelStyle = { color: 'var(--slate-light)' };

// ─── Source Form Modal ────────────────────────────────────────────────────────
function SourceModal({ source, onClose, onSave }) {
  const isEdit = Boolean(source?.id);
  const [form, setForm] = useState(source ? { ...source } : {
    display_name: '', source_code: '', description: '',
    type: 'school', contact_name: '', contact_email: '',
    contact_phone: '', city: '', state: '',
  });
  const [saving, setSaving]     = useState(false);
  const [codeManual, setCodeManual] = useState(isEdit);
  const [errors, setErrors]     = useState({});

  const handleNameChange = (val) => {
    const next = { ...form, display_name: val };
    if (!codeManual) {
      next.source_code = smartCode(val);
    }
    setForm(next);
    if (errors.display_name) setErrors(e => ({ ...e, display_name: '' }));
  };

  const handleCodeChange = (val) => {
    const cleaned = val.toLowerCase().replace(/[^a-z0-9-_]/g, '').slice(0, 30);
    setForm(f => ({ ...f, source_code: cleaned }));
    setCodeManual(true);
    if (errors.source_code) setErrors(e => ({ ...e, source_code: '' }));
  };

  const resetCodeToAuto = () => {
    setCodeManual(false);
    setForm(f => ({ ...f, source_code: smartCode(f.display_name) }));
  };

  const validate = () => {
    const e = {};
    if (!form.display_name.trim()) e.display_name = 'Display name is required';
    if (!form.source_code.trim())  e.source_code  = 'Source code is required';
    else if (!/^[a-z0-9-_]+$/.test(form.source_code))
      e.source_code = 'Only lowercase letters, numbers, hyphens and underscores';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (isEdit) await api.put(`/sources/${source.id}`, form);
      else        await api.post('/sources', form);
      onSave();
    } catch (err) { alert(err.message); }
    setSaving(false);
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: 'rgba(10, 22, 40, 0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="card shadow-lg w-full max-w-lg flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-6 pt-6 pb-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <h2 className="font-display text-lg" style={{ color: 'var(--ink)' }}>
            {isEdit ? 'Edit Source' : 'Add New Source'}
          </h2>
          <p className="text-xs mt-1" style={{ color: 'var(--slate)' }}>
            A source is a school, tuition centre, or any institution you manage.
          </p>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto px-6 py-5 flex flex-col gap-5">
          {/* Type */}
          <div>
            <label className={labelCls} style={labelStyle}>Type</label>
            <div
              className="flex flex-wrap gap-1 p-1 rounded-md w-fit"
              style={{ background: 'var(--warm)', border: '1px solid var(--border)' }}
            >
              {SOURCE_TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, type: t.value }))}
                  className="px-3 py-1.5 rounded-sm text-xs font-medium transition-all"
                  style={
                    form.type === t.value
                      ? { background: 'var(--blush-pale)', color: 'var(--blush)' }
                      : { background: 'transparent', color: 'var(--slate)' }
                  }
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Display Name */}
          <div>
            <label className={labelCls} style={labelStyle}>
              Display Name <span style={{ color: 'var(--blush)' }}>*</span>
            </label>
            <input
              type="text"
              value={form.display_name}
              onChange={e => handleNameChange(e.target.value)}
              placeholder="e.g. IES School, Delhi Public School, Bright Tutors"
              autoFocus
              className="input-field"
              style={errors.display_name ? { borderColor: 'var(--blush)' } : undefined}
            />
            {errors.display_name
              ? <p className="text-[11px] mt-1.5" style={{ color: 'var(--blush)' }}>{errors.display_name}</p>
              : <p className="text-[11px] mt-1.5" style={{ color: 'var(--slate-light)' }}>The full name shown everywhere in the UI</p>
            }
          </div>

          {/* Source Code */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={labelStyle}>
                Source Code <span style={{ color: 'var(--blush)' }}>*</span>
              </label>
              {!isEdit && codeManual && (
                <button
                  type="button"
                  onClick={resetCodeToAuto}
                  className="flex items-center gap-1 text-[10px] font-semibold hover:underline"
                  style={{ color: 'var(--blush)' }}
                >
                  <RefreshCw size={10} /> Auto-suggest
                </button>
              )}
              {isEdit && (
                <span className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: 'var(--slate-light)' }}>
                  <Lock size={10} /> Fixed after creation
                </span>
              )}
            </div>

            <div
              className="flex items-center rounded-md overflow-hidden transition-colors"
              style={{
                border: errors.source_code
                  ? '1px solid var(--blush)'
                  : '1px solid var(--border)',
                background: isEdit ? 'var(--warm)' : 'var(--card)',
              }}
            >
              <span
                className="px-3 py-2.5 text-sm font-semibold select-none"
                style={{ color: 'var(--slate-light)', borderRight: '1px solid var(--border)' }}
              >
                #
              </span>
              <input
                type="text"
                value={form.source_code}
                onChange={e => handleCodeChange(e.target.value)}
                placeholder="ies"
                disabled={isEdit}
                className="flex-1 px-3 py-2.5 text-sm font-mono font-semibold bg-transparent outline-none placeholder:font-normal disabled:cursor-not-allowed"
                style={{ color: 'var(--ink)' }}
              />
            </div>

            {errors.source_code ? (
              <p className="text-[11px] mt-1.5" style={{ color: 'var(--blush)' }}>{errors.source_code}</p>
            ) : (
              <p className="text-[11px] mt-1.5" style={{ color: 'var(--slate-light)' }}>
                {isEdit
                  ? 'Cannot be changed — used as the permanent tenant identifier.'
                  : 'Short unique ID. Lowercase letters, numbers, hyphens. e.g. ies, dps, bright-tutors'}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className={labelCls} style={labelStyle}>
              Description <span className="font-normal normal-case" style={{ color: 'var(--slate-light)' }}>(optional)</span>
            </label>
            <textarea
              value={form.description || ''}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Any notes — batch name, academic year, location…"
              rows={2}
              className="input-field resize-none"
            />
          </div>

          {/* Contact */}
          <div>
            <label className={labelCls} style={labelStyle}>
              Contact &amp; Location <span className="font-normal normal-case" style={{ color: 'var(--slate-light)' }}>(optional)</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { field: 'contact_name',  label: 'Contact Name',  placeholder: 'Coordinator name'   },
                { field: 'contact_phone', label: 'Phone',         placeholder: '+91 98765 43210'    },
                { field: 'contact_email', label: 'Email',         placeholder: 'admin@school.com', type: 'email' },
                { field: 'city',          label: 'City',          placeholder: 'Mumbai'             },
              ].map(({ field, label, placeholder, type = 'text' }) => (
                <div key={field}>
                  <label
                    className="block text-[10px] font-semibold uppercase tracking-[0.14em] mb-1"
                    style={labelStyle}
                  >
                    {label}
                  </label>
                  <input
                    type={type}
                    value={form[field] || ''}
                    onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                    placeholder={placeholder}
                    className="input-field"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 flex items-center justify-end gap-2 flex-shrink-0"
          style={{ borderTop: '1px solid var(--border)', background: 'var(--warm)' }}
        >
          <button onClick={onClose} className="btn-secondary !px-5 !py-2.5">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving} className="btn-primary !px-5 !py-2.5">
            {saving ? 'Saving…' : isEdit ? 'Update Source' : 'Create Source'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Source Card ──────────────────────────────────────────────────────────────
function SourceCard({ source, onEdit, onToggle }) {
  return (
    <div
      className={`card card-hover p-6 group ${
        source.is_active ? '' : 'opacity-60'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--warm)', border: '1px solid var(--border)' }}
          >
            <Building2 size={16} style={{ color: 'var(--blush)' }} />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm leading-tight truncate" style={{ color: 'var(--ink)' }}>
              {source.display_name}
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <code
                className="px-2 py-0.5 rounded-sm text-[10px] font-mono font-semibold"
                style={{ background: 'var(--warm)', color: 'var(--blush)' }}
              >
                #{source.source_code}
              </code>
              <span
                className={`badge ${source.is_active ? 'badge-sage' : 'badge-blush'}`}
              >
                {source.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button
            onClick={() => onEdit(source)}
            className="btn-ghost !p-2"
            title="Edit"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => onToggle(source)}
            className="btn-ghost !p-2"
            title={source.is_active ? 'Deactivate' : 'Activate'}
          >
            {source.is_active ? <XCircle size={14} /> : <CheckCircle2 size={14} />}
          </button>
        </div>
      </div>

      {source.description && (
        <p className="text-xs mt-3 leading-relaxed line-clamp-2" style={{ color: 'var(--slate)' }}>
          {source.description}
        </p>
      )}

      <div
        className="flex items-center gap-4 mt-4 pt-3 flex-wrap"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--slate)' }}>
          <Users size={12} />
          <span>
            <strong className="font-semibold tabular-nums" style={{ color: 'var(--ink)' }}>{source.user_count || 0}</strong> users
          </span>
        </div>
        {source.city && (
          <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--slate)' }}>
            <MapPin size={12} />
            <span>{source.city}</span>
          </div>
        )}
        {source.contact_email && (
          <div className="flex items-center gap-1.5 text-[11px] truncate min-w-0" style={{ color: 'var(--slate)' }}>
            <Mail size={12} className="flex-shrink-0" />
            <span className="truncate">{source.contact_email}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sources Tab ──────────────────────────────────────────────────────────────
function SourcesTab() {
  const { user } = useAuth();
  const [sources, setSources]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [showModal, setShowModal]   = useState(false);
  const [editSource, setEditSource] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    const q = search ? `?search=${encodeURIComponent(search)}` : '';
    api.get(`/sources${q}`)
      .then(d => setSources(d.sources || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (source) => {
    try { await api.patch(`/sources/${source.id}/toggle`); load(); }
    catch (e) { alert(e.message); }
  };

  const canManage = ['super_admin', 'client_admin'].includes(user?.role);

  return (
    <div>
      {/* Sub-header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 flex-wrap">
        <div>
          <h2 className="text-base font-semibold" style={{ color: 'var(--ink)' }}>Sources</h2>
          <p className="text-xs mt-1" style={{ color: 'var(--slate)' }}>
            {sources.length} source{sources.length !== 1 ? 's' : ''} · Schools, tuition centres, and organisations
          </p>
        </div>
        <div className="flex gap-3 items-center flex-wrap">
          <div className="relative min-w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--slate-light)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search sources…"
              className="input-field pl-9"
            />
          </div>
          {canManage && (
            <button
              onClick={() => { setEditSource(null); setShowModal(true); }}
              className="btn-primary"
            >
              <Plus size={14} />
              New Source
            </button>
          )}
        </div>
      </div>

      {/* Empty state */}
      {!loading && sources.length === 0 && (
        <div className="card p-16 text-center">
          <div
            className="w-14 h-14 rounded-md flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--warm)' }}
          >
            <Building2 size={24} style={{ color: 'var(--slate-light)' }} />
          </div>
          <h3 className="font-display text-lg mb-2" style={{ color: 'var(--ink)' }}>No sources yet</h3>
          <p className="text-sm max-w-xs mx-auto mb-6" style={{ color: 'var(--slate)' }}>
            Create your first source to start managing students by school or institution.
          </p>
          {canManage && (
            <button
              onClick={() => { setEditSource(null); setShowModal(true); }}
              className="btn-primary"
            >
              <Plus size={14} />
              Create First Source
            </button>
          )}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1,2,3].map(i => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-md" style={{ background: 'var(--warm)' }} />
                <div className="flex-1">
                  <div className="h-4 rounded mb-2 w-2/3" style={{ background: 'var(--warm)' }} />
                  <div className="h-3 rounded w-1/2" style={{ background: 'var(--warm)' }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Grid */}
      {!loading && sources.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 stagger">
          {sources.map(s => (
            <SourceCard
              key={s.id}
              source={s}
              onEdit={src => { setEditSource(src); setShowModal(true); }}
              onToggle={handleToggle}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <SourceModal
          source={editSource}
          onClose={() => { setShowModal(false); setEditSource(null); }}
          onSave={() => { setShowModal(false); setEditSource(null); load(); }}
        />
      )}
    </div>
  );
}

// ─── Getting Started Tab ──────────────────────────────────────────────────────
function GettingStartedTab({ onGoToSources }) {
  const steps = [
    {
      num: '01', title: 'Create a Source',
      desc: 'Add your first school, tuition centre or organisation. The source code (e.g. "ies") becomes the unique tenant identifier for all data.',
      action: 'Create Source', onClick: onGoToSources,
    },
    {
      num: '02', title: 'Add Students',
      desc: 'Go to Users and create student profiles. Assign them to a source and set whether they\'re from a school batch or individual tuition.',
      action: null,
    },
    {
      num: '03', title: 'Build a Battery',
      desc: 'A battery is a collection of test sections. Set up domain-specific question banks and assemble them into a single test.',
      action: null,
    },
    {
      num: '04', title: 'Assign & Run Sessions',
      desc: 'Assign a battery to a student or a school batch. Students get a test session link or token to begin.',
      action: null,
    },
    {
      num: '05', title: 'Generate Reports',
      desc: 'Once a session is complete, generate a psychometric report. Share with guardians or the school counsellor.',
      action: null,
    },
  ];

  return (
    <div className="max-w-3xl">
      {/* Hero */}
      <div className="card p-6 mb-5">
        <h2 className="font-display text-[22px] mb-1.5" style={{ color: 'var(--ink)' }}>
          Welcome to CogniMap
        </h2>
        <p className="text-[13px] leading-relaxed" style={{ color: 'var(--slate)' }}>
          CogniMap is a multi-tenant psychometric assessment platform. Follow the steps below to set up
          your first source and start assessing students.
        </p>
      </div>

      {/* Steps */}
      <div className="flex flex-col gap-4 stagger">
        {steps.map((step) => (
          <div
            key={step.num}
            className="card card-hover p-6 flex items-start gap-4"
          >
            <div
              className="w-11 h-11 rounded-md flex items-center justify-center flex-shrink-0 font-display"
              style={{ background: 'var(--warm)', color: 'var(--blush)', fontSize: 16, border: '1px solid var(--border)' }}
            >
              {step.num}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{step.title}</h3>
              <p className="text-xs leading-relaxed mt-1" style={{ color: 'var(--slate)' }}>{step.desc}</p>
              {step.action && (
                <button
                  onClick={step.onClick}
                  className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold hover:underline transition-colors"
                  style={{ color: 'var(--blush)' }}
                >
                  {step.action} <ArrowRight size={13} />
                </button>
              )}
            </div>
            <ChevronRight size={16} className="flex-shrink-0 mt-1" style={{ color: 'var(--slate-light)' }} />
          </div>
        ))}
      </div>

      {/* Info box */}
      <div
        className="mt-8 rounded-md p-5 flex gap-3"
        style={{ background: 'var(--sage-pale)', border: '1px solid var(--sage-pale)' }}
      >
        <Info size={16} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--blush)' }} />
        <p className="text-xs leading-relaxed" style={{ color: 'var(--ink)' }}>
          <strong className="font-semibold">Multi-tenant design:</strong> Every piece of data — users, sessions, reports — is
          tagged with a source. This lets you manage multiple schools or batches from a single admin account while
          keeping data cleanly separated.
        </p>
      </div>
    </div>
  );
}

// ─── Main Onboarding Page ─────────────────────────────────────────────────────
export default function OnboardingPage() {
  const [activeTab, setActiveTab] = useState('start');

  const tabs = [
    { id: 'start',   label: 'Getting Started', icon: Rocket },
    { id: 'sources', label: 'Sources',         icon: Building2 },
  ];

  return (
    <div className="page">
      {/* Compact sticky topbar */}
      <div
        className="sticky top-0 z-30 flex items-center justify-between px-6 lg:px-8 py-3"
        style={{ background: 'var(--warm)', borderBottom: '1px solid var(--border)' }}
      >
        <div>
          <h1 className="font-display text-[19px]" style={{ color: 'var(--ink)' }}>
            Platform onboarding
          </h1>
          <p className="text-[11.5px] mt-0.5" style={{ color: 'var(--slate-light)' }}>
            First-time setup and institution registration
          </p>
        </div>
      </div>

      <div className="px-6 lg:px-8 py-5 max-w-[1280px] mx-auto space-y-5">
        {/* Tab bar */}
        <div
          className="flex items-center gap-1 p-1 rounded-md w-fit"
          style={{ background: 'var(--warm)', border: '1px solid var(--border)' }}
        >
          {tabs.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-semibold transition-all"
                style={
                  active
                    ? { background: 'var(--blush-pale)', color: 'var(--blush)' }
                    : { background: 'transparent', color: 'var(--slate)' }
                }
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        {activeTab === 'start' && (
          <GettingStartedTab onGoToSources={() => setActiveTab('sources')} />
        )}
        {activeTab === 'sources' && <SourcesTab />}
      </div>
    </div>
  );
}
