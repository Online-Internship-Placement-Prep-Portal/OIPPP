import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { Empty, ErrorBanner, Loading, PageHeader } from '../../components/ui';
import { formatPercent } from '../../lib/format';
import { useApi } from '../../lib/useApi';

export default function Tests() {
  const navigate = useNavigate();
  const tests = useApi('/tests', { limit: 50 });
  const progress = useApi('/analytics/me');
  const [error, setError] = useState(null);
  const [starting, setStarting] = useState(null);

  const taken = new Map((progress.data?.trend || []).map((t) => [String(t.testId), t]));

  async function start(test) {
    setStarting(test.testId);
    setError(null);
    try {
      const { data } = await api.post(`/tests/${test.testId}/attempts`, {});
      navigate(`/attempts/${data.attemptId}`);
    } catch (err) {
      setError(err);
    } finally {
      setStarting(null);
    }
  }

  const items = tests.data?.items || [];

  return (
    <section>
      <PageHeader title="Aptitude tests" subtitle="Each test can be taken once. The timer runs on the server." />
      <ErrorBanner error={error || tests.error} onRetry={tests.error ? tests.reload : undefined} />
      {tests.loading && <Loading />}
      {!tests.loading && !items.length && !tests.error && <Empty>No tests are published yet.</Empty>}
      <div className="cards">
        {items.map((t) => {
          const done = taken.get(t.testId);
          return (
            <article key={t.testId} className="card test-card">
              <h3>{t.title}</h3>
              <ul className="meta">
                <li>{t.questionCount} questions</li>
                <li>{t.durationMin} minutes</li>
              </ul>
              {done ? (
                <div className="actions">
                  <span className="score">Score {formatPercent(done.score)}</span>
                  <Link className="btn btn-secondary" to={`/attempts/${done.attemptId}/result`}>View result</Link>
                </div>
              ) : (
                <button type="button" className="btn btn-primary" disabled={starting === t.testId} onClick={() => start(t)}>
                  {starting === t.testId ? 'Starting…' : 'Start or resume'}
                </button>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
