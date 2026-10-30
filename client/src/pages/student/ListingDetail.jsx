import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import { modeLabel } from '../../components/ListingCard';
import { ErrorBanner, Field, Loading, Notice } from '../../components/ui';
import { formatDate, formatINR } from '../../lib/format';
import { useBookmarks } from '../../lib/useBookmarks';

export default function ListingDetail() {
  const { id } = useParams();
  const location = useLocation();
  const [listing, setListing] = useState(location.state?.listing?._id === id ? location.state.listing : null);
  const [loadError, setLoadError] = useState(null);
  const [coverNote, setCoverNote] = useState('');
  const [error, setError] = useState(null);
  const [applied, setApplied] = useState(null);
  const [busy, setBusy] = useState(false);
  const bookmarks = useBookmarks();

  useEffect(() => {
    if (listing) return;
    api.get(`/listings/${id}`)
      .then(({ data }) => setListing(data.listing || data))
      .catch((err) => setLoadError(err.status === 404
        ? 'This internship could not be found. Open it from the search page.' : err));
  }, [id, listing]);

  useEffect(() => {
    api.get('/applications/mine').then(({ data }) => {
      const mine = data.items.find((a) => String(a.listingId) === id);
      if (mine) setApplied(mine);
    }).catch(() => {});
  }, [id]);

  async function onApply(e) {
    e.preventDefault();
    if (coverNote.length > 1000) return;
    setBusy(true);
    setError(null);
    try {
      const { data } = await api.post('/applications', { listingId: id, coverNote: coverNote.trim() });
      setApplied({ _id: data.applicationId, status: data.status });
    } catch (err) {
      if (err.code === 'ALREADY_APPLIED') setApplied({ status: err.details?.[0]?.status || 'APPLIED' });
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  if (loadError) return <ErrorBanner error={loadError} />;
  if (!listing) return <Loading />;

  const closed = listing.status === 'CLOSED' || new Date(listing.deadline) <= new Date();

  return (
    <section className="detail">
      <p><Link to="/listings">← Back to internships</Link></p>
      <article className="card">
        <div className="listing-top">
          <div>
            <h1>{listing.title}</h1>
            <p className="company">{listing.company}</p>
          </div>
          <button type="button" className={`bookmark${bookmarks.ids.has(listing._id) ? ' on' : ''}`}
            aria-pressed={bookmarks.ids.has(listing._id)} onClick={() => bookmarks.toggle(listing)}
            aria-label={bookmarks.ids.has(listing._id) ? 'Remove from saved' : 'Save internship'}>
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path d="M6 3h12v18l-6-4-6 4z" fill={bookmarks.ids.has(listing._id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" />
            </svg>
          </button>
        </div>
        <ErrorBanner error={bookmarks.error} />
        <dl className="facts">
          <div><dt>Location</dt><dd>{listing.location}</dd></div>
          <div><dt>Mode</dt><dd>{modeLabel(listing.mode)}</dd></div>
          <div><dt>Stipend</dt><dd>{formatINR(listing.stipend)} per month</dd></div>
          <div><dt>Minimum CGPA</dt><dd>{listing.minCgpa ?? 'None'}</dd></div>
          <div><dt>Deadline</dt><dd>{formatDate(listing.deadline)}</dd></div>
          <div><dt>Status</dt><dd>{closed ? 'Closed' : 'Open'}</dd></div>
        </dl>
        <h2>Required skills</h2>
        <ul className="tags">{listing.skills?.map((s) => <li key={s} className="tag">{s}</li>)}</ul>
      </article>

      <article className="card">
        <h2>Apply</h2>
        {applied && (
          <Notice tone="success">
            You have applied to this internship. Follow it under <Link to="/applications">My Applications</Link>.
          </Notice>
        )}
        {!applied && closed && <Notice tone="warning">Applications for this internship are closed.</Notice>}
        {!applied && !closed && (
          <form onSubmit={onApply} noValidate>
            <ErrorBanner error={error} />
            <p className="muted">Your current profile resume is attached automatically.</p>
            <Field label="Cover note (optional)" error={coverNote.length > 1000 ? 'Cover note must be at most 1000 characters' : ''}
              hint={`${coverNote.length}/1000`}>
              {(p) => <textarea {...p} rows={5} value={coverNote} onChange={(e) => setCoverNote(e.target.value)} />}
            </Field>
            <button className="btn btn-primary" type="submit" disabled={busy || coverNote.length > 1000}>
              {busy ? 'Submitting…' : 'Submit application'}
            </button>
          </form>
        )}
      </article>
    </section>
  );
}
