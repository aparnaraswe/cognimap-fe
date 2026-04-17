import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBatch } from '../context/BatchContext';
import BatchFilter from '../components/BatchFilter';
import api from '../utils/api';
import {
  Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, ArrowRight, ArrowLeft,
  Brain, Heart, Compass, Check, Search, Users as UsersIcon, PartyPopper, Wrench, Bookmark
} from 'lucide-react';

// ═══════════════════════════════════════════
// UNIFIED SETUP & ASSIGN — One page, one flow
// Step 1: Upload items (or skip if items exist)
// Step 2: Pick test type (Cognitive / Personality / Interest)
// Step 3: Select students & assign
// Step 4: Done
// ═══════════════════════════════════════════

const DOMAIN_LABELS = {
  gf: 'Fluid Reasoning', gv: 'Visual Spatial', gq: 'Quantitative',
  gc: 'Verbal Reasoning', gs: 'Processing Speed', gwm: 'Working Memory',
  personality: 'Personality', interest: 'Career Interest',
};

const TEST_TYPES = [
  { key: 'cognitive',   label: 'Cognitive Aptitude',       description: 'Adaptive IRT-based assessment across 6 cognitive domains', Icon: Brain },
  { key: 'personality', label: 'Personality (Big Five)',   description: 'Likert-scale personality trait assessment',               Icon: Heart },
  { key: 'interest',    label: 'Career Interest (RIASEC)', description: 'Holland-type career interest inventory',                  Icon: Compass },
];

export default function SetupAssignPage() {
  const [step, setStep] = useState(1);
  const navigate = useNavigate();
  const { activeBatchId, activeBatch } = useBatch();

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
  const [tokenUploads, setTokenUploads] = useState({}); // { tokenKey: { file, status, error } }

  // Load item stats and students — re-fetch when batch changes
  const loadData = useCallback(async () => {
    setLoadingStats(true);
    try {
      const userParams = new URLSearchParams({ role: 'student', limit: 500 });
      if (activeBatchId) userParams.set('batchId', activeBatchId);
      const [statsData, stuData] = await Promise.all([
        api.get('/items/stats'),
        api.get(`/auth/users?${userParams}`),
      ]);
      setItemStats(statsData);
      const stuList = stuData.users || stuData || [];
      setStudents(stuList);
      // Reset selection when batch changes
      setSelectedStudents(new Set());
      setSelectAll(false);
    } catch (err) { console.error(err); }
    setLoadingStats(false);
  }, [activeBatchId]);

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

  // Global student search — matches name, email, grade, section, phone, age band
  const filteredStudents = students.filter(s => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase().trim();
    const fullName = `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase();
    return fullName.includes(q) ||
           (s.email || '').toLowerCase().includes(q) ||
           (s.grade || '').toLowerCase().includes(q) ||
           (s.section || '').toLowerCase().includes(q) ||
           (s.age_band || '').toLowerCase().includes(q) ||
           (s.phone || '').toLowerCase().includes(q);
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
        batchId: activeBatchId || undefined,
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
    <div className="page">
      {/* Compact sticky topbar */}
      <div
        className="sticky top-0 z-30 flex items-center justify-between px-6 lg:px-8 py-3"
        style={{ background: 'var(--warm)', borderBottom: '1px solid var(--border)' }}
      >
        <div>
          <h1 className="font-display text-[19px]" style={{ color: 'var(--ink)' }}>
            Setup and assign
          </h1>
          <p className="text-[11.5px] mt-0.5" style={{ color: 'var(--slate-light)' }}>
            A guided four-step flow
          </p>
        </div>
      </div>

      <div className="px-6 lg:px-8 py-5 max-w-4xl mx-auto space-y-5">
        {/* Batch filter */}
        <div>
          <BatchFilter />
        </div>
        {activeBatch && (
          <div className="card px-5 py-4 flex items-start gap-2 text-xs" style={{ color: 'var(--ink)' }}>
            <Bookmark size={14} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--blush)' }} />
            <div>
              Showing <strong className="font-semibold tabular-nums">{students.length}</strong> students from{' '}
              <strong className="font-semibold">{activeBatch.name}</strong>.
              Sessions assigned here will be tagged with this batch.
            </div>
          </div>
        )}

        {/* Progress steps */}
        <div className="card p-5">
          <div className="flex items-center gap-2">
            {[
              { n: 1, label: 'Upload Items' },
              { n: 2, label: 'Pick Test Type' },
              { n: 3, label: 'Select Students' },
              { n: 4, label: 'Done' },
            ].map((s, i) => {
              const isActive = step === s.n;
              const isDone = step > s.n;
              return (
                <div key={s.n} className="flex items-center gap-2 flex-1">
                  <button
                    onClick={() => s.n < step ? setStep(s.n) : null}
                    disabled={s.n > step}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors flex-shrink-0 font-display"
                    style={
                      isActive
                        ? { background: 'var(--blush)', color: '#fff' }
                        : isDone
                        ? { background: 'var(--sage)', color: '#fff' }
                        : { background: 'var(--warm)', color: 'var(--slate-light)', border: '1px solid var(--border)' }
                    }
                  >
                    {isDone ? <Check size={14} /> : s.n}
                  </button>
                  <span
                    className="text-xs font-semibold hidden sm:block truncate"
                    style={{
                      color: isActive
                        ? 'var(--ink)'
                        : isDone
                        ? 'var(--sage)'
                        : 'var(--slate-light)',
                    }}
                  >
                    {s.label}
                  </span>
                  {i < 3 && (
                    <div
                      className="flex-1 h-[1px]"
                      style={{ background: isDone ? 'var(--sage)' : 'var(--border)' }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══ STEP 1: Upload ═══ */}
        {step === 1 && (
          <div className="space-y-4 animate-fade-up">
            <div className="card p-6 lg:p-8">
              <h2 className="section-title mb-1.5">Upload Item Bank</h2>
              <p className="text-[13px] mb-5" style={{ color: 'var(--slate)' }}>
                Upload your Excel file with test items. Test types will be auto-detected from the domains found.
                {hasAnyItems && (
                  <span className="font-semibold" style={{ color: 'var(--sage)' }}>
                    {' '}You already have items uploaded — you can skip this step.
                  </span>
                )}
              </p>

              <div
                className="rounded-md p-10 text-center cursor-pointer transition-colors"
                style={{
                  border: '1.5px dashed var(--border)',
                  background: 'var(--warm)',
                }}
                onClick={() => fileRef.current?.click()}
              >
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={e => setFile(e.target.files[0])} />
                {file ? (
                  <div>
                    <div
                      className="w-12 h-12 mx-auto rounded-md flex items-center justify-center mb-3"
                      style={{ background: 'var(--warm)', border: '1px solid var(--border)' }}
                    >
                      <FileSpreadsheet size={20} style={{ color: 'var(--blush)' }} />
                    </div>
                    <div className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{file.name}</div>
                    <div className="text-xs mt-0.5 tabular-nums" style={{ color: 'var(--slate)' }}>
                      {(file.size / 1024).toFixed(0)} KB
                    </div>
                  </div>
                ) : (
                  <div>
                    <div
                      className="w-12 h-12 mx-auto rounded-md flex items-center justify-center mb-3"
                      style={{ background: 'var(--warm)', border: '1px solid var(--border)' }}
                    >
                      <Upload size={20} style={{ color: 'var(--slate)' }} />
                    </div>
                    <div className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Click to choose Excel file</div>
                    <div className="text-xs mt-1" style={{ color: 'var(--slate-light)' }}>.xlsx, .xls, or .csv</div>
                  </div>
                )}
              </div>

              {uploadResult && (
                <div className="mt-4 space-y-3">
                  <div
                    className="p-4 rounded-md flex items-start gap-2"
                    style={{ background: 'var(--sage-pale)', border: '1px solid var(--sage)' }}
                  >
                    <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--sage)' }} />
                    <div className="text-sm font-medium" style={{ color: 'var(--sage)' }}>
                      Uploaded: {uploadResult.inserted} new + {uploadResult.updated} updated items
                      {uploadResult.skipped > 0 && (
                        <span className="ml-2" style={{ color: 'var(--gold)' }}>· {uploadResult.skipped} skipped</span>
                      )}
                    </div>
                  </div>

                  {/* Skipped items — unified error panel with smart Fix button */}
                  {uploadResult.skippedItems && uploadResult.skippedItems.length > 0 && (() => {
                    const allTokens = uploadResult.skippedItems.flatMap(item =>
                      (item.unresolvedTokens || []).map(t => {
                        const raw = t.token.replace(/^excel_img:/, '');
                        return { ...t, filePath: raw, key: raw };
                      })
                    );
                    const uniqueTokens = [...new Map(allTokens.map(t => [t.key, t])).values()];
                    const uploadedCount = uniqueTokens.filter(t => tokenUploads[t.key]?.status === 'done').length;

                    const handleTokenFile = (tokenKey, file) => {
                      setTokenUploads(s => ({ ...s, [tokenKey]: { file, status: 'ready' } }));
                    };
                    const handleTokenUpload = async (token) => {
                      const st = tokenUploads[token.key];
                      if (!st?.file) return;
                      setTokenUploads(s => ({ ...s, [token.key]: { ...s[token.key], status: 'uploading' } }));
                      try {
                        await api.upload('/tokens/upload-item-image', st.file, { targetPath: token.filePath });
                        setTokenUploads(s => ({ ...s, [token.key]: { ...s[token.key], status: 'done' } }));
                      } catch (err) {
                        setTokenUploads(s => ({ ...s, [token.key]: { ...s[token.key], status: 'error', error: err.message } }));
                      }
                    };
                    const handleUploadAll = async () => {
                      const ready = uniqueTokens.filter(t => tokenUploads[t.key]?.file && tokenUploads[t.key]?.status !== 'done');
                      for (const token of ready) await handleTokenUpload(token);
                    };

                    return (
                    <div className="rounded-md overflow-hidden" style={{ border: '1px solid var(--blush)' }}>
                      <div
                        className="px-4 py-3 flex items-start justify-between gap-3"
                        style={{ background: 'var(--blush-pale)', borderBottom: '1px solid var(--blush)' }}
                      >
                        <div className="flex items-start gap-2 min-w-0">
                          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--blush)' }} />
                          <div className="min-w-0">
                            <div className="font-medium text-sm" style={{ color: 'var(--blush)' }}>
                              {uniqueTokens.length} missing image{uniqueTokens.length !== 1 ? 's' : ''} — upload them below
                            </div>
                            <div className="text-xs mt-0.5" style={{ color: 'var(--slate)' }}>
                              {uploadedCount > 0 && <span style={{ color: 'var(--sage)' }}>{uploadedCount} uploaded · </span>}
                              {uniqueTokens.length - uploadedCount} remaining
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={handleUploadAll}
                            disabled={!uniqueTokens.some(t => tokenUploads[t.key]?.file && tokenUploads[t.key]?.status !== 'done')}
                            className="btn-primary !px-3 !py-2 text-xs"
                          >
                            <Upload size={12} /> Upload All
                          </button>
                          <button
                            onClick={() => navigate('/admin/tokens', {
                              state: { fromUpload: true, skippedItems: uploadResult.skippedItems }
                            })}
                            className="btn-secondary !px-3 !py-2 text-xs"
                          >
                            <Wrench size={12} /> Token Manager
                          </button>
                        </div>
                      </div>

                      {/* Token upload list */}
                      <div className="max-h-72 overflow-y-auto" style={{ background: 'var(--paper)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          {uniqueTokens.map((token) => {
                            const st = tokenUploads[token.key] || {};
                            const isDone = st.status === 'done';
                            const isUploading = st.status === 'uploading';
                            const isError = st.status === 'error';
                            return (
                              <div key={token.key} className="flex items-center gap-3 px-4 py-2.5"
                                style={{
                                  background: isDone ? '#f0fdf4' : 'var(--card)',
                                  borderBottom: '1px solid var(--border)',
                                }}>
                                {/* Status icon */}
                                <div style={{ flexShrink: 0, width: 22, height: 22, borderRadius: 6,
                                  background: isDone ? '#dcfce7' : isError ? '#fef2f2' : 'var(--warm)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: 11,
                                }}>
                                  {isDone ? '✓' : isError ? '✕' : '📷'}
                                </div>

                                {/* Filename */}
                                <div className="flex-1 min-w-0">
                                  <div className="font-mono text-xs font-semibold truncate"
                                    style={{ color: isDone ? 'var(--sage)' : 'var(--ink)' }}
                                    title={token.filePath}>
                                    {token.filePath.split('/').pop()}
                                  </div>
                                  <div className="text-[10px] truncate" style={{ color: 'var(--slate)' }}>
                                    custom/{token.filePath}
                                  </div>
                                  {isError && (
                                    <div className="text-[10px] mt-0.5" style={{ color: 'var(--blush)' }}>{st.error}</div>
                                  )}
                                </div>

                                {/* Upload control */}
                                {isDone ? (
                                  <span className="text-[10px] font-bold px-2 py-1 rounded"
                                    style={{ background: '#dcfce7', color: '#16a34a' }}>
                                    Uploaded
                                  </span>
                                ) : (
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <label className="text-[11px] font-semibold px-2.5 py-1.5 rounded cursor-pointer"
                                      style={{
                                        background: st.file ? 'var(--warm)' : 'var(--blush-pale)',
                                        color: st.file ? 'var(--ink)' : 'var(--blush)',
                                        border: `1px solid ${st.file ? 'var(--border)' : 'var(--blush)'}`,
                                      }}>
                                      {st.file ? st.file.name.slice(0, 20) : 'Choose file'}
                                      <input type="file" accept=".svg,.png,.jpg,.jpeg,.webp"
                                        style={{ display: 'none' }}
                                        onChange={e => e.target.files[0] && handleTokenFile(token.key, e.target.files[0])}
                                      />
                                    </label>
                                    <button
                                      onClick={() => handleTokenUpload(token)}
                                      disabled={!st.file || isUploading}
                                      className="text-[11px] font-bold px-2.5 py-1.5 rounded"
                                      style={{
                                        background: st.file ? 'var(--blush)' : 'var(--warm)',
                                        color: st.file ? '#fff' : 'var(--slate)',
                                        border: 'none',
                                        cursor: st.file ? 'pointer' : 'not-allowed',
                                        opacity: st.file ? 1 : 0.5,
                                      }}>
                                      {isUploading ? '...' : '↑ Upload'}
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Footer: re-import hint */}
                      <div className="px-4 py-2.5 flex items-center justify-between"
                        style={{ background: 'var(--warm)', borderTop: '1px solid var(--border)' }}>
                        <span className="text-[10px]" style={{ color: 'var(--slate)' }}>
                          After uploading all images, re-upload the Excel to import the skipped items
                        </span>
                        {uploadedCount === uniqueTokens.length && uniqueTokens.length > 0 && (
                          <span className="text-[10px] font-bold px-2 py-1 rounded"
                            style={{ background: '#dcfce7', color: '#16a34a' }}>
                            All images uploaded — ready to re-import
                          </span>
                        )}
                      </div>
                    </div>
                    );
                  })()}
                </div>
              )}
            </div>

            <div className="flex gap-3 flex-wrap">
              {hasAnyItems && !uploadResult && (
                <button
                  onClick={() => setStep(2)}
                  className="btn-secondary flex-1 min-w-[200px]"
                >
                  Skip — use existing items
                </button>
              )}

              {/* Show "Continue Anyway" button if upload succeeded with missing tokens */}
              {uploadResult && uploadResult.skippedItems && uploadResult.skippedItems.length > 0 ? (
                <button
                  onClick={() => setStep(2)}
                  className="btn-primary flex-1 min-w-[200px]"
                  style={{ background: 'var(--blush)' }}
                >
                  <AlertTriangle size={14} /> Continue Anyway <ArrowRight size={14} />
                </button>
              ) : uploadResult ? (
                <button
                  onClick={() => setStep(2)}
                  className="btn-primary flex-1 min-w-[200px]"
                >
                  <Check size={14} /> Continue to Test Selection <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  onClick={handleUpload}
                  disabled={!file || uploading}
                  className="btn-primary flex-1 min-w-[200px]"
                >
                  <Upload size={14} />
                  {uploading ? 'Uploading…' : 'Upload & Continue'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ═══ STEP 2: Pick Test Type ═══ */}
        {step === 2 && (
          <div className="space-y-4 animate-fade-up">
            <div className="card p-6 lg:p-8">
              <h2 className="section-title mb-1.5">Choose Test Type</h2>
              <p className="text-[13px] mb-5" style={{ color: 'var(--slate)' }}>
                Select which type of assessment to assign to students.
              </p>

              {loadingStats ? (
                <div className="py-10 text-center">
                  <div
                    className="w-8 h-8 rounded-full animate-spin mx-auto mb-3"
                    style={{ border: '2px solid var(--border)', borderTopColor: 'var(--blush)' }}
                  />
                  <div className="text-sm" style={{ color: 'var(--slate)' }}>Loading…</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {TEST_TYPES.map(tt => {
                    const stats = itemStats?.[tt.key] || { total: 0, domains: {} };
                    const isReady = stats.total > 0;
                    const isSelected = selectedType === tt.key;
                    const domains = Object.entries(stats.domains);
                    const Icon = tt.Icon;

                    return (
                      <button
                        key={tt.key}
                        onClick={() => isReady && setSelectedType(tt.key)}
                        disabled={!isReady}
                        className="w-full text-left p-5 rounded-md transition-colors"
                        style={
                          !isReady
                            ? { border: '1px solid var(--border)', background: 'var(--warm)', opacity: 0.55, cursor: 'not-allowed' }
                            : isSelected
                            ? { border: '1px solid var(--blush)', background: 'var(--blush-pale)', boxShadow: '0 0 0 1.5px var(--blush-pale)' }
                            : { border: '1px solid var(--border)', background: 'var(--card)' }
                        }
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div
                              className="w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0"
                              style={
                                isSelected
                                  ? { background: 'var(--blush)', color: '#fff' }
                                  : { background: 'var(--warm)', color: 'var(--blush)', border: '1px solid var(--border)' }
                              }
                            >
                              <Icon size={18} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{tt.label}</span>
                                {isReady ? (
                                  <span className="badge badge-sage tabular-nums">
                                    {stats.total} items
                                  </span>
                                ) : (
                                  <span className="badge badge-slate">
                                    No items
                                  </span>
                                )}
                              </div>
                              <div className="text-xs mb-2" style={{ color: 'var(--slate)' }}>{tt.description}</div>
                              {domains.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                  {domains.map(([d, domainStats]) => (
                                    <span key={d} className="chip tabular-nums">
                                      {DOMAIN_LABELS[d] || d}: {domainStats.count}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-1 transition-colors"
                            style={
                              isSelected
                                ? { border: '2px solid var(--blush)', background: 'var(--blush)' }
                                : { border: '2px solid var(--border)' }
                            }
                          >
                            {isSelected && <Check size={12} style={{ color: '#fff' }} />}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex gap-3 flex-wrap">
              <button onClick={() => setStep(1)} className="btn-secondary">
                <ArrowLeft size={14} /> Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!selectedType}
                className="btn-primary flex-1 min-w-[200px]"
              >
                Select Students <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ═══ STEP 3: Select Students ═══ */}
        {step === 3 && (
          <div className="space-y-4 animate-fade-up">
            <Card>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="section-title">Choose Recipients</h2>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--slate)' }}>
                    Assigning:{' '}
                    <span className="font-semibold" style={{ color: 'var(--blush)' }}>{selectedTypeObj?.label}</span>
                    {selectedStudents.size > 0 && (
                      <span className="font-semibold" style={{ color: 'var(--sage)' }}>
                        {' · '}{selectedStudents.size} selected
                      </span>
                    )}
                  </p>
                </div>
                {students.length > 0 && (
                  <span className="chip tabular-nums">
                    {filteredStudents.length} of {students.length} shown
                  </span>
                )}
              </div>

              {/* Empty state — no students in this source */}
              {students.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <div
                    className="w-14 h-14 mx-auto rounded-md flex items-center justify-center mb-3"
                    style={{ background: 'var(--warm)', border: '1px solid var(--border)' }}
                  >
                    <UsersIcon size={22} style={{ color: 'var(--blush)' }} />
                  </div>
                  <div className="text-base font-semibold mb-1" style={{ color: 'var(--ink)' }}>
                    No users in this source yet
                  </div>
                  <p className="text-sm mb-5 max-w-sm mx-auto" style={{ color: 'var(--slate)' }}>
                    Add users individually or upload them in bulk before assigning a test.
                  </p>
                  <button onClick={() => navigate('/admin/users')} className="btn-primary">
                    Go to Users <ArrowRight size={14} />
                  </button>
                </div>
              ) : (
                <>
                  {/* Search + Select all */}
                  <div className="flex gap-2 mb-3">
                    <div className="relative flex-1">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--slate-light)' }} />
                      <input
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search by name, email, grade, section, phone, age band…"
                        className="input-field pl-9"
                      />
                    </div>
                    <button
                      onClick={handleSelectAll}
                      className="btn-secondary whitespace-nowrap"
                      style={
                        selectAll
                          ? { borderColor: 'var(--blush)', color: 'var(--blush)' }
                          : undefined
                      }
                    >
                      {selectAll ? 'Deselect all' : 'Select all'}
                    </button>
                  </div>

                  {/* Student list */}
                  <div
                    className="max-h-[360px] overflow-auto rounded-md"
                    style={{ border: '1px solid var(--border)' }}
                  >
                    {filteredStudents.length === 0 ? (
                      <div className="text-center py-10">
                        <div className="text-sm font-semibold mb-1" style={{ color: 'var(--slate)' }}>
                          No users match your search
                        </div>
                        <button
                          onClick={() => setSearchQuery('')}
                          className="text-xs font-semibold hover:underline"
                          style={{ color: 'var(--blush)' }}
                        >
                          Clear search
                        </button>
                      </div>
                    ) : (
                      <table className="table-pro">
                        <thead className="sticky top-0" style={{ background: 'var(--paper)' }}>
                          <tr>
                            <th className="w-10"></th>
                            <th>Name</th>
                            <th>Grade</th>
                            <th>Age</th>
                            <th>Email</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredStudents.map(s => {
                            const checked = selectedStudents.has(s.id);
                            return (
                              <tr
                                key={s.id}
                                onClick={() => toggleStudent(s.id)}
                                className="cursor-pointer"
                                style={checked ? { background: 'var(--warm)' } : undefined}
                              >
                                <td className="text-center">
                                  <div
                                    className="w-5 h-5 rounded-sm flex items-center justify-center mx-auto"
                                    style={
                                      checked
                                        ? { background: 'var(--blush)', border: '1.5px solid var(--blush)' }
                                        : { border: '1.5px solid var(--border)' }
                                    }
                                  >
                                    {checked && <span style={{ color: '#fff', fontSize: 10 }}>✓</span>}
                                  </div>
                                </td>
                                <td className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                                  {s.first_name} {s.last_name}
                                </td>
                                <td className="text-xs" style={{ color: 'var(--slate)' }}>
                                  {s.grade || '—'}{s.section ? ` · ${s.section}` : ''}
                                </td>
                                <td className="text-xs tabular-nums" style={{ color: 'var(--slate)' }}>
                                  {s.age_band || '—'}
                                </td>
                                <td className="text-xs" style={{ color: 'var(--slate-light)' }}>{s.email}</td>
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
                      <input
                        type="checkbox"
                        checked={generateTokens}
                        onChange={e => setGenerateTokens(e.target.checked)}
                        className="w-4 h-4 rounded"
                        style={{ accentColor: 'var(--ink)' }}
                      />
                      <span className="text-xs font-semibold" style={{ color: 'var(--slate)' }}>
                        Generate access tokens (for students without login)
                      </span>
                    </label>
                  </div>
                </>
              )}
            </Card>

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="btn-secondary">
                <ArrowLeft size={14} /> Back
              </button>
              {students.length > 0 && (
                <button
                  onClick={handleAssign}
                  disabled={selectedStudents.size === 0 || assigning}
                  className="btn-primary flex-1"
                >
                  {assigning
                    ? 'Assigning…'
                    : `Assign to ${selectedStudents.size} student${selectedStudents.size !== 1 ? 's' : ''}`}
                  <Check size={14} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* ═══ STEP 4: Done ═══ */}
        {step === 4 && assignResult && (
          <div className="space-y-4 animate-fade-up">
            <div className="card p-12 lg:p-16 text-center">
              <div
                className="w-16 h-16 mx-auto rounded-md flex items-center justify-center mb-5"
                style={{ background: 'var(--sage-pale)' }}
              >
                <PartyPopper size={26} style={{ color: 'var(--sage)' }} />
              </div>
              <h2 className="font-display text-[22px] mb-2" style={{ color: 'var(--ink)' }}>Tests assigned</h2>
              <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: 'var(--slate)' }}>
                <span className="font-semibold tabular-nums" style={{ color: 'var(--sage)' }}>
                  {assignResult.sessions?.length || 0}
                </span>{' '}
                student{(assignResult.sessions?.length || 0) !== 1 ? 's' : ''} can now take the{' '}
                <span className="font-semibold" style={{ color: 'var(--ink)' }}>{selectedTypeObj?.label}</span>{' '}
                assessment.
              </p>

              {/* Tokens */}
              {assignResult.tokens?.length > 0 && (
                <div
                  className="text-left rounded-md p-4 mb-5"
                  style={{ background: 'var(--warm)', border: '1px solid var(--border)' }}
                >
                  <div className="label-overline mb-2">Access Tokens</div>
                  <div className="space-y-1.5 max-h-48 overflow-auto">
                    {assignResult.tokens.map((t, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between gap-3 rounded-sm px-3 py-2"
                        style={{ background: 'var(--paper)', border: '1px solid var(--border)' }}
                      >
                        <span className="text-xs truncate" style={{ color: 'var(--slate)' }}>
                          {students.find(s => s.id === t.userId)?.first_name || t.userId.slice(0, 8)}
                        </span>
                        <code className="text-sm font-semibold font-mono" style={{ color: 'var(--ink)' }}>
                          {t.token}
                        </code>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 justify-center flex-wrap">
                <button
                  onClick={() => {
                    setStep(1);
                    setFile(null);
                    setUploadResult(null);
                    setSelectedType(null);
                    setSelectedStudents(new Set());
                    setAssignResult(null);
                  }}
                  className="btn-secondary"
                >
                  Assign Another
                </button>
                <button
                  onClick={() => navigate('/admin/sessions')}
                  className="btn-primary"
                >
                  View Sessions <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Card({ children, className = '' }) {
  return <div className={`card p-6 lg:p-8 ${className}`}>{children}</div>;
}
