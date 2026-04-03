import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

export default function ItemUploadPage() {
  const [file, setFile] = useState(null);
  const [domain, setDomain] = useState('gf');
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const fileRef = useRef();
  const navigate = useNavigate();

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer?.files?.[0] || e.target.files?.[0];
    if (f && /\.(csv|xlsx|xls)$/i.test(f.name)) {
      setFile(f);
      setError('');
      setResult(null);
    } else {
      setError('Please upload a .csv, .xlsx, or .xls file');
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const data = await api.upload('/items/upload', file, { domain, confirm: 'true' });
      setResult(data);
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-2xl">
      <button onClick={() => navigate('/admin/items')} className="text-xs font-bold text-gold hover:text-gold-dark mb-4 inline-block">
        ← Back to Item Bank
      </button>
      <h1 className="text-xl font-black text-ink-DEFAULT mb-2">Upload Items</h1>
      <p className="text-sm text-ink-dim mb-6">Import questions from an Excel file. Multi-sheet files are supported — each sheet can be a different domain. The domain is read from each row's 'domain' column.</p>

      {/* Domain selector (fallback only) */}
      <div className="mb-4">
        <label className="text-xs font-bold text-ink-faint uppercase tracking-wider">Default Domain (fallback if not in Excel)</label>
        <select value={domain} onChange={e => setDomain(e.target.value)}
          className="block w-full mt-1.5 px-4 py-3 bg-white border-2 border-ivory-200 rounded-xl text-sm font-bold text-ink-DEFAULT outline-none focus:border-gold">
          <option value="gf">Gf — Fluid Reasoning (Pattern Recognition)</option>
          <option value="gv">Gv — Visual Spatial Ability</option>
          <option value="gq">Gq — Quantitative Reasoning</option>
          <option value="gc">Gc — Verbal Reasoning</option>
          <option value="gs">Gs — Processing Speed</option>
          <option value="gwm">Gwm — Working Memory</option>
          <option value="personality">Personality</option>
          <option value="interest">Interest</option>
        </select>
      </div>

      {/* Drop zone */}
      <div onClick={() => fileRef.current?.click()} onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
          file ? 'border-gold bg-amber-50/50' : 'border-ivory-200 bg-white hover:border-gold hover:bg-ivory-100/50'
        }`}>
        <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleDrop} className="hidden"/>
        {file ? (
          <>
            <div className="text-3xl mb-2">📄</div>
            <div className="text-sm font-bold text-ink">{file.name}</div>
            <div className="text-xs text-ink-faint mt-1">{(file.size / 1024).toFixed(1)} KB</div>
            <button onClick={(e) => { e.stopPropagation(); setFile(null); setResult(null); }}
              className="text-xs font-bold text-red-600 mt-3 hover:text-red-700">Remove</button>
          </>
        ) : (
          <>
            <div className="text-3xl mb-2">⬆️</div>
            <div className="text-sm font-bold text-ink">Drop your Excel or CSV file here</div>
            <div className="text-xs text-ink-faint mt-1">or click to browse</div>
          </>
        )}
      </div>

      {/* Expected format hint */}
      <div className="mt-4 bg-ivory-100 rounded-xl p-4 text-xs text-ink-dim">
        <strong className="text-ink">Required columns:</strong> itemId, template, difficultyLevel, option1, option2, option3, correctIndex (1-based)<br/>
        <strong className="text-ink">Recommended:</strong> prompt, sequence (arrow-separated), displayMode, option1Label/Tag, role (core/transitional/anchor/ceiling), ageBandMin, ageBandMax, timeLimitSec<br/>
        <strong className="text-ink">Visual items (Gf/Gv):</strong> Use sequence column like "triangle_top → circle_bottom → ?" with shape tokens as option values<br/>
        <strong className="text-ink">Text items (Gq/Gc/Gs):</strong> Use prompt for the question text, option values and labels as plain text. Sequence can hold passage text.
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 px-4 py-3 bg-red-50 border border-danger/20 rounded-xl text-sm font-bold text-red-600">
          {error}
        </div>
      )}

      {/* Upload button */}
      {file && !result && (
        <button onClick={handleUpload} disabled={uploading}
          className="mt-6 w-full py-3.5 bg-copper text-white font-black rounded-2xl text-sm shadow-[0_4px_0_#92400E] hover:-translate-y-0.5 active:translate-y-0.5 transition-all disabled:opacity-50">
          {uploading ? 'Uploading...' : `Upload ${file.name}`}
        </button>
      )}

      {/* Result */}
      {result && (
        <div className="mt-6 space-y-3">
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
            <div className="text-lg font-black text-emerald-600 mb-1">✓ Upload Complete</div>
            <div className="text-sm text-emerald-700 space-y-1">
              <div>
                <strong>{result.inserted || 0}</strong> items imported ·{' '}
                <strong>{result.updated || 0}</strong> updated ·{' '}
                <strong className={result.skipped > 0 ? 'text-amber-600' : ''}>{result.skipped || 0}</strong> skipped
              </div>
              {result.sheets && <div className="text-xs text-emerald-600">Sheets processed: {result.sheets.join(', ')}</div>}
              {result.errors > 0 && <div className="text-xs text-amber-600">⚠ {result.errors} errors</div>}
              {result.errorDetails?.length > 0 && (
                <div className="mt-2 bg-white/60 rounded-lg p-3 text-xs text-red-600 max-h-32 overflow-auto">
                  {result.errorDetails.map((e, i) => <div key={i}>{e.itemId}: {e.error}</div>)}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <button onClick={() => navigate('/admin/items')}
                className="px-5 py-2 bg-emerald-600 text-white font-bold rounded-xl text-xs hover:bg-emerald-700 transition-colors">
                View Item Bank →
              </button>
              {result.skipped > 0 && (
                <button onClick={() => navigate('/admin/tokens', {
                  state: { fromUpload: true, skippedItems: result.skippedItems || [] }
                })}
                  className="px-5 py-2 bg-amber-500 text-white font-bold rounded-xl text-xs hover:bg-amber-600 transition-colors">
                  🔧 Fix {result.skipped} Missing Shape{result.skipped !== 1 ? 's' : ''} →
                </button>
              )}
            </div>
            {result.batteries && result.batteries.length > 0 && (
              <div className="mt-3 p-3 bg-white/70 rounded-xl border border-emerald-100">
                <div className="text-xs font-bold text-emerald-700 mb-1">🔋 Auto-created batteries:</div>
                {result.batteries.map((b, i) => (
                  <div key={i} className="text-xs text-emerald-600">{b.name} ({b.sections} section{b.sections !== 1 ? 's' : ''})</div>
                ))}
                <button onClick={() => navigate('/admin/sessions/assign')}
                  className="mt-2 px-4 py-1.5 bg-amber-600 text-white font-bold rounded-lg text-xs hover:bg-amber-700 transition-colors">
                  Assign to Students →
                </button>
              </div>
            )}
          </div>

          {/* Skipped items detail */}
          {result.skippedItems && result.skippedItems.length > 0 && (() => {
            // Separate image-file errors from shape-token errors
            const allTokens = result.skippedItems.flatMap(it => it.unresolvedTokens || []);
            const hasMissingFiles = allTokens.some(t => t.token && String(t.token).startsWith('excel_img:'));
            const hasMissingTokens = allTokens.some(t => !String(t.token || '').startsWith('excel_img:'));
            return (
            <div className="bg-red-50 border-2 border-red-300 rounded-2xl overflow-hidden">
              <div className="bg-red-600 px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="text-white font-bold text-sm">
                    ⚠️ {result.skippedItems.length} item{result.skippedItems.length !== 1 ? 's' : ''} not uploaded — missing SVG files
                  </div>
                  <div className="text-red-100 text-xs">Upload the missing SVG files to the Shape Library, then re-upload this Excel.</div>
                </div>
                <div className="flex flex-col gap-1">
                  {hasMissingFiles && (
                    <button onClick={() => navigate('/admin/shape-library')}
                      className="px-3 py-1.5 bg-white text-red-600 rounded-lg text-xs font-bold hover:bg-red-50 transition-colors">
                      📁 Upload SVGs to Shape Library →
                    </button>
                  )}
                  {hasMissingTokens && (
                    <button onClick={() => navigate('/admin/tokens', {
                      state: { fromUpload: true, skippedItems: result.skippedItems }
                    })}
                      className="px-3 py-1.5 bg-white text-red-600 rounded-lg text-xs font-bold hover:bg-red-50 transition-colors">
                      🔧 Fix Missing Tokens →
                    </button>
                  )}
                </div>
              </div>
              <div className="max-h-72 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-red-100 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-bold text-red-800">Item ID</th>
                      <th className="px-3 py-2 text-left font-bold text-red-800">Row</th>
                      <th className="px-3 py-2 text-left font-bold text-red-800">Missing SVG / Token</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-200">
                    {result.skippedItems.map((item, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-red-50/50'}>
                        <td className="px-3 py-2 font-mono font-bold text-gray-800">{item.itemId}</td>
                        <td className="px-3 py-2 text-gray-500 font-mono">{item.excelRow ? `${item.excelRow}` : '—'}</td>
                        <td className="px-3 py-2">
                          <div className="flex flex-col gap-1">
                            {item.unresolvedTokens?.map((t, j) => {
                              const isImgFile = String(t.token || '').startsWith('excel_img:');
                              const filename = isImgFile ? t.token.slice('excel_img:'.length) : null;
                              // For image files: extract folder/filename for clearer display
                              const parts = filename ? filename.split('/') : [];
                              const folder = parts.length > 1 ? parts[0] : null;
                              const file   = parts[parts.length - 1];
                              return (
                                <div key={j} className={`rounded px-2 py-1 text-[10px] font-mono ${isImgFile ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-700'}`}>
                                  <span className="font-bold">{t.field}: </span>
                                  {isImgFile ? (
                                    <>
                                      <span className="text-orange-600">📂 {folder && <span className="opacity-60">{folder}/</span>}</span>
                                      <span className="font-bold">{file}</span>
                                      <span className="ml-1 opacity-60">— upload to Shape Library</span>
                                    </>
                                  ) : (
                                    <span>{t.token}</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="bg-red-100 px-4 py-2 border-t border-red-200 text-xs text-red-700">
                {hasMissingFiles && <>Upload missing SVG files to the correct folder in <strong>Shape Library</strong>. </>}
                {hasMissingTokens && <>Add missing shape tokens in <strong>Token Manager</strong>. </>}
                Then re-upload this Excel file.
              </div>
            </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
