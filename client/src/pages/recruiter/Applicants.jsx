import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import PdfViewer from '../../components/PdfViewer';
import { Empty, ErrorBanner, Field, Loading, Modal, PageHeader, Pagination, StatusChip } from '../../components/ui';
import { formatDate } from '../../lib/format';
import { nextStatuses, STATUSES, statusLabel } from '../../lib/status';
import { useApi } from '../../lib/useApi';

const PAGE_SIZE = 20;

function RejectDialog({ applicant, onCancel, onConfirm }) {
  const reasons = useApi('/applications/reject-reasons');
  const [code, setCode] = useState('');
  const [touched, setTouched] = useState(false);
  return (
    <Modal title={`Reject ${applicant.student.name || 'applicant'}`} onClose={onCancel}>
      <form onSubmit={(e) => { e.preventDefault(); setTouched(true); if (code) onConfirm(code); }} noValidate>
        <ErrorBanner error={reasons.error} />
        <Field label="Reason" error={touched && !code ? 'Choose a reason' : ''}>
          {(p) => (
            <select {...p} value={code} onChange={(e) => setCode(e.target.value)} onBlur={() => setTouched(true)}>
              <option value="">Select a reason</option>
              {reasons.data?.items.map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}
            </select>
          )}
        </Field>
        <div className="actions">
          <button className="btn btn-danger" type="submit">Reject</button>
          <button className="btn btn-secondary" type="button" onClick={onCancel}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}

export default function Applicants() {
  const { id } = useParams();
  const location = useLocation();
  const [listing, setListing] = useState(location.state?.listing || null);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useApi(`/listings/${id}/applications`, { status: status || undefined, page, limit: PAGE_SIZE });
  const [actionError, setActionError] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    if (listing) return;
    api.get(`/listings/${id}`).then(({ data: d }) => setListing(d.listing)).catch(() => {});
  }, [id, listing]);

  async function move(applicant, to, reasonCode) {
    setBusyId(applicant._id);
    setActionError(null);
    try {
      await api.patch(`/applications/${applicant._id}/status`, reasonCode ? { status: to, reasonCode } : { status: to });
      reload();
    } catch (err) {
      setActionError(err);
      if (err.code === 'STALE_STATUS') reload();
    } finally {
      setBusyId(null);
    }
  }

  const items = data?.items || [];
  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  return (
    <section>
      <p><Link to="/recruiter/listings">← My listings</Link></p>
      <PageHeader title="Applicants" subtitle={listing ? `${listing.title} · ${listing.company}` : undefined} />
      <div className="toolbar">
        <label htmlFor="status-filter">Status</label>
        <select id="status-filter" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All</option>
          {STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
        </select>
      </div>
      <ErrorBanner error={error || actionError} onRetry={error ? reload : undefined} />
      {loading && <Loading />}
      {!loading && !items.length && !error && <Empty>No applicants{status ? ` with status ${statusLabel(status)}` : ''} yet.</Empty>}
      {items.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Student</th><th scope="col">Profile</th><th scope="col">Applied</th>
                <th scope="col">Status</th><th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a._id}>
                  <td data-label="Student">
                    <strong>{a.student.name || 'Student'}</strong>
                    {a.coverNote && <p className="small muted cover">{a.coverNote}</p>}
                  </td>
                  <td data-label="Profile">
                    <span className="small">{[a.student.branch, a.student.gradYear].filter(Boolean).join(' · ') || '—'}</span><br />
                    <span className="small">CGPA {a.student.cgpa ?? '—'}</span>
                    {a.student.skills?.length > 0 && <p className="small muted">{a.student.skills.join(', ')}</p>}
                  </td>
                  <td data-label="Applied">{formatDate(a.appliedAt)}</td>
                  <td data-label="Status"><StatusChip status={a.status} /></td>
                  <td className="row-actions">
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setViewing(a)}>Resume</button>
                    {nextStatuses(a.status).map((to) => (
                      <button key={to} type="button" disabled={busyId === a._id}
                        className={`btn btn-sm ${to === 'REJECTED' ? 'btn-danger' : 'btn-primary'}`}
                        onClick={() => (to === 'REJECTED' ? setRejecting(a) : move(a, to))}>
                        {to === 'REJECTED' ? 'Reject' : `Move to ${statusLabel(to)}`}
                      </button>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pagination page={page} totalPages={totalPages} total={data.total} onPage={setPage} />}
      {rejecting && (
        <RejectDialog applicant={rejecting} onCancel={() => setRejecting(null)}
          onConfirm={(code) => { const a = rejecting; setRejecting(null); move(a, 'REJECTED', code); }} />
      )}
      {viewing && (
        <PdfViewer url={`/applications/${viewing._id}/resume`} title={`Resume: ${viewing.student.name || 'applicant'}`}
          onClose={() => setViewing(null)} />
      )}
    </section>
  );
}
