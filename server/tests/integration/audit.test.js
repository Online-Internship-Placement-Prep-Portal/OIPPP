const mongoose = require('mongoose');
const db = require('../helpers/db');
const AuditLog = require('../../src/modules/audit/auditLog.model');
const audit = require('../../src/modules/audit/audit.service');

const id = () => new mongoose.Types.ObjectId();

beforeAll(db.connect);
afterEach(db.clear);
afterAll(db.disconnect);

describe('audit log is append-only (SEC-6, APP-4)', () => {
  test('records actor, old and new value, in order', async () => {
    const actor = id(); const app = id();
    await audit.record(actor, 'APPLICATION_CREATED', 'Application', app, null, { status: 'APPLIED' });
    await audit.record(actor, 'APPLICATION_STATUS_CHANGED', 'Application', app, { status: 'APPLIED' }, { status: 'SHORTLISTED' });
    const rows = await audit.history('Application', app);
    expect(rows.map((r) => r.after.status)).toEqual(['APPLIED', 'SHORTLISTED']);
    expect(String(rows[1].actorId)).toBe(String(actor));
    expect(rows[1].at).toBeInstanceOf(Date);
  });

  test('updates and deletes are refused', async () => {
    const entry = await audit.record(id(), 'X', 'Application', id());
    await expect(AuditLog.updateOne({ _id: entry._id }, { action: 'Y' })).rejects.toThrow('cannot be changed');
    await expect(AuditLog.findOneAndUpdate({ _id: entry._id }, { action: 'Y' })).rejects.toThrow('cannot be changed');
    await expect(AuditLog.deleteMany({})).rejects.toThrow('cannot be changed');
    entry.action = 'Y';
    await expect(entry.save()).rejects.toThrow('cannot be changed');
    expect(await AuditLog.countDocuments()).toBe(1);
  });
});
