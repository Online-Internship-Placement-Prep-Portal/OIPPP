import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Empty, ErrorBanner, Loading, PageHeader, StatusChip } from '../../components/ui';
import { CHART } from '../../lib/chart';
import { formatDate, formatPercent } from '../../lib/format';
import { STATUSES, statusLabel } from '../../lib/status';
import { useApi } from '../../lib/useApi';

export default function Progress() {
  const { data, error, loading, reload } = useApi('/analytics/me');

  if (loading) return <Loading />;
  if (error) return <ErrorBanner error={error} onRetry={reload} />;

  const trend = data.trend.map((t) => ({ ...t, label: `${t.testTitle || 'Test'} (${formatDate(t.submittedAt)})` }));
  const apps = STATUSES.map((s) => ({ status: statusLabel(s), count: data.applications.byStatus[s] || 0 }));

  return (
    <section>
      <PageHeader title="My progress" subtitle="Test scores over time, topic strengths and application outcomes." />
      <div className="stats">
        <div className="stat card"><span className="stat-value">{data.testsTaken}</span><span>Tests taken</span></div>
        <div className="stat card"><span className="stat-value">{formatPercent(data.averageScore)}</span><span>Average score</span></div>
        <div className="stat card"><span className="stat-value">{data.applications.total}</span><span>Applications</span></div>
      </div>

      <div className="grid-2">
        <article className="card">
          <h2>Score trend</h2>
          {!trend.length && <Empty>Take a <Link to="/tests">test</Link> to see your trend.</Empty>}
          {trend.length > 0 && (
            <div className="chart">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={trend}>
                  <CartesianGrid stroke={CHART.grid} vertical={false} />
                  <XAxis dataKey="label" hide />
                  <YAxis domain={[0, 100]} unit="%" />
                  <Tooltip formatter={(v) => formatPercent(v)} />
                  <Line type="monotone" dataKey="score" name="Score" stroke={CHART.navy} strokeWidth={2} dot={{ fill: CHART.gold, r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>

        <article className="card">
          <h2>Weakest topics</h2>
          {!data.weakestTopics.length && <Empty>No topic data yet.</Empty>}
          <ol className="list">
            {data.weakestTopics.map((t) => (
              <li key={t.topic}><strong>{t.topic}</strong> · {formatPercent(t.percentage)} ({t.correctAnswers}/{t.totalQuestions})</li>
            ))}
          </ol>
          {data.topics.length > 0 && (
            <>
              <h3>All topics</h3>
              <table className="table">
                <thead><tr><th scope="col">Topic</th><th scope="col">Score</th></tr></thead>
                <tbody>
                  {data.topics.map((t) => (
                    <tr key={t.topic}><td data-label="Topic">{t.topic}</td><td data-label="Score">{formatPercent(t.percentage)}</td></tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </article>
      </div>

      <article className="card">
        <h2>Applications by status</h2>
        <ul className="chip-row">
          {STATUSES.map((s) => (
            <li key={s}><StatusChip status={s} /> {data.applications.byStatus[s] || 0}</li>
          ))}
        </ul>
        <div className="chart" aria-hidden="true">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={apps}>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="status" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" name="Applications" fill={CHART.gold} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>
    </section>
  );
}
