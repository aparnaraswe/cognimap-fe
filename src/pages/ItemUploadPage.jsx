import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useSource } from '../context/SourceContext';
import {
  Upload, FileSpreadsheet, ArrowLeft, ArrowRight, CheckCircle2,
  AlertTriangle, Wrench, MapPin, RefreshCw, FolderOpen
} from 'lucide-react';

export default function ItemUploadPage() {
  const [file, setFile] = useState(null);
  const [domain, setDomain] = useState('gf');
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const fileRef = useRef();
  const navigate = useNavigate();
  const { activeSource, activeSourceId } = useSource();

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
    if (!activeSourceId) {
      setError('No active source selected. Please pick a source first.');
      return;
    }
    setUploading(true);
    setError('');
    try {
      // Items are uploaded into the currently active source.
      // The backend reads the X-Source-Id header automatically via api.js,
      // and we also pass sourceIds in the form for clarity.
      const data = await api.upload('/items/upload', file, {
        domain,
        confirm: 'true',
        sourceIds: JSON.stringify([activeSourceId]),
      });
      setResult(data);
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="page">
      {/* Compact sticky topbar */}
      <div
        className="sticky top-0 z-30 flex items-center justify-between px-6 lg:px-8 py-3"
        style={{ background: 'var(--warm)', borderBottom: '1px solid var(--border)' }}
      >
        <div>
          <h1 className="font-display text-[19px]" style={{ color: 'var(--ink)' }}>
            Upload Items
          </h1>
          <p className="text-[11.5px] mt-0.5" style={{ color: 'var(--slate-light)' }}>
            Import questions from an Excel or CSV file
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/admin/items')} className="btn-secondary">
            <ArrowLeft size={14} /> Back to Item Bank
          </button>
        </div>
      </div>

      <div className="px-6 lg:px-8 py-5 max-w-2xl mx-auto space-y-4">
        <div className="card p-6">
          <p className="text-[13px]" style={{ color: 'var(--slate)' }}>
            Multi-sheet files are supported — each sheet can be a different domain.
            The domain is read from each row's <code className="chip">domain</code> column.
          </p>
        </div>

        {/* Domain selector (fallback only) */}
        <div className="card p-5">
          <label className="label-overline block mb-2">Default domain (fallback if not in Excel)</label>
          <select
            value={domain}
            onChange={e => setDomain(e.target.value)}
            className="input-field"
          >
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

        {/* Active source banner */}
        {activeSource && (
          <div
            className="flex items-center gap-2.5 px-4 py-3 rounded-lg"
            style={{ background: 'var(--gold-pale)', border: '1px solid var(--gold-pale)' }}
          >
            <MapPin size={14} style={{ color: 'var(--gold)' }} />
            <span className="text-xs" style={{ color: 'var(--slate)' }}>
              Uploading to <strong className="font-medium" style={{ color: 'var(--ink)' }}>{activeSource.display_name}</strong>
              <code className="ml-2 text-[10px] font-mono" style={{ color: 'var(--gold)' }}>#{activeSource.source_code}</code>
            </span>
          </div>
        )}

        {/* Drop zone */}
        <div
          onClick={() => fileRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          className="rounded-lg p-10 text-center cursor-pointer transition-all"
          style={{
            border: file ? '1.5px dashed var(--blush)' : '1.5px dashed var(--border)',
            background: file ? 'var(--blush-pale)' : 'var(--warm)',
          }}
        >
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleDrop} className="hidden" />
          {file ? (
            <>
              <FileSpreadsheet size={32} className="mx-auto mb-2" style={{ color: 'var(--blush)' }} />
              <div className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{file.name}</div>
              <div className="text-[11px] mt-1 tabular-nums" style={{ color: 'var(--slate-light)' }}>
                {(file.size / 1024).toFixed(1)} KB
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setFile(null); setResult(null); }}
                className="text-[11px] font-medium mt-2 hover:underline"
                style={{ color: 'var(--blush)' }}
              >
                Remove
              </button>
            </>
          ) : (
            <>
              <Upload size={28} className="mx-auto mb-2" style={{ color: 'var(--slate-light)' }} />
              <div className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Drop your Excel or CSV file here</div>
              <div className="text-[11px] mt-1" style={{ color: 'var(--slate-light)' }}>or click to browse</div>
            </>
          )}
        </div>

        {/* Expected format hint */}
        <div
          className="rounded-lg p-4 text-[11.5px] leading-relaxed"
          style={{ background: 'var(--warm)', border: '1px solid var(--border)', color: 'var(--slate)' }}
        >
          <strong style={{ color: 'var(--ink)' }}>Required columns:</strong> itemId, template, difficultyLevel, option1, option2, option3, correctIndex (1-based)<br />
          <strong style={{ color: 'var(--ink)' }}>Recommended:</strong> prompt, sequence (arrow-separated), displayMode, option1Label/Tag, role (core/transitional/anchor/ceiling), ageBandMin, ageBandMax, timeLimitSec<br />
          <strong style={{ color: 'var(--ink)' }}>Visual items (Gf/Gv):</strong> Use sequence column like "triangle_top → circle_bottom → ?" with shape tokens as option values<br />
          <strong style={{ color: 'var(--ink)' }}>Text items (Gq/Gc/Gs):</strong> Use prompt for the question text, option values and labels as plain text. Sequence can hold passage text.
        </div>

        {/* Error */}
        {error && (
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium"
            style={{ background: 'var(--blush-pale)', border: '1px solid var(--blush)', color: 'var(--blush)' }}
          >
            <AlertTriangle size={14} /> {error}
          </div>
        )}

        {/* Upload button */}
        {file && !result && (
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="btn-primary w-full"
          >
            <Upload size={14} /> {uploading ? 'Uploading...' : `Upload ${file.name}`}
          </button>
        )}

        {/* Result */}
        {result && (
          <div className="space-y-3">
            {/* Validation Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="stat-tile">
                <div className="stat-tile-label">Imported</div>
                <div className="stat-tile-value tabular-nums" style={{ color: 'var(--sage)' }}>{result.inserted || 0}</div>
                <div className="stat-tile-sub">New items added</div>
              </div>
              <div className="stat-tile">
                <div className="stat-tile-label">Updated</div>
                <div className="stat-tile-value tabular-nums">{result.updated || 0}</div>
                <div className="stat-tile-sub">Existing refreshed</div>
              </div>
              <div className="stat-tile">
                <div className="stat-tile-label">Rejected</div>
                <div
                  className="stat-tile-value tabular-nums"
                  style={{ color: result.skipped > 0 ? 'var(--blush)' : 'var(--slate-light)' }}
                >
                  {result.skipped || 0}
                </div>
                <div className="stat-tile-sub">
                  {result.skipped > 0 ? 'Missing SVG / token' : 'No issues'}
                </div>
              </div>
            </div>

            {/* Summary banner */}
            <div
              className="rounded-lg p-5"
              style={
                result.skipped > 0
                  ? { background: 'var(--gold-pale)', border: '1px solid var(--gold)' }
                  : { background: 'var(--sage-pale)', border: '1px solid var(--sage)' }
              }
            >
              <div className="flex items-start gap-2">
                {result.skipped > 0
                  ? <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--gold)' }} />
                  : <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--sage)' }} />}
                <div className="flex-1">
                  <div
                    className="font-display text-[15px] mb-1"
                    style={{ color: result.skipped > 0 ? 'var(--gold)' : 'var(--sage)' }}
                  >
                    {result.skipped > 0
                      ? `Partial Upload: ${result.inserted + result.updated} items added, ${result.skipped} rejected`
                      : 'Upload Complete — All items validated and added'}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--slate)' }}>
                    {result.skipped > 0 ? (
                      <>Items with missing SVG files or unresolved shape tokens were <strong>not added</strong> to your item bank. Fix the issues below and re-upload to import them.</>
                    ) : (
                      <>All items passed validation and are ready to use.</>
                    )}
                  </div>
                  <div className="text-xs space-y-1 mt-2" style={{ color: 'var(--slate)' }}>
                    {result.sheets && <div>Sheets processed: {result.sheets.join(', ')}</div>}
                    {result.errors > 0 && <div style={{ color: 'var(--gold)' }}>{result.errors} parse errors</div>}
                    {result.errorDetails?.length > 0 && (
                      <div
                        className="mt-2 rounded-md p-3 max-h-32 overflow-auto"
                        style={{ background: 'var(--card)', color: 'var(--blush)' }}
                      >
                        {result.errorDetails.map((e, i) => <div key={i}>{e.itemId}: {e.error}</div>)}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <button
                      onClick={() => navigate('/admin/items')}
                      className="btn-primary !px-4 !py-2 text-xs"
                    >
                      View Item Bank <ArrowRight size={12} />
                    </button>
                    {result.skipped > 0 && (
                      <button
                        onClick={() => navigate('/admin/tokens', {
                          state: { fromUpload: true, skippedItems: result.skippedItems || [] }
                        })}
                        className="btn-secondary !px-4 !py-2 text-xs"
                      >
                        <Wrench size={12} /> Fix {result.skipped} Missing Shape{result.skipped !== 1 ? 's' : ''}
                      </button>
                    )}
                  </div>
                  {result.batteries && result.batteries.length > 0 && (
                    <div
                      className="mt-3 p-3 rounded-lg"
                      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
                    >
                      <div className="text-xs font-medium mb-1" style={{ color: 'var(--ink)' }}>
                        Auto-created batteries
                      </div>
                      {result.batteries.map((b, i) => (
                        <div key={i} className="text-xs" style={{ color: 'var(--slate)' }}>
                          {b.name} ({b.sections} section{b.sections !== 1 ? 's' : ''})
                        </div>
                      ))}
                      <button
                        onClick={() => navigate('/admin/sessions/assign')}
                        className="btn-primary !px-3 !py-1.5 text-[11px] mt-2"
                      >
                        Assign to Students <ArrowRight size={12} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Skipped items detail */}
            {result.skippedItems && result.skippedItems.length > 0 && (() => {
              const allTokens = result.skippedItems.flatMap(it => it.unresolvedTokens || []);
              const hasMissingFiles = allTokens.some(t => t.token && String(t.token).startsWith('excel_img:'));
              const hasMissingTokens = allTokens.some(t => !String(t.token || '').startsWith('excel_img:'));
              return (
                <div
                  className="rounded-lg overflow-hidden"
                  style={{ border: '1px solid var(--blush)' }}
                >
                  <div
                    className="px-4 py-3 flex items-start justify-between gap-3"
                    style={{ background: 'var(--blush-pale)', borderBottom: '1px solid var(--blush)' }}
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--blush)' }} />
                      <div className="min-w-0">
                        <div className="font-medium text-sm" style={{ color: 'var(--blush)' }}>
                          {result.skippedItems.length} item{result.skippedItems.length !== 1 ? 's' : ''} rejected — not added to your item bank
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: 'var(--slate)' }}>
                          {hasMissingFiles && hasMissingTokens
                            ? 'Some items are missing SVG files, others have unresolved shape tokens.'
                            : hasMissingFiles
                              ? 'Missing SVG files — upload them to Shape Library and re-import this Excel.'
                              : 'Unresolved shape tokens — define them in Token Manager and re-import this Excel.'}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      {hasMissingFiles && (
                        <button
                          onClick={() => navigate('/admin/shape-library')}
                          className="btn-secondary !px-3 !py-1.5 text-[11px]"
                        >
                          <FolderOpen size={12} /> Shape Library
                        </button>
                      )}
                      {hasMissingTokens && (
                        <button
                          onClick={() => navigate('/admin/tokens', {
                            state: { fromUpload: true, skippedItems: result.skippedItems }
                          })}
                          className="btn-secondary !px-3 !py-1.5 text-[11px]"
                        >
                          <Wrench size={12} /> Fix Tokens
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    <table className="table-pro">
                      <thead>
                        <tr>
                          <th>Item ID</th>
                          <th>Row</th>
                          <th>Missing SVG / Token</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.skippedItems.map((item, i) => (
                          <tr key={i}>
                            <td className="font-mono font-medium">{item.itemId}</td>
                            <td className="font-mono tabular-nums" style={{ color: 'var(--slate)' }}>
                              {item.excelRow ? `${item.excelRow}` : '—'}
                            </td>
                            <td>
                              <div className="flex flex-col gap-1">
                                {item.unresolvedTokens?.map((t, j) => {
                                  const isImgFile = String(t.token || '').startsWith('excel_img:');
                                  const filename = isImgFile ? t.token.slice('excel_img:'.length) : null;
                                  const parts = filename ? filename.split('/') : [];
                                  const folder = parts.length > 1 ? parts[0] : null;
                                  const fname = parts[parts.length - 1];
                                  return (
                                    <div
                                      key={j}
                                      className="rounded-md px-2 py-1 text-[10px] font-mono"
                                      style={
                                        isImgFile
                                          ? { background: 'var(--gold-pale)', color: 'var(--gold)' }
                                          : { background: 'var(--blush-pale)', color: 'var(--blush)' }
                                      }
                                    >
                                      <span className="font-medium">{t.field}: </span>
                                      {isImgFile ? (
                                        <>
                                          {folder && <span className="opacity-60">{folder}/</span>}
                                          <span className="font-medium">{fname}</span>
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
                  <div
                    className="px-4 py-2 text-xs"
                    style={{ background: 'var(--warm)', borderTop: '1px solid var(--border)', color: 'var(--slate)' }}
                  >
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
    </div>
  );
}
