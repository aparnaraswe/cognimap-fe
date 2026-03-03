import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const ROLES = [
  { value: 'student', label: 'Student' },
  { value: 'employee', label: 'Employee' },
  { value: 'psychologist', label: 'Psychologist' },
  { value: 'client_admin', label: 'Client Admin' },
  { value: 'super_admin', label: 'Super Admin' },
];

function UserModal({ user, onClose, onSave }) {
  const [form, setForm] = useState(user || {
    first_name: '', last_name: '', email: '', password: 'student123',
    role: 'student', grade: '', section: '', age_band: '8-11', phone: '', parent_name: '', gender: ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      if (user?.id) {
        await api.put(`/auth/users/${user.id}`, form);
      } else {
        await api.post('/auth/register', form);
      }
      onSave();
    } catch (err) { alert(err.message); }
    setSaving(false);
  };

  const Field = ({ label, field, type = 'text', options }) => (
    <div>
      <label className="block text-[10px] font-bold text-ink-faint uppercase tracking-wider mb-1">{label}</label>
      {options ? (
        <select value={form[field] || ''} onChange={e => setForm({...form, [field]: e.target.value})}
          className="w-full px-3 py-2 bg-ivory-50 border-2 border-ivory-200 rounded-xl text-sm font-semibold focus:border-gold focus:outline-none">
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input type={type} value={form[field] || ''} onChange={e => setForm({...form, [field]: e.target.value})}
          className="w-full px-3 py-2 bg-ivory-50 border-2 border-ivory-200 rounded-xl text-sm font-semibold focus:border-gold focus:outline-none"/>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl border-2 border-ivory-200 w-full max-w-lg max-h-[90vh] overflow-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b-2 border-ivory-200">
          <h2 className="text-lg font-black text-ink">{user?.id ? 'Edit User' : 'Create User'}</h2>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
          <Field label="First Name" field="first_name"/>
          <Field label="Last Name" field="last_name"/>
          <Field label="Email" field="email" type="email"/>
          {!user?.id && <Field label="Password" field="password"/>}
          <Field label="Role" field="role" options={ROLES}/>
          <Field label="Gender" field="gender" options={[{value:'',label:'—'},{value:'male',label:'Male'},{value:'female',label:'Female'},{value:'other',label:'Other'}]}/>
          <Field label="Grade / Class" field="grade"/>
          <Field label="Section" field="section"/>
          <Field label="Age Band" field="age_band" options={[{value:'8-11',label:'8-11'},{value:'12-14',label:'12-14'},{value:'15-18',label:'15-18'}]}/>
          <Field label="Phone" field="phone"/>
          <Field label="Parent Name" field="parent_name"/>
        </div>
        <div className="p-6 border-t-2 border-ivory-200 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-ink-dim hover:text-ink-DEFAULT transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={saving}
            className="px-6 py-2.5 bg-copper text-white font-bold rounded-xl text-sm shadow-[0_3px_0_#92400E] hover:-translate-y-0.5 active:translate-y-0.5 transition-all disabled:opacity-50">
            {saving ? 'Saving...' : user?.id ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [editUser, setEditUser] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: 200 });
    if (roleFilter) params.set('role', roleFilter);
    if (search) params.set('search', search);
    api.get(`/auth/users?${params}`)
      .then(d => { setUsers(d.users || []); setTotal(d.total || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [roleFilter, search]);

  useEffect(() => { load(); }, [load]);

  const toggleUser = async (id) => {
    try { await api.patch(`/auth/users/${id}/toggle`); load(); } catch (e) { alert(e.message); }
  };

  const roleBadge = (role) => {
    const c = {
      super_admin: 'bg-purple-50 text-purple-600', client_admin: 'bg-blue-50 text-blue-600',
      psychologist: 'bg-amber-50 text-amber-600', student: 'bg-emerald-50 text-emerald-600',
      employee: 'bg-ivory-100 text-ink-faint'
    };
    return <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${c[role] || c.student}`}>{role?.replace('_',' ')}</span>;
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-black text-ink">Users</h1>
          <p className="text-xs text-ink-dim mt-0.5">{total} users · Manage students, admins, and psychologists</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="px-5 py-2.5 bg-copper text-white font-bold rounded-xl text-sm shadow-[0_3px_0_#92400E] hover:-translate-y-0.5 transition-all">
          + Create User
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <input placeholder="Search name or email..." value={search} onChange={e => setSearch(e.target.value)}
          className="px-4 py-2 bg-white border-2 border-ivory-200 rounded-xl text-sm font-semibold focus:border-gold focus:outline-none w-64"/>
        <div className="flex gap-1.5">
          {['', 'student', 'psychologist', 'client_admin', 'super_admin'].map(r => (
            <button key={r} onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${roleFilter === r ? 'bg-copper text-white' : 'bg-white border-2 border-ivory-200 text-ink-dim hover:border-gold'}`}>
              {r ? r.replace('_', ' ') : 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border-2 border-ivory-200 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-ink-faint">Loading...</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-ivory-200 bg-ivory-100">
                {['Name','Email','Role','Grade','Age Band','Status','Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] font-bold text-ink-faint uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-ivory-200/50 hover:bg-ivory-100/50 transition-colors">
                  <td className="px-4 py-3 font-semibold">{u.first_name} {u.last_name}</td>
                  <td className="px-4 py-3 text-ink-dim text-xs">{u.email}</td>
                  <td className="px-4 py-3">{roleBadge(u.role)}</td>
                  <td className="px-4 py-3 text-ink-faint">{u.grade || '—'} {u.section || ''}</td>
                  <td className="px-4 py-3 text-ink-faint">{u.age_band || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${u.is_active !== false ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                      {u.is_active !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => setEditUser(u)} className="text-[10px] font-bold text-gold hover:text-gold-dark">Edit</button>
                      <button onClick={() => toggleUser(u.id)} className="text-[10px] font-bold text-ink-faint hover:text-red-600">
                        {u.is_active !== false ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-ink-faint">No users found</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {(showCreate || editUser) && (
        <UserModal user={editUser} onClose={() => { setShowCreate(false); setEditUser(null); }}
          onSave={() => { setShowCreate(false); setEditUser(null); load(); }}/>
      )}
    </div>
  );
}
