import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import {
  Upload, RefreshCw, CheckCircle2, AlertTriangle, Image, Trash2,
  ChevronDown, ChevronRight, FolderOpen, Eye, Pencil, Plus, X, Folder
} from 'lucide-react';

const DOMAIN_LABELS = {
  gf: 'Fluid Reasoning', gv: 'Visual Spatial', gq: 'Quantitative',
  gc: 'Verbal Reasoning', gs: 'Processing Speed', gwm: 'Working Memory',
};

const DOMAIN_FOLDERS = {
  gq: 'gq_visual', gwm: 'gwm_svg', gf: 'gf', gv: 'gv', gs: 'gs', gc: 'gc',
};

const FIELD_LABELS = {
  Stimulus: 'Question', 'Stimulus Row 2': 'Stimulus 2',
  'Option A': 'Option A', 'Option B': 'Option B',
  'Option C': 'Option C', 'Option D': 'Option D',
  stimulusRow1: 'Question', stim1Image: 'Question',
  optionA: 'Option A', optAImage: 'Option A',
  optionB: 'Option B', optBImage: 'Option B',
  optionC: 'Option C', optCImage: 'Option C',
  optionD: 'Option D', optDImage: 'Option D',
};

// ═══════════════════════════════════════════════════════════════════
// HOW IT WORKS — collapsible guide for admins
// ═══════════════════════════════════════════════════════════════════
function HowItWorksGuide() {
  const [open, setOpen] = useState(false);

  const Row = ({ folder, domain, desc }) => (
    <tr>
      <td className="px-3 py-2 font-mono text-xs font-bold" style={{ color: 'var(--blush)' }}>{folder}/</td>
      <td className="px-3 py-2 text-xs font-semibold">{domain}</td>
      <td className="px-3 py-2 text-xs" style={{ color: 'var(--slate)' }}>{desc}</td>
    </tr>
  );

  return (
    <div className="mb-4 rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-left"
        style={{ background: 'var(--warm)' }}>
        <span style={{ fontSize: 14 }}>💡</span>
        <span className="text-xs font-semibold flex-1" style={{ color: 'var(--ink)' }}>
          How do image folders work? Where should I upload files?
        </span>
        <span style={{ color: 'var(--slate)', fontSize: 12 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-4 py-4" style={{ background: 'var(--card)', borderTop: '1px solid var(--border)' }}>
          {/* Intro */}
          <p className="text-xs leading-relaxed mb-4" style={{ color: 'var(--slate)' }}>
            When you upload an Excel item bank, the system automatically creates folders and looks for image files in them.
            Each test domain has its own folder. If an image is missing, the item is skipped — you can upload the image here and retry.
          </p>

          {/* Folder mapping table */}
          <div className="text-xs font-bold mb-2" style={{ color: 'var(--ink)' }}>Which folder is for which domain?</div>
          <table className="w-full mb-4 rounded overflow-hidden" style={{ border: '1px solid var(--border)', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--warm)' }}>
                <th className="px-3 py-2 text-left text-[10px] font-bold" style={{ color: 'var(--slate)', letterSpacing: '0.5px' }}>FOLDER</th>
                <th className="px-3 py-2 text-left text-[10px] font-bold" style={{ color: 'var(--slate)', letterSpacing: '0.5px' }}>DOMAIN</th>
                <th className="px-3 py-2 text-left text-[10px] font-bold" style={{ color: 'var(--slate)', letterSpacing: '0.5px' }}>HOW IT WORKS</th>
              </tr>
            </thead>
            <tbody>
              <Row folder="gq_visual" domain="Quantitative (Gq)" desc="All Gq images go here — charts, pictographs, number lines, etc." />
              <Row folder="gwm_svg" domain="Working Memory (Gwm)" desc="All Gwm images go here — digit cards, picture sequences, etc." />
              <Row folder="gf/<template>" domain="Fluid Reasoning (Gf)" desc='Each Gf template gets a subfolder inside gf/. E.g. gf/matrix/, gf/odd_one_out/. The template name comes from the "Template" column in your Excel.' />
              <Row folder="<template>" domain="Gv / Gs / Gc" desc='For other domains, the folder name = the template name from your Excel. E.g. Template "Reflection" → reflection/, "Symbol Matching" → symbol_matching/.' />
            </tbody>
          </table>

          {/* Naming convention */}
          <div className="text-xs font-bold mb-2" style={{ color: 'var(--ink)' }}>How should files be named?</div>
          <div className="rounded-lg p-3 mb-4" style={{ background: 'var(--warm)', border: '1px solid var(--border)' }}>
            <div className="flex flex-col gap-2 text-xs" style={{ color: 'var(--slate)' }}>
              <div>
                <span className="font-mono font-bold" style={{ color: 'var(--ink)' }}>Auto-detected pattern:</span>{' '}
                <code style={{ background: '#fff', padding: '1px 4px', borderRadius: 3 }}>{'<item_id>_<slot>.svg'}</code>
              </div>
              <div className="flex gap-6 flex-wrap">
                <span><code style={{ background: '#fff', padding: '1px 4px', borderRadius: 3 }}>gq_b1_068_stim.svg</code> = Question image</span>
                <span><code style={{ background: '#fff', padding: '1px 4px', borderRadius: 3 }}>gq_b1_068_optA.svg</code> = Option A</span>
                <span><code style={{ background: '#fff', padding: '1px 4px', borderRadius: 3 }}>gq_b1_068_optB.svg</code> = Option B</span>
              </div>
              <div style={{ color: 'var(--blush)', fontWeight: 600 }}>
                Or use any filename and reference it directly in the Excel column as: <code style={{ background: '#fff', padding: '1px 4px', borderRadius: 3 }}>excel_img:my_custom_name.svg</code>
              </div>
            </div>
          </div>

          {/* Step by step */}
          <div className="text-xs font-bold mb-2" style={{ color: 'var(--ink)' }}>Step by step: fixing missing images</div>
          <div className="flex flex-col gap-2">
            {[
              { n: '1', text: 'Upload your Excel in Setup & Assign. Items with missing images get listed in the Missing tab here.' },
              { n: '2', text: 'Find the item in the Missing tab. Expand it to see which images are needed (Question, Option A, B, C, etc.).' },
              { n: '3', text: 'Click "Choose file" next to each slot and pick the SVG or PNG from your computer.' },
              { n: '4', text: 'Click "Upload" (or "Upload All" for the whole item). The file goes to the correct folder automatically.' },
              { n: '5', text: 'Click "Retry Import" — the system re-checks the files and imports the item into the test bank.' },
            ].map(s => (
              <div key={s.n} className="flex items-start gap-2.5">
                <div style={{
                  flexShrink: 0, width: 22, height: 22, borderRadius: '50%',
                  background: 'var(--blush)', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 800,
                }}>{s.n}</div>
                <span className="text-xs leading-relaxed pt-0.5" style={{ color: 'var(--slate)' }}>{s.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════
export default function MissingImagesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploads, setUploads] = useState({});
  const [retrying, setRetrying] = useState(null);
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState(new Set());
  const [tab, setTab] = useState('missing'); // 'missing' | 'browse' | 'folders'
  const [browseFolder, setBrowseFolder] = useState('gq_visual');
  const [folderFiles, setFolderFiles] = useState([]);
  const [loadingFolder, setLoadingFolder] = useState(false);

  // ── Load pending items ──
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get('/tokens/pending-items?status=pending');
      setItems(data.items || []);
      setExpanded(new Set((data.items || []).map(i => i.item_code)));
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Load folder contents for browse tab ──
  const loadFolder = useCallback(async (folder) => {
    setLoadingFolder(true);
    try {
      const data = await api.get(`/tokens/list-folder?folder=${encodeURIComponent(folder)}`);
      setFolderFiles(data.files || []);
    } catch (e) { console.error(e); setFolderFiles([]); }
    setLoadingFolder(false);
  }, []);

  useEffect(() => { if (tab === 'browse') loadFolder(browseFolder); }, [tab, browseFolder, loadFolder]);

  // ── Group items with their tokens ──
  const groupedItems = items.map(item => {
    const raw = item.unresolved_tokens || [];
    const tokens = (Array.isArray(raw) ? raw : (() => { try { return JSON.parse(raw); } catch { return []; } })())
      .map(t => {
        const filePath = (t.token || '').replace(/^excel_img:/, '');
        return { ...t, filePath, key: filePath };
      });
    return { ...item, tokens };
  });

  const domains = [...new Set(groupedItems.map(i => i.domain))];
  const filtered = filter === 'all' ? groupedItems : groupedItems.filter(i => i.domain === filter);
  const allTokenKeys = filtered.flatMap(i => i.tokens.map(t => t.key));
  const uploadedCount = allTokenKeys.filter(k => uploads[k]?.status === 'done').length;
  const totalTokens = allTokenKeys.length;

  const toggleExpand = (code) => {
    setExpanded(prev => { const n = new Set(prev); n.has(code) ? n.delete(code) : n.add(code); return n; });
  };

  // ── Upload handlers ──
  const handleFile = (key, file) => setUploads(s => ({ ...s, [key]: { file, status: 'ready' } }));

  const handleUpload = async (token) => {
    const st = uploads[token.key];
    if (!st?.file) return;
    setUploads(s => ({ ...s, [token.key]: { ...s[token.key], status: 'uploading' } }));
    try {
      await api.upload('/tokens/upload-item-image', st.file, { targetPath: token.filePath });
      setUploads(s => ({ ...s, [token.key]: { ...s[token.key], status: 'done' } }));
    } catch (err) {
      setUploads(s => ({ ...s, [token.key]: { ...s[token.key], status: 'error', error: err.message } }));
    }
  };

  const handleUploadAllForItem = async (tokens) => {
    for (const t of tokens.filter(t => uploads[t.key]?.file && uploads[t.key]?.status !== 'done')) await handleUpload(t);
  };

  const handleUploadAll = async () => {
    for (const t of filtered.flatMap(i => i.tokens).filter(t => uploads[t.key]?.file && uploads[t.key]?.status !== 'done')) await handleUpload(t);
  };

  const handleRetryItem = async (pendingId) => {
    setRetrying(pendingId);
    try { await api.post(`/tokens/pending-items/${pendingId}/retry`); await load(); } catch (e) { console.error(e); }
    setRetrying(null);
  };

  const handleRetryAll = async () => {
    setRetrying('all');
    try {
      for (const item of items) { try { await api.post(`/tokens/pending-items/${item.id}/retry`); } catch {} }
      await load();
    } catch (e) { console.error(e); }
    setRetrying(null);
  };

  const handleDelete = async (pendingId) => {
    try { await api.del(`/tokens/pending-items/${pendingId}`); setItems(p => p.filter(i => i.id !== pendingId)); } catch (e) { console.error(e); }
  };

  // ── Browse tab: upload to folder ──
  const [browseFile, setBrowseFile] = useState(null);
  const [editingFile, setEditingFile] = useState(null); // { name, newName }
  const [browseUploading, setBrowseUploading] = useState(false);
  const handleBrowseUpload = async () => {
    if (!browseFile) return;
    setBrowseUploading(true);
    try {
      const targetPath = `${browseFolder}/${browseFile.name}`;
      await api.upload('/tokens/upload-item-image', browseFile, { targetPath });
      setBrowseFile(null);
      loadFolder(browseFolder);
    } catch (e) { alert(e.message); }
    setBrowseUploading(false);
  };

  const handleRenameFile = async (oldName, newName) => {
    const clean = newName.trim();
    if (!clean || clean === oldName) { setEditingFile(null); return; }
    try {
      await api.put('/tokens/rename-file', { folder: browseFolder, oldName, newName: clean });
      setEditingFile(null);
      loadFolder(browseFolder);
    } catch (e) { alert(e.message); }
  };

  const handleDeleteFile = async (name) => {
    if (!confirm(`Delete "${name}" from ${browseFolder}/?`)) return;
    try {
      await api.del(`/tokens/delete-file?folder=${encodeURIComponent(browseFolder)}&name=${encodeURIComponent(name)}`);
      loadFolder(browseFolder);
    } catch (e) { alert(e.message); }
  };

  // ── Folder management state ──
  const [folders, setFolders] = useState([]);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [editingFolder, setEditingFolder] = useState(null); // { name, newName }

  const loadFolders = useCallback(async () => {
    setLoadingFolders(true);
    try {
      const data = await api.get('/tokens/folders');
      setFolders(data.folders || []);
    } catch (e) { console.error(e); }
    setLoadingFolders(false);
  }, []);

  useEffect(() => { if (tab === 'folders') loadFolders(); }, [tab, loadFolders]);

  const handleCreateFolder = async () => {
    const name = newFolderName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    if (!name) return;
    setCreatingFolder(true);
    try {
      await api.post('/tokens/folders', { name });
      setNewFolderName('');
      loadFolders();
    } catch (e) { alert(e.message); }
    setCreatingFolder(false);
  };

  const handleRenameFolder = async (oldName, newName) => {
    const clean = newName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    if (!clean || clean === oldName) { setEditingFolder(null); return; }
    try {
      await api.put(`/tokens/folders/${oldName}`, { name: clean });
      setEditingFolder(null);
      loadFolders();
    } catch (e) { alert(e.message); }
  };

  const handleDeleteFolder = async (name) => {
    if (!confirm(`Delete folder "${name}"? It must be empty.`)) return;
    try {
      await api.del(`/tokens/folders/${name}`);
      loadFolders();
    } catch (e) { alert(e.message); }
  };

  // ═══ RENDER ═══
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--ink)' }}>Missing Images</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--slate)' }}>
            Manage images for uploaded test items. Upload missing files or browse existing ones.
          </p>
        </div>
        <div className="flex gap-2">
          {tab === 'missing' && (
            <button onClick={load} className="btn-secondary !px-3 !py-2 text-xs">
              <RefreshCw size={13} /> Refresh
            </button>
          )}
          {tab === 'missing' && filtered.flatMap(i => i.tokens).some(t => uploads[t.key]?.file && uploads[t.key]?.status !== 'done') && (
            <button onClick={handleUploadAll} className="btn-primary !px-3 !py-2 text-xs">
              <Upload size={13} /> Upload All
            </button>
          )}
          {tab === 'missing' && uploadedCount > 0 && (
            <button onClick={handleRetryAll} disabled={retrying === 'all'} className="btn-primary !px-3 !py-2 text-xs">
              <RefreshCw size={13} className={retrying === 'all' ? 'animate-spin' : ''} />
              {retrying === 'all' ? 'Retrying...' : 'Retry All'}
            </button>
          )}
        </div>
      </div>

      {/* How it works — collapsible guide */}
      <HowItWorksGuide />

      {/* Tab switcher */}
      <div className="flex gap-1 mb-4 p-1 rounded-lg" style={{ background: 'var(--warm)', border: '1px solid var(--border)', display: 'inline-flex' }}>
        <button onClick={() => setTab('missing')}
          className="px-4 py-2 rounded-md text-xs font-semibold transition-colors"
          style={{
            background: tab === 'missing' ? 'var(--blush)' : 'transparent',
            color: tab === 'missing' ? '#fff' : 'var(--ink)',
          }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={13} /> Missing ({items.length})
          </span>
        </button>
        <button onClick={() => setTab('browse')}
          className="px-4 py-2 rounded-md text-xs font-semibold transition-colors"
          style={{
            background: tab === 'browse' ? 'var(--blush)' : 'transparent',
            color: tab === 'browse' ? '#fff' : 'var(--ink)',
          }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <FolderOpen size={13} /> Browse Uploaded
          </span>
        </button>
        <button onClick={() => setTab('folders')}
          className="px-4 py-2 rounded-md text-xs font-semibold transition-colors"
          style={{
            background: tab === 'folders' ? 'var(--blush)' : 'transparent',
            color: tab === 'folders' ? '#fff' : 'var(--ink)',
          }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Folder size={13} /> Manage Folders
          </span>
        </button>
      </div>

      {/* ═══ MISSING TAB ═══ */}
      {tab === 'missing' && (
        <>
          {loading ? (
            <div className="text-center py-20 text-sm" style={{ color: 'var(--slate)' }}>
              <RefreshCw size={24} className="mx-auto mb-3 animate-spin" style={{ color: 'var(--blush)', opacity: 0.5 }} />
              Loading pending items...
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-20 rounded-xl" style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)', border: '1px solid #bbf7d0' }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: '#dcfce7', margin: '0 auto 14px',
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={28} style={{ color: '#16a34a' }} />
              </div>
              <div className="text-base font-bold mb-1" style={{ color: '#15803d' }}>All images are in place</div>
              <div className="text-sm" style={{ color: '#4ade80' }}>No items are waiting for missing files. You're good to go.</div>
            </div>
          ) : (
            <>
              {/* Summary cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 16 }}>
                <div className="rounded-xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                  <div className="text-[10px] font-bold uppercase" style={{ color: 'var(--slate)', letterSpacing: '1px', marginBottom: 4 }}>Items</div>
                  <div className="text-2xl font-bold" style={{ color: 'var(--ink)' }}>{filtered.length}</div>
                </div>
                <div className="rounded-xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                  <div className="text-[10px] font-bold uppercase" style={{ color: 'var(--slate)', letterSpacing: '1px', marginBottom: 4 }}>Images needed</div>
                  <div className="text-2xl font-bold" style={{ color: 'var(--blush)' }}>{totalTokens}</div>
                </div>
                <div className="rounded-xl p-4" style={{ background: uploadedCount > 0 ? '#f0fdf4' : 'var(--card)', border: `1px solid ${uploadedCount > 0 ? '#bbf7d0' : 'var(--border)'}` }}>
                  <div className="text-[10px] font-bold uppercase" style={{ color: 'var(--slate)', letterSpacing: '1px', marginBottom: 4 }}>Uploaded</div>
                  <div className="text-2xl font-bold" style={{ color: uploadedCount > 0 ? '#16a34a' : 'var(--slate)' }}>{uploadedCount}/{totalTokens}</div>
                </div>
                <div className="rounded-xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                  <div className="text-[10px] font-bold uppercase" style={{ color: 'var(--slate)', letterSpacing: '1px', marginBottom: 4 }}>Domains</div>
                  <div className="text-2xl font-bold" style={{ color: 'var(--ink)' }}>{domains.length}</div>
                </div>
              </div>

              {/* Domain filters */}
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <div className="flex gap-1.5 flex-wrap">
                  {[{ key: 'all', label: 'All', count: items.length }, ...domains.map(d => ({ key: d, label: DOMAIN_LABELS[d] || d, count: groupedItems.filter(i => i.domain === d).length }))].map(f => (
                    <button key={f.key} onClick={() => setFilter(f.key)}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                      style={{
                        background: filter === f.key ? 'var(--blush)' : 'var(--card)',
                        color: filter === f.key ? '#fff' : 'var(--ink)',
                        border: `1.5px solid ${filter === f.key ? 'var(--blush)' : 'var(--border)'}`,
                        boxShadow: filter === f.key ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                      }}>
                      {f.label} <span style={{ opacity: 0.7, marginLeft: 3 }}>{f.count}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Item cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filtered.map(item => {
                  const isOpen = expanded.has(item.item_code);
                  const doneCount = item.tokens.filter(t => uploads[t.key]?.status === 'done').length;
                  const allDone = doneCount === item.tokens.length && item.tokens.length > 0;
                  const hasReady = item.tokens.some(t => uploads[t.key]?.file && uploads[t.key]?.status !== 'done');
                  const progress = item.tokens.length > 0 ? (doneCount / item.tokens.length) * 100 : 0;

                  return (
                    <div key={item.id} className="rounded-xl overflow-hidden transition-shadow"
                      style={{
                        border: allDone ? '1.5px solid #bbf7d0' : '1.5px solid var(--border)',
                        boxShadow: isOpen ? '0 4px 16px rgba(0,0,0,0.08)' : '0 1px 3px rgba(0,0,0,0.04)',
                      }}>
                      {/* Item header */}
                      <div className="flex items-center gap-3 px-5 py-4 cursor-pointer"
                        onClick={() => toggleExpand(item.item_code)}
                        style={{ background: allDone ? 'linear-gradient(135deg, #f0fdf4, #ecfdf5)' : 'var(--card)' }}>
                        {/* Expand icon */}
                        <div style={{
                          flexShrink: 0, width: 28, height: 28, borderRadius: 8,
                          background: isOpen ? 'var(--blush)' : 'var(--warm)',
                          color: isOpen ? '#fff' : 'var(--slate)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.15s',
                        }}>
                          {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </div>

                        {/* Status icon */}
                        <div style={{
                          flexShrink: 0, width: 42, height: 42, borderRadius: 12,
                          background: allDone ? '#dcfce7' : doneCount > 0 ? '#fffbeb' : 'var(--warm)',
                          border: `1.5px solid ${allDone ? '#bbf7d0' : doneCount > 0 ? '#fde68a' : 'var(--border)'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {allDone ? <CheckCircle2 size={20} style={{ color: '#16a34a' }} />
                            : doneCount > 0 ? <Upload size={20} style={{ color: '#f59e0b' }} />
                            : <Image size={20} style={{ color: 'var(--slate)' }} />}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-sm font-bold" style={{ color: allDone ? '#16a34a' : 'var(--ink)' }}>
                              {item.item_code}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                              style={{ background: 'var(--warm)', color: 'var(--slate)', border: '1px solid var(--border)' }}>
                              {DOMAIN_LABELS[item.domain] || item.domain}
                            </span>
                            {allDone && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                style={{ background: '#dcfce7', color: '#16a34a' }}>Ready to import</span>
                            )}
                          </div>
                          {/* Progress bar */}
                          <div className="flex items-center gap-2 mt-1.5">
                            <div style={{ flex: 1, height: 4, borderRadius: 4, background: 'var(--warm)', overflow: 'hidden', maxWidth: 180 }}>
                              <div style={{ width: `${progress}%`, height: '100%', borderRadius: 4,
                                background: allDone ? '#22c55e' : doneCount > 0 ? '#f59e0b' : 'var(--border)',
                                transition: 'width 0.3s' }} />
                            </div>
                            <span className="text-[10px] font-semibold" style={{ color: 'var(--slate)' }}>
                              {doneCount}/{item.tokens.length} images
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                          {allDone && (
                            <button onClick={() => handleRetryItem(item.id)} disabled={retrying === item.id}
                              className="text-xs font-bold px-3 py-2 rounded-lg transition-colors"
                              style={{ background: '#16a34a', color: '#fff', border: 'none', cursor: 'pointer',
                                boxShadow: '0 2px 8px rgba(22,163,74,0.3)' }}>
                              {retrying === item.id ? <RefreshCw size={13} className="animate-spin" /> : 'Retry Import'}
                            </button>
                          )}
                          {hasReady && !allDone && (
                            <button onClick={() => handleUploadAllForItem(item.tokens)}
                              className="text-xs font-bold px-3 py-2 rounded-lg"
                              style={{ background: 'var(--blush)', color: '#fff', border: 'none', cursor: 'pointer',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Upload size={12} /> Upload All</span>
                            </button>
                          )}
                          <button onClick={() => handleDelete(item.id)}
                            className="p-2 rounded-lg transition-colors"
                            style={{ color: 'var(--slate)', cursor: 'pointer', background: 'transparent' }}
                            title="Dismiss this item">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Expanded: token upload slots */}
                      {isOpen && (
                        <div style={{ borderTop: '1px solid var(--border)' }}>
                          {/* Skip reason */}
                          {item.skip_reason && (
                            <div className="px-5 py-2.5 flex items-start gap-2" style={{ background: '#fef2f2', borderBottom: '1px solid #fecaca' }}>
                              <AlertTriangle size={13} style={{ color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
                              <div className="text-[11px] leading-relaxed" style={{ color: '#b91c1c' }}>
                                {item.skip_reason.length > 300 ? item.skip_reason.slice(0, 300) + '...' : item.skip_reason}
                              </div>
                            </div>
                          )}

                          {/* Token rows */}
                          {item.tokens.map((token, ti) => {
                            const st = uploads[token.key] || {};
                            const isDone = st.status === 'done';
                            const isUploading = st.status === 'uploading';
                            const isError = st.status === 'error';
                            const fieldLabel = FIELD_LABELS[token.field] || token.field || 'Image';
                            const isLast = ti === item.tokens.length - 1;

                            return (
                              <div key={token.key}
                                className="flex items-center gap-4 px-5 py-3"
                                style={{
                                  background: isDone ? '#f0fdf4' : isError ? '#fef2f2' : 'var(--card)',
                                  borderBottom: isLast ? 'none' : '1px solid var(--border)',
                                }}>
                                {/* Field badge */}
                                <div style={{
                                  flexShrink: 0, minWidth: 80, padding: '4px 10px',
                                  borderRadius: 6, textAlign: 'center',
                                  fontSize: 10, fontWeight: 800, letterSpacing: '0.5px',
                                  textTransform: 'uppercase',
                                  background: isDone ? '#dcfce7' : isError ? '#fecaca' : 'var(--warm)',
                                  color: isDone ? '#16a34a' : isError ? '#ef4444' : 'var(--blush)',
                                  border: `1px solid ${isDone ? '#bbf7d0' : isError ? '#fca5a5' : 'var(--border)'}`,
                                }}>
                                  {fieldLabel}
                                </div>

                                {/* File info */}
                                <div className="flex-1 min-w-0">
                                  <div className="font-mono text-xs font-semibold truncate"
                                    style={{ color: isDone ? '#16a34a' : 'var(--ink)' }} title={token.filePath}>
                                    {token.filePath.split('/').pop()}
                                  </div>
                                  <div className="text-[10px] font-mono truncate mt-0.5" style={{ color: 'var(--slate)' }}>
                                    custom/{token.filePath}
                                  </div>
                                  {token.reason && !isDone && (
                                    <div className="text-[10px] mt-1 leading-relaxed px-2 py-1 rounded"
                                      style={{ background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa' }}>
                                      {token.reason}
                                    </div>
                                  )}
                                  {isError && (
                                    <div className="text-[10px] mt-1" style={{ color: '#ef4444' }}>{st.error}</div>
                                  )}
                                </div>

                                {/* Upload control */}
                                {isDone ? (
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <CheckCircle2 size={16} style={{ color: '#16a34a' }} />
                                    <span className="text-[11px] font-bold" style={{ color: '#16a34a' }}>Uploaded</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <label className="text-[11px] font-semibold px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                                      style={{
                                        background: st.file ? 'var(--card)' : 'var(--blush-pale)',
                                        color: st.file ? 'var(--ink)' : 'var(--blush)',
                                        border: `1.5px solid ${st.file ? 'var(--border)' : 'var(--blush)'}`,
                                        maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                      }}>
                                      {st.file ? st.file.name : 'Choose file'}
                                      <input type="file" accept=".svg,.png,.jpg,.jpeg,.webp" style={{ display: 'none' }}
                                        onChange={e => e.target.files[0] && handleFile(token.key, e.target.files[0])} />
                                    </label>
                                    <button onClick={() => handleUpload(token)} disabled={!st.file || isUploading}
                                      className="text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors"
                                      style={{
                                        background: st.file ? 'var(--blush)' : 'var(--warm)',
                                        color: st.file ? '#fff' : 'var(--slate)',
                                        border: 'none', cursor: st.file ? 'pointer' : 'not-allowed',
                                        opacity: st.file ? 1 : 0.5,
                                      }}>
                                      {isUploading ? <RefreshCw size={12} className="animate-spin" /> : '↑ Upload'}
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {/* ═══ BROWSE TAB ═══ */}
      {tab === 'browse' && (
        <>
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            {/* Back to folders */}
            <button onClick={() => setTab('folders')}
              className="px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: 'var(--warm)', color: 'var(--ink)', border: '1px solid var(--border)' }}>
              ← All Folders
            </button>

            {/* Folder picker */}
            <div className="flex gap-1.5 flex-wrap">
              {Object.entries(DOMAIN_FOLDERS).map(([d, folder]) => (
                <button key={folder} onClick={() => setBrowseFolder(folder)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold"
                  style={{
                    background: browseFolder === folder ? 'var(--blush)' : 'var(--warm)',
                    color: browseFolder === folder ? '#fff' : 'var(--ink)',
                    border: `1px solid ${browseFolder === folder ? 'var(--blush)' : 'var(--border)'}`,
                  }}>{DOMAIN_LABELS[d] || d} <span style={{ opacity: 0.7 }}>({folder}/)</span></button>
              ))}
            </div>
            <div style={{ flex: 1 }} />
            <button onClick={() => loadFolder(browseFolder)} className="btn-secondary !px-3 !py-2 text-xs">
              <RefreshCw size={13} /> Refresh
            </button>
          </div>

          {/* Upload to this folder */}
          <div className="flex items-center gap-3 mb-4 p-3 rounded-lg" style={{ background: 'var(--warm)', border: '1px solid var(--border)' }}>
            <Upload size={16} style={{ color: 'var(--slate)', flexShrink: 0 }} />
            <span className="text-xs font-semibold" style={{ color: 'var(--ink)' }}>Upload to <code style={{ background: '#fff', padding: '1px 6px', borderRadius: 4 }}>custom/{browseFolder}/</code></span>
            <label className="text-xs font-semibold px-3 py-1.5 rounded cursor-pointer"
              style={{ background: browseFile ? 'var(--card)' : 'var(--blush-pale)', color: browseFile ? 'var(--ink)' : 'var(--blush)', border: `1px solid ${browseFile ? 'var(--border)' : 'var(--blush)'}` }}>
              {browseFile ? browseFile.name : 'Choose file'}
              <input type="file" accept=".svg,.png,.jpg,.jpeg,.webp" style={{ display: 'none' }}
                onChange={e => e.target.files[0] && setBrowseFile(e.target.files[0])} />
            </label>
            <button onClick={handleBrowseUpload} disabled={!browseFile || browseUploading}
              className="text-xs font-bold px-3 py-1.5 rounded"
              style={{ background: browseFile ? 'var(--blush)' : 'var(--warm)', color: browseFile ? '#fff' : 'var(--slate)', border: 'none', cursor: browseFile ? 'pointer' : 'not-allowed', opacity: browseFile ? 1 : 0.5 }}>
              {browseUploading ? 'Uploading...' : '↑ Upload'}
            </button>
          </div>

          {/* File grid */}
          {loadingFolder ? (
            <div className="text-center py-16 text-sm" style={{ color: 'var(--slate)' }}>Loading...</div>
          ) : folderFiles.length === 0 ? (
            <div className="text-center py-16 rounded-lg" style={{ background: 'var(--warm)', border: '1px solid var(--border)' }}>
              <FolderOpen size={36} className="mx-auto mb-3" style={{ color: 'var(--slate)' }} />
              <div className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>No images in this folder</div>
              <div className="text-sm" style={{ color: 'var(--slate)' }}>Upload files using the bar above or via Excel import.</div>
            </div>
          ) : (
            <>
              <div className="text-xs mb-3" style={{ color: 'var(--slate)' }}>
                {folderFiles.length} file{folderFiles.length !== 1 ? 's' : ''} in <code>custom/{browseFolder}/</code>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                {folderFiles.map(f => {
                  const isEditing = editingFile?.name === f.name;
                  return (
                    <div key={f.name} className="rounded-lg overflow-hidden"
                      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                      <div style={{
                        height: 100, background: '#f8f9fb',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderBottom: '1px solid var(--border)', padding: 8,
                      }}>
                        <img src={f.url} alt={f.name}
                          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                          onError={e => { e.target.style.display = 'none'; }} />
                      </div>
                      <div className="px-2.5 py-2">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <input
                              autoFocus
                              value={editingFile.newName}
                              onChange={e => setEditingFile({ ...editingFile, newName: e.target.value })}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleRenameFile(f.name, editingFile.newName);
                                if (e.key === 'Escape') setEditingFile(null);
                              }}
                              className="font-mono text-[10px] font-semibold px-1 py-0.5 rounded flex-1 min-w-0"
                              style={{ border: '1px solid var(--blush)', outline: 'none' }}
                            />
                            <button onClick={() => handleRenameFile(f.name, editingFile.newName)}
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                              style={{ background: 'var(--blush)', color: '#fff', border: 'none', cursor: 'pointer' }}>✓</button>
                            <button onClick={() => setEditingFile(null)}
                              className="text-[9px] px-1 py-0.5 rounded"
                              style={{ color: 'var(--slate)', cursor: 'pointer' }}>✕</button>
                          </div>
                        ) : (
                          <div className="font-mono text-[10px] font-semibold truncate" style={{ color: 'var(--ink)' }} title={f.name}>
                            {f.name}
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-1">
                          <div className="text-[9px]" style={{ color: 'var(--slate)' }}>
                            {f.size > 1024 ? `${(f.size / 1024).toFixed(1)} KB` : `${f.size} B`}
                          </div>
                          {!isEditing && (
                            <div className="flex items-center gap-1">
                              <button onClick={() => setEditingFile({ name: f.name, newName: f.name })}
                                className="p-0.5 rounded" style={{ color: 'var(--slate)', cursor: 'pointer' }} title="Rename">
                                <Pencil size={11} />
                              </button>
                              <button onClick={() => handleDeleteFile(f.name)}
                                className="p-0.5 rounded" style={{ color: 'var(--slate)', cursor: 'pointer' }} title="Delete">
                                <Trash2 size={11} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
      {/* ═══ FOLDERS TAB ═══ */}
      {tab === 'folders' && (
        <>
          {/* Create new folder */}
          <div className="flex items-center gap-3 mb-4 p-3 rounded-lg" style={{ background: 'var(--warm)', border: '1px solid var(--border)' }}>
            <Plus size={16} style={{ color: 'var(--slate)', flexShrink: 0 }} />
            <input
              type="text" placeholder="New folder name (e.g. gq_visual_v2)"
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateFolder()}
              className="text-sm px-3 py-1.5 rounded-md flex-1"
              style={{ border: '1px solid var(--border)', background: 'var(--card)', outline: 'none', fontFamily: 'monospace' }}
            />
            <button onClick={handleCreateFolder} disabled={!newFolderName.trim() || creatingFolder}
              className="text-xs font-bold px-3 py-1.5 rounded"
              style={{
                background: newFolderName.trim() ? 'var(--blush)' : 'var(--warm)',
                color: newFolderName.trim() ? '#fff' : 'var(--slate)',
                border: 'none', cursor: newFolderName.trim() ? 'pointer' : 'not-allowed',
              }}>
              {creatingFolder ? '...' : 'Create'}
            </button>
          </div>

          {loadingFolders ? (
            <div className="text-center py-16 text-sm" style={{ color: 'var(--slate)' }}>Loading...</div>
          ) : folders.length === 0 ? (
            <div className="text-center py-16 rounded-lg" style={{ background: 'var(--warm)', border: '1px solid var(--border)' }}>
              <FolderOpen size={36} className="mx-auto mb-3" style={{ color: 'var(--slate)' }} />
              <div className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>No folders yet</div>
              <div className="text-sm" style={{ color: 'var(--slate)' }}>Create one above to start organising images.</div>
            </div>
          ) : (
            <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              {folders.map(f => {
                const isEditing = editingFolder?.name === f.name;
                return (
                  <div key={f.name} className="flex items-center gap-3 px-4 py-3"
                    style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
                    {/* Folder icon */}
                    <div style={{
                      flexShrink: 0, width: 36, height: 36, borderRadius: 10,
                      background: 'var(--warm)', border: '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Folder size={18} style={{ color: 'var(--blush)' }} />
                    </div>

                    {/* Name — editable or static */}
                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <input
                          autoFocus
                          value={editingFolder.newName}
                          onChange={e => setEditingFolder({ ...editingFolder, newName: e.target.value })}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleRenameFolder(f.name, editingFolder.newName);
                            if (e.key === 'Escape') setEditingFolder(null);
                          }}
                          className="text-sm font-mono font-semibold px-2 py-1 rounded flex-1"
                          style={{ border: '1px solid var(--blush)', background: '#fff', outline: 'none' }}
                        />
                        <button onClick={() => handleRenameFolder(f.name, editingFolder.newName)}
                          className="text-[10px] font-bold px-2 py-1 rounded"
                          style={{ background: 'var(--blush)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                          Save
                        </button>
                        <button onClick={() => setEditingFolder(null)}
                          className="p-1 rounded" style={{ color: 'var(--slate)', cursor: 'pointer' }}>
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-sm font-bold" style={{ color: 'var(--ink)' }}>{f.name}/</div>
                        <div className="text-[11px]" style={{ color: 'var(--slate)' }}>
                          {f.fileCount} image{f.fileCount !== 1 ? 's' : ''}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    {!isEditing && (
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button onClick={() => { setBrowseFolder(f.name); setTab('browse'); }}
                          className="text-xs font-semibold px-2.5 py-1.5 rounded"
                          style={{ background: 'var(--warm)', color: 'var(--ink)', border: '1px solid var(--border)', cursor: 'pointer' }}
                          title="View files in this folder">
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Eye size={12} /> View</span>
                        </button>
                        <button onClick={() => setEditingFolder({ name: f.name, newName: f.name })}
                          className="p-1.5 rounded" style={{ color: 'var(--slate)', cursor: 'pointer' }} title="Rename">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDeleteFolder(f.name)}
                          className="p-1.5 rounded" style={{ color: 'var(--slate)', cursor: 'pointer' }} title="Delete (must be empty)">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-3 text-xs px-1" style={{ color: 'var(--slate)' }}>
            Folders are stored in <code style={{ background: 'var(--warm)', padding: '1px 4px', borderRadius: 3 }}>cognimap-be-main/public/custom/</code>.
            Rename updates the folder on disk — existing item references in the DB will not update automatically.
          </div>
        </>
      )}
    </div>
  );
}
