import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import { ErrorBanner, Loading, Notice } from '../../components/ui';
import { clockOffset, createAnswerSaver, formatClock, remainingMs, WARNING_MS } from '../../lib/timer';

export default function Attempt() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState(null);
  const [answers, setAnswers] = useState({});
  const [saveState, setSaveState] = useState({});
  const [current, setCurrent] = useState(0);
  const [left, setLeft] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const offset = useRef(0);
  const finished = useRef(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/attempts/${id}`);
      if (data.status === 'SUBMITTED') {
        navigate(`/attempts/${id}/result`, { replace: true });
        return;
      }
      offset.current = clockOffset(data.serverTime);
      setAttempt(data);
      setAnswers(data.answers || {});
      setLeft(remainingMs(data.endsAt, offset.current));
    } catch (err) {
      setError(err);
    }
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  const submit = useCallback(async () => {
    if (finished.current) return;
    finished.current = true;
    setSubmitting(true);
    try {
      await api.post(`/attempts/${id}/submit`, {});
      navigate(`/attempts/${id}/result`, { replace: true });
    } catch (err) {
      finished.current = false;
      setSubmitting(false);
      setError(err);
    }
  }, [id, navigate]);

  useEffect(() => {
    if (!attempt) return undefined;
    const tick = setInterval(() => {
      const ms = remainingMs(attempt.endsAt, offset.current);
      setLeft(ms);
      // TST-5: the server auto-submits too; this just moves the student to the result.
      if (ms <= 0) {
        clearInterval(tick);
        submit();
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [attempt, submit]);

  const saver = useMemo(() => createAnswerSaver({
    save: (questionId, optionIdx) => api.patch(`/attempts/${id}/answers`, { questionId, optionIdx }),
    onState: (questionId, state, err) => {
      setSaveState((s) => ({ ...s, [questionId]: state }));
      if (state !== 'error') return;
      if (err?.code === 'ATTEMPT_CLOSED') submit();
      else if (err?.code === 'ATTEMPT_CHANGED' || err?.code === 'STALE_VERSION') load();
      else setError(err);
    },
  }), [id, load, submit]);

  if (error && !attempt) return <ErrorBanner error={error} />;
  if (!attempt) return <Loading label="Loading your attempt…" />;

  const questions = attempt.questions;
  const q = questions[current];
  const answeredCount = questions.filter((x) => answers[x.questionId] != null).length;
  const warning = left != null && left <= WARNING_MS;

  function pick(optionIdx) {
    setAnswers((a) => ({ ...a, [q.questionId]: optionIdx }));
    saver.pick(q.questionId, optionIdx);
  }

  function confirmSubmit() {
    const unanswered = questions.length - answeredCount;
    const msg = unanswered ? `${unanswered} question(s) are unanswered. Submit anyway?` : 'Submit your answers now?';
    if (window.confirm(msg)) submit();
  }

  const state = saveState[q.questionId];

  return (
    <section className="attempt">
      <div className={`timer-bar${warning ? ' warning' : ''}`} role="timer" aria-live={warning ? 'assertive' : 'off'}>
        <span>Time left <strong>{formatClock(left ?? 0)}</strong></span>
        <span>{answeredCount}/{questions.length} answered</span>
        <button type="button" className="btn btn-primary btn-sm" disabled={submitting} onClick={confirmSubmit}>
          {submitting ? 'Submitting…' : 'Submit'}
        </button>
      </div>
      {warning && left > 0 && <Notice tone="warning">Less than 5 minutes left. Answers are saved as you pick them.</Notice>}
      <ErrorBanner error={error} />

      <div className="attempt-layout">
        <nav className="palette card" aria-label="Questions">
          <h2 className="small-title">Questions</h2>
          <ol>
            {questions.map((x, i) => (
              <li key={x.questionId}>
                <button type="button" onClick={() => setCurrent(i)}
                  className={`${answers[x.questionId] != null ? 'answered' : ''}${i === current ? ' current' : ''}`}
                  aria-current={i === current ? 'step' : undefined}
                  aria-label={`Question ${i + 1}, ${answers[x.questionId] != null ? 'answered' : 'not answered'}`}>
                  {i + 1}
                </button>
              </li>
            ))}
          </ol>
          <p className="legend small"><span className="dot answered" /> Answered <span className="dot" /> Not answered</p>
        </nav>

        <article className="card question">
          <p className="muted small">Question {current + 1} of {questions.length} · {q.topic} · {q.difficulty}</p>
          <h2 className="question-text">{q.text}</h2>
          <fieldset>
            <legend className="sr-only">Options</legend>
            {q.options.map((opt, i) => (
              <label key={i} className={`option${answers[q.questionId] === i ? ' chosen' : ''}`}>
                <input type="radio" name={`q-${q.questionId}`} checked={answers[q.questionId] === i} onChange={() => pick(i)} />
                <span>{opt}</span>
              </label>
            ))}
          </fieldset>
          <p className="save-state" aria-live="polite">
            {state === 'saving' && 'Saving…'}
            {state === 'saved' && <span className="saved">✓ Saved</span>}
            {state === 'error' && <span className="field-error">Not saved</span>}
          </p>
          <div className="actions">
            <button type="button" className="btn btn-secondary" disabled={current === 0} onClick={() => setCurrent((c) => c - 1)}>Previous</button>
            <button type="button" className="btn btn-secondary" disabled={current === questions.length - 1} onClick={() => setCurrent((c) => c + 1)}>Next</button>
          </div>
        </article>
      </div>
    </section>
  );
}
