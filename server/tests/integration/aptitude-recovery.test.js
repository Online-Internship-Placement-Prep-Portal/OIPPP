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
let mongo, admin, student, questions, publishedTest;
const api = (method, path, body) => {
  const call = request(app)[method](`/api${path}`).set(as(student));
  return body == null ? call : call.send(body);
};
const start = () => api('post', `/tests/${publishedTest.id}/attempts`, {});
const save = (id, n, optionIdx, version) => api('patch', `/attempts/${id}/answers`,
  { questionId: questions[n].id, optionIdx, ...(version == null ? {} : { version }) });
// Moves the attempt's clock back as if `ms` had elapsed since it started.
async function elapse(id, ms) {
  const attempt = await Attempt.findById(id);
  await Attempt.collection.updateOne({ _id: attempt._id }, { $set: {
    startedAt: new Date(attempt.startedAt.getTime() - ms), endsAt: new Date(attempt.endsAt.getTime() - ms) } });
}
const remaining = (body) => Date.parse(body.endsAt) - Date.parse(body.serverTime);
beforeAll(async () => {
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mongo.getUri());
  await service.initialize();
}, 120000);
afterAll(async () => { await mongoose.disconnect(); if (mongo) await mongo.stop(); });
beforeEach(async () => {
  await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.collection.deleteMany({})));
  [admin, student] = await User.create(['ADMIN', 'STUDENT'].map((role, i) => ({
    role, name: `Recovery fixture ${i}`, email: `recovery-${i}@example.test`, passwordHash: 'unused-fake-auth-test-hash',
  })));
  questions = await Question.create(Array.from({ length: 5 }, (_, i) => ({ text: `Question ${i}`,
    topic: i % 2 ? 'Verbal' : 'Logical', difficulty: 'Medium', options: ['right', 'wrong', 'other'], answerIdx: 0,
    createdBy: admin._id })));
  publishedTest = await Test.create({ title: 'Recovery', durationMin: 10, questionIds: questions.map((q) => q._id),
    createdBy: admin._id, status: 'PUBLISHED' });
});

describe('refresh and closed tab (SAFE-1)', () => {
  test('refresh returns every acknowledged answer and the original clock', async () => {
    const { body: started } = await start();
    for (const [n, opt] of [[0, 0], [1, 2], [3, 1]]) expect((await save(started.attemptId, n, opt)).status).toBe(204);
    await elapse(started.attemptId, 4 * 60000);
    const { body } = await api('get', `/attempts/${started.attemptId}`);
    expect(body.answers).toEqual({ [questions[0].id]: 0, [questions[1].id]: 2, [questions[3].id]: 1 });
    expect(body.status).toBe('IN_PROGRESS'); expect(body.version).toBe(3);
    expect(remaining(body)).toBeLessThanOrEqual(6 * 60000); expect(remaining(body)).toBeGreaterThan(5 * 60000);
  });
  test('reopening the test from a new tab resumes instead of restarting the clock', async () => {
    const { body: started } = await start();
    await save(started.attemptId, 2, 1); await elapse(started.attemptId, 3 * 60000);
    const reopened = await start();
    expect(reopened.status).toBe(200); expect(reopened.body.attemptId).toBe(started.attemptId);
    expect(reopened.body.answers).toEqual({ [questions[2].id]: 1 });
    expect(Date.parse(reopened.body.endsAt)).toBe(Date.parse(started.endsAt) - 3 * 60000);
    expect(remaining(reopened.body)).toBeLessThanOrEqual(7 * 60000);
  });
  test('serverTime gives remaining time independent of a skewed client clock', async () => {
    const { body } = await start();
    expect(Math.abs(Date.parse(body.serverTime) - Date.now())).toBeLessThan(5000);
    expect(remaining(body)).toBeGreaterThan(9 * 60000); expect(remaining(body)).toBeLessThanOrEqual(10 * 60000);
  });
});

describe('dropped connection (SAFE-1, TST-4)', () => {
  test('retrying a save whose 204 was lost is acknowledged without a second write', async () => {
    const { body: { attemptId: id } } = await start();
    expect((await save(id, 0, 1, 0)).status).toBe(204);
    expect((await save(id, 0, 1, 0)).status).toBe(204);
    const { body } = await api('get', `/attempts/${id}`);
    expect(body.version).toBe(1); expect(body.answers[questions[0].id]).toBe(1);
  });
  test('a different answer from a stale screen is still a conflict', async () => {
    const { body: { attemptId: id } } = await start();
    await save(id, 0, 1, 0);
    const res = await save(id, 0, 2, 0);
    expect(res.status).toBe(409); expect(res.body.error.code).toBe('STALE_VERSION');
    expect((await api('get', `/attempts/${id}`)).body.answers[questions[0].id]).toBe(1);
  });
  test('a replayed save cannot reopen a submitted attempt', async () => {
    const { body: { attemptId: id } } = await start();
    await save(id, 0, 0); await api('post', `/attempts/${id}/submit`, {});
    const res = await save(id, 0, 0);
    expect(res.status).toBe(409); expect(res.body.error.code).toBe('ATTEMPT_CLOSED');
  });
});

describe('deadline passes while offline (TST-5)', () => {
  test('reconnecting finds a timed-out attempt scored from the saved answers', async () => {
    const { body: { attemptId: id } } = await start();
    await save(id, 0, 0); await save(id, 1, 0); await save(id, 2, 1);
    await elapse(id, 10 * 60000 + 1000);
    const { body } = await api('get', `/attempts/${id}`);
    expect(body.status).toBe('SUBMITTED'); expect(body.submissionReason).toBe('TIMEOUT');
    expect(Object.keys(body.answers)).toHaveLength(3);
    const result = await api('get', `/attempts/${id}/result`);
    expect(result.body).toMatchObject({ correctAnswers: 2, score: 40 });
    expect((await save(id, 3, 0)).body.error.code).toBe('ATTEMPT_CLOSED');
    expect((await start()).body.error.code).toBe('ATTEMPT_EXISTS');
  });
  test('manual submission is reported as such', async () => {
    const { body: { attemptId: id } } = await start();
    await api('post', `/attempts/${id}/submit`, {});
    expect((await api('get', `/attempts/${id}`)).body.submissionReason).toBe('MANUAL');
  });
});

describe('API restart', () => {
  test('answers and deadline survive a database reconnect; overdue attempts are caught up', async () => {
    const { body: started } = await start();
    await save(started.attemptId, 4, 0);
    await mongoose.disconnect();
    await mongoose.connect(mongo.getUri());
    const { body } = await api('get', `/attempts/${started.attemptId}`);
    expect(body.answers).toEqual({ [questions[4].id]: 0 }); expect(body.endsAt).toBe(started.endsAt);
    await elapse(started.attemptId, 11 * 60000);
    expect(await service.expireOverdue()).toBe(1);
    expect(await Result.countDocuments({ attemptId: started.attemptId })).toBe(1);
  });
});
