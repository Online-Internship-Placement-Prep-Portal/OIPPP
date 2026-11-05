#!/usr/bin/env node
/*
 * System test for the aptitude and analytics test cases (#96) against a deployed build.
 * It only calls the public API, the same way Postman does.
 *
 *   node scripts/system-test-aptitude.js                     # student + recruiter checks only
 *   ADMIN_EMAIL=admin@oippp.dev ADMIN_PASSWORD=... node scripts/system-test-aptitude.js --admin
 *   ... --admin --timeout                                    # also waits for a 10-minute test to time out
 *   ... --admin --safe2                                      # also deactivates SAFE2_STUDENT (irreversible)
 *
 * Env: API (default https://oippp-api.onrender.com/api), STUDENT_PASSWORD (default Demo12345, the
 * seed:demo default), STUDENT_A / STUDENT_B / RECRUITER emails, SAFE2_STUDENT, OUT (JSON evidence path).
 * Creates its own questions and tests (titles start with "ST-96"); never edits seed:demo records,
 * except the one student deactivated by --safe2.
 */
const fs = require('fs');

const API = (process.env.API || 'https://oippp-api.onrender.com/api').replace(/\/$/, '');
const PW = process.env.STUDENT_PASSWORD || 'Demo12345';
const STUDENT_A = process.env.STUDENT_A || 'student0187@students.example.com';
const STUDENT_B = process.env.STUDENT_B || 'student0188@students.example.com';
const RECRUITER = process.env.RECRUITER || 'recruiter07@example.com';
const SAFE2_STUDENT = process.env.SAFE2_STUDENT || 'student0199@students.example.com';
const args = new Set(process.argv.slice(2));
const RUN_ADMIN = args.has('--admin');
const RUN_TIMEOUT = args.has('--timeout');
const RUN_SAFE2 = args.has('--safe2');
const STAMP = new Date().toISOString().replace(/[:.]/g, '-');
const OUT = process.env.OUT || `system-test-aptitude-${STAMP}.json`;

const results = [];
const log = (...a) => console.log(...a);
function check(tc, name, pass, detail = '') {
  results.push({ tc, name, pass: Boolean(pass), detail });
  log(`${pass ? 'PASS' : 'FAIL'}  ${tc}  ${name}${detail ? `  — ${detail}` : ''}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function call(method, path, { token, body, raw } = {}) {
  const t0 = Date.now();
  const res = await fetch(API + path, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const ms = Date.now() - t0;
  const text = await res.text();
  let json = null;
  if (!raw) { try { json = text ? JSON.parse(text) : null; } catch { json = null; } }
  return { status: res.status, json, text, ms, headers: res.headers };
}
const code = (r) => r.json && (r.json.code || (r.json.error && r.json.error.code));

async function login(email, password) {
  const r = await call('POST', '/auth/login', { body: { email, password } });
  if (r.status !== 200) throw new Error(`login ${email} -> ${r.status} ${r.text.slice(0, 200)}`);
  return { token: r.json.token, user: r.json.user };
}

async function studentChecks(ctx) {
  const { a, b, rec } = ctx;
  // Health and roles
  const h = await call('GET', '/health');
  check('ENV', 'GET /health', h.status === 200, `${h.status} ${h.text}`);

  const noAuth = await call('GET', '/tests');
  check('TST-RBAC', 'unauthenticated GET /tests is 401', noAuth.status === 401, String(noAuth.status));
  const recTests = await call('GET', '/tests', { token: rec.token });
  check('TST-RBAC', 'recruiter GET /tests is 403', recTests.status === 403, String(recTests.status));
  const recQ = await call('GET', '/questions', { token: rec.token });
  check('TST-1', 'recruiter GET /questions is 403', recQ.status === 403, String(recQ.status));
  const stuQ = await call('GET', '/questions', { token: a.token });
  check('TST-1', 'student GET /questions is 403', stuQ.status === 403, String(stuQ.status));
  const stuPostQ = await call('POST', '/questions', { token: a.token, body: { text: 'x', topic: 'Logical', difficulty: 'Easy', options: ['a', 'b'], answerIdx: 0 } });
  check('TST-1', 'student POST /questions is 403', stuPostQ.status === 403, String(stuPostQ.status));
  const stuPostT = await call('POST', '/tests', { token: a.token, body: { title: 'x', durationMin: 10, questionIds: [] } });
  check('TST-2', 'student POST /tests is 403', stuPostT.status === 403, String(stuPostT.status));

  const list = await call('GET', '/tests?limit=50', { token: a.token });
  const items = (list.json && list.json.items) || [];
  check('TST-2', 'student test list shows only PUBLISHED tests', list.status === 200 && items.length > 0 && items.every((t) => t.status === 'PUBLISHED'),
    `${items.length} tests: ${items.map((t) => `${t.title} (${t.questionCount}q/${t.durationMin}m, myAttempt=${t.myAttempt ? t.myAttempt.status : 'none'})`).join('; ')}`);

  const test = ctx.testForA || items.find((t) => !t.myAttempt);
  if (!test) { check('TC-TST-01', 'a published test with no attempt exists for student A', false, STUDENT_A); return; }
  ctx.testA = test;

  // TC-TST-01: start, answer 5, close tab, reopen
  const start = await call('POST', `/tests/${test.testId}/attempts`, { token: a.token });
  check('TC-TST-01', 'start returns 201 with endsAt and questions', start.status === 201 && start.json && start.json.endsAt && start.json.questions.length === test.questionCount,
    `${start.status}, ${start.json && start.json.questions && start.json.questions.length} questions, endsAt ${start.json && start.json.endsAt}`);
  if (start.status !== 201 && start.status !== 200) return;
  const att = start.json;
  const dur = (new Date(att.endsAt) - new Date(att.startedAt)) / 60000;
  check('TST-5', 'endsAt = startedAt + durationMin (server clock)', Math.abs(dur - test.durationMin) < 0.01, `${dur} min vs ${test.durationMin}`);
  const keyLeak = att.questions.some((q) => 'answerIdx' in q || 'correct' in q);
  check('TST-1', 'student attempt questions carry no answerIdx', !keyLeak, Object.keys(att.questions[0]).join(','));

  const saveTimes = [];
  const chosen = {};
  for (let i = 0; i < 5; i += 1) {
    const q = att.questions[i];
    const optionIdx = i === 0 ? 0 : i % q.options.length;
    const r = await call('PATCH', `/attempts/${att.attemptId}/answers`, { token: a.token, body: { questionId: q.questionId, optionIdx } });
    saveTimes.push(r.ms);
    chosen[q.questionId] = optionIdx;
    if (r.status !== 204) check('TC-TST-01', `save answer ${i + 1} returns 204`, false, `${r.status} ${r.text}`);
  }
  check('TC-TST-01', '5 saves acknowledged with 204 (incl. option 0)', saveTimes.length === 5, `ms: ${saveTimes.join(', ')}`);
  check('TST-4', 'each save acknowledged within 1 s (client round trip)', Math.max(...saveTimes) < 1000, `max ${Math.max(...saveTimes)} ms`);

  const changed = att.questions[1];
  const changeTo = (chosen[changed.questionId] + 1) % changed.options.length;
  const chg = await call('PATCH', `/attempts/${att.attemptId}/answers`, { token: a.token, body: { questionId: changed.questionId, optionIdx: changeTo } });
  chosen[changed.questionId] = changeTo;
  check('TST-4', 'changing an answer returns 204', chg.status === 204, String(chg.status));

  const retry = await call('PATCH', `/attempts/${att.attemptId}/answers`, { token: a.token, body: { questionId: changed.questionId, optionIdx: changeTo, version: 0 } });
  check('SAFE-1', 'retry of an already stored answer (lost 204) is 204, even with an old version', retry.status === 204, String(retry.status));
  const stale = await call('PATCH', `/attempts/${att.attemptId}/answers`, { token: a.token, body: { questionId: changed.questionId, optionIdx: (changeTo + 1) % changed.options.length, version: 0 } });
  check('TST-4', 'different answer with a stale version is 409 STALE_VERSION', stale.status === 409 && code(stale) === 'STALE_VERSION', `${stale.status} ${code(stale)}`);
  const bad = await call('PATCH', `/attempts/${att.attemptId}/answers`, { token: a.token, body: { questionId: changed.questionId, optionIdx: changed.options.length } });
  check('TST-4', 'out-of-range option is 400 INVALID_ANSWER', bad.status === 400 && code(bad) === 'INVALID_ANSWER', `${bad.status} ${code(bad)}`);

  const refresh = await call('GET', `/attempts/${att.attemptId}`, { token: a.token });
  const sameAnswers = refresh.json && Object.entries(chosen).every(([q, o]) => refresh.json.answers[q] === o) && Object.keys(refresh.json.answers).length === 5;
  check('SAFE-1', 'refresh (GET attempt) returns all 5 acknowledged answers and the original endsAt',
    refresh.status === 200 && sameAnswers && refresh.json.endsAt === att.endsAt, `${refresh.status}, answers ${JSON.stringify(refresh.json && refresh.json.answers)}`);
  const remaining = refresh.json ? (new Date(refresh.json.endsAt) - new Date(refresh.json.serverTime)) / 1000 : -1;
  check('SAFE-1', 'remaining time = endsAt − serverTime, counted from the original start', remaining > 0 && remaining <= test.durationMin * 60, `${Math.round(remaining)} s left`);

  const reopen = await call('POST', `/tests/${test.testId}/attempts`, { token: a.token });
  check('TC-TST-01', 'reopen (start again) returns 200 with the same attempt and endsAt',
    reopen.status === 200 && String(reopen.json.attemptId) === String(att.attemptId) && reopen.json.endsAt === att.endsAt,
    `${reopen.status}, same id ${reopen.json && String(reopen.json.attemptId) === String(att.attemptId)}`);
  const parallel = await Promise.all([1, 2, 3].map(() => call('POST', `/tests/${test.testId}/attempts`, { token: a.token })));
  check('TST-3', '3 concurrent starts all resume the same attempt', parallel.every((r) => r.status === 200 && String(r.json.attemptId) === String(att.attemptId)),
    parallel.map((r) => r.status).join(','));

  // Owner isolation
  const other = await call('GET', `/attempts/${att.attemptId}`, { token: b.token });
  const otherSave = await call('PATCH', `/attempts/${att.attemptId}/answers`, { token: b.token, body: { questionId: changed.questionId, optionIdx: 0 } });
  const otherSubmit = await call('POST', `/attempts/${att.attemptId}/submit`, { token: b.token });
  check('TST-3', "another student cannot read, save or submit A's attempt (404)", [other, otherSave, otherSubmit].every((r) => r.status === 404),
    [other, otherSave, otherSubmit].map((r) => r.status).join(','));
  const early = await call('GET', `/attempts/${att.attemptId}/result`, { token: a.token });
  check('TST-6', 'result before submission is 409 ATTEMPT_OPEN', early.status === 409 && code(early) === 'ATTEMPT_OPEN', `${early.status} ${code(early)}`);

  const before = await call('GET', '/analytics/me', { token: a.token });

  // Submit, idempotency, single attempt
  const sub = await call('POST', `/attempts/${att.attemptId}/submit`, { token: a.token });
  const r = sub.json || {};
  const sumQ = (r.topicBreakdown || []).reduce((s, t) => s + t.totalQuestions, 0);
  const sumC = (r.topicBreakdown || []).reduce((s, t) => s + t.correctAnswers, 0);
  check('TST-6', 'submit returns 200 with score and per-topic breakdown that sums to the totals',
    sub.status === 200 && sumQ === r.totalQuestions && sumC === r.correctAnswers && Math.abs(r.score - (100 * r.correctAnswers) / r.totalQuestions) < 1e-9,
    `${sub.status}, ${r.correctAnswers}/${r.totalQuestions} = ${r.score}%, topics ${(r.topicBreakdown || []).map((t) => `${t.topic} ${t.correctAnswers}/${t.totalQuestions}`).join(', ')}, ${sub.ms} ms`);
  check('PERF-2', 'submit round trip measured at the client < 1 s (includes the network to Render)', sub.ms < 1000, `${sub.ms} ms`);
  const sub2 = await call('POST', `/attempts/${att.attemptId}/submit`, { token: a.token });
  check('TST-6', 'repeat submit returns the same result', sub2.status === 200 && sub2.json.resultId === r.resultId, `${sub2.status}`);
  const res = await call('GET', `/attempts/${att.attemptId}/result`, { token: a.token });
  check('TST-6', 'GET result matches submit', res.status === 200 && res.json.resultId === r.resultId && res.json.score === r.score, String(res.status));
  const otherRes = await call('GET', `/attempts/${att.attemptId}/result`, { token: b.token });
  check('TST-6', "another student cannot read A's result (404)", otherRes.status === 404, String(otherRes.status));
  const closedAtt = await call('GET', `/attempts/${att.attemptId}`, { token: a.token });
  check('TST-3', 'attempt is SUBMITTED / MANUAL', closedAtt.json && closedAtt.json.status === 'SUBMITTED' && closedAtt.json.submissionReason === 'MANUAL',
    `${closedAtt.json && closedAtt.json.status} ${closedAtt.json && closedAtt.json.submissionReason}`);
  const late = await call('PATCH', `/attempts/${att.attemptId}/answers`, { token: a.token, body: { questionId: att.questions[6].questionId, optionIdx: 0 } });
  check('TST-5', 'answer after submission is 409 ATTEMPT_CLOSED', late.status === 409 && code(late) === 'ATTEMPT_CLOSED', `${late.status} ${code(late)}`);
  const again = await call('POST', `/tests/${test.testId}/attempts`, { token: a.token });
  check('TST-3', 'starting a submitted test again is 409 ATTEMPT_EXISTS', again.status === 409 && code(again) === 'ATTEMPT_EXISTS', `${again.status} ${code(again)}`);
  const listAfter = await call('GET', '/tests?limit=50', { token: a.token });
  const mine = listAfter.json.items.find((t) => t.testId === test.testId);
  check('TST-3', 'test list shows myAttempt SUBMITTED for that test', mine && mine.myAttempt && mine.myAttempt.status === 'SUBMITTED', JSON.stringify(mine && mine.myAttempt));

  // ANL-1
  const me = await call('GET', '/analytics/me', { token: a.token });
  const m = me.json || {};
  const last = (m.trend || [])[m.trend.length - 1] || {};
  check('ANL-1', 'GET /analytics/me shows the new result at the end of the trend', me.status === 200 && String(last.attemptId) === String(att.attemptId) && last.score === r.score,
    `${me.status}, testsTaken ${before.json && before.json.testsTaken} -> ${m.testsTaken}, last ${last.testTitle} ${last.score}`);
  check('ANL-1', 'testsTaken increased by 1; trend oldest first', m.testsTaken === before.json.testsTaken + 1
    && m.trend.every((p, i) => i === 0 || new Date(m.trend[i - 1].submittedAt) <= new Date(p.submittedAt)), `${m.testsTaken}`);
  const avg = m.trend.reduce((s, p) => s + p.score, 0) / m.trend.length;
  check('ANL-1', 'averageScore is the mean of the trend scores', Math.abs(avg - m.averageScore) < 1e-6, `${m.averageScore} vs ${avg}`);
  check('ANL-1', 'weakestTopics = first two of topics (weakest first)', m.weakestTopics.length <= 2
    && JSON.stringify(m.weakestTopics) === JSON.stringify(m.topics.slice(0, 2))
    && m.topics.every((t, i) => i === 0 || m.topics[i - 1].percentage <= t.percentage), m.weakestTopics.map((t) => `${t.topic} ${t.percentage.toFixed(1)}%`).join(', '));
  const apps = await call('GET', '/applications/mine', { token: a.token });
  const counts = {};
  for (const ap of apps.json.items) counts[ap.status] = (counts[ap.status] || 0) + 1;
  const statusesMatch = Object.entries(m.applications.byStatus).every(([s, n]) => (counts[s] || 0) === n);
  check('ANL-1', 'application counts per status match GET /applications/mine', statusesMatch && m.applications.total === apps.json.items.length,
    `${JSON.stringify(m.applications.byStatus)} total ${m.applications.total}`);
  const recMe = await call('GET', '/analytics/me', { token: rec.token });
  check('ANL-1', 'recruiter GET /analytics/me is 403', recMe.status === 403, String(recMe.status));
  const stuPl = await call('GET', '/analytics/placements', { token: a.token });
  const stuEx = await call('GET', '/analytics/placements/export', { token: a.token });
  const recPl = await call('GET', '/analytics/placements', { token: rec.token });
  check('ANL-2', 'student and recruiter GET /analytics/placements(+/export) are 403', [stuPl, stuEx, recPl].every((x) => x.status === 403), [stuPl, stuEx, recPl].map((x) => x.status).join(','));

  ctx.studentEmpty = null;
  for (const n of ['0200', '0198', '0197', '0196']) {
    // look for a student with no tests yet to check the empty state (read only)
    // eslint-disable-next-line no-await-in-loop
    const s = await login(`student${n}@students.example.com`, PW).catch(() => null);
    if (!s) continue;
    // eslint-disable-next-line no-await-in-loop
    const e = await call('GET', '/analytics/me', { token: s.token });
    if (e.json && e.json.testsTaken === 0) { ctx.studentEmpty = { n, body: e.json }; break; }
  }
  if (ctx.studentEmpty) {
    const e = ctx.studentEmpty.body;
    check('ANL-1', 'student with no tests: averageScore null, empty trend/topics', e.averageScore === null && e.trend.length === 0 && e.topics.length === 0 && e.weakestTopics.length === 0,
      `student${ctx.studentEmpty.n}`);
  } else {
    results.push({ tc: 'ANL-1', name: 'empty state', pass: null, detail: 'no seeded student without results among those checked; not run' });
    log('SKIP  ANL-1  empty state — every checked student already has results');
  }
}

async function adminChecks(ctx) {
  const { admin, a, rec } = ctx;
  const T = 'ST-96';
  const q = (i, topic, extra = {}) => ({ text: `${T} ${STAMP} question ${i}`, topic, difficulty: ['Easy', 'Medium', 'Hard'][i % 3], options: ['A', 'B', 'C', 'D'], answerIdx: i % 4, ...extra });

  // TST-1 boundaries
  const two = await call('POST', '/questions', { token: admin.token, body: q(0, 'Logical', { options: ['Yes', 'No'], answerIdx: 1 }) });
  const six = await call('POST', '/questions', { token: admin.token, body: q(1, 'Verbal', { options: ['1', '2', '3', '4', '5', '6'], answerIdx: 5 }) });
  check('TST-1', 'admin creates 2-option and 6-option questions (201, DTO has answerIdx)', two.status === 201 && six.status === 201 && six.json.answerIdx === 5, `${two.status}, ${six.status}`);
  const rejects = await Promise.all([
    ['1 option', { options: ['only'], answerIdx: 0 }],
    ['7 options', { options: ['1', '2', '3', '4', '5', '6', '7'], answerIdx: 0 }],
    ['answerIdx out of range', { answerIdx: 4 }],
    ['fractional answerIdx', { answerIdx: 1.5 }],
    ['unknown topic', { topic: 'History' }],
    ['unknown difficulty', { difficulty: 'Expert' }],
    ['duplicate options', { options: ['A', 'A', 'B'], answerIdx: 0 }],
  ].map(async ([label, extra]) => [label, await call('POST', '/questions', { token: admin.token, body: q(2, 'Technical', extra) })]));
  for (const [label, r] of rejects) check('TST-1', `invalid question (${label}) is 400`, r.status === 400, `${r.status} ${code(r)}`);

  const edit = await call('PATCH', `/questions/${two.json.questionId}`, { token: admin.token, body: { version: two.json.version, text: `${T} ${STAMP} edited` } });
  check('TST-1', 'edit with the current version is 200', edit.status === 200 && edit.json.text.endsWith('edited'), String(edit.status));
  const staleQ = await call('PATCH', `/questions/${two.json.questionId}`, { token: admin.token, body: { version: two.json.version, text: 'stale' } });
  check('TST-1', 'edit with a stale version is 409 STALE_VERSION', staleQ.status === 409 && code(staleQ) === 'STALE_VERSION', `${staleQ.status} ${code(staleQ)}`);
  const badEdit = await call('PATCH', `/questions/${two.json.questionId}`, { token: admin.token, body: { version: edit.json.version, answerIdx: 3 } });
  check('TST-1', 'edit with answerIdx outside the current options is 400', badEdit.status === 400, `${badEdit.status} ${code(badEdit)}`);
  const arch = await call('PATCH', `/questions/${two.json.questionId}`, { token: admin.token, body: { version: edit.json.version, archived: true } });
  check('TST-1', 'archive (soft delete) is 200 archived=true', arch.status === 200 && arch.json.archived === true, String(arch.status));
  const archList = await call('GET', '/questions?archived=true&limit=50', { token: admin.token });
  const activeList = await call('GET', '/questions?limit=50', { token: admin.token });
  check('TST-1', 'archived question listed under archived=true, not in the active list',
    archList.json.items.some((x) => x.questionId === two.json.questionId) && !activeList.json.items.some((x) => x.questionId === two.json.questionId), `active total ${activeList.json.total}`);

  // Bank for tests: 6 questions over 3 topics, keys known
  const bank = [];
  const topics = ['Quantitative', 'Quantitative', 'Logical', 'Logical', 'Technical', 'Technical'];
  for (let i = 0; i < topics.length; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const r = await call('POST', '/questions', { token: admin.token, body: q(10 + i, topics[i]) });
    bank.push(r.json);
  }
  const ids = bank.map((x) => x.questionId);

  // TST-2 boundaries and lifecycle
  const t4 = await call('POST', '/tests', { token: admin.token, body: { title: `${T} four`, durationMin: 10, questionIds: ids.slice(0, 4) } });
  const d9 = await call('POST', '/tests', { token: admin.token, body: { title: `${T} nine`, durationMin: 9, questionIds: ids.slice(0, 5) } });
  const d121 = await call('POST', '/tests', { token: admin.token, body: { title: `${T} 121`, durationMin: 121, questionIds: ids.slice(0, 5) } });
  const dup = await call('POST', '/tests', { token: admin.token, body: { title: `${T} dup`, durationMin: 10, questionIds: [ids[0], ids[0], ids[1], ids[2], ids[3]] } });
  const withArch = await call('POST', '/tests', { token: admin.token, body: { title: `${T} arch`, durationMin: 10, questionIds: [...ids.slice(0, 4), two.json.questionId] } });
  check('TST-2', '4 questions is 400', t4.status === 400, `${t4.status} ${code(t4)}`);
  check('TST-2', '9 minutes and 121 minutes are 400', d9.status === 400 && d121.status === 400, `${d9.status}, ${d121.status}`);
  check('TST-2', 'duplicate question IDs are 400', dup.status === 400, `${dup.status} ${code(dup)}`);
  check('TST-2', 'an archived question is 400 INVALID_QUESTIONS', withArch.status === 400 && code(withArch) === 'INVALID_QUESTIONS', `${withArch.status} ${code(withArch)}`);
  const d120 = await call('POST', '/tests', { token: admin.token, body: { title: `${T} ${STAMP} 120-minute draft`, durationMin: 120, questionIds: ids.slice(0, 5) } });
  check('TST-2', '5 questions / 120 minutes creates a DRAFT (201)', d120.status === 201 && d120.json.status === 'DRAFT', `${d120.status}`);
  const draftForStudent = await call('POST', `/tests/${d120.json.testId}/attempts`, { token: a.token });
  check('TST-2', 'student cannot start a DRAFT test (404)', draftForStudent.status === 404, `${draftForStudent.status} ${code(draftForStudent)}`);
  const editDraft = await call('PATCH', `/tests/${d120.json.testId}`, { token: admin.token, body: { version: d120.json.version, questionIds: ids } });
  check('TST-2', 'draft content edit is 200', editDraft.status === 200 && editDraft.json.questionCount === 6, String(editDraft.status));
  const staleT = await call('PATCH', `/tests/${d120.json.testId}`, { token: admin.token, body: { version: d120.json.version, status: 'PUBLISHED' } });
  check('TST-2', 'publish with a stale version is 409 STALE_VERSION', staleT.status === 409 && code(staleT) === 'STALE_VERSION', `${staleT.status} ${code(staleT)}`);
  const pub = await call('PATCH', `/tests/${d120.json.testId}`, { token: admin.token, body: { version: editDraft.json.version, status: 'PUBLISHED' } });
  check('TST-2', 'publish is 200 PUBLISHED', pub.status === 200 && pub.json.status === 'PUBLISHED', String(pub.status));
  const lock = await call('PATCH', `/tests/${d120.json.testId}`, { token: admin.token, body: { version: pub.json.version, title: 'changed' } });
  check('TST-2', 'editing a published test is 409 TEST_LOCKED', lock.status === 409 && code(lock) === 'TEST_LOCKED', `${lock.status} ${code(lock)}`);
  const seen = await call('GET', '/tests?limit=50', { token: a.token });
  check('TST-2', 'published test appears in the student list', seen.json.items.some((t) => t.testId === d120.json.testId), '');
  const archT = await call('PATCH', `/tests/${d120.json.testId}`, { token: admin.token, body: { version: pub.json.version, status: 'ARCHIVED' } });
  check('TST-2', 'archive is 200 ARCHIVED', archT.status === 200 && archT.json.status === 'ARCHIVED', String(archT.status));
  const repub = await call('PATCH', `/tests/${d120.json.testId}`, { token: admin.token, body: { version: archT.json.version, status: 'PUBLISHED' } });
  check('TST-2', 'republishing an archived test is 409', repub.status === 409, `${repub.status} ${code(repub)}`);
  const gone = await call('GET', '/tests?limit=50', { token: a.token });
  check('TST-2', 'archived test is hidden from students', !gone.json.items.some((t) => t.testId === d120.json.testId), '');

  // ANL-2 / ANL-3 / DOM-3
  const all = await call('GET', '/analytics/placements', { token: admin.token });
  const p = all.json || {};
  check('ANL-2', 'GET /analytics/placements (whole batch) is 200', all.status === 200,
    `${all.ms} ms, students ${p.students}, placed ${p.placedStudents}, companies ${p.offersPerCompany && p.offersPerCompany.length}, listings ${p.applicationsPerListing && p.applicationsPerListing.length}, branches ${p.averageScoreByBranch && p.averageScoreByBranch.map((x) => `${x.branch}:${x.averageScore && x.averageScore.toFixed(1)}`).join(' ')}`);
  check('PERF-3', 'placement statistics API < 3 s', all.ms < 3000, `${all.ms} ms`);
  const offers = p.offersPerCompany.reduce((s, x) => s + x.offers, 0);
  const offersL = p.applicationsPerListing.reduce((s, x) => s + x.offers, 0);
  check('ANL-2', 'placed students ≤ offers; offers per company sum = offers per listing sum', p.placedStudents <= offers && offers === offersL, `placed ${p.placedStudents}, offers ${offers}/${offersL}`);
  const branch = (p.averageScoreByBranch.find((x) => x.branch) || {}).branch;
  const year = Number(process.env.GRAD_YEAR || 2027);
  const filt = await call('GET', `/analytics/placements?branch=${encodeURIComponent(branch)}&gradYear=${year}`, { token: admin.token });
  const f = filt.json || {};
  check('DOM-3', `filter branch=${branch} gradYear=${year} narrows every metric`, filt.status === 200 && f.students <= p.students && f.placedStudents <= p.placedStudents
    && f.averageScoreByBranch.every((x) => x.branch === branch) && f.filters.gradYear === year, `students ${f.students}, placed ${f.placedStudents}`);
  const lower = await call('GET', `/analytics/placements?branch=${encodeURIComponent(branch.toLowerCase())}&gradYear=${year}`, { token: admin.token });
  check('DOM-3', 'branch filter ignores case', lower.json && lower.json.students === f.students, `${lower.json && lower.json.students}`);
  const years = {};
  for (const y of [2025, 2026, 2027, 2028]) {
    // eslint-disable-next-line no-await-in-loop
    const r = await call('GET', `/analytics/placements?gradYear=${y}`, { token: admin.token });
    years[y] = r.json ? r.json.students : r.status;
  }
  check('DOM-3', 'per-graduation-year cohorts are each a subset of the batch', Object.values(years).every((n) => typeof n === 'number' && n <= p.students), JSON.stringify(years));
  const empty = await call('GET', '/analytics/placements?gradYear=2099', { token: admin.token });
  check('DOM-3', 'empty cohort (gradYear 2099) returns 0 students and empty lists', empty.json && empty.json.students === 0 && empty.json.offersPerCompany.length === 0, `${empty.json && empty.json.students}`);
  const badQ = await call('GET', '/analytics/placements?gradYear=1999', { token: admin.token });
  check('DOM-3', 'gradYear 1999 is 400 VALIDATION', badQ.status === 400, `${badQ.status} ${code(badQ)}`);

  const csv = await call('GET', `/analytics/placements/export?branch=${encodeURIComponent(branch)}&gradYear=${year}`, { token: admin.token, raw: true });
  const rows = csv.text.trim().split('\r\n').map((l) => l.split(','));
  const val = (section, group) => { const row = rows.find((x) => x[0] === section && (group === undefined || x[1] === group)); return row ? row[row.length - 1] : undefined; };
  check('ANL-3', 'CSV export is 200 text/csv attachment', csv.status === 200 && /text\/csv/.test(csv.headers.get('content-type')) && /attachment/.test(csv.headers.get('content-disposition') || ''),
    `${csv.status} ${csv.headers.get('content-type')}, ${rows.length} lines`);
  const csvStudents = rows.find((x) => x.includes('students'));
  const csvPlaced = rows.find((x) => x.includes('placedStudents') || x.includes('placed'));
  check('ANL-3', 'CSV student and placed counts equal the filtered dashboard', csvStudents && Number(csvStudents[csvStudents.length - 1]) === f.students
    && csvPlaced && Number(csvPlaced[csvPlaced.length - 1]) === f.placedStudents, `csv ${csvStudents && csvStudents.join('|')} / ${csvPlaced && csvPlaced.join('|')}`);
  ctx.csvSample = csv.text.split('\r\n').slice(0, 12).join('\n');
  void val;
  const recCsv = await call('GET', '/analytics/placements/export', { token: rec.token });
  check('ANL-3', 'recruiter export is 403', recCsv.status === 403, String(recCsv.status));

  // Timeout on the deployed server (TC-TST-02)
  if (RUN_TIMEOUT) await timeoutCheck(ctx, ids, bank);

  if (RUN_SAFE2) await safe2Check(ctx);
}

async function timeoutCheck(ctx, ids, bank) {
  const { admin } = ctx;
  const t = await call('POST', '/tests', { token: admin.token, body: { title: `ST-96 ${STAMP} 10-minute timeout`, durationMin: 10, questionIds: ids } });
  const pub = await call('PATCH', `/tests/${t.json.testId}`, { token: admin.token, body: { version: t.json.version, status: 'PUBLISHED' } });
  if (pub.status !== 200) { check('TC-TST-02', 'publish timeout test', false, String(pub.status)); return; }
  const s = ctx.b;
  const st = await call('POST', `/tests/${t.json.testId}/attempts`, { token: s.token });
  const key = new Map(bank.map((x) => [x.questionId, x.answerIdx]));
  // answer 4 of 6 correctly, 1 wrong, 1 unanswered
  const plan = st.json.questions.map((qq, i) => {
    if (i === 5) return null;
    const right = key.get(qq.questionId);
    return { questionId: qq.questionId, optionIdx: i === 4 ? (right + 1) % 4 : right, correct: i !== 4, topic: qq.topic };
  }).filter(Boolean);
  for (const p of plan) {
    // eslint-disable-next-line no-await-in-loop
    await call('PATCH', `/attempts/${st.json.attemptId}/answers`, { token: s.token, body: { questionId: p.questionId, optionIdx: p.optionIdx } });
  }
  const endsAt = new Date(st.json.endsAt);
  log(`…  TC-TST-02  waiting until ${endsAt.toISOString()} for the server timeout (no client calls in between)`);
  // probe the cutoff: one answer ~2 s before the deadline is accepted, one ~5 s after is refused
  const offset = new Date(st.json.serverTime) - Date.now();
  await sleep(Math.max(0, endsAt - Date.now() - offset - 3000));
  const unanswered = st.json.questions[5];
  const justBefore = await call('PATCH', `/attempts/${st.json.attemptId}/answers`, { token: s.token, body: { questionId: unanswered.questionId, optionIdx: (key.get(unanswered.questionId) + 1) % 4 } });
  check('TST-5', 'answer ~2 s before endsAt is accepted (204)', justBefore.status === 204, `${justBefore.status} ${code(justBefore)}`);
  await sleep(Math.max(0, endsAt - Date.now() - offset + 5000));
  const at5 = await call('PATCH', `/attempts/${st.json.attemptId}/answers`, { token: s.token, body: { questionId: unanswered.questionId, optionIdx: key.get(unanswered.questionId) } });
  check('TST-5', 'answer 5 s after endsAt is 409 ATTEMPT_CLOSED (hard cutoff, inside the old 30 s window)', at5.status === 409 && code(at5) === 'ATTEMPT_CLOSED', `${at5.status} ${code(at5)}`);
  await sleep(35000);
  const at40 = await call('PATCH', `/attempts/${st.json.attemptId}/answers`, { token: s.token, body: { questionId: unanswered.questionId, optionIdx: key.get(unanswered.questionId) } });
  check('TC-TST-02', 'answer 40 s after endsAt is 409 ATTEMPT_CLOSED', at40.status === 409 && code(at40) === 'ATTEMPT_CLOSED', `${at40.status} ${code(at40)}`);
  const view = await call('GET', `/attempts/${st.json.attemptId}`, { token: s.token });
  check('TC-TST-02', 'attempt was auto-submitted by the server: SUBMITTED / TIMEOUT', view.json.status === 'SUBMITTED' && view.json.submissionReason === 'TIMEOUT',
    `${view.json.status} ${view.json.submissionReason}, submittedAt ${view.json.submittedAt}, ${((new Date(view.json.submittedAt) - endsAt) / 1000).toFixed(1)} s after endsAt`);
  const res = await call('GET', `/attempts/${st.json.attemptId}/result`, { token: s.token });
  const r = res.json;
  check('TC-TST-02', 'score = 4/6 from saved answers (66.67%); per-topic Quantitative 2/2, Logical 2/2, Technical 0/2',
    res.status === 200 && r.correctAnswers === 4 && r.totalQuestions === 6
      && JSON.stringify(r.topicBreakdown.map((x) => [x.topic, x.correctAnswers, x.totalQuestions])) === JSON.stringify([['Quantitative', 2, 2], ['Logical', 2, 2], ['Technical', 0, 2]]),
    `${r && r.correctAnswers}/${r && r.totalQuestions} = ${r && r.score}, ${r && r.topicBreakdown.map((x) => `${x.topic} ${x.correctAnswers}/${x.totalQuestions} ${x.percentage.toFixed(1)}%`).join(', ')}`);
  await call('PATCH', `/tests/${t.json.testId}`, { token: admin.token, body: { version: pub.json.version, status: 'ARCHIVED' } });
}

async function safe2Check(ctx) {
  const { admin } = ctx;
  const s = await login(SAFE2_STUDENT, PW);
  const meBefore = await call('GET', '/analytics/me', { token: s.token });
  const appsBefore = await call('GET', '/applications/mine', { token: s.token });
  const statsBefore = await call('GET', '/analytics/placements', { token: admin.token });
  const dea = await call('PATCH', `/admin/users/${s.user.id || s.user._id}/deactivate`, { token: admin.token });
  check('SAFE-2', `admin deactivates ${SAFE2_STUDENT} (200)`, dea.status === 200, `${dea.status} ${code(dea)}`);
  const tokenAfter = await call('GET', '/analytics/me', { token: s.token });
  check('SAFE-2', 'the existing token is refused after deactivation', tokenAfter.status === 401 || tokenAfter.status === 403, `${tokenAfter.status} ${code(tokenAfter)}`);
  const loginAfter = await call('POST', '/auth/login', { body: { email: SAFE2_STUDENT, password: PW } });
  check('SAFE-2', 'login is refused after deactivation', loginAfter.status === 401 || loginAfter.status === 403, `${loginAfter.status} ${code(loginAfter)}`);
  const users = await call('GET', `/admin/users?search=${encodeURIComponent(SAFE2_STUDENT)}`, { token: admin.token });
  const u = users.json && (users.json.items || users.json.users || [])[0];
  check('SAFE-2', 'user record kept, status DISABLED', u && u.status === 'DISABLED', JSON.stringify(u && { status: u.status, email: u.email }));
  const resume = await call('GET', `/admin/users/${s.user.id || s.user._id}/resume`, { token: admin.token, raw: true });
  check('SAFE-2', 'admin can still read the profile resume (or 404 if none was uploaded)', [200, 404].includes(resume.status), String(resume.status));
  await sleep(1000);
  log(`…  SAFE-2  before: testsTaken ${meBefore.json.testsTaken}, applications ${appsBefore.json.items.length}; placement stats are cached 5 min, rechecking after expiry`);
  await sleep(5 * 60 * 1000 + 5000);
  const statsAfter = await call('GET', '/analytics/placements', { token: admin.token });
  const sumResults = (x) => x.json.averageScoreByBranch.reduce((acc, b) => acc + b.results, 0);
  const sumApps = (x) => x.json.applicationsPerListing.reduce((acc, b) => acc + b.applications, 0);
  check('SAFE-2', 'after deactivation the batch still counts the same results and applications',
    sumResults(statsAfter) >= sumResults(statsBefore) && sumApps(statsAfter) >= sumApps(statsBefore) && statsAfter.json.students >= statsBefore.json.students,
    `results ${sumResults(statsBefore)} -> ${sumResults(statsAfter)}, applications ${sumApps(statsBefore)} -> ${sumApps(statsAfter)}, students ${statsBefore.json.students} -> ${statsAfter.json.students}`);
}

(async () => {
  const startedAt = new Date().toISOString();
  log(`System test aptitude/analytics against ${API} at ${startedAt}`);
  const ctx = {};
  try {
    ctx.a = await login(STUDENT_A, PW);
    ctx.b = await login(STUDENT_B, PW);
    ctx.rec = await login(RECRUITER, PW);
    if (RUN_ADMIN) {
      if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) throw new Error('--admin needs ADMIN_EMAIL and ADMIN_PASSWORD');
      ctx.admin = await login(process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
    }
    await studentChecks(ctx);
    if (RUN_ADMIN) await adminChecks(ctx);
  } catch (err) {
    check('RUN', 'script error', false, err.stack || String(err));
  }
  const failed = results.filter((r) => r.pass === false);
  const out = { api: API, startedAt, finishedAt: new Date().toISOString(), options: [...args], students: [STUDENT_A, STUDENT_B], recruiter: RECRUITER,
    passed: results.filter((r) => r.pass).length, failed: failed.length, results, csvSample: ctx.csvSample };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  log(`\n${out.passed} passed, ${out.failed} failed. Evidence: ${OUT}`);
  process.exitCode = failed.length ? 1 : 0;
})();
