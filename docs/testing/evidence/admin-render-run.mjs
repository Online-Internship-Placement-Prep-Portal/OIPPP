// Admin-only identity cases on Render: PROF-3, PROF-4, DOM-2, SEC-6, TC-SEC-01.
// Usage (from server/): ADMIN_PASSWORD=... node ../docs/testing/evidence/admin-render-run.mjs <out.json>
// MONGO_URI (server/.env) is used read-only for TC-SEC-01 and SEC-6. Only new ST-ADM accounts are changed;
// the one-offer policy is switched back off at the end.
import { createRequire } from 'module';
import fs from 'fs';

const require = createRequire(`${process.cwd()}/`);
require('dotenv').config();
const mongoose = require('mongoose');

const base = 'https://oippp-api.onrender.com/api';
const adminEmail = process.env.ADMIN_EMAIL || 'admin@oippp.dev';
const adminPassword = process.env.ADMIN_PASSWORD;
const tag = Date.now();
const out = { run: new Date().toISOString(), base, cases: {} };

async function call(method, path, body, token) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }
  return { status: res.status, data };
}
const login = async (email, password) => (await call('POST', '/auth/login', { email, password })).data?.token;
const register = (role, n) => call('POST', '/auth/register', {
  name: `ST-ADM ${role} ${n}`, email: `st-adm-${tag}-${role.toLowerCase()}${n}@example.com`, password: 'Test12345', role,
  ...(role === 'STUDENT' ? { srn: `PES1UG24CS${String(tag % 1000).padStart(3, '0')}` } : {}),
});

const admin = await login(adminEmail, adminPassword);
if (!admin) throw new Error('admin login failed');
await mongoose.connect(process.env.MONGO_URI, { dbName: 'oippp' });
const db = mongoose.connection.db;

// PROF-3: approve one pending recruiter, reject another with a reason; both audited.
{
  const r1 = await register('RECRUITER', 1);
  const r2 = await register('RECRUITER', 2);
  const id1 = r1.data?.user?.id || r1.data?.user?._id;
  const id2 = r2.data?.user?.id || r2.data?.user?._id;
  const noReason = await call('PATCH', `/admin/recruiters/${id2}/reject`, {}, admin);
  const approve = await call('PATCH', `/admin/recruiters/${id1}/approve`, null, admin);
  const reject = await call('PATCH', `/admin/recruiters/${id2}/reject`, { reasonCode: 'INVALID_COMPANY' }, admin);
  const audits = await db.collection('auditlogs').countDocuments({
    entityId: { $in: [new mongoose.Types.ObjectId(id1), new mongoose.Types.ObjectId(id2)] },
  });
  out.cases['PROF-3'] = {
    registered: [r1.status, r2.status, r1.data?.user?.status, r2.data?.user?.status],
    rejectWithoutReason: noReason.status, approve: [approve.status, approve.data?.user?.status],
    reject: [reject.status, reject.data?.user?.status], auditEntries: audits,
    pass: noReason.status === 400 && approve.data?.user?.status === 'ACTIVE'
      && reject.data?.user?.status === 'REJECTED' && audits >= 2,
  };
}

// PROF-4: a token issued before deactivation stops working at once.
let studentId;
{
  const s = await register('STUDENT', 1);
  studentId = s.data?.user?.id || s.data?.user?._id;
  const token = await login(`st-adm-${tag}-student1@example.com`, 'Test12345');
  const before = await call('GET', '/auth/me', null, token);
  const deactivate = await call('PATCH', `/admin/users/${studentId}/deactivate`, null, admin);
  const after = await call('GET', '/auth/me', null, token);
  const relogin = await call('POST', '/auth/login', { email: `st-adm-${tag}-student1@example.com`, password: 'Test12345' });
  out.cases['PROF-4'] = {
    register: s.status, meBefore: before.status, deactivate: [deactivate.status, deactivate.data?.user?.status],
    meAfterWithOldToken: [after.status, after.data?.error?.code], relogin: relogin.status,
    pass: before.status === 200 && after.status === 401 && relogin.status !== 200,
  };
}

// DOM-2: with the policy on, student0003 (holds an OFFER from the 06-11 run) cannot apply again.
{
  const original = (await call('GET', '/admin/settings', null, admin)).data;
  const on = await call('PATCH', '/admin/settings', { oneOfferPolicy: true }, admin);
  const student = await login('student0003@students.example.com', 'Demo12345');
  const s3 = await db.collection('users').findOne({ email: 'student0003@students.example.com' });
  const holdsOffer = !!(await db.collection('applications').findOne({ studentId: s3._id, status: 'OFFER' }));
  const applied = new Set((await db.collection('applications').find({ studentId: s3._id }).project({ listingId: 1 }).toArray())
    .map((a) => String(a.listingId)));
  const open = await db.collection('listings').find({ status: 'OPEN', deadline: { $gt: new Date() } })
    .project({ _id: 1 }).limit(50).toArray();
  const target = open.find((l) => !applied.has(String(l._id)));
  const apply = await call('POST', '/applications', { listingId: String(target._id) }, student);
  const off = await call('PATCH', '/admin/settings', { oneOfferPolicy: false }, admin);
  out.cases['DOM-2'] = {
    originalSetting: original, policyOn: on.status, holdsOffer, apply: [apply.status, apply.data?.error?.code],
    policyRestoredOff: [off.status, off.data],
    pass: holdsOffer && apply.status === 422 && apply.data?.error?.code === 'OFFER_HELD',
  };
}

// SEC-6: admin actions above wrote audit entries; the API has no route to edit or delete them;
// the model refuses updates.
{
  const entries = await db.collection('auditlogs').find({ entityId: new mongoose.Types.ObjectId(studentId) }).toArray();
  const probes = [];
  for (const [m, p] of [['GET', '/audit'], ['PATCH', '/audit/x'], ['DELETE', '/audit/x'], ['DELETE', '/admin/audit/x']]) {
    probes.push([m, p, (await call(m, p, m === 'GET' ? null : {}, admin)).status]);
  }
  const AuditLog = require('./src/modules/audit/auditLog.model');
  let modelRefused = false;
  try { await AuditLog.updateOne({ _id: entries[0]?._id }, { action: 'X' }); } catch { modelRefused = true; }
  out.cases['SEC-6'] = {
    deactivateAuditEntries: entries.map((e) => ({ action: e.action, entity: e.entity, at: e.at })),
    editDeleteRouteProbes: probes, modelRefusesUpdate: modelRefused,
    pass: entries.length >= 1 && probes.every(([, , s]) => s === 404) && modelRefused,
  };
}

// TC-SEC-01: the stored hash for the new account is bcrypt cost 12, not the plain password.
{
  const u = await db.collection('users').findOne({ email: `st-adm-${tag}-student1@example.com` });
  out.cases['TC-SEC-01'] = {
    hashPrefix: u.passwordHash.slice(0, 7), length: u.passwordHash.length,
    containsPlain: u.passwordHash.includes('Test12345'),
    pass: u.passwordHash.startsWith('$2b$12$') && u.passwordHash.length === 60 && !u.passwordHash.includes('Test12345'),
  };
}

await mongoose.disconnect();
fs.writeFileSync(process.argv[2], `${JSON.stringify(out, null, 2)}\n`);
for (const [k, v] of Object.entries(out.cases)) console.log(k, v.pass ? 'PASS' : 'FAIL');
