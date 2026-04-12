/**
 * BatchFilter
 *
 * A lightweight dropdown filter for picking the active batch. Unlike
 * SourceSelectorBar (which is a big hero banner) this is a simple
 * inline form <select> that fits naturally inside filter toolbars.
 *
 * Props:
 *   className   – extra wrapper classes
 *   compact     – if true, renders a smaller inline version
 */

import { useBatch } from '../context/BatchContext';
import { Layers, ChevronDown } from 'lucide-react';

export default function BatchFilter({ className = '', compact = false }) {
  const { batches, activeBatchId, setActiveBatchId, loading } = useBatch();

  if (loading) return null;

  const sizeClasses = compact
    ? 'pl-8 pr-8 py-1.5 text-[11px]'
    : 'pl-9 pr-9 py-2 text-xs';

  return (
    <div className={`relative inline-block ${className}`}>
      <Layers
        size={compact ? 12 : 13}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500 pointer-events-none"
      />
      <select
        value={activeBatchId || ''}
        onChange={(e) => setActiveBatchId(e.target.value)}
        className={`${sizeClasses} bg-ivory-50 border-2 border-ivory-200 rounded-xl font-bold text-ink-dim focus:border-amber-400 focus:outline-none appearance-none transition-colors`}
      >
        <option value="">All Batches</option>
        {batches.map(b => (
          <option key={b.id} value={b.id}>
            {b.name}{b.code ? ` (${b.code})` : ''}
          </option>
        ))}
      </select>
      <ChevronDown
        size={compact ? 12 : 13}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none"
      />
    </div>
  );
}
