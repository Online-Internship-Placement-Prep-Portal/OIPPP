const { registerSchema, loginSchema } = require('../../src/modules/users/auth.validation');

const opts = { abortEarly: false, stripUnknown: true };

describe('registerSchema', () => {
  const valid = { name: 'Asha Rao', email: 'asha@example.com', password: 'StrongPass123' };

  test('accepts a valid student registration and defaults role to STUDENT', () => {
    const { error, value } = registerSchema.validate(valid, opts);

    expect(error).toBeUndefined();
    expect(value.role).toBe('STUDENT');
  });

  test('accepts RECRUITER as a role', () => {
    const { error, value } = registerSchema.validate({ ...valid, role: 'RECRUITER' }, opts);

    expect(error).toBeUndefined();
    expect(value.role).toBe('RECRUITER');
  });

  test('rejects ADMIN as a self-registration role', () => {
    const { error } = registerSchema.validate({ ...valid, role: 'ADMIN' }, opts);

    expect(error.details[0].path).toEqual(['role']);
  });

  test('trims and lowercases the email and trims the name', () => {
    const { value } = registerSchema.validate(
      { ...valid, name: '  Asha Rao  ', email: '  Asha@Example.COM ' },
      opts,
    );

    expect(value.name).toBe('Asha Rao');
    expect(value.email).toBe('asha@example.com');
  });

  test.each([
    ['name', { name: 'A' }],
    ['name', { name: 'x'.repeat(101) }],
    ['email', { email: 'not-an-email' }],
    ['password', { password: 'short' }],
    ['password', { password: 'x'.repeat(73) }],
  ])('rejects an invalid %s', (field, override) => {
    const { error } = registerSchema.validate({ ...valid, ...override }, opts);

    expect(error.details.map((d) => d.path[0])).toContain(field);
  });

  test('reports every missing field at once', () => {
    const { error } = registerSchema.validate({}, opts);

    expect(error.details.map((d) => d.path[0]).sort()).toEqual(['email', 'name', 'password']);
  });

  test('strips unknown fields such as status', () => {
    const { value } = registerSchema.validate({ ...valid, status: 'ACTIVE' }, opts);

    expect(value).not.toHaveProperty('status');
  });
});

describe('loginSchema', () => {
  test('accepts email and password and normalises the email', () => {
    const { error, value } = loginSchema.validate(
      { email: 'Asha@Example.com', password: 'x' },
      opts,
    );

    expect(error).toBeUndefined();
    expect(value.email).toBe('asha@example.com');
  });

  test.each([
    [{ email: 'asha@example.com' }],
    [{ password: 'StrongPass123' }],
    [{ email: 'asha@example.com', password: '' }],
    [{ email: 'asha@example.com', password: 'x'.repeat(73) }],
  ])('rejects incomplete or oversized credentials %#', (body) => {
    expect(loginSchema.validate(body, opts).error).toBeDefined();
  });
});
