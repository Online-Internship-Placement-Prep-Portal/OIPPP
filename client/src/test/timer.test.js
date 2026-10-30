import { describe, expect, it, vi } from 'vitest';
import { clockOffset, createAnswerSaver, formatClock, remainingMs } from '../lib/timer';

describe('server-synced countdown', () => {
  it('uses the server clock, not the device clock', () => {
    const serverNow = Date.parse('2026-10-30T10:00:00Z');
    const deviceNow = serverNow + 5 * 60000; // device runs 5 minutes fast
    const offset = clockOffset(new Date(serverNow).toISOString(), deviceNow);
    const endsAt = new Date(serverNow + 30 * 60000).toISOString();
    expect(remainingMs(endsAt, offset, deviceNow)).toBe(30 * 60000);
    expect(remainingMs(endsAt, offset, deviceNow + 10 * 60000)).toBe(20 * 60000);
  });

  it('never goes below zero', () => {
    expect(remainingMs(new Date(0).toISOString(), 0, Date.now())).toBe(0);
  });

  it('formats the clock', () => {
    expect(formatClock(65000)).toBe('01:05');
    expect(formatClock(3725000)).toBe('1:02:05');
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(1)).toBe('00:01');
  });
});

describe('answer auto-save (TST-4)', () => {
  const sleep = () => Promise.resolve();

  it('saves an answer and reports saving then saved', async () => {
    const save = vi.fn().mockResolvedValue();
    const onState = vi.fn();
    const saver = createAnswerSaver({ save, onState, sleep });
    await saver.pick('q1', 2);
    expect(save).toHaveBeenCalledWith('q1', 2);
    expect(onState.mock.calls.map((c) => c[1])).toEqual(['saving', 'saved']);
    expect(saver.busy).toBe(false);
  });

  it('retries a network failure and then succeeds', async () => {
    const save = vi.fn().mockRejectedValueOnce({ code: 'NETWORK' }).mockResolvedValue();
    const onState = vi.fn();
    await createAnswerSaver({ save, onState, sleep }).pick('q1', 0);
    expect(save).toHaveBeenCalledTimes(2);
    expect(onState).toHaveBeenLastCalledWith('q1', 'saved');
  });

  it('gives up after the retry limit', async () => {
    const save = vi.fn().mockRejectedValue({ code: 'NETWORK' });
    const onState = vi.fn();
    await createAnswerSaver({ save, onState, sleep, retries: 2 }).pick('q1', 0);
    expect(save).toHaveBeenCalledTimes(3);
    expect(onState).toHaveBeenLastCalledWith('q1', 'error', { code: 'NETWORK' });
  });

  it('does not retry when the attempt is closed', async () => {
    const save = vi.fn().mockRejectedValue({ code: 'ATTEMPT_CLOSED' });
    const onState = vi.fn();
    await createAnswerSaver({ save, onState, sleep }).pick('q1', 0);
    expect(save).toHaveBeenCalledOnce();
    expect(onState).toHaveBeenLastCalledWith('q1', 'error', { code: 'ATTEMPT_CLOSED' });
  });

  it('sends only the latest pick when the student changes answer during a save', async () => {
    let release;
    const save = vi.fn().mockImplementationOnce(() => new Promise((r) => { release = r; })).mockResolvedValue();
    const saver = createAnswerSaver({ save, sleep });
    const first = saver.pick('q1', 0);
    saver.pick('q1', 1);
    saver.pick('q1', 3);
    release();
    await first;
    expect(save.mock.calls).toEqual([['q1', 0], ['q1', 3]]);
  });

  it('saves different questions independently', async () => {
    const save = vi.fn().mockResolvedValue();
    const saver = createAnswerSaver({ save, sleep });
    await Promise.all([saver.pick('q1', 0), saver.pick('q2', 1)]);
    expect(save.mock.calls).toEqual([['q1', 0], ['q2', 1]]);
  });
});
