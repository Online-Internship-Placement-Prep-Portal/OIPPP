import { useState } from 'react';
import { api } from '../../api/client';
import PdfViewer from '../../components/PdfViewer';
import { Empty, ErrorBanner, Field, Loading, Modal, Notice, PageHeader, Pagination } from '../../components/ui';
import { useApi } from '../../lib/useApi';

const PAGE_SIZE = 20;
const RECRUITER_REASONS = [
  ['INCOMPLETE_PROFILE', 'Incomplete profile'],
  ['INVALID_COMPANY', 'Company could not be verified'],
  ['OTHER', 'Other'],
];
const titleCase = (s) => (s ? s.charAt(0) + s.slice(1).toLowerCase() : '');

export default function Users() {
  const [filters, setFilters] = useState({ role: 'RECRUITER', status: 'PENDING', search: '' });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const params = { page, limit: PAGE_SIZE, role: filters.role || undefined, status: filters.status || undefined,
    search: filters.search || undefined };
  const { data, error, loading, reload } = useApi('/admin/users', params);
  const [actionError, setActionError] = useState(null);
  const [notice, setNotice] = useState('');
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState('');
  const [resumeOf, setResumeOf] = useState(null);

  const setFilter = (key) => (e) => { setFilters((f) => ({ ...f, [key]: e.target.value })); setPage(1); };

  async function act(fn, message) {
    setActionError(null);
    setNotice('');
    try {
      await fn();
      setNotice(message);
      reload();
    } catch (err) {
      setActionError(err);
    }
  }

  const approve = (u) => act(() => api.patch(`/admin/recruiters/${u.id}/approve`), `${u.name} approved and notified.`);
  const deactivate = (u) => {
    if (!window.confirm(`Deactivate ${u.name}? They are signed out at once. Their records are kept.`)) return;
    act(() => api.patch(`/admin/users/${u.id}/deactivate`), `${u.name} deactivated.`);
  };
  function confirmReject(e) {
    e.preventDefault();
    if (!reason) return;
    const u = rejecting;
    setRejecting(null);
    act(() => api.patch(`/admin/recruiters/${u.id}/reject`, { reasonCode: reason }), `${u.name} rejected and notified.`);
  }

  const items = data?.items || [];

  return (
    <section>
      <PageHeader title="Users" subtitle="Approve recruiters, deactivate accounts and view student resumes." />
      <form className="toolbar wrap" role="search" onSubmit={(e) => { e.preventDefault(); setFilters((f) => ({ ...f, search: search.trim() })); setPage(1); }}>
        <label htmlFor="u-role">Role</label>
        <select id="u-role" value={filters.role} onChange={setFilter('role')}>
          <option value="">All</option>
          <option value="STUDENT">Student</option>
          <option value="RECRUITER">Recruiter</option>
          <option value="ADMIN">Admin</option>
        </select>
        <label htmlFor="u-status">Status</label>
        <select id="u-status" value={filters.status} onChange={setFilter('status')}>
          <option value="">All</option>
          <option value="PENDING">Pending</option>
          <option value="ACTIVE">Active</option>
          <option value="REJECTED">Rejected</option>
          <option value="DISABLED">Disabled</option>
        </select>
        <label htmlFor="u-search" className="sr-only">Search users</label>
        <input id="u-search" type="search" placeholder="Name, email or SRN" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button className="btn btn-secondary" type="submit">Search</button>
      </form>
      {notice && <Notice tone="success">{notice}</Notice>}
      <ErrorBanner error={error || actionError} onRetry={error ? reload : undefined} />
      {loading && <Loading />}
      {!loading && !items.length && !error && <Empty>No users match these filters.</Empty>}
      {items.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th scope="col">Name</th><th scope="col">Email</th><th scope="col">Role</th><th scope="col">Status</th><th scope="col">Actions</th></tr>
            </thead>
            <tbody>
              {items.map((u) => (
                <tr key={u.id}>
                  <td data-label="Name">{u.name}{u.srn && <><br /><span className="small muted">{u.srn}</span></>}</td>
                  <td data-label="Email">{u.email}</td>
                  <td data-label="Role">{titleCase(u.role)}</td>
                  <td data-label="Status"><span className={`pill pill-${u.status.toLowerCase()}`}>{titleCase(u.status)}</span></td>
                  <td className="row-actions">
                    {u.role === 'RECRUITER' && u.status === 'PENDING' && (
                      <>
                        <button type="button" className="btn btn-primary btn-sm" onClick={() => approve(u)}>Approve</button>
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => { setReason(''); setRejecting(u); }}>Reject</button>
                      </>
                    )}
                    {u.role === 'STUDENT' && (
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setResumeOf(u)}>Resume</button>
                    )}
                    {u.role !== 'ADMIN' && u.status !== 'DISABLED' && (
                      <button type="button" className="btn btn-link" onClick={() => deactivate(u)}>Deactivate</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pagination page={page} totalPages={Math.ceil(data.total / PAGE_SIZE)} total={data.total} onPage={setPage} />}
      {rejecting && (
        <Modal title={`Reject ${rejecting.name}`} onClose={() => setRejecting(null)}>
          <form onSubmit={confirmReject} noValidate>
            <Field label="Reason" error={!reason ? 'Choose a reason' : ''}>
              {(p) => (
                <select {...p} value={reason} onChange={(e) => setReason(e.target.value)}>
                  <option value="">Select a reason</option>
                  {RECRUITER_REASONS.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
                </select>
              )}
            </Field>
            <div className="actions">
              <button className="btn btn-danger" type="submit" disabled={!reason}>Reject</button>
              <button className="btn btn-secondary" type="button" onClick={() => setRejecting(null)}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}
      {resumeOf && <PdfViewer url={`/admin/users/${resumeOf.id}/resume`} title={`Resume: ${resumeOf.name}`} onClose={() => setResumeOf(null)} />}
    </section>
  );
}
