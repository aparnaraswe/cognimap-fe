import { useState, useEffect } from 'react';
import api from '../utils/api';

const REL_OPTIONS = [
  { value: 'parent', label: 'Parent' },
  { value: 'guardian', label: 'Guardian' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'counselor', label: 'Counselor' },
];

export default function GuardianAssignPage() {
  const [guardians, setGuardians] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedGuardian, setSelectedGuardian] = useState(null);
  const [assignedStudents, setAssignedStudents] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState(new Set());
  const [relationship, setRelationship] = useState('guardian');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/guardians'),
      api.get('/auth/users?role=student&limit=500'),
    ]).then(([gR, sR]) => {
      setGuardians(gR.guardians || []);
      setStudents(sR.users || []);
    }).finally(() => setLoading(false));
  }, []);

  const loadAssigned = async (guardianId) => {
    const d = await api.get(`/guardians/${guardianId}/students`);
    setAssignedStudents(d.students || []);
  };

  const selectGuardian = (g) => {
    setSelectedGuardian(g);
    setSelectedStudentIds(new Set());
    loadAssigned(g.id);
  };

  const toggleStudent = (id) => {
    setSelectedStudentIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    const filtered = filteredStudents.map(s => s.id);
    const allSelected = filtered.every(id => selectedStudentIds.has(id));
    if (allSelected) {
      setSelectedStudentIds(prev => {
        const next = new Set(prev);
        filtered.forEach(id => next.delete(id));
        return next;
      });
    } else {
      setSelectedStudentIds(prev => new Set([...prev, ...filtered]));
    }
  };

  const assignSelected = async () => {
    if (!selectedGuardian || selectedStudentIds.size === 0) return;
    setSaving(true);
    try {
      await api.post(`/guardians/${selectedGuardian.id}/students`, {
        studentIds: [...selectedStudentIds],
        relationship,
      });
      await loadAssigned(selectedGuardian.id);
      setSelectedStudentIds(new Set());
    } catch (e) { alert(e.message); }
    setSaving(false);
  };

  const removeAssignment = async (studentId) => {
    if (!selectedGuardian) return;
    await api.del(`/guardians/${selectedGuardian.id}/students/${studentId}`);
    await loadAssigned(selectedGuardian.id);
  };

  const assignedIds = new Set(assignedStudents.map(s => s.id));
  const unassigned = students.filter(s => !assignedIds.has(s.id));
  const filteredStudents = unassigned.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return `${s.first_name} ${s.last_name} ${s.email} ${s.grade} ${s.section}`.toLowerCase().includes(q);
  });

  if (loading) return (
    <div className="p-8 text-center text-sm" style={{ color: 'var(--ink-faint)' }}>Loading...</div>
  );

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-xl font-black" style={{ color: 'var(--ink)' }}>Guardian / Teacher Assignment</h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--ink-dim)' }}>Assign students to guardians and teachers for report access</p>
      </div>

      <div className="flex gap-6" style={{ minHeight: 500 }}>
        {/* Left: Guardian list */}
        <div className="w-72 flex-shrink-0">
          <div className="bg-white border-2 rounded-2xl overflow-hidden" style={{ borderColor: 'var(--border)' }}>
            <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
              <div className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--ink-faint)' }}>
                Guardians & Teachers
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {guardians.length === 0 ? (
                <div className="p-4 text-center text-xs" style={{ color: 'var(--ink-faint)' }}>
                  No guardians/teachers found. Create one in Users page first.
                </div>
              ) : guardians.map(g => (
                <div
                  key={g.id}
                  onClick={() => selectGuardian(g)}
                  className="px-4 py-3 cursor-pointer border-b transition-all hover:bg-blue-50"
                  style={{
                    borderColor: 'var(--border)',
                    background: selectedGuardian?.id === g.id ? '#eef2ff' : undefined,
                    borderLeft: selectedGuardian?.id === g.id ? '3px solid #6366f1' : '3px solid transparent',
                  }}
                >
                  <div className="text-sm font-bold" style={{ color: 'var(--ink)' }}>
                    {g.first_name} {g.last_name}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg capitalize"
                      style={{ background: g.role === 'teacher' ? '#fef3c7' : '#ede9fe', color: g.role === 'teacher' ? '#92400e' : '#5b21b6' }}>
                      {g.role}
                    </span>
                    <span className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>
                      {g.student_count} student{g.student_count != 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Assignment panel */}
        <div className="flex-1">
          {!selectedGuardian ? (
            <div className="bg-white border-2 rounded-2xl p-12 text-center" style={{ borderColor: 'var(--border)' }}>
              <div className="text-4xl mb-3">👈</div>
              <div className="text-sm font-bold" style={{ color: 'var(--ink)' }}>Select a Guardian or Teacher</div>
              <div className="text-xs mt-1" style={{ color: 'var(--ink-faint)' }}>Choose from the left to manage their student assignments</div>
            </div>
          ) : (
            <>
              {/* Currently assigned */}
              <div className="bg-white border-2 rounded-2xl overflow-hidden mb-4" style={{ borderColor: 'var(--border)' }}>
                <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--ink-faint)' }}>
                      Assigned to {selectedGuardian.first_name} {selectedGuardian.last_name}
                    </div>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-lg" style={{ background: '#dcfce7', color: '#166534' }}>
                    {assignedStudents.length} student{assignedStudents.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {assignedStudents.length === 0 ? (
                  <div className="p-4 text-center text-xs" style={{ color: 'var(--ink-faint)' }}>No students assigned yet</div>
                ) : (
                  <div className="max-h-48 overflow-y-auto">
                    {assignedStudents.map(s => (
                      <div key={s.id} className="px-4 py-2.5 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                        <div>
                          <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{s.first_name} {s.last_name}</span>
                          <span className="text-[10px] ml-2" style={{ color: 'var(--ink-faint)' }}>
                            {s.grade && `Grade ${s.grade}`}{s.section && `, ${s.section}`}
                          </span>
                          <span className="text-[10px] font-bold ml-2 px-1.5 py-0.5 rounded capitalize"
                            style={{ background: '#f3e8ff', color: '#7c3aed' }}>{s.relationship}</span>
                          <span className="text-[10px] ml-2" style={{ color: 'var(--ink-faint)' }}>
                            {s.report_count} report{s.report_count != 1 ? 's' : ''}
                          </span>
                        </div>
                        <button onClick={() => removeAssignment(s.id)}
                          className="text-[10px] font-bold px-2 py-1 rounded-lg hover:bg-red-50"
                          style={{ color: '#dc2626' }}>
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Assign new students */}
              <div className="bg-white border-2 rounded-2xl overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                <div className="px-4 py-3 border-b flex items-center gap-3" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
                  <div className="text-xs font-bold uppercase tracking-wider flex-1" style={{ color: 'var(--ink-faint)' }}>
                    Add Students
                  </div>
                  <select value={relationship} onChange={e => setRelationship(e.target.value)}
                    className="text-xs font-semibold px-2 py-1.5 rounded-lg border" style={{ borderColor: 'var(--border)' }}>
                    {REL_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                <div className="px-4 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                  <input
                    placeholder="Search students by name, email, grade..."
                    value={search} onChange={e => setSearch(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 rounded-xl text-sm border focus:border-blue-400 focus:outline-none"
                    style={{ borderColor: 'var(--border)' }}
                  />
                </div>
                <div className="px-4 py-2 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer" style={{ color: 'var(--ink-soft)' }}>
                    <input type="checkbox"
                      checked={filteredStudents.length > 0 && filteredStudents.every(s => selectedStudentIds.has(s.id))}
                      onChange={selectAll} className="rounded"
                    />
                    Select all ({filteredStudents.length})
                  </label>
                  {selectedStudentIds.size > 0 && (
                    <button onClick={assignSelected} disabled={saving}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg text-white"
                      style={{ background: '#6366f1' }}>
                      {saving ? 'Assigning...' : `Assign ${selectedStudentIds.size} student${selectedStudentIds.size !== 1 ? 's' : ''}`}
                    </button>
                  )}
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {filteredStudents.length === 0 ? (
                    <div className="p-4 text-center text-xs" style={{ color: 'var(--ink-faint)' }}>
                      {unassigned.length === 0 ? 'All students are already assigned' : 'No matching students found'}
                    </div>
                  ) : filteredStudents.map(s => (
                    <div key={s.id}
                      onClick={() => toggleStudent(s.id)}
                      className="px-4 py-2.5 border-b flex items-center gap-3 cursor-pointer hover:bg-blue-50 transition-colors"
                      style={{ borderColor: 'var(--border)', background: selectedStudentIds.has(s.id) ? '#eef2ff' : undefined }}>
                      <input type="checkbox" checked={selectedStudentIds.has(s.id)} readOnly className="rounded" />
                      <div className="flex-1">
                        <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{s.first_name} {s.last_name}</span>
                        <span className="text-[10px] ml-2" style={{ color: 'var(--ink-faint)' }}>{s.email}</span>
                      </div>
                      <span className="text-[10px] font-semibold" style={{ color: 'var(--ink-faint)' }}>
                        {s.grade && `Gr ${s.grade}`}{s.section && `-${s.section}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
