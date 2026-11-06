// #89 PERF rerun against Render from one client machine.
// Render forwards the real client IP, so all virtual users share one address and the
// per-IP limits apply (auth 10/min, API 300/min). Logins are spaced 7 s apart and each
// user waits THINK_MS between calls so the total stays under 300 requests/min.
const base = process.argv[2] || 'https://oippp-api.onrender.com/api';
const users = Number(process.argv[3] || 50);
const seconds = Number(process.argv[4] || 300);
const THINK_MS = Number(process.argv[5] || 11000);
const password = 'Demo12345';
const adminPassword = process.env.ADMIN_PASSWORD;
const SEARCHES = ['/listings?search=intern', '/listings?search=react&mode=REMOTE&minStipend=10000&sortBy=deadline',
  '/listings?location=Bengaluru&sortBy=stipend&order=desc', '/listings?skill=Python&page=2',
  '/listings?search=data&deadlineBefore=2099-01-01&sortBy=postedAt', '/listings?mode=HYBRID&maxStipend=20000&page=3'];
const OTHER = ['/listings/recommendations', '/applications/mine', '/bookmarks/mine', '/notifications',
  '/analytics/me', '/tests', '/profile/me'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function login(email, pw = password) {
  for (;;) {
    const res = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password: pw }) });
    if (res.status === 429) { await sleep(15000); continue; }
    if (!res.ok) throw new Error(`login ${email}: ${res.status}`);
    return (await res.json()).token;
  }
}
async function timed(path, token) {
  const headers = token ? { authorization: `Bearer ${token}` } : {};
  const t = performance.now();
  const res = await fetch(base + path, { headers });
  await res.arrayBuffer();
  return { path, ms: performance.now() - t, status: res.status };
}
function summary(name, s, target) {
  const sorted = s.map((x) => x.ms).sort((a, b) => a - b);
  const at = (p) => sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)] || 0;
  const err = s.filter((x) => x.status >= 400).length;
  const rl = s.filter((x) => x.status === 429).length;
  return { name, requests: s.length, p50: Math.round(at(50)), p95: Math.round(at(95)), max: Math.round(sorted.at(-1) || 0),
    errorRate: `${((100 * err) / (s.length || 1)).toFixed(2)}%`, rateLimited: rl, target: `< ${target} ms`,
    pass: at(95) < target && err / (s.length || 1) < 0.01 };
}
const tokens = [];
for (let u = 0; u < users; u += 1) {
  tokens.push(await login(`student${String(u + 1).padStart(4, '0')}@students.example.com`));
  await sleep(7000);
}
const adminToken = adminPassword ? await login('admin@oippp.dev', adminPassword) : null;
console.error(`logged in ${users} students + admin`);
const search = []; const other = [];
const end = Date.now() + seconds * 1000;
await Promise.all(tokens.map(async (tok, u) => {
  await sleep(Math.random() * THINK_MS);
  for (let n = 0; Date.now() < end; n += 1) {
    if (n % 2 === 0) search.push(await timed(SEARCHES[(u + n) % SEARCHES.length]));
    else other.push(await timed(OTHER[(u + n) % OTHER.length], tok));
    await sleep(THINK_MS);
  }
}));
const dashboard = [];
if (adminToken) for (let i = 0; i < 10; i += 1) { dashboard.push(await timed('/analytics/placements', adminToken)); await sleep(500); }
const rows = [summary('PERF-1 listing search', search, 2000), summary('PERF-2 other API calls', other, 1000),
  summary('PERF-3 placement dashboard', dashboard, 3000)];
console.log(JSON.stringify({ base, users, seconds, thinkMs: THINK_MS, ranAt: new Date().toISOString(), rows,
  dashboardMs: dashboard.map((d) => Math.round(d.ms)), statuses: [...search, ...other].reduce((m, x) => ((m[x.status] = (m[x.status] || 0) + 1), m), {}) }, null, 2));
