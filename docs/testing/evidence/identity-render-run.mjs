// Runs the identity TCs still "Not run" against the Render build. Usage: node identity-render-run.mjs
import fs from 'node:fs';
const API = process.env.API || 'https://oippp-api.onrender.com/api';
const PW = 'Demo12345';
const out = { api: API, startedAt: new Date().toISOString(), results: {} };
const log = (k, v) => { out.results[k] = v; console.log(k, JSON.stringify(v).slice(0, 400)); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function call(method, path, { token, body, form } = {}) {
  const headers = {}; if (token) headers.Authorization = `Bearer ${token}`;
  let b; if (form) b = form; else if (body) { headers['Content-Type'] = 'application/json'; b = JSON.stringify(body); }
  const r = await fetch(API + path, { method, headers, body: b });
  const ct = r.headers.get('content-type') || ''; let data = null;
  if (ct.includes('json')) data = await r.json(); else { const buf = await r.arrayBuffer(); data = { bytes: buf.byteLength, contentType: ct }; }
  return { status: r.status, data };
}
const tok = r => r.data?.token || r.data?.data?.token || r.data?.accessToken;
const stamp = Date.now().toString().slice(-3).padStart(3, '0');
const email = `tc-auth06-${Date.now()}@students.example.com`;
const srn = `PES2UG24CS${stamp}`;

await call('GET', '/listings?limit=1'); // warm up
// Group A (limiter: 10 / min / IP)
const reg = await call('POST', '/auth/register', { body: { name: 'TC Auth Six', email, password: 'Testpass123', srn } });
log('TC-AUTH-06 register', { status: reg.status, body: reg.data });
const dup = await call('POST', '/auth/register', { body: { name: 'Dup', email: 'student0001@students.example.com', password: 'Testpass123', srn: 'PES2UG24CS999' } });
log('TC-AUTH-01 duplicate', { status: dup.status, body: dup.data });
const pw = [];
for (const p of ['abc', 'abcdefgh', '12345678']) {
  const r = await call('POST', '/auth/register', { body: { name: 'Pw Test', email: `pw-${p}-${Date.now()}@students.example.com`, password: p, srn: 'PES2UG24CS998' } });
  pw.push({ password: p, status: r.status, body: r.data });
}
log('TC-AUTH-02 password', pw);
const newTok = tok(reg) || tok(await call('POST', '/auth/login', { body: { email, password: 'Testpass123' } }));
const s1 = tok(await call('POST', '/auth/login', { body: { email: 'student0001@students.example.com', password: PW } }));
const rec = tok(await call('POST', '/auth/login', { body: { email: 'recruiter01@example.com', password: PW } }));
log('logins', { newStudent: !!newTok, student0001: !!s1, recruiter01: !!rec });

// PROF-1 resume validation (not limited)
const pdf = n => Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(n, 32), Buffer.from('\n%%EOF\n')]);
const up = async (buf, name, type) => { const f = new FormData(); f.append('resume', new Blob([buf], { type }), name); return call('POST', '/profile/me/resume', { token: newTok, form: f }); };
const big = await up(pdf(Math.round(2.1 * 1024 * 1024)), 'big.pdf', 'application/pdf');
const docx = await up(Buffer.from('PK\x03\x04 fake docx'), 'cv.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
const ok = await up(pdf(20000), 'cv.pdf', 'application/pdf');
log('TC-PROF-01 resume', { valid: { status: ok.status, body: ok.data }, big: { status: big.status, body: big.data }, docx: { status: docx.status, body: docx.data } });

// AUTH-04 resume download authorization
await call('PUT', '/profile/me', { token: newTok, body: { branch: 'CSE', cgpa: 9.5, graduationYear: 2027, skills: ['JavaScript'] } });
const mine = await call('GET', '/listings/mine?limit=50', { token: rec });
const items = mine.data?.items || mine.data?.data || mine.data?.listings || [];
const open = items.find(l => l.status === 'OPEN' && (!l.deadline || new Date(l.deadline) > new Date()));
let appId = null, applyRes = null;
if (open) { applyRes = await call('POST', '/applications', { token: newTok, body: { listingId: open._id || open.id, coverNote: 'TC-AUTH-04 run' } }); appId = applyRes.data?._id || applyRes.data?.id || applyRes.data?.application?._id; }
const dl = async t => { const r = await call('GET', `/applications/${appId}/resume`, { token: t }); return { status: r.status, body: r.data }; };
log('TC-AUTH-04 resume access', { listing: open && (open._id || open.id), apply: applyRes && { status: applyRes.status }, appId,
  owner: appId && await dl(newTok), recruiter: appId && await dl(rec), unrelatedStudent: appId && await dl(s1), noToken: appId && await dl(undefined) });

// DOM-2 one-offer: find a student holding OFFER among recruiter01 listings
let offerEmail = null;
for (const l of items.slice(0, 30)) {
  const r = await call('GET', `/listings/${l._id || l.id}/applications?status=OFFER&limit=5`, { token: rec });
  const a = (r.data?.items || r.data?.data || [])[0];
  if (a) { offerEmail = a.student?.email || a.studentId?.email || a.email; if (offerEmail) break; }
}
out.offerEmail = offerEmail;

console.log('waiting 65 s for the rate-limit window');
await sleep(65000);
// DOM-2 continued
if (offerEmail && open) {
  const t = tok(await call('POST', '/auth/login', { body: { email: offerEmail, password: PW } }));
  const other = items.find(l => l.status === 'OPEN' && (l._id || l.id) !== (open._id || open.id)) || open;
  const r = await call('POST', '/applications', { token: t, body: { listingId: other._id || other.id } });
  log('DOM-2 one-offer', { student: offerEmail, status: r.status, body: r.data });
} else log('DOM-2 one-offer', { blocked: 'no OFFER holder found in recruiter01 listings' });
// TC-AUTH-03 lockout on the new account (5 wrong + 1)
const lock = [];
for (let i = 0; i < 6; i++) { const r = await call('POST', '/auth/login', { body: { email, password: 'Wrongpass1' } }); lock.push({ attempt: i + 1, status: r.status, code: r.data?.error?.code || r.data?.code, body: i === 5 ? r.data : undefined }); }
const lockedRight = await call('POST', '/auth/login', { body: { email, password: 'Testpass123' } });
log('TC-AUTH-03 lockout', { attempts: lock, correctPasswordAfterLock: { status: lockedRight.status, body: lockedRight.data } });

console.log('waiting 65 s for the rate-limit window');
await sleep(65000);
const rl = [];
for (let i = 0; i < 11; i++) { const r = await call('POST', '/auth/login', { body: { email: `nobody-${i}@example.com`, password: 'Wrongpass1' } }); rl.push({ n: i + 1, status: r.status, code: r.data?.error?.code || r.data?.code }); }
log('TC-SEC-02 rate limit', rl);
out.finishedAt = new Date().toISOString();
fs.writeFileSync(new URL('./identity-render-results.json', import.meta.url), JSON.stringify(out, null, 2));
