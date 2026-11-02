# Test Case Document - Online Internship & Placement Preparation Portal

| | |
|:--|:--|
| Project | Online Internship & Placement Preparation Portal (OIPPP) |
| Version | 2.0 (draft) |
| Authors | Deekshith Gowda G, Sharath H G, Guru R Bharadwaj, E S Sukruth |
| Date | 06-11-2026 |
| Replaces | Software Test Plan v1.0 (05-10-2026), section 13 |

## 1. Purpose

This document holds every test case for release 1.0 of OIPPP, updated after the product was built, and the requirements traceability matrix (RTM) that links each SRS requirement to its test cases and automated tests. The test cases were run against the Part-3 test build from 2 to 6 Nov 2026. Their results are summarised in the System Validation Report.

## 2. Version history

| Version | Date | Author | Changes |
|:--|:--|:--|:--|
| 1.0 | 05-10-2026 | All members | 16 test cases (12 functional, 4 non-functional) in Test Plan section 13, written before development |
| 2.0 | 06-11-2026 | All members | The 16 cases updated to match what was built (section 4), new cases for every requirement that v1.0 covered only in the automated suite, UI steps added, "Automated by" added for each case, the RTM updated (section 6), and actual results from the Part-3 test build filled in |

## 3. How the test cases are written

Every case uses the fields of Test Plan v1.0 section 13, plus three:

| Field | Meaning |
|:--|:--|
| Requirement(s) | SRS requirement IDs the case proves |
| Type | Functional, Negative, Boundary, Security, Performance, Reliability or UI |
| Preconditions, Steps, Test data | What must be true before the run, the API and UI steps, and the inputs |
| Expected result | Status codes, error codes and messages from the [API contract](../other-docs/api-contract.md), and what the screen shows |
| Actual result, Status | What happened on the Part-3 test build: Pass, Fail, Blocked or Not run, with the environment, date and commit |
| Automated by | The Jest or Vitest tests that check the same behaviour on every CI run |
| Changes from v1.0 | What changed and the [DEVIATIONS](../other-docs/DEVIATIONS.md) row behind it, or "New" |

The existing IDs are kept. New cases continue each module's numbering, for example TC-APP-03 after TC-APP-02.

The test build, accounts and data set are in [deployment.md section 6](../other-docs/deployment.md#6-part-3-test-build-26-nov-2026).

## 4. Test cases by module

| Module | File | Owner | Requirements |
|:--|:--|:--|:--|
| Identity and security | [test-cases/identity.md](test-cases/identity.md) | Deekshith Gowda G (#83) | AUTH, PROF, SEC, DOM-2 |
| Listings and search | [test-cases/listings.md](test-cases/listings.md) | Sharath H G (#87) | LST, SRCH, PERF |
| Applications, review and notifications | [test-cases/applications.md](test-cases/applications.md) | Guru R Bharadwaj (#91) | APP, REV, DOM-1 |
| Aptitude and analytics | [test-cases/aptitude-analytics.md](test-cases/aptitude-analytics.md) | E S Sukruth (#95) | TST, ANL, SAFE, DOM-3 |

The PDF places the four files in this order after this section.

### Changes to the v1.0 test cases

| TC | Change in v2.0 | DEVIATIONS row |
|:--|:--|:--|
| TC-AUTH-01 | Duplicate-email error code and message | 18 |
| TC-AUTH-02 | To be confirmed by #83 | |
| TC-AUTH-03 | 423 `ACCOUNT_LOCKED` with `retryAt` | 18 |
| TC-AUTH-04 | Step 3 uses `GET /applications/:id/resume` | 16 |
| TC-PROF-01 | A 2.1 MB PDF returns 413 `FILE_TOO_LARGE`; DOCX returns 400 `INVALID_FILE_TYPE` | 23 |
| TC-LST-01 | Deadline closer timing; editing a closed listing returns 409 `LISTING_CLOSED` | |
| TC-SRCH-01 | Query uses `search`, `sortBy` + `order` and `mode=REMOTE`; response is `{listings, pagination}`; counts from the `seed:demo` data | 19 |
| TC-APP-01 | Response body and `ALREADY_APPLIED` details per the API contract; recruiter notification, stored resume and the 1,000-character note limit added | 18 |
| TC-APP-02 | `NOT_ELIGIBLE` code and exact messages; a listing past its deadline counts as closed | |
| TC-REV-01 | `INVALID_TRANSITION` and `REASON_REQUIRED` codes; Mailtrap email check; retries after 1, 5 and 15 minutes | 1, 4 |
| TC-TST-01 | Acknowledged saves; same attempt and same `endsAt` after reopening | |
| TC-TST-02 | Hard cutoff: any answer at or after `endsAt` returns 409 `ATTEMPT_CLOSED`; auto-submit by the timeout sweep | 10, 11 |
| TC-ANL-01 | `GET /analytics/placements` and `/analytics/placements/export`; no combined readiness score | 13, 21 |
| TC-PERF-01 | `npm run test:load` or `search_load.jmx` against the deployed build; PERF-3 added | |
| TC-SEC-01 | bcrypt cost 12, so the stored hash starts with `$2b$12$` | |
| TC-SEC-02 | 11th login returns 429 `RATE_LIMITED`; HTTPS and TLS checked on the deployed hostnames | |

## 5. Summary of results

Filled in on 06-11-2026 from the four module files.

| Module | Test cases | Pass | Fail | Blocked | Not run |
|:--|--:|--:|--:|--:|--:|
| Identity and security | | | | | |
| Listings and search | | | | | |
| Applications, review and notifications | 9 | | | | |
| Aptitude and analytics | | | | | |
| **Total** | | | | | |

## 6. Requirements traceability matrix

"v1.0" is the Test Plan section 13 RTM. "Automated by" lists the main suites under `server/tests/`; the module files name the individual tests.

| Requirement | v1.0 test case(s) | v2.0 test case(s) | Automated by |
|:--|:--|:--|:--|
| AUTH-1 | TC-AUTH-01 | #83 | `integration/auth.test.js` |
| AUTH-2 | TC-AUTH-01 | #83 | `integration/auth.test.js` |
| AUTH-3 | TC-AUTH-02 | #83 | `integration/auth.test.js`, `unit/auth-validation.test.js` |
| AUTH-4 | TC-AUTH-03 | #83 | `integration/auth.test.js`, `unit/auth-service.test.js` |
| AUTH-5 | TC-AUTH-03 | #83 | `integration/auth.test.js` |
| AUTH-6 | TC-AUTH-04 | #83 | `integration/rbac.test.js` |
| PROF-1 | Unit/integration suite only | #83 | `integration/profile.test.js`, `unit/profile-model.test.js` |
| PROF-2 | TC-PROF-01 | #83 | `integration/resume.test.js` |
| PROF-3 | Unit/integration suite only | #83 | `integration/admin.test.js` |
| PROF-4 | Unit/integration suite only | #83 | `integration/identity-flow.test.js`, `integration/rbac.test.js` |
| LST-1 | TC-LST-01 | #87 | `integration/listings.test.js` |
| LST-2 | TC-LST-01 | #87 | `integration/listings.test.js` |
| LST-3 | Unit/integration suite only | #87 | `integration/listings.test.js` |
| LST-4 | TC-LST-01 | #87 | `integration/listings.test.js` |
| SRCH-1 | TC-SRCH-01 | #87 | `integration/listing-search.test.js` |
| SRCH-2 | TC-SRCH-01 | #87 | `integration/listing-search.test.js` |
| SRCH-3 | TC-SRCH-01 | #87 | `integration/listing-search.test.js` |
| SRCH-4 | Unit/integration suite only | #87 | `integration/bookmarks.test.js` |
| SRCH-5 | Unit/integration suite only | #87 | `integration/listing-recommendations.test.js` |
| APP-1 | TC-APP-01 | TC-APP-01 | `integration/apply.test.js`, `integration/reliability.test.js` |
| APP-2 | TC-APP-02 | TC-APP-02 | `integration/apply.test.js` |
| APP-3 | TC-APP-02 | TC-APP-02, TC-APP-04 | `integration/apply.test.js` |
| APP-4 | TC-APP-01 | TC-APP-01, TC-REV-03, TC-REV-04 | `integration/apply.test.js`, `integration/status.test.js`, `integration/audit.test.js` |
| APP-5 | Unit/integration suite only | TC-APP-03 | `integration/apply.test.js` |
| REV-1 | Unit/integration suite only | TC-REV-02 | `integration/review.test.js`, `integration/resume.test.js` |
| REV-2 | TC-REV-01 | TC-REV-01, TC-REV-03, TC-REV-04 | `integration/status.test.js`, `unit/application-transitions.test.js` |
| REV-3 | TC-REV-01 | TC-REV-01, TC-REV-03 | `integration/review.test.js` |
| REV-4 | TC-REV-01 | TC-REV-01, TC-REV-05 | `integration/notifications.test.js`, `integration/status.test.js` |
| TST-1 | Unit/integration suite only | #95 | `integration/aptitude-api.test.js`, `unit/aptitude-models.test.js` |
| TST-2 | Unit/integration suite only | #95 | `integration/aptitude-api.test.js` |
| TST-3 | TC-TST-01 | #95 | `integration/aptitude-recovery.test.js` |
| TST-4 | TC-TST-01 | #95 | `integration/aptitude-recovery.test.js`, `integration/aptitude-indexes.test.js` |
| TST-5 | TC-TST-02 | #95 | `integration/aptitude-recovery.test.js`, `unit/attempt-timeout-job.test.js` |
| TST-6 | TC-TST-02 | #95 | `unit/aptitude-scoring.test.js` |
| ANL-1 | Unit/integration suite only | #95 | `integration/analytics.test.js` |
| ANL-2 | TC-ANL-01 | #95 | `integration/analytics.test.js` |
| ANL-3 | TC-ANL-01 | #95 | `integration/analytics.test.js` |
| PERF-1 | TC-PERF-01 | #87 | `integration/listing-search-performance.test.js`; load run (#89) |
| PERF-2 | TC-PERF-01 | #87 | Load run (#89) |
| PERF-3 | Reviewed in Sprint 3 | #87 | `integration/analytics-performance.test.js`; load run (#89) |
| SAFE-1 | TC-TST-01 | #95 | `integration/aptitude-recovery.test.js` |
| SAFE-2 | Reviewed in Sprint 3 | #95 | `integration/identity-edge-cases.test.js` |
| SEC-1 | TC-SEC-01 | #83 | `unit/auth-service.test.js` |
| SEC-2 | TC-SEC-02 | #83 | Deployed-URL check (#85) |
| SEC-3 | TC-AUTH-04 | #83 | `integration/rbac.test.js`, `integration/resume.test.js` |
| SEC-4 | TC-SEC-01 | #83 | `unit/validate-middleware.test.js` |
| SEC-5 | TC-SEC-02 | #83 | `integration/auth.test.js` |
| SEC-6 | Security checklist 5.1 | #83 | `integration/audit.test.js`, `integration/status.test.js` |
| DOM-1 | Not listed | TC-APP-02, TC-APP-04 | `integration/apply.test.js` |
| DOM-2 | Not listed | #83 | `integration/settings.test.js` |
| DOM-3 | Not listed | #95 | `integration/analytics.test.js` |

Quality attributes QA-1 to QA-5 are measured in the System Validation Report (UAT and devices in #97, QA-3 and QA-4 from the automated suites), not by individual test cases.
