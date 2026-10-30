# Test summary report (STP section 8)

Release 1.0 of OIPPP, measured against the [Software Test Plan](../Part-1_Deliverables/Test%20Plan.pdf) v1.0. Every result below comes from a run on the `dev` working tree on 30 Oct 2026. Where something can only be checked on the deployed URL or with real users, it is marked **Pending** with the steps to run it. Nothing here is marked as passed without a run behind it.

## 1. Summary

| Item | Result |
|:--|:--|
| Server unit and integration tests (Jest + Supertest) | 40 suites, 486 tests, all passing |
| Server statement coverage (QA-4 target ≥ 70%) | 95.16% statements (1,241/1,304), 89.06% branches, 94.9% functions, 95.99% lines, over every file in `server/src` |
| Client tests (Vitest) | 6 files, 53 tests, all passing |
| API collection (Postman / newman, 18 folders) | 112 requests, 157 assertions, 0 failures (3 min 15 s; includes three 61 s waits for the SEC-5 window) |
| Load run (PERF-1/2/3) | All three PERF targets met; p95 37 ms (search), 62 ms (other calls), 62 ms (dashboard), 0% errors |
| Dependency audit (`npm audit --omit=dev --audit-level=high`) | Server: 0 vulnerabilities. Client: 0 vulnerabilities |
| Open Critical or High defects | None known |
| Pending | SEC-2 TLS and the live ZAP scan need the deployed URL. QA-1 (UAT) and the QA-5 real-phone check need people. QA-2 can't be measured within the semester (STP section 4) |

## 2. How to reproduce

From `server/`:

| What | Command |
|:--|:--|
| Unit + integration tests with coverage | `npm run test:coverage` |
| API collection | Start the API with an admin seeded (`npm run seed`), then `npm run test:api`. Add `-- --env-var baseUrl=<url>/api --env-var adminEmail=<email> --env-var adminPassword=<password>` for another server. The run takes about 3½ minutes because it waits out the 10-per-minute login limit three times |
| Test Plan data set (section 6) | `npm run seed:demo -- --reset` (1 admin, 10 recruiters, 200 students with SRNs, 5,000 listings, 100 questions, 5 tests). Add `--students=2000` for the PERF-3 batch size |
| Load run | Start the API with `TRUST_PROXY=1` on seeded data, then `npm run test:load -- --url=http://localhost:5000/api --users=50 --seconds=300`. The JMeter equivalent is [search_load.jmx](search_load.jmx) |

Both the newman run and the load run below used a single-node MongoDB 7 replica set (mongodb-memory-server) and the API started with `node src/index.js` on Windows 11, on one developer laptop.

## 3. Test cases (STP section 13)

"Automated" names the Jest tests that prove each step. "API run" is the matching folder in [OIPPP.postman_collection.json](OIPPP.postman_collection.json).

| TC | Requirements | Automated (server/tests) | API run | Status |
|:--|:--|:--|:--|:--|
| TC-AUTH-01 | AUTH-1, AUTH-2 | `integration/auth.test.js`: "rejects registering the same email twice" and the "Student SRN (AUTH-1)" block | TC-AUTH-01: 201 STUDENT/ACTIVE, then 409 with the SRS message | **Pass** |
| TC-AUTH-02 | AUTH-3 | `integration/auth.test.js` password-rule block; `unit/auth-validation.test.js` | TC-AUTH-02: `abc`, `abcdefgh` and `12345678` each return 400 naming the rule | **Pass** |
| TC-AUTH-03 | AUTH-4, AUTH-5 | `integration/auth.test.js` "Login lockout (AUTH-5)"; `unit/auth-service.test.js` | TC-AUTH-03: token `exp − iat` = 3600 s; after 5 wrong passwords the correct one returns 423 `ACCOUNT_LOCKED` with `retryAt` | **Pass** |
| TC-AUTH-04 | AUTH-6, SEC-3 | `integration/rbac.test.js` ("Role restrictions"), `integration/resume.test.js` ("another recruiter cannot download…"), `integration/status.test.js` (BR-2) | TC-AUTH-04: all three requests return 403; the owning recruiter gets the PDF | **Pass** |
| TC-PROF-01 | PROF-2 | `integration/resume.test.js`: PDF accepted, non-PDF and fake-signature rejected, over 2 MB rejected with 413 | TC-PROF-01: PDF 200, DOCX 400 `INVALID_FILE_TYPE` | **Pass**. Note: a 2.1 MB PDF returns **413** `FILE_TOO_LARGE`, not the 400 the STP expects; 413 is the documented API code ([api-contract](../other-docs/api-contract.md)) |
| TC-LST-01 | LST-1, LST-2, LST-4 | `integration/listings.test.js`: "rejects a past deadline", "automatically closes expired listings" | TC-LST-01 + "TC-LST-01 step 3": 201 OPEN, past deadline 400, negative stipend 400; a listing with a 30 s deadline is CLOSED by the background job within the run (editing it returns 409 `LISTING_CLOSED`) | **Pass** |
| TC-SRCH-01 | SRCH-1, SRCH-2, SRCH-3 | `integration/listing-search.test.js` (keyword across title/company/skills, mode, stipend, sort, pages); `integration/listing-search-performance.test.js` (5,000 listings) | TC-SRCH-01: keyword + `mode=REMOTE` + `minStipend` + deadline sort returns exactly the 2 matching listings, `limit` 20 and `total` | **Pass** |
| TC-APP-01 | APP-1, APP-4 | `integration/apply.test.js` "TC-APP-01" | TC-APP-01: 201 APPLIED, 409 `ALREADY_APPLIED`, one application with one history entry | **Pass** |
| TC-APP-02 | APP-2, APP-3 | `integration/apply.test.js` "TC-APP-02" | TC-APP-02: closed listing 409 `LISTING_CLOSED` with the SRS message; CGPA 7.4 against 8.0 gives 422 naming 8.0 | **Pass** |
| TC-REV-01 | REV-2, REV-3, REV-4 | `integration/status.test.js`, `integration/review.test.js`, `integration/notifications.test.js` (one email; 3 retries at 1, 5, 15 min) | TC-REV-01: 200, 422 `INVALID_TRANSITION`, 400 without a reason, and the in-app notification | **Pass**. The Mailtrap check still needs an inbox. Locally the email reached a Mailpit SMTP sandbox; with `SMTP_HOST` empty, it is logged, and Jest asserts that exactly one is sent |
| TC-TST-01 | TST-3, TST-4, SAFE-1 | `integration/aptitude-recovery.test.js` "refresh and closed tab (SAFE-1)"; `integration/aptitude-indexes.test.js` | TC-TST-01: 20-question, 30-minute test; after 5 answers, starting again returns 200 with the same attempt, the same `endsAt` and 5 answers | **Pass** |
| TC-TST-02 | TST-5, TST-6 | `integration/aptitude-recovery.test.js` "deadline passes while offline (TST-5)"; `unit/attempt-timeout-job.test.js`; `unit/aptitude-scoring.test.js` | TC-TST-02: submit returns score and per-topic percentages; a later answer returns 409 `ATTEMPT_CLOSED` | **Pass**. The API run submits by hand; the timeout auto-submit is proven by the Jest tests with an injected clock (STP section 10) |
| TC-ANL-01 | ANL-2, ANL-3 | `integration/analytics.test.js` (ANL-1, ANL-2, ANL-3) | TC-ANL-01: CSE/2027 dashboard and CSV export carry the same student and placed counts | **Pass** |
| TC-PERF-01 | PERF-1, PERF-2 | `integration/listing-search-performance.test.js`, `integration/analytics-performance.test.js` | Load run, section 4 | **Pass** (local run). Rerun on the test VM is pending |
| TC-SEC-01 | SEC-1, SEC-4 | Step 1: `unit/auth-service.test.js` "creates an ACTIVE student with a hashed password" checks the stored value is a bcrypt hash of the password; the cost is the constant `BCRYPT_COST = 12` in `auth.service.js` (code review). Step 2: `unit/validate-middleware.test.js` (`$` keys at any depth) | TC-SEC-01 step 2: `{"$ne": null}` login returns 400 and no token | **Pass** |
| TC-SEC-02 | SEC-5, SEC-2 | `integration/auth.test.js` "Auth rate limit (SEC-5)" | TC-SEC-02: 10 logins return 401, the 11th returns 429 `RATE_LIMITED` | SEC-5 **Pass**. SEC-2 **Pending deployment** |

The API run also covers DOM-2: with the one-offer policy on, a student holding an offer gets 422 `OFFER_HELD`.

## 4. Performance (TC-PERF-01, PERF-3)

Run on 30 Oct 2026: `npm run test:load -- --users=50 --seconds=300` against `seed:demo --students=2000 --listings=5000` (2,000 students, 5,000 listings, 6,000 applications, 1,999 results). The API ran with `NODE_ENV=production` and `TRUST_PROXY=1`. Each virtual user sent its own client address and paused 250 ms between requests, so per-client rate limits applied as they would for real students. Half the requests were mixed searches; the other half were the student calls (recommendations, my applications, bookmarks, notifications, `/analytics/me`, tests, profile).

| Requirement | Requests | p50 | p95 | Max | Errors | Target (p95) | Result |
|:--|--:|--:|--:|--:|--:|:--|:--|
| PERF-1 listing search, 5,000 listings | 27,721 | 15 ms | 37 ms | 88 ms | 0.00% | < 2 s | **Pass** |
| PERF-2 other API calls | 27,699 | 7 ms | 62 ms | 256 ms | 0.00% | < 1 s | **Pass** |
| PERF-3 placement dashboard, 2,000 students | 10 | 3 ms | 62 ms | 62 ms | 0.00% | < 3 s | **Pass** |

PERF-3: the first, uncached request took 62 ms. The other nine were served from the 5-minute statistics cache (SAD 3.4), which is why p50 is 3 ms. In a browser, against a production build with 2,000 students, the dashboard finished rendering in 0.19–0.29 s.

Limits of this run: the client, API and database shared one laptop, with no network in between. The STP's own risk table says free-tier numbers will differ. Rerun [search_load.jmx](search_load.jmx) on the test VM and against Render before the final demo, and add the results here.

## 5. Requirement coverage

Every SRS requirement ID with the evidence for it. "Jest" means server/tests; "API" means the newman run.

| ID | Evidence | Status |
|:--|:--|:--|
| AUTH-1 … AUTH-6 | TC-AUTH-01 … 04 (Jest + API) | Pass |
| PROF-1 | `integration/profile.test.js`, `unit/profile-model.test.js`; API TC-PROF-01 | Pass |
| PROF-2 | TC-PROF-01 | Pass |
| PROF-3 | `integration/admin.test.js` (approve, reject with reason, notifications); API setup folder | Pass |
| PROF-4 | `integration/identity-flow.test.js` "disabling an account revokes an already-issued token", `integration/rbac.test.js` | Pass |
| LST-1, LST-2, LST-4 | TC-LST-01 | Pass |
| LST-3 | `integration/listings.test.js` "only the owner can close a listing" | Pass |
| SRCH-1 … SRCH-3 | TC-SRCH-01 | Pass |
| SRCH-4 | `integration/bookmarks.test.js`, including "a student can hold at most 100 bookmarks" | Pass |
| SRCH-5 | `integration/listing-recommendations.test.js` | Pass |
| APP-1 … APP-4 | TC-APP-01, TC-APP-02 | Pass |
| APP-5 | `integration/apply.test.js` (history, newest first) | Pass |
| REV-1 | `integration/review.test.js` "owner sees applicants with profile summary and resume link" | Pass |
| REV-2 … REV-4 | TC-REV-01 | Pass |
| TST-1, TST-2 | `integration/aptitude-api.test.js`, `unit/aptitude-models.test.js` | Pass |
| TST-3 … TST-6 | TC-TST-01, TC-TST-02 | Pass |
| ANL-1 | `integration/analytics.test.js`; API TC-ANL-01 "Student readiness view" | Pass |
| ANL-2, ANL-3 | TC-ANL-01 | Pass |
| PERF-1, PERF-2, PERF-3 | Section 4 | Pass (local run; VM rerun pending) |
| SAFE-1 | TC-TST-01 | Pass |
| SAFE-2 | `integration/identity-edge-cases.test.js` "deactivation keeps the profile and resume…" | Pass |
| SEC-1 | TC-SEC-01 step 1 (unit test + `BCRYPT_COST = 12`); the logger never logs request bodies (`utils/logger.js`) | Pass |
| SEC-2 | Render serves only HTTPS | **Pending deployment**: SSL Labs check, [deployment.md section 5](../other-docs/deployment.md#5-post-deploy-checks) |
| SEC-3 | TC-AUTH-04, `integration/resume.test.js` | Pass |
| SEC-4 | TC-SEC-01 | Pass |
| SEC-5 | TC-SEC-02 | Pass |
| SEC-6 | `integration/audit.test.js` "updates and deletes are refused"; `integration/status.test.js` (audit entries) | Pass |
| QA-1 Usability | Needs five classmates (STP UAT, 19–21 Nov 2026) | **Pending UAT** |
| QA-2 Availability | Not measurable in the semester (STP section 4); UptimeRobot during demo weeks | **Not in scope** |
| QA-3 Reliability | `integration/reliability.test.js`, `integration/aptitude-indexes.test.js` (unique indexes under concurrency) | Pass |
| QA-4 Maintainability | Statement coverage 95.16% (CI fails below 70%); one folder per module | Pass |
| QA-5 Portability | Passed in Chrome 156, Edge 156 and Firefox 157 at 1280 px and 360 px. A real phone hasn't been tested | **Pending** real-phone check |
| DOM-1 | TC-APP-02 | Pass |
| DOM-2 / BR-5 | `integration/settings.test.js`; API "DOM-2 one-offer policy" | Pass |
| DOM-3 | `integration/analytics.test.js` (gradYear filter) | Pass |

## 6. Pending items and how to close them

| Item | Needs | Steps |
|:--|:--|:--|
| SEC-2 TLS, TC-SEC-02 step 2 | Deployed URL | [deployment.md section 5](../other-docs/deployment.md#5-post-deploy-checks): plain-HTTP redirect check and SSL Labs grade |
| OWASP ZAP baseline (STP 5.1) | Deployed URL | Set the `TARGET_URL` repository variable, then run the **ZAP baseline scan** workflow. It also runs every Monday. Log High findings as GitHub issues. The [local run](#8-local-zap-baseline) found no High alerts |
| TC-REV-01 Mailtrap check | SMTP sandbox | Point `SMTP_*` at a Mailtrap inbox and rerun the TC-REV-01 folder |
| PERF on the test VM | 4 vCPU VM | Run [search_load.jmx](search_load.jmx) or `npm run test:load` there and compare it with section 4 |
| QA-1 UAT, QA-5 real phone | Five classmates and one recruiter | Timed task: find a listing and apply within 3 minutes, on Chrome, Firefox, Edge and an Android phone at 360 px. Record times here |
| QA-2 | A full placement season | Out of scope (STP section 4) |

## 7. Defects found during this cycle

| Defect | Severity | Status |
|:--|:--|:--|
| Malformed JSON, an oversized body, bad multer fields and Mongoose cast/version errors returned 500 | High | Fixed; regression tests in `unit/identity-infrastructure.test.js` and `integration/auth.test.js` |
| The application resume route sent the error JSON with a PDF content type | Medium | Fixed; `integration/resume.test.js` "returns a JSON 404 when the application resume file is missing from storage" |
| Old resumes were never deleted from GridFS | Low | Fixed; deleted when no application references them |
| AUTH-1, AUTH-3, AUTH-5, SEC-5, SRCH-1 (company/skills), SRCH-2 (mode), SRCH-4 (100 cap) and DOM-2 were missing | High (requirement gaps) | Implemented, with the tests listed above |

## 8. Local ZAP baseline

OWASP ZAP baseline against a production client build and API on one laptop, 30 Oct 2026. This doesn't replace the scan on the deployed URL, and the local server didn't apply the headers set in `render.yaml`.

| Risk | Count | Alerts |
|:--|--:|:--|
| High | 0 | None |
| Medium | 3 | Content Security Policy not set; missing anti-clickjacking header; Subresource Integrity attribute missing |
| Low | 5 | Cross-Origin Embedder, Opener and Resource policy headers; Permissions Policy header; `X-Content-Type-Options` header |
| Informational | 3 | Suspicious comments; modern web application; storable and cacheable content |

`render.yaml` sets `X-Frame-Options: DENY` on the deployed client, which covers the anti-clickjacking alert. The other Medium and Low alerts are open and carry over to the live scan.
