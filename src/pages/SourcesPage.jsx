/**
 * SourcesPage — super-admin-only management of all sources (institutions).
 *
 * Table view listing every source with counts, status, and CRUD actions.
 * For a wizard-style creation flow, see OnboardingPage's SourcesTab — this
 * page is a compact admin table intended for quick management.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import {
  Building2, Plus, Pencil, CheckCircle2, XCircle, Search,
  X, Trash2, Users, Database, Mail, Phone, MapPin, Lock
} from 'lucide-react';

const SOURCE_TYPES = [
  { value: 'school',  label: 'School'  },
  { value: 'tuition', label: 'Tuition' },
  { value: 'company', label: 'Company' },
  { value: 'clinic',  label: 'Clinic'  },
  { value: 'other',   label: 'Other'   },
];

// ─── Source Create / Edit Modal ──────────────────────────────────────────────
function SourceModal({ source, onClose, onSave }) {
  const isEdit = Boolean(source?.id);
  const [form, setForm] = useState(source ? { ...source } : {
    display_name: '', source_code: '', type: 'school', description: '',
    contact_email: '', contact_phone: '', city: '', is_active: true,
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k]) setErrors(e => ({ ...e, [k]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.display_name?.trim()) e.display_name = 'Name is required';
    if (!form.source_code?.trim()) e.source_code = 'Code is required';
    else if (!/^[a-z0-9-_]+$/.test(form.source_code)) e.source_code = 'Lowercase letters, numbers, - and _ only';
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
    } catch (err) {
      alert(err.message || 'Save failed');
    }
    setSaving(false);
  };

  const labelCls = 'block text-[10px] font-semibold uppercase tracking-[0.14em] mb-1.5';
  const labelStyle = { color: 'var(--slate-light)' };

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
          className="px-6 py-5 flex items-center justify-between flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div>
            <h2 className="text-lg font-display" style={{ color: 'var(--ink)' }}>
              {isEdit ? 'Edit source' : 'New source'}
            </h2>
            <p className="text-xs mt-1" style={{ color: 'var(--slate)' }}>
              Institution details and contact info
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn-ghost !p-2"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto px-6 py-5 flex flex-col gap-5">
          {/* Type pills */}
          <div>
            <label className={labelCls} style={labelStyle}>Type</label>
            <div className="grid grid-cols-5 gap-1.5">
              {SOURCE_TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => set('type', t.value)}
                  className="px-2 py-2 rounded-md text-[11px] font-semibold transition-colors"
                  style={
                    form.type === t.value
                      ? { background: 'var(--blush-pale)', color: 'var(--blush)', border: '1px solid var(--blush-pale)' }
                      : { background: 'var(--warm)', color: 'var(--slate)', border: '1px solid var(--border)' }
                  }
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className={labelCls} style={labelStyle}>
              Display Name <span style={{ color: 'var(--blush)' }}>*</span>
            </label>
            <input
              value={form.display_name || ''}
              onChange={e => set('display_name', e.target.value)}
              placeholder="IES Public School"
              className="input-field"
              style={errors.display_name ? { borderColor: 'var(--blush)' } : undefined}
            />
            {errors.display_name && (
              <p className="text-[11px] mt-1" style={{ color: 'var(--blush)' }}>{errors.display_name}</p>
            )}
          </div>

          {/* Code */}
          <div>
            <label className={labelCls} style={labelStyle}>
              Source Code <span style={{ color: 'var(--blush)' }}>*</span>
            </label>
            <input
              value={form.source_code || ''}
              onChange={e => set('source_code', e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''))}
              placeholder="ies"
              className="input-field font-mono"
              style={errors.source_code ? { borderColor: 'var(--blush)' } : undefined}
            />
            {errors.source_code && (
              <p className="text-[11px] mt-1" style={{ color: 'var(--blush)' }}>{errors.source_code}</p>
            )}
          </div>

          {/* Contact grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls} style={labelStyle}>Contact Email</label>
              <div className="relative">
                <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--slate-light)' }} />
                <input
                  type="email"
                  value={form.contact_email || ''}
                  onChange={e => set('contact_email', e.target.value)}
                  placeholder="admin@school.edu"
                  className="input-field pl-8"
                />
              </div>
            </div>
            <div>
              <label className={labelCls} style={labelStyle}>Contact Phone</label>
              <div className="relative">
                <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--slate-light)' }} />
                <input
                  value={form.contact_phone || ''}
                  onChange={e => set('contact_phone', e.target.value)}
                  placeholder="+91 98765 43210"
                  className="input-field pl-8"
                />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls} style={labelStyle}>City</label>
              <div className="relative">
                <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--slate-light)' }} />
                <input
                  value={form.city || ''}
                  onChange={e => set('city', e.target.value)}
                  placeholder="Mumbai"
                  className="input-field pl-8"
                />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls} style={labelStyle}>Description</label>
              <textarea
                value={form.description || ''}
                onChange={e => set('description', e.target.value)}
                rows={2}
                className="input-field resize-none"
              />
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

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SourcesPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [showModal, setShowModal] = useState(false);
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

  const handleToggle = async (src) => {
    try { await api.patch(`/sources/${src.id}/toggle`); load(); }
    catch (e) { alert(e.message); }
  };

  const handleDelete = async (src) => {
    if (!confirm(`Delete source "${src.display_name}"? This cannot be undone.`)) return;
    try { await api.del(`/sources/${src.id}`); load(); }
    catch (e) { alert(e.message); }
  };

  if (!isSuperAdmin) {
    return (
      <div className="page">
        <div className="px-6 lg:px-8 py-5 max-w-[1280px] mx-auto">
          <div className="card p-16 text-center animate-fade-up">
            <div
              className="w-14 h-14 rounded-md flex items-center justify-center mx-auto mb-4"
              style={{ background: 'var(--blush-pale)' }}
            >
              <Lock size={22} style={{ color: 'var(--blush)' }} />
            </div>
            <h2 className="font-display text-[22px]" style={{ color: 'var(--ink)' }}>Access denied</h2>
            <p className="text-[13px] mt-2" style={{ color: 'var(--slate)' }}>Only super admins can manage sources.</p>
          </div>
        </div>
      </div>
    );
  }

  const filtered = sources.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (s.display_name || '').toLowerCase().includes(q)
        || (s.source_code || '').toLowerCase().includes(q)
        || (s.city || '').toLowerCase().includes(q);
  });

  return (
    <div className="page">
      {/* Compact sticky topbar */}
      <div
        className="sticky top-0 z-30 flex items-center justify-between gap-3 px-6 lg:px-8 py-3"
        style={{ background: 'var(--warm)', borderBottom: '1px solid var(--border)' }}
      >
        <div>
          <h1 className="font-display text-[19px]" style={{ color: 'var(--ink)' }}>
            Active sources
          </h1>
          <p className="text-[11.5px] mt-0.5" style={{ color: 'var(--slate-light)' }}>
            {sources.length} institution{sources.length !== 1 ? 's' : ''} registered
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative min-w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--slate-light)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search sources…"
              className="input-field pl-9"
            />
          </div>
          <button
            onClick={() => { setEditSource(null); setShowModal(true); }}
            className="btn-primary"
          >
            <Plus size={14} /> New Source
          </button>
        </div>
      </div>

      <div className="px-6 lg:px-8 py-5 max-w-[1280px] mx-auto space-y-5">
        {/* Table */}
        <div className="card overflow-hidden animate-fade-up">
          {loading ? (
            <div className="p-16 text-center">
              <div
                className="w-8 h-8 rounded-full animate-spin mx-auto mb-3"
                style={{ border: '2px solid var(--border)', borderTopColor: 'var(--blush)' }}
              />
              <div className="text-sm" style={{ color: 'var(--slate)' }}>Loading sources…</div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-16 text-center">
              <div
                className="w-14 h-14 rounded-md flex items-center justify-center mx-auto mb-4"
                style={{ background: 'var(--warm)' }}
              >
                <Building2 size={24} style={{ color: 'var(--slate-light)' }} />
              </div>
              <div className="text-base font-semibold" style={{ color: 'var(--ink)' }}>No sources yet</div>
              <div className="text-sm mt-1.5" style={{ color: 'var(--slate)' }}>Create your first source to get started</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-pro">
                <thead>
                  <tr>
                    {['Name', 'Code', 'Type', 'Users', 'Items', 'Status', 'Actions'].map(h => (
                      <th key={h} className="whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(src => (
                    <tr key={src.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0"
                            style={{ background: 'var(--warm)', border: '1px solid var(--border)' }}
                          >
                            <Building2 size={14} style={{ color: 'var(--blush)' }} />
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-[13px] truncate max-w-[220px]" style={{ color: 'var(--ink)' }}>
                              {src.display_name}
                            </div>
                            {src.city && (
                              <div className="text-[11px] flex items-center gap-1 mt-0.5" style={{ color: 'var(--slate)' }}>
                                <MapPin size={10} /> {src.city}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <code
                          className="px-2 py-0.5 rounded-sm text-[11px] font-mono"
                          style={{ background: 'var(--warm)', color: 'var(--blush)' }}
                        >
                          {src.source_code}
                        </code>
                      </td>
                      <td>
                        <span className="chip capitalize">{src.type || 'other'}</span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5 text-[12px] font-semibold tabular-nums" style={{ color: 'var(--ink)' }}>
                          <Users size={12} style={{ color: 'var(--slate-light)' }} />
                          {src.user_count || src.student_count || 0}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5 text-[12px] font-semibold tabular-nums" style={{ color: 'var(--ink)' }}>
                          <Database size={12} style={{ color: 'var(--slate-light)' }} />
                          {src.item_count || 0}
                        </div>
                      </td>
                      <td>
                        <button
                          onClick={() => handleToggle(src)}
                          className={`badge ${src.is_active ? 'badge-sage' : 'badge-slate'}`}
                        >
                          {src.is_active
                            ? <><CheckCircle2 size={12} /> Active</>
                            : <><XCircle size={12} /> Inactive</>}
                        </button>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => { setEditSource(src); setShowModal(true); }}
                            className="btn-ghost !px-2.5 !py-1 text-[11px]"
                          >
                            <Pencil size={12} /> Edit
                          </button>
                          <button
                            onClick={() => handleDelete(src)}
                            className="btn-ghost !px-2.5 !py-1 text-[11px]"
                            style={{ color: 'var(--blush)' }}
                          >
                            <Trash2 size={12} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showModal && (
          <SourceModal
            source={editSource}
            onClose={() => { setShowModal(false); setEditSource(null); }}
            onSave={() => { setShowModal(false); setEditSource(null); load(); }}
          />
        )}
      </div>
    </div>
  );
}
