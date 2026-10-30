import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Empty, ErrorBanner, Loading, Modal, PageHeader, StatusChip } from '../../components/ui';
import PdfViewer from '../../components/PdfViewer';
import { formatDate, formatDateTime } from '../../lib/format';
import { useApi } from '../../lib/useApi';

const REASONS = {
  SKILLS_MISMATCH: 'Skills do not match the role',
  POSITION_FILLED: 'Position has been filled',
  INTERVIEW_NOT_CLEARED: 'Did not clear the interview',
  INCOMPLETE_PROFILE: 'Profile or resume incomplete',
  OTHER: 'Other',
};

function History({ app, onClose }) {
  return (
    <Modal title={`History: ${app.listing?.title || 'Application'}`} onClose={onClose}>
      <ol className="timeline">
        {app.history.map((h, i) => (
          <li key={i}>
            <StatusChip status={h.to} />
            <span>{h.from ? `from ${h.from.toLowerCase()}` : 'submitted'}</span>
            <time className="muted small">{formatDateTime(h.at)}</time>
            {h.reasonCode && <p className="small">Reason: {REASONS[h.reasonCode] || h.reasonCode}</p>}
          </li>
        ))}
      </ol>
    </Modal>
  );
}

export default function Applications() {
  const { data, error, loading, reload } = useApi('/applications/mine');
  const [open, setOpen] = useState(null);
  const [resume, setResume] = useState(null);
  const items = data?.items || [];

  return (
    <section>
      <PageHeader title="My applications" subtitle="Newest first. Open the history to see every change." />
      <ErrorBanner error={error} onRetry={reload} />
      {loading && <Loading />}
      {!loading && !items.length && !error && <Empty>No applications yet. <Link to="/listings">Find an internship</Link>.</Empty>}
      {items.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th scope="col">Internship</th><th scope="col">Company</th><th scope="col">Applied</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Actions</span></th></tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a._id}>
                  <td data-label="Internship">{a.listing?.title || 'Listing removed'}</td>
                  <td data-label="Company">{a.listing?.company || '—'}</td>
                  <td data-label="Applied">{formatDate(a.createdAt)}</td>
                  <td data-label="Status"><StatusChip status={a.status} /></td>
                  <td className="row-actions">
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setOpen(a)}>History</button>
                    {a.resumeFileId && (
                      <button type="button" className="btn btn-link" onClick={() => setResume(a._id)}>Resume sent</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {open && <History app={open} onClose={() => setOpen(null)} />}
      {resume && <PdfViewer url={`/applications/${resume}/resume`} title="Resume sent with this application" onClose={() => setResume(null)} />}
    </section>
  );
}
