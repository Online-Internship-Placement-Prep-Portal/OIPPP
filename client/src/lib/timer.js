// The offset to the server clock is measured once, so a wrong device clock can't add or remove time.
export function clockOffset(serverTime, localNow = Date.now()) {
  return new Date(serverTime).getTime() - localNow;
}

export function remainingMs(endsAt, offset, localNow = Date.now()) {
  return Math.max(0, new Date(endsAt).getTime() - (localNow + offset));
}

export function formatClock(ms) {
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export const WARNING_MS = 5 * 60 * 1000;

const RETRYABLE = new Set(['NETWORK', 'INTERNAL', 'RATE_LIMITED', 'DATABASE_UNAVAILABLE']);

// One save in flight per question; a newer pick replaces a queued one. Transient errors retry.
export function createAnswerSaver({ save, onState, retries = 3, retryDelayMs = 1000, sleep }) {
  const wait = sleep || ((ms) => new Promise((r) => setTimeout(r, ms)));
  const pending = new Map();
  const running = new Set();

  async function run(questionId) {
    running.add(questionId);
    while (pending.has(questionId)) {
      const optionIdx = pending.get(questionId);
      pending.delete(questionId);
      onState?.(questionId, 'saving');
      for (let attempt = 1; ; attempt += 1) {
        try {
          await save(questionId, optionIdx);
          if (!pending.has(questionId)) onState?.(questionId, 'saved');
          break;
        } catch (err) {
          if (!RETRYABLE.has(err?.code) || attempt > retries) {
            onState?.(questionId, 'error', err);
            break;
          }
          await wait(retryDelayMs * attempt);
          if (pending.has(questionId)) break;
        }
      }
    }
    running.delete(questionId);
  }

  return {
    pick(questionId, optionIdx) {
      pending.set(questionId, optionIdx);
      return running.has(questionId) ? Promise.resolve() : run(questionId);
    },
    get busy() { return running.size > 0; },
  };
}
