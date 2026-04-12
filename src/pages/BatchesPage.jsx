import { useState, useEffect, Fragment } from 'react';
import api from '../utils/api';
import { useBatch } from '../context/BatchContext';
import {
  Layers, Plus, Search, X, Pencil, Trash2, ChevronDown, ChevronRight,
  Users, CheckCircle2, XCircle,
} from 'lucide-react';

const GRADE_OPTIONS = [
  '', 'Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7',
  'Grade 8','Grade 9','Grade 10','Grade 11','Grade 12',
  'Undergraduate','Postgraduate','Other'
].map(v => ({ value: v, label: v || '— Select grade —' }));

// ─── Reusable field bits ─────────────────────────────────────────────────────
function FieldInput({ label, field, type = 'text', placeholder, value, onChange, required, hint, error }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-ink-faint uppercase tracking-wider mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value || ''}
        onChange={e => onChange(field, e.target.value)}
        placeholder={placeholder}
        className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-semibold border-2 focus:outline-none transition-colors ${
          error ? 'border-red-300 bg-red-50' : 'border-ivory-200 bg-ivory-50 focus:border-amber-400'
        }`}
      />
      {error   && <p className="text-[11px] text-red-500 mt-1">{error}</p>}
      {hint && !error && <p className="text-[10px] text-ink-faint mt-1">{hint}</p>}
    </div>
  );
}

function FieldSelect({ label, field, value, onChange, options, required, hint }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-ink-faint uppercase tracking-wider mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <div className="relative">
        <select
          value={value || ''}
          onChange={e => onChange(field, e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-xl text-sm font-semibold border-2 border-ivory-200 bg-ivory-50 focus:border-amber-400 focus:outline-none appearance-none pr-9 transition-colors"
        >
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none" />
      </div>
      {hint && <p className="text-[10px] text-ink-faint mt-1">{hint}</p>}
    </div>
  );
}

// ─── Batch Create / Edit Modal ───────────────────────────────────────────────
function BatchModal({ batch, onClose, onSave }) {
  const isEdit = Boolean(batch?.id);
  const [form, setForm] = useState(batch ? {
    name: batch.name || '',
    code: batch.code || '',
    description: batch.description || '',
    grade: batch.grade || '',
    section: batch.section || '',
    academic_year: batch.academic_year || '',
  } : {
    name: '', code: '', description: '',
    grade: '', section: '', academic_year: '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
    if (errors[field]) setErrors(e => ({ ...e, [field]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.code.trim()) e.code = 'Code is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim(),
        description: form.description || '',
        grade: form.grade || null,
        section: form.section || null,
        academic_year: form.academic_year || null,
      };
      if (isEdit) {
        await api.put(`/batches/${batch.id}`, payload);
      } else {
        await api.post('/batches', payload);
      }
      onSave();
    } catch (err) {
      alert(err.message || 'Failed to save batch');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-3xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl border border-ivory-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-7 py-5 border-b border-ivory-200 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #B45309, #D97706)' }}>
              <Layers size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-black text-ink">
                {isEdit ? `Edit — ${batch.name}` : 'Create Batch'}
              </h2>
              <p className="text-[11px] text-ink-faint mt-0.5">
                {isEdit ? 'Update batch details' : 'Group students into a named batch'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-ivory-100 text-ink-faint hover:text-ink transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto px-7 py-6 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <FieldInput label="Name" field="name" value={form.name} onChange={set} required
              placeholder="e.g. Class 10 – Morning"
              error={errors.name}
            />
            <FieldInput label="Code" field="code" value={form.code} onChange={set} required
              placeholder="e.g. 10A-2026"
              hint="Short unique identifier"
              error={errors.code}
            />
            <FieldSelect label="Grade" field="grade" value={form.grade} onChange={set} options={GRADE_OPTIONS} />
            <FieldInput label="Section" field="section" value={form.section} onChange={set} placeholder="e.g. A, B, Science" />
            <FieldInput label="Academic Year" field="academic_year" value={form.academic_year} onChange={set}
              placeholder="e.g. 2025-2026"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-ink-faint uppercase tracking-wider mb-1.5">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Optional notes about this batch…"
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm font-semibold border-2 border-ivory-200 bg-ivory-50 focus:border-amber-400 focus:outline-none transition-colors resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-7 py-4 border-t border-ivory-200 flex items-center justify-end gap-3 flex-shrink-0 bg-ivory-50 rounded-b-3xl">
          <button onClick={onClose}
            className="px-5 py-2.5 text-sm font-bold text-ink-dim hover:text-ink transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="px-6 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 text-white font-bold rounded-xl text-sm
                       shadow-[0_3px_0_#92400E] hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50">
            {saving ? 'Saving…' : isEdit ? 'Update Batch' : 'Create Batch'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Expanded Row — student list ─────────────────────────────────────────────
function BatchStudents({ batchId }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get(`/batches/${batchId}`)
      .then(d => { if (!cancelled) setData(d.batch || d); })
      .catch(() => { if (!cancelled) setData(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [batchId]);

  if (loading) {
    return (
      <div className="p-6 text-center text-xs text-ink-faint">
        <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        Loading students…
      </div>
    );
  }

  const students = data?.students || [];

  if (students.length === 0) {
    return (
      <div className="p-6 text-center">
        <div className="text-2xl mb-1">👥</div>
        <div className="text-sm font-bold text-ink-dim">No students in this batch yet</div>
        <div className="text-[11px] text-ink-faint mt-1">Assign students via the Users page or bulk-assign API</div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="text-[10px] font-bold text-ink-faint uppercase tracking-wider mb-2">
        Students ({students.length})
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {students.map(s => (
          <div key={s.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-ivory-50 border border-ivory-200">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-[11px] font-black"
              style={{ background: 'linear-gradient(135deg, #FDE68A, #F59E0B)', color: '#92400E' }}>
              {(s.first_name?.[0] || '').toUpperCase()}{(s.last_name?.[0] || '').toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-[12px] font-bold text-ink truncate">{s.first_name} {s.last_name}</div>
              <div className="text-[10px] text-ink-faint truncate">{s.email}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function BatchesPage() {
  const { batches, refreshBatches, loading: batchLoading } = useBatch();
  const [search, setSearch] = useState('');
  const [editBatch, setEditBatch] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [expanded, setExpanded] = useState(null);

  const filtered = batches.filter(b => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (b.name || '').toLowerCase().includes(q)
        || (b.code || '').toLowerCase().includes(q)
        || (b.grade || '').toLowerCase().includes(q)
        || (b.section || '').toLowerCase().includes(q);
  });

  const handleDelete = async (batch) => {
    if (!confirm(`Delete batch "${batch.name}"? This is a soft delete.`)) return;
    try {
      await api.del(`/batches/${batch.id}`);
      refreshBatches();
    } catch (err) {
      alert(err.message || 'Failed to delete batch');
    }
  };

  const toggleExpand = (id) => setExpanded(prev => prev === id ? null : id);

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-black text-ink">Batches</h1>
          <p className="text-xs text-ink-dim mt-0.5">
            {batches.length} batch{batches.length !== 1 ? 'es' : ''} · Group students into classes, cohorts, and sections
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 text-white font-bold rounded-xl text-sm
                     shadow-[0_3px_0_#92400E] hover:-translate-y-0.5 transition-all">
          <Plus size={16} />
          Create Batch
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border-2 border-ivory-200 rounded-2xl p-4 mb-5 flex flex-wrap gap-3 items-center">
        <div className="relative flex-shrink-0">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            placeholder="Search name, code, grade…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 bg-ivory-50 border-2 border-ivory-200 rounded-xl text-sm font-semibold focus:border-amber-400 focus:outline-none w-64"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border-2 border-ivory-200 rounded-2xl overflow-hidden">
        {batchLoading ? (
          <div className="p-10 text-center">
            <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <div className="text-sm text-ink-faint">Loading batches…</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-ivory-200 bg-ivory-100">
                  {['', 'Name', 'Code', 'Grade', 'Section', 'Academic Year', 'Students', 'Status', 'Actions'].map((h, i) => (
                    <th key={i} className="text-left px-4 py-3.5 text-[10px] font-bold text-ink-faint uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(b => {
                  const isExpanded = expanded === b.id;
                  return (
                    <Fragment key={b.id}>
                      <tr
                        onClick={() => toggleExpand(b.id)}
                        className="border-b border-ivory-100 hover:bg-amber-50/30 transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-3.5 w-8">
                          {isExpanded
                            ? <ChevronDown size={14} className="text-amber-600" />
                            : <ChevronRight size={14} className="text-ink-faint" />}
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                              style={{ background: 'linear-gradient(135deg, #FDE68A, #F59E0B)' }}>
                              <Layers size={15} style={{ color: '#92400E' }} />
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-ink text-[13px] truncate max-w-[200px]">{b.name}</div>
                              {b.description && (
                                <div className="text-[10px] text-ink-faint mt-0.5 truncate max-w-[220px]">{b.description}</div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <code className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-lg text-[11px] font-mono font-bold">
                            #{b.code}
                          </code>
                        </td>

                        <td className="px-4 py-3.5 text-[12px] font-semibold text-ink-dim">
                          {b.grade || <span className="text-ink-faint/60 italic">—</span>}
                        </td>

                        <td className="px-4 py-3.5 text-[12px] font-semibold text-ink-dim">
                          {b.section || <span className="text-ink-faint/60 italic">—</span>}
                        </td>

                        <td className="px-4 py-3.5 text-[12px] font-mono text-ink-dim">
                          {b.academic_year || <span className="text-ink-faint/60 italic">—</span>}
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5 text-[12px] font-bold text-ink">
                            <Users size={12} className="text-ink-faint" />
                            {b.student_count || 0}
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border w-fit ${
                            b.is_active !== false
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                              : 'bg-red-50 text-red-500 border-red-200'
                          }`}>
                            {b.is_active !== false
                              ? <><CheckCircle2 size={12} /> Active</>
                              : <><XCircle size={12} /> Inactive</>}
                          </span>
                        </td>

                        <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setEditBatch(b)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors">
                              <Pencil size={12} /> Edit
                            </button>
                            <button
                              onClick={() => handleDelete(b)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors">
                              <Trash2 size={12} /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-ivory-50/60 border-b border-ivory-200">
                          <td colSpan={9}>
                            <BatchStudents batchId={b.id} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-14 text-center">
                      <div className="text-3xl mb-2">📚</div>
                      <div className="text-sm font-bold text-ink">No batches found</div>
                      <div className="text-xs text-ink-faint mt-1">
                        {batches.length === 0
                          ? 'Create your first batch to get started'
                          : 'Try a different search term'}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {(showCreate || editBatch) && (
        <BatchModal
          batch={editBatch}
          onClose={() => { setShowCreate(false); setEditBatch(null); }}
          onSave={() => { setShowCreate(false); setEditBatch(null); refreshBatches(); }}
        />
      )}
    </div>
  );
}
