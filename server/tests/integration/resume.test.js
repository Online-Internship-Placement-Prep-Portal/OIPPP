
const request = require('supertest');
const mongoose = require('mongoose');

jest.mock('../../src/middleware/auth', () => require('../helpers/fakeAuth'));

const db = require('../helpers/db');
const { as } = require('../helpers/fakeAuth');
const { seed } = require('../helpers/seed');
const app = require('../../src/app');
const Profile = require('../../src/modules/users/profile.model');
const User = require('../../src/modules/users/user.model');
const Application = require('../../src/modules/applications/application.model');

let s;

const makePdf = (content = 'Test resume content') =>
  Buffer.from(`%PDF-1.4\n${content}\n%%EOF`);

async function clearGridFS() {
  if (!mongoose.connection.db) return;

  await Promise.all([
    mongoose.connection.db.collection('resumes.files').deleteMany({}),
    mongoose.connection.db.collection('resumes.chunks').deleteMany({}),
  ]);
}

async function uploadResume(student, pdf = makePdf(), options = {}) {
  return request(app)
    .post('/api/profile/me/resume')
    .set(as(student))
    .attach('resume', pdf, {
      filename: options.filename || 'resume.pdf',
      contentType: options.contentType || 'application/pdf',
    });
}

async function createApplication(student, listing, resumeFileId) {
  return Application.create({
    studentId: student._id,
    listingId: listing._id,
    resumeFileId,
    history: [
      {
        from: null,
        to: 'APPLIED',
        by: student._id,
      },
    ],
  });
}

async function downloadResume(application, user) {
  return request(app)
    .get(`/api/applications/${application._id}/resume`)
    .set(as(user))
    .buffer(true)
    .parse((res, callback) => {
      const chunks = [];

      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => callback(null, Buffer.concat(chunks)));
      res.on('error', callback);
    });
}

async function downloadCurrentResume(user) {
  return request(app)
    .get('/api/profile/me/resume')
    .set(as(user))
    .buffer(true)
    .parse((res, callback) => {
      const chunks = [];

      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => callback(null, Buffer.concat(chunks)));
      res.on('error', callback);
    });
}

async function downloadAdminResume(studentId, user) {
  return request(app)
    .get(`/api/admin/users/${studentId}/resume`)
    .set(as(user))
    .buffer(true)
    .parse((res, callback) => {
      const chunks = [];

      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => callback(null, Buffer.concat(chunks)));
      res.on('error', callback);
    });
}

beforeAll(async () => {
  await db.connect();
});

afterAll(async () => {
  await db.disconnect();
});

beforeEach(async () => {
  await db.clear();
  await clearGridFS();
  s = await seed();
});

describe('Resume upload', () => {
  test('uploads a PDF and saves its GridFS ID in the student profile', async () => {
    const response = await uploadResume(s.student);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Resume uploaded successfully');
    expect(response.body.resumeFileId).toBeTruthy();

    const profile = await Profile.findOne({
      userId: s.student._id,
    }).lean();

    expect(String(profile.resumeFileId)).toBe(response.body.resumeFileId);

    const files = await mongoose.connection.db
      .collection('resumes.files')
      .find({})
      .toArray();

    expect(files).toHaveLength(1);
    expect(files[0].contentType).toBe('application/pdf');
  });

  test('rejects a non-PDF file', async () => {
    const response = await uploadResume(
      s.student,
      Buffer.from('This is a text file'),
      {
        filename: 'resume.txt',
        contentType: 'text/plain',
      },
    );

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_FILE_TYPE');
  });

  test('rejects a file without a PDF signature', async () => {
    const response = await uploadResume(
      s.student,
      Buffer.from('Not a PDF file'),
    );

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_FILE_CONTENT');
  });

  test('rejects a PDF larger than 2 MB', async () => {
    const oversizedPdf = Buffer.concat([
      Buffer.from('%PDF-1.4\n'),
      Buffer.alloc(2 * 1024 * 1024),
    ]);

    const response = await uploadResume(s.student, oversizedPdf);

    expect(response.status).toBe(413);
    expect(response.body.error.code).toBe('FILE_TOO_LARGE');
  });

  test('rejects uploads from users who are not students', async () => {
    const response = await uploadResume(s.recruiter);

    expect(response.status).toBe(403);
  });

  test('replacing a resume removes the old file when no application uses it', async () => {
    const firstUpload = await uploadResume(
      s.student,
      makePdf('Original resume'),
    );

    expect(firstUpload.status).toBe(200);

    const firstResumeId = firstUpload.body.resumeFileId;

    const secondUpload = await uploadResume(
      s.student,
      makePdf('Updated resume'),
    );

    expect(secondUpload.status).toBe(200);

    const secondResumeId = secondUpload.body.resumeFileId;

    expect(secondResumeId).not.toBe(firstResumeId);

    const profile = await Profile.findOne({
      userId: s.student._id,
    }).lean();

    expect(String(profile.resumeFileId)).toBe(secondResumeId);

    const files = await mongoose.connection.db
      .collection('resumes.files')
      .find({})
      .toArray();

    expect(files.map((file) => String(file._id))).toEqual([secondResumeId]);
  });
});

describe('Current profile resume download', () => {
  test('student can download their own current resume', async () => {
    const upload = await uploadResume(s.student);

    expect(upload.status).toBe(200);

    const response = await downloadCurrentResume(s.student);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/application\/pdf/);
    expect(response.body.toString()).toContain('%PDF-1.4');
  });

  test('returns 404 when the student has no current resume', async () => {
    const response = await downloadCurrentResume(s.other);

    expect(response.status).toBe(404);

    const errorBody = JSON.parse(response.body.toString());

    expect(errorBody.error.code).toBe('RESUME_NOT_FOUND');
  });

  test('does not allow a recruiter to download the current profile resume', async () => {
    const upload = await uploadResume(s.student);

    expect(upload.status).toBe(200);

    const response = await downloadCurrentResume(s.recruiter);

    expect(response.status).toBe(403);
  });
});

describe('Application resume download', () => {
  test('listing owner can download the application resume', async () => {
    const upload = await uploadResume(s.student);

    expect(upload.status).toBe(200);

    const profile = await Profile.findOne({
      userId: s.student._id,
    });

    const application = await createApplication(
      s.student,
      s.L1,
      profile.resumeFileId,
    );

    const response = await downloadResume(application, s.recruiter);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/application\/pdf/);
    expect(response.body.toString()).toContain('%PDF-1.4');
  });

  test('another recruiter cannot download the application resume', async () => {
    const upload = await uploadResume(s.student);

    expect(upload.status).toBe(200);

    const profile = await Profile.findOne({
      userId: s.student._id,
    });

    const application = await createApplication(
      s.student,
      s.L1,
      profile.resumeFileId,
    );

    const response = await downloadResume(application, s.recruiter2);

    expect(response.status).toBe(403);
  });

  test('a student cannot download another student application resume', async () => {
    const upload = await uploadResume(s.student);

    expect(upload.status).toBe(200);

    const profile = await Profile.findOne({
      userId: s.student._id,
    });

    const application = await createApplication(
      s.student,
      s.L1,
      profile.resumeFileId,
    );

    const response = await downloadResume(application, s.other);

    expect(response.status).toBe(403);
  });

  test('returns 404 when an application has no resume', async () => {
    const application = await createApplication(
      s.student,
      s.L1,
      undefined,
    );

    const response = await downloadResume(application, s.recruiter);

    expect(response.status).toBe(404);

    const errorBody = JSON.parse(response.body.toString());

    expect(errorBody.error.code).toBe('RESUME_NOT_FOUND');
  });

  test('returns a JSON 404 when the application resume file is missing from storage', async () => {
    const application = await createApplication(s.student, s.L1, new mongoose.Types.ObjectId());

    const response = await downloadResume(application, s.recruiter);

    expect(response.status).toBe(404);
    expect(response.headers['content-type']).toMatch(/application\/json/);
    expect(response.headers['content-disposition']).toBeUndefined();
    expect(JSON.parse(response.body.toString()).error.code).toBe('RESUME_NOT_FOUND');
  });

  test('application can still download its original resume after profile replacement', async () => {
    const firstUpload = await uploadResume(
      s.student,
      makePdf('Original resume'),
    );

    expect(firstUpload.status).toBe(200);

    const originalResumeId = firstUpload.body.resumeFileId;

    const application = await createApplication(
      s.student,
      s.L1,
      new mongoose.Types.ObjectId(originalResumeId),
    );

    const secondUpload = await uploadResume(
      s.student,
      makePdf('Updated resume'),
    );

    expect(secondUpload.status).toBe(200);

    const newResumeId = secondUpload.body.resumeFileId;

    expect(newResumeId).not.toBe(originalResumeId);

    const savedApplication = await Application.findById(
      application._id,
    ).lean();

    expect(String(savedApplication.resumeFileId)).toBe(originalResumeId);

    const response = await downloadResume(application, s.recruiter);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/application\/pdf/);
    expect(response.body.toString()).toContain('Original resume');
    expect(response.body.toString()).not.toContain('Updated resume');
  });
});

describe('Admin current resume download', () => {
  let admin;

  beforeEach(async () => {
    admin = await User.create({
      name: 'Test Admin',
      email: 'admin@test.com',
      role: 'ADMIN',
    });
  });

  test('admin can download a student current resume', async () => {
    const upload = await uploadResume(s.student);

    expect(upload.status).toBe(200);

    const response = await downloadAdminResume(s.student._id, admin);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/application\/pdf/);
    expect(response.body.toString()).toContain('%PDF-1.4');
  });

  test('returns 404 when the student has no resume', async () => {
    const response = await downloadAdminResume(s.other._id, admin);

    expect(response.status).toBe(404);

    const errorBody = JSON.parse(response.body.toString());

    expect(errorBody.error.code).toBe('RESUME_NOT_FOUND');
  });

  test('does not allow a recruiter to download through the admin route', async () => {
    const upload = await uploadResume(s.student);

    expect(upload.status).toBe(200);

    const response = await downloadAdminResume(s.student._id, s.recruiter);

    expect(response.status).toBe(403);
  });

  test('does not allow a student to download through the admin route', async () => {
    const upload = await uploadResume(s.student);

    expect(upload.status).toBe(200);

    const response = await downloadAdminResume(s.student._id, s.student);

    expect(response.status).toBe(403);
  });
});
