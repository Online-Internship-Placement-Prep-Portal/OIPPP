// Second identity run on Render: TC-AUTH-04 (resume access) and DOM-2 (one-offer policy).
// Uses the listing and application created by ui-render-run.mjs (student0003 applied, recruiter01 shortlisted).
import fs from 'node:fs';
const API = 'https://oippp-api.onrender.com/api', PW = 'Demo12345';
const LISTING = JSON.parse(fs.readFileSync(new URL('./ui-render-results.json', import.meta.url))).listingId;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function call(method, path, { token, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';
  const r = await fetch(API + path, { method, headers, body: body && JSON.stringify(body) });
  const ct = r.headers.get('content-type') || '';
  const data = ct.includes('json') ? await r.json() : { bytes: (await r.arrayBuffer()).byteLength, contentType: ct };
  return { status: r.status, data };
}
const login = async (email) => (await call('POST', '/auth/login', { body: { email, password: PW } })).data.token;
const out = { api: API, listing: LISTING, startedAt: new Date().toISOString(), results: {} };
const log = (k, v) => { out.results[k] = v; console.log(k, JSON.stringify(v).slice(0, 500)); };

const s3 = await login('student0003@students.example.com');
const s1 = await login('student0001@students.example.com');
const r1 = await login('recruiter01@example.com');
const r2 = await login('recruiter02@example.com');
const mine = await call('GET', '/applications/mine', { token: s3 });
const app = mine.data.items.find((a) => String(a.listing?._id || a.listingId) === LISTING);
const id = app?._id;
const dl = async (t) => { const r = await call('GET', `/applications/${id}/resume`, { token: t }); return { status: r.status, body: r.data }; };
log('TC-AUTH-04 resume access', { applicationId: id, owner: await dl(s3), listingRecruiter: await dl(r1),
  otherRecruiter: await dl(r2), unrelatedStudent: await dl(s1), noToken: await dl(undefined) });

// DOM-2: move the application to OFFER (spaced for the Mailtrap sandbox), then try to apply elsewhere.
const steps = [];
for (const status of ['INTERVIEW', 'OFFER']) {
  const r = await call('PATCH', `/applications/${id}/status`, { token: r1, body: { status } });
  steps.push({ status, http: r.status, body: r.data });
  await sleep(20000);
}
const listings = await call('GET', '/listings?limit=20');
const other = (listings.data.listings || listings.data.items).find((l) => l._id !== LISTING && l.minCgpa == null);
const again = await call('POST', '/applications', { token: s3, body: { listingId: other._id } });
log('DOM-2 one-offer', { student: 'student0003', moves: steps, otherListing: other._id, apply: { status: again.status, body: again.data } });
out.finishedAt = new Date().toISOString();
fs.writeFileSync(new URL('./identity-render-results-2.json', import.meta.url), JSON.stringify(out, null, 2));
