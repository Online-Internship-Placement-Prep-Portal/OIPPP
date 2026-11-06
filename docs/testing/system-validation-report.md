# System Validation Report - Online Internship & Placement Preparation Portal

| | |
|:--|:--|
| Project | Online Internship & Placement Preparation Portal (OIPPP) |
| Release | 1.0 (tag `v1.0.0`) plus the fixes listed in section 8 |
| Test window | 2–6 Nov 2026 |
| Prepared by | Guru R Bharadwaj (QA lead), with results from all four members |
| Date | 07-11-2026 (final) |

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
| Build commit | `f044d21` (v1.0.0 plus the fix for #99) for the 2 Nov runs in section 4; `main` from 4 Nov, after PR #100 was merged. Final: `dev`/`main` @ `7ab69d2` plus this report; remaining identity, listings UI and applications UI cases run 06-11-2026 |
| Data | `seed:demo`: 1 admin, 10 recruiters, 200 students, 5,000 listings, 100 questions, 5 tests, 600 applications |
| Details | [deployment.md section 6](../other-docs/deployment.md#6-part-3-test-build-26-nov-2026) |

## 3. Entry and exit criteria (Test Plan section 5)

| Criterion | Status | Evidence |
|:--|:--|:--|
| Entry: stable build deployed to the test environment | Met, 02-11-2026 | Post-deploy checks in deployment.md section 6 |
| Entry: seed data loaded | Met, 02-11-2026 | `seed` and `seed:demo` output |
| Entry: test cases reviewed | Met, 05-11-2026 | Identity (#83, PR #105), listings (#87, PR #109), applications (#91, PR #101) and aptitude and analytics (#95, PR #114) merged |
| Exit: all planned test cases executed | Met with exceptions | All 51 cases executed (section 4.1): 39 pass, 4 partial, 2 fail, 6 blocked, 0 not run. Blocked cases need the admin account or database access on Render (5 identity) or a 2,000-student dataset (PERF-3); all pass in the automated suite |
| Exit: no open Critical or High defects | Met, 07-11-2026 | Section 8: #99 fixed; #118 Low, #123 Medium and #124 Medium are recorded as deviations; ZAP found 0 High |
| Exit: server statement coverage at least 70% (QA-4) | Met | 96.16% statements, 94.37% branches on the final commit ([Branch Coverage Report](branch-coverage-report.md) section 7) |
| Exit: every requirement in the RTM has at least one passed test | Met for automated tests; partly met on the deployed build | Every requirement has a passing automated test (Unit Test Report). Section 5 lists the requirements without a deployed-build pass |

## 4. Test case results

### 4.1 Summary

| Module | Owner | Test cases | Pass | Partial | Fail | Blocked | Not run |
|:--|:--|--:|--:|--:|--:|--:|--:|
| Identity and security | Deekshith Gowda G (#84) | 14 | 7 | 1 | 1 | 5 | 0 |
| Listings and search | Sharath H G (#88) | 11 | 8 | 2 | 0 | 1 | 0 |
| Applications, review and notifications | Guru R Bharadwaj | 9 | 9 (API; UI also for TC-APP-01, TC-APP-03, TC-REV-01) | 0 | 0 | 0 | 0 |
| Aptitude and analytics | E S Sukruth (#96) | 17 | 15 (3 Render, 12 local) | 1 | 1 | 0 | 0 |
| **Total** | | **51** | **39** | **4** | **2** | **6** | **0** |

Counting rule: a case counts as Pass only if every step run passed; TC-AUTH-04 is Partial because its admin path was not run, and TC-PERF-01 is Partial because PERF-1 passes and PERF-2 fails (#123). Applications UI: TC-APP-02 and TC-REV-02 UI steps were not run and TC-REV-05 UI is partial (badge and list checked, Mark read not pressed); their API steps pass. Identity also ran 12 login, RBAC and injection checks on the deployed build (section 4.3); they are not counted because they are not separate test cases in identity.md.

### 4.2 Applications, review and notifications

API steps of the nine [applications test cases](test-cases/applications.md), run with a script against `https://oippp-api.onrender.com/api` on 02-11-2026, build `f044d21`. Users R1, R2, S1 and S2 are `recruiter01`, `recruiter02`, `student0001` and `student0002`. R1 created listings L1 to L3 for the run. Each check compares the status code, error code, message and stored data with the expected result, and email checks read the Mailtrap inbox through its API.

**Result (second run, 13:57–14:02 UTC): all nine test cases pass their API steps.** The script ran 50 checks (3 setup, 47 test) and 49 passed in the run. The 50th, the TC-REV-03 rejection email, arrived after the script's 2-minute wait, through the app's retry (see below). UI steps, run on 06-11-2026 with Playwright/Edge: TC-APP-01, TC-APP-03 and TC-REV-01 pass; TC-REV-05 partial (badge and list checked, Mark read not pressed); TC-APP-02 and TC-REV-02 UI not run.

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

Issue #84 checks (below) ran on 04-11-2026; the remaining identity.md cases ran on 06-11-2026 with API scripts and Playwright/Edge (`evidence/identity-render-run*.mjs`, `ui-register-run.mjs`).

| Test case | Result | Notes |
|:--|:--|:--|
| TC-AUTH-01 Duplicate email | Pass | 409 `DUPLICATE` |
| TC-AUTH-02 Password validation | Pass | Short, no-digit and no-letter passwords give 400 |
| TC-AUTH-03 Account lockout | Pass | 6th attempt 423 `ACCOUNT_LOCKED` with `retryAt`; login works after the lock ends |
| TC-AUTH-04 Resume download authorization | Partial | Owner 200 PDF, other student 403, other recruiter 403, no token 401; admin path not run |
| TC-AUTH-05 JWT expiry | Pass | Local unit test (60 min) |
| TC-AUTH-06 Student registration | Pass | API 201 and UI |
| TC-PROF-01 Resume upload validation | Pass | 20 KB PDF 200; 2.1 MB 413; `.docx` rejected |
| PROF-1 Profile editing | Pass | Deployed UI |
| TC-SEC-01 bcrypt hashing | Blocked | Needs database access; passes in the automated suite |
| TC-SEC-02 Login rate limit | **Fail** | 11 bad logins in a minute all 401, no 429; `ratelimit-remaining` jumps between buckets (bug #124, DEVIATIONS row 30). Passed on 02-11 (section 4.6) and in the automated suite |
| PROF-3 Recruiter approval | Blocked | Admin credentials not available to testers |
| PROF-4 Deactivation revokes tokens | Blocked | Admin credentials; irreversible on shared data |
| DOM-2 One-offer policy | Blocked | Policy is off on Render; enabling it needs admin. Apply after OFFER returned 201 as expected with the policy off |
| SEC-6 Audit log integrity | Blocked | Admin credentials |

**Identity summary:** 7 Pass, 1 Partial, 1 Fail, 5 Blocked. The blocked cases all pass in the automated suite (`admin.test.js`, `audit.test.js`, `auth-service` unit tests).

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
| XSS login payload | API validation passed, HTTP 400; website rendering check not run |

**Local automated tests**

Eight integration test suites were run locally: identity-flow, identity-edge-cases, RBAC, auth, profile, resume, admin and audit. Result: 109 tests passed, 0 failed. These are local automated results, not deployed system-test passes.

Details: [test-cases/identity.md](test-cases/identity.md).

### 4.4 Listings and search

Issue #88 execution against the deployed test build on 04-11-2026. API checks used `https://oippp-api.onrender.com/api`. The exact deployed application commit SHA was not independently verified from Render Events.

| Test case | Result | Evidence and outstanding work |
|:--|:--|:--|
| TC-LST-01 — Listing creation, validation and expiry | Pass | Valid creation returned 201 and OPEN. Past deadline and negative stipend returned 400. A short-deadline listing eventually became CLOSED; editing it returned 409 `LISTING_CLOSED`. |
| LST-3 — Listing ownership | Pass | Other recruiter received 403 for edit and close. Owner successfully edited and closed the listing; GET confirmed CLOSED. |
| SRCH-4 — Saved internships and bookmark limit | Partial | Save returned 201; duplicate save returned the same bookmark ID; GET showed one occurrence; removal returned 204. Closed and expired listings returned 400 `LISTING_NOT_BOOKMARKABLE`. The 100/101 boundary and duplicate-at-limit case were not tested to avoid polluting shared seeded data. |
| SRCH-5 — Recommendations | Pass | 1,455 recommendations returned. All were OPEN and not expired; match counts were consistent and ranking descending. Unauthenticated access returned 401; recruiter access returned 403. Empty profile (06-11-2026): `{"listings":[]}` and "No matches yet" in the UI. |
| TC-PERF-01 — Search/API load performance | Partial | 50 users x 5 min on Render, 1,265 requests, 0% errors. PERF-1 search p95 1,370 ms: Pass. PERF-2 other calls p95 3,584 ms: Fail (bug #123, DEVIATIONS row 29). Cold start 32.5 s. [performance-rerun.md](performance-rerun.md) |
| PERF-3 — Dashboard rendering | Blocked | Not rerun on Render: deployed seed has 200 students, not the 2,000 PERF-3 needs. Local 30-10-2026 run with 2,000 students: 0.19–0.29 s (Pass) |
| TC-SRCH-01 — Search, filters, sort and pagination | Pass | Search, mode, stipend and skill queries returned expected results. Stipend-descending order was monotonic across 50 records; pages 1 and 2 had no duplicate IDs. Invalid mode, sort and stipend range returned 400. Newman run: 10 requests, 15 assertions, 0 failures. |
| UI-LST-01 — Listing search page | Pass | Manual check showed 803 React search results. User confirmed filters, sorting and pagination worked. |
| UI-LST-02 — Recruiter listing form | Pass | 06-11-2026, Playwright/Edge: empty submit shows field errors, negative stipend and past deadline rejected, owner edit saved, other recruiter cannot edit. Screenshots in `evidence/ui-render/` |
| UI-SRCH-04 — Saved internships UI | Pass | 06-11-2026: save, "3 of 100 saved" count, single entry, removal |
| UI-SRCH-05 — Student home feed UI | Pass | 06-11-2026: recommendation cards with skill chips, deadlines panel, search navigation, empty state |

**Listings summary:** 8 Pass, 2 Partial (SRCH-4, TC-PERF-01), 1 Blocked (PERF-3), 0 Not run. PERF-2 inside TC-PERF-01 fails (#123).

**Observation — public listing count:** the public API initially reported 4,421 listings and later 4,427 after test listings were created. Seed documentation describes 4,500 open listings. The difference is unexplained and is recorded as an observation, not a confirmed defect.

The short-deadline listing was OPEN on an early poll and CLOSED on a later GET. Editing after the deadline returned 409 `LISTING_CLOSED`. The exact background-job closure time was not measured.

### 4.5 Aptitude and analytics

Issue #96, run on 05-11-2026 with [`server/scripts/system-test-aptitude.js`](../../server/scripts/system-test-aptitude.js) (API, same calls as Postman) and by hand in a browser. Test cases: [test-cases/aptitude-analytics.md](test-cases/aptitude-analytics.md). Evidence JSON: [`evidence/`](evidence/).

Two environments are used, and every result says which:

- **Render**: the Part-3 test build, `main` @ `1e07391` (the exact SHA was not re-checked on Render Events). Student and recruiter accounts only: the admin password is not in the repository, and deactivation cannot be undone on the shared data.
- **Local**: the same code (`dev` @ `8cb16a0`) on a team laptop: in-memory MongoDB replica set, `npm run seed` + `seed:demo` (the same data set as Render), Vite dev server, and the Chromium-based browser built into the Claude desktop app. Used for the admin cases, SAFE-2 and the UI steps. A local pass is not a Render pass.

| Test case | Render | Local | Notes |
|:--|:--|:--|:--|
| TC-TST-01 Resume after refresh / closed tab | Pass (API) | Pass (UI) | Same attempt and `endsAt` after restart; 3 concurrent starts → one attempt |
| TC-TST-02 Auto-submit and score by topic | **Partial** | Pass | Local: sweep submitted 1.0 s after `endsAt`; 2 s before → 204, 5 s and 40 s after → 409 `ATTEMPT_CLOSED`; 4/6 by topic as expected. Render: hard cutoff and `TIMEOUT` scoring hold, but the sleeping free instance closed the attempt only on the next request, 8.5 h later (DEVIATIONS row 11) |
| TC-TST-03 Question bank | Role checks pass | Pass | Boundaries, stale version, archive |
| TC-TST-04 Draft, publish, archive | Role checks pass | Pass | `TEST_LOCKED`, `STALE_VERSION`, `INVALID_QUESTIONS` |
| TC-TST-05 Single attempt | Pass (API) | Pass (UI) | `ATTEMPT_EXISTS`, owner isolation, idempotent submit |
| TC-TST-06 Save within 1 s | **Fail** (#118) | Pass (max 29 ms) | Render: median 931 ms, p95 1,023 ms; `/health` alone median 694 ms. Recorded as DEVIATIONS row 28 (PR #119) |
| TC-ANL-01 Placement statistics and CSV | Role checks pass | Pass | CSV counts equal the filtered dashboard |
| TC-ANL-02 Student progress | Pass (API) | Pass (UI) | Empty state `averageScore: null` checked on Render |
| TC-DOM-03 Per graduation year | Not run | Pass | 2027: 104, 2028: 96; 2099 empty; 1999 → 400 |
| TC-SAFE-01 Refresh / close / offline in a browser | Not run | Pass (Chromium) | Offline simulated in the page; "Not saved" after 3 retries, saved again after reconnect; 360 px OK |
| TC-SAFE-02 Deactivation keeps data | Not run | Pass | Old token 401, login 403, totals unchanged (202 results, 600 applications) |
| UI-TST-01 Tests list | Not run | Pass | |
| UI-TST-02 Attempt screen and timer | Not run | Pass | Sticky timer, warning under 5 min, auto-move to result at 0:00 |
| UI-TST-03 Result page | Not run | Pass | Matches the API |
| UI-TST-04 Question bank and test builder | Not run | Pass | Field messages, confirmations, Draft → Published → Archived |
| UI-ANL-01 Progress dashboard | Not run | Pass | Data in 234 ms |
| UI-ANL-02 Statistics dashboard | Not run | Pass | Data in 744 ms; filter, validation and CSV |

**Issue #96 summary (05-11-2026):** 17 cases. Best result per case: 15 Pass (3 on Render, 12 on the local build only), 1 Partial (TC-TST-02 on Render), 1 Fail (TC-TST-06 on Render, bug #118). Firefox, Edge and a real Android phone are covered by #97.

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

Every SRS requirement has a passing automated test (Unit Test Report; RTM in the [Test Case Document](test-case-document.md)). Deployed-build status from section 4:

| Area | Requirements | Passed on the deployed build | Not passed on the deployed build |
|:--|:--|:--|:--|
| Identity | AUTH, PROF, RBAC | TC-AUTH-01 to 03, 05, 06, TC-PROF-01, PROF-1, RBAC and injection checks (section 4.3) | TC-SEC-02 fails (#124); TC-AUTH-04 admin path; PROF-3, PROF-4, DOM-2, SEC-6, TC-SEC-01 blocked (automated only) |
| Listings and search | LST, SRCH | TC-LST-01, LST-3, TC-SRCH-01, SRCH-5, PERF-1, all four UI cases | SRCH-4 partial (limit boundary); PERF-2 fails (#123); PERF-3 blocked |
| Applications and review | APP, REV, NOTIF | All nine cases, API steps (section 4.2); UI for TC-APP-01, TC-APP-03, TC-REV-01 | UI steps of TC-APP-02, TC-REV-02 not run; TC-REV-05 UI partial |
| Aptitude and analytics | TST, ANL, DOM-3 | TC-TST-01, TC-TST-05, TC-ANL-02 | TST-4 (TC-TST-06, #118); TC-TST-02 partial; admin and UI cases passed locally only |
| Safety | SAFE-1, SAFE-2 | SAFE-1 server side | SAFE-2 local only |
| Security | SEC-1 to SEC-6 | SEC-2, SEC-4; SEC-5 on 02-11 only | SEC-5 fails on the 06-11 rerun (#124); SEC-1, SEC-3, SEC-6 automated only |
| Quality | QA-1, QA-5 | - | QA-1 (1 of 5 participants), QA-5 (device rows not run) |

## 6. Non-functional results

| Area | Requirement | Result | Source |
|:--|:--|:--|:--|
| Performance | PERF-1, PERF-2, PERF-3 | Render 06-11-2026: search p95 1,370 ms (Pass), other APIs p95 3,584 ms (Fail, #123), PERF-3 not rerun. Local 30-10-2026 baseline: search p95 37 ms, other APIs p95 62 ms at 50 VUs; dashboard render 0.19–0.29 s for 2,000 students | #89 ([performance-rerun.md](performance-rerun.md)), #88 |
| Security | SEC-1 to SEC-6, ZAP baseline, npm audit | ZAP baseline on the client URL: 0 High, 2 Medium (CSP, SRI), 5 Low. `npm audit --omit=dev --audit-level=high`: 0 on server and client. SEC-1, SEC-3 to SEC-6 pass in the automated suite; SEC-5 passed on the deployed build on 02-11 (section 4.6) but failed the 06-11 rerun (#124: no 429 behind the Render proxy; account lockout still works); SEC-4 injection checks (`$ne`, `$gt`, `$where`) also pass on the deployed build (section 4.3). SEC-2 passes: on 06-11-2026 both `https://oippp-client.onrender.com` and `https://oippp-api.onrender.com` answered over TLS with a valid certificate (curl, no `-k`), plain HTTP returns 301 to HTTPS, and both send `Strict-Transport-Security` (client `max-age=315360000; includeSubdomains; preload`, API `max-age=15552000; includeSubDomains`) | #85 ([ZAP report](zap-baseline-report.md)), #84 |
| Safety | SAFE-1, SAFE-2 | SAFE-1: server side passes on Render (refresh, reopen and lost-response retry keep every acknowledged answer and the original `endsAt`); the browser check passes on the local build in Chromium (TC-SAFE-01). SAFE-2: passes on the local build (TC-SAFE-02), not run on Render because deactivation cannot be undone | #96, section 4.5 |
| Usability | QA-1 | Not met yet: 1 of 1 verified participant applied within 3 minutes (P1, 2:33, Q1 = 4/5); the plan needs 5 students | #97 ([uat-and-devices.md](uat-and-devices.md)) |
| Availability | QA-2 | Not measurable within the semester (Test Plan section 4) | |
| Reliability | QA-3 | 540 of 540 automated tests pass (487 server, 53 client); TC-REV-04 concurrent change passes on the deployed build | Unit Test Report, TC-REV-04 |
| Maintainability | QA-4 | Pass: server coverage 96.16% statements, 94.37% branches on the final commit (509 tests); client 39.85% branches (64 tests) | Branch Coverage Report section 7 |
| Portability | QA-5 | Not run as a device matrix: the eight rows in uat-and-devices.md section 6 are empty. Evidence so far: P1 completed S2 on a real Android phone in Chrome; the student flow passed in Chromium at 360 px on the local build (#96) | #97 |

## 7. User acceptance testing

Plan and script: [uat-and-devices.md](uat-and-devices.md) (#97). The session moved from 19–21 Nov into the test week (DEVIATIONS row 27).

| Participant | Device | Task S2 (find and apply, target 3:00) | Q1 |
|:--|:--|:--|:--|
| P1 | Samsung phone, Chrome for Android, remote | 2:33, completed without help | 4 / 5 |

Only P1 is verified; P2–P5 and the recruiter R1 have not been recorded, and no usability defects were raised. QA-1 needs five students, so it is not met yet.

## 8. Defects

| Issue | Title | Severity | Module | Found by | Status |
|:--|:--|:--|:--|:--|:--|
| #99 | API fails to start in production: Cannot find module 'mongodb' | Critical (blocks deployment) | Identity (resume storage) | Deployment, 02-11-2026 | Fixed in PR #100, merged and deployed 04-11-2026 |
| #118 | TC-TST-06: answer saves exceed 1 s at the client on the Render build (TST-4) | Low (no data loss) | Aptitude | #96, 05-11-2026 | Recorded as DEVIATIONS row 28 (PR #119): mostly network latency to the free Render instance; local max 29 ms |
| #123 | PERF-2: non-search API p95 3.6 s on the Render build | Medium (performance) | Listings / API | #89, 06-11-2026 | Recorded as DEVIATIONS row 29: free Render tier and cross-region database; local p95 62 ms |
| #124 | TC-SEC-02: login rate limit not enforced on the Render build | Medium (security) | Identity | Rerun, 06-11-2026 | Recorded as DEVIATIONS row 30: rate-limit key changes behind the Render proxy; account lockout (TC-AUTH-03) still stops password guessing per account |

Observations (not defects against the SRS):

- **O-1, email configuration.** When `SMTP_HOST` is not set, the mailer uses a JSON transport that sends nothing but reports success, so notifications show email status `SENT`. This is intended for development, but in production it hides a missing setting, as in the first applications run (section 4.2). A warning at startup when `NODE_ENV` is `production` and `SMTP_HOST` is empty would make this visible.
- **O-2, public listing count.** The deployed public listings API reported 4,421 records initially and 4,427 after Issue #88 test listings were created. Seed documentation describes 4,500 open listings. The difference has not been reconciled; investigate the seed, listing status and public-query criteria before treating it as a defect.

## 9. Metrics (Test Plan section 14)

| Metric | Value |
|:--|:--|
| Test cases executed | 51 of 51 (39 pass, 4 partial, 2 fail, 6 blocked); 0 not run |
| Test cases passed / failed | 39 / 2 (full passes; partial cases excluded) |
| Blocked cases | 6 (5 identity: admin or database access; PERF-3: dataset) |
| Defects by severity | Critical 1 (fixed), High 0, Medium 2 (#123, #124, deviations), Low 1 (#118, deviation) |
| Defects by module | Identity 2, Aptitude 1, Listings / API 1 |
| Defect age (days open) | #99: 2 days (02-11 to 04-11); #118: 1 day (05-11 to 06-11); #123, #124: opened 06-11, open as deviations |
| Requirement coverage (share of IDs with a passed test) | 100% with an automated test; see section 5 for deployed-build passes |
| Server statement coverage | 96.16% |

## 10. Conclusion and sign-off

Release 1.0 runs on the deployed build with no open Critical or High defect. All 51 test cases were executed: 39 pass, 4 partial, 2 fail and 6 blocked, all nine applications cases pass their API steps, the full Postman collection passes (157 assertions, 0 failures), SEC-2 passes, and server coverage is 96.16% statements and 94.37% branches with all 509 server and 64 client tests passing.

Every planned test case was executed. Six are blocked on Render because testers had no admin or database access (they pass in the automated suite) or no 2,000-student dataset (PERF-3, passes locally). Two fail on the free Render environment and are recorded as deviations: TC-TST-06 (#118, row 28) and TC-SEC-02 (#124, row 30); PERF-2 inside TC-PERF-01 also fails there (#123, row 29). UAT has one participant of five and the device matrix is not filled (#97). These gaps are recorded, not closed.

| Role | Name | Date |
|:--|:--|:--|
| QA lead | Guru R Bharadwaj | 07-11-2026 |
| Dev lead | E S Sukruth | |
| Members | Deekshith Gowda G, Sharath H G | |
