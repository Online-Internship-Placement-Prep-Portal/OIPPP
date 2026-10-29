const mongoose = require('mongoose');
const AppError = require('../../src/utils/AppError');
const logger = require('../../src/utils/logger');
const { errorHandler, notFound } = require('../../src/middleware/error');
const { getBucket, parseFileId } = require('../../src/modules/users/resume.storage');

function mockResponse() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe('error middleware', () => {
  const req = { originalUrl: '/api/auth/login' };

  test('passes an AppError through with its status and code', () => {
    const res = mockResponse();

    errorHandler(new AppError(403, 'FORBIDDEN', 'Your account is not active'), req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'FORBIDDEN', message: 'Your account is not active', details: undefined },
    });
  });

  test('maps a duplicate-key error to 409 without leaking the index', () => {
    const res = mockResponse();

    errorHandler(Object.assign(new Error('E11000 duplicate key: email_1'), { code: 11000 }), req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json.mock.calls[0][0].error).toMatchObject({ code: 'DUPLICATE' });
    expect(JSON.stringify(res.json.mock.calls[0][0])).not.toContain('email_1');
  });

  test('hides unexpected errors behind a request ID that is also logged', () => {
    const res = mockResponse();
    const log = jest.spyOn(logger, 'error').mockImplementation(() => {});

    errorHandler(new Error('passwordHash missing on user 42'), req, res, jest.fn());

    const body = res.json.mock.calls[0][0];
    expect(res.status).toHaveBeenCalledWith(500);
    expect(body.error).toMatchObject({ code: 'INTERNAL', message: 'Something went wrong' });
    expect(JSON.stringify(body)).not.toContain('passwordHash');
    expect(log).toHaveBeenCalledWith(expect.objectContaining({ requestId: body.error.requestId, route: req.originalUrl }),
      'unhandled error');
    log.mockRestore();
  });

  test('unknown routes become a 404 AppError', () => {
    const next = jest.fn();

    notFound(req, mockResponse(), next);

    expect(next.mock.calls[0][0]).toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });
});

describe('resume storage helpers', () => {
  test('refuses to open storage before the database is connected', () => {
    expect(mongoose.connection.db).toBeUndefined();
    expect(() => getBucket()).toThrow(expect.objectContaining({ status: 503, code: 'DATABASE_UNAVAILABLE' }));
  });

  test.each(['', 'abc', '123', { $ne: null }, 'zzzzzzzzzzzzzzzzzzzzzzzz'])('rejects invalid resume ID %p', (value) => {
    expect(() => parseFileId(value)).toThrow(expect.objectContaining({ status: 400, code: 'INVALID_RESUME_ID' }));
  });

  test('accepts a string or ObjectId and returns an ObjectId', () => {
    const id = new mongoose.Types.ObjectId();

    expect(String(parseFileId(id))).toBe(String(id));
    expect(String(parseFileId(String(id)))).toBe(String(id));
  });
});
