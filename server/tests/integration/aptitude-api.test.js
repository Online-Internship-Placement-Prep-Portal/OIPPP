jest.mock('../../src/middleware/auth', () => require('../helpers/fakeAuth'));
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const request = require('supertest');
const app = require('../../src/app');
const { as } = require('../helpers/fakeAuth');
const { User } = require('../helpers/fixtures');
const Question = require('../../src/modules/tests/question.model');
const Test = require('../../src/modules/tests/test.model');
const Attempt = require('../../src/modules/tests/attempt.model');
const Result = require('../../src/modules/tests/result.model');
const service = require('../../src/modules/tests/aptitude.service');
let mongo, admin, student, other, recruiter, questions, publishedTest;
const questionBody = (n = 0) => ({ text: `Question ${n}`, topic: n % 2 ? 'Technical' : 'Quantitative',
  difficulty: 'Easy', options: ['right', 'wrong'], answerIdx: 0 });
const api = (method, path, user = student, body) => {
  const call = request(app)[method](`/api${path}`);
  if (user) call.set(as(user));
  return body == null ? call : call.send(body);
};
async function start() { return api('post', `/tests/${publishedTest.id}/attempts`, student, {}); }
async function expire(id, delta = 1) {
  const endsAt = new Date(Date.now() - delta);
  await Attempt.collection.updateOne({ _id: new mongoose.Types.ObjectId(id) },
    { $set: { endsAt, startedAt: new Date(endsAt.getTime() - 600000) } });
}
beforeAll(async () => {
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mongo.getUri());
  await service.initialize();
}, 120000);
afterAll(async () => { await mongoose.disconnect(); if (mongo) await mongo.stop(); });
beforeEach(async () => {
  await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.collection.deleteMany({})));
  [admin, student, other, recruiter] = await User.create(['ADMIN', 'STUDENT', 'STUDENT', 'RECRUITER'].map((role, i) => ({
    role, name: `Aptitude fixture ${i}`, email: `aptitude-${i}@example.test`,
    passwordHash: 'unused-fake-auth-test-hash',
  })));
  questions = await Question.create(Array.from({ length: 5 }, (_, i) => ({ ...questionBody(i), createdBy: admin._id })));
  publishedTest = await Test.create({ title: 'Practice', durationMin: 10, questionIds: questions.map((q) => q._id),
    createdBy: admin._id, status: 'PUBLISHED' });
});

describe('question bank and test authoring (#25)', () => {
  test('admin creates a question; keys are explicit admin-only DTO fields', async () => {
    const res = await api('post', '/questions', admin, questionBody());
    expect(res.status).toBe(201); expect(res.body.answerIdx).toBe(0);
    expect(res.body.questionId).toBeDefined();
  });
  test.each([null, 'STUDENT', 'RECRUITER'])('rejects non-admin author %s', async (role) => {
    const user = role === 'STUDENT' ? student : role === 'RECRUITER' ? recruiter : null;
    expect((await api('post', '/questions', user, questionBody())).status).toBe(role ? 403 : 401);
  });
  test.each([
    { options: ['only'] }, { options: ['same', 'same'] }, { options: [' ', 'valid'] },
    { options: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] }, { answerIdx: 2 }, { answerIdx: 0.5 },
    { topic: 'Other' }, { difficulty: 'Impossible' }, { text: '' }, { text: { $ne: null } },
  ])('rejects invalid question %j', async (change) => {
    expect((await api('post', '/questions', admin, { ...questionBody(), ...change })).status).toBe(400);
  });
  test('bank filters, bounds and archive are supported', async () => {
    let res = await api('get', '/questions?topic=Technical&limit=1', admin);
    expect(res.body.total).toBe(2); expect(res.body.items).toHaveLength(1);
    res = await api('patch', `/questions/${questions[0].id}`, admin, { version: 0, archived: true });
    expect(res.status).toBe(200);
    expect((await api('get', '/questions', admin)).body.total).toBe(4);
    expect((await api('get', '/questions?archived=true', admin)).body.total).toBe(1);
    expect((await api('get', '/questions?limit=51', admin)).status).toBe(400);
    expect((await api('get', '/questions', student)).status).toBe(403);
  });
  test('editing validates answer against changed options and rejects stale versions', async () => {
    expect((await api('patch', `/questions/${questions[0].id}`, admin, { version: 0, answerIdx: 1 })).status).toBe(200);
    expect((await api('patch', `/questions/${questions[0].id}`, admin, { version: 0, text: 'stale' })).status).toBe(409);
    expect((await api('patch', `/questions/${questions[0].id}`, admin, { version: 1, answerIdx: 3 })).status).toBe(400);
  });
  test('create draft, edit, publish, list and archive without exposing keys', async () => {
    let res = await api('post', '/tests', admin, { title: 'New', durationMin: 15, questionIds: questions.map((q) => q.id) });
    expect(res.status).toBe(201); expect(res.body.status).toBe('DRAFT');
    const id = res.body.testId;
    expect((await api('get', `/tests/${id}`, student)).status).toBe(404);
    res = await api('patch', `/tests/${id}`, admin, { version: 0, title: 'Edited', status: 'PUBLISHED' });
    expect(res.status).toBe(200);
    res = await api('get', `/tests/${id}`, student);
    expect(res.body.title).toBe('Edited'); expect(res.body.questionIds).toBeUndefined();
    expect((await api('get', '/tests?status=DRAFT', student)).body.items.every((t) => t.status === 'PUBLISHED')).toBe(true);
    expect((await api('patch', `/tests/${id}`, admin, { version: 1, durationMin: 20 })).status).toBe(409);
    expect((await api('patch', `/tests/${id}`, admin, { version: 1, status: 'ARCHIVED' })).status).toBe(200);
    expect((await api('patch', `/tests/${id}`, admin, { version: 2, status: 'PUBLISHED' })).status).toBe(409);
  });
  test.each([{ durationMin: 9 }, { durationMin: 121 }, { durationMin: 10.5 }, { questionIds: [] }])('invalid test %j', async (change) => {
    expect((await api('post', '/tests', admin, { title: 'New', durationMin: 10,
      questionIds: questions.map((q) => q.id), ...change })).status).toBe(400);
  });
  test('duplicate, missing and archived questions cannot be used', async () => {
    const ids = questions.map((q) => q.id);
    for (const replacement of [ids[1], String(new mongoose.Types.ObjectId())]) {
      expect((await api('post', '/tests', admin, { title: 'Bad', durationMin: 10, questionIds: [replacement, ...ids.slice(1)] })).status).toBe(400);
    }
    const draft = await Test.create({ title: 'Draft', durationMin: 10, questionIds: ids, createdBy: admin._id });
    await Question.updateOne({ _id: ids[0] }, { archived: true });
    expect((await api('patch', `/tests/${draft.id}`, admin, { version: 0, status: 'PUBLISHED' })).status).toBe(400);
  });
  test('invalid id and unauthorized test creation are rejected', async () => {
    expect((await api('get', '/tests/nope', student)).status).toBe(400);
    expect((await api('post', '/tests', recruiter, {})).status).toBe(403);
  });
});

describe('timed attempts and recovery (#26)', () => {
  test('start and resume use one server deadline and never expose answer keys', async () => {
    const first = await start(); expect(first.status).toBe(201);
    const again = await start(); expect(again.status).toBe(200);
    expect(again.body.attemptId).toBe(first.body.attemptId); expect(again.body.endsAt).toBe(first.body.endsAt);
    expect(Date.parse(first.body.endsAt) - Date.parse(first.body.startedAt)).toBe(600000);
    expect(JSON.stringify(first.body)).not.toContain('answerIdx');
    expect(await Attempt.countDocuments()).toBe(1);
  });
  test('simultaneous start creates exactly one attempt', async () => {
    const res = await Promise.all(Array.from({ length: 6 }, () => start()));
    expect(res.every((r) => [200, 201].includes(r.status))).toBe(true);
    expect(new Set(res.map((r) => r.body.attemptId)).size).toBe(1);
    expect(await Attempt.countDocuments()).toBe(1);
  });
  test('draft/archived tests and non-students cannot start', async () => {
    await Test.updateOne({ _id: publishedTest._id }, { status: 'DRAFT' });
    expect((await start()).status).toBe(404);
    expect((await api('post', `/tests/${publishedTest.id}/attempts`, admin, {})).status).toBe(403);
    expect((await api('post', `/tests/${publishedTest.id}/attempts`, null, {})).status).toBe(401);
  });
  test('each acknowledged save survives reload; injected student/deadline fields are ignored', async () => {
    const res = await start(); const id = res.body.attemptId;
    expect((await api('patch', `/attempts/${id}/answers`, student, { questionId: questions[0].id, optionIdx: 1,
      studentId: other.id, endsAt: '2099-01-01' })).status).toBe(204);
    const reload = await api('get', `/attempts/${id}`, student);
    expect(reload.body.answers[questions[0].id]).toBe(1); expect(reload.body.endsAt).toBe(res.body.endsAt);
    expect(reload.body.lastSavedAt).toBeDefined(); expect(reload.body.version).toBe(1);
    expect(JSON.stringify(reload.body)).not.toContain('answerIdx');
  });
  test('independent saves do not replace the whole answer map', async () => {
    const { body: { attemptId: id } } = await start();
    for (const q of questions.slice(0, 3)) expect((await api('patch', `/attempts/${id}/answers`, student,
      { questionId: q.id, optionIdx: 0 })).status).toBe(204);
    expect(Object.keys((await api('get', `/attempts/${id}`, student)).body.answers)).toHaveLength(3);
  });
  test('stale client versions and invalid snapshot answers are rejected', async () => {
    const { body: { attemptId: id } } = await start();
    expect((await api('patch', `/attempts/${id}/answers`, student, { questionId: questions[0].id, optionIdx: 0, version: 5 })).status).toBe(409);
    for (const body of [{ questionId: String(new mongoose.Types.ObjectId()), optionIdx: 0 },
      { questionId: questions[0].id, optionIdx: 2 }, { questionId: questions[0].id, optionIdx: -1 },
      { questionId: { $ne: null }, optionIdx: 0 }, { questionId: questions[0].id, optionIdx: 0.5 }]) {
      expect((await api('patch', `/attempts/${id}/answers`, student, body)).status).toBe(400);
    }
  });
  test('other students cannot read, save, submit or fetch a result', async () => {
    const { body: { attemptId: id } } = await start();
    for (const [method, path, body] of [['get', '', undefined], ['patch', '/answers', { questionId: questions[0].id, optionIdx: 0 }],
      ['post', '/submit', {}], ['get', '/result', undefined]]) {
      expect((await api(method, `/attempts/${id}${path}`, other, body)).status).toBe(404);
    }
  });
  test('snapshots preserve old questions and keys; resume works after test archive', async () => {
    const { body: { attemptId: id } } = await start();
    await api('patch', `/questions/${questions[0].id}`, admin, { version: 0, text: 'changed', answerIdx: 1, archived: true });
    await Test.updateOne({ _id: publishedTest._id }, { status: 'ARCHIVED' });
    const resume = await start(); expect(resume.status).toBe(200);
    expect(resume.body.questions[0].text).toBe('Question 0');
    await api('patch', `/attempts/${id}/answers`, student, { questionId: questions[0].id, optionIdx: 0 });
    const result = await api('post', `/attempts/${id}/submit`, student, {});
    expect(result.status).toBe(200); expect(result.body.correctAnswers).toBe(1); expect(result.body.score).toBe(20);
  });
  test('manual submit is idempotent, terminal and returns canonical per-topic result', async () => {
    const { body: { attemptId: id } } = await start();
    for (const q of questions) await api('patch', `/attempts/${id}/answers`, student, { questionId: q.id, optionIdx: 0 });
    const res = await api('post', `/attempts/${id}/submit`, student, {});
    expect(res.status).toBe(200); expect(res.body.score).toBe(100); expect(res.body.topicBreakdown).toHaveLength(2);
    expect((await api('post', `/attempts/${id}/submit`, student, {})).body._id).toBe(res.body._id);
    expect((await api('get', `/attempts/${id}/result`, student)).body._id).toBe(res.body._id);
    expect((await start()).body.error.code).toBe('ATTEMPT_EXISTS');
    expect((await api('patch', `/attempts/${id}/answers`, student, { questionId: questions[0].id, optionIdx: 1 })).body.error.code).toBe('ATTEMPT_CLOSED');
    expect(await Result.countDocuments()).toBe(1);
  });
  test.each([1, 15000, 31000])('rejects saves %d ms after hard deadline and finalizes', async (delta) => {
    const { body: { attemptId: id } } = await start(); await expire(id, delta);
    const res = await api('patch', `/attempts/${id}/answers`, student, { questionId: questions[0].id, optionIdx: 0 });
    expect(res.status).toBe(409); expect(res.body.error.code).toBe('ATTEMPT_CLOSED');
    expect((await Attempt.findById(id)).submissionReason).toBe('TIMEOUT');
    expect((await Result.findOne({ attemptId: id })).correctAnswers).toBe(0);
  });
  test('server sweep catches overdue attempts without a client and ignores active attempts', async () => {
    const { body: { attemptId: id } } = await start();
    expect(await service.expireOverdue()).toBe(0); await expire(id);
    expect(await service.expireOverdue()).toBe(1); expect(await service.expireOverdue()).toBe(0);
    expect((await api('get', `/attempts/${id}`, student)).body.status).toBe('SUBMITTED');
    expect((await start()).status).toBe(409);
  });
  test('GET recovery finalizes overdue state', async () => {
    const { body: { attemptId: id } } = await start(); await expire(id);
    expect((await api('get', `/attempts/${id}`, student)).body.status).toBe('SUBMITTED');
    expect(await Result.countDocuments()).toBe(1);
  });
  test('simultaneous manual and timeout submissions converge to one result', async () => {
    const { body: { attemptId: id } } = await start(); await expire(id);
    const results = await Promise.all([service.finalize(student.id, id), service.finalize(student.id, id, true), service.finalize(student.id, id)]);
    expect(new Set(results.map((r) => r.id)).size).toBe(1);
    expect(await Result.countDocuments()).toBe(1);
  });
  test('result insertion failure rolls back closing, then retry succeeds', async () => {
    const { body: { attemptId: id } } = await start();
    const mock = jest.spyOn(Result, 'create').mockRejectedValueOnce(new Error('simulated write failure'));
    await expect(service.finalize(student.id, id)).rejects.toThrow('simulated write failure'); mock.mockRestore();
    expect((await Attempt.findById(id)).status).toBe('IN_PROGRESS'); expect(await Result.countDocuments()).toBe(0);
    expect((await api('post', `/attempts/${id}/submit`, student, {})).status).toBe(200);
  });
  test('save racing submit cannot mutate a closed result', async () => {
    const { body: { attemptId: id } } = await start();
    const [save, submit] = await Promise.all([
      api('patch', `/attempts/${id}/answers`, student, { questionId: questions[0].id, optionIdx: 0 }),
      api('post', `/attempts/${id}/submit`, student, {}),
    ]);
    expect([204, 409]).toContain(save.status); expect(submit.status).toBe(200);
    const stored = await Attempt.findById(id); const result = await Result.findOne({ attemptId: id });
    expect(result.correctAnswers).toBe(stored.answers.size); expect(stored.status).toBe('SUBMITTED');
  });
  test('an open attempt has no result yet', async () => {
    const { body: { attemptId: id } } = await start();
    expect((await api('get', `/attempts/${id}/result`, student)).body.error.code).toBe('ATTEMPT_OPEN');
  });
});
