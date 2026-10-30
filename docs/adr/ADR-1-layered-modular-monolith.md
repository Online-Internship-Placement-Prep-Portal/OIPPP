# ADR-1: Layered modular monolith

**Status:** Accepted

**Date:** 05 Oct 2026 (SAD v1.0 section 3.5)

## Context

Four people build four feature areas in parallel, in one semester, on free hosting. Render free instances sleep after 15 minutes idle, and each sleeping service adds a cold start of about 30 seconds. The SRS asks for search under 2 s and other calls under 1 s at the 95th percentile (PERF-1, PERF-2). Application writes, audit entries and notifications have to stay consistent (QA-3, SEC-6).

## Decision

Build one Node.js/Express API process. Split the code into feature modules under `server/src/modules/`, one folder per owner:

| Module | Owner |
|:--|:--|
| `users` (auth, profile, admin, resumes) | Member 1 |
| `listings` (listings, search, bookmarks, recommendations) | Member 2 |
| `applications`, `notifications`, `audit` | Member 3 |
| `tests`, `analytics` | Member 4 |

Cross-cutting code lives once in `server/src/middleware/` (authentication, role checks, validation, rate limits, errors) and `server/src/utils/`. A module reaches another module's data through its exported service or model, never through HTTP.

The React client in `client/` is a separate static site that talks only to `/api`.

Rejected alternatives, from SAD 3.5:

- **Microservices per feature.** Four free services would each sleep, and every cross-module call would cross the network.
- **Serverless functions.** Cold starts break the 1 s target, and the test timer needs a steady clock (see [ADR-2](ADR-2-server-side-test-timer.md)).

## Consequences

- One deploy, one log stream, one `/api/health` check.
- Each member mostly edits one folder; `.github/labeler.yml` labels pull requests by that folder.
- Middleware is shared, so a new route can't forget the role check: `authenticate` and `allow(...)` are applied per router.
- All modules scale together. That is fine for about 2,000 students and 50 concurrent users.
- A slow module can slow the others. Pagination caps and indexes keep each request bounded.
