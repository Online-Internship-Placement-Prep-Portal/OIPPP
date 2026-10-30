const request = require('supertest');
const app = require('../../src/app');
const logger = require('../../src/utils/logger');
const { errorHandler } = require('../../src/middleware/error');

let info;

beforeEach(() => {
  info = jest.spyOn(logger, 'info').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

const requestLines = () => info.mock.calls.filter(([, msg]) => msg === 'request').map(([fields]) => fields);

describe('request log (SAD 4.4)', () => {
  test('logs one line per request with id, method, path, status and duration', async () => {
    const res = await request(app).get('/api/health');

    const [line] = requestLines();
    expect(requestLines()).toHaveLength(1);
    expect(line).toEqual({
      requestId: res.headers['x-request-id'],
      method: 'GET',
      route: '/api/health',
      status: 200,
      durationMs: expect.any(Number),
    });
    expect(line.requestId).toMatch(/^[0-9a-f-]{36}$/);
  });

  test('never logs query strings or bodies', async () => {
    await request(app).post('/api/auth/login?token=abc123').send({ email: 'x', password: 'Secret123' });

    const logged = JSON.stringify(info.mock.calls);
    expect(requestLines()[0]).toMatchObject({ route: '/api/auth/login', status: 400 });
    expect(logged).not.toContain('abc123');
    expect(logged).not.toContain('Secret123');
  });

  test('gives each request its own id', async () => {
    await request(app).get('/api/health');
    await request(app).get('/api/health');

    const [a, b] = requestLines();
    expect(a.requestId).not.toBe(b.requestId);
  });

  test('a 500 reports the same id the request was logged under', () => {
    const error = jest.spyOn(logger, 'error').mockImplementation(() => {});
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    errorHandler(new Error('boom'), { id: 'req-1', originalUrl: '/api/x?token=abc' }, res, jest.fn());

    expect(res.json.mock.calls[0][0].error.requestId).toBe('req-1');
    expect(error).toHaveBeenCalledWith(expect.objectContaining({ requestId: 'req-1', route: '/api/x' }), 'unhandled error');
  });
});
