import { useState, useEffect, useCallback } from 'react';
import { fetchState, SentinelState } from './usePolling';

export function useStatePolling(intervalMs = 3000) {
  const [state, setState] = useState<SentinelState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchState();
      setState(data);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, intervalMs);
    return () => clearInterval(id);
  }, [refresh, intervalMs]);

  return { state, error, refresh };
}