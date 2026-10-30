import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Empty, ErrorBanner, Field, Loading, Modal, PageHeader } from '../../components/ui';
import { useApi } from '../../lib/useApi';
import { TOPICS } from './Questions';

export function checkTest({ title, durationMin, questionIds }) {
  const errors = {};
  if (!title.trim()) errors.title = 'Title is required';
  const d = Number(durationMin);
  if (!Number.isInteger(d) || d < 10 || d > 120) errors.durationMin = 'Duration must be 10 to 120 minutes';
  if (questionIds.length < 5 || questionIds.length > 60) errors.questionIds = `Pick 5 to 60 questions (${questionIds.length} picked)`;
  return errors;
}

// Loads every active question, 50 per request (the API maximum).
async function loadAllQuestions() {
  const all = [];
  for (let page = 1; ; page += 1) {
    const { data } = await api.get('/questions', { params: { page, limit: 50, archived: false } });
    all.push(...data.items);
    if (all.length >= data.total || !data.items.length) return all;
  }
}

function TestBuilder({ onClose, onCreated }) {
  const [form, setForm] = useState({ title: '', durationMin: '30', questionIds: [] });
  const [questions, setQuestions] = useState(null);
  const [topic, setTopic] = useState('');
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { loadAllQuestions().then(setQuestions).catch(setError); }, []);

  const errors = checkTest(form);
  const picked = new Set(form.questionIds);
  const toggle = (id) => setForm((f) => ({
    ...f, questionIds: picked.has(id) ? f.questionIds.filter((x) => x !== id) : [...f.questionIds, id],
  }));

  async function save(e) {
    e.preventDefault();
    setTouched(true);
    if (Object.keys(errors).length) return;
    setBusy(true);
    setError(null);
    try {
      await api.post('/tests', { title: form.title.trim(), durationMin: Number(form.durationMin), questionIds: form.questionIds });
      onCreated();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  const shown = (questions || []).filter((q) => !topic || q.topic === topic);

  return (
    <Modal title="Build a test" onClose={onClose} wide>
      <form onSubmit={save} noValidate>
        <ErrorBanner error={error} />
        <div className="field-row">
          <Field label="Title" error={touched && errors.title}>
            {(p) => <input {...p} maxLength={200} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />}
          </Field>
          <Field label="Duration (minutes)" error={touched && errors.durationMin}>
            {(p) => <input {...p} type="number" min="10" max="120" value={form.durationMin} onChange={(e) => setForm({ ...form, durationMin: e.target.value })} />}
          </Field>
        </div>
        <div className="toolbar">
          <label htmlFor="tb-topic">Topic</label>
          <select id="tb-topic" value={topic} onChange={(e) => setTopic(e.target.value)}>
            <option value="">All</option>
            {TOPICS.map((t) => <option key={t}>{t}</option>)}
          </select>
          <strong aria-live="polite">{form.questionIds.length} selected</strong>
        </div>
        {touched && errors.questionIds && <p className="field-error">{errors.questionIds}</p>}
        {!questions && !error && <Loading />}
        {questions && !questions.length && <Empty>Add questions to the bank first.</Empty>}
        <ul className="pick-list">
          {shown.map((q) => (
            <li key={q.questionId}>
              <label>
                <input type="checkbox" checked={picked.has(q.questionId)} onChange={() => toggle(q.questionId)} />
                <span><span className="small muted">{q.topic} · {q.difficulty}</span><br />{q.text}</span>
              </label>
            </li>
          ))}
        </ul>
        <div className="actions">
          <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save as draft'}</button>
          <button className="btn btn-secondary" type="button" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}

export default function TestsAdmin() {
  const { data, error, loading, reload } = useApi('/tests', { limit: 50 });
  const [building, setBuilding] = useState(false);
  const [actionError, setActionError] = useState(null);

  async function setStatus(t, status) {
    const verb = status === 'PUBLISHED' ? 'Publish' : 'Archive';
    if (!window.confirm(`${verb} "${t.title}"? This cannot be undone.`)) return;
    setActionError(null);
    try {
      await api.patch(`/tests/${t.testId}`, { status, version: t.version });
      reload();
    } catch (err) {
      setActionError(err);
    }
  }

  const items = data?.items || [];

  return (
    <section>
      <PageHeader title="Tests" subtitle="Drafts can be published once; published tests are locked."
        actions={<button type="button" className="btn btn-primary" onClick={() => setBuilding(true)}>Build a test</button>} />
      <ErrorBanner error={error || actionError} onRetry={error ? reload : undefined} />
      {loading && <Loading />}
      {!loading && !items.length && !error && <Empty>No tests yet.</Empty>}
      {items.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th scope="col">Title</th><th scope="col">Questions</th><th scope="col">Duration</th><th scope="col">Status</th><th scope="col">Actions</th></tr></thead>
            <tbody>
              {items.map((t) => (
                <tr key={t.testId}>
                  <td data-label="Title">{t.title}</td>
                  <td data-label="Questions">{t.questionCount}</td>
                  <td data-label="Duration">{t.durationMin} min</td>
                  <td data-label="Status"><span className={`pill pill-${t.status.toLowerCase()}`}>{t.status.charAt(0) + t.status.slice(1).toLowerCase()}</span></td>
                  <td className="row-actions">
                    {t.status === 'DRAFT' && <button type="button" className="btn btn-primary btn-sm" onClick={() => setStatus(t, 'PUBLISHED')}>Publish</button>}
                    {t.status !== 'ARCHIVED' && <button type="button" className="btn btn-link" onClick={() => setStatus(t, 'ARCHIVED')}>Archive</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {building && <TestBuilder onClose={() => setBuilding(false)} onCreated={() => { setBuilding(false); reload(); }} />}
    </section>
  );
}
