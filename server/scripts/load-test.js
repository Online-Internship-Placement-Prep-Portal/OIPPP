// PERF-1/2/3 load run against a seeded API (see npm run seed:demo).
// Usage: npm run test:load -- [--url=http://localhost:5000/api] [--users=50] [--seconds=60]
// Each virtual user sends its own X-Forwarded-For, so run the API with TRUST_PROXY=1 to treat
// them as separate clients, as on Render. Think time keeps each user under the 300/min API limit.
const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const base = arg('url', process.env.BASE_URL || 'http://localhost:5000/api');
const users = Number(arg('users', 50));
const seconds = Number(arg('seconds', 60));
const password = process.env.DEMO_PASSWORD || 'Demo12345';
const THINK_MS = 250;

const SEARCHES = ['/listings?search=intern', '/listings?search=react&mode=REMOTE&minStipend=10000&sortBy=deadline',
  '/listings?location=Bengaluru&sortBy=stipend&order=desc', '/listings?skill=Python&page=2',
  '/listings?search=data&deadlineBefore=2099-01-01&sortBy=postedAt', '/listings?mode=HYBRID&maxStipend=20000&page=3'];
const OTHER = ['/listings/recommendations', '/applications/mine', '/bookmarks/mine', '/notifications',
  '/analytics/me', '/tests', '/profile/me'];

const clientIp = (u) => `10.0.${Math.floor(u / 250)}.${(u % 250) + 1}`;
const pause = () => new Promise((r) => setTimeout(r, THINK_MS));

async function login(email, ip) {
  const res = await fetch(`${base}/auth/login`, { method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify({ email, password }) });
  if (!res.ok) throw new Error(`Login failed for ${email}: ${res.status}`);
  return (await res.json()).token;
}

async function timed(path, ip, token) {
  const headers = { 'x-forwarded-for': ip };
  if (token) headers.authorization = `Bearer ${token}`;
  const start = performance.now();
  const res = await fetch(base + path, { headers });
  await res.arrayBuffer();
  return { ms: performance.now() - start, ok: res.ok };
}

function summary(name, samples, targetMs) {
  const sorted = samples.map((s) => s.ms).sort((a, b) => a - b);
  const at = (p) => sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)] || 0;
  const errors = samples.filter((s) => !s.ok).length;
  const p95 = at(95);
  return { name, requests: samples.length, p50: Math.round(at(50)), p95: Math.round(p95), max: Math.round(sorted.at(-1) || 0),
    errorRate: `${((100 * errors) / (samples.length || 1)).toFixed(2)}%`, target: `< ${targetMs} ms`,
    pass: p95 < targetMs && errors / (samples.length || 1) < 0.01 };
}

async function main() {
  const tokens = await Promise.all(Array.from({ length: users }, (_, u) => (
    login(`student${String(u + 1).padStart(4, '0')}@students.example.com`, clientIp(u)))));
  const adminIp = clientIp(users);
  const adminToken = await login(process.env.ADMIN_EMAIL || 'admin@example.com', adminIp);

  const search = [];
  const other = [];
  const end = Date.now() + seconds * 1000;
  await Promise.all(Array.from({ length: users }, async (_, u) => {
    for (let n = 0; Date.now() < end; n += 1) {
      if (n % 2 === 0) search.push(await timed(SEARCHES[(u + n) % SEARCHES.length], clientIp(u)));
      else other.push(await timed(OTHER[(u + n) % OTHER.length], clientIp(u), tokens[u]));
      await pause();
    }
  }));

  // PERF-3: the admin dashboard for the whole batch, measured on its own.
  const dashboard = [];
  for (let i = 0; i < 10; i += 1) dashboard.push(await timed('/analytics/placements', adminIp, adminToken));

  const rows = [summary('PERF-1 listing search', search, 2000), summary('PERF-2 other API calls', other, 1000),
    summary('PERF-3 placement dashboard', dashboard, 3000)];
  console.log(`${users} concurrent users for ${seconds} s against ${base}`);
  console.table(rows);
  if (rows.some((r) => !r.pass)) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
