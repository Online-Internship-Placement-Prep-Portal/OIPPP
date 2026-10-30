import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Empty, ErrorBanner, Loading, PageHeader } from '../../components/ui';
import { CHART } from '../../lib/chart';
import { downloadFile } from '../../lib/download';
import { formatPercent } from '../../lib/format';
import { useApi } from '../../lib/useApi';

export default function Statistics() {
  const [draft, setDraft] = useState({ branch: '', gradYear: '' });
  const [filters, setFilters] = useState({});
  const { data, error, loading, reload } = useApi('/analytics/placements', filters);
  const [exportError, setExportError] = useState(null);

  function apply(e) {
    e.preventDefault();
    const next = {};
    if (draft.branch.trim()) next.branch = draft.branch.trim();
    if (draft.gradYear) next.gradYear = Number(draft.gradYear);
    setFilters(next);
  }

  async function exportCsv() {
    setExportError(null);
    try {
      await downloadFile('/analytics/placements/export', 'placement-report.csv', filters);
    } catch (err) {
      setExportError(err);
    }
  }

  const rate = data?.students ? (100 * data.placedStudents) / data.students : null;
  const yearError = draft.gradYear && (Number(draft.gradYear) < 2000 || Number(draft.gradYear) > 2100) ? 'Year must be 2000–2100' : '';

  return (
    <section>
      <PageHeader title="Placement statistics" subtitle="Reported per branch and graduation year."
        actions={<button type="button" className="btn btn-primary" onClick={exportCsv} disabled={!data}>Export CSV</button>} />
      <form className="toolbar wrap" onSubmit={apply}>
        <label htmlFor="s-branch">Branch</label>
        <input id="s-branch" placeholder="All" value={draft.branch} onChange={(e) => setDraft({ ...draft, branch: e.target.value })} />
        <label htmlFor="s-year">Graduation year</label>
        <input id="s-year" type="number" min="2000" max="2100" placeholder="All" value={draft.gradYear}
          aria-invalid={Boolean(yearError)} onChange={(e) => setDraft({ ...draft, gradYear: e.target.value })} />
        <button className="btn btn-secondary" type="submit" disabled={Boolean(yearError)}>Apply</button>
        {yearError && <small className="field-error">{yearError}</small>}
      </form>
      <ErrorBanner error={error || exportError} onRetry={error ? reload : undefined} />
      {loading && <Loading />}
      {data && (
        <>
          <div className="stats">
            <div className="stat card"><span className="stat-value">{data.students}</span><span>Students</span></div>
            <div className="stat card"><span className="stat-value">{data.placedStudents}</span><span>With an offer</span></div>
            <div className="stat card"><span className="stat-value">{formatPercent(rate)}</span><span>Placement rate</span></div>
          </div>
          <div className="grid-2">
            <article className="card">
              <h2>Offers per company</h2>
              {!data.offersPerCompany.length && <Empty>No offers yet.</Empty>}
              {data.offersPerCompany.length > 0 && (
                <div className="chart">
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={data.offersPerCompany.map((c) => ({ ...c, company: c.company ?? 'Unknown' }))}>
                      <CartesianGrid stroke={CHART.grid} vertical={false} />
                      <XAxis dataKey="company" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="offers" name="Offers" fill={CHART.gold} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </article>
            <article className="card">
              <h2>Average test score by branch</h2>
              {!data.averageScoreByBranch.length && <Empty>No test results yet.</Empty>}
              {data.averageScoreByBranch.length > 0 && (
                <div className="chart">
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={data.averageScoreByBranch.map((b) => ({ ...b, branch: b.branch ?? 'No branch' }))}>
                      <CartesianGrid stroke={CHART.grid} vertical={false} />
                      <XAxis dataKey="branch" />
                      <YAxis domain={[0, 100]} unit="%" />
                      <Tooltip formatter={(v) => formatPercent(v)} />
                      <Bar dataKey="averageScore" name="Average score" fill={CHART.navy} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </article>
          </div>
          <article className="card">
            <h2>Applications per listing</h2>
            {!data.applicationsPerListing.length && <Empty>No applications yet.</Empty>}
            {data.applicationsPerListing.length > 0 && (
              <>
                <div className="chart">
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={data.applicationsPerListing.slice(0, 15).map((l) => ({ ...l, name: l.title ?? 'Unknown' }))}>
                      <CartesianGrid stroke={CHART.grid} vertical={false} />
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="applications" name="Applications" fill={CHART.navy} />
                      <Bar dataKey="offers" name="Offers" fill={CHART.gold} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="table-wrap">
                  <table className="table">
                    <thead><tr><th scope="col">Listing</th><th scope="col">Company</th><th scope="col">Applications</th><th scope="col">Offers</th></tr></thead>
                    <tbody>
                      {data.applicationsPerListing.map((l) => (
                        <tr key={l.listingId}>
                          <td data-label="Listing">{l.title ?? 'Unknown'}</td>
                          <td data-label="Company">{l.company ?? '—'}</td>
                          <td data-label="Applications">{l.applications}</td>
                          <td data-label="Offers">{l.offers}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </article>
        </>
      )}
    </section>
  );
}
