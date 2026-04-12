/**
 * SourceSelectorBar
 *
 * A context bar placed at the top of any admin page that needs source-scoped
 * data. Shows the active source and lets the admin switch quickly.
 *
 * Props:
 *   className   – extra wrapper classes
 *   compact     – if true, renders a smaller inline version (for use in headers)
 */

import { useState, useRef, useEffect } from 'react';
import { useSource } from '../context/SourceContext';
import { Building2, ChevronDown, Globe, X, Check } from 'lucide-react';

const TYPE_EMOJI = { school: '🏫', tuition: '📚', company: '🏢', clinic: '🏥', other: '🔷' };

export default function SourceSelectorBar({ className = '', compact = false }) {
  const { sources, activeSource, activeSourceId, setActiveSourceId, loading } = useSource();
  const [open, setOpen] = useState(false);
  const ref = useRef();

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (loading) return null;

  // ── Compact inline trigger (for use inside page headers) ──
  if (compact) {
    return (
      <div ref={ref} className={`relative inline-block ${className}`}>
        <button
          onClick={() => setOpen(o => !o)}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border-2 text-xs font-bold transition-all ${
            activeSource
              ? 'border-amber-300 bg-amber-50 text-amber-700 hover:border-amber-400'
              : 'border-ivory-200 bg-white text-ink-dim hover:border-amber-200'
          }`}
        >
          <Building2 size={13} className={activeSource ? 'text-amber-600' : 'text-ink-faint'} />
          <span>{activeSource ? activeSource.display_name : 'All Sources'}</span>
          <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && <DropdownMenu sources={sources} activeSourceId={activeSourceId} setActiveSourceId={setActiveSourceId} onClose={() => setOpen(false)} />}
      </div>
    );
  }

  // ── Full banner bar ──
  return (
    <div ref={ref} className={`relative ${className}`}>
      <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all ${
        activeSource
          ? 'border-amber-200 bg-amber-50'
          : 'border-ivory-200 bg-white'
      }`}>
        {/* Icon */}
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-base ${
          activeSource ? 'bg-amber-100' : 'bg-ivory-100'
        }`}>
          {activeSource ? (TYPE_EMOJI[activeSource.type] || '🔷') : <Globe size={16} className="text-ink-faint" />}
        </div>

        {/* Label */}
        <div className="flex-1 min-w-0">
          <div className={`text-[11px] font-bold uppercase tracking-wider ${activeSource ? 'text-amber-600' : 'text-ink-faint'}`}>
            {activeSource ? 'Viewing data for' : 'Source'}
          </div>
          <div className={`text-sm font-black truncate ${activeSource ? 'text-amber-800' : 'text-ink-dim'}`}>
            {activeSource ? activeSource.display_name : 'All Sources (no filter)'}
          </div>
        </div>

        {/* Source code pill */}
        {activeSource && (
          <code className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-lg text-[11px] font-mono font-bold flex-shrink-0">
            #{activeSource.source_code}
          </code>
        )}

        {/* Clear button */}
        {activeSource && (
          <button
            onClick={(e) => { e.stopPropagation(); setActiveSourceId(''); }}
            className="p-1.5 rounded-lg hover:bg-amber-200 text-amber-600 transition-colors flex-shrink-0"
            title="Clear source filter"
          >
            <X size={14} />
          </button>
        )}

        {/* Switch button */}
        <button
          onClick={() => setOpen(o => !o)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all flex-shrink-0 ${
            activeSource
              ? 'border-amber-300 bg-white text-amber-700 hover:border-amber-400'
              : 'border-ivory-200 bg-ivory-50 text-ink-dim hover:border-amber-200 hover:text-amber-700'
          }`}
        >
          Switch
          <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Dropdown */}
      {open && (
        <DropdownMenu
          sources={sources}
          activeSourceId={activeSourceId}
          setActiveSourceId={setActiveSourceId}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

// ─── Shared dropdown ──────────────────────────────────────────────────────────
function DropdownMenu({ sources, activeSourceId, setActiveSourceId, onClose }) {
  const select = (id) => { setActiveSourceId(id); onClose(); };

  return (
    <div className="absolute top-full left-0 mt-2 w-72 bg-white border-2 border-ivory-200 rounded-2xl shadow-xl z-50 overflow-hidden">
      {/* All sources option */}
      <button
        onClick={() => select('')}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-ivory-50 transition-colors border-b border-ivory-100 ${
          !activeSourceId ? 'bg-ivory-50' : ''
        }`}
      >
        <div className="w-8 h-8 rounded-xl bg-ivory-100 flex items-center justify-center flex-shrink-0">
          <Globe size={15} className="text-ink-faint" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-ink">All Sources</div>
          <div className="text-[11px] text-ink-faint">No filter applied</div>
        </div>
        {!activeSourceId && <Check size={14} className="text-amber-500 flex-shrink-0" />}
      </button>

      {/* Source list */}
      <div className="max-h-60 overflow-auto">
        {sources.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-ink-faint">
            No sources created yet. Go to Onboarding → Sources.
          </div>
        ) : (
          sources.map(src => (
            <button
              key={src.id}
              onClick={() => select(src.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-amber-50 transition-colors ${
                activeSourceId === src.id ? 'bg-amber-50' : ''
              }`}
            >
              <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-base flex-shrink-0">
                {TYPE_EMOJI[src.type] || '🔷'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-ink truncate">{src.display_name}</div>
                <div className="flex items-center gap-1.5">
                  <code className="text-[10px] text-slate-500 font-mono">#{src.source_code}</code>
                  {src.city && <span className="text-[10px] text-ink-faint">· {src.city}</span>}
                  <span className="text-[10px] text-ink-faint">· {src.user_count || 0} users</span>
                </div>
              </div>
              {activeSourceId === src.id && <Check size={14} className="text-amber-500 flex-shrink-0" />}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
