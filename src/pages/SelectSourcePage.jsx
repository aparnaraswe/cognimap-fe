/**
 * SelectSourcePage — Super admin source picker
 *
 * Compact, warm UI matching the student-side aesthetic.
 * - Lists all existing sources
 * - Always offers "+ New source"
 * - If no sources exist, auto-shows the create form
 * - On pick, stores source in localStorage and enters admin panel
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSource } from '../context/SourceContext';
import { useAuth } from '../context/AuthContext';
import { Plus, ArrowRight, LogOut, Building2, Users as UsersIcon, Search, X, AlertCircle } from 'lucide-react';
import api from '../utils/api';

const TYPE_OPTIONS = [
  { value: 'school',   label: 'School' },
  { value: 'tuition',  label: 'Tuition' },
  { value: 'company',  label: 'Company' },
  { value: 'clinic',   label: 'Clinic' },
  { value: 'other',    label: 'Other' },
];

export default function SelectSourcePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { sources, loading, setActiveSourceId, reloadSources } = useSource();
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ display_name: '', source_code: '', type: 'school', contact_email: '' });
  const [error, setError] = useState('');

  // Non-super-admins shouldn't see this — auto-pick their assigned source
  useEffect(() => {
    if (user && user.role !== 'super_admin') {
      const myId = user.source_id || user.organization_id;
      if (myId) {
        setActiveSourceId(myId);
        navigate('/admin', { replace: true });
      }
    }
  }, [user, setActiveSourceId, navigate]);

  // Auto-show create form if there are zero sources
  useEffect(() => {
    if (!loading && sources.length === 0) setShowCreate(true);
  }, [loading, sources.length]);

  const pickSource = (id) => {
    setActiveSourceId(id);
    navigate('/admin', { replace: true });
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const createSource = async () => {
    setError('');
    if (!form.display_name.trim()) { setError('Name is required'); return; }
    const code = (form.source_code || form.display_name).trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
    if (!code) { setError('Code is required'); return; }
    setCreating(true);
    try {
      const created = await api.post('/sources', {
        display_name: form.display_name.trim(),
        source_code: code,
        type: form.type,
        contact_email: form.contact_email.trim() || null,
      });
      await reloadSources();
      const newId = created?.id || created?.source?.id;
      if (newId) pickSource(newId);
      else { setShowCreate(false); setForm({ display_name: '', source_code: '', type: 'school', contact_email: '' }); }
    } catch (err) {
      setError(err.message || 'Failed to create source');
      setCreating(false);
    }
  };

  // Filter sources by search
  const filtered = sources.filter(s =>
    !search ||
    s.display_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.source_code?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="page flex items-center justify-center" style={{ minHeight: '100vh' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-7 h-7 rounded-full animate-spin"
            style={{ border: '2px solid var(--border)', borderTopColor: 'var(--blush)' }} />
          <div className="text-[12px]" style={{ color: 'var(--slate-light)' }}>Loading sources…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page" style={{ minHeight: '100vh' }}>
      {/* ── Compact sticky topbar ── */}
      <div className="sticky top-0 z-30 flex items-center justify-between px-6 lg:px-8 py-3"
        style={{ background: 'var(--warm)', borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="font-display text-[19px]" style={{ color: 'var(--ink)' }}>
            Cogni<span style={{ color: 'var(--blush)' }}>Map</span>
          </div>
          <span className="text-[10px] uppercase" style={{ color: 'var(--slate-light)', letterSpacing: '1.5px' }}>
            Console
          </span>
        </div>
        <button onClick={handleLogout} className="btn-secondary">
          <LogOut size={13} /> Sign out
        </button>
      </div>

      {/* ── Main content ── */}
      <div className="max-w-2xl mx-auto px-6 lg:px-8 py-10">

        {/* Header */}
        <div className="mb-8 animate-fade-up">
          <h1 className="font-display text-[26px]" style={{ color: 'var(--ink)' }}>
            Select a source
          </h1>
          <p className="text-[13px] mt-1.5" style={{ color: 'var(--slate-light)' }}>
            {sources.length === 0
              ? "Create your first source to begin."
              : `Welcome, ${user?.first_name || 'Admin'}. Choose a source to continue, or create a new one.`}
          </p>
        </div>

        {/* Create form */}
        {showCreate && (
          <div className="card p-6 mb-6 animate-fade-up">
            <div className="flex items-center justify-between mb-4">
              <div className="section-title">Create new source</div>
              {sources.length > 0 && (
                <button onClick={() => { setShowCreate(false); setError(''); }}
                  className="w-7 h-7 rounded-md flex items-center justify-center transition-colors"
                  style={{ color: 'var(--slate-light)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--slate-pale)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <X size={15} />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label-overline block mb-1.5">
                  Name <span style={{ color: 'var(--blush)' }}>*</span>
                </label>
                <input className="input-field" placeholder="DPS School"
                  value={form.display_name}
                  onChange={e => setForm({ ...form, display_name: e.target.value })} autoFocus />
              </div>
              <div>
                <label className="label-overline block mb-1.5">Code</label>
                <input className="input-field" placeholder="dps-school"
                  value={form.source_code}
                  onChange={e => setForm({ ...form, source_code: e.target.value })} />
              </div>
              <div>
                <label className="label-overline block mb-1.5">Type</label>
                <select className="input-field" value={form.type}
                  onChange={e => setForm({ ...form, type: e.target.value })}>
                  {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label-overline block mb-1.5">Contact email</label>
                <input className="input-field" type="email" placeholder="admin@dps.edu"
                  value={form.contact_email}
                  onChange={e => setForm({ ...form, contact_email: e.target.value })} />
              </div>
            </div>

            {error && (
              <div className="mt-4 px-3 py-2 rounded-md text-[12px] flex items-center gap-2"
                style={{ background: 'var(--blush-pale)', color: 'var(--blush)' }}>
                <AlertCircle size={13} /> {error}
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              {sources.length > 0 && (
                <button onClick={() => { setShowCreate(false); setError(''); }} className="btn-secondary">
                  Cancel
                </button>
              )}
              <button onClick={createSource} disabled={creating} className="btn-primary">
                {creating ? 'Creating…' : 'Create & open'}
              </button>
            </div>
          </div>
        )}

        {/* Source list */}
        {sources.length > 0 && (
          <>
            {/* Search + create button row */}
            {!showCreate && (
              <div className="flex gap-2 mb-4">
                <div className="relative flex-1">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--slate-light)' }} />
                  <input className="input-field pl-9"
                    placeholder="Search sources…"
                    value={search}
                    onChange={e => setSearch(e.target.value)} />
                </div>
                <button onClick={() => setShowCreate(true)} className="btn-primary whitespace-nowrap">
                  <Plus size={13} /> New source
                </button>
              </div>
            )}

            {/* Source cards */}
            <div className="space-y-2 stagger">
              {filtered.length === 0 ? (
                <div className="card p-8 text-center">
                  <div className="text-[13px]" style={{ color: 'var(--slate-light)' }}>
                    No sources match "{search}"
                  </div>
                </div>
              ) : (
                filtered.map(s => (
                  <button key={s.id}
                    onClick={() => pickSource(s.id)}
                    className="card card-hover w-full p-4 flex items-center gap-3.5 text-left transition-all hover:translate-y-[-1px]">
                    <div className="w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0"
                      style={{ background: 'var(--blush-pale)', color: 'var(--blush)' }}>
                      <Building2 size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-medium truncate" style={{ color: 'var(--ink)' }}>
                        {s.display_name}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px]" style={{ color: 'var(--slate-light)' }}>
                        <code style={{ color: 'var(--blush)' }}>#{s.source_code}</code>
                        <span>·</span>
                        <span className="capitalize">{s.type || 'school'}</span>
                        {(s.user_count || s.student_count) > 0 && (
                          <>
                            <span>·</span>
                            <span className="inline-flex items-center gap-1">
                              <UsersIcon size={10} />
                              {s.user_count || s.student_count} users
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <ArrowRight size={15} className="flex-shrink-0" style={{ color: 'var(--slate-light)' }} />
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
