# ADR-2: Server-side test timer

**Status:** Accepted

**Date:** 05 Oct 2026 (SAD v1.0 section 3.5)

## Context

An aptitude attempt is timed (TST-2) and must close when time runs out (TST-5). A timer in the browser can be paused, changed or lost on refresh. A student must not lose saved answers or time when the browser is closed or the connection drops (SAFE-1).

## Decision

The server owns the clock.

- Starting an attempt stores `startedAt` and `endsAt = startedAt + durationMin` on the Attempt. Neither changes afterwards.
- Every response that carries an attempt also returns `serverTime`. The client shows a countdown from `endsAt - serverTime`, so a wrong device clock does not matter.
- Each answer is saved on its own request (`PATCH /api/attempts/:id/answers`) and acknowledged with `204` before the client shows "Saved" (TST-4).
- Answers at or after `endsAt` are refused with `409 ATTEMPT_CLOSED` (decision D1, [DEVIATIONS](../other-docs/DEVIATIONS.md) row 10).
- `attempt-timeout.job.js` sweeps every second and submits overdue attempts. Because it queries by `endsAt`, it also catches attempts that expired while the API was asleep or restarting.
- Closing the attempt and writing its Result happen in one MongoDB transaction, so an attempt is never closed without a score. This needs a replica set; `aptitudeService.initialize()` refuses to start on a standalone server.

## Consequences

- Refreshing, closing the tab or reconnecting returns the same attempt with its saved answers and the original deadline.
- The UI countdown is only a display. A student who keeps a stale tab open still cannot answer late.
- Local development and CI need a replica set; the tests use `mongodb-memory-server` in replica-set mode.
- The sweep can lag by up to a second, or longer under heavy load. Request-time checks close any overdue attempt the moment it is touched, so the lag never lets an answer through.
