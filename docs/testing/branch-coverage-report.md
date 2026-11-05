# OIPPP – Branch Coverage Report

| | |
|:--|:--|
| Project | Online Internship & Placement Preparation Portal (OIPPP) |
| Issue | #98 |
| Prepared by | E S Sukruth |
| Measured on | 05-11-2026 (final rerun on the last commit on 06-11-2026, section 7) |
| Baseline commit | `8cb16a0` (`dev`, synced with `main`; release `v1.0.0` plus Part-3 test fixes) |
| After commit | `8cb16a0` plus the four test files added on branch `test/issue-98-branch-coverage` (tests only, no product code) |
| Environment | Local, Windows 11, Node.js 24.11.0, npm 11.6.2; server Jest 29.7.0 with mongodb-memory-server; client Vitest 5.0.5 with `@vitest/coverage-v8` (#90) |

## 1. Summary

| Component | Branches before | Branches after | Statements after | Tests |
|:--|--:|--:|--:|:--|
| Server (`server/src`) | **89.22%** (555 / 622) | **94.37%** (587 / 622) | 96.16% (1,254 / 1,304) | 509 of 509 pass (43 suites) |
| Client (`client/src`) | **33.06%** (326 / 986) | **39.85%** (393 / 986) | 43.84% (552 / 1,259) | 64 of 64 pass (7 files) |

- The issue quoted 89.06% (554 / 622) at `v1.0.0`. On `8cb16a0` it was 89.22% (555 / 622) before this work: `listing.search.service.js` had one more branch covered (26 / 30) by tests merged after the tag.
- 22 new server tests cover **32 of the 42 branches** that were missed in the eight files under 85%. All eight files are now at or above 84.6%, and seven are at or above 90%.
- 11 new client tests cover the three aptitude and analytics pages that had none: `Tests.jsx` 0% → 94.4%, `Result.jsx` 0% → 100%, `Statistics.jsx` 0% → 95.3%.
- The 10 branches still missed in those files are defensive or unreachable through the API (section 4). Covering them would need tests that call internal functions with impossible inputs, which proves nothing about the product.
- QA-4 asks for 70% server **statement** coverage. Branch coverage has no SRS or Test Plan target, so this report aims to test every real path and explain the rest.

### How it was measured

```sh
# server
cd server
npx jest --runInBand --coverage --coverageReporters=json-summary --coverageReporters=json --coverageReporters=text
# client (tooling from #90)
cd client
npx vitest run --coverage --coverage.reporter=json-summary --coverage.reporter=json --coverage.reporter=text
```

Branches are counted by Istanbul (server) and V8 (client): each side of an `if`, `? :`, `&&`, `||`, `??` and each default parameter is one branch.

## 2. Server branch coverage by module

| Module (`server/src`) | Before | After | Change |
|:--|--:|--:|--:|
| `config` | 19 / 22 (86.4%) | 19 / 22 (86.4%) | – |
| `middleware` | 46 / 46 (100%) | 46 / 46 (100%) | – |
| `modules/analytics` | 59 / 71 (83.1%) | 70 / 71 (98.6%) | +11 |
| `modules/applications` | 54 / 63 (85.7%) | 59 / 63 (93.7%) | +5 |
| `modules/audit` | 4 / 4 (100%) | 4 / 4 (100%) | – |
| `modules/listings` | 79 / 92 (85.9%) | 87 / 92 (94.6%) | +8 |
| `modules/notifications` | 20 / 27 (74.1%) | 27 / 27 (100%) | +7 |
| `modules/settings` | 4 / 4 (100%) | 4 / 4 (100%) | – |
| `modules/tests` (aptitude) | 166 / 181 (91.7%) | 166 / 181 (91.7%) | – |
| `modules/users` | 103 / 110 (93.6%) | 103 / 110 (93.6%) | – |
| `utils` | 1 / 2 (50%) | 2 / 2 (100%) | +1 |
| **Total** | **555 / 622 (89.22%)** | **587 / 622 (94.37%)** | **+32** |

## 3. Server branch coverage by file

Files with no branches (route files, `app.js`, `index.js`, `AppError.js`, `wrap.js`, `escape-regex.js`, `audit.service.js`, `auth.validation.js`, `application.deps.js`, `request-log.js`) are left out; they are at 100% statements in the Code Coverage Report.

| File (`server/src`) | Before | After |
|:--|--:|--:|
| `config/env.js` | 19 / 22 (86.4%) | 19 / 22 (86.4%) |
| `middleware/auth.js` | 14 / 14 (100%) | 14 / 14 (100%) |
| `middleware/error.js` | 20 / 20 (100%) | 20 / 20 (100%) |
| `middleware/rate-limit.js` | 1 / 1 (100%) | 1 / 1 (100%) |
| `middleware/validate.js` | 11 / 11 (100%) | 11 / 11 (100%) |
| `modules/analytics/analytics.service.js` | **59 / 71 (83.1%)** | 70 / 71 (98.6%) |
| `modules/applications/application.constants.js` | 2 / 2 (100%) | 2 / 2 (100%) |
| `modules/applications/application.model.js` | 2 / 2 (100%) | 2 / 2 (100%) |
| `modules/applications/application.service.js` | **50 / 59 (84.7%)** | 55 / 59 (93.2%) |
| `modules/audit/auditLog.model.js` | 4 / 4 (100%) | 4 / 4 (100%) |
| `modules/listings/bookmark.model.js` | 2 / 2 (100%) | 2 / 2 (100%) |
| `modules/listings/bookmark.service.js` | **10 / 13 (76.9%)** | 13 / 13 (100%) |
| `modules/listings/listing.model.js` | 5 / 5 (100%) | 5 / 5 (100%) |
| `modules/listings/listing.routes.js` | 7 / 7 (100%) | 7 / 7 (100%) |
| `modules/listings/listing.search.service.js` | **26 / 30 (86.7%)** ¹ | 27 / 30 (90.0%) |
| `modules/listings/listing.service.js` | 22 / 22 (100%) | 22 / 22 (100%) |
| `modules/listings/recommendation.service.js` | **7 / 13 (53.8%)** | 11 / 13 (84.6%) |
| `modules/notifications/mailer.js` | **3 / 6 (50%)** | 6 / 6 (100%) |
| `modules/notifications/notification.model.js` | 2 / 2 (100%) | 2 / 2 (100%) |
| `modules/notifications/notification.service.js` | **15 / 19 (78.9%)** | 19 / 19 (100%) |
| `modules/settings/settings.model.js` | 2 / 2 (100%) | 2 / 2 (100%) |
| `modules/settings/settings.service.js` | 2 / 2 (100%) | 2 / 2 (100%) |
| `modules/tests/aptitude.routes.js` | 2 / 2 (100%) | 2 / 2 (100%) |
| `modules/tests/aptitude.service.js` | 84 / 95 (88.4%) | 84 / 95 (88.4%) |
| `modules/tests/attempt-timeout.job.js` | 6 / 6 (100%) | 6 / 6 (100%) |
| `modules/tests/attempt.model.js` | 37 / 40 (92.5%) | 37 / 40 (92.5%) |
| `modules/tests/question.model.js` | 10 / 10 (100%) | 10 / 10 (100%) |
| `modules/tests/result.model.js` | 20 / 21 (95.2%) | 20 / 21 (95.2%) |
| `modules/tests/schema.helpers.js` | 5 / 5 (100%) | 5 / 5 (100%) |
| `modules/tests/test.model.js` | 2 / 2 (100%) | 2 / 2 (100%) |
| `modules/users/admin.service.js` | 24 / 28 (85.7%) | 24 / 28 (85.7%) |
| `modules/users/auth.service.js` | 36 / 37 (97.3%) | 36 / 37 (97.3%) |
| `modules/users/profile.model.js` | 2 / 2 (100%) | 2 / 2 (100%) |
| `modules/users/profile.routes.js` | 2 / 2 (100%) | 2 / 2 (100%) |
| `modules/users/profile.service.js` | 14 / 14 (100%) | 14 / 14 (100%) |
| `modules/users/public-user.js` | 2 / 2 (100%) | 2 / 2 (100%) |
| `modules/users/resume.storage.js` | 10 / 11 (90.9%) | 10 / 11 (90.9%) |
| `modules/users/resume.upload.js` | 11 / 12 (91.7%) | 11 / 12 (91.7%) |
| `modules/users/user.model.js` | 2 / 2 (100%) | 2 / 2 (100%) |
| `utils/logger.js` | **1 / 2 (50%)** | 2 / 2 (100%) |

Bold: the eight files under 85% listed in #98. ¹ 25 / 30 (83.3%) at `v1.0.0`.

## 4. Missed branches in the eight files

**Real** means a user, an admin, the deployment or a concurrent request can take that path, so it gets a test. **Defensive** means the code guards against something that the routes, the validation layer or the schema already rule out; it stays, but a test would only call internals with impossible input.

### 4.1 `modules/notifications/mailer.js` (3 / 6 → 6 / 6)

| Line | Branch | Kind | Test added |
|:--|:--|:--|:--|
| 9–10 | `smtp.host` set → real SMTP transport | Real: every deployed build (Mailtrap on the test build, Brevo in `render.yaml`) | `unit/mailer-logger-config.test.js` "with SMTP_HOST and a user it builds an authenticated SMTP transport once" |
| 14 | `smtp.user` set → `auth` block | Real: authenticated SMTP | same test |
| 14 | no `smtp.user` → `auth: undefined` | Real: an open relay or local SMTP; also checks port 465 → `secure: true` | "port 465 uses TLS; no SMTP_USER means no auth block" |

### 4.2 `utils/logger.js` (1 / 2 → 2 / 2)

| Line | Branch | Kind | Test added |
|:--|:--|:--|:--|
| 4 | `NODE_ENV !== 'test'` → level `info` | Real: production and development | `unit/mailer-logger-config.test.js` "is silent under test and info otherwise" |

### 4.3 `modules/listings/recommendation.service.js` (7 / 13 → 11 / 13)

| Line | Branch | Kind | Test added |
|:--|:--|:--|:--|
| 8 | no Profile → 404 `NOT_FOUND` | Real: a student who has not saved a profile yet | `integration/branch-coverage-listings.test.js` "a student without a profile gets 404" |
| 34 | profile without CGPA → only listings with no minimum | Real: CGPA is optional in the profile | "a profile without CGPA only sees listings with no CGPA minimum" |
| 60–61 | equal match count and equal deadline → order by `_id` | Real: two listings with the same skills and deadline (common in `seed:demo`) | "equal match count and deadline fall back to listing id order" (covers both arms) |
| 13 | `profile.skills` missing → `[]` | Defensive: the Profile schema defaults `skills` to `[]` | – |
| 45 | `listing.skills` missing → `[]` | Defensive: the Listing schema defaults `skills` to `[]` | – |

### 4.4 `modules/listings/bookmark.service.js` (10 / 13 → 13 / 13)

| Line | Branch | Kind | Test added |
|:--|:--|:--|:--|
| 11 | listing not found → 404 | Real: a stale link or a deleted listing | `integration/branch-coverage-listings.test.js` "bookmarking a listing that does not exist is 404" |
| 29 | `create` hits the unique index (11000) → return the existing bookmark | Real: two quick clicks or two tabs (SRCH-4, no duplicates) | "a concurrent duplicate save (unique index 11000) returns the existing bookmark" |
| 29 | any other database error → rethrow | Real: a database failure must give 500, not a fake success | "any other database error on save is not swallowed" |

### 4.5 `modules/notifications/notification.service.js` (15 / 19 → 19 / 19)

| Line | Branch | Kind | Test added |
|:--|:--|:--|:--|
| 14 | recipient has no email → retry later | Real: the user record was removed or has no email | `integration/branch-coverage-analytics-applications.test.js` "a recipient with no email is marked for retry, not sent" |
| 38 | `retryDueEmails()` default `now` | Real: the 60 s job calls it with no argument | "defaults: retry uses the current time, list works without options, the job uses 60 s" |
| 44 | `startEmailRetryJob()` default 60,000 ms | Real: `index.js` starts the job with no argument | same test |
| 52 | `list(userId)` default options | Real: internal callers without a filter | same test |

### 4.6 `modules/analytics/analytics.service.js` (59 / 71 → 70 / 71)

| Line | Branch | Kind | Test added |
|:--|:--|:--|:--|
| 26 | equal percentage and equal size → fixed topic order (decision D2) | Real | `integration/branch-coverage-analytics-applications.test.js` "weak-topic ties on percentage and size fall back to the fixed topic order" |
| 45 | test record missing → `testTitle: null` | Real: the trend must not crash if a test is removed in the database | "a result whose test record is gone shows testTitle null, not a crash" |
| 61, 63 | profile without `branch` → `branch: null`, unfiltered and year-only filter (decision D4) | Real: `branch` is optional in the profile | "profiles without a branch are reported as branch null, also under a year-only filter" |
| 84, 86 | listing missing → `company`/`title` null, kept in totals | Real: documented in [analytics-api.md](../other-docs/analytics-api.md) ("a listing that no longer exists is reported with `title` and `company` set to `null`, not dropped") | "offers on a deleted listing are kept as 'Unknown listing', in JSON and CSV, with branch rows" |
| 145, 147 | CSV `?? 'Unknown listing'` / `?? ''` for those rows | Real: same case in the export (ANL-3) | same test |
| 150 | CSV branch rows, named and `No branch` | Real: the existing CSV tests had no results, so no branch rows were ever written | same test |
| 132 | `csvCell(null)` → empty cell | Defensive: every caller passes a value or a `??` fallback; kept so a future column cannot print `null` | – |

### 4.7 `modules/listings/listing.search.service.js` (26 / 30 → 27 / 30)

| Line | Branch | Kind | Test added |
|:--|:--|:--|:--|
| 63 | `deadlineAfter` in the past → clamp to now | Real: a student picks an old "deadline after" date; expired listings must stay hidden (SRCH-2, LST-4) | `integration/branch-coverage-listings.test.js` "a deadlineAfter in the past still hides expired listings" |
| 23, 24 | default `page = 1`, `limit = 20` | Defensive: the Joi schema on `GET /listings` always fills both | – |
| 66 | unknown `sortBy` → `deadline` | Defensive: Joi rejects any other `sortBy` with 400 before the service runs | – |

### 4.8 `modules/applications/application.service.js` (50 / 59 → 55 / 59)

| Line | Branch | Kind | Test added |
|:--|:--|:--|:--|
| 15 | listing not found → 404 | Real: `GET /listings/:id/applications` with a wrong ID | `integration/branch-coverage-analytics-applications.test.js` "applicants of a listing that does not exist is 404" |
| 83 | listing missing → `listing: null` in *My applications* | Real: the student keeps the application record (SAFE-2 spirit) | "a student's application whose listing was deleted still lists, with listing null" |
| 109 | applicant without a Profile → empty profile fields | Real: a student can apply before saving a profile when the listing has no CGPA minimum | "an applicant without a profile is listed with empty profile fields" |
| 174 | application not found → 404 on its resume | Real: a stale link | "resume of an unknown application is 404" |
| 182 | non-recruiter (student owner, admin) skips the owner check | Real: SAD row 16, the owner and the admin may read the resume | "the student owner and an admin pass the access check for an application resume" |
| 27 | `alreadyApplied(null)` | Defensive: reached only if the duplicate-key error fires and the winning record vanishes before the read | – |
| 60 | `create` error other than 11000 → rethrow | Defensive: a database outage; the error middleware returns 500 | – |
| 88 (×2) | default `page = 1`, `limit = 20` | Defensive: Joi fills both on `GET /listings/:id/applications` | – |

### 4.9 Totals for the eight files

| | Branches |
|:--|--:|
| Missed before | 42 |
| Real paths, now tested | 32 |
| Defensive or unreachable, left as is | 10 |
| Missed after | 10 |

## 5. Other server files above 85% but not 100%

Not in scope for #98, listed so nothing is hidden. Most are guards on configuration or rare database failures.

| File | Missed | Notes |
|:--|--:|:--|
| `modules/tests/aptitude.service.js` | 11 | Not-found and stale-version guards on edits, the 503 `RESULT_UNAVAILABLE` path for a legacy attempt with no result, a non-duplicate insert error, a concurrent `ATTEMPT_CHANGED`, the startup check that refuses a standalone MongoDB, and two role ternaries. The main paths have 30+ integration tests |
| `modules/users/admin.service.js` | 4 | Reject-reason guard (Joi already checks it), pagination defaults, unknown student on the admin resume route |
| `config/env.js` | 3 | `NODE_ENV` default and the production-only `JWT_SECRET` check |
| `modules/tests/attempt.model.js` | 3 | `answers || []` and `questions || []` guards; the schema always sets both |
| `modules/tests/result.model.js`, `auth.service.js`, `resume.storage.js`, `resume.upload.js` | 1 each | `topicBreakdown || []`; user deleted between token check and `/auth/me`; stream error after headers were sent; upload with no file part |

## 6. Client branch coverage

Client tests (#90 tooling) are page-level Vitest + Testing Library tests. Before #98 they covered the riskiest screens (login, register, applicants, attempt, progress, settings). #98 adds `client/src/test/aptitude-analytics-pages.test.jsx` (11 tests) for the aptitude and analytics screens that had no tests: the tests list (start or resume, refused start, score and *View result*, empty state), the result page (score, topic table, open-attempt error) and the placement statistics dashboard (tiles, placement rate, unknown listings, branch and graduation-year filter, year validation, empty cohort, CSV export and its error, retry). The remaining low numbers are display pages that the UI test cases and UAT (#97) exercise instead.

### 6.1 By folder

| Folder (`client/src`) | Before | After |
|:--|--:|--:|
| `api` | 32 / 38 (84.2%) | 32 / 38 (84.2%) |
| `auth` | 9 / 12 (75.0%) | 9 / 12 (75.0%) |
| `components` | 28 / 116 (24.1%) | 30 / 116 (25.9%) |
| `lib` | 68 / 97 (70.1%) | 71 / 97 (73.2%) |
| `pages` (public) | 32 / 48 (66.7%) | 32 / 48 (66.7%) |
| `pages/admin` | 35 / 235 (14.9%) | 76 / 235 (32.3%) |
| `pages/recruiter` | 64 / 145 (44.1%) | 64 / 145 (44.1%) |
| `pages/student` | 58 / 291 (19.9%) | 79 / 291 (27.1%) |
| `App.jsx` | 0 / 4 (0%) | 0 / 4 (0%) |
| **Total** | **326 / 986 (33.06%)** | **393 / 986 (39.85%)** |

### 6.2 By file (after #98)

Changed by #98: `components/ui.jsx` 28 → 30, `lib/format.js` 10 → 12, `lib/useApi.js` 4 → 5, `pages/admin/Statistics.jsx` 0 → 41, `pages/student/Result.jsx` 0 → 4, `pages/student/Tests.jsx` 0 → 17.

| File | Branches | File | Branches |
|:--|--:|:--|--:|
| `api/client.js` | 32 / 38 (84.2%) | `pages/admin/Questions.jsx` | 12 / 70 (17.1%) |
| `auth/AuthContext.jsx` | 3 / 6 (50%) | `pages/admin/Settings.jsx` | 13 / 14 (92.9%) |
| `auth/RequireRole.jsx` | 6 / 6 (100%) | `pages/admin/Statistics.jsx` | 41 / 43 (95.3%) |
| `components/Layout.jsx` | 0 / 20 (0%) | `pages/admin/TestsAdmin.jsx` | 10 / 62 (16.1%) |
| `components/ListingCard.jsx` | 0 / 21 (0%) | `pages/admin/Users.jsx` | 0 / 46 (0%) |
| `components/NotificationBell.jsx` | 0 / 25 (0%) | `pages/recruiter/Applicants.jsx` | 45 / 62 (72.6%) |
| `components/PdfViewer.jsx` | 0 / 12 (0%) | `pages/recruiter/ListingForm.jsx` | 19 / 57 (33.3%) |
| `components/ui.jsx` | 30 / 38 (78.9%) | `pages/recruiter/MyListings.jsx` | 0 / 26 (0%) |
| `lib/format.js` | 12 / 17 (70.6%) | `pages/student/Applications.jsx` | 13 / 28 (46.4%) |
| `lib/status.js` | 3 / 4 (75%) | `pages/student/Attempt.jsx` | 31 / 57 (54.4%) |
| `lib/timer.js` | 16 / 18 (88.9%) | `pages/student/Home.jsx` | 0 / 19 (0%) |
| `lib/useApi.js` | 5 / 8 (62.5%) | `pages/student/ListingDetail.jsx` | 0 / 46 (0%) |
| `lib/useBookmarks.js` | 0 / 12 (0%) | `pages/student/Profile.jsx` | 0 / 62 (0%) |
| `lib/validation.js` | 35 / 38 (92.1%) | `pages/student/Progress.jsx` | 14 / 18 (77.8%) |
| `pages/Forbidden.jsx` | 1 / 2 (50%) | `pages/student/Result.jsx` | 4 / 4 (100%) |
| `pages/Login.jsx` | 11 / 21 (52.4%) | `pages/student/Saved.jsx` | 0 / 4 (0%) |
| `pages/Register.jsx` | 20 / 25 (80%) | `pages/student/Search.jsx` | 0 / 35 (0%) |
| | | `pages/student/Tests.jsx` | 17 / 18 (94.4%) |

`lib/chart.js`, `lib/download.js`, `main.jsx`, `pages/Help.jsx` and `pages/NotFound.jsx` have no branches.

The logic that decides correctness on the client (`lib/timer.js` 88.9%, `lib/validation.js` 92.1%, `api/client.js` 84.2%, `auth/RequireRole.jsx` 100%) is well covered. The pages still at 0% are display code; the next client tests worth writing are `Search.jsx` and `ListingDetail.jsx` (the QA-1 path) and `Users.jsx` (SAFE-2 deactivation).

## 7. Final rerun on the last commit (Fri 06-11-2026)

To be filled in before 12 pm on 06-11-2026, on the final `dev`/`main` commit after all Part-3 PRs are merged.

| | Server branches | Server statements | Server tests | Client branches | Client tests |
|:--|--:|--:|--:|--:|--:|
| 05-11-2026, `8cb16a0` + #98 tests | 94.37% (587 / 622) | 96.16% (1,254 / 1,304) | 509 / 509 | 39.85% (393 / 986) | 64 / 64 |
| 06-11-2026, final commit `_______` | | | | | |

## 8. Conclusion

Server branch coverage rose from 89.22% to 94.37% with tests only. Every real path that was missed in the eight files under 85% now has a test, and each of the 10 branches left uncovered in them is named above with the reason it is defensive. Client branch coverage rose from 33.06% to 39.85% with tests for the tests list, result and placement statistics pages. All 509 server tests and 64 client tests pass. The remaining client gaps are display pages covered by the UI test cases and UAT rather than unit tests.
