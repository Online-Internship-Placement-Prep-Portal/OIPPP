import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { formatDateTime } from '../lib/format';

const POLL_MS = 30000;

export default function NotificationBell() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(null);
  const box = useRef(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications');
      setItems(data.items || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!box.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const unread = items.filter((n) => !n.read).length;

  async function markRead(id) {
    setItems((list) => list.map((n) => (n._id === id ? { ...n, read: true } : n)));
    try {
      await api.patch(`/notifications/${id}/read`);
    } catch {
      load();
    }
  }

  return (
    <div className="bell" ref={box}>
      <button type="button" className="bell-btn" aria-haspopup="true" aria-expanded={open}
        aria-label={`Notifications, ${unread} unread`} onClick={() => setOpen((v) => !v)}>
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path fill="currentColor" d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Zm7-6V11a7 7 0 0 0-5.5-6.84V3a1.5 1.5 0 0 0-3 0v1.16A7 7 0 0 0 5 11v5l-2 2v1h18v-1Z" />
        </svg>
        {unread > 0 && <span className="badge">{unread > 99 ? '99+' : unread}</span>}
      </button>
      {open && (
        <div className="dropdown bell-panel">
          <h2 className="dropdown-title">Notifications</h2>
          {error && <p className="field-error">{error}</p>}
          {!items.length && !error && <p className="muted">No notifications yet.</p>}
          <ul>
            {items.map((n) => (
              <li key={n._id} className={n.read ? 'read' : 'unread'}>
                <strong>{n.title}</strong>
                <p>{n.message}</p>
                <div className="bell-meta">
                  <small>{formatDateTime(n.createdAt)}</small>
                  {!n.read && (
                    <button type="button" className="btn btn-link" onClick={() => markRead(n._id)}>Mark read</button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
