# OIPPP – Unit Test Report

**Issue:** #86 – Unit Test Report  
**Project:** Online Internship & Placement Preparation Portal (OIPPP)  
**Test date:** 4 November 2026  
**Branch:** `test/issue-86-unit-test-report`  
**Tested commit:** `e74b47bd9d8031ff5d3b93371b64b873b3849488`  
**Environment:** Windows 11; Node.js 22.22.2 (client); npm 10.9.7 (client); Jest; Vitest 5.0.5.

## 1. Executive summary

| Component | Suites / files | Passed | Failed |
|---|---:|---:|---:|
| Server (Jest) | 40 | 486 | 0 |
| Client (Vitest) | 6 | 53 | 0 |
| **Total** | **46** | **539** | **0** |

**Overall result: PASS – 539 of 539 tests passed.**

## 2. Server test results

**Command:** `npm test -- --runInBand` (from `server/`)

- Test suites: 40 passed, 40 total.
- Tests: 486 passed, 486 total; 0 failed.
- Snapshots: 0.
- Duration: 173.709 seconds.
- Result: PASS.

### Server coverage

**Command:** `npm run test:coverage` (from `server/`)

| Metric | Coverage |
|---|---:|
| Statements | 95.16% (1,241 / 1,304) |
| Branches | 89.06% (554 / 622) |
| Functions | 94.90% (242 / 255) |
| Lines | 95.99% (1,127 / 1,174) |

The coverage run also completed with 40 suites and 486 tests passed (0 failed); duration 192.917 seconds.

## 2a. Per-file results (rerun 4 Nov 2026)

Rerun on commit `9b1eab7` (dev, after #107–#109) with Node.js 24.21.0 on Windows 11, using `npx jest --json` and `npx vitest run --reporter=json`. Server: 40 suites, 487 tests, all passed (one more than the v1.0.0 count of 486). Client: 6 files, 53 tests, all passed. Server tests use an in-memory MongoDB.

### Server unit (14 files, 203 tests)

| File | Module | What it covers | Tests | Passed | Failed | Time (s) |
|---|---|---|---|---|---|---|
| `unit/application-transitions.test.js` | Applications | REV-2 state machine | 9 | 9 | 0 | 0.19 |
| `unit/aptitude-auth.test.js` | Aptitude | See file | 5 | 5 | 0 | 0.40 |
| `unit/aptitude-models.test.js` | Aptitude | Question — TST-1; Test — TST-2; Attempt — TST-3 to TST-5 / SAFE-1 | 44 | 44 | 0 | 5.18 |
| `unit/aptitude-scoring.test.js` | Aptitude | scoreAttempt — TST-6 auto-evaluation; publicResult | 9 | 9 | 0 | 5.44 |
| `unit/attempt-timeout-job.test.js` | Aptitude | See file | 3 | 3 | 0 | 0.40 |
| `unit/auth-middleware.test.js` | Identity | authenticate; allow | 11 | 11 | 0 | 3.15 |
| `unit/auth-service.test.js` | Identity | register; login | 14 | 14 | 0 | 3.92 |
| `unit/auth-validation.test.js` | Identity | registerSchema; loginSchema | 21 | 21 | 0 | 3.03 |
| `unit/identity-infrastructure.test.js` | Platform | error middleware; resume storage helpers | 17 | 17 | 0 | 5.48 |
| `unit/listing-model.test.js` | Listings | Listing model - Issue #14 | 18 | 18 | 0 | 1.83 |
| `unit/listing-service.test.js` | Listings | Listing service unit tests - Issue #15 | 11 | 11 | 0 | 4.98 |
| `unit/profile-model.test.js` | Identity | Profile Model Validation | 14 | 14 | 0 | 4.97 |
| `unit/user-profile-schema.test.js` | Identity | User schema; Profile schema | 17 | 17 | 0 | 8.06 |
| `unit/validate-middleware.test.js` | Platform | hasOperatorKey; validate | 10 | 10 | 0 | 0.54 |

### Server integration (26 files, 284 tests)

| File | Module | What it covers | Tests | Passed | Failed | Time (s) |
|---|---|---|---|---|---|---|
| `integration/admin.test.js` | Admin | Admin user management API; GET /api/admin/users; GET /api/auth/me | 15 | 15 | 0 | 12.23 |
| `integration/analytics-performance.test.js` | Analytics | See file | 2 | 2 | 0 | 8.76 |
| `integration/analytics.test.js` | Analytics | student readiness GET /analytics/me (ANL-1); placement statistics GET /analytics/placements (ANL-2); placement CSV export (ANL-3) | 19 | 19 | 0 | 12.54 |
| `integration/apply.test.js` | Applications | TC-APP-01: apply once and record history (APP-1, APP-4, APP-5); TC-APP-02: closed listing or not eligible (APP-2, APP-3); Confidentiality: cross-user application isolation | 10 | 10 | 0 | 12.01 |
| `integration/aptitude-api.test.js` | Aptitude | question bank and test authoring (#25); timed attempts and recovery (#26) | 44 | 44 | 0 | 15.10 |
| `integration/aptitude-indexes.test.js` | Aptitude | See file | 5 | 5 | 0 | 8.08 |
| `integration/aptitude-recovery.test.js` | Aptitude | refresh and closed tab (SAFE-1); dropped connection (SAFE-1, TST-4); deadline passes while offline (TST-5) | 9 | 9 | 0 | 13.06 |
| `integration/audit.test.js` | Admin | audit log is append-only (SEC-6, APP-4) | 2 | 2 | 0 | 2.83 |
| `integration/auth.test.js` | Identity | Authentication API; Student SRN (AUTH-1); Password rule (AUTH-3) | 20 | 20 | 0 | 16.24 |
| `integration/bookmarks.test.js` | Listings | Issue #11: bookmarks | 10 | 10 | 0 | 12.17 |
| `integration/health.test.js` | Platform | See file | 2 | 2 | 0 | 2.99 |
| `integration/identity-edge-cases.test.js` | Identity | Login account status; Admin user management edge cases; Profile and resume failure paths | 20 | 20 | 0 | 12.48 |
| `integration/identity-flow.test.js` | Identity | Identity flow | 8 | 8 | 0 | 14.13 |
| `integration/listing-recommendations.test.js` | Listings | Issue #12: skill-match listing recommendations | 5 | 5 | 0 | 12.01 |
| `integration/listing-search-performance.test.js` | Listings | Issue #13: listing search performance over 5000 listings | 4 | 4 | 0 | 9.62 |
| `integration/listing-search.test.js` | Listings | Issue #10: listing search, filters, sorting and pagination | 13 | 13 | 0 | 11.48 |
| `integration/listings.test.js` | Listings | Issue #9: recruiter listing management; Additional listing integration coverage - Issue #15; listing reads for the client | 16 | 16 | 0 | 11.76 |
| `integration/notifications.test.js` | Applications | REV-4: in-app notification and email; GET /api/notifications | 6 | 6 | 0 | 11.70 |
| `integration/profile.test.js` | Identity | Student profile API | 12 | 12 | 0 | 11.78 |
| `integration/rbac.test.js` | Identity | Role-based access control with real JWT authentication | 13 | 13 | 0 | 11.79 |
| `integration/reliability.test.js` | Platform | reliability and tampering (SAFE-1, SO-2, SEC-4) | 6 | 6 | 0 | 12.15 |
| `integration/request-log.test.js` | Platform | request log (SAD 4.4) | 4 | 4 | 0 | 4.43 |
| `integration/resume.test.js` | Identity | Resume upload; Current profile resume download; Application resume download | 19 | 19 | 0 | 12.42 |
| `integration/review.test.js` | Applications | REV-1: recruiter applicant list; REV-3: rejection needs a reason from the fixed list | 7 | 7 | 0 | 12.16 |
| `integration/settings.test.js` | Admin | Admin settings; One-offer policy (DOM-2, BR-5) | 8 | 8 | 0 | 12.11 |
| `integration/status.test.js` | Applications | TC-REV-01: status lifecycle (REV-2, REV-4, APP-4) | 5 | 5 | 0 | 12.21 |

### Client (6 files, 53 tests)

| File | Module | What it covers | Tests | Passed | Failed | Time (s) |
|---|---|---|---|---|---|---|
| `test/api-client.test.js` | Identity | toApiError; handleResponseError | 7 | 7 | 0 | 0.03 |
| `test/guard.test.jsx` | Identity | RequireRole (AUTH-6) | 3 | 3 | 0 | 0.11 |
| `test/pages.test.jsx` | Identity | Register; Login; Applicants (recruiter) | 11 | 11 | 0 | 3.42 |
| `test/status-format.test.js` | Applications | status transitions (REV-2); formatting | 7 | 7 | 0 | 0.00 |
| `test/timer.test.js` | Identity | server-synced countdown; answer auto-save (TST-4) | 9 | 9 | 0 | 0.00 |
| `test/validation.test.js` | Identity | SRN (AUTH-1); password rule (AUTH-3); validateRegister | 16 | 16 | 0 | 0.01 |

## 3. Client test results

**Command:** `npm test -- --run` (from `client/`)

- Test files: 6 passed, 6 total.
- Tests: 53 passed, 53 total; 0 failed.
- Duration: 33.56 seconds.
- Vitest version: 5.0.5.
- Result: PASS.

The client tests cover API client behavior, route/role guards, page flows, validation, timer behavior, and status formatting.

**Environment note:** The initial client test attempt under Node.js 20.19.5 could not start Vitest workers because installed dependencies require a newer Node.js runtime. Node.js 22.22.2 was then used for the successful rerun.

## 4. Requirement-to-test mapping

The following summarizes the requirement coverage documented in the project's existing test report and corresponding automated suites.

| Requirement area | Automated evidence | Result |
|---|---|---|
| Authentication and identity (AUTH-1 to AUTH-6) | `integration/auth.test.js`, `integration/identity-flow.test.js`, `unit/auth-service.test.js`, `unit/auth-validation.test.js` | Pass |
| Profile and resume (PROF-1 to PROF-4) | `integration/profile.test.js`, `integration/resume.test.js`, `unit/profile-model.test.js`, `unit/user-profile-schema.test.js` | Pass |
| RBAC and security (SEC-1, SEC-3 to SEC-6) | `integration/rbac.test.js`, `integration/audit.test.js`, `integration/identity-edge-cases.test.js`, `unit/validate-middleware.test.js`, `unit/auth-middleware.test.js`, `unit/identity-infrastructure.test.js` | Pass |
| Listings and search (LST-1 to LST-4, SRCH-1 to SRCH-5) | `integration/listings.test.js`, `integration/listing-search.test.js`, `integration/listing-recommendations.test.js`, `integration/bookmarks.test.js`, `unit/listing-model.test.js`, `unit/listing-service.test.js` | Pass |
| Applications and review (APP-1 to APP-5, REV-1 to REV-4) | `integration/apply.test.js`, `integration/review.test.js`, `integration/status.test.js`, `integration/notifications.test.js`, `unit/application-transitions.test.js` | Pass |
| Aptitude and recovery (TST-1 to TST-6, SAFE-1) | `integration/aptitude-api.test.js`, `integration/aptitude-recovery.test.js`, `integration/aptitude-indexes.test.js`, `unit/aptitude-models.test.js`, `unit/aptitude-scoring.test.js`, `unit/attempt-timeout-job.test.js`, `unit/aptitude-auth.test.js` | Pass |
| Analytics (ANL-1 to ANL-3) | `integration/analytics.test.js`, `integration/analytics-performance.test.js` | Pass |
| Reliability and supporting APIs | `integration/reliability.test.js`, `integration/health.test.js`, `integration/request-log.test.js`, `integration/settings.test.js`, `integration/admin.test.js` | Pass |

**Scope note:** SEC-2 deployed HTTPS/TLS checks, live OWASP ZAP scanning, UAT, and real-device checks are separate validation activities. They are not established by these unit-test runs.

## 5. Issues observed during test execution

1. The initial client test attempt under Node.js 20.19.5 failed before tests could execute. Vitest workers could not start because of runtime/dependency compatibility.
2. After switching the current PowerShell session to Node.js 22.22.2, all 6 client test files and 53 tests passed.
3. No failing tests remained in the final server or client test runs.

## 6. Reproduction commands

Run from the repository root:

```powershell
cd server
npm test -- --runInBand
npm run test:coverage

cd ..\client
npm test -- --run
```

Use Node.js 22.22.2 or a compatible newer runtime for the client tests, as required by the installed Vitest/dependency versions.

## 7. Conclusion

The recorded automated test run passed all 539 server and client tests. Server coverage was 95.16% for statements, 89.06% for branches, 94.90% for functions, and 95.99% for lines. This report records automated test evidence for the tested commit; it does not replace deployment security validation or user-acceptance testing.
