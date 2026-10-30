import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { modeLabel } from '../../components/ListingCard';
import { Empty, ErrorBanner, Loading, PageHeader } from '../../components/ui';
import { formatDate, formatINR } from '../../lib/format';
import { useApi } from '../../lib/useApi';

export default function MyListings() {
  const { data, error, loading, reload } = useApi('/listings/mine');
  const [actionError, setActionError] = useState(null);
  const listings = data?.listings || [];

  async function close(listing) {
    if (!window.confirm(`Close "${listing.title}"? Students can no longer apply.`)) return;
    setActionError(null);
    try {
      await api.patch(`/listings/${listing._id}`, { status: 'CLOSED' });
      reload();
    } catch (err) {
      setActionError(err);
    }
  }

  return (
    <section>
      <PageHeader title="My listings" subtitle="Listings close automatically when their deadline passes."
        actions={<Link className="btn btn-primary" to="/recruiter/listings/new">Post a listing</Link>} />
      <ErrorBanner error={error || actionError} onRetry={error ? reload : undefined} />
      {loading && <Loading />}
      {!loading && !listings.length && !error && <Empty>You have not posted any listings yet.</Empty>}
      {listings.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Title</th><th scope="col">Location</th><th scope="col">Stipend</th>
                <th scope="col">Deadline</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {listings.map((l) => {
                const open = l.status === 'OPEN' && new Date(l.deadline) > new Date();
                return (
                  <tr key={l._id}>
                    <td data-label="Title"><strong>{l.title}</strong><br /><span className="muted small">{l.company}</span></td>
                    <td data-label="Location">{l.location} · {modeLabel(l.mode)}</td>
                    <td data-label="Stipend">{formatINR(l.stipend)}</td>
                    <td data-label="Deadline">{formatDate(l.deadline)}</td>
                    <td data-label="Status"><span className={`pill ${open ? 'pill-open' : 'pill-closed'}`}>{open ? 'Open' : 'Closed'}</span></td>
                    <td className="row-actions">
                      <Link className="btn btn-primary btn-sm" to={`/recruiter/listings/${l._id}/applicants`} state={{ listing: l }}>Applicants</Link>
                      {open && <Link className="btn btn-secondary btn-sm" to={`/recruiter/listings/${l._id}/edit`}>Edit</Link>}
                      {open && <button type="button" className="btn btn-link" onClick={() => close(l)}>Close</button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
