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
