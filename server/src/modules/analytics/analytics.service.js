const mongoose = require('mongoose');
const { STATUSES } = require('../applications/application.constants');
const Application = require('../applications/application.model');
const deps = require('../applications/application.deps');
const Result = require('../tests/result.model');
const Test = require('../tests/test.model');
const { TOPICS, percentage } = require('../tests/schema.helpers');

const round = (value) => Math.round(value * 100) / 100;
const toId = (id) => new mongoose.Types.ObjectId(String(id));

// D2: pool topic counts across all results; weakest first, ties go to more questions, then topic order.
function rankTopics(results) {
  const pooled = new Map();
  for (const result of results) {
    for (const t of result.topicBreakdown) {
      const topic = pooled.get(t.topic) || { topic: t.topic, totalQuestions: 0, correctAnswers: 0 };
      topic.totalQuestions += t.totalQuestions;
      topic.correctAnswers += t.correctAnswers;
      pooled.set(t.topic, topic);
    }
  }
  return [...pooled.values()]
    .map((t) => ({ ...t, percentage: round(percentage(t.correctAnswers, t.totalQuestions)) }))
    .sort((a, b) => a.percentage - b.percentage || b.totalQuestions - a.totalQuestions
      || TOPICS.indexOf(a.topic) - TOPICS.indexOf(b.topic));
}

// ANL-1. No combined readiness score: the SRS defines no formula (D2).
async function studentReadiness(studentId) {
  const id = toId(studentId);
  const [results, counts] = await Promise.all([
    Result.find({ studentId: id }).sort({ submittedAt: 1, _id: 1 }).lean(),
    Application.aggregate([{ $match: { studentId: id } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);
  const tests = await Test.find({ _id: { $in: results.map((r) => r.testId) } }).select('title').lean();
  const titles = new Map(tests.map((t) => [String(t._id), t.title]));
  const topics = rankTopics(results);
  const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  for (const c of counts) byStatus[c._id] = c.count;
  return {
    testsTaken: results.length,
    averageScore: results.length ? round(results.reduce((n, r) => n + r.score, 0) / results.length) : null,
    trend: results.map((r) => ({ attemptId: r.attemptId, testId: r.testId,
      testTitle: titles.get(String(r.testId)) ?? null, score: round(r.score), submittedAt: r.submittedAt })),
    topics,
    weakestTopics: topics.slice(0, 2),
    applications: { total: counts.reduce((n, c) => n + c.count, 0), byStatus },
  };
}

// D4: cohort is the current Profile branch/gradYear. Students without one appear as branch null, unfiltered only.
async function cohort({ branch, gradYear }) {
  const students = await deps.User().find({ role: 'STUDENT' }).select('_id').lean();
  const filter = { userId: { $in: students.map((s) => s._id) } };
  if (branch) filter.branch = branch;
  if (gradYear) filter.gradYear = gradYear;
  const profiles = await deps.Profile().find(filter).collation({ locale: 'en', strength: 2 })
    .select('userId branch').lean();
  const branchOf = new Map(students.map((s) => [String(s._id), null]));
  for (const p of profiles) branchOf.set(String(p.userId), p.branch || null);
  if (!branch && !gradYear) return branchOf;
  return new Map(profiles.map((p) => [String(p.userId), p.branch || null]));
}

// ANL-2: every metric uses the same cohort.
async function placementStats(filters) {
  const branchOf = await cohort(filters);
  const ids = [...branchOf.keys()].map(toId);
  const [perListing, placed, scores] = await Promise.all([
    Application.aggregate([{ $match: { studentId: { $in: ids } } }, { $group: { _id: '$listingId',
      applications: { $sum: 1 }, offers: { $sum: { $cond: [{ $eq: ['$status', 'OFFER'] }, 1, 0] } } } }]),
    Application.distinct('studentId', { studentId: { $in: ids }, status: 'OFFER' }),
    Result.aggregate([{ $match: { studentId: { $in: ids } } },
      { $group: { _id: '$studentId', total: { $sum: '$score' }, results: { $sum: 1 } } }]),
  ]);
  const listings = await deps.Listing().find({ _id: { $in: perListing.map((l) => l._id) } })
    .select('title company').lean();
  const listingById = new Map(listings.map((l) => [String(l._id), l]));

  const companies = new Map();
  const applicationsPerListing = perListing.map((row) => {
    const listing = listingById.get(String(row._id));
    const company = listing ? listing.company : null;
    if (row.offers) companies.set(company, (companies.get(company) || 0) + row.offers);
    return { listingId: row._id, title: listing ? listing.title : null, company,
      applications: row.applications, offers: row.offers };
  }).sort((a, b) => b.applications - a.applications || String(a.title).localeCompare(String(b.title)));

  const branches = new Map();
  for (const row of scores) {
    const name = branchOf.get(String(row._id)) ?? null;
    const b = branches.get(name) || { branch: name, total: 0, results: 0, students: 0 };
    b.total += row.total;
    b.results += row.results;
    b.students += 1;
    branches.set(name, b);
  }
  return {
    filters: { branch: filters.branch || null, gradYear: filters.gradYear || null },
    students: ids.length,
    placedStudents: placed.length,
    offersPerCompany: [...companies].map(([company, offers]) => ({ company, offers }))
      .sort((a, b) => b.offers - a.offers || String(a.company).localeCompare(String(b.company))),
    applicationsPerListing,
    averageScoreByBranch: [...branches.values()]
      .map(({ total, ...b }) => ({ ...b, averageScore: round(total / b.results) }))
      .sort((a, b) => String(a.branch).localeCompare(String(b.branch))),
  };
}

// SAD 3.4: the dashboard and CSV reuse a cohort's figures for 5 minutes.
const CACHE_MS = 5 * 60 * 1000;
const placementCache = new Map();

async function cachedPlacementStats(filters) {
  const key = JSON.stringify([filters.branch || null, filters.gradYear || null]);
  const hit = placementCache.get(key);
  if (hit && hit.expires > Date.now()) return hit.stats;

  const stats = await placementStats(filters);
  placementCache.set(key, { stats, expires: Date.now() + CACHE_MS });
  return stats;
}

function clearPlacementCache() {
  placementCache.clear();
}

// ANL-3: RFC 4180 quoting, and a leading ' so spreadsheets don't run text as a formula.
function csvCell(value) {
  if (value == null) return '';
  let text = String(value);
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function placementCsv(stats) {
  const rows = [['section', 'group', 'detail', 'value'],
    ['filter', 'branch', '', stats.filters.branch ?? 'ALL'],
    ['filter', 'gradYear', '', stats.filters.gradYear ?? 'ALL'],
    ['summary', 'students', '', stats.students],
    ['summary', 'placedStudents', '', stats.placedStudents]];
  if (!stats.students) rows.push(['note', 'No students match the selected cohort', '', '']);
  for (const c of stats.offersPerCompany) rows.push(['offersPerCompany', c.company ?? 'Unknown listing', '', c.offers]);
  for (const l of stats.applicationsPerListing) {
    rows.push(['applicationsPerListing', l.title ?? 'Unknown listing', l.company ?? '', l.applications]);
  }
  for (const b of stats.averageScoreByBranch) {
    rows.push(['averageScoreByBranch', b.branch ?? 'No branch', `${b.results} results`, b.averageScore]);
  }
  return `${rows.map((r) => r.map(csvCell).join(',')).join('\r\n')}\r\n`;
}

module.exports = {
  studentReadiness, placementStats, cachedPlacementStats, clearPlacementCache, placementCsv, csvCell, rankTopics, CACHE_MS,
};
