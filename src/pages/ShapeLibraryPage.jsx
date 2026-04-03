/**
 * ShapeLibraryPage.jsx  — Item SVG Upload Manager
 *
 * Guided flow:
 *   1. Select Category (Cognitive / Personality / Interest)
 *   2. Select Domain (Gf, Gv, Gs, Gwm, Gq)
 *   3. Select or create Template (matrix_2x2, odd_one_out, etc.)
 *   4. Enter Item Number
 *   5. Upload 4 SVGs: stim, optA, optB, optC
 *   6. Browse existing uploads
 */

import { useState, useEffect, useRef, useCallback } from 'react';

const API = import.meta.env.VITE_API_BASE || 'http://localhost:3000/api';

const C = {
  bg:        '#F6F5F1',
  surface:   '#FFFFFF',
  border:    '#E2E0D8',
  text:      '#1C1B18',
  muted:     '#6B6860',
  accent:    '#4F46E5',
  accentHov: '#4338CA',
  green:     '#10B981',
  red:       '#EF4444',
};

/* ── Domain / category config ── */
const CATEGORIES = {
  cognitive:   { label: 'Cognitive', icon: '🧠', domains: ['gf', 'gv', 'gs', 'gwm', 'gq'] },
  personality: { label: 'Personality', icon: '🎭', domains: ['personality'] },
  interest:    { label: 'Interest', icon: '🎯', domains: ['interest'] },
};

const DOMAINS = {
  gf:  { label: 'Gf — Pattern Reasoning', icon: '🧩', color: '#6366F1' },
  gv:  { label: 'Gv — Visual Processing',  icon: '👁️', color: '#8B5CF6' },
  gs:  { label: 'Gs — Processing Speed',   icon: '⚡', color: '#F59E0B' },
  gwm: { label: 'Gwm — Working Memory',    icon: '🧠', color: '#EC4899' },
  gq:  { label: 'Gq — Quantitative',       icon: '🔢', color: '#14B8A6' },
  personality: { label: 'Personality', icon: '🎭', color: '#6B7280' },
  interest:    { label: 'Interest',    icon: '🎯', color: '#6B7280' },
};

const FILE_SLOTS = [
  { key: 'stim', label: 'Stimulus (Question)', desc: 'The question image shown on the left' },
  { key: 'optA', label: 'Option A', desc: 'First answer option' },
  { key: 'optB', label: 'Option B', desc: 'Second answer option' },
  { key: 'optC', label: 'Option C', desc: 'Third answer option' },
];

function getToken() { return localStorage.getItem('token') || ''; }
function authHdr()  { return { Authorization: `Bearer ${getToken()}` }; }

function sanitize(name) {
  return name.trim().toLowerCase()
    .replace(/[^a-z0-9_/\-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/\/+/g, '/')
    .replace(/^[_/]+|[_/]+$/g, '');
}

/* ── Toast ── */
function Toast({ msg, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3200); return () => clearTimeout(t); }, [msg]);
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      padding: '11px 16px', borderRadius: 10, fontSize: 13, fontWeight: 500,
      display: 'flex', alignItems: 'center', gap: 8, maxWidth: 360,
      boxShadow: '0 8px 24px rgba(0,0,0,.12)',
      background: type === 'ok' ? '#ECFDF5' : '#FEF2F2',
      border: `1px solid ${type === 'ok' ? '#6EE7B7' : '#FCA5A5'}`,
      color: type === 'ok' ? '#065F46' : '#991B1B',
    }}>
      <span>{type === 'ok' ? '✓' : '✕'}</span><span>{msg}</span>
    </div>
  );
}

/* ═══ MAIN PAGE ═══ */
export default function ShapeLibraryPage() {
  // Wizard state
  const [category, setCategory]     = useState(null);   // 'cognitive' | 'personality' | 'interest'
  const [domain, setDomain]         = useState(null);    // 'gf' | 'gv' | ...
  const [templates, setTemplates]   = useState([]);      // existing templates for selected domain
  const [template, setTemplate]     = useState(null);    // selected template slug
  const [newTemplate, setNewTemplate] = useState('');

  // File uploads — one per slot
  const [slotFiles, setSlotFiles]   = useState({});      // { stim: File, optA: File, ... }
  const [slotStatus, setSlotStatus] = useState({});      // { stim: 'ok'|'err'|'uploading', ... }
  const [uploading, setUploading]   = useState(false);

  // Browse existing
  const [folders, setFolders]       = useState([]);
  const [activeFolder, setActiveFolder] = useState(null);
  const [files, setFiles]           = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [browseMode, setBrowseMode] = useState(false);

  // Existing files in the current upload target folder
  const [existingFiles, setExistingFiles] = useState([]);
  const [loadingExisting, setLoadingExisting] = useState(false);

  const [toast, setToast]           = useState(null);
  const toast$ = useCallback((type, msg) => setToast({ type, msg, k: Date.now() }), []);

  /* ── Load folders ── */
  const loadFolders = useCallback(async () => {
    try {
      const r = await fetch(`${API}/items/shapes/folders`, { headers: authHdr() });
      if (!r.ok) return;
      const d = await r.json();
      setFolders(d.folders || []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { loadFolders(); }, [loadFolders]);

  /* ── Derive templates from folder list when domain changes ── */
  useEffect(() => {
    if (!domain) { setTemplates([]); return; }
    // For Gf: folders like "gf/matrix_2x2/1" → template = "matrix_2x2"
    // For others: folders like "symbol_matching" → template = "symbol_matching"
    const prefix = `${domain}/`;
    const tpls = new Set();
    folders.forEach(f => {
      if (f.name.startsWith(prefix)) {
        // gf/matrix_2x2/1 → matrix_2x2
        const rest = f.name.slice(prefix.length);
        const tpl = rest.split('/')[0];
        if (tpl) tpls.add(tpl);
      } else if (!f.name.includes('/')) {
        // Legacy flat folders — could be templates for any domain
        tpls.add(f.name);
      }
    });
    setTemplates([...tpls].sort());
  }, [domain, folders]);

  /* ── Load files in a folder ── */
  const loadFiles = useCallback(async (folderName) => {
    if (!folderName) { setFiles([]); return; }
    setLoadingFiles(true);
    try {
      const r = await fetch(`${API}/items/shapes/folder/${folderName}`, { headers: authHdr() });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      setFiles(d.files || []);
    } catch (e) {
      toast$('err', `Could not load: ${e.message}`);
      setFiles([]);
    } finally { setLoadingFiles(false); }
  }, [toast$]);

  /* ── Computed folder path ── */
  const folderPath = domain && template
    ? `${domain}/${template}`
    : null;

  /* ── Load existing files when folder path changes ── */
  useEffect(() => {
    if (!folderPath) { setExistingFiles([]); return; }
    setLoadingExisting(true);
    fetch(`${API}/items/shapes/folder/${folderPath}`, { headers: authHdr() })
      .then(r => r.ok ? r.json() : { files: [] })
      .then(d => setExistingFiles(d.files || []))
      .catch(() => setExistingFiles([]))
      .finally(() => setLoadingExisting(false));
  }, [folderPath]);

  /* ── Handle file selection for a slot ── */
  const handleSlotFile = (slotKey, fileList) => {
    const file = fileList?.[0];
    if (!file) return;
    if (!/\.(svg|png)$/i.test(file.name)) {
      toast$('err', 'Only .svg or .png files allowed');
      return;
    }
    setSlotFiles(prev => ({ ...prev, [slotKey]: file }));
    setSlotStatus(prev => ({ ...prev, [slotKey]: null }));
  };

  /* ── Upload all slots ── */
  const handleUpload = async () => {
    if (!folderPath) { toast$('err', 'Complete all steps first'); return; }
    const filledSlots = FILE_SLOTS.filter(s => slotFiles[s.key]);
    if (filledSlots.length === 0) { toast$('err', 'Select at least one file'); return; }

    setUploading(true);
    let okCount = 0;

    for (const slot of filledSlots) {
      const file = slotFiles[slot.key];

      setSlotStatus(prev => ({ ...prev, [slot.key]: 'uploading' }));
      const fd = new FormData();
      fd.append('folder', folderPath);
      fd.append('shapes', file, file.name);   // keep original filename

      try {
        const r = await fetch(`${API}/items/shapes/upload-folder`, {
          method: 'POST', headers: authHdr(), body: fd,
        });
        if (!r.ok) throw new Error(await r.text());
        setSlotStatus(prev => ({ ...prev, [slot.key]: 'ok' }));
        okCount++;
      } catch (e) {
        setSlotStatus(prev => ({ ...prev, [slot.key]: 'err' }));
        toast$('err', `${slot.label}: ${e.message}`);
      }
    }

    setUploading(false);
    if (okCount > 0) {
      toast$('ok', `${okCount} file${okCount > 1 ? 's' : ''} uploaded to ${folderPath}/`);
      loadFolders();
      // Refresh existing files list
      fetch(`${API}/items/shapes/folder/${folderPath}`, { headers: authHdr() })
        .then(r => r.ok ? r.json() : { files: [] })
        .then(d => setExistingFiles(d.files || []))
        .catch(() => {});
    }
  };

  /* ── Reset wizard ── */
  const resetWizard = () => {
    setCategory(null); setDomain(null); setTemplate(null);
    setSlotFiles({}); setSlotStatus({});
    setNewTemplate('');
  };

  /* ── Delete file from browse ── */
  const deleteFile = async (fname) => {
    if (!window.confirm(`Delete ${fname}?`)) return;
    try {
      await fetch(`${API}/items/shapes/folder/${activeFolder}/${encodeURIComponent(fname)}`, {
        method: 'DELETE', headers: authHdr(),
      });
      setFiles(prev => prev.filter(f => f !== fname));
      toast$('ok', `${fname} deleted`);
    } catch { toast$('err', 'Delete failed'); }
  };

  // ─────────────── RENDER ───────────────

  const stepStyle = (active) => ({
    padding: '14px 18px', borderRadius: 12, border: `1.5px solid ${active ? C.accent : C.border}`,
    background: active ? '#EEF2FF' : C.surface, cursor: 'pointer', transition: 'all .15s',
    display: 'flex', alignItems: 'center', gap: 10,
  });

  const chipStyle = (active) => ({
    padding: '8px 16px', borderRadius: 10, border: `1.5px solid ${active ? C.accent : C.border}`,
    background: active ? '#EEF2FF' : C.surface, cursor: 'pointer', transition: 'all .15s',
    fontSize: 13, fontWeight: active ? 600 : 400, color: active ? C.accent : C.text,
    display: 'inline-flex', alignItems: 'center', gap: 6,
  });

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* ── Header ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: C.surface, borderBottom: `1px solid ${C.border}`,
        padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, background: C.accent, color: '#fff',
          fontFamily: 'monospace', fontSize: 12, fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>SVG</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Item SVG Manager</div>
          <div style={{ fontSize: 11, color: C.muted }}>Upload question & option images</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={() => { setBrowseMode(!browseMode); if (!browseMode) loadFolders(); }}
            style={{
              padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500,
              border: `1px solid ${C.border}`, background: browseMode ? '#EEF2FF' : C.surface,
              color: browseMode ? C.accent : C.text, cursor: 'pointer',
            }}>
            {browseMode ? '← Upload Mode' : '📁 Browse Files'}
          </button>
        </div>
      </header>

      {/* ── Browse Mode ── */}
      {browseMode ? (
        <div style={{ display: 'flex', flex: 1 }}>
          {/* Sidebar */}
          <nav style={{
            width: 260, flexShrink: 0, background: C.surface,
            borderRight: `1px solid ${C.border}`, overflowY: 'auto',
            minHeight: 'calc(100vh - 56px)',
          }}>
            <div style={{ padding: '14px 14px 8px', fontSize: 10, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '.07em' }}>
              Folders ({folders.length})
            </div>
            {folders.map(f => (
              <div key={f.name}
                onClick={() => { setActiveFolder(f.name); loadFiles(f.name); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 14px', cursor: 'pointer',
                  borderLeft: `3px solid ${activeFolder === f.name ? C.accent : 'transparent'}`,
                  background: activeFolder === f.name ? '#EEF2FF' : 'transparent',
                  fontWeight: activeFolder === f.name ? 600 : 400,
                  fontSize: 12, color: activeFolder === f.name ? C.accent : C.text,
                }}>
                <span>📂</span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                <span style={{ fontSize: 10, color: C.muted, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 99, padding: '1px 6px' }}>{f.count}</span>
              </div>
            ))}
          </nav>

          {/* File grid */}
          <main style={{ flex: 1, padding: '20px 24px' }}>
            {!activeFolder ? (
              <div style={{ textAlign: 'center', color: C.muted, padding: 60 }}>
                <div style={{ fontSize: 48 }}>📁</div>
                <p style={{ fontSize: 13, marginTop: 10 }}>Select a folder from the sidebar</p>
              </div>
            ) : loadingFiles ? (
              <div style={{ textAlign: 'center', color: C.muted, padding: 60 }}>Loading...</div>
            ) : files.length === 0 ? (
              <div style={{ textAlign: 'center', color: C.muted, padding: 60 }}>
                <div style={{ fontSize: 48 }}>📭</div>
                <p style={{ fontSize: 13, marginTop: 10 }}>No files in {activeFolder}/</p>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>📂 {activeFolder}/ — {files.length} files</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 10 }}>
                  {files.map(fname => (
                    <div key={fname} style={{
                      background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10,
                      overflow: 'hidden', position: 'relative',
                    }}>
                      <img src={`/custom/${activeFolder}/${fname}`} alt={fname}
                        style={{ width: '100%', aspectRatio: '1', objectFit: 'contain', padding: 8, display: 'block' }}
                        onError={e => { e.target.style.display = 'none'; }} />
                      <div style={{ fontFamily: 'monospace', fontSize: 8, color: C.muted, padding: '3px 6px', borderTop: `1px solid ${C.border}`, background: C.bg, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {fname}
                      </div>
                      <button onClick={() => deleteFile(fname)} style={{
                        position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: '50%',
                        background: 'rgba(220,38,38,.85)', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 10,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>✕</button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </main>
        </div>
      ) : (
        /* ── Upload Wizard ── */
        <div style={{ maxWidth: 700, margin: '0 auto', padding: '32px 24px' }}>

          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24, fontSize: 12, color: C.muted, flexWrap: 'wrap' }}>
            <span style={{ cursor: 'pointer', color: C.accent, fontWeight: 600 }} onClick={resetWizard}>Upload</span>
            {category && <><span>›</span><span style={{ cursor: 'pointer', color: domain ? C.accent : C.text, fontWeight: 600 }} onClick={() => { setDomain(null); setTemplate(null); setSlotFiles({}); setSlotStatus({}); }}>{CATEGORIES[category].label}</span></>}
            {domain && <><span>›</span><span style={{ cursor: 'pointer', color: template ? C.accent : C.text, fontWeight: 600 }} onClick={() => { setTemplate(null); setSlotFiles({}); setSlotStatus({}); }}>{DOMAINS[domain].label}</span></>}
            {template && <><span>›</span><span style={{ fontWeight: 600 }}>{template}</span></>}
          </div>

          {/* ── Step 1: Category ── */}
          {!category && (
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>Select Category</h2>
              <p style={{ fontSize: 13, color: C.muted, marginBottom: 18 }}>What type of test items are you uploading?</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {Object.entries(CATEGORIES).map(([key, cat]) => (
                  <div key={key} onClick={() => setCategory(key)} style={stepStyle(false)}>
                    <span style={{ fontSize: 24 }}>{cat.icon}</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{cat.label}</div>
                      <div style={{ fontSize: 11, color: C.muted }}>{cat.domains.length} domain{cat.domains.length > 1 ? 's' : ''}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 2: Domain ── */}
          {category && !domain && (
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>Select Domain</h2>
              <p style={{ fontSize: 13, color: C.muted, marginBottom: 18 }}>Which cognitive domain?</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {CATEGORIES[category].domains.map(d => (
                  <div key={d} onClick={() => setDomain(d)} style={stepStyle(false)}>
                    <span style={{ fontSize: 22, width: 36, height: 36, borderRadius: 10, background: `${DOMAINS[d].color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{DOMAINS[d].icon}</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{DOMAINS[d].label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 3: Template ── */}
          {domain && !template && (
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>Select Template</h2>
              <p style={{ fontSize: 13, color: C.muted, marginBottom: 18 }}>Choose an existing template or create a new one</p>

              {templates.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
                  {templates.map(t => (
                    <div key={t} onClick={() => setTemplate(t)} style={chipStyle(false)}>
                      📋 {t.replace(/_/g, ' ')}
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  placeholder="new_template_name"
                  value={newTemplate}
                  onChange={e => setNewTemplate(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && newTemplate.trim()) setTemplate(sanitize(newTemplate)); }}
                  style={{
                    flex: 1, padding: '9px 12px', borderRadius: 8,
                    border: `1.5px solid ${C.border}`, fontSize: 13,
                    fontFamily: 'monospace', background: C.surface, color: C.text,
                  }}
                />
                <button
                  disabled={!newTemplate.trim()}
                  onClick={() => setTemplate(sanitize(newTemplate))}
                  style={{
                    padding: '9px 16px', borderRadius: 8, border: 'none',
                    background: C.accent, color: '#fff', fontSize: 12, fontWeight: 600,
                    cursor: newTemplate.trim() ? 'pointer' : 'not-allowed',
                    opacity: newTemplate.trim() ? 1 : 0.4,
                  }}
                >Create</button>
              </div>
            </div>
          )}

          {/* ── Step 4: Upload SVGs ── */}
          {folderPath && (
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Upload SVGs</h2>
              <p style={{ fontSize: 12, color: C.muted, marginBottom: 18 }}>
                Target folder: <strong style={{ color: C.accent }}>{folderPath}/</strong>
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                {FILE_SLOTS.map(slot => {
                  const file = slotFiles[slot.key];
                  const status = slotStatus[slot.key];
                  const borderColor = status === 'ok' ? C.green : status === 'err' ? C.red : status === 'uploading' ? C.accent : (file ? C.accent : C.border);

                  return (
                    <label key={slot.key} style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                      padding: 16, borderRadius: 12,
                      border: `2px dashed ${borderColor}`,
                      background: file ? '#EEF2FF' : C.surface,
                      cursor: 'pointer', transition: 'all .15s', textAlign: 'center',
                    }}>
                      <input type="file" accept=".svg,.png" style={{ display: 'none' }}
                        onChange={e => handleSlotFile(slot.key, e.target.files)} />

                      {/* Preview */}
                      {file ? (
                        <div style={{ width: 64, height: 64, borderRadius: 8, background: '#fff', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                          <img src={URL.createObjectURL(file)} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                        </div>
                      ) : (
                        <div style={{ width: 64, height: 64, borderRadius: 8, background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: C.muted }}>
                          {slot.key === 'stim' ? '🖼️' : '🔲'}
                        </div>
                      )}

                      <div style={{ fontSize: 13, fontWeight: 600, color: status === 'ok' ? C.green : C.text }}>
                        {status === 'ok' ? '✓ ' : status === 'err' ? '✕ ' : ''}{slot.label}
                      </div>
                      <div style={{ fontSize: 10, color: C.muted }}>{file ? file.name : slot.desc}</div>

                      {status === 'uploading' && (
                        <div style={{ width: '80%', height: 3, background: C.border, borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ width: '60%', height: '100%', background: C.accent, borderRadius: 99, animation: 'slpShimmer 1s infinite' }} />
                        </div>
                      )}
                    </label>
                  );
                })}
              </div>

              {/* Upload button */}
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <button
                  onClick={handleUpload}
                  disabled={uploading || Object.keys(slotFiles).length === 0}
                  style={{
                    padding: '12px 28px', borderRadius: 10, border: 'none',
                    background: uploading ? C.muted : C.accent, color: '#fff',
                    fontSize: 14, fontWeight: 700, cursor: uploading ? 'not-allowed' : 'pointer',
                    opacity: Object.keys(slotFiles).length === 0 ? 0.4 : 1,
                  }}
                >
                  {uploading ? 'Uploading...' : `Upload ${Object.keys(slotFiles).length} file${Object.keys(slotFiles).length !== 1 ? 's' : ''}`}
                </button>
                <button onClick={resetWizard} style={{
                  padding: '10px 18px', borderRadius: 8, border: `1px solid ${C.border}`,
                  background: C.surface, color: C.text, fontSize: 12, cursor: 'pointer',
                }}>Start Over</button>
              </div>

              {/* ── Existing files in this folder ── */}
              {loadingExisting ? (
                <div style={{ textAlign: 'center', color: C.muted, padding: 20, fontSize: 12 }}>Loading existing files...</div>
              ) : existingFiles.length > 0 && (
                <div style={{ marginTop: 28 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
                    Already uploaded — {existingFiles.length} file{existingFiles.length !== 1 ? 's' : ''} in {folderPath}/
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8 }}>
                    {existingFiles.map(fname => (
                      <div key={fname} style={{
                        background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
                        overflow: 'hidden', position: 'relative',
                      }}>
                        <img src={`/custom/${folderPath}/${fname}`} alt={fname}
                          style={{ width: '100%', aspectRatio: '1', objectFit: 'contain', padding: 6, display: 'block' }}
                          onError={e => { e.target.style.display = 'none'; }} />
                        <div style={{ fontFamily: 'monospace', fontSize: 8, color: C.muted, padding: '2px 5px', borderTop: `1px solid ${C.border}`, background: C.bg, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {fname}
                        </div>
                        <button onClick={async () => {
                          if (!window.confirm(`Delete ${fname}?`)) return;
                          try {
                            await fetch(`${API}/items/shapes/folder/${folderPath}/${encodeURIComponent(fname)}`, { method: 'DELETE', headers: authHdr() });
                            setExistingFiles(prev => prev.filter(f => f !== fname));
                            toast$('ok', `${fname} deleted`);
                          } catch { toast$('err', 'Delete failed'); }
                        }} style={{
                          position: 'absolute', top: 3, right: 3, width: 18, height: 18, borderRadius: '50%',
                          background: 'rgba(220,38,38,.8)', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 9,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {toast && <Toast key={toast.k} msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      <style>{`
        @keyframes slpShimmer { 0% { opacity: .4; } 50% { opacity: 1; } 100% { opacity: .4; } }
      `}</style>
    </div>
  );
}
