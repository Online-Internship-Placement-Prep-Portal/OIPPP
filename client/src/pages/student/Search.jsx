import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ListingCard from '../../components/ListingCard';
import { Empty, ErrorBanner, Loading, PageHeader, Pagination } from '../../components/ui';
import { useApi } from '../../lib/useApi';
import { useBookmarks } from '../../lib/useBookmarks';

const FILTER_KEYS = ['search', 'location', 'mode', 'minStipend', 'maxStipend', 'skill', 'deadlineAfter', 'deadlineBefore', 'sortBy', 'order'];
const PAGE_SIZE = 20;

function toQuery(params) {
  const q = { limit: PAGE_SIZE, page: Number(params.get('page')) || 1 };
  for (const key of FILTER_KEYS) {
    const v = params.get(key);
    if (!v) continue;
    // Date inputs give a day; send the whole day as an ISO range.
    if (key === 'deadlineAfter') q[key] = new Date(`${v}T00:00:00`).toISOString();
    else if (key === 'deadlineBefore') q[key] = new Date(`${v}T23:59:59`).toISOString();
    else q[key] = v;
  }
  return q;
}

export default function Search() {
  const [params, setParams] = useSearchParams();
  const [draft, setDraft] = useState(() => Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) || ''])));
  const [drawer, setDrawer] = useState(false);
  const query = useMemo(() => toQuery(params), [params]);
  const { data, error, loading, reload } = useApi('/listings', query);
  const bookmarks = useBookmarks();

  const set = (key) => (e) => setDraft((d) => ({ ...d, [key]: e.target.value }));

  function apply(e) {
    e.preventDefault();
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(draft)) if (v) next.set(k, v);
    setParams(next);
    setDrawer(false);
  }

  function clear() {
    setDraft(Object.fromEntries(FILTER_KEYS.map((k) => [k, ''])));
    setParams(new URLSearchParams());
  }

  function goTo(page) {
    const next = new URLSearchParams(params);
    next.set('page', String(page));
    setParams(next);
    window.scrollTo({ top: 0 });
  }

  const priceError = draft.minStipend && draft.maxStipend && Number(draft.minStipend) > Number(draft.maxStipend)
    ? 'Minimum cannot exceed maximum' : '';

  return (
    <section>
      <PageHeader title="Internships" subtitle="Open listings, newest deadlines first."
        actions={<button type="button" className="btn btn-secondary filters-toggle" aria-expanded={drawer}
          aria-controls="filters" onClick={() => setDrawer((v) => !v)}>Filters</button>} />
      <div className="search-layout">
        <form id="filters" className={`card filters${drawer ? ' open' : ''}`} onSubmit={apply} aria-label="Filters">
          <div className="field">
            <label htmlFor="f-search">Keyword</label>
            <input id="f-search" type="search" placeholder="Title, company or skill" value={draft.search} onChange={set('search')} />
          </div>
          <div className="field">
            <label htmlFor="f-location">Location</label>
            <input id="f-location" value={draft.location} onChange={set('location')} />
          </div>
          <div className="field">
            <label htmlFor="f-mode">Mode</label>
            <select id="f-mode" value={draft.mode} onChange={set('mode')}>
              <option value="">Any</option>
              <option value="ONSITE">On-site</option>
              <option value="REMOTE">Remote</option>
              <option value="HYBRID">Hybrid</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="f-skill">Skill</label>
            <input id="f-skill" value={draft.skill} onChange={set('skill')} />
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="f-min">Min stipend (₹)</label>
              <input id="f-min" type="number" min="0" inputMode="numeric" value={draft.minStipend} onChange={set('minStipend')} />
            </div>
            <div className="field">
              <label htmlFor="f-max">Max stipend (₹)</label>
              <input id="f-max" type="number" min="0" inputMode="numeric" value={draft.maxStipend} onChange={set('maxStipend')} />
            </div>
          </div>
          {priceError && <small className="field-error">{priceError}</small>}
          <div className="field-row">
            <div className="field">
              <label htmlFor="f-after">Deadline from</label>
              <input id="f-after" type="date" value={draft.deadlineAfter} onChange={set('deadlineAfter')} />
            </div>
            <div className="field">
              <label htmlFor="f-before">Deadline to</label>
              <input id="f-before" type="date" value={draft.deadlineBefore} onChange={set('deadlineBefore')} />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="f-sort">Sort by</label>
              <select id="f-sort" value={draft.sortBy} onChange={set('sortBy')}>
                <option value="">Deadline</option>
                <option value="stipend">Stipend</option>
                <option value="postedAt">Posting date</option>
                <option value="title">Title</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="f-order">Order</label>
              <select id="f-order" value={draft.order} onChange={set('order')}>
                <option value="">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>
          </div>
          <div className="actions">
            <button className="btn btn-primary" type="submit" disabled={Boolean(priceError)}>Apply filters</button>
            <button className="btn btn-secondary" type="button" onClick={clear}>Clear</button>
          </div>
        </form>

        <div>
          <ErrorBanner error={error || bookmarks.error} onRetry={error ? reload : undefined} />
          {loading && <Loading />}
          {!loading && data && !data.listings.length && <Empty>No open internships match these filters.</Empty>}
          {data && (
            <>
              <p className="muted">{data.pagination.total} internship{data.pagination.total === 1 ? '' : 's'} found</p>
              <div className="cards">
                {data.listings.map((l) => (
                  <ListingCard key={l._id} listing={l} bookmarked={bookmarks.ids.has(l._id)} onToggleBookmark={bookmarks.toggle} />
                ))}
              </div>
              <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages}
                total={data.pagination.total} onPage={goTo} />
            </>
          )}
        </div>
      </div>
    </section>
  );
}
