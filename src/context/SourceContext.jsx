/**
 * SourceContext — Global multi-tenant source selector
 *
 * Provides the "currently active source" to every page in the admin.
 * Persists the selection in localStorage so it survives page refreshes.
 *
 * Usage:
 *   const { activeSource, activeSourceId, setActiveSourceId, sources, loading } = useSource();
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const SourceContext = createContext(null);

export function SourceProvider({ children }) {
  const [sources, setSources]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [activeSourceId, _setActive]  = useState(
    () => localStorage.getItem('cognimap_active_source') || ''
  );

  // Load all sources once on mount
  const loadSources = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.get('/sources?active=true');
      setSources(d.sources || []);
    } catch (_) {
      setSources([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSources(); }, [loadSources]);

  const setActiveSourceId = (id) => {
    _setActive(id);
    if (id) localStorage.setItem('cognimap_active_source', id);
    else     localStorage.removeItem('cognimap_active_source');
  };

  const activeSource = sources.find(s => s.id === activeSourceId) || null;

  return (
    <SourceContext.Provider value={{
      sources,
      loading,
      activeSourceId,
      activeSource,
      setActiveSourceId,
      reloadSources: loadSources,
    }}>
      {children}
    </SourceContext.Provider>
  );
}

export function useSource() {
  const ctx = useContext(SourceContext);
  if (!ctx) throw new Error('useSource must be used inside <SourceProvider>');
  return ctx;
}
