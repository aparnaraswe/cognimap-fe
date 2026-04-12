/**
 * ShapeLibraryPage.jsx  — Item SVG Upload Manager
 *
 * Guided flow:
 *   1. Select Category (Cognitive / Personality / Interest)
 *   2. Select Domain (Gf, Gv, Gs, Gwm, Gq)
 *   3. Select or create Template (matrix_2x2, odd_one_out, etc.)
 *   4. Upload 4 SVGs: stim, optA, optB, optC
 *   5. Browse existing uploads
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Folder, FolderOpen, Upload, Image as ImageIcon, X, ChevronRight,
  CheckCircle2, XCircle, FileImage, Trash2, Plus, ArrowLeft, Inbox
} from 'lucide-react';

const API = import.meta.env.VITE_API_BASE || 'http://localhost:3000/api';

/* ── Domain / category config ── */
const CATEGORIES = {
  cognitive:   { label: 'Cognitive',   description: 'Pattern reasoning and visual processing', domains: ['gf', 'gv', 'gs', 'gwm', 'gq'] },
  personality: { label: 'Personality', description: 'Personality trait items', domains: ['personality'] },
  interest:    { label: 'Interest',    description: 'Interest and preference items', domains: ['interest'] },
};

const DOMAINS = {
  gf:  { label: 'Gf — Pattern Reasoning' },
  gv:  { label: 'Gv — Visual Processing' },
  gs:  { label: 'Gs — Processing Speed' },
  gwm: { label: 'Gwm — Working Memory' },
  gq:  { label: 'Gq — Quantitative' },
  personality: { label: 'Personality' },
  interest:    { label: 'Interest' },
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
  const ok = type === 'ok';
  return (
    <div className={`fixed bottom-6 right-6 z-[9999] flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold shadow-xl border ${
      ok ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'
    }`}>
      {ok ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
      <span>{msg}</span>
    </div>
  );
}

/* ═══ MAIN PAGE ═══ */
export default function ShapeLibraryPage() {
  // Wizard state
  const [category, setCategory]     = useState(null);
  const [domain, setDomain]         = useState(null);
  const [templates, setTemplates]   = useState([]);
  const [template, setTemplate]     = useState(null);
  const [newTemplate, setNewTemplate] = useState('');

  // File uploads — one per slot
  const [slotFiles, setSlotFiles]   = useState({});
  const [slotStatus, setSlotStatus] = useState({});
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
    const prefix = `${domain}/`;
    const tpls = new Set();
    folders.forEach(f => {
      if (f.name.startsWith(prefix)) {
        const rest = f.name.slice(prefix.length);
        const tpl = rest.split('/')[0];
        if (tpl) tpls.add(tpl);
      } else if (!f.name.includes('/')) {
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
      fd.append('shapes', file, file.name);

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

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-black text-stone-900">Shape Library</h1>
            <p className="text-sm text-stone-500 mt-1">Upload and manage question & option images for test items</p>
          </div>
          <button
            onClick={() => { setBrowseMode(!browseMode); if (!browseMode) loadFolders(); }}
            className="flex items-center gap-2 bg-white border border-stone-200 hover:border-stone-300 text-stone-700 font-bold rounded-xl px-4 py-2.5 text-sm transition-colors"
          >
            {browseMode ? <><ArrowLeft size={14} /> Upload Mode</> : <><FolderOpen size={14} /> Browse Files</>}
          </button>
        </div>

        {browseMode ? (
          /* ── Browse Mode ── */
          <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
            {/* Sidebar */}
            <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-stone-100">
                <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                  Folders ({folders.length})
                </div>
              </div>
              <div className="max-h-[70vh] overflow-y-auto">
                {folders.map(f => (
                  <button
                    key={f.name}
                    onClick={() => { setActiveFolder(f.name); loadFiles(f.name); }}
                    className={`w-full flex items-center gap-2 px-4 py-2.5 text-left text-xs transition-colors border-l-2 ${
                      activeFolder === f.name
                        ? 'border-amber-400 bg-amber-50 text-stone-900 font-bold'
                        : 'border-transparent hover:bg-stone-50 text-stone-700'
                    }`}
                  >
                    <Folder size={14} className="text-stone-400 flex-shrink-0" />
                    <span className="flex-1 truncate">{f.name}</span>
                    <span className="text-[10px] text-stone-500 bg-stone-100 border border-stone-200 rounded-full px-1.5">{f.count}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* File grid */}
            <div className="bg-white border border-stone-200 rounded-2xl p-5 lg:p-6 min-h-[50vh]">
              {!activeFolder ? (
                <div className="text-center py-16">
                  <div className="w-12 h-12 rounded-full bg-stone-50 border border-stone-100 flex items-center justify-center mx-auto mb-3">
                    <Folder size={20} className="text-stone-400" />
                  </div>
                  <p className="text-sm text-stone-500">Select a folder from the sidebar</p>
                </div>
              ) : loadingFiles ? (
                <div className="text-center py-16">
                  <div className="w-8 h-8 border-2 border-stone-300 border-t-stone-900 rounded-full animate-spin mx-auto mb-3" />
                  <div className="text-sm text-stone-500">Loading…</div>
                </div>
              ) : files.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-12 h-12 rounded-full bg-stone-50 border border-stone-100 flex items-center justify-center mx-auto mb-3">
                    <Inbox size={20} className="text-stone-400" />
                  </div>
                  <p className="text-sm text-stone-500">No files in {activeFolder}/</p>
                </div>
              ) : (
                <>
                  <div className="text-sm font-bold text-stone-900 mb-4">
                    {activeFolder}/ <span className="text-stone-500 font-normal">· {files.length} file{files.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {files.map(fname => (
                      <div key={fname} className="bg-white border border-stone-200 rounded-xl overflow-hidden relative group">
                        <img
                          src={`/custom/${activeFolder}/${fname}`}
                          alt={fname}
                          className="w-full aspect-square object-contain p-2 block"
                          onError={e => { e.target.style.display = 'none'; }}
                        />
                        <div className="font-mono text-[9px] text-stone-500 px-2 py-1 border-t border-stone-100 bg-stone-50/60 truncate">
                          {fname}
                        </div>
                        <button
                          onClick={() => deleteFile(fname)}
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-rose-500/90 hover:bg-rose-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          /* ── Upload Wizard ── */
          <div className="max-w-3xl mx-auto">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 mb-5 text-xs text-stone-500 flex-wrap">
              <button className="text-amber-700 font-bold hover:underline" onClick={resetWizard}>Upload</button>
              {category && <>
                <ChevronRight size={12} />
                <button className={`font-bold hover:underline ${domain ? 'text-amber-700' : 'text-stone-900'}`}
                  onClick={() => { setDomain(null); setTemplate(null); setSlotFiles({}); setSlotStatus({}); }}>
                  {CATEGORIES[category].label}
                </button>
              </>}
              {domain && <>
                <ChevronRight size={12} />
                <button className={`font-bold hover:underline ${template ? 'text-amber-700' : 'text-stone-900'}`}
                  onClick={() => { setTemplate(null); setSlotFiles({}); setSlotStatus({}); }}>
                  {DOMAINS[domain].label}
                </button>
              </>}
              {template && <>
                <ChevronRight size={12} />
                <span className="font-bold text-stone-900">{template}</span>
              </>}
            </div>

            {/* ── Step 1: Category ── */}
            {!category && (
              <div className="bg-white border border-stone-200 rounded-2xl p-5 lg:p-6">
                <h2 className="text-base font-bold text-stone-900">Select Category</h2>
                <p className="text-sm text-stone-500 mt-1 mb-5">What type of test items are you uploading?</p>
                <div className="flex flex-col gap-2">
                  {Object.entries(CATEGORIES).map(([key, cat]) => (
                    <button
                      key={key}
                      onClick={() => setCategory(key)}
                      className="flex items-center gap-3 p-4 rounded-xl border border-stone-200 hover:border-stone-900 hover:bg-stone-50 transition-colors text-left"
                    >
                      <div className="flex-1">
                        <div className="text-sm font-bold text-stone-900">{cat.label}</div>
                        <div className="text-xs text-stone-500 mt-0.5">{cat.description}</div>
                      </div>
                      <ChevronRight size={16} className="text-stone-400" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Step 2: Domain ── */}
            {category && !domain && (
              <div className="bg-white border border-stone-200 rounded-2xl p-5 lg:p-6">
                <h2 className="text-base font-bold text-stone-900">Select Domain</h2>
                <p className="text-sm text-stone-500 mt-1 mb-5">Which domain do these items belong to?</p>
                <div className="flex flex-col gap-2">
                  {CATEGORIES[category].domains.map(d => (
                    <button
                      key={d}
                      onClick={() => setDomain(d)}
                      className="flex items-center gap-3 p-4 rounded-xl border border-stone-200 hover:border-stone-900 hover:bg-stone-50 transition-colors text-left"
                    >
                      <div className="flex-1 text-sm font-bold text-stone-900">{DOMAINS[d].label}</div>
                      <ChevronRight size={16} className="text-stone-400" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Step 3: Template ── */}
            {domain && !template && (
              <div className="bg-white border border-stone-200 rounded-2xl p-5 lg:p-6">
                <h2 className="text-base font-bold text-stone-900">Select Template</h2>
                <p className="text-sm text-stone-500 mt-1 mb-5">Choose an existing template or create a new one</p>

                {templates.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-5">
                    {templates.map(t => (
                      <button
                        key={t}
                        onClick={() => setTemplate(t)}
                        className="px-3 py-2 rounded-lg border border-stone-200 bg-white text-stone-700 hover:border-stone-900 hover:bg-stone-50 text-xs font-bold transition-colors"
                      >
                        {t.replace(/_/g, ' ')}
                      </button>
                    ))}
                  </div>
                )}

                <div className="border-t border-stone-100 pt-4">
                  <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">New template</label>
                  <div className="flex gap-2">
                    <input
                      placeholder="new_template_name"
                      value={newTemplate}
                      onChange={e => setNewTemplate(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && newTemplate.trim()) setTemplate(sanitize(newTemplate)); }}
                      className="flex-1 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm font-mono text-stone-800 outline-none focus:border-amber-400 focus:bg-white"
                    />
                    <button
                      disabled={!newTemplate.trim()}
                      onClick={() => setTemplate(sanitize(newTemplate))}
                      className="flex items-center gap-1 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-lg px-4 py-2 text-sm transition-colors disabled:opacity-40"
                    >
                      <Plus size={14} /> Create
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 4: Upload SVGs ── */}
            {folderPath && (
              <div className="bg-white border border-stone-200 rounded-2xl p-5 lg:p-6">
                <h2 className="text-base font-bold text-stone-900">Upload Files</h2>
                <p className="text-xs text-stone-500 mt-1 mb-5">
                  Target folder: <code className="px-1.5 py-0.5 bg-stone-100 text-amber-700 rounded font-mono">{folderPath}/</code>
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                  {FILE_SLOTS.map(slot => {
                    const file = slotFiles[slot.key];
                    const status = slotStatus[slot.key];
                    const border =
                      status === 'ok' ? 'border-emerald-400 bg-emerald-50' :
                      status === 'err' ? 'border-rose-400 bg-rose-50' :
                      status === 'uploading' ? 'border-amber-400 bg-amber-50' :
                      file ? 'border-amber-400 bg-amber-50' : 'border-stone-200 bg-stone-50/60 hover:border-stone-300';

                    return (
                      <label key={slot.key} className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed cursor-pointer transition-colors text-center ${border}`}>
                        <input type="file" accept=".svg,.png" className="hidden"
                          onChange={e => handleSlotFile(slot.key, e.target.files)} />

                        {/* Preview */}
                        {file ? (
                          <div className="w-16 h-16 rounded-lg bg-white border border-stone-200 flex items-center justify-center overflow-hidden">
                            <img src={URL.createObjectURL(file)} alt="" className="max-w-full max-h-full object-contain" />
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-lg bg-white border border-stone-200 flex items-center justify-center">
                            <FileImage size={22} className="text-stone-400" />
                          </div>
                        )}

                        <div className={`text-xs font-bold flex items-center gap-1 ${
                          status === 'ok' ? 'text-emerald-700' : status === 'err' ? 'text-rose-600' : 'text-stone-900'
                        }`}>
                          {status === 'ok' && <CheckCircle2 size={12} />}
                          {status === 'err' && <XCircle size={12} />}
                          {slot.label}
                        </div>
                        <div className="text-[10px] text-stone-500 line-clamp-1">{file ? file.name : slot.desc}</div>

                        {status === 'uploading' && (
                          <div className="w-3/4 h-1 bg-stone-200 rounded-full overflow-hidden">
                            <div className="w-3/5 h-full bg-amber-400 animate-pulse" />
                          </div>
                        )}
                      </label>
                    );
                  })}
                </div>

                {/* Upload button */}
                <div className="flex flex-wrap gap-2 items-center">
                  <button
                    onClick={handleUpload}
                    disabled={uploading || Object.keys(slotFiles).length === 0}
                    className="flex items-center gap-2 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl px-5 py-2.5 text-sm transition-colors disabled:opacity-40"
                  >
                    <Upload size={14} />
                    {uploading ? 'Uploading…' : `Upload ${Object.keys(slotFiles).length} file${Object.keys(slotFiles).length !== 1 ? 's' : ''}`}
                  </button>
                  <button
                    onClick={resetWizard}
                    className="bg-white border border-stone-200 hover:border-stone-300 text-stone-700 font-bold rounded-xl px-4 py-2.5 text-sm transition-colors"
                  >
                    Start Over
                  </button>
                </div>

                {/* ── Existing files in this folder ── */}
                {loadingExisting ? (
                  <div className="text-center text-xs text-stone-500 mt-6">Loading existing files…</div>
                ) : existingFiles.length > 0 && (
                  <div className="mt-7 pt-5 border-t border-stone-100">
                    <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-3">
                      Already uploaded — {existingFiles.length} file{existingFiles.length !== 1 ? 's' : ''} in {folderPath}/
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                      {existingFiles.map(fname => (
                        <div key={fname} className="bg-white border border-stone-200 rounded-lg overflow-hidden relative group">
                          <img
                            src={`/custom/${folderPath}/${fname}`}
                            alt={fname}
                            className="w-full aspect-square object-contain p-1.5 block"
                            onError={e => { e.target.style.display = 'none'; }}
                          />
                          <div className="font-mono text-[9px] text-stone-500 px-1.5 py-1 border-t border-stone-100 bg-stone-50/60 truncate">
                            {fname}
                          </div>
                          <button
                            onClick={async () => {
                              if (!window.confirm(`Delete ${fname}?`)) return;
                              try {
                                await fetch(`${API}/items/shapes/folder/${folderPath}/${encodeURIComponent(fname)}`, { method: 'DELETE', headers: authHdr() });
                                setExistingFiles(prev => prev.filter(f => f !== fname));
                                toast$('ok', `${fname} deleted`);
                              } catch { toast$('err', 'Delete failed'); }
                            }}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-500/90 hover:bg-rose-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={10} />
                          </button>
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
      </div>
    </div>
  );
}
