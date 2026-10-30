# ADR-3: Analytics inside the Node API

**Status:** Accepted. Supersedes the Python analytics service in SAD 3.4–3.6 and 4.3.5.

**Date:** 30 Oct 2026

## Context

The SAD planned a separate Python/Flask service with pandas. The API would call it over private HTTP and cache its results for 5 minutes. The service would compute the student readiness view (ANL-1), placement statistics (ANL-2) and the CSV report (ANL-3).

When the analytics work started:

- A second service on the free tier means a second cold start and a second deploy.
- Every figure the SRS asks for is a count, an average or a group-by over Results, Applications, Profiles and Listings. These are plain MongoDB aggregations.
- The SRS gives no formula for a combined 0–100 readiness score (decision D2).

## Decision

Compute analytics in `server/src/modules/analytics/analytics.service.js` with MongoDB aggregation pipelines, in the same API process.

- `GET /api/analytics/me` returns the student's own trend, weakest two topics and application counts per status.
- `GET /api/analytics/placements` and `GET /api/analytics/placements/export` return admin statistics and the matching CSV, filtered by branch and graduation year.
- Placement statistics are cached in memory for 5 minutes per filter, as the SAD planned for the gateway. The student view is not cached, so a student sees a new score straight away.
- No combined readiness score is produced (D2).

## Consequences

- One deployable service and one test suite. Analytics runs with the same authentication and role checks as every other route.
- No private network hop and no Python runtime in production. Python stays only for the documentation check script.
- The 2,000-student fixture answers well within PERF-3's 3 s.
- The admin dashboard can be up to 5 minutes behind. The CSV uses the same figures, so the two always agree.
- The cache lives in one process. A second API instance would need a shared cache.
- The component diagram and [DEVIATIONS](../other-docs/DEVIATIONS.md) rows 12 and 13 record the change.
