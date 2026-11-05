# System Validation Report - Online Internship & Placement Preparation Portal

| | |
|:--|:--|
| Project | Online Internship & Placement Preparation Portal (OIPPP) |
| Release | 1.0 (tag `v1.0.0`) plus the fixes listed in section 8 |
| Test window | 2–6 Nov 2026 |
| Prepared by | Guru R Bharadwaj (QA lead), with results from all four members |
| Date | 04-11-2026 (interim; final on 06-11-2026) |

## 1. Scope

This report validates release 1.0 of OIPPP against the SRS, using the Software Test Plan v1.0 approach and the test cases in the [Test Case Document v2.0](test-case-document.md). It covers:

- system tests of every test case on the deployed test build, through the API and the UI;
- the full Postman collection on the deployed build;
- security validation (Test Plan 5.1) on the deployed hostnames;
- the performance rerun on the deployed build (PERF-1 to PERF-3);
- user acceptance testing (QA-1) and the device check (QA-5).

Unit and integration test results are in the Unit Test Report. Coverage is in the Code Coverage and Branch Coverage reports.

## 2. Build and environment under test

| Item | Value |
|:--|:--|
| Client | https://oippp-client.onrender.com (Render static site, Singapore) |
| API | https://oippp-api.onrender.com/api (Render free web service, Singapore, Node 22) |
| Database | MongoDB Atlas M0 replica set (Mumbai), database `oippp` |
| Email | Mailtrap sandbox inbox |
| Build commit | `f044d21` (v1.0.0 plus the fix for #99) for the 2 Nov runs in section 4; `main` from 4 Nov, after PR #100 was merged. Final commit: filled in on 06-11-2026 |
| Data | `seed:demo`: 1 admin, 10 recruiters, 200 students, 5,000 listings, 100 questions, 5 tests, 600 applications |
| Details | [deployment.md section 6](../other-docs/deployment.md#6-part-3-test-build-26-nov-2026) |

## 3. Entry and exit criteria (Test Plan section 5)

| Criterion | Status | Evidence |
|:--|:--|:--|
| Entry: stable build deployed to the test environment | Met, 02-11-2026 | Post-deploy checks in deployment.md section 6 |
| Entry: seed data loaded | Met, 02-11-2026 | `seed` and `seed:demo` output |
| Entry: test cases reviewed | Partly met | Identity (#83, PR #105), listings (#87, PR #109) and applications (#91, PR #101) merged; aptitude and analytics (#95, PR #114) in review |
| Exit: all planned test cases executed | Not yet | Applications API steps done (section 4.2); #84, #88 and #96 pending |
| Exit: no open Critical or High defects | Met on 04-11-2026 | Section 8: #99 fixed; ZAP found 0 High |
| Exit: server statement coverage at least 70% (QA-4) | Met | 95.16% statements ([Unit Test Report](unit-test-report.md)); Code Coverage Report (#90) to confirm |
| Exit: every requirement in the RTM has at least one passed test | Not yet | Every requirement has a passing automated test (Unit Test Report); system-test passes pending |

## 4. Test case results

### 4.1 Summary

| Module | Owner | Test cases | Pass | Partial | Fail | Blocked | Not run |
|:--|:--|--:|--:|--:|--:|--:|--:|
| Identity and security | Deekshith Gowda G (#84) | 14 | 1 | 0 | 0 | 0 | 13 |
| Listings and search | Sharath H G (#88) | 11 | 4 | 2 | 0 | 2 | 3 |
| Applications, review and notifications | Guru R Bharadwaj | 9 | 9 (API) | 0 | 0 | 0 | UI steps pending |
| Aptitude and analytics | E S Sukruth (#96) | 17 | 3 | 1 | 1 | 0 | 12 |
| **Total** | | **51** | **17** | **3** | **1** | **2** | **28** |

Identity also ran 12 login, RBAC and injection checks that passed on the deployed build, and an XSS check that passed at the API with the page-rendering check pending (section 4.3). They are not counted above because they are not separate test cases in identity.md.

### 4.2 Applications, review and notifications

API steps of the nine [applications test cases](test-cases/applications.md), run with a script against `https://oippp-api.onrender.com/api` on 02-11-2026, build `f044d21`. Users R1, R2, S1 and S2 are `recruiter01`, `recruiter02`, `student0001` and `student0002`. R1 created listings L1 to L3 for the run. Each check compares the status code, error code, message and stored data with the expected result, and email checks read the Mailtrap inbox through its API.

**Result (second run, 13:57–14:02 UTC): all nine test cases pass their API steps.** The script ran 50 checks (3 setup, 47 test) and 49 passed in the run. The 50th, the TC-REV-03 rejection email, arrived after the script's 2-minute wait, through the app's retry (see below). The UI steps are not run yet.

| Test case | API checks | Result | Notes |
|:--|--:|:--|:--|
| TC-APP-01 | 7 | Pass | One application, one history entry, resume copy opens; 1,001-character note gives 400 |
| TC-APP-02 | 4 | Pass | 409 `LISTING_CLOSED`, 422 `NOT_ELIGIBLE` naming 8.0, 403 for a recruiter, nothing stored |
| TC-APP-03 | 4 | Pass | Newest first, history newest first, S2 sees only S2's applications |
| TC-APP-04 | 2 | Pass | CGPA 7.99 gives 422; 8.0 gives 201 |
| TC-REV-01 | 6 | Pass | Shortlist email in Mailtrap 6 s after the change, same subject as the notification |
| TC-REV-02 | 6 | Pass | Page shape, status filter, limit 51 gives 400, owner gets the PDF, R2 gets 403 `NOT_LISTING_OWNER` |
| TC-REV-03 | 11 | Pass | Rejection email ends with "Reason: Skills do not match the role."; it arrived on the third attempt, 14:06:32 UTC |
| TC-REV-04 | 2 | Pass | Two simultaneous shortlists: one 200, one 422 `INVALID_TRANSITION`; one history entry, one notification |
| TC-REV-05 | 5 | Pass | Unread list, mark read, other user's notification 404, no token 401 |

**First run (13:47–13:53 UTC): 48 of 50, both email checks failed.** No email reached Mailtrap, yet every notification was stored with email status `SENT`. The API instance was running without the SMTP settings, so the mailer fell back to its no-send JSON transport, which reports success. The settings were present on the service, and a fresh deploy of the same commit (live at 13:56 UTC) picked them up. A one-off check after the deploy received its email in 6 s. No code change was needed. See observation O-1 in section 8.

**Email retry seen on the deployed build (REV-4).** Mailtrap's free sandbox refuses emails sent in quick succession (`550 5.7.0 Too many emails per second`). TC-REV-03 changes status three times in a few seconds, so two of its emails were refused:

| Email | Attempt 1 | Retry | Delivered |
|:--|:--|:--|:--|
| "QA L1: Offer" to S1 | 13:58:51, refused | after 1 minute | 14:00:32, attempt 2 |
| "QA L1: Rejected" to S2 | 13:58:56, refused | after 1 and 5 minutes | 14:06:32, attempt 3 |

The status changes themselves returned 200 at once, so email failures did not fail the request. This matches REV-4's retry schedule of 1, 5 and 15 minutes. On a paid email provider the refusals would not happen. For later runs, wait a few seconds between status changes when checking email.

### 4.3 Identity and security

Issue #84 testing was partially executed against the deployed test build. Of the 14 test cases in identity.md, PROF-1 (student profile editing) passed on the deployed UI; the other checks below support AUTH-6 and SEC-4 but do not complete a listed test case.

**Deployed UI checks**

| Check | Result |
|:--|:--|
| Student login | Pass |
| Student profile editing and persistence | Pass |
| Student access to Admin UI | Pass |
| Recruiter login | Pass |
| Recruiter access to Admin UI | Pass |
| Unauthenticated access to Admin UI | Pass |

**Deployed API checks**

| Check | Result |
|:--|:--|
| Unauthenticated GET /auth/me | Pass, HTTP 401 |
| Student GET /admin/users | Pass, HTTP 403 |
| Recruiter GET /admin/users | Pass, HTTP 403 |
| Admin GET /admin/users | Pass, HTTP 200 |
| `$ne` injection | Pass, HTTP 400 VALIDATION |
| `$gt` injection | Pass, HTTP 400 VALIDATION |
| `$where` injection | Pass, HTTP 400 VALIDATION |
| XSS login payload | API validation passed, HTTP 400; website rendering verification pending |

**Local automated tests**

Eight integration test suites were run locally: identity-flow, identity-edge-cases, RBAC, auth, profile, resume, admin and audit. Result: 109 tests passed, 0 failed. These are local automated results, not deployed system-test passes.

The remaining identity test cases have not yet been fully executed against the deployed build. See [test-cases/identity.md](test-cases/identity.md).

### 4.4 Listings and search

Issue #88 execution against the deployed test build on 04-11-2026. API checks used `https://oippp-api.onrender.com/api`. The exact deployed application commit SHA was not independently verified from Render Events.

| Test case | Result | Evidence and outstanding work |
|:--|:--|:--|
| TC-LST-01 — Listing creation, validation and expiry | Pass | Valid creation returned 201 and OPEN. Past deadline and negative stipend returned 400. A short-deadline listing eventually became CLOSED; editing it returned 409 `LISTING_CLOSED`. |
| LST-3 — Listing ownership | Pass | Other recruiter received 403 for edit and close. Owner successfully edited and closed the listing; GET confirmed CLOSED. |
| SRCH-4 — Saved internships and bookmark limit | Partial | Save returned 201; duplicate save returned the same bookmark ID; GET showed one occurrence; removal returned 204. Closed and expired listings returned 400 `LISTING_NOT_BOOKMARKABLE`. The 100/101 boundary and duplicate-at-limit case were not tested to avoid polluting shared seeded data. |
| SRCH-5 — Recommendations | Partial | 1,455 recommendations returned. All were OPEN and not expired; match counts were consistent and ranking descending. Unauthenticated access returned 401; recruiter access returned 403. Empty-profile behaviour was not verified. |
| TC-PERF-01 — Search/API load performance | Blocked | 50-VU load test not run against Render. Deployment guidance requires a dedicated VM because shared-IP rate limits can distort results. |
| PERF-3 — Dashboard rendering | Blocked | 2,000-student test not rerun. Deployed seed has 200 students; dedicated dataset and environment required. |
| TC-SRCH-01 — Search, filters, sort and pagination | Pass | Search, mode, stipend and skill queries returned expected results. Stipend-descending order was monotonic across 50 records; pages 1 and 2 had no duplicate IDs. Invalid mode, sort and stipend range returned 400. Newman run: 10 requests, 15 assertions, 0 failures. |
| UI-LST-01 — Listing search page | Pass | Manual check showed 803 React search results. User confirmed filters, sorting and pagination worked. |
| UI-LST-02 — Recruiter listing form | Not run | No separately recorded UI execution. |
| UI-SRCH-04 — Saved internships UI | Not run | No separately recorded UI execution. |
| UI-SRCH-05 — Student home feed UI | Not run | No separately recorded UI execution. |

**Issue #88 summary:** 4 Pass, 2 Partial, 2 Blocked, 3 Not run, 0 confirmed failures.

**Observation — public listing count:** the public API initially reported 4,421 listings and later 4,427 after test listings were created. Seed documentation describes 4,500 open listings. The difference is unexplained and is recorded as an observation, not a confirmed defect.

The short-deadline listing was OPEN on an early poll and CLOSED on a later GET. Editing after the deadline returned 409 `LISTING_CLOSED`. The exact background-job closure time was not measured.

### 4.5 Aptitude and analytics

Issue #96 run against the deployed test build on 05-11-2026 with [`server/scripts/system-test-aptitude.js`](../../server/scripts/system-test-aptitude.js) (API, same calls as Postman). Deployed `main` was `1e07391`; the exact SHA was not re-checked on Render Events. Evidence JSON is in [`evidence/`](evidence/). Test cases: [test-cases/aptitude-analytics.md](test-cases/aptitude-analytics.md).

| Test case | Result | Evidence and outstanding work |
|:--|:--|:--|
| TC-TST-01 — Resume after refresh / closed tab | Pass (API) | Start 201, 20 questions, `endsAt` = start + 30 min, no answer keys. 5 saves 204 (incl. option 0) and a changed answer; refresh returned all answers and the same `endsAt`; restart returned 200 with the same attempt; 3 concurrent starts resolved to one attempt. UI steps pending. |
| TC-TST-02 — Auto-submit at end time | Partial | A 30-minute *Placement Practice Test 2* attempt (`student0188`, 20 answers saved, then no calls; `endsAt` 06:00:38 UTC) was `SUBMITTED` / `TIMEOUT` when checked at 14:31 UTC, scored 20/20 from the saved answers, and a later save returned 409 `ATTEMPT_CLOSED`. `submittedAt` was the time of the check, not `endsAt`: the free Render instance had gone to sleep, so the one-second sweep was not running and the read-time expiry check closed the attempt (DEVIATIONS row 11). No late answer was accepted and no time was added. The 10-minute `ST-96` run with 5 s / 40 s late answers needs the admin account. |
| TC-TST-03 — Question bank | Not run (admin) | Role checks pass: student and recruiter 403 on `/questions`; student questions carry no `answerIdx`. |
| TC-TST-04 — Draft, publish, archive | Not run (admin) | Role check passes: student `POST /tests` 403; students see only published tests. |
| TC-TST-05 — Single attempt | Pass (API) | Other student 404 on read/save/submit/result; `ATTEMPT_OPEN` before submit; submit idempotent (same `resultId`); later save 409 `ATTEMPT_CLOSED`; restart 409 `ATTEMPT_EXISTS`. |
| TC-TST-06 — Save within 1 s | **Fail** | 20 saves measured at the client: median 931 ms, p95 1,023 ms, 4 of 20 over 1 s (one earlier save 2,832 ms). `GET /health` from the same laptop: median 694 ms, so the network to Render takes most of the time; server + database share about 240 ms. Bug to be raised for the module owner (draft ready). |
| TC-ANL-01 — Placement statistics and CSV | Not run (admin) | Role checks pass: student and recruiter 403 on `/analytics/placements` and `/export`. |
| TC-ANL-02 — Student progress | Pass (API) | New result appears at the end of the trend, `testsTaken` +1, average = mean of trend, weakest two topics, application counts match `/applications/mine`; a student with no results gets `averageScore: null`; recruiter 403. |
| TC-DOM-03 — Per graduation year | Not run (admin) | |
| TC-SAFE-01 — Browser refresh / close / offline | Not run | Browser check, run with #97 on each browser. |
| TC-SAFE-02 — Deactivation keeps data | Not run (admin) | Run with `--admin --safe2` on one seeded student. |
| UI-TST-01 to UI-ANL-02 | Not run | Manual UI steps. |

**Issue #96 summary (05-11-2026):** 3 Pass (API), 1 Partial, 1 Fail, 12 Not run (6 need the admin account, 6 are browser/UI steps).

### 4.6 Postman collection on the deployed build

[OIPPP.postman_collection.json](OIPPP.postman_collection.json) run with newman against `https://oippp-api.onrender.com/api` on 02-11-2026, 13:42–13:46 UTC, build `f044d21`:

```
npm run test:api -- --env-var baseUrl=https://oippp-api.onrender.com/api --env-var adminEmail=admin@oippp.dev --env-var adminPassword=<admin password>
```

**Result: 112 requests, 157 assertions, 0 failures** in 4 min 14 s. Average response time 561 ms (min 164 ms, max 2 s), measured from a team laptop.

| Folder | Requests | Assertions | Failed |
|:--|--:|--:|--:|
| 00 Setup | 8 | 10 | 0 |
| TC-AUTH-01 | 2 | 4 | 0 |
| TC-AUTH-02 | 4 | 10 | 0 |
| 01 Second rate-limit window | 5 | 5 | 0 |
| TC-PROF-01 | 5 | 7 | 0 |
| TC-LST-01 | 3 | 4 | 0 |
| TC-SRCH-01 | 7 | 13 | 0 |
| TC-APP-01 | 3 | 7 | 0 |
| TC-AUTH-04 | 4 | 5 | 0 |
| TC-APP-02 | 5 | 9 | 0 |
| TC-REV-01 | 6 | 9 | 0 |
| TC-TST-01 | 29 | 33 | 0 |
| TC-TST-02 | 3 | 6 | 0 |
| TC-ANL-01 | 3 | 8 | 0 |
| DOM-2 one-offer policy | 3 | 4 | 0 |
| TC-AUTH-03 | 9 | 11 | 0 |
| TC-LST-01 step 3 | 1 | 2 | 0 |
| TC-SEC-02 | 12 | 12 | 0 |

Points this run proves on the deployed build that the local run could not:

- **TC-LST-01 step 3:** a listing with a 30-second deadline was closed by the server's background job on Render, and editing it then returned 409 `LISTING_CLOSED`.
- **TC-SEC-02 / SEC-5:** behind Render's proxy (`TRUST_PROXY=1`), the 11th login in a minute returned 429 `RATE_LIMITED`.
- **TC-TST-01 / TC-TST-02:** aptitude attempts use Atlas transactions, which need the replica set.

The run adds its own test users and listings and turns the one-offer policy back off at the end. It doesn't change the `seed:demo` data.

## 5. Requirement coverage

Every SRS requirement ID and whether it has a passed test on the test build. Filled in from section 4 on 06-11-2026.

## 6. Non-functional results

| Area | Requirement | Result | Source |
|:--|:--|:--|:--|
| Performance | PERF-1, PERF-2, PERF-3 | Issue #88 rerun: TC-PERF-01 and PERF-3 blocked pending dedicated environment and 2,000-student dataset. Historical 30-10-2026 results only: search p95 37 ms, other APIs p95 62 ms at 50 VUs; dashboard render 0.19–0.29 s for 2,000 students | #89, #88 |
| Security | SEC-1 to SEC-6, ZAP baseline, npm audit | ZAP baseline on the client URL: 0 High, 2 Medium (CSP, SRI), 5 Low. `npm audit --omit=dev --audit-level=high`: 0 on server and client. SEC-1, SEC-3 to SEC-6 pass in the automated suite; SEC-5 also on the deployed build (section 4.6); SEC-4 injection checks (`$ne`, `$gt`, `$where`) also pass on the deployed build (section 4.3). SEC-2 TLS check pending | #85 ([ZAP report](zap-baseline-report.md)), #84 |
| Safety | SAFE-1, SAFE-2 | SAFE-1 server side passes on the deployed build (refresh, reopen and lost-response retry keep every acknowledged answer and the original `endsAt`; section 4.5). Browser check (TC-SAFE-01) and SAFE-2 deactivation (TC-SAFE-02, admin) not run yet | #96 |
| Usability | QA-1 | | #97 |
| Availability | QA-2 | Not measurable within the semester (Test Plan section 4) | |
| Reliability | QA-3 | 540 of 540 automated tests pass (487 server, 53 client); TC-REV-04 concurrent change passes on the deployed build | Unit Test Report, TC-REV-04 |
| Maintainability | QA-4 | Server coverage 95.16% statements, 89.06% branches | Unit Test Report; Code Coverage Report (#90) |
| Portability | QA-5 | | #97 |

## 7. User acceptance testing

Pending #97.

## 8. Defects

| Issue | Title | Severity | Module | Found by | Status |
|:--|:--|:--|:--|:--|:--|
| #99 | API fails to start in production: Cannot find module 'mongodb' | Critical (blocks deployment) | Identity (resume storage) | Deployment, 02-11-2026 | Fixed in PR #100, merged and deployed 04-11-2026 |

Observations (not defects against the SRS):

- **O-1, email configuration.** When `SMTP_HOST` is not set, the mailer uses a JSON transport that sends nothing but reports success, so notifications show email status `SENT`. This is intended for development, but in production it hides a missing setting, as in the first applications run (section 4.2). A warning at startup when `NODE_ENV` is `production` and `SMTP_HOST` is empty would make this visible.
- **O-2, public listing count.** The deployed public listings API reported 4,421 records initially and 4,427 after Issue #88 test listings were created. Seed documentation describes 4,500 open listings. The difference has not been reconciled; investigate the seed, listing status and public-query criteria before treating it as a defect.

## 9. Metrics (Test Plan section 14)

| Metric | Value |
|:--|:--|
| Test cases executed | 9 applications API cases, 4 listings cases and 1 identity case fully passed; 2 additional listings cases partial, 04-11-2026 |
| Test cases passed / failed | 14 / 0 (full passes; partial cases excluded) |
| Issue #88 partial cases | 2 |
| Issue #88 blocked cases | 2 |
| Issue #88 not-run cases | 3 |
| Defects by severity | Critical 1 (fixed), High 0, Medium 0, Low 0; no confirmed new Issue #88 defect |
| Defects by module | Identity 1 |
| Defect age (days open) | #99: 2 days (02-11 to 04-11) |
| Requirement coverage (share of IDs with a passed test) | |
| Server statement coverage | 95.16% |

## 10. Conclusion and sign-off

Issue #88 has partial validation evidence: four listings scenarios passed, two were partially tested, and two performance scenarios remain blocked. Three listings UI scenarios were not run. No confirmed new defect was identified during the executed checks. This report is not a final release sign-off. Complete the blocked and unrun checks, investigate the public listing-count difference, and verify the deployed commit SHA before closing Issue #88.

Issue #84 has partial validation evidence: PROF-1 passed on the deployed UI, the login, RBAC and injection checks passed on the deployed build, and 109 local integration tests passed. The XSS rendering check and the other 13 identity test cases still need a deployed run before closing Issue #84.

| Role | Name | Date |
|:--|:--|:--|
| QA lead | Guru R Bharadwaj | |
| Dev lead | E S Sukruth | |
| Members | Deekshith Gowda G, Sharath H G | |
