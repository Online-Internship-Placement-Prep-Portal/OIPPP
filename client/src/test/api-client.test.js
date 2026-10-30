import { describe, expect, it, vi } from 'vitest';
import { ApiError, handleResponseError, session, setUnauthorizedHandler, toApiError } from '../api/client';

const httpError = (status, data, headers = {}) => ({ response: { status, data }, config: { headers } });

describe('toApiError', () => {
  it('maps the standard error shape, keeping code, message and field details', async () => {
    const err = await toApiError(httpError(400, { error: { code: 'VALIDATION', message: '"srn" is required',
      details: [{ field: 'srn', message: 'SRN is required' }, { field: 'srn', message: 'second' }] } }));
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 400, code: 'VALIDATION', message: '"srn" is required' });
    expect(err.fields).toEqual({ srn: 'SRN is required' });
  });

  it('reports a network failure when there is no response', async () => {
    const err = await toApiError(new Error('socket hang up'));
    expect(err.code).toBe('NETWORK');
    expect(err.message).toMatch(/cannot reach the server/i);
  });

  it('turns ACCOUNT_LOCKED into a message with the retry time', async () => {
    const retryAt = '2026-10-30T10:15:00.000Z';
    const err = await toApiError(httpError(423, { error: { code: 'ACCOUNT_LOCKED', message: 'locked',
      details: [{ field: 'retryAt', message: retryAt }] } }));
    expect(err.status).toBe(423);
    expect(err.message).toContain(new Date(retryAt).toLocaleTimeString());
  });

  it('includes the request id on a 500 and falls back for bodies without an error', async () => {
    const withId = await toApiError(httpError(500, { error: { code: 'INTERNAL', requestId: 'abc-123' } }));
    expect(withId.message).toContain('abc-123');
    const bare = await toApiError(httpError(502, '<html>bad gateway</html>'));
    expect(bare.code).toBe('INTERNAL');
  });

  it('reads JSON errors from blob responses (file downloads)', async () => {
    const blob = new Blob([JSON.stringify({ error: { code: 'RESUME_NOT_FOUND', message: 'No resume' } })]);
    const err = await toApiError(httpError(404, blob));
    expect(err).toMatchObject({ code: 'RESUME_NOT_FOUND', message: 'No resume' });
  });
});

describe('handleResponseError', () => {
  it('clears the session and calls the handler on a 401 for an authenticated request', async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    session.save('t', { id: 1 });
    await expect(handleResponseError(httpError(401, { error: { code: 'UNAUTHENTICATED', message: 'expired' } },
      { Authorization: 'Bearer t' }))).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
    expect(session.token).toBeNull();
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });

  it('leaves the session alone for a 401 from the login form', async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    await expect(handleResponseError(httpError(401, { error: { code: 'UNAUTHENTICATED', message: 'Invalid email or password' } })))
      .rejects.toMatchObject({ message: 'Invalid email or password' });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});
