// Exercise the real JWT middleware with a mocked identity-module boundary;
// no test-header authentication is enabled in the production router.
jest.mock('../../src/modules/users/user.model', () => ({ findById: jest.fn() }));
const jwt = require('jsonwebtoken');
const { authenticate, allow } = require('../../src/middleware/auth');
const User = require('../../src/modules/users/user.model');
const { jwtSecret } = require('../../src/config/env');
beforeEach(() => jest.clearAllMocks());
const signedRequest = () => ({ headers: { authorization: `Bearer ${jwt.sign({ sub: 'student-id' }, jwtSecret)}` } });
test('valid JWT resolves current role and active account', async () => {
  User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ id: 'student-id', role: 'STUDENT', status: 'ACTIVE' }) });
  const req = signedRequest(); const next = jest.fn(); await authenticate(req, {}, next);
  expect(req.user.role).toBe('STUDENT'); expect(next).toHaveBeenCalledWith();
});
test.each([null, { id: 'student-id', role: 'STUDENT', status: 'DISABLED' }])('missing or disabled account is rejected', async (user) => {
  User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });
  const next = jest.fn(); await authenticate(signedRequest(), {}, next); expect(next.mock.calls[0][0].status).toBe(401);
});
test('invalid JWT is rejected without querying identity model', async () => {
  const next = jest.fn(); await authenticate({ headers: { authorization: 'Bearer invalid' } }, {}, next);
  expect(next.mock.calls[0][0].status).toBe(401); expect(User.findById).not.toHaveBeenCalled();
});
test('role middleware rejects recruiter authoring', () => {
  const next = jest.fn(); allow('ADMIN')({ user: { role: 'RECRUITER' } }, {}, next);
  expect(next.mock.calls[0][0].status).toBe(403);
});
