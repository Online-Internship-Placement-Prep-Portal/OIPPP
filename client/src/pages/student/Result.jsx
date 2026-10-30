import { Link, useParams } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ErrorBanner, Loading, PageHeader } from '../../components/ui';
import { formatDateTime, formatPercent } from '../../lib/format';
import { useApi } from '../../lib/useApi';
import { CHART } from '../../lib/chart';

export default function Result() {
  const { id } = useParams();
  const { data, error, loading } = useApi(`/attempts/${id}/result`);

  if (loading) return <Loading />;
  if (error) return <ErrorBanner error={error} />;

  return (
    <section>
      <PageHeader title="Test result" subtitle={`Submitted ${formatDateTime(data.submittedAt)}`}
        actions={<Link className="btn btn-secondary" to="/tests">Back to tests</Link>} />
      <div className="stats">
        <div className="stat card"><span className="stat-value">{formatPercent(data.score)}</span><span>Score</span></div>
        <div className="stat card"><span className="stat-value">{data.correctAnswers}/{data.totalQuestions}</span><span>Correct</span></div>
      </div>
      <article className="card">
        <h2>By topic</h2>
        <div className="chart" aria-hidden="true">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.topicBreakdown}>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="topic" />
              <YAxis domain={[0, 100]} unit="%" />
              <Tooltip formatter={(v) => formatPercent(v)} />
              <Bar dataKey="percentage" name="Score" fill={CHART.navy} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <table className="table">
          <thead><tr><th scope="col">Topic</th><th scope="col">Correct</th><th scope="col">Score</th></tr></thead>
          <tbody>
            {data.topicBreakdown.map((t) => (
              <tr key={t.topic}>
                <td data-label="Topic">{t.topic}</td>
                <td data-label="Correct">{t.correctAnswers}/{t.totalQuestions}</td>
                <td data-label="Score">{formatPercent(t.percentage)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </section>
  );
}
