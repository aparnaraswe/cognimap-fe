import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:3000/api';
const authHdr = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

// ─── Naming convention helper ──────────────────────────────────────────────────
const NAME_RE = /^[a-z][a-z0-9_]*$/;
function validateTokenName(name) {
  if (!name) return 'Name is required';
  if (!NAME_RE.test(name)) return 'Must start with a letter; only lowercase letters, digits and underscores';
  if (name.length > 64) return 'Max 64 characters';
  return null;
}

// ─── Smart routing: decide which tab is best for a given unresolved token ─────
// Tokens matching complex shape keywords → PNG sprite (can't easily draw as SVG)
// Everything else → SVG shape (simpler geometry that can be expressed as SVG)
const COMPLEX_KEYWORDS = [
  'hourglass','wavy','nested','inner_square','star_ring','diamond_dot',
  'striped','shaded','crescent_hollow','arrow_shaded','mandala','fractal',
  'spiral','texture','photo','realistic','hand_drawn',
];
function guessShapeTab(token) {
  const lc = (token || '').toLowerCase();
  if (COMPLEX_KEYWORDS.some(k => lc.includes(k))) return 'sprites';
  return 'shapes';
}

// Strip colour prefixes (red_, blue_, …) and size suffixes (_md, _lg, …)
// to suggest a cleaner base name to the admin
const COLOR_PREFIXES = ['red_','blue_','green_','yellow_','purple_','orange_','cyan_','magenta_','black_','white_','dark_','light_'];
const SIZE_SUFFIXES  = ['_xs','_sm','_md','_lg','_xl','_tiny','_small','_medium','_large'];
function suggestBaseName(token) {
  let name = (token || '').toLowerCase().trim();
  for (const p of COLOR_PREFIXES) if (name.startsWith(p)) { name = name.slice(p.length); break; }
  for (const s of SIZE_SUFFIXES)  if (name.endsWith(s))   { name = name.slice(0, -s.length); break; }
  // Also strip leading digit counts like "3_" → "triangle"
  name = name.replace(/^\d+_/, '');
  return name || token;
}

// ─── Pending Items Tab ────────────────────────────────────────────────────────
function PendingItemsTab({ onFixToken }) {
  const [items, setItems]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState('pending');
  const [domainFilter, setDomainFilter] = useState('');
  const [expanded, setExpanded]     = useState({});
  const [retryStatus, setRetryStatus] = useState({});
  // fixState: { [itemId_tokenIdx]: { file, preview, status } }
  const [fixState, setFixState]     = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status: filter });
      if (domainFilter) params.set('domain', domainFilter);
      const res  = await fetch(`${apiBase}/tokens/pending-items?${params}`, { headers: authHdr() });
      const data = await res.json();
      setItems(data.items || []);
    } catch (e) { console.error('Failed to load pending items', e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filter, domainFilter]);

  const handleRetry = async (id) => {
    setRetryStatus(s => ({ ...s, [id]: 'retrying' }));
    try {
      const res  = await fetch(`${apiBase}/tokens/pending-items/${id}/retry`, { method: 'POST', headers: authHdr() });
      const data = await res.json();
      if (data.success) {
        setRetryStatus(s => ({ ...s, [id]: 'success' }));
        setTimeout(() => load(), 800);
      } else {
        setRetryStatus(s => ({ ...s, [id]: `fail: ${data.error || data.message}` }));
      }
    } catch (e) { setRetryStatus(s => ({ ...s, [id]: `fail: ${e.message}` })); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this pending item?')) return;
    try {
      await fetch(`${apiBase}/tokens/pending-items/${id}`, { method: 'DELETE', headers: authHdr() });
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (e) { alert('Delete failed: ' + e.message); }
  };

  const toggleExpand = (id) => setExpanded(s => ({ ...s, [id]: !s[id] }));

  // Handle file pick for inline fix
  const handleFixFileChange = (key, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setFixState(s => ({ ...s, [key]: { file, preview: ev.target.result, status: '' } }));
    reader.readAsDataURL(file);
  };

  // Upload the fix
  const handleFixUpload = async (itemId, field, oldToken, key) => {
    const state = fixState[key];
    if (!state?.file) return;
    setFixState(s => ({ ...s, [key]: { ...s[key], status: 'uploading' } }));
    try {
      const fd = new FormData();
      fd.append('field', field);
      fd.append('oldToken', oldToken);
      fd.append('sprite', state.file);
      const res  = await fetch(`${apiBase}/tokens/pending-items/${itemId}/fix-token`, {
        method: 'POST', headers: authHdr(), body: fd
      });
      const data = await res.json();
      if (data.success) {
        setFixState(s => ({ ...s, [key]: { ...s[key], status: data.autoUploaded ? '✓ Fixed & uploaded!' : `✓ Fixed → "${data.newTokenName}"` } }));
        setTimeout(() => load(), 900);
      } else {
        setFixState(s => ({ ...s, [key]: { ...s[key], status: `✗ ${data.error}` } }));
      }
    } catch (e) {
      setFixState(s => ({ ...s, [key]: { ...s[key], status: `✗ ${e.message}` } }));
    }
  };

  const statusBadge = (status) => ({
    pending:  'bg-amber-100 text-amber-800',
    resolved: 'bg-blue-100 text-blue-800',
    uploaded: 'bg-green-100 text-green-800',
  }[status] || 'bg-gray-100 text-gray-700');

  const domains = [...new Set(items.map(i => i.domain).filter(Boolean))];

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {['pending','resolved','uploaded','all'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${filter === s ? 'bg-white shadow text-amber-700' : 'text-gray-600 hover:text-gray-900'}`}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <select value={domainFilter} onChange={e => setDomainFilter(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm">
          <option value="">All domains</option>
          {domains.map(d => <option key={d} value={d}>{d.toUpperCase()}</option>)}
        </select>
        <button onClick={load} className="ml-auto text-sm text-amber-700 hover:text-amber-900 font-medium">↻ Refresh</button>
      </div>

      {!loading && items.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          <span className="font-semibold">{items.length} item{items.length !== 1 ? 's' : ''}</span>
          {' '}found — upload a PNG next to each missing token to fix it automatically.
        </div>
      )}

      {loading && <div className="text-center py-12 text-gray-400">Loading…</div>}

      {!loading && items.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">✓</div>
          <div className="font-medium">No {filter === 'all' ? '' : filter + ' '}items</div>
          <div className="text-sm mt-1">Upload items from Setup &amp; Assign to see skipped entries here.</div>
        </div>
      )}

      {items.map(item => {
        const tokens = Array.isArray(item.unresolved_tokens) ? item.unresolved_tokens : [];
        const rs = retryStatus[item.id];
        return (
          <div key={item.id} className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            {/* Card header */}
            <div className="flex items-center gap-3 px-4 py-3">
              <button onClick={() => toggleExpand(item.id)} className="text-gray-400 hover:text-gray-700 text-lg leading-none">
                {expanded[item.id] ? '▾' : '▸'}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-semibold text-gray-800">{item.item_code}</span>
                  {item.domain && <span className="text-xs bg-purple-100 text-purple-700 rounded-full px-2 py-0.5 font-medium">{item.domain.toUpperCase()}</span>}
                  <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${statusBadge(item.status)}`}>{item.status}</span>
                  {tokens.length > 0 && (
                    <span className="text-xs text-red-600 font-medium">
                      {tokens.length} unresolved token{tokens.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                {item.skip_reason && <div className="text-xs text-gray-500 mt-0.5 truncate">{item.skip_reason}</div>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {item.status !== 'uploaded' && (
                  <button onClick={() => handleRetry(item.id)} disabled={rs === 'retrying'}
                    className="text-xs bg-amber-500 hover:bg-amber-600 text-white rounded-lg px-3 py-1.5 font-semibold disabled:opacity-50">
                    {rs === 'retrying' ? '…' : rs === 'success' ? '✓' : rs?.startsWith('fail') ? '✗ Retry' : '↑ Retry'}
                  </button>
                )}
                <button onClick={() => handleDelete(item.id)} className="text-xs text-gray-400 hover:text-red-500 px-2 py-1 rounded" title="Remove">✕</button>
              </div>
            </div>

            {rs?.startsWith('fail') && (
              <div className="mx-4 mb-2 px-3 py-2 bg-red-50 text-red-700 text-xs rounded-lg">{rs.replace('fail: ', '')}</div>
            )}

            {/* Expanded details */}
            {expanded[item.id] && (
              <div className="border-t bg-gray-50 px-4 py-3 space-y-3">
                {/* Unresolved tokens — inline PNG upload */}
                {tokens.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                      Missing Tokens — upload a PNG to fix each one
                    </div>
                    <div className="space-y-3">
                      {tokens.map((t, idx) => {
                        const key = `${item.id}_${idx}`;
                        const fs  = fixState[key] || {};
                        // Auto-derive what the token name will become
                        const derivedName = t.token.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 64);
                        return (
                          <div key={idx} className="bg-white border border-red-100 rounded-xl p-3 space-y-2">
                            {/* Token info row */}
                            <div className="flex items-start gap-2 flex-wrap">
                              <span className="text-red-500 font-bold shrink-0 mt-0.5">✗</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono text-sm font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded">{t.token}</span>
                                  <span className="text-xs text-gray-400">in <span className="font-medium text-gray-600">{t.field}</span></span>
                                </div>
                                <div className="text-xs text-gray-400 mt-0.5">
                                  Will be saved as token: <code className="bg-gray-100 px-1 rounded font-mono">{derivedName}</code>
                                </div>
                              </div>
                            </div>

                            {/* Inline upload row */}
                            <div className="flex items-center gap-2 flex-wrap">
                              {fs.preview && (
                                <img src={fs.preview} alt="preview" className="w-10 h-10 object-contain rounded border bg-gray-50 shrink-0" />
                              )}
                              <label className="flex-1 min-w-0 cursor-pointer">
                                <div className="flex items-center gap-2 px-3 py-2 border-2 border-dashed border-gray-200 hover:border-amber-400 rounded-lg transition-colors">
                                  <span className="text-lg">🖼️</span>
                                  <span className="text-xs text-gray-500 truncate">
                                    {fs.file ? fs.file.name : 'Click to upload PNG for this shape'}
                                  </span>
                                </div>
                                <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                                  onChange={e => handleFixFileChange(key, e.target.files[0])} />
                              </label>
                              <button
                                onClick={() => handleFixUpload(item.id, t.field, t.token, key)}
                                disabled={!fs.file || fs.status === 'uploading'}
                                className="shrink-0 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white text-xs font-bold rounded-lg transition-colors"
                              >
                                {fs.status === 'uploading' ? '⏳' : '⚡ Fix & Upload'}
                              </button>
                            </div>

                            {/* Status */}
                            {fs.status && fs.status !== 'uploading' && (
                              <div className={`text-xs px-2 py-1 rounded ${fs.status.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                {fs.status}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Raw data */}
                {item.raw_data && (
                  <div>
                    <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Item Data</div>
                    <div className="bg-white border rounded-lg p-3 space-y-1">
                      {Object.entries(item.raw_data).filter(([, v]) => v != null && String(v).trim() !== '').map(([k, v]) => (
                        <div key={k} className="flex gap-2 text-xs">
                          <span className="text-gray-400 w-28 shrink-0">{k}</span>
                          <span className="font-mono text-gray-700 break-all">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {item.source_file && (
                  <div className="text-xs text-gray-400">
                    Source: <span className="font-mono">{item.source_file}</span>
                    {item.created_at && <span className="ml-3">Added: {new Date(item.created_at).toLocaleDateString()}</span>}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── SVG Shapes Tab ────────────────────────────────────────────────────────────
function SvgShapesTab({ prefill, onPrefillConsumed }) {
  const [shapeName, setShapeName]   = useState('');
  const [shapeColor, setShapeColor] = useState('#8B5CF6');
  const [svgCode, setSvgCode]       = useState('');
  const [status, setStatus]         = useState('');
  const [shapes, setShapes]         = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [nameError, setNameError]   = useState('');
  const nameInputRef                = useRef(null);

  const load = async () => {
    setLoadingList(true);
    try {
      const res  = await fetch(`${apiBase}/tokens/svg-shapes`, { headers: authHdr() });
      const data = await res.json();
      if (data.shapes) setShapes(data.shapes);
    } catch (e) { console.error(e); }
    finally { setLoadingList(false); }
  };
  useEffect(() => { load(); }, []);

  // When a token is routed here from PendingItemsTab, pre-fill the name
  useEffect(() => {
    if (prefill) {
      setShapeName(prefill);
      setNameError(validateTokenName(prefill) || '');
      setSvgCode('');
      setStatus('');
      setTimeout(() => nameInputRef.current?.focus(), 100);
      onPrefillConsumed?.();
    }
  }, [prefill]);

  const handleNameChange = (val) => {
    const clean = val.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setShapeName(clean);
    setNameError(validateTokenName(clean) || '');
  };

  const handleSave = async () => {
    const err = validateTokenName(shapeName);
    if (err) { setNameError(err); return; }
    if (!svgCode.trim()) { setStatus('✗ SVG code is required'); return; }
    setStatus('Saving…');
    try {
      const res  = await fetch(`${apiBase}/tokens/svg-shape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHdr() },
        body: JSON.stringify({ shapeName, svgCode, defaultColor: shapeColor, category: 'custom' })
      });
      const data = await res.json();
      if (data.success) {
        setStatus(`✓ Shape "${shapeName}" saved! Token: ${data.usage}`);
        setShapeName(''); setSvgCode(''); setShapeColor('#8B5CF6');
        load();
      } else { setStatus(`✗ ${data.error}`); }
    } catch (e) { setStatus(`✗ ${e.message}`); }
  };

  const handleDelete = async (name) => {
    if (!confirm(`Delete shape "${name}"?`)) return;
    try {
      const res  = await fetch(`${apiBase}/tokens/svg-shape/${name}`, { method: 'DELETE', headers: authHdr() });
      const data = await res.json();
      if (data.success) load();
      else alert('Delete failed: ' + data.error);
    } catch (e) { alert('Delete failed: ' + e.message); }
  };

  const previewSVG = svgCode
    ? svgCode.replace(/\{fill\}/g, shapeColor).replace(/\{stroke\}/g, '#1e293b').replace(/\{sw\}/g, '3')
    : null;

  return (
    <div className="space-y-6">
      {/* Routing banner — shown when redirected from a pending token */}
      {prefill && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 text-sm text-amber-800">
          <span className="text-lg">📐</span>
          <div>
            <span className="font-semibold">Adding missing shape from pending item</span>
            <span className="ml-2">Token: <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono">{prefill}</code></span>
            <span className="ml-2 text-amber-600">Draw it as SVG below, then save.</span>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-2xl shadow">
        <h2 className="text-xl font-bold mb-1">Add New SVG Shape</h2>
        <p className="text-sm text-gray-500 mb-5">Describe the shape as SVG code — available immediately in tests, no deploy needed.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Shape Name <span className="text-red-500">*</span></label>
              <input ref={nameInputRef} type="text" value={shapeName} onChange={e => handleNameChange(e.target.value)}
                placeholder="e.g., zigzag, flower_ring"
                className={`w-full border rounded-lg px-3 py-2 text-sm ${nameError ? 'border-red-400' : prefill ? 'border-amber-400 bg-amber-50' : ''}`} />
              {nameError
                ? <p className="text-xs text-red-500 mt-1">{nameError}</p>
                : <p className="text-xs text-gray-400 mt-1">Lowercase, underscores only. Pattern: <code className="bg-gray-100 px-1 rounded">color_baseshape_modifier_size</code></p>
              }
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Default Color</label>
              {/* Preset palette */}
              <div className="flex flex-wrap gap-2 mb-2">
                {[
                  { label: 'Purple',   hex: '#8B5CF6' },
                  { label: 'Blue',     hex: '#0891B2' },
                  { label: 'Red',      hex: '#DC2626' },
                  { label: 'Green',    hex: '#059669' },
                  { label: 'Orange',   hex: '#EA580C' },
                  { label: 'Yellow',   hex: '#F59E0B' },
                  { label: 'Pink',     hex: '#D946EF' },
                  { label: 'Indigo',   hex: '#6366F1' },
                  { label: 'Teal',     hex: '#0D9488' },
                  { label: 'Dark',     hex: '#1C1917' },
                ].map(({ label, hex }) => (
                  <button
                    key={hex}
                    type="button"
                    title={label}
                    onClick={() => setShapeColor(hex)}
                    className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
                    style={{
                      backgroundColor: hex,
                      borderColor: shapeColor === hex ? '#1C1917' : 'transparent',
                      boxShadow: shapeColor === hex ? '0 0 0 2px white, 0 0 0 4px #1C1917' : 'none',
                    }}
                  />
                ))}
              </div>
              {/* Custom picker + editable hex input */}
              <div className="flex items-center gap-2">
                <input type="color" value={shapeColor} onChange={e => setShapeColor(e.target.value)} className="w-10 h-10 border rounded-lg cursor-pointer p-0.5 shrink-0" />
                <input
                  type="text"
                  value={shapeColor}
                  onChange={e => {
                    const v = e.target.value;
                    setShapeColor(v);
                  }}
                  onBlur={e => {
                    // normalise: if user typed "8B5CF6" without #, fix it
                    let v = e.target.value.trim();
                    if (/^[0-9a-fA-F]{6}$/.test(v)) v = '#' + v;
                    if (/^#[0-9a-fA-F]{6}$/.test(v)) setShapeColor(v);
                    else setShapeColor(shapeColor); // revert invalid
                  }}
                  placeholder="#8B5CF6"
                  maxLength={7}
                  className="w-28 border rounded-lg px-2 py-1.5 text-sm font-mono"
                />
                <span className="text-xs text-gray-400">or type hex code</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">SVG Code <span className="text-red-500">*</span></label>
              <textarea value={svgCode} onChange={e => setSvgCode(e.target.value)} rows={5}
                placeholder={'<polygon points="50,10 90,90 10,90"\n  fill="{fill}" stroke="{stroke}" strokeWidth="{sw}" />'}
                className="w-full border rounded-lg px-3 py-2 font-mono text-xs" />
              <p className="text-xs text-gray-400 mt-1">ViewBox 0 0 100 100. Variables: <code className="bg-gray-100 px-1 rounded">{'{fill}'}</code> <code className="bg-gray-100 px-1 rounded">{'{stroke}'}</code> <code className="bg-gray-100 px-1 rounded">{'{sw}'}</code></p>
            </div>
            <button onClick={handleSave} className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2 rounded-lg font-semibold w-full">
              Save Shape
            </button>
            {status && (
              <div className={`p-3 rounded-lg text-sm border ${status.startsWith('✓') ? 'bg-green-50 text-green-800 border-green-200' : status.startsWith('✗') ? 'bg-red-50 text-red-800 border-red-200' : 'bg-blue-50 text-blue-800 border-blue-200'}`}>
                {status}
                {status.startsWith('✓') && (
                  <button onClick={() => { window.scrollTo(0,0); }} className="ml-3 text-xs underline font-medium">← Back to Pending Items</button>
                )}
              </div>
            )}
          </div>

          {/* Live preview */}
          <div>
            <label className="block text-sm font-semibold mb-2">Live Preview</label>
            <div className="border rounded-xl p-4 bg-gray-50 flex flex-col items-center justify-center min-h-48 gap-3">
              {previewSVG ? (
                <>
                  <svg viewBox="0 0 100 100" width={100} height={100} dangerouslySetInnerHTML={{ __html: previewSVG }} />
                  <span className="text-xs font-mono text-gray-500">{shapeName || 'shape_name'}</span>
                </>
              ) : (
                <p className="text-sm text-gray-400 text-center">Enter SVG code on the left<br />to see a live preview here</p>
              )}
            </div>
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 space-y-1">
              <div className="font-semibold">Can't express it as SVG paths?</div>
              <div className="text-blue-700">If the shape is too complex (e.g. artistic, textured), switch to the <strong>PNG Sprites</strong> tab and upload an image instead.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Existing list */}
      <div className="bg-white p-6 rounded-2xl shadow">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Custom SVG Shapes ({shapes.length})</h2>
          <button onClick={load} className="text-sm text-amber-700 hover:text-amber-900 font-medium">↻ Refresh</button>
        </div>
        {loadingList && <div className="text-center py-8 text-gray-400">Loading…</div>}
        {!loadingList && shapes.length === 0 && <div className="text-center py-10 text-gray-400 text-sm">No custom SVG shapes yet.</div>}
        {!loadingList && shapes.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {shapes.map(shape => (
              <div key={shape.id} className="border rounded-xl p-3 text-center group relative">
                <div className="w-10 h-10 mx-auto mb-2 rounded-lg flex items-center justify-center" style={{ backgroundColor: shape.default_color + '22' }}>
                  <svg viewBox="0 0 100 100" width={32} height={32}
                    dangerouslySetInnerHTML={{ __html: (shape.svg_code || '').replace(/\{fill\}/g, shape.default_color).replace(/\{stroke\}/g, '#1e293b').replace(/\{sw\}/g, '3') }} />
                </div>
                <div className="text-xs font-mono text-gray-700 truncate" title={shape.shape_name}>{shape.shape_name}</div>
                <div className="text-xs text-gray-400">SVG</div>
                <button onClick={() => handleDelete(shape.shape_name)}
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 text-xs p-1 transition-opacity" title="Delete">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PNG Sprites Tab ────────────────────────────────────────────────────────────
function PngSpritesTab({ prefill, onPrefillConsumed }) {
  const [tokenName, setTokenName]   = useState('');
  const [nameError, setNameError]   = useState('');
  const [spriteFile, setSpriteFile] = useState(null);
  const [preview, setPreview]       = useState('');
  const [status, setStatus]         = useState('');
  const [shapes, setShapes]         = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const nameInputRef                = useRef(null);

  const load = async () => {
    setLoadingList(true);
    try {
      const res  = await fetch(`${apiBase}/tokens/sprite-shapes`, { headers: authHdr() });
      const data = await res.json();
      if (data.shapes) setShapes(data.shapes);
    } catch (e) { console.error(e); }
    finally { setLoadingList(false); }
  };
  useEffect(() => { load(); }, []);

  // When a token is routed here from PendingItemsTab, pre-fill the name
  useEffect(() => {
    if (prefill) {
      setTokenName(prefill);
      setNameError(validateTokenName(prefill) || '');
      setSpriteFile(null); setPreview(''); setStatus('');
      setTimeout(() => nameInputRef.current?.focus(), 100);
      onPrefillConsumed?.();
    }
  }, [prefill]);

  const handleNameChange = (val) => {
    const clean = val.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setTokenName(clean);
    setNameError(validateTokenName(clean) || '');
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Please select an image file (PNG recommended)'); return; }
    if (file.size > 2 * 1024 * 1024) { alert('File too large — max 2MB'); return; }
    setSpriteFile(file);
    const reader = new FileReader();
    reader.onload = ev => setPreview(ev.target.result);
    reader.readAsDataURL(file);
    // Auto-fill token name from filename only when field is empty and no prefill
    if (!tokenName && !prefill) {
      const base = file.name.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
      if (base && !validateTokenName(base)) { setTokenName(base); setNameError(''); }
    }
  };

  const handleUpload = async () => {
    const err = validateTokenName(tokenName);
    if (err) { setNameError(err); return; }
    if (!spriteFile) { setStatus('✗ Please select a PNG file'); return; }
    setStatus('Uploading…');
    try {
      const fd = new FormData();
      fd.append('tokenName', tokenName);
      fd.append('sprite', spriteFile);
      const res  = await fetch(`${apiBase}/tokens/sprite-shape`, { method: 'POST', headers: authHdr(), body: fd });
      const data = await res.json();
      if (data.success) {
        setStatus(`✓ Shape "${data.tokenName}" uploaded! Token: ${data.usage}`);
        setTokenName(''); setSpriteFile(null); setPreview('');
        load();
      } else { setStatus(`✗ ${data.error}`); }
    } catch (e) { setStatus(`✗ ${e.message}`); }
  };

  const handleDelete = async (name) => {
    if (!confirm(`Delete sprite shape "${name}"?`)) return;
    try {
      const res  = await fetch(`${apiBase}/tokens/sprite-shape/${name}`, { method: 'DELETE', headers: authHdr() });
      const data = await res.json();
      if (data.success) load();
      else alert('Delete failed: ' + data.error);
    } catch (e) { alert('Delete failed: ' + e.message); }
  };

  return (
    <div className="space-y-6">
      {/* Routing banner — shown when redirected from a pending token */}
      {prefill && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-300 rounded-xl px-4 py-3 text-sm text-green-800">
          <span className="text-lg">🖼️</span>
          <div>
            <span className="font-semibold">Adding missing shape from pending item</span>
            <span className="ml-2">Token: <code className="bg-green-100 px-1.5 py-0.5 rounded font-mono">{prefill}</code></span>
            <span className="ml-2 text-green-700">Upload a PNG image below, then click Upload.</span>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-2xl shadow">
        <h2 className="text-xl font-bold mb-1">Upload PNG Sprite Shape</h2>
        <p className="text-sm text-gray-500 mb-5">
          For complex shapes that can't be expressed as SVG paths — the PNG is stored and registered automatically.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Token Name <span className="text-red-500">*</span></label>
              <input ref={nameInputRef} type="text" value={tokenName} onChange={e => handleNameChange(e.target.value)}
                placeholder="e.g., spiral, mandala_ring"
                className={`w-full border rounded-lg px-3 py-2 text-sm ${nameError ? 'border-red-400' : prefill ? 'border-green-400 bg-green-50' : ''}`} />
              {nameError
                ? <p className="text-xs text-red-500 mt-1">{nameError}</p>
                : <p className="text-xs text-gray-400 mt-1">This exact name is the token used in items.</p>
              }
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">PNG Image <span className="text-red-500">*</span></label>
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFileChange}
                className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100" />
              <p className="text-xs text-gray-400 mt-1">PNG with transparent background, 64×64px ideal (max 2MB)</p>
            </div>
            <button onClick={handleUpload} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold w-full">
              Upload &amp; Register Shape
            </button>
            {status && (
              <div className={`p-3 rounded-lg text-sm border ${status.startsWith('✓') ? 'bg-green-50 text-green-800 border-green-200' : status.startsWith('✗') ? 'bg-red-50 text-red-800 border-red-200' : 'bg-blue-50 text-blue-800 border-blue-200'}`}>
                {status}
                {status.startsWith('✓') && (
                  <span className="block mt-1 text-xs text-green-600">Now go back to Pending Items and click <strong>↑ Retry Upload</strong> on the item.</span>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Preview</label>
            <div className="border rounded-xl p-6 bg-gray-50 flex flex-col items-center justify-center min-h-48 gap-2">
              {preview
                ? <><img src={preview} alt="Preview" className="w-24 h-24 object-contain rounded" /><span className="text-xs font-mono text-gray-500">{tokenName || 'token_name'}</span></>
                : <p className="text-sm text-gray-400 text-center">Select a file to preview here</p>
              }
            </div>
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-xl text-xs text-green-800 space-y-1">
              <div className="font-semibold">What happens after upload</div>
              <div>1. PNG saved to <code className="bg-white px-1 rounded">/sprites/custom/</code></div>
              <div>2. Manifest updated automatically</div>
              <div>3. Go to <strong>Pending Items</strong> → click <strong>Retry Upload</strong></div>
            </div>
          </div>
        </div>
      </div>

      {/* Existing list */}
      <div className="bg-white p-6 rounded-2xl shadow">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Custom Sprite Shapes ({shapes.length})</h2>
          <button onClick={load} className="text-sm text-amber-700 hover:text-amber-900 font-medium">↻ Refresh</button>
        </div>
        {loadingList && <div className="text-center py-8 text-gray-400">Loading…</div>}
        {!loadingList && shapes.length === 0 && <div className="text-center py-10 text-gray-400 text-sm">No custom sprite shapes yet.</div>}
        {!loadingList && shapes.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {shapes.map(shape => (
              <div key={shape.tokenName} className="border rounded-xl p-3 text-center group relative bg-gray-50">
                <img src={shape.file} alt={shape.tokenName} className="w-12 h-12 mx-auto mb-2 object-contain"
                  onError={e => { e.target.style.display = 'none'; }} />
                <div className="text-xs font-mono text-gray-700 truncate" title={shape.tokenName}>{shape.tokenName}</div>
                <div className="text-xs text-gray-400">PNG sprite</div>
                <button onClick={() => handleDelete(shape.tokenName)}
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 text-xs p-1 transition-opacity" title="Delete">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-gray-50 border rounded-2xl p-4 text-sm text-gray-600">
        <span className="font-semibold text-gray-700">Built-in sprite sheet</span> — 34 pre-drawn shapes are embedded in <code className="bg-white border px-1 rounded text-xs">shapes.png</code> and are always available by their token names. These cannot be removed via admin.
      </div>
    </div>
  );
}

// ─── Existing Tokens Tab ────────────────────────────────────────────────────────
function ExistingTokensTab() {
  const [svgShapes, setSvgShapes]       = useState([]);
  const [spriteShapes, setSpriteShapes] = useState([]);
  const [loading, setLoading]           = useState(true);

  const BUILT_IN = [
    'triangle','circle','square','star','diamond','hexagon',
    'pentagon','arrow','octagon','cross','dot','heart','oval','rectangle','crescent',
  ];
  const SHEET_SPRITES = [
    'hourglass','hourglass_striped','hourglass_dot_top','hourglass_dot_bottom',
    'wavy','wavy_circle','wavy_square','wavy_line','wavy_dashed',
    'moon','crescent_hollow',
    'nested_circles','nested_squares','nested_triangles','nested_triangle_outer_striped','nested_triangle_inner_striped',
    'inner_square','inner_square_lg','inner_square_rotated','rectangle_inner_square',
    'star_ring','star_4ring','star_ring2dashed',
    'diamond_dot1','diamond_dot2',
    'square_striped','square_striped_border','circle_shaded','circle_line','square_dot2',
    'arrow_shaded','arrow_shaded_up','arrow_shaded_upper_right',
  ];

  useEffect(() => {
    Promise.all([
      fetch(`${apiBase}/tokens/svg-shapes`,    { headers: authHdr() }).then(r => r.json()).catch(() => ({ shapes: [] })),
      fetch(`${apiBase}/tokens/sprite-shapes`, { headers: authHdr() }).then(r => r.json()).catch(() => ({ shapes: [] })),
    ]).then(([svgData, spriteData]) => {
      setSvgShapes(svgData.shapes || []);
      setSpriteShapes(spriteData.shapes || []);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="text-center py-16 text-gray-400">Loading…</div>;

  const total = BUILT_IN.length + SHEET_SPRITES.length + svgShapes.length + spriteShapes.length;

  return (
    <div className="space-y-6">
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
        <span className="font-semibold">{total} total shapes available</span>
        {' '}— built-in SVG ({BUILT_IN.length}), sheet sprites ({SHEET_SPRITES.length}), custom SVG ({svgShapes.length}), custom PNG ({spriteShapes.length})
      </div>

      <div className="bg-white p-6 rounded-2xl shadow">
        <h2 className="text-xl font-bold mb-1">Built-in SVG Shapes ({BUILT_IN.length})</h2>
        <p className="text-sm text-gray-500 mb-4">Colour and size modifiers supported.</p>
        <div className="flex flex-wrap gap-2">
          {BUILT_IN.map(s => <span key={s} className="font-mono text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg px-3 py-1.5">{s}</span>)}
        </div>
        <p className="text-xs text-gray-400 mt-3">e.g. <code className="bg-gray-100 px-1 rounded">red_circle</code> <code className="bg-gray-100 px-1 rounded">blue_square_hollow</code> <code className="bg-gray-100 px-1 rounded">3_triangle_md</code></p>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow">
        <h2 className="text-xl font-bold mb-1">Built-in Sheet Sprites ({SHEET_SPRITES.length})</h2>
        <p className="text-sm text-gray-500 mb-4">Complex shapes from the sprite sheet — fixed colour.</p>
        <div className="flex flex-wrap gap-2">
          {SHEET_SPRITES.map(s => <span key={s} className="font-mono text-xs bg-teal-50 text-teal-700 border border-teal-200 rounded-lg px-3 py-1.5">{s}</span>)}
        </div>
      </div>

      {svgShapes.length > 0 && (
        <div className="bg-white p-6 rounded-2xl shadow">
          <h2 className="text-xl font-bold mb-4">Custom SVG Shapes ({svgShapes.length})</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {svgShapes.map(shape => (
              <div key={shape.id} className="border rounded-xl p-3 text-center">
                <div className="w-10 h-10 mx-auto mb-2 rounded-lg flex items-center justify-center" style={{ backgroundColor: shape.default_color + '22' }}>
                  <svg viewBox="0 0 100 100" width={28} height={28}
                    dangerouslySetInnerHTML={{ __html: (shape.svg_code || '').replace(/\{fill\}/g, shape.default_color).replace(/\{stroke\}/g, '#1e293b').replace(/\{sw\}/g, '3') }} />
                </div>
                <div className="text-xs font-mono text-gray-700 truncate" title={shape.shape_name}>{shape.shape_name}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {spriteShapes.length > 0 && (
        <div className="bg-white p-6 rounded-2xl shadow">
          <h2 className="text-xl font-bold mb-4">Custom PNG Sprites ({spriteShapes.length})</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {spriteShapes.map(shape => (
              <div key={shape.tokenName} className="border rounded-xl p-3 text-center bg-gray-50">
                <img src={shape.file} alt={shape.tokenName} className="w-12 h-12 mx-auto mb-2 object-contain"
                  onError={e => { e.target.style.display = 'none'; }} />
                <div className="text-xs font-mono text-gray-700 truncate" title={shape.tokenName}>{shape.tokenName}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Auto-generate keyword detection ─────────────────────────────────────────
// These keywords mean the backend can produce an SVG from the token name alone
const AUTO_GEN_KEYWORDS = [
  'circle','square','rectangle','triangle','star','diamond','hexagon','pentagon',
  'heart','arrow','crescent','moon','cross','plus','oval','ellipse','octagon',
  'bell','flag','shield','flower','hourglass','dot','ring',
];
function canAutoGenerate(token) {
  const lc = token.toLowerCase();
  return AUTO_GEN_KEYWORDS.some(k => lc.includes(k));
}

// ─── QuickFixPanel ────────────────────────────────────────────────────────────
// Shown at the top of Token Manager when navigated from an upload error screen.
// Lists every unique missing token, lets admin auto-generate or upload inline.
function QuickFixPanel({ skippedItems, focusToken, onDismiss }) {
  // Deduplicate all unresolved tokens across all skipped items
  const uniqueTokens = [...new Set(
    (skippedItems || []).flatMap(item => (item.unresolvedTokens || []).map(t => t.token))
  )];

  const [tokenState, setTokenState] = useState(() =>
    Object.fromEntries(uniqueTokens.map(t => [t, { status: 'idle', file: null, preview: '' }]))
  );
  const [bulkStatus, setBulkStatus]     = useState('');   // generating all
  const [retryStatus, setRetryStatus]   = useState('');   // retrying pending items
  const [retryResults, setRetryResults] = useState(null);
  const [collapsed, setCollapsed]       = useState(false);

  const generatable = uniqueTokens.filter(canAutoGenerate);
  const needsPng    = uniqueTokens.filter(t => !canAutoGenerate(t));

  const allDone = uniqueTokens.every(t =>
    tokenState[t]?.status === 'done' || tokenState[t]?.status === 'generated'
  );

  // ── Auto-generate a single token or all at once ──
  const doGenerate = async (tokens) => {
    tokens.forEach(t => setTokenState(s => ({ ...s, [t]: { ...s[t], status: 'generating' } })));
    try {
      const res  = await fetch(`${apiBase}/tokens/auto-generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHdr() },
        body: JSON.stringify({ tokens })
      });
      const data = await res.json();
      if (data.success) {
        (data.details?.generated || []).forEach(({ token }) =>
          setTokenState(s => ({ ...s, [token]: { ...s[token], status: 'generated' } }))
        );
        (data.details?.skipped || []).forEach(({ token }) =>
          setTokenState(s => ({ ...s, [token]: { ...s[token], status: 'error', msg: 'Cannot auto-generate — upload PNG instead' } }))
        );
      }
    } catch (e) {
      tokens.forEach(t => setTokenState(s => ({ ...s, [t]: { ...s[t], status: 'error', msg: e.message } })));
    }
  };

  const handleGenerateAll = async () => {
    setBulkStatus('generating');
    await doGenerate(generatable);
    setBulkStatus('done');
  };

  // ── Inline PNG upload for a single token ──
  const handleFileChange = (token, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setTokenState(s => ({ ...s, [token]: { ...s[token], file, preview: ev.target.result, status: 'ready' } }));
    reader.readAsDataURL(file);
  };

  const handleUpload = async (token) => {
    const st = tokenState[token];
    if (!st?.file) return;
    setTokenState(s => ({ ...s, [token]: { ...s[token], status: 'uploading' } }));
    try {
      const fd = new FormData();
      fd.append('tokenName', token.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''));
      fd.append('sprite', st.file);
      const res  = await fetch(`${apiBase}/tokens/sprite-shape`, { method: 'POST', headers: authHdr(), body: fd });
      const data = await res.json();
      if (data.success) {
        // Token uploaded — now auto-retry all pending items that had this token unresolved
        setTokenState(s => ({ ...s, [token]: { ...s[token], status: 'retrying' } }));
        try {
          const retryRes  = await fetch(`${apiBase}/tokens/pending-items/retry-for-token`, {
            method: 'POST',
            headers: { ...authHdr(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ tokenName: token }),
          });
          const retryData = await retryRes.json();
          setTokenState(s => ({
            ...s,
            [token]: {
              ...s[token],
              status: 'done',
              resolvedCount: retryData.resolved || 0,
              stillPending: retryData.stillPending || 0,
              retryMsg: retryData.message,
            }
          }));
        } catch {
          // Non-fatal — PNG was uploaded, retry just didn't run
          setTokenState(s => ({ ...s, [token]: { ...s[token], status: 'done', retryMsg: 'Uploaded. Click Retry All to process pending items.' } }));
        }
      } else {
        setTokenState(s => ({ ...s, [token]: { ...s[token], status: 'error', msg: data.error } }));
      }
    } catch (e) {
      setTokenState(s => ({ ...s, [token]: { ...s[token], status: 'error', msg: e.message } }));
    }
  };

  // ── Retry all pending items ──
  const handleRetryAll = async () => {
    setRetryStatus('loading');
    try {
      // Fetch all pending items
      const listRes  = await fetch(`${apiBase}/tokens/pending-items?status=pending`, { headers: authHdr() });
      const listData = await listRes.json();
      const pendingIds = (listData.items || []).map(i => i.id);

      if (pendingIds.length === 0) {
        setRetryStatus('none');
        return;
      }

      // Retry them all in parallel
      setRetryStatus('retrying');
      const results = await Promise.all(
        pendingIds.map(id =>
          fetch(`${apiBase}/tokens/pending-items/${id}/retry`, { method: 'POST', headers: authHdr() })
            .then(r => r.json())
            .then(d => ({ id, ...d }))
            .catch(e => ({ id, success: false, error: e.message }))
        )
      );
      const succeeded = results.filter(r => r.success).length;
      const failed    = results.filter(r => !r.success).length;
      setRetryResults({ succeeded, failed, total: results.length });
      setRetryStatus('done');
    } catch (e) {
      setRetryStatus('error');
    }
  };

  const statusIcon = (st) => {
    if (st === 'generated' || st === 'done') return <span className="text-green-600 font-bold text-base">✓</span>;
    if (st === 'generating' || st === 'uploading' || st === 'retrying') return <span className="animate-pulse text-amber-500">⏳</span>;
    if (st === 'error') return <span className="text-red-500 font-bold">✗</span>;
    return null;
  };

  return (
    <div className="mb-6 rounded-2xl border-2 border-amber-400 overflow-hidden shadow-lg">
      {/* Header */}
      <div className="bg-amber-500 px-5 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-2xl">🔧</span>
          <div className="min-w-0">
            <div className="text-white font-bold text-sm">
              Fix {uniqueTokens.length} Missing Shape{uniqueTokens.length !== 1 ? 's' : ''} from Upload
            </div>
            <div className="text-amber-100 text-xs">
              {generatable.length} can be auto-generated · {needsPng.length} need a PNG image
              {' '}· {skippedItems.length} item{skippedItems.length !== 1 ? 's' : ''} affected
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => setCollapsed(c => !c)}
            className="text-white text-xs px-2 py-1 rounded hover:bg-amber-600 transition-colors">
            {collapsed ? '▾ Show' : '▴ Hide'}
          </button>
          <button onClick={onDismiss}
            className="text-amber-200 hover:text-white text-sm px-2 py-1 rounded transition-colors" title="Dismiss">✕</button>
        </div>
      </div>

      {!collapsed && (
        <div className="bg-white p-5 space-y-5">

          {/* Bulk action row */}
          {generatable.length > 0 && (
            <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
              <span className="text-blue-600 text-lg">✨</span>
              <div className="flex-1 text-sm text-blue-800">
                <span className="font-semibold">{generatable.length} shape{generatable.length !== 1 ? 's' : ''}</span> can be auto-generated from their name — no image needed.
              </div>
              <button
                onClick={handleGenerateAll}
                disabled={bulkStatus === 'generating' || bulkStatus === 'done'}
                className="shrink-0 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors">
                {bulkStatus === 'generating' ? '⏳ Generating…' : bulkStatus === 'done' ? '✓ Generated' : '✨ Auto-generate All'}
              </button>
            </div>
          )}

          {/* Token list */}
          <div className="space-y-2">
            {uniqueTokens.map(token => {
              const st    = tokenState[token] || {};
              const isGen = canAutoGenerate(token);
              const done  = st.status === 'done' || st.status === 'generated';
              const highlighted = token === focusToken;

              return (
                <div key={token}
                  className={`border rounded-xl p-3 transition-all ${
                    done               ? 'border-green-200 bg-green-50' :
                    highlighted        ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-300' :
                    st.status === 'error' ? 'border-red-200 bg-red-50' :
                    'border-gray-200 bg-white'
                  }`}>

                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Status icon */}
                    <div className="w-5 shrink-0 flex items-center justify-center">
                      {statusIcon(st.status)}
                    </div>

                    {/* Token name + type badge */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="font-mono text-sm font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded">{token}</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${isGen ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                        {isGen ? '✨ Auto-generatable' : '🖼️ Needs PNG'}
                      </span>
                    </div>

                    {/* Action */}
                    {!done && (
                      <div className="flex items-center gap-2 shrink-0">
                        {isGen ? (
                          <button
                            onClick={() => doGenerate([token])}
                            disabled={st.status === 'generating'}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors">
                            {st.status === 'generating' ? '⏳' : '✨ Generate SVG'}
                          </button>
                        ) : (
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            {st.preview && (
                              <img src={st.preview} alt="" className="w-8 h-8 object-contain rounded border bg-gray-50" />
                            )}
                            <div className={`px-3 py-1.5 text-xs font-bold rounded-lg border-2 border-dashed transition-colors ${
                              st.file ? 'border-green-400 text-green-700 bg-green-50' : 'border-gray-300 text-gray-600 hover:border-purple-400 hover:text-purple-700'
                            }`}>
                              {st.file ? st.file.name.slice(0, 18) + '…' : '📎 Choose PNG'}
                            </div>
                            <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                              onChange={e => handleFileChange(token, e.target.files[0])} />
                          </label>
                        )}

                        {/* Upload button shown when file is selected for PNG tokens */}
                        {!isGen && st.file && (
                          <button
                            onClick={() => handleUpload(token)}
                            disabled={st.status === 'uploading' || st.status === 'retrying'}
                            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors">
                            {st.status === 'uploading' ? '⏳ Uploading…' : st.status === 'retrying' ? '⏳ Resolving…' : '⚡ Upload'}
                          </button>
                        )}
                      </div>
                    )}

                    {done && (
                      <span className="text-xs text-green-600 font-semibold shrink-0">
                        {st.resolvedCount > 0
                          ? `✓ ${st.resolvedCount} item${st.resolvedCount > 1 ? 's' : ''} auto-uploaded`
                          : st.stillPending > 0
                            ? `✓ Shape added · ${st.stillPending} item${st.stillPending > 1 ? 's' : ''} need other tokens`
                            : 'Shape added ✓'}
                      </span>
                    )}
                  </div>

                  {/* Error message */}
                  {st.status === 'error' && (
                    <div className="mt-1.5 ml-8 text-xs text-red-600">{st.msg}</div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Retry all pending items */}
          <div className={`p-4 rounded-xl border transition-all ${allDone ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className={`text-sm font-semibold ${allDone ? 'text-green-800' : 'text-gray-700'}`}>
                  {allDone ? '✅ All shapes added — ready to retry!' : 'When done, retry uploading your items'}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  This will re-validate every pending item and auto-upload the ones that now have all shapes.
                </div>
              </div>
              <button
                onClick={handleRetryAll}
                disabled={retryStatus === 'retrying' || retryStatus === 'loading'}
                className={`shrink-0 px-5 py-2.5 text-white text-sm font-bold rounded-xl transition-all disabled:opacity-50 ${
                  allDone ? 'bg-green-600 hover:bg-green-700 shadow-md' : 'bg-amber-500 hover:bg-amber-600'
                }`}>
                {retryStatus === 'loading' ? 'Loading…' :
                 retryStatus === 'retrying' ? '⏳ Retrying…' :
                 '↑ Retry All Pending Items'}
              </button>
            </div>

            {retryResults && (
              <div className={`mt-3 px-3 py-2 rounded-lg text-sm ${retryResults.succeeded > 0 ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                {retryResults.succeeded > 0 && <span className="font-bold">✓ {retryResults.succeeded} item{retryResults.succeeded !== 1 ? 's' : ''} uploaded successfully!</span>}
                {retryResults.failed > 0 && <span className="ml-2 text-amber-700">{retryResults.failed} still pending (some tokens may still be missing)</span>}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
function TokenManagerPage() {
  const navigate   = useNavigate();
  const location   = useLocation();
  const pageTopRef = useRef(null);

  // State passed from upload error screens via navigate(…, { state })
  const fromUpload   = location.state?.fromUpload   || false;
  const skippedItems = location.state?.skippedItems || [];
  const focusToken   = location.state?.focusToken   || null;

  const [activeTab, setActiveTab]       = useState('pending');
  const [pendingCount, setPendingCount] = useState(null);
  const [showQuickFix, setShowQuickFix] = useState(fromUpload && skippedItems.length > 0);

  // Prefill state: single-token routing from Pending Items inline "Fix →" button
  const [prefill, setPrefill] = useState(null);

  useEffect(() => {
    fetch(`${apiBase}/tokens/pending-items?status=pending`, { headers: authHdr() })
      .then(r => r.json())
      .then(d => setPendingCount((d.items || []).length))
      .catch(() => {});
  }, []);

  const handleFixToken = (originalToken, suggestedName, targetTab) => {
    setPrefill({ name: suggestedName, tab: targetTab, originalToken });
    setActiveTab(targetTab);
    pageTopRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handlePrefillConsumed = () => {
    setPrefill(prev => prev ? { ...prev, consumed: true } : null);
  };

  const tabs = [
    { id: 'pending',  label: '⏳ Pending Items',   badge: pendingCount },
    { id: 'shapes',   label: '📐 SVG Shapes' },
    { id: 'sprites',  label: '🖼️ PNG Sprites' },
    { id: 'existing', label: '📋 All Tokens' },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto" ref={pageTopRef}>
      <button onClick={() => navigate('/admin')} className="text-xs font-bold mb-4 text-blue-600 hover:text-blue-800">
        ← Back to Admin
      </button>

      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold">Token Manager</h1>
          <p className="text-gray-500 text-sm mt-1">Add or manage shapes and sprites — no developer intervention needed.</p>
        </div>
      </div>

      {/* ── QuickFix panel — shown when arriving from an upload error screen ── */}
      {showQuickFix && skippedItems.length > 0 && (
        <QuickFixPanel
          skippedItems={skippedItems}
          focusToken={focusToken}
          onDismiss={() => setShowQuickFix(false)}
        />
      )}

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`relative px-4 py-2 font-semibold text-sm transition-colors ${
              activeTab === tab.id ? 'border-b-2 border-amber-500 text-amber-700' : 'text-gray-500 hover:text-gray-800'
            }`}>
            {tab.label}
            {tab.badge != null && tab.badge > 0 && (
              <span className="ml-1.5 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 font-bold leading-none">{tab.badge}</span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'pending'  && <PendingItemsTab onFixToken={handleFixToken} />}
      {activeTab === 'shapes'   && (
        <SvgShapesTab
          prefill={prefill?.tab === 'shapes' && !prefill?.consumed ? prefill.name : null}
          onPrefillConsumed={handlePrefillConsumed}
        />
      )}
      {activeTab === 'sprites'  && (
        <PngSpritesTab
          prefill={prefill?.tab === 'sprites' && !prefill?.consumed ? prefill.name : null}
          onPrefillConsumed={handlePrefillConsumed}
        />
      )}
      {activeTab === 'existing' && <ExistingTokensTab />}
    </div>
  );
}

export default TokenManagerPage;
