const Joi = require('joi');
const { validate, hasOperatorKey } = require('../../src/middleware/validate');

describe('hasOperatorKey', () => {
  test.each([
    [{ email: { $ne: null } }, true],
    [{ profile: { skills: [{ $gt: '' }] } }, true],
    [{ $where: '1' }, true],
    [{ email: 'a@b.com', note: 'costs $5' }, false],
    [null, false],
    ['plain string', false],
  ])('detects operator keys in %j -> %s', (value, expected) => {
    expect(hasOperatorKey(value)).toBe(expected);
  });
});

describe('validate', () => {
  const schema = Joi.object({ email: Joi.string().email().required(), age: Joi.number() });

  function run(body, source) {
    const req = { body, query: body };
    const next = jest.fn();
    validate(schema, source)(req, {}, next);
    return { req, err: next.mock.calls[0][0] };
  }

  test('replaces the source with the validated, stripped value', () => {
    const { req, err } = run({ email: 'a@b.com', age: '21', extra: true });

    expect(err).toBeUndefined();
    expect(req.body).toEqual({ email: 'a@b.com', age: 21 });
  });

  test('rejects operator injection before schema validation', () => {
    const { err } = run({ email: { $ne: null } });

    expect(err).toMatchObject({ status: 400, code: 'VALIDATION', message: 'Invalid characters in request' });
  });

  test('returns every failing field in details', () => {
    const { err } = run({ age: 'old' });

    expect(err.status).toBe(400);
    expect(err.details.map((d) => d.field).sort()).toEqual(['age', 'email']);
  });

  test('can validate a source other than the body', () => {
    const { req, err } = run({ email: 'a@b.com' }, 'query');

    expect(err).toBeUndefined();
    expect(req.query).toEqual({ email: 'a@b.com' });
  });
});
