const mongoose = require('mongoose');
const AppError = require('../../utils/AppError');
const logger = require('../../utils/logger');
const Question = require('./question.model');
const Test = require('./test.model');
const Attempt = require('./attempt.model');
const Result = require('./result.model');
const { TOPICS, percentage } = require('./schema.helpers');

const fail = (status, code, message) => { throw new AppError(status, code, message); };
const missing = () => fail(404, 'NOT_FOUND', 'Record not found');
// serverTime lets a client derive remaining time from endsAt without trusting its own clock.
const publicAttempt = (attempt) => ({ ...attempt.toStudentView(), version: attempt.__v,
  lastSavedAt: attempt.lastSavedAt, submittedAt: attempt.submittedAt,
  submissionReason: attempt.submissionReason, serverTime: new Date() });
const publicResult = (r) => ({ resultId: r.id, attemptId: r.attemptId, testId: r.testId,
  totalQuestions: r.totalQuestions, correctAnswers: r.correctAnswers, score: r.score, submittedAt: r.submittedAt,
  topicBreakdown: r.topicBreakdown.map(({ topic, totalQuestions, correctAnswers, percentage: pct }) =>
    ({ topic, totalQuestions, correctAnswers, percentage: pct })) });
const adminQuestion = (q) => ({ questionId: q.id, text: q.text, topic: q.topic,
  difficulty: q.difficulty, options: q.options, answerIdx: q.answerIdx, archived: q.archived,
  version: q.__v });
const publicTest = (t) => ({ testId: t.id, title: t.title, durationMin: t.durationMin,
  questionCount: t.questionIds.length, status: t.status, version: t.__v });

async function createQuestion(adminId, body) {
  return adminQuestion(await Question.create({ ...body, createdBy: adminId }));
}
async function listQuestions(query) {
  const filter = { archived: query.archived };
  for (const key of ['topic', 'difficulty']) if (query[key]) filter[key] = query[key];
  const items = await Question.find(filter).select('+answerIdx').sort({ _id: -1 })
    .skip((query.page - 1) * query.limit).limit(query.limit);
  return { items: items.map(adminQuestion), page: query.page, total: await Question.countDocuments(filter) };
}
async function updateQuestion(id, body) {
  const q = await Question.findById(id).select('+answerIdx');
  if (!q) missing();
  if (body.version !== q.__v) fail(409, 'STALE_VERSION', 'Reload before editing');
  const changes = { ...body };
  delete changes.version;
  Object.assign(q, changes);
  return adminQuestion(await q.save());
}
async function usableQuestions(ids) {
  const questions = await Question.find({ _id: { $in: ids }, archived: false }).select('+answerIdx');
  if (questions.length !== ids.length) fail(400, 'INVALID_QUESTIONS', 'Every question must exist and be active');
  const byId = new Map(questions.map((q) => [q.id, q]));
  return ids.map((id) => byId.get(String(id)));
}
async function createTest(adminId, body) {
  await usableQuestions(body.questionIds);
  const test = await Test.create({ ...body, createdBy: adminId });
  return { ...publicTest(test), questionIds: test.questionIds };
}
async function listTests(role, query) {
  const filter = role === 'ADMIN' ? (query.status ? { status: query.status } : {}) : { status: 'PUBLISHED' };
  const items = await Test.find(filter).sort({ _id: -1 }).skip((query.page - 1) * query.limit).limit(query.limit);
  return { items: items.map(publicTest), page: query.page, total: await Test.countDocuments(filter) };
}
async function getTest(role, id) {
  const test = await Test.findById(id);
  if (!test || (role !== 'ADMIN' && test.status !== 'PUBLISHED')) missing();
  return role === 'ADMIN' ? { ...publicTest(test), questionIds: test.questionIds } : publicTest(test);
}
async function updateTest(id, body) {
  const test = await Test.findById(id);
  if (!test) missing();
  if (body.version !== test.__v) fail(409, 'STALE_VERSION', 'Reload before editing');
  const changes = { ...body };
  delete changes.version;
  if (test.status !== 'DRAFT' && (changes.title || changes.durationMin || changes.questionIds)) {
    fail(409, 'TEST_LOCKED', 'Only draft test content can be edited');
  }
  if (test.status !== 'DRAFT' && changes.status !== 'ARCHIVED') {
    fail(409, 'TEST_LOCKED', 'Published or archived tests cannot return to draft or be republished');
  }
  Object.assign(test, changes);
  if (test.status === 'PUBLISHED' || changes.questionIds) await usableQuestions(test.questionIds);
  await test.save();
  return { ...publicTest(test), questionIds: test.questionIds };
}
async function ownedAttempt(studentId, id, session) {
  const query = Attempt.findOne({ _id: id, studentId }).select('+questions.answerIdx');
  if (session) query.session(session);
  const attempt = await query;
  if (!attempt) missing();
  return attempt;
}
function scoreAttempt(attempt, submittedAt) {
  const topics = new Map();
  let correctAnswers = 0;
  for (const q of attempt.questions) {
    const topic = topics.get(q.topic) || { topic: q.topic, totalQuestions: 0, correctAnswers: 0 };
    topic.totalQuestions += 1;
    if (attempt.answers.get(String(q.questionId)) === q.answerIdx) {
      topic.correctAnswers += 1;
      correctAnswers += 1;
    }
    topics.set(q.topic, topic);
  }
  return { attemptId: attempt._id, studentId: attempt.studentId, testId: attempt.testId,
    totalQuestions: attempt.questions.length, correctAnswers,
    score: percentage(correctAnswers, attempt.questions.length), submittedAt,
    topicBreakdown: TOPICS.filter((t) => topics.has(t)).map((t) => topics.get(t))
      .map((t) => ({ ...t, percentage: percentage(t.correctAnswers, t.totalQuestions) })) };
}
// Replica set transactions keep closing and the canonical result all-or-nothing.
async function finalize(studentId, id, timeoutOnly = false) {
  const session = await mongoose.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      const attempt = await ownedAttempt(studentId, id, session);
      if (attempt.status === 'SUBMITTED') {
        result = await Result.findOne({ attemptId: id }).session(session);
        if (!result) fail(503, 'RESULT_UNAVAILABLE', 'Submitted result needs administrator recovery');
        return;
      }
      const now = new Date();
      const expired = now >= attempt.endsAt;
      if (timeoutOnly && !expired) return;
      attempt.status = 'SUBMITTED';
      attempt.submissionReason = expired ? 'TIMEOUT' : 'MANUAL';
      attempt.submittedAt = now;
      await attempt.save({ session });
      [result] = await Result.create([scoreAttempt(attempt, now)], { session });
    });
    return result;
  } finally { await session.endSession(); }
}
async function resumeView(attempt) {
  if (attempt.status === 'IN_PROGRESS' && new Date() >= attempt.endsAt) {
    await finalize(attempt.studentId, attempt.id, true);
    attempt = await ownedAttempt(attempt.studentId, attempt.id);
  }
  return publicAttempt(attempt);
}
async function startAttempt(studentId, testId) {
  const existing = await Attempt.findOne({ studentId, testId });
  if (existing) {
    const view = await resumeView(existing);
    if (view.status === 'SUBMITTED') fail(409, 'ATTEMPT_EXISTS', 'This test has already been submitted; retrieve the attempt result');
    return { created: false, ...view };
  }
  const test = await Test.findOne({ _id: testId, status: 'PUBLISHED' });
  if (!test) missing();
  const questions = await usableQuestions(test.questionIds);
  const startedAt = new Date();
  try {
    const attempt = await Attempt.create({ studentId, testId, durationMin: test.durationMin,
      startedAt, endsAt: new Date(startedAt.getTime() + test.durationMin * 60000),
      questions: questions.map((q) => ({ questionId: q._id, text: q.text, topic: q.topic,
        difficulty: q.difficulty, options: [...q.options], answerIdx: q.answerIdx })) });
    return { created: true, ...publicAttempt(attempt) };
  } catch (err) {
    if (err.code !== 11000) throw err;
    return startAttempt(studentId, testId);
  }
}
async function getAttempt(studentId, id) { return resumeView(await ownedAttempt(studentId, id)); }
async function saveAnswer(studentId, id, body) {
  const attempt = await ownedAttempt(studentId, id);
  if (attempt.status !== 'IN_PROGRESS') fail(409, 'ATTEMPT_CLOSED', 'Attempt is closed');
  if (new Date() >= attempt.endsAt) {
    await finalize(studentId, id, true);
    fail(409, 'ATTEMPT_CLOSED', 'The server deadline has passed');
  }
  const questionId = String(new mongoose.Types.ObjectId(body.questionId));
  const q = attempt.questions.find((item) => String(item.questionId) === questionId);
  if (!q || body.optionIdx >= q.options.length) fail(400, 'INVALID_ANSWER', 'Choose an option from this attempt');
  // A retry after a lost 204 finds its answer already stored; acknowledge it instead of a version conflict.
  if (attempt.answers.get(questionId) === body.optionIdx) return;
  if (body.version != null && body.version !== attempt.__v) fail(409, 'STALE_VERSION', 'Reload the attempt before retrying');
  // Per-key atomic write + version guard prevents stale map replacement and finalization races.
  const saved = await Attempt.updateOne({ _id: id, studentId, status: 'IN_PROGRESS', __v: attempt.__v,
    $expr: { $gt: ['$endsAt', '$$NOW'] } },
  { $set: { [`answers.${questionId}`]: body.optionIdx, lastSavedAt: new Date() }, $inc: { __v: 1 } });
  if (saved.modifiedCount !== 1) fail(409, 'ATTEMPT_CHANGED', 'Reload: the attempt changed or reached its deadline');
}
async function getResult(studentId, id) {
  const attempt = await ownedAttempt(studentId, id);
  await resumeView(attempt);
  const result = await Result.findOne({ attemptId: id, studentId });
  if (!result) fail(409, 'ATTEMPT_OPEN', 'Submit the attempt first');
  return result;
}
async function expireOverdue(batchSize = 100) {
  const attempts = await Attempt.find({ status: 'IN_PROGRESS', endsAt: { $lte: new Date() } })
    .sort({ endsAt: 1 }).limit(batchSize).select('_id studentId');
  for (const attempt of attempts) {
    try { await finalize(attempt.studentId, attempt.id, true); }
    catch (err) {
      logger.error({ attemptId: attempt.id, err: err.message }, 'overdue attempt failed; retained for retry');
    }
  }
  return attempts.length;
}
async function initialize() {
  const hello = await mongoose.connection.db.admin().command({ hello: 1 });
  if (!hello.setName && hello.msg !== 'isdbgrid') throw new Error('Aptitude attempts require a MongoDB replica set or sharded cluster for transactions');
  await Promise.all([Question.init(), Test.init(), Attempt.init(), Result.init()]);
}
module.exports = { publicResult, scoreAttempt, createQuestion, listQuestions, updateQuestion, createTest, listTests, getTest, updateTest,
  startAttempt, getAttempt, saveAnswer, finalize, getResult, expireOverdue, initialize };
