import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';

export function useBookmarks() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/bookmarks/mine');
      setItems(data.items || []);
    } catch (err) {
      setError(err);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const ids = useMemo(() => new Set(items.map((b) => b.listingId?._id || b.listingId)), [items]);

  const toggle = useCallback(async (listing) => {
    setError(null);
    try {
      if (ids.has(listing._id)) {
        await api.delete(`/listings/${listing._id}/bookmark`);
        setItems((list) => list.filter((b) => (b.listingId?._id || b.listingId) !== listing._id));
      } else {
        const { data } = await api.post(`/listings/${listing._id}/bookmark`);
        setItems((list) => [{ ...data.bookmark, listingId: listing }, ...list]);
      }
    } catch (err) {
      setError(err.code === 'BOOKMARK_LIMIT'
        ? Object.assign(err, { message: err.message || 'You can save at most 100 internships.' })
        : err);
    }
  }, [ids]);

  return { items, ids, toggle, error, reload: load };
}
