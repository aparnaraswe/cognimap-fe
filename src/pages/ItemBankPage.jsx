import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';

const DOMAINS = ['gf','gv','gq','gc','gs','personality','interest'];
const DOMAIN_LABELS = { gf:'Fluid Reasoning', gv:'Visual Spatial', gq:'Quantitative', gc:'Verbal', gs:'Processing Speed', personality:'Personality', interest:'Interest' };

export default function ItemBankPage() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ domain: '', difficulty: '', search: '' });

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 25 });
      if (filters.domain) params.set('domain', filters.domain);
      if (filters.difficulty) params.set('difficulty', filters.difficulty);
      if (filters.search) params.set('search', filters.search);
      const data = await api.get(`/items?${params}`);
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch {
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const updateFilter = (key, val) => { setFilters(f => ({...f, [key]: val})); setPage(1); };

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-black text-ink">Item Bank</h1>
          <p className="text-xs text-ink-dim mt-0.5">{total} items across all domains</p>
        </div>
        <Link to="/admin/items/upload"
          className="px-5 py-2.5 bg-copper text-white font-bold rounded-xl text-sm shadow-[0_3px_0_#92400E] hover:-translate-y-0.5 active:translate-y-0.5 transition-all">
          ⬆️ Upload Items
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select value={filters.domain} onChange={e => updateFilter('domain', e.target.value)}
          className="px-3 py-2 bg-white border-2 border-ivory-200 rounded-xl text-xs font-bold text-ink-dim outline-none focus:border-gold">
          <option value="">All Domains</option>
          {DOMAINS.map(d => <option key={d} value={d}>{DOMAIN_LABELS[d]}</option>)}
        </select>
        <select value={filters.difficulty} onChange={e => updateFilter('difficulty', e.target.value)}
          className="px-3 py-2 bg-white border-2 border-ivory-200 rounded-xl text-xs font-bold text-ink-dim outline-none focus:border-gold">
          <option value="">All Difficulty</option>
          {[1,2,3,4,5,6,7,8,9,10].map(d => <option key={d} value={d}>Level {d}</option>)}
        </select>
        <input type="text" value={filters.search} onChange={e => updateFilter('search', e.target.value)}
          className="px-3 py-2 bg-white border-2 border-ivory-200 rounded-xl text-xs font-semibold text-ink-DEFAULT outline-none focus:border-gold w-48"
          placeholder="Search by item code..."/>
      </div>

      {/* Table */}
      <div className="bg-white border-2 border-ivory-200 rounded-2xl overflow-hidden mb-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-ivory-200 bg-ivory-100">
              {['Item Code','Domain','Template','Difficulty','Role','Active'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[10px] font-bold text-ink-faint uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-ink-faint">Loading items...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-ink-faint">
                No items found. {!total ? 'Upload items from Excel to get started.' : 'Try adjusting filters.'}
              </td></tr>
            ) : items.map(item => (
              <tr key={item.id} className="border-b border-ivory-200/50 hover:bg-ivory-100/50 transition-colors cursor-pointer">
                <td className="px-4 py-3 font-bold font-mono text-xs">{item.item_code}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-ivory-100 text-ink-dim">
                    {DOMAIN_LABELS[item.domain] || item.domain}
                  </span>
                </td>
                <td className="px-4 py-3 text-ink-dim text-xs">{item.template}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-ivory-100 text-xs font-bold text-ink-dim">
                    {item.difficulty_level}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-ink-faint capitalize">{item.role || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`w-2 h-2 rounded-full inline-block ${item.is_active ? 'bg-emerald-400' : 'bg-ivory-200'}`}/>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 25 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-ink-faint">Page {page} of {Math.ceil(total/25)}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
              className="px-3 py-1.5 bg-white border-2 border-ivory-200 rounded-xl text-xs font-bold text-ink-dim disabled:opacity-30 hover:border-gold transition-colors">
              ← Prev
            </button>
            <button onClick={() => setPage(p => p+1)} disabled={page >= Math.ceil(total/25)}
              className="px-3 py-1.5 bg-white border-2 border-ivory-200 rounded-xl text-xs font-bold text-ink-dim disabled:opacity-30 hover:border-gold transition-colors">
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
