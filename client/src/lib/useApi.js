import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';

// GET with loading/error state; `reload` refetches. Pass null as url to skip.
export function useApi(url, params) {
  const key = JSON.stringify(params || {});
  const [state, setState] = useState({ data: null, error: null, loading: Boolean(url) });
  const seq = useRef(0);

  const load = useCallback(async () => {
    if (!url) return;
    const id = ++seq.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await api.get(url, { params: JSON.parse(key) });
      if (id === seq.current) setState({ data: res.data, error: null, loading: false });
    } catch (error) {
      if (id === seq.current) setState({ data: null, error, loading: false });
    }
  }, [url, key]);

  useEffect(() => { load(); }, [load]);

  return { ...state, reload: load, setData: (data) => setState((s) => ({ ...s, data })) };
}
