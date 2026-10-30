import { useState } from 'react';
import { api } from '../../api/client';
import { Empty, ErrorBanner, Field, Loading, Modal, PageHeader, Pagination } from '../../components/ui';
import { useApi } from '../../lib/useApi';

export const TOPICS = ['Quantitative', 'Logical', 'Verbal', 'Technical'];
export const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const PAGE_SIZE = 20;
const BLANK = { text: '', topic: 'Quantitative', difficulty: 'Easy', options: ['', ''], answerIdx: 0 };

export function checkQuestion(q) {
  const errors = {};
  if (!q.text.trim()) errors.text = 'Question text is required';
  const opts = q.options.map((o) => o.trim());
  if (opts.length < 2 || opts.length > 6) errors.options = 'Give 2 to 6 options';
  else if (opts.some((o) => !o)) errors.options = 'Options cannot be empty';
  else if (new Set(opts.map((o) => o.toLowerCase())).size !== opts.length) errors.options = 'Options must be different';
  if (q.answerIdx < 0 || q.answerIdx >= opts.length) errors.answerIdx = 'Choose the correct option';
  return errors;
}

function QuestionEditor({ initial, onClose, onSaved }) {
  const [q, setQ] = useState(initial || BLANK);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const errors = checkQuestion(q);
  const show = (k) => touched && errors[k];

  const setOption = (i, v) => setQ((x) => ({ ...x, options: x.options.map((o, j) => (j === i ? v : o)) }));
  const addOption = () => setQ((x) => ({ ...x, options: [...x.options, ''] }));
  const removeOption = (i) => setQ((x) => ({
    ...x,
    options: x.options.filter((_, j) => j !== i),
    answerIdx: x.answerIdx === i ? 0 : x.answerIdx > i ? x.answerIdx - 1 : x.answerIdx,
  }));

  async function save(e) {
    e.preventDefault();
    setTouched(true);
    if (Object.keys(errors).length) return;
    const body = { text: q.text.trim(), topic: q.topic, difficulty: q.difficulty,
      options: q.options.map((o) => o.trim()), answerIdx: Number(q.answerIdx) };
    setBusy(true);
    setError(null);
    try {
      if (initial) await api.patch(`/questions/${initial.questionId}`, { ...body, version: initial.version });
      else await api.post('/questions', body);
      onSaved();
    } catch (err) {
      setError(err.code === 'STALE_VERSION'
        ? Object.assign(err, { message: 'Someone else changed this question. Close and reopen it to edit the latest version.' })
        : err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={initial ? 'Edit question' : 'New question'} onClose={onClose} wide>
      <form onSubmit={save} noValidate>
        <ErrorBanner error={error} />
        <Field label="Question" error={show('text')}>
          {(p) => <textarea {...p} rows={3} maxLength={4000} value={q.text} onChange={(e) => setQ({ ...q, text: e.target.value })} />}
        </Field>
        <div className="field-row">
          <Field label="Topic">
            {(p) => (
              <select {...p} value={q.topic} onChange={(e) => setQ({ ...q, topic: e.target.value })}>
                {TOPICS.map((t) => <option key={t}>{t}</option>)}
              </select>
            )}
          </Field>
          <Field label="Difficulty">
            {(p) => (
              <select {...p} value={q.difficulty} onChange={(e) => setQ({ ...q, difficulty: e.target.value })}>
                {DIFFICULTIES.map((d) => <option key={d}>{d}</option>)}
              </select>
            )}
          </Field>
        </div>
        <fieldset className="options-editor">
          <legend>Options (select the correct one)</legend>
          {q.options.map((o, i) => (
            <div key={i} className="option-row">
              <input type="radio" name="answer" aria-label={`Option ${i + 1} is correct`} checked={Number(q.answerIdx) === i}
                onChange={() => setQ({ ...q, answerIdx: i })} />
              <input aria-label={`Option ${i + 1}`} maxLength={1000} value={o} onChange={(e) => setOption(i, e.target.value)} />
              {q.options.length > 2 && (
                <button type="button" className="btn-icon" aria-label={`Remove option ${i + 1}`} onClick={() => removeOption(i)}>×</button>
              )}
            </div>
          ))}
          {show('options') && <small className="field-error">{errors.options}</small>}
          {q.options.length < 6 && <button type="button" className="btn btn-link" onClick={addOption}>Add option</button>}
        </fieldset>
        <div className="actions">
          <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save question'}</button>
          <button className="btn btn-secondary" type="button" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}

export default function Questions() {
  const [filters, setFilters] = useState({ topic: '', difficulty: '', archived: 'false' });
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useApi('/questions', {
    page, limit: PAGE_SIZE, topic: filters.topic || undefined, difficulty: filters.difficulty || undefined, archived: filters.archived,
  });
  const [editing, setEditing] = useState(null);
  const [actionError, setActionError] = useState(null);

  const setFilter = (key) => (e) => { setFilters((f) => ({ ...f, [key]: e.target.value })); setPage(1); };

  async function toggleArchive(q) {
    setActionError(null);
    try {
      await api.patch(`/questions/${q.questionId}`, { archived: !q.archived, version: q.version });
      reload();
    } catch (err) {
      setActionError(err);
    }
  }

  const items = data?.items || [];

  return (
    <section>
      <PageHeader title="Question bank" subtitle="Multiple choice, 2 to 6 options, one correct answer."
        actions={<button type="button" className="btn btn-primary" onClick={() => setEditing('new')}>New question</button>} />
      <div className="toolbar wrap">
        <label htmlFor="q-topic">Topic</label>
        <select id="q-topic" value={filters.topic} onChange={setFilter('topic')}>
          <option value="">All</option>
          {TOPICS.map((t) => <option key={t}>{t}</option>)}
        </select>
        <label htmlFor="q-diff">Difficulty</label>
        <select id="q-diff" value={filters.difficulty} onChange={setFilter('difficulty')}>
          <option value="">All</option>
          {DIFFICULTIES.map((d) => <option key={d}>{d}</option>)}
        </select>
        <label htmlFor="q-arch">Show</label>
        <select id="q-arch" value={filters.archived} onChange={setFilter('archived')}>
          <option value="false">Active</option>
          <option value="true">Archived</option>
        </select>
      </div>
      <ErrorBanner error={error || actionError} onRetry={error ? reload : undefined} />
      {loading && <Loading />}
      {!loading && !items.length && !error && <Empty>No questions here yet.</Empty>}
      <ul className="question-list">
        {items.map((q) => (
          <li key={q.questionId} className="card">
            <p className="small muted">{q.topic} · {q.difficulty}</p>
            <p className="question-text">{q.text}</p>
            <ol className="answer-options">
              {q.options.map((o, i) => <li key={i} className={i === q.answerIdx ? 'correct' : ''}>{o}{i === q.answerIdx && <span className="sr-only"> (correct)</span>}</li>)}
            </ol>
            <div className="actions">
              {!q.archived && <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditing(q)}>Edit</button>}
              <button type="button" className="btn btn-link" onClick={() => toggleArchive(q)}>{q.archived ? 'Restore' : 'Archive'}</button>
            </div>
          </li>
        ))}
      </ul>
      {data && <Pagination page={page} totalPages={Math.ceil(data.total / PAGE_SIZE)} total={data.total} onPage={setPage} />}
      {editing && (
        <QuestionEditor initial={editing === 'new' ? null : editing} onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); reload(); }} />
      )}
    </section>
  );
}
