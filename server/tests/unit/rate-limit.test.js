const { authKey } = require('../../src/middleware/rate-limit');

describe('authKey (#124)', () => {
  test('keys on the normalised email when one is sent', () => {
    expect(authKey({ body: { email: '  Student@Example.com ' }, ip: '1.1.1.1' })).toBe('email:student@example.com');
    expect(authKey({ body: { email: 'student@example.com' }, ip: '2.2.2.2' })).toBe('email:student@example.com');
  });

  test('falls back to the client IP without an email', () => {
    expect(authKey({ body: {}, ip: '1.1.1.1' })).toBe('ip:1.1.1.1');
    expect(authKey({ ip: '1.1.1.1' })).toBe('ip:1.1.1.1');
    expect(authKey({ body: { email: 42 }, ip: '1.1.1.1' })).toBe('ip:1.1.1.1');
  });
});
