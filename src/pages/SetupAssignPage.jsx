import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

// ═══════════════════════════════════════════
// UNIFIED SETUP & ASSIGN — One page, one flow
// Step 1: Upload items (or skip if items exist)
// Step 2: Pick test type (Cognitive / Personality / Interest)
// Step 3: Select students & assign
// ═══════════════════════════════════════════

const DOMAIN_LABELS = {
  gf: 'Fluid Reasoning', gv: 'Visual Spatial', gq: 'Quantitative',
  gc: 'Verbal Reasoning', gs: 'Processing Speed',
  personality: 'Personality', interest: 'Career Interest',
};
const DOMAIN_COLORS = { gf: '#6366F1', gv: '#0891B2', gq: '#D97706', gc: '#059669', gs: '#DC2626', personality: '#EC4899', interest: '#F59E0B' };

const TEST_TYPES = [
  { key: 'cognitive', label: 'Cognitive Aptitude', description: 'Adaptive IRT-based assessment across 5 cognitive domains', icon: '🧠' },
  { key: 'personality', label: 'Personality (Big Five)', description: 'Likert-scale personality trait assessment', icon: '💖' },
  { key: 'interest', label: 'Career Interest (RIASEC)', description: 'Holland-type career interest inventory', icon: '🧭' },
];

export default function SetupAssignPage() {
  const [step, setStep] = useState(1);
  const navigate = useNavigate();

  // Step 1 state — Upload
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const fileRef = useRef();

  // Step 2 state — Test type
  const [itemStats, setItemStats] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Step 3 state — Students
  const [students, setStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [generateTokens, setGenerateTokens] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Step 4 state — Result
  const [assigning, setAssigning] = useState(false);
  const [assignResult, setAssignResult] = useState(null);

  // Load item stats and students on mount
  const loadData = useCallback(async () => {
    setLoadingStats(true);
    try {
      const [statsData, stuData] = await Promise.all([
        api.get('/items/stats'),
        api.get('/auth/users?role=student&limit=500'),
      ]);
      setItemStats(statsData);
      const stuList = stuData.users || stuData || [];
      setStudents(stuList);
    } catch (err) { console.error(err); }
    setLoadingStats(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const hasAnyItems = itemStats && (itemStats.cognitive.total > 0 || itemStats.personality.total > 0 || itemStats.interest.total > 0);

  // ── Step 1: Upload ──
  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const result = await api.upload('/items/upload', file, { confirm: 'true' });
      console.log('Upload result:', result);
      setUploadResult(result);
      
      // Refresh stats after upload
      const statsData = await api.get('/items/stats');
      setItemStats(statsData);
      
      // Only auto-navigate to step 2 if no items were skipped
      if (!result.skippedItems || result.skippedItems.length === 0) {
        setStep(2);
      }
      // If there are missing tokens, stay on step 1 so user can review
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

  // ── Step 3: Assign ──
  const handleAssign = async () => {
    if (!selectedType || selectedStudents.size === 0) return;
    setAssigning(true);
    try {
      const result = await api.post('/sessions/assign-by-type', {
        testType: selectedType,
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

  const selectedTypeObj = TEST_TYPES.find(t => t.key === selectedType);

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800" style={{ fontFamily: "'Playfair Display', serif" }}>
          Setup & Assign
        </h1>
        <p className="text-sm text-stone-500 mt-1">Upload items, pick a test type, select students — all in one go.</p>
      </div>

      {/* Progress steps */}
      <div className="flex items-center gap-2 mb-8">
        {[
          { n: 1, label: 'Upload Items' },
          { n: 2, label: 'Pick Test Type' },
          { n: 3, label: 'Select Students' },
          { n: 4, label: 'Done' },
        ].map((s, i) => (
          <div key={s.n} className="flex items-center gap-2 flex-1">
            <button
              onClick={() => s.n < step ? setStep(s.n) : null}
              disabled={s.n > step}
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
              Upload your Excel file with test items. Test types will be auto-detected from the domains found.
              {hasAnyItems && <span className="text-green-600 font-semibold"> You already have items uploaded — you can skip this step.</span>}
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
              <div className="mt-4 space-y-3">
                <div className="p-4 rounded-xl bg-green-50 border border-green-200">
                  <div className="text-sm font-bold text-green-700">
                    ✓ Uploaded: {uploadResult.inserted} new + {uploadResult.updated} updated items
                    {uploadResult.skipped > 0 && (
                      <span className="ml-2 text-amber-600">· {uploadResult.skipped} skipped</span>
                    )}
                  </div>
                </div>

                {/* Skipped items — unified error panel with smart Fix button */}
                {uploadResult.skippedItems && uploadResult.skippedItems.length > 0 && (
                  <div className="rounded-xl bg-red-50 border border-red-300 overflow-hidden">
                    <div className="bg-red-600 px-4 py-2.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-white font-bold text-sm">
                          ⚠️ {uploadResult.skippedItems.length} item{uploadResult.skippedItems.length !== 1 ? 's' : ''} not uploaded — missing shapes
                        </div>
                        <div className="text-red-100 text-xs mt-0.5">
                          Click <strong>Fix Missing Shapes</strong> to add them right now — no developer needed
                        </div>
                      </div>
                      <button
                        onClick={() => navigate('/admin/tokens', {
                          state: { fromUpload: true, skippedItems: uploadResult.skippedItems }
                        })}
                        className="shrink-0 px-4 py-2 bg-white text-red-600 rounded-lg text-xs font-bold hover:bg-red-50 transition-colors shadow">
                        🔧 Fix Missing Shapes →
                      </button>
                    </div>

                    {/* Token error table */}
                    <div className="max-h-56 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-red-100 sticky top-0">
                          <tr>
                            <th className="px-3 py-1.5 text-left font-bold text-red-800">Item ID</th>
                            <th className="px-3 py-1.5 text-left font-bold text-red-800">Row</th>
                            <th className="px-3 py-1.5 text-left font-bold text-red-800">Missing Token(s)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-red-200">
                          {uploadResult.skippedItems.map((item, i) => (
                            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-red-50/50'}>
                              <td className="px-3 py-1.5 font-mono font-bold text-gray-800">{item.itemId}</td>
                              <td className="px-3 py-1.5 text-gray-500 font-mono">{item.excelRow ? `row ${item.excelRow}` : '—'}</td>
                              <td className="px-3 py-1.5">
                                <div className="flex flex-wrap gap-1">
                                  {item.unresolvedTokens?.map((t, j) => (
                                    <button
                                      key={j}
                                      onClick={() => navigate('/admin/tokens', {
                                        state: { fromUpload: true, skippedItems: uploadResult.skippedItems, focusToken: t.token }
                                      })}
                                      className="bg-red-100 hover:bg-red-200 text-red-700 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold transition-colors cursor-pointer"
                                      title="Click to fix this token"
                                    >
                                      {t.token} →
                                    </button>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="bg-red-100 px-3 py-1.5 text-[10px] text-red-700 border-t border-red-200">
                      Click any token above to jump straight to fixing it in Token Manager
                    </div>
                  </div>
                )}
              </div>
            )}

          </Card>

          <div className="flex gap-3">
            {hasAnyItems && !uploadResult && (
              <button onClick={() => setStep(2)}
                className="flex-1 px-4 py-3 rounded-xl border-2 border-stone-200 text-sm font-bold text-stone-600 hover:border-stone-300 transition-all">
                Skip — use existing items →
              </button>
            )}
            
            {/* Show "Continue Anyway" button if upload succeeded with missing tokens */}
            {uploadResult && uploadResult.skippedItems && uploadResult.skippedItems.length > 0 ? (
              <button onClick={() => setStep(2)}
                className="flex-1 px-4 py-3 rounded-xl text-sm font-bold text-white transition-all"
                style={{ background: 'linear-gradient(135deg, #DC2626, #EF4444)' }}>
                ⚠️ Continue Anyway (Some Items Missing) →
              </button>
            ) : uploadResult ? (
              <button onClick={() => setStep(2)}
                className="flex-1 px-4 py-3 rounded-xl text-sm font-bold text-white transition-all"
                style={{ background: 'linear-gradient(135deg, #059669, #10B981)' }}>
                ✓ Continue to Test Selection →
              </button>
            ) : (
              <button onClick={handleUpload} disabled={!file || uploading}
                className="flex-1 px-4 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition-all"
                style={{ background: 'linear-gradient(135deg, #B45309, #D97706)' }}>
                {uploading ? 'Uploading…' : 'Upload & Continue →'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ═══ STEP 2: Pick Test Type ═══ */}
      {step === 2 && (
        <div className="space-y-4">
          <Card>
            <h2 className="text-lg font-bold text-stone-800 mb-1">Choose Test Type</h2>
            <p className="text-sm text-stone-500 mb-4">Select which type of assessment to assign to students.</p>

            {loadingStats ? (
              <div className="text-sm text-stone-400 py-8 text-center">Loading…</div>
            ) : (
              <div className="space-y-3">
                {TEST_TYPES.map(tt => {
                  const stats = itemStats?.[tt.key] || { total: 0, domains: {} };
                  const isReady = stats.total > 0;
                  const isSelected = selectedType === tt.key;
                  const domains = Object.entries(stats.domains);

                  return (
                    <button key={tt.key} onClick={() => isReady && setSelectedType(tt.key)}
                      disabled={!isReady}
                      className={`w-full text-left p-5 rounded-xl border-2 transition-all ${
                        !isReady ? 'border-stone-100 bg-stone-50 opacity-60 cursor-not-allowed' :
                        isSelected ? 'border-amber-500 bg-amber-50 shadow-sm' :
                        'border-stone-200 hover:border-stone-300 bg-white cursor-pointer'
                      }`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xl">{tt.icon}</span>
                            <span className="text-sm font-bold text-stone-800">{tt.label}</span>
                            {isReady ? (
                              <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                {stats.total} items
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">
                                No items
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-stone-500 mb-2">{tt.description}</div>
                          {domains.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {domains.map(([d, domainStats]) => (
                                <span key={d} className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
                                  style={{ background: DOMAIN_COLORS[d] || '#6B7280' }}>
                                  {DOMAIN_LABELS[d] || d}: {domainStats.count}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 transition-all ${
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
            <button onClick={() => setStep(3)} disabled={!selectedType}
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
                  Assigning: <span className="font-bold text-amber-700">{selectedTypeObj?.icon} {selectedTypeObj?.label}</span>
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
              <span className="font-bold text-amber-700"> {selectedTypeObj?.icon} {selectedTypeObj?.label}</span> assessment.
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
              <button onClick={() => { setStep(1); setFile(null); setUploadResult(null); setSelectedType(null); setSelectedStudents(new Set()); setAssignResult(null); }}
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
