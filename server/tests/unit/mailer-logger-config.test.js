// Branch coverage (#98): configuration paths that only run in production.
jest.mock('nodemailer', () => ({ createTransport: jest.fn(() => ({ sendMail: jest.fn(async (m) => m) })) }));

const ENV_KEYS = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'NODE_ENV'];
const saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  jest.resetModules();
});

function loadMailer(env) {
  Object.assign(process.env, env);
  let mailer;
  let nodemailer;
  jest.isolateModules(() => {
    nodemailer = require('nodemailer');
    nodemailer.createTransport.mockClear();
    mailer = require('../../src/modules/notifications/mailer');
  });
  return { mailer, nodemailer };
}

describe('mailer transport selection', () => {
  test('with SMTP_HOST and a user it builds an authenticated SMTP transport once', async () => {
    const { mailer, nodemailer } = loadMailer({ SMTP_HOST: 'smtp.example.test', SMTP_PORT: '2525', SMTP_USER: 'u', SMTP_PASS: 'p' });
    await mailer.sendMail({ to: 'a@b.test', subject: 's', text: 't' });
    await mailer.sendMail({ to: 'a@b.test', subject: 's2', text: 't2' });
    expect(nodemailer.createTransport).toHaveBeenCalledTimes(1);
    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      host: 'smtp.example.test', port: 2525, secure: false, auth: { user: 'u', pass: 'p' } });
  });

  test('port 465 uses TLS; no SMTP_USER means no auth block', async () => {
    delete process.env.SMTP_USER;
    const { mailer, nodemailer } = loadMailer({ SMTP_HOST: 'smtp.example.test', SMTP_PORT: '465' });
    await mailer.sendMail({ to: 'a@b.test', subject: 's', text: 't' });
    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      host: 'smtp.example.test', port: 465, secure: true, auth: undefined });
  });

  test('without SMTP_HOST it falls back to the JSON transport', async () => {
    delete process.env.SMTP_HOST;
    const { mailer, nodemailer } = loadMailer({});
    await mailer.sendMail({ to: 'a@b.test', subject: 's', text: 't' });
    expect(nodemailer.createTransport).toHaveBeenCalledWith({ jsonTransport: true });
  });
});

describe('logger level', () => {
  test('is silent under test and info otherwise', () => {
    let testLogger;
    let prodLogger;
    jest.isolateModules(() => { testLogger = require('../../src/utils/logger'); });
    process.env.NODE_ENV = 'production';
    jest.isolateModules(() => { prodLogger = require('../../src/utils/logger'); });
    expect(testLogger.level).toBe('silent');
    expect(prodLogger.level).toBe('info');
  });
});
