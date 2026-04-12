/**
 * UsersPage — Clean, simple user management
 *
 * - No source field (auto-set from active source on backend)
 * - No batch field (managed separately in Batches page)
 * - Single-card form modal
 * - Bulk upload via Excel/CSV
 * - Filter by role + search
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSource } from '../context/SourceContext';
import api from '../utils/api';
import {
  UserPlus, Search, X, Pencil, Mail, CheckCircle2, XCircle,
  Users as UsersIcon, Upload, Download, FileSpreadsheet, AlertCircle
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────
const ROLES = [
  { value: 'student',      label: 'Student'      },
  { value: 'employee',     label: 'Employee'     },
  { value: 'guardian',     label: 'Guardian'     },
  { value: 'teacher',      label: 'Teacher'      },
  { value: 'psychologist', label: 'Psychologist' },
  { value: 'client_admin', label: 'Admin'        },
];

const AGE_BANDS = [
  { value: '8-11',  label: '8 – 11' },
  { value: '12-14', label: '12 – 14' },
  { value: '15-18', label: '15 – 18' },
  { value: '18+',   label: '18 +' },
];

// ─── Avatar with initials ─────────────────────────────────────────────────────
function Avatar({ name }) {
  const initials = (name || '?').split(' ').map(p => p[0] || '').join('').slice(0, 2).toUpperCase();
  return (
    <div
      className="w-9 h-9 rounded-full font-display text-xs flex items-center justify-center flex-shrink-0"
      style={{ background: 'var(--blush)', color: '#fff' }}
    >
      {initials}
    </div>
  );
}

// ─── Role badge ───────────────────────────────────────────────────────────────
function RoleBadge({ role }) {
  const r = ROLES.find(x => x.value === role) || ROLES[0];
  return <span className="chip capitalize">{r.label}</span>;
}

// ─── Field wrapper ────────────────────────────────────────────────────────────
function Field({ label, required, children, span = 1 }) {
  return (
    <div className={span === 2 ? 'col-span-2' : ''}>
      <label
        className="block text-[10px] font-semibold uppercase tracking-[0.14em] mb-1.5"
        style={{ color: 'var(--slate-light)' }}
      >
        {label}{required && <span style={{ color: 'var(--blush)' }} className="ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

// ─── User Modal ───────────────────────────────────────────────────────────────
function UserModal({ user, onClose, onSave }) {
  const isEdit = !!user?.id;
  const [form, setForm] = useState(user || {
    first_name: '', last_name: '', email: '', password: 'student123',
    role: 'student', gender: '', date_of_birth: '',
    grade: '', section: '', age_band: '12-14',
    phone: '', parent_name: '', parent_phone: '', parent_email: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Auto-derive age band from DOB
  useEffect(() => {
    if (!form.date_of_birth) return;
    const age = Math.floor((Date.now() - new Date(form.date_of_birth).getTime()) / 31557600000);
    let band;
    if (age <= 11) band = '8-11';
    else if (age <= 14) band = '12-14';
    else if (age <= 18) band = '15-18';
    else band = '18+';
    if (band !== form.age_band) setForm(f => ({ ...f, age_band: band }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.date_of_birth]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.first_name?.trim() || !form.email?.trim() || !form.role) {
      setError('Name, email and role are required');
      return;
    }
    setSaving(true); setError('');
    try {
      const payload = {
        first_name: form.first_name?.trim(),
        last_name:  form.last_name?.trim() || null,
        email:      form.email?.trim().toLowerCase(),
        role:       form.role,
        gender:     form.gender || null,
        date_of_birth: form.date_of_birth || null,
        grade:      form.grade || null,
        section:    form.section || null,
        age_band:   form.age_band || null,
        phone:      form.phone || null,
        parent_name:  form.parent_name || null,
        parent_phone: form.parent_phone || null,
        parent_email: form.parent_email?.trim().toLowerCase() || null,
      };
      if (isEdit) {
        await api.put(`/auth/users/${user.id}`, payload);
      } else {
        if (!form.password?.trim()) { setError('Password is required for new users'); setSaving(false); return; }
        await api.post('/auth/register', {
          ...payload,
          firstName: payload.first_name,
          lastName:  payload.last_name,
          password:  form.password,
          dateOfBirth: payload.date_of_birth,
        });
      }
      onSave();
    } catch (err) {
      setError(err.message || 'Something went wrong');
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: 'rgba(10, 22, 40, 0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={e => e.stopPropagation()}
        className="card shadow-lg w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div
          className="px-6 py-5 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div>
            <h2 className="text-lg font-display" style={{ color: 'var(--ink)' }}>
              {isEdit ? 'Edit user' : 'New user'}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--slate)' }}>
              {isEdit ? 'Update this user\'s details' : 'Create a new account in this source'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="btn-ghost !p-2">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {error && (
            <div
              className="mb-4 px-3 py-2 rounded-md text-xs font-semibold flex items-center gap-2"
              style={{ background: 'var(--blush-pale)', border: '1px solid var(--blush)', color: 'var(--blush)' }}
            >
              <AlertCircle size={14} /> {error}
            </div>
          )}

          {/* Identity */}
          <div className="grid grid-cols-2 gap-4 mb-5">
            <Field label="First name" required>
              <input className="input-field" value={form.first_name || ''} onChange={e => set('first_name', e.target.value)} />
            </Field>
            <Field label="Last name">
              <input className="input-field" value={form.last_name || ''} onChange={e => set('last_name', e.target.value)} />
            </Field>
            <Field label="Email" required span={2}>
              <input type="email" className="input-field" value={form.email || ''} onChange={e => set('email', e.target.value)} />
            </Field>
            {!isEdit && (
              <Field label="Password" required span={2}>
                <input type="text" className="input-field" value={form.password || ''} onChange={e => set('password', e.target.value)} />
              </Field>
            )}
          </div>

          {/* Role */}
          <div className="mb-5">
            <label
              className="block text-[10px] font-semibold uppercase tracking-[0.14em] mb-2"
              style={{ color: 'var(--slate-light)' }}
            >
              Role
            </label>
            <div className="flex flex-wrap gap-1.5">
              {ROLES.map(r => {
                const active = form.role === r.value;
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => set('role', r.value)}
                    className="px-3 py-1.5 rounded-sm text-xs font-medium transition-all"
                    style={
                      active
                        ? { background: 'var(--blush-pale)', color: 'var(--blush)', border: '1px solid var(--blush-pale)' }
                        : { background: 'var(--warm)', color: 'var(--slate)', border: '1px solid var(--border)' }
                    }
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Personal */}
          <div className="grid grid-cols-2 gap-4 mb-5">
            <Field label="Date of birth">
              <input type="date" className="input-field" value={form.date_of_birth?.slice(0,10) || ''} onChange={e => set('date_of_birth', e.target.value)} />
            </Field>
            <Field label="Gender">
              <select className="input-field" value={form.gender || ''} onChange={e => set('gender', e.target.value)}>
                <option value="">— Select —</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </Field>
            <Field label="Grade / class">
              <input className="input-field" placeholder="Grade 10" value={form.grade || ''} onChange={e => set('grade', e.target.value)} />
            </Field>
            <Field label="Section">
              <input className="input-field" placeholder="A" value={form.section || ''} onChange={e => set('section', e.target.value)} />
            </Field>
            <Field label="Age band" span={2}>
              <select className="input-field" value={form.age_band || ''} onChange={e => set('age_band', e.target.value)}>
                {AGE_BANDS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
              </select>
            </Field>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Phone">
              <input className="input-field" value={form.phone || ''} onChange={e => set('phone', e.target.value)} />
            </Field>
            <Field label="Parent name">
              <input className="input-field" value={form.parent_name || ''} onChange={e => set('parent_name', e.target.value)} />
            </Field>
            <Field label="Parent phone">
              <input className="input-field" value={form.parent_phone || ''} onChange={e => set('parent_phone', e.target.value)} />
            </Field>
            <Field label="Parent email">
              <input
                type="email"
                className="input-field"
                placeholder="parent@example.com"
                value={form.parent_email || ''}
                onChange={e => set('parent_email', e.target.value)}
              />
            </Field>
          </div>
          {!isEdit && form.role === 'student' && (
            <div
              className="mt-3 px-3 py-2 rounded-md text-[11px] flex items-start gap-2"
              style={{ background: 'var(--sage-pale)', color: 'var(--slate)' }}
            >
              <Mail size={12} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--sage)' }} />
              <span>
                Login credentials will be emailed to the student
                {form.parent_email?.trim() && <>, and a parent account will be auto-created and emailed to <strong>{form.parent_email.trim()}</strong></>}.
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 flex items-center justify-end gap-2"
          style={{ borderTop: '1px solid var(--border)', background: 'var(--warm)' }}
        >
          <button type="button" onClick={onClose} className="btn-secondary !px-5 !py-2.5">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="btn-primary !px-5 !py-2.5">
            {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Create user'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Bulk Upload Modal ────────────────────────────────────────────────────────
function BulkUploadModal({ onClose, onDone }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const fileRef = useRef();

  const handleFile = (e) => {
    const f = e.dataTransfer?.files?.[0] || e.target.files?.[0];
    if (f && /\.(csv|xlsx|xls)$/i.test(f.name)) {
      setFile(f); setError(''); setResult(null);
    } else {
      setError('Please select a .csv, .xlsx, or .xls file');
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true); setError('');
    try {
      const data = await api.upload('/auth/users/bulk-upload', file);
      setResult(data);
      if (data.created > 0) onDone();
    } catch (err) {
      setError(err.message || 'Upload failed');
    }
    setUploading(false);
  };

  const downloadTemplate = () => {
    const csv = 'email,first_name,last_name,role,grade,section,age_band,gender,date_of_birth,phone,parent_name,parent_phone,parent_email,password\n' +
                'student1@example.com,John,Doe,student,Grade 10,A,15-18,male,2008-05-15,9999999999,Jane Doe,9888888888,jane.doe@example.com,welcome123\n' +
                'student2@example.com,Priya,Sharma,student,Grade 10,A,15-18,female,2008-08-22,,,,,welcome123\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'users-template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: 'rgba(10, 22, 40, 0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="card shadow-lg w-full max-w-xl max-h-[92vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div
          className="px-6 py-5 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div>
            <h2 className="text-lg font-display" style={{ color: 'var(--ink)' }}>Bulk import users</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--slate)' }}>
              Upload an Excel or CSV file to create multiple users at once
            </p>
          </div>
          <button onClick={onClose} className="btn-ghost !p-2">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Template download */}
          <div
            className="mb-5 p-4 rounded-md"
            style={{ background: 'var(--sage-pale)', border: '1px solid var(--sage-pale)' }}
          >
            <div className="flex items-start gap-3">
              <FileSpreadsheet size={18} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--sage)' }} />
              <div className="flex-1">
                <div className="text-sm font-semibold mb-1" style={{ color: 'var(--ink)' }}>Need a template?</div>
                <p className="text-xs mb-2" style={{ color: 'var(--slate)' }}>
                  Download the CSV template with the right column headers and a sample row.
                </p>
                <button onClick={downloadTemplate} className="btn-secondary !px-3 !py-1.5 text-xs">
                  <Download size={12} /> Download CSV template
                </button>
              </div>
            </div>
          </div>

          {/* Required columns */}
          <div className="mb-5 text-xs" style={{ color: 'var(--slate)' }}>
            <div className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>Required columns:</div>
            <code className="chip mr-1">email</code>
            <code className="chip">first_name</code>
            <div className="font-semibold mt-2 mb-1" style={{ color: 'var(--ink)' }}>Optional columns:</div>
            <div className="flex flex-wrap gap-1">
              {['last_name','role','grade','section','age_band','gender','date_of_birth','phone','parent_name','parent_phone','parent_email','password'].map(c => (
                <code key={c} className="chip">{c}</code>
              ))}
            </div>
          </div>

          {/* File picker */}
          {!result && (
            <div
              onClick={() => fileRef.current?.click()}
              onDrop={e => { e.preventDefault(); handleFile(e); }}
              onDragOver={e => e.preventDefault()}
              className="rounded-md p-8 text-center cursor-pointer transition-all"
              style={{
                border: file ? '1.5px dashed var(--blush)' : '1.5px dashed var(--border)',
                background: file ? 'var(--blush-pale)' : 'var(--warm)',
              }}
            >
              <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} className="hidden" />
              {file ? (
                <>
                  <FileSpreadsheet size={32} className="mx-auto mb-2" style={{ color: 'var(--blush)' }} />
                  <div className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{file.name}</div>
                  <div className="text-[11px] mt-1 tabular-nums" style={{ color: 'var(--slate)' }}>
                    {(file.size / 1024).toFixed(1)} KB
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    className="text-[11px] font-semibold mt-2 hover:underline"
                    style={{ color: 'var(--blush)' }}
                  >
                    Remove
                  </button>
                </>
              ) : (
                <>
                  <Upload size={28} className="mx-auto mb-2" style={{ color: 'var(--slate-light)' }} />
                  <div className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Drop your file here</div>
                  <div className="text-[11px] mt-1" style={{ color: 'var(--slate-light)' }}>
                    or click to browse · CSV, XLSX, XLS
                  </div>
                </>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div
              className="mt-4 px-3 py-2 rounded-md text-xs font-semibold flex items-center gap-2"
              style={{ background: 'var(--blush-pale)', border: '1px solid var(--blush)', color: 'var(--blush)' }}
            >
              <AlertCircle size={14} /> {error}
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-3">
              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="stat-tile">
                  <div className="stat-tile-label">Created</div>
                  <div className="stat-tile-value tabular-nums" style={{ color: 'var(--sage)' }}>{result.created || 0}</div>
                </div>
                <div className="stat-tile">
                  <div className="stat-tile-label">Total rows</div>
                  <div className="stat-tile-value tabular-nums">{result.total || 0}</div>
                </div>
                <div className="stat-tile">
                  <div className="stat-tile-label">Errors</div>
                  <div
                    className="stat-tile-value tabular-nums"
                    style={{ color: result.errors > 0 ? 'var(--blush)' : 'var(--slate-light)' }}
                  >
                    {result.errors || 0}
                  </div>
                </div>
              </div>
              {result.created > 0 && (
                <div
                  className="px-3 py-2 rounded-md text-[11.5px] flex items-center gap-2"
                  style={{ background: 'var(--sage-pale)', color: 'var(--slate)' }}
                >
                  <Mail size={12} style={{ color: 'var(--sage)' }} />
                  <span>
                    Welcome emails sent to <strong>{result.created}</strong> student{result.created !== 1 ? 's' : ''}
                    {result.parentsEmailed > 0 && <> and <strong>{result.parentsEmailed}</strong> parent{result.parentsEmailed !== 1 ? 's' : ''}</>}
                  </span>
                </div>
              )}

              {/* Error details */}
              {result.errorList?.length > 0 && (
                <div
                  className="rounded-md overflow-hidden"
                  style={{ border: '1px solid var(--blush)' }}
                >
                  <div
                    className="px-3 py-2 text-xs font-medium"
                    style={{ background: 'var(--blush-pale)', color: 'var(--blush)', borderBottom: '1px solid var(--blush)' }}
                  >
                    {result.errorList.length} row{result.errorList.length !== 1 ? 's' : ''} failed
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    <table className="table-pro">
                      <thead>
                        <tr>
                          <th>Row</th>
                          <th>Email</th>
                          <th>Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.errorList.map((e, i) => (
                          <tr key={i}>
                            <td className="font-mono tabular-nums" style={{ color: 'var(--slate)' }}>{e.row || '—'}</td>
                            <td style={{ color: 'var(--ink)' }}>{e.email}</td>
                            <td style={{ color: 'var(--blush)' }}>{e.error}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 flex items-center justify-end gap-2"
          style={{ borderTop: '1px solid var(--border)', background: 'var(--warm)' }}
        >
          {result ? (
            <button onClick={onClose} className="btn-primary !px-5 !py-2.5">
              Done
            </button>
          ) : (
            <>
              <button onClick={onClose} className="btn-secondary !px-5 !py-2.5">
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="btn-primary !px-5 !py-2.5"
              >
                {uploading ? 'Uploading...' : 'Upload & create users'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Users Page ──────────────────────────────────────────────────────────
export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const { activeSource } = useSource();

  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [editUser, setEditUser] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showBulk, setShowBulk] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: 200 });
    if (roleFilter) params.set('role', roleFilter);
    if (search) params.set('search', search);
    api.get(`/auth/users?${params}`)
      .then(d => { setUsers(d.users || []); setTotal(d.total || 0); })
      .catch(() => { setUsers([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [roleFilter, search]);

  useEffect(() => { load(); }, [load]);

  const toggleActive = async (u) => {
    try {
      await api.patch(`/auth/users/${u.id}/toggle`, {});
      load();
    } catch (err) { alert(err.message); }
  };

  // Counts per role for filter chips
  const roleCounts = ROLES.reduce((acc, r) => {
    acc[r.value] = users.filter(u => u.role === r.value).length;
    return acc;
  }, {});

  return (
    <div className="page">
      {/* Compact sticky topbar */}
      <div
        className="sticky top-0 z-30 flex items-center justify-between px-6 lg:px-8 py-3"
        style={{ background: 'var(--warm)', borderBottom: '1px solid var(--border)' }}
      >
        <div>
          <h1 className="font-display text-[19px]" style={{ color: 'var(--ink)' }}>
            Manage users
          </h1>
          <p className="text-[11.5px] mt-0.5" style={{ color: 'var(--slate-light)' }}>
            {total} user{total !== 1 ? 's' : ''}
            {activeSource && <> · {activeSource.display_name}</>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowBulk(true)} className="btn-secondary">
            <Upload size={14} /> Bulk import
          </button>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <UserPlus size={14} /> New user
          </button>
        </div>
      </div>

      <div className="px-6 lg:px-8 py-5 max-w-[1280px] mx-auto space-y-5">
        {/* Filter row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[260px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--slate-light)' }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="input-field pl-9"
            />
          </div>

          {/* Role chips */}
          <div
            className="flex items-center gap-1 p-1 rounded-md flex-wrap"
            style={{ background: 'var(--warm)', border: '1px solid var(--border)' }}
          >
            <button
              onClick={() => setRoleFilter('')}
              className="px-3 py-1.5 rounded-sm text-xs font-medium transition-all"
              style={
                roleFilter === ''
                  ? { background: 'var(--blush-pale)', color: 'var(--blush)' }
                  : { background: 'transparent', color: 'var(--slate)' }
              }
            >
              All
              <span className="ml-1.5 text-[10px] opacity-70 tabular-nums">{users.length}</span>
            </button>
            {ROLES.filter(r => roleCounts[r.value] > 0 || roleFilter === r.value).map(r => {
              const active = roleFilter === r.value;
              return (
                <button
                  key={r.value}
                  onClick={() => setRoleFilter(r.value)}
                  className="px-3 py-1.5 rounded-sm text-xs font-medium transition-all"
                  style={
                    active
                      ? { background: 'var(--blush-pale)', color: 'var(--blush)' }
                      : { background: 'transparent', color: 'var(--slate)' }
                  }
                >
                  {r.label}
                  <span className="ml-1.5 text-[10px] opacity-70 tabular-nums">{roleCounts[r.value] || 0}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Table */}
        <div className="card overflow-hidden animate-fade-up">
          <div className="overflow-x-auto">
            <table className="table-pro">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Grade</th>
                  <th>Age</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="text-center" style={{ color: 'var(--slate-light)' }}>Loading users...</td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan={6} className="!py-20 text-center">
                    <div
                      className="w-14 h-14 rounded-md flex items-center justify-center mx-auto mb-4"
                      style={{ background: 'var(--warm)' }}
                    >
                      <UsersIcon size={24} style={{ color: 'var(--slate-light)' }} />
                    </div>
                    <div className="font-display text-[16px] mb-1.5" style={{ color: 'var(--ink)' }}>
                      {search || roleFilter ? 'No users match your filters' : 'No users yet'}
                    </div>
                    <div className="text-[12.5px]" style={{ color: 'var(--slate)' }}>
                      {search || roleFilter ? 'Try clearing filters' : 'Click "New user" or "Bulk import" to add users'}
                    </div>
                  </td></tr>
                ) : users.map(u => {
                  const fullName = `${u.first_name || ''} ${u.last_name || ''}`.trim() || '—';
                  return (
                    <tr key={u.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <Avatar name={fullName} />
                          <div className="min-w-0">
                            <div className="font-medium text-sm truncate" style={{ color: 'var(--ink)' }}>{fullName}</div>
                            <div
                              className="text-[11px] truncate flex items-center gap-1"
                              style={{ color: 'var(--slate-light)' }}
                            >
                              <Mail size={10} /> {u.email || '—'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <RoleBadge role={u.role} />
                      </td>
                      <td className="text-xs" style={{ color: 'var(--slate)' }}>
                        {u.grade || '—'}{u.section ? ` · ${u.section}` : ''}
                      </td>
                      <td className="text-xs tabular-nums" style={{ color: 'var(--slate)' }}>
                        {u.age_band || '—'}
                      </td>
                      <td>
                        {u.is_active !== false ? (
                          <span className="badge badge-sage">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--sage)' }}/> Active
                          </span>
                        ) : (
                          <span className="badge badge-slate">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--slate-light)' }}/> Inactive
                          </span>
                        )}
                      </td>
                      <td className="text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => setEditUser(u)}
                            className="btn-ghost !p-2"
                            title="Edit"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => toggleActive(u)}
                            className="btn-ghost !p-2"
                            title={u.is_active !== false ? 'Deactivate' : 'Activate'}
                          >
                            {u.is_active !== false
                              ? <CheckCircle2 size={13} style={{ color: 'var(--sage)' }} />
                              : <XCircle size={13} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modals */}
        {(showCreate || editUser) && (
          <UserModal
            user={editUser}
            onClose={() => { setShowCreate(false); setEditUser(null); }}
            onSave={() => { setShowCreate(false); setEditUser(null); load(); }}
          />
        )}
        {showBulk && (
          <BulkUploadModal
            onClose={() => setShowBulk(false)}
            onDone={() => load()}
          />
        )}
      </div>
    </div>
  );
}
