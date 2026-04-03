import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../utils/api';

// All 66 Gf B1 items (3 practice + 63 operational)
const GF_ITEMS = [
  ['Gf_B1_P01','practice'],['Gf_B1_P02','practice'],['Gf_B1_P03','practice'],
  ...Array.from({ length: 63 }, (_, i) => [`Gf_B1_${String(i + 1).padStart(3, '0')}`, 'operational']),
];
const SLOTS = ['stim', 'optA', 'optB', 'optC'];

function getStatus(id, presentSet) {
  const slots = SLOTS.map(s => presentSet.has(`${id}_${s}.png`));
  if (slots.every(Boolean)) return 'complete';
  if (slots.some(Boolean)) return 'partial';
  return 'missing';
}

const STATUS_COLOR = {
  complete: { border: '#6EE7B7', bg: '#F0FDF4', dot: '#10B981' },
  partial:  { border: '#FCD34D', bg: '#FFFEF5', dot: '#F59E0B' },
  missing:  { border: '#FCA5A5', bg: '#FFFAFA', dot: '#EF4444' },
};

export default function ImageManagerPage() {
  const [presentFiles, setPresentFiles] = useState(new Set());
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [tab, setTab] = useState('upload'); // upload | gallery | manifest
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null); // { id, slot, filename }
  const fileInputRef = useRef();

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadFiles = useCallback(async () => {
    try {
      const { data } = await api.get('/tokens/item-images');
      setPresentFiles(new Set(data.files));
    } catch {
      showToast('Failed to load images', 'error');
    }
  }, []);

  useEffect(() => { loadFiles(); }, [loadFiles]);

  const handleDrop = useCallback(async (files) => {
    if (!files.length) return;
    setUploading(true);
    setProgress(0);
    const formData = new FormData();
    Array.from(files).forEach(f => formData.append('images', f));
    try {
      await api.post('/tokens/item-images', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: e => setProgress(Math.round((e.loaded / e.total) * 100)),
      });
      await loadFiles();
      showToast(`${files.length} image(s) uploaded`);
    } catch {
      showToast('Upload failed', 'error');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, [loadFiles]);

  const handleDelete = async (filename) => {
    try {
      await api.delete(`/tokens/item-images/${filename}`);
      setPresentFiles(prev => { const s = new Set(prev); s.delete(filename); return s; });
      showToast(`${filename} removed`);
      setModal(null);
    } catch {
      showToast('Delete failed', 'error');
    }
  };

  // Stats
  const total = GF_ITEMS.length * SLOTS.length; // 264
  const uploaded = GF_ITEMS.reduce((n, [id]) => n + SLOTS.filter(s => presentFiles.has(`${id}_${s}.png`)).length, 0);
  const missing = total - uploaded;

  const filteredItems = GF_ITEMS.filter(([id, type]) => {
    if (search && !id.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterType !== 'all' && type !== filterType) return false;
    const st = getStatus(id, presentFiles);
    if (filterStatus !== 'all' && st !== filterStatus) return false;
    return true;
  });

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", minHeight: '100vh', background: '#F6F5F1', color: '#1A1A18' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E2E0D8', padding: '0 28px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, background: '#4F46E5', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13 }}>CM</div>
          <span style={{ fontWeight: 600, fontSize: 15 }}>Image Manager</span>
          <span style={{ color: '#7A7870', fontSize: 13 }}>· Gf Band 1</span>
        </div>
        <span style={{ background: '#EEF2FF', color: '#4F46E5', padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, fontFamily: 'monospace' }}>
          {uploaded} / {total} images
        </span>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px 60px' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, marginBottom: 22, background: '#E2E0D8', padding: 3, borderRadius: 10, width: 'fit-content' }}>
          {['upload', 'gallery', 'manifest'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding: '6px 18px', borderRadius: 8, border: 'none', background: tab === t ? '#fff' : 'transparent', color: tab === t ? '#1A1A18' : '#7A7870', fontWeight: 500, fontSize: 13, cursor: 'pointer', boxShadow: tab === t ? '0 1px 3px rgba(0,0,0,.08)' : 'none' }}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Upload Tab */}
        {tab === 'upload' && (
          <>
            <DropZone onFiles={handleDrop} uploading={uploading} progress={progress} inputRef={fileInputRef} />

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
              {[
                { label: 'Uploaded', val: uploaded, color: '#10B981' },
                { label: 'Missing', val: missing, color: '#EF4444' },
                { label: 'Total expected', val: total, color: '#4F46E5' },
              ].map(s => (
                <div key={s.label} style={{ background: '#fff', border: '1px solid #E2E0D8', borderRadius: 10, padding: '14px 18px' }}>
                  <div style={{ fontSize: 11, color: '#7A7870', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 26, fontWeight: 700, fontFamily: 'monospace', color: s.color }}>{s.val}</div>
                </div>
              ))}
            </div>

            <FilterBar search={search} setSearch={setSearch} filterStatus={filterStatus} setFilterStatus={setFilterStatus} filterType={filterType} setFilterType={setFilterType} />
            <ItemGrid items={filteredItems} presentFiles={presentFiles} onSlotUpload={handleDrop} onCardClick={(id, slot, fname) => setModal({ id, slot, filename: fname })} />
          </>
        )}

        {/* Gallery Tab */}
        {tab === 'gallery' && (
          <>
            <FilterBar search={search} setSearch={setSearch} filterStatus={filterStatus} setFilterStatus={setFilterStatus} filterType={filterType} setFilterType={setFilterType} />
            <ItemGrid items={filteredItems} presentFiles={presentFiles} onSlotUpload={handleDrop} onCardClick={(id, slot, fname) => setModal({ id, slot, filename: fname })} gallery />
          </>
        )}

        {/* Manifest Tab */}
        {tab === 'manifest' && (
          <ManifestTable items={GF_ITEMS} presentFiles={presentFiles} />
        )}
      </div>

      {/* Modal */}
      {modal && (
        <ImageModal
          modal={modal}
          onClose={() => setModal(null)}
          onDelete={() => handleDelete(modal.filename)}
          onReplace={handleDrop}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24,
          background: toast.type === 'error' ? '#DC2626' : '#0D9488',
          color: '#fff', padding: '10px 18px', borderRadius: 10,
          fontSize: 13, fontWeight: 500, zIndex: 2000,
          boxShadow: '0 4px 16px rgba(0,0,0,.15)',
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
