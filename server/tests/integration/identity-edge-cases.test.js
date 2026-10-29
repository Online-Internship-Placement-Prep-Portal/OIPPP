const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = require('../../src/app');
const User = require('../../src/modules/users/user.model');
const Profile = require('../../src/modules/users/profile.model');
const AuditLog = require('../../src/modules/audit/auditLog.model');
const profileService = require('../../src/modules/users/profile.service');
const { deleteResume, getBucket } = require('../../src/modules/users/resume.storage');
const { jwtSecret } = require('../../src/config/env');
const db = require('../helpers/db');

beforeAll(async () => {
  await db.connect();
});

beforeEach(async () => {
  await db.clear();
  // GridFS collections are not mongoose models, so db.clear() leaves them behind.
  await Promise.all(['resumes.files', 'resumes.chunks'].map((name) => mongoose.connection.db.collection(name).deleteMany({})));
});

afterAll(async () => {
  await db.disconnect();
});

const makePdf = () => Buffer.from('%PDF-1.4\nIdentity test resume\n%%EOF');

async function createUser(role, status = 'ACTIVE', email = `${role.toLowerCase()}-${status.toLowerCase()}@example.com`) {
  const passwordHash = await bcrypt.hash('StrongPass123', 4);
  return User.create({ name: `${role} Test`, email, passwordHash, role, status });
}

function tokenFor(user) {
  return jwt.sign({ sub: user.id, role: user.role }, jwtSecret, { expiresIn: '10m' });
}

function login(email, password = 'StrongPass123') {
  return request(app).post('/api/auth/login').send({ email, password });
}

async function storedFileCount() {
  return mongoose.connection.db.collection('resumes.files').countDocuments();
}

describe('Login account status', () => {
  test.each(['PENDING', 'DISABLED', 'REJECTED'])('denies login to a %s account with correct credentials', async (status) => {
    const user = await createUser('RECRUITER', status);

    const res = await login(user.email);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(res.body.token).toBeUndefined();
  });

  test('a newly registered recruiter cannot log in until approved', async () => {
    const register = await request(app).post('/api/auth/register').send({
      name: 'New Recruiter', email: 'new-recruiter@example.com', password: 'StrongPass123', role: 'RECRUITER',
    });
    expect(register.status).toBe(201);
    expect(register.body.user.status).toBe('PENDING');

    expect((await login('new-recruiter@example.com')).status).toBe(403);
  });

  test('an unknown email and a wrong password give the same response', async () => {
    const user = await createUser('STUDENT');

    const unknown = await login('nobody@example.com');
    const wrong = await login(user.email, 'WrongPass123');

    expect(unknown.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(unknown.body).toEqual(wrong.body);
  });
});

describe('Admin user management edge cases', () => {
  let admin;

  beforeEach(async () => {
    admin = await createUser('ADMIN');
  });

  test('approving a recruiter that is already active returns 409 and writes no audit entry', async () => {
    const recruiter = await createUser('RECRUITER', 'ACTIVE');

    const res = await request(app)
      .patch(`/api/admin/recruiters/${recruiter.id}/approve`)
      .set('Authorization', `Bearer ${tokenFor(admin)}`);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
    expect(await AuditLog.countDocuments()).toBe(0);
  });

  test('a student ID cannot be approved as a recruiter', async () => {
    const student = await createUser('STUDENT');

    const res = await request(app)
      .patch(`/api/admin/recruiters/${student.id}/approve`)
      .set('Authorization', `Bearer ${tokenFor(admin)}`);

    expect(res.status).toBe(404);
    expect((await User.findById(student.id)).status).toBe('ACTIVE');
  });

  test('deactivating an unknown user returns 404', async () => {
    const res = await request(app)
      .patch(`/api/admin/users/${new mongoose.Types.ObjectId()}/deactivate`)
      .set('Authorization', `Bearer ${tokenFor(admin)}`);

    expect(res.status).toBe(404);
  });

  test('deactivating an already disabled user returns 409', async () => {
    const student = await createUser('STUDENT', 'DISABLED');

    const res = await request(app)
      .patch(`/api/admin/users/${student.id}/deactivate`)
      .set('Authorization', `Bearer ${tokenFor(admin)}`);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  test('rejecting an unknown recruiter returns 404', async () => {
    const res = await request(app)
      .patch(`/api/admin/recruiters/${new mongoose.Types.ObjectId()}/reject`)
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ reasonCode: 'OTHER' });

    expect(res.status).toBe(404);
  });

  test('deactivation keeps the profile and resume but blocks the account (SAFE-2)', async () => {
    const student = await createUser('STUDENT');
    await Profile.create({ userId: student._id, branch: 'CSE', gradYear: 2027 });
    const upload = await request(app)
      .post('/api/profile/me/resume')
      .set('Authorization', `Bearer ${tokenFor(student)}`)
      .attach('resume', makePdf(), { filename: 'resume.pdf', contentType: 'application/pdf' });
    expect(upload.status).toBe(200);

    await request(app)
      .patch(`/api/admin/users/${student.id}/deactivate`)
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .expect(200);

    expect((await login(student.email)).status).toBe(403);
    expect((await request(app).get('/api/profile/me').set('Authorization', `Bearer ${tokenFor(student)}`)).status).toBe(401);
    expect(await Profile.countDocuments({ userId: student._id, resumeFileId: { $ne: null } })).toBe(1);
    expect(await storedFileCount()).toBe(1);
  });
});

describe('Profile and resume failure paths', () => {
  test('a student without a profile record gets 404 for view and update', async () => {
    const student = await createUser('STUDENT');
    const auth = { Authorization: `Bearer ${tokenFor(student)}` };

    expect((await request(app).get('/api/profile/me').set(auth)).status).toBe(404);
    expect((await request(app).put('/api/profile/me').set(auth).send({ branch: 'CSE' })).status).toBe(404);
  });

  test('uploading without a profile record stores no file', async () => {
    const student = await createUser('STUDENT');

    const res = await request(app)
      .post('/api/profile/me/resume')
      .set('Authorization', `Bearer ${tokenFor(student)}`)
      .attach('resume', makePdf(), { filename: 'resume.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(404);
    expect(await storedFileCount()).toBe(0);
  });

  test('a request without a file is rejected before storage', async () => {
    const student = await createUser('STUDENT');
    await Profile.create({ userId: student._id });

    await expect(profileService.uploadMyResume(student._id, undefined))
      .rejects.toMatchObject({ status: 400, code: 'RESUME_REQUIRED' });
    expect(await storedFileCount()).toBe(0);
  });

  test('a failed profile save removes the just-uploaded file and keeps the old resume', async () => {
    const student = await createUser('STUDENT');
    const oldFileId = new mongoose.Types.ObjectId();
    await Profile.create({ userId: student._id, resumeFileId: oldFileId });
    const save = jest.spyOn(Profile.prototype, 'save').mockRejectedValueOnce(new Error('simulated write failure'));

    await expect(profileService.uploadMyResume(student._id, { buffer: makePdf() }))
      .rejects.toThrow('simulated write failure');
    save.mockRestore();

    expect(await storedFileCount()).toBe(0);
    expect(String((await Profile.findOne({ userId: student._id })).resumeFileId)).toBe(String(oldFileId));
  });

  test('downloading a resume whose file is missing returns 404 to the student and the admin', async () => {
    const student = await createUser('STUDENT');
    const admin = await createUser('ADMIN');
    await Profile.create({ userId: student._id, resumeFileId: new mongoose.Types.ObjectId() });

    const own = await request(app).get('/api/profile/me/resume').set('Authorization', `Bearer ${tokenFor(student)}`);
    const viaAdmin = await request(app)
      .get(`/api/admin/users/${student.id}/resume`)
      .set('Authorization', `Bearer ${tokenFor(admin)}`);

    for (const res of [own, viaAdmin]) {
      expect(res.status).toBe(404);
      expect(res.headers['content-type']).toMatch(/application\/json/);
      expect(res.headers['content-disposition']).toBeUndefined();
      expect(res.body.error.code).toBe('RESUME_NOT_FOUND');
    }
  });
});

describe('Resume storage', () => {
  async function storeFile() {
    const upload = getBucket().openUploadStream('resume.pdf');
    await new Promise((resolve, reject) => upload.once('finish', resolve).once('error', reject).end(makePdf()));
    return upload.id;
  }

  test('deletes a stored file by ID or string ID', async () => {
    await deleteResume(await storeFile());
    await deleteResume(String(await storeFile()));

    expect(await storedFileCount()).toBe(0);
  });

  test('ignores an empty ID and a file that is already gone', async () => {
    await expect(deleteResume(null)).resolves.toBeUndefined();
    await expect(deleteResume(new mongoose.Types.ObjectId())).resolves.toBeUndefined();
  });

  test('rejects an invalid ID', async () => {
    await expect(deleteResume('not-an-id')).rejects.toMatchObject({ status: 400, code: 'INVALID_RESUME_ID' });
  });

  test('propagates storage failures other than a missing file', async () => {
    const bucket = Object.getPrototypeOf(getBucket());
    const remove = jest.spyOn(bucket, 'delete').mockRejectedValueOnce(Object.assign(new Error('disk failure'), { codeName: 'InternalError' }));

    await expect(deleteResume(new mongoose.Types.ObjectId())).rejects.toThrow('disk failure');
    remove.mockRestore();
  });
});
