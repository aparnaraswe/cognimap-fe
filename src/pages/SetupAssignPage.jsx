import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

// ═══════════════════════════════════════════
// UNIFIED SETUP & ASSIGN — One page, one flow
// Step 1: Upload items (or skip if items exist)
// Step 2: Pick/create battery
// Step 3: Select students
// Step 4: Assign → done
// ═══════════════════════════════════════════

const DOMAIN_LABELS = {
  gf: 'Fluid Reasoning', gv: 'Visual Spatial', gq: 'Quantitative',
  gc: 'Verbal Reasoning', gs: 'Processing Speed',
  personality: 'Personality', interest: 'Career Interest',
};
const DOMAIN_ICONS = { gf: '🧩', gv: '👁️', gq: '🔢', gc: '💬', gs: '⚡', personality: '💖', interest: '🧭' };
const DOMAIN_COLORS = { gf: '#6366F1', gv: '#0891B2', gq: '#D97706', gc: '#059669', gs: '#DC2626', personality: '#EC4899', interest: '#F59E0B' };

export default function SetupAssignPage() {
  const [step, setStep] = useState(1);
  const navigate = useNavigate();

  // Step 1 state — Upload
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const fileRef = useRef();

  // Step 2 state — Battery
  const [batteries, setBatteries] = useState([]);
  const [selectedBattery, setSelectedBattery] = useState(null);
  const [itemStats, setItemStats] = useState(null);
  const [loadingBatteries, setLoadingBatteries] = useState(true);

  // Step 3 state — Students
  const [students, setStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [generateTokens, setGenerateTokens] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Step 4 state — Result
  const [assigning, setAssigning] = useState(false);
  const [assignResult, setAssignResult] = useState(null);

  // Load batteries and students on mount
  const loadData = useCallback(async () => {
    setLoadingBatteries(true);
    try {
      const [batData, stuData] = await Promise.all([
        api.get('/batteries?status=active'),
        api.get('/auth/users?role=student&limit=500'),
      ]);
      setBatteries(batData.batteries || batData || []);
      const stuList = stuData.users || stuData || [];
      setStudents(stuList);
    } catch (err) { console.error(err); }
    setLoadingBatteries(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Step 1: Upload ──
  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const result = await api.upload('/items/upload', file);
      setUploadResult(result);
      // Refresh batteries since auto-create happened
      const batData = await api.get('/batteries?status=active');
      setBatteries(batData.batteries || batData || []);
      // Auto-select the first battery if none selected
      const bats = batData.batteries || batData || [];
      if (bats.length > 0 && !selectedBattery) {
        setSelectedBattery(bats[0].id);
      }
      // Auto-advance to step 2
      setStep(2);
    } catch (err) {
      alert(err.message || 'Upload failed');
    }
    setUploading(false);
  };

  // ── Step 3: Toggle student selection ──
  const toggleStudent = (id) => {
    setSelectedStudents(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(filteredStudents.map(s => s.id)));
    }
    setSelectAll(!selectAll);
  };

  const filteredStudents = students.filter(s => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (s.first_name || '').toLowerCase().includes(q) ||
           (s.last_name || '').toLowerCase().includes(q) ||
           (s.email || '').toLowerCase().includes(q) ||
           (s.grade || '').toLowerCase().includes(q);
  });

  // ── Step 4: Assign ──
  const handleAssign = async () => {
    if (!selectedBattery || selectedStudents.size === 0) return;
    setAssigning(true);
    try {
      const result = await api.post('/sessions/assign', {
        batteryId: selectedBattery,
        userIds: [...selectedStudents],
        generateTokens,
      });
      setAssignResult(result);
      setStep(4);
    } catch (err) {
      alert(err.message || 'Assignment failed');
    }
    setAssigning(false);
  };

  const selectedBatteryObj = batteries.find(b => b.id === selectedBattery);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800" style={{ fontFamily: "'Playfair Display', serif" }}>
          Setup & Assign
        </h1>
        <p className="text-sm text-stone-500 mt-1">Upload items, pick a battery, select students — all in one go.</p>
      </div>

      {/* Progress steps */}
      <div className="flex items-center gap-2 mb-8">
        {[
          { n: 1, label: 'Upload Items' },
          { n: 2, label: 'Pick Battery' },
          { n: 3, label: 'Select Students' },
          { n: 4, label: 'Done' },
        ].map((s, i) => (
          <div key={s.n} className="flex items-center gap-2 flex-1">
            <button
              onClick={() => s.n < step || (s.n <= 3 && step === 4) ? null : setStep(s.n)}
              disabled={s.n > step && step !== 4}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step === s.n ? 'text-white shadow-md' :
                step > s.n ? 'text-white' :
                'text-stone-400 bg-stone-100'
              }`}
              style={step >= s.n ? { background: step === s.n ? 'linear-gradient(135deg, #B45309, #D97706)' : '#059669' } : {}}>
              {step > s.n ? '✓' : s.n}
            </button>
            <span className={`text-xs font-semibold hidden sm:block ${step >= s.n ? 'text-stone-700' : 'text-stone-400'}`}>{s.label}</span>
            {i < 3 && <div className={`flex-1 h-0.5 rounded ${step > s.n ? 'bg-green-400' : 'bg-stone-200'}`} />}
          </div>
        ))}
      </div>

      {/* ═══ STEP 1: Upload ═══ */}
      {step === 1 && (
        <div className="space-y-4">
          <Card>
            <h2 className="text-lg font-bold text-stone-800 mb-1">Upload Item Bank</h2>
            <p className="text-sm text-stone-500 mb-4">
              Upload your Excel file with test items. Batteries will be auto-created from the domains found.
              {batteries.length > 0 && <span className="text-green-600 font-semibold"> You already have {batteries.length} battery(ies) — you can skip this step.</span>}
            </p>

            <div className="border-2 border-dashed border-stone-200 rounded-2xl p-8 text-center hover:border-amber-300 transition-colors cursor-pointer"
              onClick={() => fileRef.current?.click()}>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={e => setFile(e.target.files[0])} />
              {file ? (
                <div>
                  <div className="text-2xl mb-2">📄</div>
                  <div className="text-sm font-bold text-stone-800">{file.name}</div>
                  <div className="text-xs text-stone-400">{(file.size / 1024).toFixed(0)} KB</div>
                </div>
              ) : (
                <div>
                  <div className="text-3xl mb-2">📁</div>
                  <div className="text-sm font-semibold text-stone-600">Click to choose Excel file</div>
                  <div className="text-xs text-stone-400 mt-1">.xlsx, .xls, or .csv</div>
                </div>
              )}
            </div>

            {uploadResult && (
              <div className="mt-4 p-4 rounded-xl bg-green-50 border border-green-200">
                <div className="text-sm font-bold text-green-700">✓ Uploaded: {uploadResult.inserted} new + {uploadResult.updated} updated items</div>
                {uploadResult.batteries?.length > 0 && (
                  <div className="text-xs text-green-600 mt-1">
                    Auto-created: {uploadResult.batteries.map(b => b.name).join(', ')}
                  </div>
                )}
              </div>
            )}
          </Card>

          <div className="flex gap-3">
            {batteries.length > 0 && (
              <button onClick={() => setStep(2)}
                className="flex-1 px-4 py-3 rounded-xl border-2 border-stone-200 text-sm font-bold text-stone-600 hover:border-stone-300 transition-all">
                Skip — use existing batteries →
              </button>
            )}
            <button onClick={handleUpload} disabled={!file || uploading}
              className="flex-1 px-4 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition-all"
              style={{ background: 'linear-gradient(135deg, #B45309, #D97706)' }}>
              {uploading ? 'Uploading…' : 'Upload & Continue →'}
            </button>
          </div>
        </div>
      )}

      {/* ═══ STEP 2: Pick Battery ═══ */}
      {step === 2 && (
        <div className="space-y-4">
          <Card>
            <h2 className="text-lg font-bold text-stone-800 mb-1">Choose Battery</h2>
            <p className="text-sm text-stone-500 mb-4">Select which test battery to assign to students.</p>

            {loadingBatteries ? (
              <div className="text-sm text-stone-400 py-8 text-center">Loading…</div>
            ) : batteries.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-3xl mb-2">📭</div>
                <div className="text-sm text-stone-500">No batteries found. Go back and upload items first.</div>
              </div>
            ) : (
              <div className="space-y-2">
                {batteries.map(b => {
                  const isSelected = selectedBattery === b.id;
                  return (
                    <button key={b.id} onClick={() => setSelectedBattery(b.id)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                        isSelected ? 'border-amber-500 bg-amber-50' : 'border-stone-200 hover:border-stone-300 bg-white'
                      }`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-bold text-stone-800">{b.name}</div>
                          <div className="text-xs text-stone-400 mt-0.5">{b.description || 'No description'}</div>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                          isSelected ? 'border-amber-500 bg-amber-500' : 'border-stone-300'
                        }`}>
                          {isSelected && <span className="text-white text-xs">✓</span>}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </Card>

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="px-4 py-3 rounded-xl border border-stone-200 text-sm font-semibold text-stone-600">
              ← Back
            </button>
            <button onClick={() => setStep(3)} disabled={!selectedBattery}
              className="flex-1 px-4 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition-all"
              style={{ background: 'linear-gradient(135deg, #B45309, #D97706)' }}>
              Select Students →
            </button>
          </div>
        </div>
      )}

      {/* ═══ STEP 3: Select Students ═══ */}
      {step === 3 && (
        <div className="space-y-4">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-stone-800">Select Students</h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Assigning: <span className="font-bold text-amber-700">{selectedBatteryObj?.name}</span>
                  {selectedStudents.size > 0 && <span className="text-green-600 font-bold"> • {selectedStudents.size} selected</span>}
                </p>
              </div>
            </div>

            {/* Search + Select all */}
            <div className="flex gap-2 mb-3">
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, grade…"
                className="flex-1 px-4 py-2.5 rounded-xl border border-stone-200 text-sm bg-stone-50 focus:border-amber-500 focus:bg-white outline-none" />
              <button onClick={handleSelectAll}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${
                  selectAll ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-stone-200 text-stone-500 hover:border-stone-300'
                }`}>
                {selectAll ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            {/* Student list */}
            <div className="max-h-[360px] overflow-auto rounded-xl border border-stone-200">
              {filteredStudents.length === 0 ? (
                <div className="text-center py-8 text-sm text-stone-400">
                  {students.length === 0 ? 'No students registered yet. Add students in Users page first.' : 'No students match your search.'}
                </div>
              ) : (
                <table className="w-full">
                  <thead className="sticky top-0 bg-stone-50 border-b border-stone-200">
                    <tr>
                      <th className="w-10 px-3 py-2"></th>
                      <th className="text-left px-3 py-2 text-[10px] font-semibold text-stone-500 uppercase">Name</th>
                      <th className="text-left px-3 py-2 text-[10px] font-semibold text-stone-500 uppercase">Grade</th>
                      <th className="text-left px-3 py-2 text-[10px] font-semibold text-stone-500 uppercase">Email</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredStudents.map(s => {
                      const checked = selectedStudents.has(s.id);
                      return (
                        <tr key={s.id} onClick={() => toggleStudent(s.id)}
                          className={`cursor-pointer transition-colors ${checked ? 'bg-amber-50' : 'hover:bg-stone-50'}`}>
                          <td className="px-3 py-2.5 text-center">
                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center mx-auto ${
                              checked ? 'border-amber-500 bg-amber-500' : 'border-stone-300'
                            }`}>
                              {checked && <span className="text-white text-[10px]">✓</span>}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-sm font-semibold text-stone-800">{s.first_name} {s.last_name}</td>
                          <td className="px-3 py-2.5 text-xs text-stone-500">{s.grade || '—'}</td>
                          <td className="px-3 py-2.5 text-xs text-stone-400">{s.email}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Options */}
            <div className="mt-3 flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={generateTokens} onChange={e => setGenerateTokens(e.target.checked)}
                  className="w-4 h-4 rounded border-stone-300 text-amber-600" />
                <span className="text-xs font-semibold text-stone-600">Generate access tokens (for students without login)</span>
              </label>
            </div>
          </Card>

          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="px-4 py-3 rounded-xl border border-stone-200 text-sm font-semibold text-stone-600">
              ← Back
            </button>
            <button onClick={handleAssign} disabled={selectedStudents.size === 0 || assigning}
              className="flex-1 px-4 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition-all"
              style={{ background: 'linear-gradient(135deg, #059669, #10B981)' }}>
              {assigning ? 'Assigning…' : `Assign to ${selectedStudents.size} Student${selectedStudents.size !== 1 ? 's' : ''} ✓`}
            </button>
          </div>
        </div>
      )}

      {/* ═══ STEP 4: Done ═══ */}
      {step === 4 && assignResult && (
        <div className="space-y-4">
          <Card className="text-center">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-xl font-bold text-stone-800 mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
              Tests Assigned Successfully!
            </h2>
            <p className="text-sm text-stone-500 mb-6">
              <span className="font-bold text-green-600">{assignResult.sessions?.length || 0}</span> students can now take the
              <span className="font-bold text-amber-700"> {selectedBatteryObj?.name}</span> assessment.
            </p>

            {/* Tokens */}
            {assignResult.tokens?.length > 0 && (
              <div className="text-left bg-stone-50 rounded-xl p-4 mb-4">
                <div className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Access Tokens</div>
                <div className="space-y-1 max-h-48 overflow-auto">
                  {assignResult.tokens.map((t, i) => (
                    <div key={i} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-stone-200">
                      <span className="text-xs text-stone-500">{students.find(s => s.id === t.userId)?.first_name || t.userId.slice(0, 8)}</span>
                      <code className="text-sm font-bold text-stone-800 font-mono">{t.token}</code>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <button onClick={() => { setStep(1); setFile(null); setUploadResult(null); setSelectedStudents(new Set()); setAssignResult(null); }}
                className="px-5 py-3 rounded-xl border border-stone-200 text-sm font-semibold text-stone-600 hover:bg-stone-50">
                Assign Another
              </button>
              <button onClick={() => navigate('/admin/sessions')}
                className="px-5 py-3 rounded-xl text-sm font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #B45309, #D97706)' }}>
                View Sessions →
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function Card({ children, className = '' }) {
  return <div className={`bg-white border border-stone-200 rounded-2xl p-6 shadow-sm ${className}`}>{children}</div>;
}
