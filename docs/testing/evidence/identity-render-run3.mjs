// Third identity run on Render, after the TC-AUTH-03 lock (retryAt 18:30:11Z) ends:
// the locked account logs in again, and its application (sent with a resume) is downloaded
// by the owner and by the listing's recruiter (TC-AUTH-04 positive paths).
import fs from 'node:fs';
const API = 'https://oippp-api.onrender.com/api';
const first = JSON.parse(fs.readFileSync(new URL('./identity-render-results.json', import.meta.url)));
const email = first.results['TC-AUTH-06 register'].body.user.email;
async function call(method, path, { token, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';
  const r = await fetch(API + path, { method, headers, body: body && JSON.stringify(body) });
  const ct = r.headers.get('content-type') || '';
  const data = ct.includes('json') ? await r.json() : { bytes: (await r.arrayBuffer()).byteLength, contentType: ct };
  return { status: r.status, data };
}
const relogin = await call('POST', '/auth/login', { body: { email, password: 'Testpass123' } });
const owner = relogin.data.token;
const rec = (await call('POST', '/auth/login', { body: { email: 'recruiter01@example.com', password: 'Demo12345' } })).data.token;
const app = (await call('GET', '/applications/mine', { token: owner })).data.items[0];
const dl = async (t) => { const r = await call('GET', `/applications/${app._id}/resume`, { token: t }); return { status: r.status, body: r.data }; };
const out = { at: new Date().toISOString(), email, loginAfterLock: { status: relogin.status, hasToken: !!owner },
  applicationId: app?._id, owner: await dl(owner), listingRecruiter: await dl(rec) };
console.log(JSON.stringify(out));
fs.writeFileSync(new URL('./identity-render-results-3.json', import.meta.url), JSON.stringify(out, null, 2));
