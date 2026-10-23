const request = require('supertest');

jest.mock('../../src/middleware/auth', () => require('../helpers/fakeAuth'));

const db = require('../helpers/db');
const { as } = require('../helpers/fakeAuth');
const { User } = require('../helpers/fixtures');
const app = require('../../src/app');
const Notification = require('../../src/modules/notifications/notification.model');
const mailer = require('../../src/modules/notifications/mailer');
const service = require('../../src/modules/notifications/notification.service');

const sent = [];
let failMail = false;
mailer.setTransport({ sendMail: async (m) => { if (failMail) throw new Error('smtp down'); sent.push(m); } });

let student; let recruiter;
const msg = { type: 'APPLICATION_STATUS', title: 'Backend Intern: Shortlisted', message: 'You are shortlisted.' };
const later = (min) => new Date(Date.now() + min * 60000 + 1000);

beforeAll(db.connect);
afterAll(db.disconnect);
beforeEach(async () => {
  await db.clear();
  sent.length = 0;
  failMail = false;
  [student, recruiter] = await User.create([
    { name: 'Asha', email: 'asha@pes.edu', role: 'STUDENT' },
    { name: 'Rec', email: 'r@acme.io', role: 'RECRUITER' },
  ]);
});

describe('REV-4: in-app notification and email', () => {
  test('writes the in-app row and sends one email', async () => {
    const n = await service.notify(student._id, msg, { email: true });
    expect(n.email.status).toBe('SENT');
    expect(sent).toEqual([expect.objectContaining({ to: 'asha@pes.edu', subject: msg.title })]);
  });

  test('in-app only when email is not asked for', async () => {
    const n = await service.notify(recruiter._id, { ...msg, type: 'APPLICATION_RECEIVED' });
    expect(n.email.status).toBe('NONE');
    expect(sent).toHaveLength(0);
  });

  test('failed email keeps the row and retries 3 times (1, 5, 15 min), then FAILED', async () => {
    failMail = true;
    let n = await service.notify(student._id, msg, { email: true });
    expect(n.email).toMatchObject({ status: 'PENDING', attempts: 1 });
    expect(await service.retryDueEmails(new Date())).toBe(0);

    expect(await service.retryDueEmails(later(1))).toBe(1);
    expect(await service.retryDueEmails(later(6))).toBe(1);
    expect(await service.retryDueEmails(later(21))).toBe(1);
    n = await Notification.findById(n._id);
    expect(n.email).toMatchObject({ status: 'FAILED', attempts: 4 });
    expect(await service.retryDueEmails(later(60))).toBe(0);
  });

  test('a retry succeeds once mail is back', async () => {
    failMail = true;
    const n = await service.notify(student._id, msg, { email: true });
    failMail = false;
    await service.retryDueEmails(later(1));
    expect((await Notification.findById(n._id)).email.status).toBe('SENT');
    expect(sent).toHaveLength(1);
  });
});

describe('GET /api/notifications', () => {
  test('lists only my own, filters unread, marks read, hides email state', async () => {
    await service.notify(recruiter._id, msg);
    const list = await request(app).get('/api/notifications?unread=true').set(as(recruiter));
    expect(list.status).toBe(200);
    expect(list.body.items).toHaveLength(1);
    expect(list.body.items[0].email).toBeUndefined();
    expect((await request(app).get('/api/notifications').set(as(student))).body.items).toHaveLength(0);

    const id = list.body.items[0]._id;
    expect((await request(app).patch(`/api/notifications/${id}/read`).set(as(student))).status).toBe(404);
    await request(app).patch(`/api/notifications/${id}/read`).set(as(recruiter)).expect(200);
    expect((await request(app).get('/api/notifications?unread=true').set(as(recruiter))).body.items).toHaveLength(0);
  });

  test('requires login', async () => {
    expect((await request(app).get('/api/notifications')).status).toBe(401);
  });
});
