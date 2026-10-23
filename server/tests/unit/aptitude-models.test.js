const mongoose = require('mongoose');
const Question = require('../../src/modules/tests/question.model');
const Test = require('../../src/modules/tests/test.model');
const Attempt = require('../../src/modules/tests/attempt.model');
const Result = require('../../src/modules/tests/result.model');
const id = () => new mongoose.Types.ObjectId();
const question = () => ({ text: 'What is 2 + 2?', topic: 'Quantitative', difficulty: 'Easy', options: ['3', '4'], answerIdx: 1, createdBy: id() });
const snapshots = (count = 5) => Array.from({ length: count }, () => ({ ...question(), questionId: id() }));
const attempt = () => ({ studentId: id(), testId: id(), durationMin: 10, startedAt: new Date('2026-01-01T10:00:00Z'), endsAt: new Date('2026-01-01T10:10:00Z'), questions: snapshots() });
const result = () => ({ attemptId: id(), studentId: id(), testId: id(), totalQuestions: 5, correctAnswers: 4, score: 80, submittedAt: new Date(), topicBreakdown: [{ topic: 'Quantitative', totalQuestions: 5, correctAnswers: 4, percentage: 80 }] });

describe('Question — TST-1', () => {
  test('accepts a valid question and hides its answer in JSON', async () => {
    const doc = new Question(question()); await doc.validate();
    expect(doc.toJSON()).not.toHaveProperty('answerIdx');
    expect(Question.schema.path('answerIdx').options.select).toBe(false);
  });
  test.each([1, 7])('rejects %i options', async (count) => {
    await expect(new Question({ ...question(), options: Array.from({ length: count }, (_, n) => `${n}`), answerIdx: 0 }).validate()).rejects.toThrow();
  });
  test.each([-1, 2, 1.5])('rejects invalid answer index %s', async (answerIdx) => {
    await expect(new Question({ ...question(), answerIdx }).validate()).rejects.toThrow();
  });
  test.each([{ topic: 'Other' }, { difficulty: 'Extreme' }, { text: ' ' }, { options: ['same', 'same'] }, { options: ['', 'ok'] }, { answerIdx: undefined }])('rejects invalid question %o', async (patch) => {
    await expect(new Question({ ...question(), ...patch }).validate()).rejects.toThrow();
  });
  test('accepts six options and the last correct index', async () => {
    await expect(new Question({ ...question(), options: ['a', 'b', 'c', 'd', 'e', 'f'], answerIdx: 5 }).validate()).resolves.toBeUndefined();
  });
});
describe('Test — TST-2', () => {
  const valid = () => ({ title: 'Practice', durationMin: 10, questionIds: Array.from({ length: 5 }, id), createdBy: id() });
  test.each([[5, 10], [60, 120]])('accepts %i questions / %i minutes', async (count, durationMin) => {
    await expect(new Test({ ...valid(), questionIds: Array.from({ length: count }, id), durationMin }).validate()).resolves.toBeUndefined();
  });
  test.each([4, 61])('rejects %i questions', async (count) => {
    await expect(new Test({ ...valid(), questionIds: Array.from({ length: count }, id) }).validate()).rejects.toThrow();
  });
  test.each([9, 121, 10.5])('rejects duration %s', async (durationMin) => {
    await expect(new Test({ ...valid(), durationMin }).validate()).rejects.toThrow();
  });
  test('rejects duplicate questions', async () => {
    await expect(new Test({ ...valid(), questionIds: Array(5).fill(id()) }).validate()).rejects.toThrow();
  });
});
describe('Attempt — TST-3 to TST-5 / SAFE-1', () => {
  test('accepts an unanswered attempt; serializes only student-safe fields', async () => {
    const doc = new Attempt(attempt()); await doc.validate();
    expect(doc.toStudentView().answers).toEqual({});
    expect(doc.toStudentView().questions).toHaveLength(5);
    expect(JSON.stringify(doc.toStudentView())).not.toContain('answerIdx');
    expect(JSON.stringify(doc)).not.toContain('answerIdx');
  });
  test('accepts a saved answer keyed by question id', async () => {
    const data = attempt(); data.answers = { [data.questions[0].questionId]: 1 };
    await expect(new Attempt(data).validate()).resolves.toBeUndefined();
  });
  test.each(['unknown', 'out-of-range', 'fraction'])('rejects %s answer', async (kind) => {
    const data = attempt(); data.answers = { [kind === 'unknown' ? id() : data.questions[0].questionId]: kind === 'out-of-range' ? 2 : kind === 'fraction' ? 0.5 : 0 };
    await expect(new Attempt(data).validate()).rejects.toThrow();
  });
  test('rejects a reset/extended clock', async () => {
    const data = attempt(); data.endsAt = new Date('2026-01-01T10:11:00Z');
    await expect(new Attempt(data).validate()).rejects.toThrow();
  });
  test('rejects duplicate snapshot questions', async () => {
    const data = attempt(); data.questions[1].questionId = data.questions[0].questionId;
    await expect(new Attempt(data).validate()).rejects.toThrow();
  });
  test('rejects snapshot answer key outside its options', async () => {
    const data = attempt(); data.questions[0].answerIdx = 2;
    await expect(new Attempt(data).validate()).rejects.toThrow();
  });
  test('requires submission metadata', async () => {
    await expect(new Attempt({ ...attempt(), status: 'SUBMITTED' }).validate()).rejects.toThrow();
  });
  test('rejects submission metadata on active attempts', async () => {
    await expect(new Attempt({ ...attempt(), submittedAt: new Date() }).validate()).rejects.toThrow();
  });
  test('accepts timeout submission', async () => {
    const data = attempt();
    await expect(new Attempt({ ...data, status: 'SUBMITTED', submittedAt: data.endsAt, submissionReason: 'TIMEOUT' }).validate()).resolves.toBeUndefined();
  });
  test('rejects a save before the server start time', async () => {
    await expect(new Attempt({ ...attempt(), lastSavedAt: new Date('2025-01-01') }).validate()).rejects.toThrow();
  });
  test('declares unique attempts, deadline lookup, and optimistic concurrency', () => {
    expect(Attempt.schema.indexes()).toEqual(expect.arrayContaining([
      [expect.objectContaining({ studentId: 1, testId: 1 }), expect.objectContaining({ unique: true })],
      [expect.objectContaining({ status: 1, endsAt: 1 }), expect.any(Object)],
    ]));
    expect(Attempt.schema.options.optimisticConcurrency).toBe(true);
  });
});
describe('Result — TST-6 / ANL-1', () => {
  test('accepts consistent counts and percentages', async () => {
    await expect(new Result(result()).validate()).resolves.toBeUndefined();
  });
  test.each([{ score: 90 }, { correctAnswers: 6 }, { score: -1 }, { totalQuestions: 4 }, { topicBreakdown: [] }])('rejects inconsistent result %o', async (patch) => {
    await expect(new Result({ ...result(), ...patch }).validate()).rejects.toThrow();
  });
  test('rejects incorrect topic percentage', async () => {
    const data = result(); data.topicBreakdown[0].percentage = 50;
    await expect(new Result(data).validate()).rejects.toThrow();
  });
  test('rejects mismatched topic totals', async () => {
    const data = result(); data.topicBreakdown[0].totalQuestions = 10; data.topicBreakdown[0].percentage = 40;
    await expect(new Result(data).validate()).rejects.toThrow();
  });
  test('rejects duplicate topics', async () => {
    const data = result(); data.topicBreakdown.push(data.topicBreakdown[0]);
    await expect(new Result(data).validate()).rejects.toThrow();
  });
  test('accepts zero score and a multi-topic result', async () => {
    const data = result(); data.correctAnswers = 0; data.score = 0;
    data.topicBreakdown = [
      { topic: 'Quantitative', totalQuestions: 2, correctAnswers: 0, percentage: 0 },
      { topic: 'Technical', totalQuestions: 3, correctAnswers: 0, percentage: 0 },
    ];
    await expect(new Result(data).validate()).resolves.toBeUndefined();
  });
});
