// Loads the Test Plan section 6 data set. Synthetic data only.
// Usage: npm run seed:demo -- [--reset] [--students=200] [--listings=5000]
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const { mongoUri } = require('../src/config/env');
const User = require('../src/modules/users/user.model');
const Profile = require('../src/modules/users/profile.model');
const Listing = require('../src/modules/listings/listing.model');
const Bookmark = require('../src/modules/listings/bookmark.model');
const Application = require('../src/modules/applications/application.model');
const Question = require('../src/modules/tests/question.model');
const Test = require('../src/modules/tests/test.model');
const Attempt = require('../src/modules/tests/attempt.model');
const Result = require('../src/modules/tests/result.model');
const { TOPICS, DIFFICULTIES, percentage } = require('../src/modules/tests/schema.helpers');

const DAY = 864e5;
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Demo12345';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const BRANCHES = [['CSE', 'CS'], ['ECE', 'EC'], ['EEE', 'EE'], ['ME', 'ME']];
const SKILLS = ['React', 'Node.js', 'MongoDB', 'Python', 'SQL', 'Java', 'C++', 'AWS', 'Docker', 'Figma',
  'Machine Learning', 'Data Analysis', 'Embedded C', 'MATLAB', 'AutoCAD', 'Excel'];
const TITLES = ['Backend Intern', 'Frontend Intern', 'Full Stack Intern', 'Data Analyst Intern', 'ML Intern',
  'DevOps Intern', 'Embedded Systems Intern', 'Product Design Intern', 'QA Intern', 'Mechanical Design Intern'];
const COMPANIES = ['Acme Labs', 'Globex', 'Initech', 'Umbrella Tech', 'Hooli', 'Stark Systems', 'Wayne Analytics',
  'Wonka Data', 'Cyberdyne', 'Tyrell Robotics'];
const LOCATIONS = ['Bengaluru', 'Chennai', 'Hyderabad', 'Pune', 'Mumbai', 'Remote'];
const MODES = ['ONSITE', 'REMOTE', 'HYBRID'];
const COLLECTIONS = [User, Profile, Listing, Bookmark, Application, Question, Test, Attempt, Result];

function arg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? Number(hit.split('=')[1]) : fallback;
}

// Seeded mulberry32, so every run produces the same data set.
let state = 42;
function rand() {
  state = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(state ^ (state >>> 15), 1 | state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = (list) => list[Math.floor(rand() * list.length)];
const pickSome = (list, n) => [...new Set(Array.from({ length: n }, () => pick(list)))];

// Unique PES SRNs: PES<campus>UG<yy><branch><seq>.
function srnFor(i) {
  const [, code] = BRANCHES[i % 4];
  const campus = ((i >> 2) % 2) + 1;
  const year = 23 + (Math.floor(i / 8) % 2);
  const seq = String(Math.floor(i / 16) + 1).padStart(3, '0');
  return { srn: `PES${campus}UG${year}${code}${seq}`, gradYear: 2000 + year + 4 };
}

async function insert(Model, docs) {
  for (let i = 0; i < docs.length; i += 1000) await Model.insertMany(docs.slice(i, i + 1000));
}

async function main() {
  const studentCount = arg('students', 200);
  const listingCount = arg('listings', 5000);
  if (studentCount > 15000) throw new Error('At most 15000 students can get unique SRNs');

  await mongoose.connect(mongoUri);
  try {
    if (process.argv.includes('--reset')) {
      await Promise.all(COLLECTIONS.map((Model) => Model.deleteMany({})));
      console.log('Cleared demo collections.');
    } else if (await User.exists({ email: 'recruiter01@example.com' })) {
      console.log('Demo data already present; run with --reset to rebuild it.');
      return;
    }
    await Promise.all(COLLECTIONS.map((Model) => Model.init()));

    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
    const now = Date.now();
    const id = () => new mongoose.Types.ObjectId();

    let admin = await User.findOne({ email: ADMIN_EMAIL });
    if (!admin) {
      admin = await User.create({ name: 'Placement Admin', email: ADMIN_EMAIL, passwordHash, role: 'ADMIN' });
    }

    const recruiters = Array.from({ length: 10 }, (_, i) => ({
      _id: id(), name: `Recruiter ${i + 1}`, email: `recruiter${String(i + 1).padStart(2, '0')}@example.com`,
      passwordHash, role: 'RECRUITER', status: 'ACTIVE',
    }));
    await insert(User, recruiters);

    const students = [];
    const profiles = [];
    for (let i = 0; i < studentCount; i += 1) {
      const { srn, gradYear } = srnFor(i);
      const _id = id();
      students.push({ _id, name: `Student ${i + 1}`, email: `student${String(i + 1).padStart(4, '0')}@students.example.com`,
        srn, passwordHash, role: 'STUDENT', status: 'ACTIVE' });
      profiles.push({ userId: _id, branch: BRANCHES[i % 4][0], gradYear,
        cgpa: Math.round((6 + rand() * 4) * 100) / 100, skills: pickSome(SKILLS, 3 + Math.floor(rand() * 4)) });
    }
    await insert(User, students);
    await insert(Profile, profiles);

    const listings = Array.from({ length: listingCount }, (_, i) => {
      const closed = i % 10 === 0;
      const recruiter = recruiters[i % recruiters.length];
      return {
        _id: id(), recruiterId: recruiter._id, company: COMPANIES[i % COMPANIES.length],
        title: `${pick(TITLES)} ${i + 1}`, location: pick(LOCATIONS), mode: pick(MODES),
        stipend: 5000 + Math.floor(rand() * 16) * 2500, skills: pickSome(SKILLS, 2 + Math.floor(rand() * 3)),
        minCgpa: rand() < 0.5 ? null : 6 + Math.floor(rand() * 5) * 0.5,
        deadline: new Date(closed ? now - (1 + (i % 20)) * DAY : now + (1 + (i % 60)) * DAY),
        status: closed ? 'CLOSED' : 'OPEN',
      };
    });
    await insert(Listing, listings);

    const questions = Array.from({ length: 100 }, (_, i) => ({
      _id: id(), text: `${TOPICS[i % 4]} practice question ${Math.floor(i / 4) + 1}`, topic: TOPICS[i % 4],
      difficulty: DIFFICULTIES[i % 3], options: ['Option A', 'Option B', 'Option C', 'Option D'],
      answerIdx: i % 4, createdBy: admin._id,
    }));
    await insert(Question, questions);

    const tests = Array.from({ length: 5 }, (_, t) => ({
      _id: id(), title: `Placement Practice Test ${t + 1}`, durationMin: 30,
      questionIds: questions.slice(t * 20, t * 20 + 20).map((q) => q._id), createdBy: admin._id, status: 'PUBLISHED',
    }));
    await insert(Test, tests);

    // Half of the students sit 1–3 tests, so analytics has trends and branch averages.
    const attempts = [];
    const results = [];
    students.forEach((student, s) => {
      if (s % 2) return;
      tests.slice(0, 1 + (s % 3)).forEach((test, t) => {
        const startedAt = new Date(now - (30 - t * 7) * DAY);
        const snapshot = questions.filter((q) => test.questionIds.includes(q._id));
        const answers = {};
        const byTopic = new Map();
        for (const q of snapshot) {
          const chosen = rand() < 0.65 ? q.answerIdx : (q.answerIdx + 1) % 4;
          answers[String(q._id)] = chosen;
          const row = byTopic.get(q.topic) || { topic: q.topic, totalQuestions: 0, correctAnswers: 0 };
          row.totalQuestions += 1;
          row.correctAnswers += chosen === q.answerIdx ? 1 : 0;
          byTopic.set(q.topic, row);
        }
        const correct = [...byTopic.values()].reduce((n, r) => n + r.correctAnswers, 0);
        const submittedAt = new Date(startedAt.getTime() + 20 * 60000);
        const attemptId = id();
        attempts.push({ _id: attemptId, studentId: student._id, testId: test._id, durationMin: test.durationMin,
          startedAt, endsAt: new Date(startedAt.getTime() + test.durationMin * 60000),
          questions: snapshot.map(({ _id, text, topic, difficulty, options, answerIdx }) => (
            { questionId: _id, text, topic, difficulty, options, answerIdx })),
          answers, lastSavedAt: submittedAt, status: 'SUBMITTED', submittedAt, submissionReason: 'MANUAL' });
        results.push({ attemptId, studentId: student._id, testId: test._id, totalQuestions: snapshot.length,
          correctAnswers: correct, score: percentage(correct, snapshot.length), submittedAt,
          topicBreakdown: [...byTopic.values()].map((r) => ({ ...r, percentage: percentage(r.correctAnswers, r.totalQuestions) })) });
      });
    });
    await insert(Attempt, attempts);
    await insert(Result, results);

    // Every student applies to 3 open listings; outcomes follow the REV-2 transitions.
    const open = listings.filter((l) => l.status === 'OPEN');
    const paths = [['APPLIED'], ['APPLIED', 'SHORTLISTED'], ['APPLIED', 'REJECTED'],
      ['APPLIED', 'SHORTLISTED', 'INTERVIEW'], ['APPLIED', 'SHORTLISTED', 'INTERVIEW', 'OFFER'],
      ['APPLIED', 'SHORTLISTED', 'REJECTED']];
    const applications = [];
    const bookmarks = [];
    students.forEach((student, s) => {
      const chosen = new Set();
      while (chosen.size < 3) chosen.add(open[Math.floor(rand() * open.length)]);
      [...chosen].forEach((listing, k) => {
        const path = paths[(s + k) % paths.length];
        const at = (step) => new Date(now - (20 - step * 3) * DAY);
        const status = path[path.length - 1];
        applications.push({
          studentId: student._id, listingId: listing._id, coverNote: 'Interested in this role.', status,
          rejectReason: status === 'REJECTED' ? 'SKILLS_MISMATCH' : undefined,
          history: path.map((to, step) => ({ from: step ? path[step - 1] : null, to,
            by: step ? listing.recruiterId : student._id, at: at(step),
            reasonCode: to === 'REJECTED' ? 'SKILLS_MISMATCH' : undefined })),
        });
        if (k < 2) bookmarks.push({ studentId: student._id, listingId: listing._id });
      });
    });
    await insert(Application, applications);
    await insert(Bookmark, bookmarks);

    console.log([
      `Seeded 1 admin (${ADMIN_EMAIL}), ${recruiters.length} recruiters, ${students.length} students,`,
      `${listings.length} listings, ${questions.length} questions, ${tests.length} tests,`,
      `${results.length} results, ${applications.length} applications, ${bookmarks.length} bookmarks.`,
      `Demo accounts use the password from DEMO_PASSWORD (default ${DEMO_PASSWORD}).`,
    ].join('\n'));
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
