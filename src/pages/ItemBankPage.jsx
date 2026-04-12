import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Upload, X, Filter as FilterIcon } from 'lucide-react';
import api from '../utils/api';
import { useSource } from '../context/SourceContext';

// ── Test type → domains mapping ──
const TEST_TYPES = [
  { id: 'all',         label: 'All',          domains: null },
  { id: 'cognitive',   label: 'Cognitive',     domains: ['gf','gv','gq','gc','gs','gwm'] },
  { id: 'personality', label: 'Personality',  domains: ['personality'] },
  { id: 'interest',    label: 'Interest',     domains: ['interest'] },
];

const DOMAIN_LABELS = {
  gf:  'Gf · Fluid Reasoning',
  gv:  'Gv · Visual Spatial',
  gq:  'Gq · Quantitative',
  gc:  'Gc · Verbal',
  gs:  'Gs · Processing Speed',
  gwm: 'Gwm · Working Memory',
  personality: 'Personality',
  interest: 'Interest',
};
const DOMAIN_SHORT = {
  gf: 'Gf', gv: 'Gv', gq: 'Gq', gc: 'Gc', gs: 'Gs', gwm: 'Gwm',
  personality: 'Pers', interest: 'Int',
};

const DIFFICULTY_LABELS = { 1: 'Easy', 2: 'Medium', 3: 'Hard', 4: 'Very Hard' };

export default function ItemBankPage() {
  const { activeSource } = useSource();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    testType: 'all',
    domain: '',
    difficulty: '',
    audience: '',
    role: '',
    isActive: 'true',
    isPractice: '',
    search: '',
  });

  // ── Fetch items ──
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 25 });
      if (filters.domain) {
        params.set('domain', filters.domain);
      } else if (filters.testType !== 'all') {
        const tt = TEST_TYPES.find(t => t.id === filters.testType);
        if (tt?.domains?.length === 1) params.set('domain', tt.domains[0]);
      }
      if (filters.difficulty)  params.set('difficulty', filters.difficulty);
      if (filters.audience)    params.set('audience', filters.audience);
      if (filters.role)        params.set('role', filters.role);
      if (filters.isActive)    params.set('isActive', filters.isActive);
      if (filters.isPractice)  params.set('isPractice', filters.isPractice);
      if (filters.search)      params.set('search', filters.search);

      const data = await api.get(`/items?${params}`);
      let fetched = data.items || [];

      // Client-side filter for test type with multi-domain (e.g. aptitude → 6 domains)
      if (filters.testType !== 'all' && !filters.domain) {
        const tt = TEST_TYPES.find(t => t.id === filters.testType);
        if (tt?.domains?.length > 1) {
          fetched = fetched.filter(i => tt.domains.includes(i.domain));
        }
      }

      setItems(fetched);
      setTotal(data.pagination?.total ?? data.total ?? fetched.length);
    } catch {
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  // ── Fetch stats once on mount and when source changes ──
  const fetchStats = useCallback(async () => {
    try {
      const data = await api.get('/items/stats');
      setStats(data || {});
    } catch { setStats({}); }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);
  useEffect(() => { fetchStats(); }, [fetchStats, activeSource?.id]);

  const updateFilter = (key, val) => { setFilters(f => ({ ...f, [key]: val })); setPage(1); };
  const clearFilters = () => {
    setFilters({ testType: 'all', domain: '', difficulty: '', audience: '', role: '', isActive: 'true', isPractice: '', search: '' });
    setPage(1);
  };

  // Available domains based on test type
  const availableDomains = useMemo(() => {
    const tt = TEST_TYPES.find(t => t.id === filters.testType);
    return tt?.domains || Object.keys(DOMAIN_LABELS);
  }, [filters.testType]);

  // Active filters count for clear button
  const activeFiltersCount = Object.entries(filters).filter(([k, v]) => v && !(k === 'isActive' && v === 'true') && !(k === 'testType' && v === 'all')).length;

  // Pill group helper
  const PillGroup = ({ value, onChange, options }) => (
    <div
      className="flex gap-1 p-1 rounded-md"
      style={{ background: 'var(--warm)', border: '1px solid var(--border)' }}
    >
      {options.map(o => {
        const active = value === o.v;
        return (
          <button
            key={o.v}
            onClick={() => onChange(o.v)}
            className="px-3 py-1 rounded-sm text-[10px] font-medium uppercase tracking-wider transition-all"
            style={
              active
                ? { background: 'var(--blush-pale)', color: 'var(--blush)' }
                : { background: 'transparent', color: 'var(--slate)' }
            }
          >
            {o.l}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="page">
      {/* Compact sticky topbar */}
      <div
        className="sticky top-0 z-30 flex items-center justify-between px-6 lg:px-8 py-3"
        style={{ background: 'var(--warm)', borderBottom: '1px solid var(--border)' }}
      >
        <div>
          <h1 className="font-display text-[19px]" style={{ color: 'var(--ink)' }}>
            Item bank
          </h1>
          <p className="text-[11.5px] mt-0.5" style={{ color: 'var(--slate-light)' }}>
            {total} item{total !== 1 ? 's' : ''}
            {activeSource && <> · {activeSource.display_name}</>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/admin/items/upload" className="btn-primary">
            <Upload size={14} /> Upload Items
          </Link>
        </div>
      </div>

      <div className="px-6 lg:px-8 py-5 max-w-[1280px] mx-auto space-y-5">
        {/* ── Stats strip ── */}
        {stats && (stats.cognitive || stats.personality || stats.interest) && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 stagger">
            {[
              { id: 'cognitive',   label: 'COGNITIVE',   value: stats.cognitive?.total || 0 },
              { id: 'personality', label: 'PERSONALITY', value: stats.personality?.total || 0 },
              { id: 'interest',    label: 'INTEREST',    value: stats.interest?.total || 0 },
            ].map(s => (
              <button
                key={s.id}
                onClick={() => updateFilter('testType', s.id)}
                className="stat-tile text-left"
                style={
                  filters.testType === s.id
                    ? { borderColor: 'var(--blush)', boxShadow: '0 0 0 1.5px var(--blush-pale)' }
                    : undefined
                }
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="stat-tile-label">{s.label}</div>
                </div>
                <div className="stat-tile-value tabular-nums">{s.value}</div>
                <div className="stat-tile-sub">Items available</div>
              </button>
            ))}
          </div>
        )}

        {/* ── Test Type Tabs ── */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="label-overline">Filter by type</span>
          <div
            className="flex gap-1 p-1 rounded-md"
            style={{ background: 'var(--warm)', border: '1px solid var(--border)' }}
          >
            {TEST_TYPES.map(t => {
              const isOn = filters.testType === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => { updateFilter('testType', t.id); updateFilter('domain', ''); }}
                  className="px-5 py-2 rounded-sm text-xs font-medium transition-all"
                  style={
                    isOn
                      ? { background: 'var(--blush-pale)', color: 'var(--blush)' }
                      : { background: 'transparent', color: 'var(--slate)' }
                  }
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Filter Bar ── */}
        <div className="card p-4">
          <div className="flex flex-wrap items-end gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[240px]">
              <label className="label-overline block mb-2">Search</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--slate-light)' }} />
                <input
                  type="text"
                  value={filters.search}
                  onChange={e => updateFilter('search', e.target.value)}
                  className="input-field pl-9"
                  placeholder="Search by item code or template..."
                />
              </div>
            </div>

            {/* Domain (only when test type allows multiple domains) */}
            {availableDomains.length > 1 && (
              <div className="min-w-[180px]">
                <label className="label-overline block mb-2">Domain</label>
                <select
                  value={filters.domain}
                  onChange={e => updateFilter('domain', e.target.value)}
                  className="input-field text-xs font-semibold"
                >
                  <option value="">All domains</option>
                  {availableDomains.map(d => <option key={d} value={d}>{DOMAIN_LABELS[d]}</option>)}
                </select>
              </div>
            )}

            {/* Difficulty */}
            <div className="min-w-[140px]">
              <label className="label-overline block mb-2">Difficulty</label>
              <select
                value={filters.difficulty}
                onChange={e => updateFilter('difficulty', e.target.value)}
                className="input-field text-xs font-semibold"
              >
                <option value="">All</option>
                {[1,2,3,4].map(d => <option key={d} value={d}>{d} — {DIFFICULTY_LABELS[d]}</option>)}
              </select>
            </div>

            {/* Audience */}
            <div className="min-w-[130px]">
              <label className="label-overline block mb-2">Audience</label>
              <select
                value={filters.audience}
                onChange={e => updateFilter('audience', e.target.value)}
                className="input-field text-xs font-semibold"
              >
                <option value="">Everyone</option>
                <option value="student">Students</option>
                <option value="employee">Employees</option>
                <option value="both">Both</option>
              </select>
            </div>

            {/* Role */}
            <div className="min-w-[140px]">
              <label className="label-overline block mb-2">Item Role</label>
              <select
                value={filters.role}
                onChange={e => updateFilter('role', e.target.value)}
                className="input-field text-xs font-semibold"
              >
                <option value="">All</option>
                <option value="core">Core</option>
                <option value="transitional">Transitional</option>
                <option value="anchor">Anchor</option>
                <option value="ceiling">Ceiling</option>
              </select>
            </div>

            {/* Status toggle pills */}
            <div>
              <label className="label-overline block mb-2">Status</label>
              <PillGroup
                value={filters.isActive}
                onChange={v => updateFilter('isActive', v)}
                options={[
                  { v: 'true',  l: 'Active' },
                  { v: '',      l: 'All' },
                  { v: 'false', l: 'Inactive' },
                ]}
              />
            </div>

            {/* Practice toggle */}
            <div>
              <label className="label-overline block mb-2">Type</label>
              <PillGroup
                value={filters.isPractice}
                onChange={v => updateFilter('isPractice', v)}
                options={[
                  { v: '',      l: 'All' },
                  { v: 'false', l: 'Real' },
                  { v: 'true',  l: 'Practice' },
                ]}
              />
            </div>

            {/* Clear filters */}
            {activeFiltersCount > 0 && (
              <button
                onClick={clearFilters}
                className="btn-ghost text-[11px]"
                style={{ color: 'var(--blush)' }}
              >
                <X size={12} /> Clear ({activeFiltersCount})
              </button>
            )}
          </div>
        </div>

        {/* ── Table ── */}
        <div className="card overflow-hidden animate-fade-up">
          <div className="overflow-x-auto">
            <table className="table-pro">
              <thead>
                <tr>
                  {['Item Code','Domain','Template','Difficulty','Age','Role','Status'].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="text-center" style={{ color: 'var(--slate-light)' }}>Loading items...</td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan={7} className="!py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div
                        className="w-14 h-14 rounded-md flex items-center justify-center"
                        style={{ background: 'var(--warm)' }}
                      >
                        <FilterIcon size={24} style={{ color: 'var(--slate-light)' }} />
                      </div>
                      <div className="font-display text-[16px]" style={{ color: 'var(--ink)' }}>
                        {total === 0 && activeFiltersCount === 0
                          ? 'No items in this source yet'
                          : 'No items match your filters'}
                      </div>
                      {total === 0 && activeFiltersCount === 0 && (
                        <Link to="/admin/items/upload" className="text-xs font-medium hover:underline" style={{ color: 'var(--blush)' }}>
                          Upload your first batch →
                        </Link>
                      )}
                      {activeFiltersCount > 0 && (
                        <button onClick={clearFilters} className="text-xs font-medium hover:underline" style={{ color: 'var(--blush)' }}>
                          Clear filters
                        </button>
                      )}
                    </div>
                  </td></tr>
                ) : items.map(item => (
                  <tr key={item.id} className="cursor-pointer">
                    <td className="font-mono text-xs font-semibold">{item.item_code}</td>
                    <td>
                      <span className="chip">{DOMAIN_SHORT[item.domain] || item.domain}</span>
                    </td>
                    <td className="text-xs" style={{ color: 'var(--slate)' }}>{item.template || '—'}</td>
                    <td>
                      <span
                        className="inline-flex items-center justify-center w-6 h-6 rounded-sm text-xs font-semibold tabular-nums"
                        style={{ background: 'var(--warm)', color: 'var(--ink)', border: '1px solid var(--border)' }}
                      >
                        {item.difficulty_level || '—'}
                      </span>
                    </td>
                    <td className="text-[11px] tabular-nums" style={{ color: 'var(--slate)' }}>
                      {item.age_band_min || '—'}–{item.age_band_max === 99 ? '∞' : item.age_band_max || '—'}
                    </td>
                    <td className="text-[11px] capitalize" style={{ color: 'var(--slate)' }}>{item.role || '—'}</td>
                    <td>
                      {item.is_active ? (
                        <span className="badge badge-sage">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--sage)' }}/> Active
                        </span>
                      ) : (
                        <span className="badge badge-slate">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--slate-light)' }}/> Inactive
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Pagination ── */}
        {total > 25 && (
          <div className="flex items-center justify-between">
            <span className="text-xs tabular-nums" style={{ color: 'var(--slate)' }}>
              Page {page} of {Math.ceil(total/25)} · {total} total
            </span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
                className="btn-secondary disabled:opacity-30 !px-4 !py-2 text-xs">
                ← Prev
              </button>
              <button onClick={() => setPage(p => p+1)} disabled={page >= Math.ceil(total/25)}
                className="btn-secondary disabled:opacity-30 !px-4 !py-2 text-xs">
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
