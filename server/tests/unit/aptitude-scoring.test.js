const mongoose = require('mongoose');
const Attempt = require('../../src/modules/tests/attempt.model');
const Result = require('../../src/modules/tests/result.model');
const { scoreAttempt, publicResult } = require('../../src/modules/tests/aptitude.service');
const id = () => new mongoose.Types.ObjectId();
const submittedAt = new Date('2026-01-01T10:05:00Z');
// topics[i] is the topic of question i; every key is option 1 of three.
function attemptWith(topics, picks = {}) {
  const questions = topics.map((topic, n) => ({ questionId: id(), text: `Q${n}`, topic, difficulty: 'Easy',
    options: ['a', 'b', 'c'], answerIdx: 1 }));
  const answers = Object.fromEntries(Object.entries(picks).map(([n, opt]) => [String(questions[n].questionId), opt]));
  return new Attempt({ studentId: id(), testId: id(), durationMin: 10, startedAt: new Date('2026-01-01T10:00:00Z'),
    endsAt: new Date('2026-01-01T10:10:00Z'), questions, answers });
}
const five = (topic) => Array(5).fill(topic);
const all = (opt, count = 5) => Object.fromEntries(Array.from({ length: count }, (_, n) => [n, opt]));
async function valid(scored) { await new Result(scored).validate(); return scored; }

describe('scoreAttempt — TST-6 auto-evaluation', () => {
  test('all correct scores 100 overall and per topic', async () => {
    const r = await valid(scoreAttempt(attemptWith(five('Logical'), all(1)), submittedAt));
    expect(r).toMatchObject({ totalQuestions: 5, correctAnswers: 5, score: 100, submittedAt });
    expect(r.topicBreakdown).toEqual([{ topic: 'Logical', totalQuestions: 5, correctAnswers: 5, percentage: 100 }]);
  });
  test('all wrong scores 0', async () => {
    const r = await valid(scoreAttempt(attemptWith(five('Verbal'), all(2)), submittedAt));
    expect(r.correctAnswers).toBe(0); expect(r.score).toBe(0);
    expect(r.topicBreakdown[0].percentage).toBe(0);
  });
  test('unanswered questions count as wrong with no negative marking', async () => {
    const r = await valid(scoreAttempt(attemptWith(five('Technical'), { 0: 1, 1: 0 }), submittedAt));
    expect(r.correctAnswers).toBe(1); expect(r.score).toBe(20);
  });
  test('option 0 is a real answer, not a missing one', async () => {
    const attempt = attemptWith(five('Quantitative'), all(0));
    attempt.questions.forEach((q) => { q.answerIdx = 0; });
    expect(scoreAttempt(attempt, submittedAt).score).toBe(100);
  });
  test('mixed topics: per-topic counts add up to the totals', async () => {
    const topics = ['Technical', 'Quantitative', 'Technical', 'Verbal', 'Quantitative', 'Technical'];
    const r = await valid(scoreAttempt(attemptWith(topics, { 0: 1, 1: 1, 2: 0, 3: 2, 5: 1 }), submittedAt));
    expect(r.correctAnswers).toBe(3); expect(r.score).toBe(50);
    expect(r.topicBreakdown).toEqual([
      { topic: 'Quantitative', totalQuestions: 2, correctAnswers: 1, percentage: 50 },
      { topic: 'Verbal', totalQuestions: 1, correctAnswers: 0, percentage: 0 },
      { topic: 'Technical', totalQuestions: 3, correctAnswers: 2, percentage: (100 * 2) / 3 },
    ]);
    expect(r.topicBreakdown.reduce((n, t) => n + t.totalQuestions, 0)).toBe(r.totalQuestions);
    expect(r.topicBreakdown.reduce((n, t) => n + t.correctAnswers, 0)).toBe(r.correctAnswers);
  });
  test('topics are listed in canonical order regardless of question order', () => {
    const r = scoreAttempt(attemptWith(['Technical', 'Verbal', 'Logical', 'Quantitative', 'Technical']), submittedAt);
    expect(r.topicBreakdown.map((t) => t.topic)).toEqual(['Quantitative', 'Logical', 'Verbal', 'Technical']);
  });
  test('scores from the snapshotted key, carrying attempt ownership', () => {
    const attempt = attemptWith(five('Logical'), all(1));
    const r = scoreAttempt(attempt, submittedAt);
    expect(r.attemptId).toBe(attempt._id); expect(r.studentId).toBe(attempt.studentId); expect(r.testId).toBe(attempt.testId);
  });
  test('answers for questions outside the snapshot are ignored', () => {
    const attempt = attemptWith(five('Logical'));
    attempt.answers.set(String(id()), 1);
    expect(scoreAttempt(attempt, submittedAt).correctAnswers).toBe(0);
  });
});

describe('publicResult', () => {
  test('exposes scores and breakdown without owner or internal fields', async () => {
    const doc = new Result(scoreAttempt(attemptWith(five('Logical'), all(1)), submittedAt));
    const view = publicResult(doc);
    expect(view).toEqual({ resultId: doc.id, attemptId: doc.attemptId, testId: doc.testId, totalQuestions: 5,
      correctAnswers: 5, score: 100, submittedAt,
      topicBreakdown: [{ topic: 'Logical', totalQuestions: 5, correctAnswers: 5, percentage: 100 }] });
  });
});
