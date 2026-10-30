import { useEffect, useId, useRef } from 'react';
import { statusLabel } from '../lib/status';

export function ErrorBanner({ error, onRetry }) {
  if (!error) return null;
  const message = typeof error === 'string' ? error : error.message;
  return (
    <div className="banner banner-error" role="alert">
      <span>{message}</span>
      {onRetry && <button type="button" className="btn btn-link" onClick={onRetry}>Retry</button>}
    </div>
  );
}

export function Notice({ children, tone = 'info' }) {
  return <div className={`banner banner-${tone}`} role="status">{children}</div>;
}

export function Loading({ label = 'Loading…' }) {
  return <p className="loading" role="status" aria-live="polite">{label}</p>;
}

export function Empty({ children }) {
  return <p className="empty">{children}</p>;
}

// Label, control and error wired together; the control comes in as a render prop.
export function Field({ label, error, hint, children }) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={`field${error ? ' field-invalid' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {children({ id, 'aria-invalid': Boolean(error), 'aria-describedby': describedBy })}
      {hint && <small id={hintId} className="hint">{hint}</small>}
      {error && <small id={errorId} className="field-error">{error}</small>}
    </div>
  );
}

export function StatusChip({ status }) {
  return <span className={`chip chip-${String(status).toLowerCase()}`}>{statusLabel(status)}</span>;
}

export function Pagination({ page, totalPages, total, onPage }) {
  if (!totalPages || totalPages <= 1) {
    return total != null ? <p className="muted pager-total">{total} result{total === 1 ? '' : 's'}</p> : null;
  }
  return (
    <nav className="pager" aria-label="Pagination">
      <button type="button" className="btn btn-secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Previous
      </button>
      <span>Page {page} of {totalPages} · {total} results</span>
      <button type="button" className="btn btn-secondary" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
        Next
      </button>
    </nav>
  );
}

export function Modal({ title, onClose, children, wide }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    ref.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal${wide ? ' modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}
        tabIndex={-1} ref={ref}>
        <header className="modal-head">
          <h2>{title}</h2>
          <button type="button" className="btn-icon" aria-label="Close" onClick={onClose}>×</button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}
