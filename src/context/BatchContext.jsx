/**
 * BatchContext — Global batch selector
 *
 * Provides the "currently active batch" to every page in the admin.
 * Batches are groupings of students within a single college (replacing the
 * older multi-tenant `sources` concept).
 *
 * Persists the selection in localStorage so it survives page refreshes.
 *
 * Usage:
 *   const { activeBatch, activeBatchId, setActiveBatchId, batches, loading, refreshBatches } = useBatch();
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const BatchContext = createContext(null);

export function BatchProvider({ children }) {
  const [batches, setBatches]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [activeBatchId, _setActive]   = useState(
    () => localStorage.getItem('cognimap_active_batch') || ''
  );

  // Load all batches once on mount
  const loadBatches = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.get('/batches');
      setBatches(d.batches || []);
    } catch (_) {
      setBatches([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadBatches(); }, [loadBatches]);

  const setActiveBatchId = (id) => {
    _setActive(id);
    if (id) localStorage.setItem('cognimap_active_batch', id);
    else    localStorage.removeItem('cognimap_active_batch');
  };

  const activeBatch = batches.find(b => b.id === activeBatchId) || null;

  return (
    <BatchContext.Provider value={{
      batches,
      loading,
      activeBatchId,
      activeBatch,
      setActiveBatchId,
      refreshBatches: loadBatches,
    }}>
      {children}
    </BatchContext.Provider>
  );
}

export function useBatch() {
  const ctx = useContext(BatchContext);
  if (!ctx) throw new Error('useBatch must be used inside <BatchProvider>');
  return ctx;
}
