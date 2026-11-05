# Aptitude and Analytics Test Cases

**Project:** OIPPP  
**Version:** Part-3 Testing (Test Case Document v2.0)  
**Owner:** E S Sukruth (Member 4)  
**Environment:** Render test build ([deployment.md section 6](../../other-docs/deployment.md#6-part-3-test-build-26-nov-2026))  
**Issue:** #95 (update test cases); results from #96

## 1. Purpose and scope

These cases cover the aptitude test engine (`TST-1` to `TST-6`), progress tracking and placement analytics (`ANL-1` to `ANL-3`), the per-graduation-year reporting rule (`DOM-3`) and the safety requirements (`SAFE-1`, `SAFE-2`). They replace TC-TST-01, TC-TST-02 and TC-ANL-01 from Test Plan v1.0 section 13 and add a case for every requirement that v1.0 only covered in the automated suite.

Each case lists API steps (run with Postman, newman or `server/scripts/system-test-aptitude.js`) and, where the screen matters, UI steps on https://oippp-client.onrender.com. A status is filled in only after the case has been run on the test build, with the environment, date and commit.

**Test data.** `seed:demo` gives 5 published tests (*Placement Practice Test 1–5*, 20 questions, 30 minutes each), 100 questions, 200 students (`student0001` … `student0200@students.example.com`) and 10 recruiters, all with password `Demo12345`. Cases that need a known answer key or a short test create their own questions and tests with titles starting `ST-96`, so the seeded data is not changed. The admin password is shared privately and is not stored here.

**Error format.** Errors are `{ "error": { "code", "message" } }` ([API contract](../../other-docs/api-contract.md)).

## 2. Updated v1.0 test cases

### TC-TST-01: Resume an attempt after refresh or a closed tab with no lost answers

| Field | Value |
|:--|:--|
| Requirement(s) | TST-3, TST-4, SAFE-1 |
| Type | Functional / Reliability |
| Preconditions | Student A is logged in and has no attempt on the chosen published test (20 questions, 30 minutes). |
| Steps | **API:** 1. `POST /tests/:id/attempts` (empty body). 2. Answer 5 questions with `PATCH /attempts/:id/answers` `{questionId, optionIdx}`, including `optionIdx: 0`, and wait for each response. 3. Change one answer. 4. Simulate a refresh: `GET /attempts/:id`. 5. Simulate a closed and reopened tab: `POST /tests/:id/attempts` again. 6. Send 3 starts at once. **UI:** 1. *Aptitude tests* → *Start or resume* on the test. 2. Pick 5 answers; wait for "✓ Saved" after each. 3. Press F5. 4. Close the tab, open the site again, *Aptitude tests* → *Start or resume*. |
| Test data | Student A; Placement Practice Test *n* with no attempt for A. |
| Expected result | Step 1 returns 201 with `attemptId`, `startedAt`, `endsAt` = start + 30 min, `serverTime`, 20 questions and no `answerIdx`. Every save returns 204 only after it is stored; the screen shows "Saving…" then "✓ Saved". Step 4 returns 200 with all 5 answers (the changed one with its new value) and the same `endsAt`. Step 5 returns **200** (not 201) with the same `attemptId` and `endsAt`. All 3 concurrent starts return 200 with the same attempt. In the UI the answers are restored after F5 and after reopening, and the timer continues from the original deadline (it does not restart at 30:00). |
| Actual result | API (05:28 UTC, `student0187`, `T1 mvzb6i0f`, evidence `docs/testing/evidence/aptitude-analytics-student-run.json`): start 201 with 20 questions, `endsAt` = `startedAt` + 30 min and no `answerIdx`; 5 saves 204 (including option 0); a changed answer 204; `GET /attempts/:id` returned all 5 answers with the changed value and the same `endsAt`, 1,787 s left; restart returned **200** with the same `attemptId` and `endsAt`; 3 concurrent starts all 200 with the same attempt. A second attempt (`student0188`, 20 saves) also returned all 20 answers after a refresh. UI steps not run yet. |
| Status | Pass (API); UI not run — Render, 05-11-2026, `main` @ `1e07391` |
| Automated by | `server/tests/integration/aptitude-recovery.test.js` (refresh, reopening, serverTime); `aptitude-api.test.js` ("start and resume use one server deadline…", "each acknowledged save survives reload…", "simultaneous start creates exactly one attempt"); `aptitude-indexes.test.js` |
| Changes from v1.0 | Saves are acknowledged (204) before the screen shows them as saved; reopening must return the same attempt and the same `endsAt`; adds option 0, a changed answer and concurrent starts. Deadline comes from the server (`endsAt − serverTime`), so a wrong device clock does not change it. |

### TC-TST-02: Auto-submit at end time and score by topic

| Field | Value |
|:--|:--|
| Requirement(s) | TST-5, TST-6 |
| Type | Functional / Boundary |
| Preconditions | Admin has created 6 `ST-96` questions with known keys (Quantitative 2, Logical 2, Technical 2) and published a 10-minute test from them. Student B has no attempt on it. |
| Steps | **API:** 1. Student B starts the test. 2. Answer 4 correctly, 1 wrongly, leave 1 unanswered. 3. About 2 s before `endsAt`, save the unanswered question. 4. Make no other calls until after `endsAt` (the browser is not needed for the timeout). 5. 5 s after `endsAt`, save an answer. 6. 40 s after `endsAt`, save an answer. 7. `GET /attempts/:id` and `GET /attempts/:id/result`. **UI:** start the test, answer, and leave the page open past 0:00 to see it move to the result. |
| Test data | 6 `ST-96` questions with known `answerIdx`; 10-minute test. |
| Expected result | Step 3 returns 204. Steps 5 and 6 both return **409 `ATTEMPT_CLOSED`** (hard cutoff at `endsAt`, no 30-second grace). The attempt is `SUBMITTED` with `submissionReason: TIMEOUT`, submitted by the server's timeout sweep shortly after `endsAt`. The result is 4/6 = 66.67% with topics in the order Quantitative 2/2 (100%), Logical 2/2 (100%), Technical 0/2 (0%), and topic counts add up to the totals. In the UI the timer reaches 0:00 and the page opens the result. |
| Actual result | Run with a seeded 30-minute test instead of the 10-minute `ST-96` test (that one needs the admin account). `student0188` saved 20 answers on *Placement Practice Test 2* at 05:31 UTC and then made no calls; `endsAt` 06:00:37.935Z. Checked at 14:31 UTC: attempt `SUBMITTED` / `TIMEOUT`, score 20/20 = 100% from the saved answers (each topic 5/5, counts add up), and a later save returned 409 `ATTEMPT_CLOSED`. **But** `submittedAt` was 14:31:09, the time of the check, not shortly after `endsAt`: the free Render service had gone to sleep, so the one-second sweep was not running, and the attempt was closed by the read-time expiry check (DEVIATIONS row 11). No answer was accepted after the deadline and no time was added. The 5 s / 40 s late-answer probes and the exact topic split need the admin run. Evidence: `docs/testing/evidence/aptitude-timeout-render.json`. ||
| Status | Partial — hard cutoff and TIMEOUT scoring pass; server-side auto-submit at `endsAt` not observed because the free instance slept; Render, 05-11-2026, `main` @ `1e07391` |
| Automated by | `server/tests/unit/attempt-timeout-job.test.js`; `server/tests/integration/aptitude-api.test.js` ("server sweep catches overdue attempts without a client…", "GET recovery finalizes overdue state", 0–30 s window); `aptitude-recovery.test.js` ("reconnecting finds a timed-out attempt…"); `unit/aptitude-scoring.test.js` |
| Changes from v1.0 | Hard cutoff: **any** answer at or after `endsAt` returns 409 `ATTEMPT_CLOSED`, not only answers 40 s late (DEVIATIONS row 10). Auto-submit is done by the server's one-second timeout sweep, and the Result is created in the same transaction that closes the attempt (row 11). Test shortened to 10 minutes (the TST-2 minimum) with 6 questions so the expected per-topic numbers are exact. |

### TC-ANL-01: Placement statistics and CSV export

| Field | Value |
|:--|:--|
| Requirement(s) | ANL-2, ANL-3 |
| Type | Functional / Security |
| Preconditions | Admin logged in. `seed:demo` data loaded (200 students with branch and graduation year, 600 applications, 199 results). |
| Steps | **API:** 1. `GET /analytics/placements` (whole batch). 2. `GET /analytics/placements?branch=<branch>&gradYear=<year>`. 3. `GET /analytics/placements/export` with the same filter. 4. Repeat 1 and 3 as a student and as a recruiter. **UI:** *Placement statistics*, enter the branch and graduation year, *Apply*, read the tiles and charts, then *Export CSV* and open the file. |
| Test data | A branch and graduation year present in the seed, for example `CSE` and `2027`. |
| Expected result | Step 1 returns 200 with `students`, `placedStudents` (distinct students with at least one OFFER), `offersPerCompany`, `applicationsPerListing` and `averageScoreByBranch`; placed students ≤ total offers, and offers per company add up to offers per listing. Step 2 narrows every metric to the same cohort, echoes the filter and is no larger than step 1. Step 3 returns 200 `text/csv` with `attachment; filename="placement-report.csv"`; its `students` and `placedStudents` rows equal step 2. Step 4 returns 403 for both roles. In the UI the placement rate equals placed ÷ students for the filter, and the CSV numbers equal the screen. No combined readiness score appears anywhere. |
| Actual result | Partial: student and recruiter got 403 on `/analytics/placements` and student 403 on `/export`. Dashboard and CSV comparison need the admin account. |
| Status | Not run (admin part); role checks pass — Render, 05-11-2026, `main` @ `1e07391` |
| Automated by | `server/tests/integration/analytics.test.js` (whole batch, filters, empty cohort, CSV quoting and formula escaping, cache); `analytics-performance.test.js` (2,000 students, API part of PERF-3) |
| Changes from v1.0 | Routes are `GET /analytics/placements` and `GET /analytics/placements/export` (DEVIATIONS row 21). There is no combined readiness score (row 13). The v1.0 fixture (40 CSE 2027 students, 12 with offers) is not in `seed:demo`, so the check compares the dashboard, the filter and the CSV against each other instead of fixed numbers. The CSV is one `section,group,detail,value` table, not one row per student. |

## 3. New test cases

### TC-TST-03: Question bank create, edit and archive

| Field | Value |
|:--|:--|
| Requirement(s) | TST-1 |
| Type | Functional / Boundary / Negative / Security |
| Preconditions | Admin logged in. A student and a recruiter account are available. |
| Steps | **API:** 1. `POST /questions` with 2 options and with 6 options. 2. `POST /questions` with 1 option, 7 options, `answerIdx` out of range, fractional `answerIdx`, unknown topic `History`, unknown difficulty and duplicate options. 3. `PATCH /questions/:id` with the current `version` and new text. 4. Repeat step 3 with the old `version`. 5. `PATCH` an `answerIdx` that is outside the current options. 6. `PATCH {version, archived: true}`. 7. `GET /questions` and `GET /questions?archived=true`. 8. As a student and as a recruiter: `GET /questions` and `POST /questions`. 9. As a student, start a test and inspect the questions. **UI:** *Question bank* → *New question*, add options with *Add option*, mark the correct one, save; *Edit* it; archive it and switch the *Show* filter between *Active* and *Archived*. |
| Test data | Question texts prefixed `ST-96`; topics Quantitative, Logical, Verbal, Technical; difficulties Easy, Medium, Hard. |
| Expected result | Step 1 returns 201 for both, with `answerIdx` in the admin DTO. Every request in step 2 returns 400. Step 3 returns 200 with the new text and a new `version`. Step 4 returns 409 `STALE_VERSION`. Step 5 returns 400. Step 6 returns 200 with `archived: true`. Step 7 lists the question only under `archived=true`. Step 8 returns 403. Step 9: student question objects contain only `questionId, text, topic, difficulty, options`, never `answerIdx`. |
| Actual result | Partial: student and recruiter got 403 on `GET /questions`, student 403 on `POST /questions`; student attempt questions had only `questionId, text, topic, difficulty, options`. Admin steps 1–7 need the admin account (run `system-test-aptitude.js --admin`). |
| Status | Not run (admin part); role checks pass — Render, 05-11-2026, `main` @ `1e07391` |
| Automated by | `server/tests/integration/aptitude-api.test.js` ("admin creates a question…", "bank filters, bounds and archive…", "editing validates answer against changed options and rejects stale versions", "invalid id and unauthorized test creation…"); `server/tests/unit/aptitude-models.test.js` |
| Changes from v1.0 | New. Adds the edit and archive routes, version conflicts and answer-key redaction (DEVIATIONS row 9). |

### TC-TST-04: Test draft, publish and archive

| Field | Value |
|:--|:--|
| Requirement(s) | TST-2 |
| Type | Functional / Boundary / Negative |
| Preconditions | Admin logged in; at least 6 active `ST-96` questions and one archived question exist. |
| Steps | **API:** 1. `POST /tests` with 4 questions, with duration 9 and 121, with a duplicate question ID, and with an archived question. 2. `POST /tests` with 5 questions and 120 minutes. 3. As a student, try to start the draft. 4. `PATCH` the draft's `questionIds` to 6 questions. 5. Publish with the old `version`. 6. Publish with the current `version`. 7. `PATCH` the published test's title. 8. As a student, `GET /tests`. 9. Archive it. 10. Try to publish it again. 11. As a student, `GET /tests`. **UI:** *Tests* → *Build a test*: enter a title and *Duration (minutes)*, tick questions, save; *Publish* (confirm the dialog); *Archive*. |
| Test data | 6 `ST-96` questions, 1 archived question. |
| Expected result | Step 1 returns 400 each time (`INVALID_QUESTIONS` for the archived question). Step 2 returns 201 with status `DRAFT`. Step 3 returns 404. Step 4 returns 200 with 6 questions. Step 5 returns 409 `STALE_VERSION`. Step 6 returns 200 `PUBLISHED`. Step 7 returns 409 `TEST_LOCKED`. Step 8 lists the test. Step 9 returns 200 `ARCHIVED`. Step 10 returns 409. Step 11 no longer lists the test. In the UI the *Publish* and *Archive* buttons ask for confirmation and a published test can no longer be edited. |
| Actual result | Partial: student `POST /tests` 403; the student list showed only `PUBLISHED` tests (6). Admin steps need the admin account. |
| Status | Not run (admin part); role checks pass — Render, 05-11-2026, `main` @ `1e07391` |
| Automated by | `server/tests/integration/aptitude-api.test.js` ("create draft, edit, publish, list and archive without exposing keys", "duplicate, missing and archived questions cannot be used", "a concurrent document version error is reported as a stale edit", "draft/archived tests and non-students cannot start") |
| Changes from v1.0 | New. Adds the draft → published → archived life cycle and version conflicts (DEVIATIONS row 9). |

### TC-TST-05: Only one submitted attempt per test

| Field | Value |
|:--|:--|
| Requirement(s) | TST-3, TST-6 |
| Type | Functional / Negative / Security |
| Preconditions | Student A has an in-progress attempt (from TC-TST-01). Student B is logged in. |
| Steps | **API:** 1. Student B: `GET /attempts/:id`, `PATCH /attempts/:id/answers` and `POST /attempts/:id/submit` on A's attempt. 2. Student A: `GET /attempts/:id/result` before submitting. 3. `POST /attempts/:id/submit`. 4. Submit again. 5. `GET /attempts/:id/result`; also as student B. 6. Save another answer. 7. `POST /tests/:id/attempts` again. 8. `GET /tests`. **UI:** *Submit* (the dialog warns about unanswered questions), then go back to *Aptitude tests*. |
| Test data | Student A and B; the attempt from TC-TST-01. |
| Expected result | Step 1 returns 404 for all three (no data about A's attempt). Step 2 returns 409 `ATTEMPT_OPEN`. Step 3 returns 200 with `score`, `correctAnswers`, `totalQuestions` and `topicBreakdown`, whose counts add up to the totals and whose `score` = 100 × correct ÷ total. Step 4 returns the same `resultId`. Step 5 returns the same result for A and 404 for B. Step 6 returns 409 `ATTEMPT_CLOSED`. Step 7 returns 409 `ATTEMPT_EXISTS`. Step 8 shows `myAttempt.status: SUBMITTED`. In the UI the test shows *View result* instead of *Start or resume*. |
| Actual result | API: B got 404 on read, save and submit of A's attempt; result before submit 409 `ATTEMPT_OPEN`; submit 200, 4/20 = 20%, topics Quantitative 2/5, Logical 0/5, Verbal 1/5, Technical 1/5 (sums match totals); repeat submit returned the same `resultId`; `GET result` matched, B got 404; attempt `SUBMITTED` / `MANUAL`; a later save 409 `ATTEMPT_CLOSED`; restart 409 `ATTEMPT_EXISTS`; test list showed `myAttempt.status: SUBMITTED`. UI not run yet. |
| Status | Pass (API); UI not run — Render, 05-11-2026, `main` @ `1e07391` |
| Automated by | `server/tests/integration/aptitude-api.test.js` ("other students cannot read, save, submit or fetch a result", "manual submit is idempotent, terminal…", "students see their own attempt on each listed test", "an open attempt has no result yet"); `aptitude-indexes.test.js` ("result indexes prevent duplicate scoring records") |
| Changes from v1.0 | New. Separates single-attempt enforcement and owner isolation from the resume case. |

### TC-TST-06: Answer save acknowledged within 1 second

| Field | Value |
|:--|:--|
| Requirement(s) | TST-4 |
| Type | Performance / Reliability |
| Preconditions | Student logged in with a fresh attempt on a 20-question test. |
| Steps | **API:** 1. For each of the 20 questions, call `GET /health` (network baseline) and then `PATCH /attempts/:id/answers`, timing both from the client. 2. Save with `optionIdx` = number of options. 3. Retry a stored answer with an old `version` (lost 204). 4. Send a different answer with an old `version`. **UI:** pick answers quickly and watch the save status under the question. |
| Test data | Placement Practice Test with no attempt for the student. |
| Expected result | Every save returns 204 within 1,000 ms of being sent, measured at the client. Step 2 returns 400 `INVALID_ANSWER`. Step 3 returns 204 without a conflict. Step 4 returns 409 `STALE_VERSION`. In the UI "Saving…" changes to "✓ Saved" within a second, and a failed save shows "Not saved". |
| Actual result | 20 saves from a team laptop to Render (Singapore): median 931 ms, p95 1,023 ms, max 1,191 ms; 16 of 20 under 1 s. In the first run 1 of 5 saves took 2,832 ms. Network baseline in the same run (`GET /health`, no database): median 694 ms, p95 990 ms, so about 240 ms of each save is server and database time. Out-of-range option 400 `INVALID_ANSWER`; lost-204 retry 204; stale different answer 409 `STALE_VERSION`. Evidence: `docs/testing/evidence/aptitude-save-latency.json`. |
| Status | Fail — 4 of 20 saves over 1 s at the client; Render, 05-11-2026, `main` @ `1e07391` |
| Automated by | `server/tests/integration/aptitude-recovery.test.js` ("retrying a save whose 204 was lost…", "a different answer from a stale screen is still a conflict"); `aptitude-api.test.js` ("stale client versions and invalid snapshot answers are rejected"); client `client/src/test/pages.test.jsx` ("restores saved answers and auto-saves a new pick") |
| Changes from v1.0 | New. v1.0 had no timing check for TST-4. The time is measured at the client, so the network round trip to Render counts; the `/health` baseline separates network time from server time. |

### TC-ANL-02: Student progress view

| Field | Value |
|:--|:--|
| Requirement(s) | ANL-1 |
| Type | Functional / Security |
| Preconditions | Student A has just submitted a test (TC-TST-05). Another seeded student has no results. |
| Steps | **API:** 1. Before and after A's submission, `GET /analytics/me`. 2. Compare `applications.byStatus` with `GET /applications/mine`. 3. `GET /analytics/me` for the student with no results. 4. `GET /analytics/me` as a recruiter. **UI:** *My progress*: read *Tests taken*, *Average score*, the *Score trend* chart, *Weakest topics*, *All topics* and *Applications by status*. |
| Test data | Student A; a student with no results (for example `student0200`). |
| Expected result | After submitting, `testsTaken` is one higher and the new result is the last point of `trend` (oldest first, with `testTitle`, `score`, `submittedAt`). `averageScore` is the mean of the trend scores. `weakestTopics` is the first two entries of `topics`, sorted weakest first. `byStatus` lists all five statuses and matches the applications list; `total` matches its length. The student with no results gets `averageScore: null` and empty `trend`, `topics` and `weakestTopics` (not 0%). A recruiter gets 403. The UI shows the same numbers and, for a student with no tests, "Take a test to see your trend." and "No topic data yet." instead of 0%. No combined readiness score is shown. |
| Actual result | API: after A's submit `testsTaken` went 1 → 2 and the new result was the last trend point (score 20); `averageScore` 35 = mean of the trend; `weakestTopics` = first two of `topics` (Logical 10.0%, Technical 30.0%); `byStatus` {APPLIED 1, SHORTLISTED 1, INTERVIEW 0, OFFER 0, REJECTED 1}, total 3, matching `GET /applications/mine`; `student0200` (no results) got `averageScore: null` and empty lists; recruiter 403. UI not run yet. |
| Status | Pass (API); UI not run — Render, 05-11-2026, `main` @ `1e07391` |
| Automated by | `server/tests/integration/analytics.test.js` ("a student with no data gets empty states…", "trend, pooled weakest topics and application counts use only the caller's records", "one assessed topic yields one weak topic…", "student readiness is never cached"); client `client/src/test/pages.test.jsx` ("shows progress figures and weakest topics") |
| Changes from v1.0 | New. Covers `GET /analytics/me` and the decision not to compute a readiness score (DEVIATIONS rows 13, 21). Weak topics are pooled across all results (decision D2). |

### TC-DOM-03: Statistics per graduation year

| Field | Value |
|:--|:--|
| Requirement(s) | DOM-3, ANL-2 |
| Type | Functional / Boundary |
| Preconditions | Admin logged in; seed data loaded. |
| Steps | **API:** 1. `GET /analytics/placements?gradYear=y` for each year 2025–2028. 2. `GET /analytics/placements?branch=<b>&gradYear=2027` and the same with the branch in lower case. 3. `gradYear=2099` (no students). 4. `gradYear=1999`. **UI:** *Placement statistics* → *Graduation year* `2027` → *Apply*; then enter `1999`. |
| Test data | Years 2025–2028, 2099 and 1999. |
| Expected result | Each year returns 200 with a cohort no larger than the whole batch, and the filter echoed in `filters`. The branch filter ignores case. 2099 returns `students: 0` and empty lists (the CSV adds "No students match the selected cohort"). 1999 returns 400 `VALIDATION`. In the UI a year outside 2000–2100 shows "Year must be 2000–2100" and the request is not sent. |
| Actual result | |
| Status | Not run |
| Automated by | `server/tests/integration/analytics.test.js` ("branch (case-insensitive) and gradYear filters apply to every metric", "an empty cohort returns zero students and empty lists", "an empty cohort says so instead of showing bare zeroes") |
| Changes from v1.0 | New. v1.0 did not list DOM-3. The cohort is the student's current Profile branch and graduation year (decision D4). |

### TC-SAFE-01: Refresh, closed tab and dropped network in a real browser

| Field | Value |
|:--|:--|
| Requirement(s) | SAFE-1, TST-4, TST-5 |
| Type | Reliability / UI |
| Preconditions | Student logged in on the deployed client in Chrome, Firefox or Edge, with an in-progress attempt. |
| Steps | 1. Pick 3 answers; wait for "✓ Saved". 2. Press F5. 3. Pick 2 more answers, close the tab, reopen the site and click *Start or resume*. 4. Open DevTools → Network → *Offline*, pick an answer, then go back *Online*. 5. Note the timer before and after each step. |
| Test data | Any published test without a submitted attempt for the student. |
| Expected result | After F5 and after reopening, every answer that showed "✓ Saved" is still selected and the timer keeps counting down from the same deadline. While offline the new answer shows "Not saved" and is not shown as saved; after reconnecting it can be saved again. No answer is lost and no extra time is given. |
| Actual result | |
| Status | Not run |
| Automated by | `server/tests/integration/aptitude-recovery.test.js` (server side); `client/src/test/timer.test.js` (countdown from `serverTime`) |
| Changes from v1.0 | New. Moves the browser part of SAFE-1 out of TC-TST-01 so it can be run on each browser for QA-5 (#97). |

### TC-SAFE-02: Deactivation keeps the profile, attempts and results

| Field | Value |
|:--|:--|
| Requirement(s) | SAFE-2, PROF-4 |
| Type | Functional / Reliability / Security |
| Preconditions | Admin logged in. A seeded student with at least one result and one application is chosen for the test (deactivation cannot be undone through the API, so use one student only, for example `student0199`). |
| Steps | **API:** 1. As the student, note `GET /analytics/me` and `GET /applications/mine`; note the admin `GET /analytics/placements` totals. 2. Admin: `PATCH /admin/users/:id/deactivate`. 3. Call `GET /analytics/me` with the student's old token. 4. Log in as the student. 5. Admin: `GET /admin/users?search=<email>` and `GET /admin/users/:id/resume`. 6. After the 5-minute statistics cache expires, `GET /analytics/placements` again. **UI:** *Users* → search the student → *Deactivate*; then try to log in as that student. |
| Test data | One seeded student. |
| Expected result | Step 2 returns 200. Steps 3 and 4 are refused (401/403). Step 5 shows the user with status `DISABLED` and the resume is still available (or 404 if the student never uploaded one). Step 6 still counts the student's results and applications: totals do not drop. Nothing is deleted. |
| Actual result | |
| Status | Not run |
| Automated by | `server/tests/integration/identity-edge-cases.test.js` ("deactivation keeps the profile and resume but blocks the account (SAFE-2)"); `identity-flow.test.js` ("disabling an account revokes an already-issued token"); `rbac.test.js` |
| Changes from v1.0 | New. v1.0 left SAFE-2 for Sprint 3 review. |

## 4. UI test cases

These check the screens on the deployed client. Run them in Chrome at desktop width first; #97 repeats the student ones on Firefox, Edge and a 360 px Android phone.

### UI-TST-01: Aptitude tests list

| Field | Value |
|:--|:--|
| Requirement(s) | TST-3, QA-5 |
| Type | UI |
| Preconditions | Student logged in; at least one test not started, one in progress and one submitted. |
| Steps | 1. Open *Aptitude tests*. 2. Read each card. 3. Click *Start or resume*, go back, and click it again. 4. Click *View result* on a submitted test. |
| Test data | Seeded tests and the attempts from TC-TST-01/05. |
| Expected result | The page says "Each test can be taken once. The timer runs on the server." Each card shows the title, "*n* questions" and "*n* minutes". A test not yet submitted shows *Start or resume*, and clicking it twice opens the same attempt with the timer still running; a submitted one shows *View result*. Draft and archived tests are not listed. |
| Actual result | |
| Status | Not run |
| Automated by | Not automated (client coverage of `Tests.jsx` is 0%, see the Branch Coverage Report) |
| Changes from v1.0 | New |

### UI-TST-02: Test-taking screen and timer

| Field | Value |
|:--|:--|
| Requirement(s) | TST-4, TST-5, SAFE-1, QA-5 |
| Type | UI |
| Preconditions | Student has an in-progress attempt. |
| Steps | 1. Open the attempt. 2. Use *Previous*, *Next* and the question palette. 3. Pick answers. 4. Wait until less than 5 minutes are left (or use the 10-minute `ST-96` test). 5. Click *Submit* with questions unanswered. |
| Test data | Any in-progress attempt. |
| Expected result | The timer bar ("Time left mm:ss") stays visible while scrolling. The palette marks each question *Answered* / *Not answered* in text, not only by colour. The save status shows "Saving…", then "✓ Saved". Under 5 minutes the bar turns to a warning and shows "Less than 5 minutes left. Answers are saved as you pick them." *Submit* asks "*n* question(s) are unanswered. Submit anyway?" before submitting. |
| Actual result | |
| Status | Not run |
| Automated by | `client/src/test/pages.test.jsx` ("restores saved answers and auto-saves a new pick"), `client/src/test/timer.test.js` |
| Changes from v1.0 | New |

### UI-TST-03: Result page

| Field | Value |
|:--|:--|
| Requirement(s) | TST-6 |
| Type | UI |
| Preconditions | Student has a submitted attempt. |
| Steps | 1. Open *View result*. 2. Compare with `GET /attempts/:id/result`. 3. Click *Back to tests*. |
| Test data | Attempt from TC-TST-05. |
| Expected result | *Test result* shows the score and the *By topic* table (Topic, Correct, Score) with the same numbers as the API. No answer key is shown. |
| Actual result | |
| Status | Not run |
| Automated by | Not automated (`Result.jsx` 0% branch coverage) |
| Changes from v1.0 | New |

### UI-TST-04: Admin question bank and test builder

| Field | Value |
|:--|:--|
| Requirement(s) | TST-1, TST-2 |
| Type | UI |
| Preconditions | Admin logged in. |
| Steps | 1. *Question bank* → *New question*; try to save with no text, an empty option and two identical options; then save a valid one. 2. *Tests* → *Build a test*; try 4 questions and 9 minutes; then save 5 questions / 10 minutes. 3. *Publish*, then *Archive*. |
| Test data | `ST-96` questions. |
| Expected result | Invalid input shows a field message ("Question text is required", "Options cannot be empty", "Options must be different") and nothing is saved. Valid questions and tests appear in their lists. The status column changes Draft → Published → Archived, each after a confirmation dialog ("… This cannot be undone."). |
| Actual result | |
| Status | Not run |
| Automated by | Not automated (`Questions.jsx` 17%, `TestsAdmin.jsx` 16% client branch coverage) |
| Changes from v1.0 | New |

### UI-ANL-01: Student progress dashboard

| Field | Value |
|:--|:--|
| Requirement(s) | ANL-1, PERF-3 |
| Type | UI |
| Preconditions | One student with results and applications; one without results. |
| Steps | 1. Open *My progress* as each student. 2. Compare the numbers with `GET /analytics/me`. 3. Time how long the page takes to show the numbers (after the server is awake). |
| Test data | TC-ANL-02 students. |
| Expected result | Tiles, chart and tables match the API. The student with no tests sees the empty messages, not 0%. The page shows its data within 3 s. |
| Actual result | |
| Status | Not run |
| Automated by | `client/src/test/pages.test.jsx` ("shows progress figures and weakest topics") |
| Changes from v1.0 | New |

### UI-ANL-02: Admin placement statistics dashboard

| Field | Value |
|:--|:--|
| Requirement(s) | ANL-2, ANL-3, DOM-3, PERF-3 |
| Type | UI |
| Preconditions | Admin logged in. |
| Steps | 1. Open *Placement statistics* without filters. 2. Filter by branch and graduation year → *Apply*. 3. *Export CSV* and open the file. 4. Time how long the dashboard takes to show the numbers. |
| Test data | Seed data. |
| Expected result | The page shows *Students*, *With an offer*, *Placement rate*, *Offers per company*, *Applications per listing* and *Average test score by branch*. Filtering changes every section. The CSV `placement-report.csv` has the same numbers as the screen. The dashboard shows its data within 3 s. |
| Actual result | |
| Status | Not run |
| Automated by | Not automated (`Statistics.jsx` 0% branch coverage) |
| Changes from v1.0 | New |

## 5. Requirement coverage

| Requirement | Test cases |
|:--|:--|
| TST-1 | TC-TST-03, UI-TST-04 |
| TST-2 | TC-TST-04, UI-TST-04 |
| TST-3 | TC-TST-01, TC-TST-05, UI-TST-01 |
| TST-4 | TC-TST-01, TC-TST-06, TC-SAFE-01, UI-TST-02 |
| TST-5 | TC-TST-02, TC-SAFE-01, UI-TST-02 |
| TST-6 | TC-TST-02, TC-TST-05, UI-TST-03 |
| ANL-1 | TC-ANL-02, UI-ANL-01 |
| ANL-2 | TC-ANL-01, TC-DOM-03, UI-ANL-02 |
| ANL-3 | TC-ANL-01, UI-ANL-02 |
| DOM-3 | TC-DOM-03, UI-ANL-02 |
| SAFE-1 | TC-TST-01, TC-SAFE-01, UI-TST-02 |
| SAFE-2 | TC-SAFE-02 |
| PERF-3 (UI part) | UI-ANL-01, UI-ANL-02 |

Every TST, ANL and SAFE requirement has at least one case. QA-1 (UAT) and QA-5 (browsers and devices) are measured in #97 and reported in the System Validation Report.

## 6. Summary

| Group | Cases |
|:--|--:|
| Updated v1.0 cases | 3 |
| New API and browser cases | 8 |
| UI cases | 6 |
| **Total** | **17** |
