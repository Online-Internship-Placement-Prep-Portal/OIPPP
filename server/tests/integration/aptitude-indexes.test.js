const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Question = require('../../src/modules/tests/question.model');
const Test = require('../../src/modules/tests/test.model');
const Attempt = require('../../src/modules/tests/attempt.model');
const Result = require('../../src/modules/tests/result.model');
let mongo;
const id = () => new mongoose.Types.ObjectId();
function attemptData(studentId = id(), testId = id()) {
  const startedAt = new Date();
  return { studentId, testId, durationMin: 10, startedAt, endsAt: new Date(startedAt.getTime() + 600000),
    questions: Array.from({ length: 5 }, () => ({ questionId: id(), text: '2 + 2?', topic: 'Quantitative', difficulty: 'Easy', options: ['3', '4'], answerIdx: 1 })) };
}
function resultData(attempt) {
  return { attemptId: attempt._id, studentId: attempt.studentId, testId: attempt.testId,
    totalQuestions: 5, correctAnswers: 4, score: 80, submittedAt: new Date(),
    topicBreakdown: [{ topic: 'Quantitative', totalQuestions: 5, correctAnswers: 4, percentage: 80 }] };
}
beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await Promise.all([Question.init(), Test.init(), Attempt.init(), Result.init()]);
});
afterEach(async () => { await Promise.all([Attempt.deleteMany({}), Result.deleteMany({}), Question.deleteMany({})]); });
afterAll(async () => { await mongoose.disconnect(); if (mongo) await mongo.stop(); });
test('concurrent starts cannot create duplicate attempts (real unique index)', async () => {
  const data = attemptData();
  const writes = await Promise.allSettled([Attempt.create(data), Attempt.create(data)]);
  expect(writes.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  expect(writes.find((r) => r.status === 'rejected').reason.code).toBe(11000);
});
test('saved answers and deadline survive reload, answer key stays private', async () => {
  const saved = await Attempt.create(attemptData());
  saved.answers.set(String(saved.questions[0].questionId), 1); saved.lastSavedAt = new Date(); await saved.save();
  const resumed = await Attempt.findById(saved._id);
  expect(resumed.endsAt).toEqual(saved.endsAt);
  expect(resumed.toStudentView().answers[String(saved.questions[0].questionId)]).toBe(1);
  expect(resumed.questions[0].answerIdx).toBeUndefined();
  const scoringCopy = await Attempt.findById(saved._id).select('+questions.answerIdx');
  expect(scoringCopy.questions[0].answerIdx).toBe(1);
  expect(JSON.stringify(scoringCopy)).not.toContain('answerIdx');
});
test('stale document saves cannot overwrite a newer answer', async () => {
  const saved = await Attempt.create(attemptData());
  const first = await Attempt.findById(saved._id); const stale = await Attempt.findById(saved._id);
  first.answers.set(String(first.questions[0].questionId), 1); await first.save();
  stale.answers.set(String(stale.questions[1].questionId), 0);
  await expect(stale.save()).rejects.toBeInstanceOf(mongoose.Error.VersionError);
});
test('bank edits do not change the attempt snapshot', async () => {
  const bank = await Question.create({ text: 'Original', topic: 'Quantitative', difficulty: 'Easy', options: ['a', 'b'], answerIdx: 1, createdBy: id() });
  const data = attemptData(); data.questions[0] = { ...data.questions[0], questionId: bank._id, text: bank.text };
  const saved = await Attempt.create(data); bank.text = 'Edited'; await bank.save();
  expect((await Attempt.findById(saved._id)).questions[0].text).toBe('Original');
});
test('result indexes prevent duplicate scoring records', async () => {
  const attempt = await Attempt.create(attemptData()); const data = resultData(attempt);
  await Result.create(data);
  await expect(Result.create({ ...data, studentId: id(), testId: id() })).rejects.toMatchObject({ code: 11000 });
  await expect(Result.create({ ...data, attemptId: id() })).rejects.toMatchObject({ code: 11000 });
});
