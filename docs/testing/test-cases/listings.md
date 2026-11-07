# Listings and Search Test Cases

**Project:** OIPPP  
**Version:** Part-3 Testing  
**Environment:** Local / Render (where applicable)  
**Date:** 4 November 2026  
**Issue:** #87 – Update listings & search test cases

## 1. Purpose

This document records the functional, validation, authorization, search, saved-internship, recommendation and performance test cases for OIPPP listings.

It covers the listing and search requirements (`LST-1`–`LST-4`, `SRCH-1`–`SRCH-5`) and performance requirements (`PERF-1`–`PERF-3`).

Actual results and execution status must be updated only after the corresponding tests have been performed. Results from earlier release reports are identified as historical evidence and are not treated as a new execution on the Issue #87 branch.

## 2. Updated Existing Test Cases

### TC-LST-01: Listing Creation, Validation and Expiry

| Field | Value |
|---|---|
| Requirement(s) | LST-1, LST-2, LST-4 |
| Type | Functional / Boundary / Negative |
| Preconditions | An approved recruiter account exists and is authenticated. |
| Steps | 1. Create a listing with valid required fields and a future deadline. 2. Submit a listing with a past deadline. 3. Submit a listing with a negative stipend. 4. Create a listing with a short future deadline and wait for the expiry job. 5. Attempt to edit the expired/closed listing. |
| Test data | Valid company, title, location, mode, stipend, skills and future deadline; past deadline; negative stipend; short future deadline. |
| Expected result | A valid listing is created with status `OPEN`. A past deadline and negative stipend are rejected with HTTP 400 and validation errors. An expired listing is automatically changed to `CLOSED`; editing a closed listing returns HTTP 409 `LISTING_CLOSED`. |
| Actual result | **Render, 04-11-2026 (#88, SVR 4.4):** valid creation 201 `OPEN`; past deadline and negative stipend 400; a short-deadline listing later read `CLOSED` and editing it gave 409 `LISTING_CLOSED`. The exact expiry-job closing time was not measured. |
| Status | Pass |
| Automated by | `server/tests/integration/listings.test.js` – approved recruiter creation, past deadline, negative stipend, automatic expiry and closed-listing behavior. |
| Changes from v1.0 | Clarifies the creation, validation and automatic-expiry scenarios and records the expected status transitions. |

## 3. New Test Cases

### LST-3: Listing Ownership and Recruiter Authorization

| Field | Value |
|---|---|
| Requirement(s) | LST-3 |
| Type | Authorization / Negative |
| Preconditions | Two approved recruiter accounts exist. Recruiter A owns an open listing. Recruiter B is authenticated separately. |
| Steps | 1. Authenticate as Recruiter B. 2. Attempt to edit Recruiter A's listing. 3. Attempt to close Recruiter A's listing. 4. Authenticate as Recruiter A. 5. Edit the listing and close it. |
| Test data | Listing ID owned by Recruiter A; valid updated title and stipend; two different recruiter accounts. |
| Expected result | Recruiter B cannot edit or close Recruiter A's listing and receives HTTP 403 with the ownership error. Recruiter A can edit and close the listing successfully. The listing remains associated with its original recruiter. |
| Actual result | **Render, 04-11-2026 (#88, SVR 4.4):** the other recruiter got 403 for edit and close; the owner edited and closed the listing and GET confirmed `CLOSED`. **UI, 06-11-2026:** `recruiter02` opening `recruiter01`'s edit page got "You can only manage your own listings" (`evidence/ui-render/lst02-other-recruiter.png`). |
| Status | Pass |
| Automated by | `server/tests/integration/listings.test.js` – "only the owner can close a listing", "owner can close a listing", "owner can edit a listing" and "another recruiter cannot edit a listing". |
| Changes from v1.0 | Adds explicit owner-versus-other-recruiter authorization scenarios for listing updates and closure. |

### SRCH-4: Saved Internships and Bookmark Limit

| Field | Value |
|---|---|
| Requirement(s) | SRCH-4 |
| Type | Functional / Boundary / Authorization |
| Preconditions | An authenticated student exists. At least one open, unexpired listing is available. |
| Steps | 1. Save an open listing. 2. Save the same listing again. 3. Retrieve saved internships with `GET /api/bookmarks/mine`. 4. Remove the saved listing. 5. Attempt to save a closed listing and an expired listing. 6. Save 100 distinct eligible listings and attempt to save one additional listing. 7. Repeat a save for a listing already saved while at the limit. |
| Test data | Student account; open, closed and expired listings; 101 distinct eligible listings for the limit scenario. |
| Expected result | The first save returns HTTP 201. Repeating the save does not create a duplicate. `GET /api/bookmarks/mine` returns `{items}` with the student's populated listings, newest first. Removal returns HTTP 204. Closed and expired listings cannot be saved. The 101st distinct bookmark returns HTTP 422 with `BOOKMARK_LIMIT`. Re-saving an existing bookmark at the limit remains successful without increasing the count. |
| Actual result | **Render, 04-11-2026 (#88, SVR 4.4):** save 201; duplicate save returned the same bookmark ID; GET showed one occurrence; removal 204; closed and expired listings 400 `LISTING_NOT_BOOKMARKABLE`. The 100/101 boundary and re-save at the limit were not run on the shared data (covered by `integration/bookmarks.test.js`). |
| Status | Partial (limit boundary not run on Render) |
| Automated by | `server/tests/integration/bookmarks.test.js` – save, duplicate prevention, list, remove, role restriction, closed/expired listing rejection and 100-bookmark limit. |
| Changes from v1.0 | Adds the saved-internship limit, duplicate-save behavior and eligibility checks. |

### SRCH-5: Student Listing Recommendations

| Field | Value |
|---|---|
| Requirement(s) | SRCH-5 |
| Type | Functional / Authorization |
| Preconditions | An authenticated student has a profile with skills and CGPA. Open listings with different skill matches and CGPA requirements exist. |
| Steps | 1. Authenticate as the student. 2. Request `GET /api/listings/recommendations`. 3. Inspect the returned listings, `matchedSkills` and `matchCount`. 4. Verify ordering by match count. 5. Verify that closed, expired and above-CGPA listings are excluded. 6. Repeat with a student profile that has no skills. |
| Test data | Student profile with skills such as Node.js and MongoDB; eligible and ineligible listings; student profile with no skills. |
| Expected result | Eligible listings with matching skills are returned. Matches are case-insensitive and ranked by match count descending, with deadline used as the next ordering criterion. Each result includes its matched skills and match count. Closed, expired, above-CGPA and zero-match listings are excluded. A student with no skills receives an empty list. Unauthenticated requests return HTTP 401 and recruiter requests return HTTP 403. |
| Actual result | **Render, 04-11-2026 (#88, SVR 4.4):** 1,455 recommendations, all OPEN and unexpired, match counts consistent, ranking descending; no token 401, recruiter 403. **06-11-2026:** a new student with no skills got `{"listings":[]}` from `GET /listings/recommendations` (`evidence/srch05-empty-profile.json`) and the home page showed "No matches yet". |
| Status | Pass |
| Automated by | `server/tests/integration/listing-recommendations.test.js` – skill ranking, eligibility exclusions, empty profile and role restrictions. |
| Changes from v1.0 | Adds explicit recommendation ranking, eligibility and empty-profile scenarios. |

### TC-PERF-01: Listing Search and API Load Performance

| Field | Value |
|---|---|
| Requirement(s) | PERF-1, PERF-2 |
| Type | Performance / Load |
| Preconditions | The application is deployed or running in a dedicated test environment. The database contains 5,000 listings. A load-testing tool and 50 concurrent virtual users are available. |
| Steps | 1. Prepare the 5,000-listing test dataset. 2. Start the application and record the environment and commit SHA. 3. Configure 50 concurrent virtual users. 4. Exercise filtered listing search and record response-time percentiles. 5. Exercise representative non-upload API calls, including attempt, answer, result and analytics calls. 6. Record p50, p95, maximum response time and error rate separately for each scenario. 7. Record cold-cache and warm-cache behavior. |
| Test data | 5,000 listings and representative student, attempt, answer, result and analytics data. |
| Expected result | Filtered listing search has p95 response time below 2 seconds. Other API calls, excluding file uploads, have p95 response time below 1 second under the same 50-user load. Record errors and environment details. |
| Actual result | Not run on the Issue #87 branch. Historical release evidence from 30 October 2026: search p95 37 ms and other API p95 62 ms with 50 virtual users. These are historical results, not a fresh execution. |
| Status | Partial — Render 07-11-2026 after the #123 fix: PERF-1 search p95 327 ms Pass; PERF-2 other calls p95 1,679 ms Fail (#123; 3,584 ms on 06-11). See performance-rerun.md |
| Automated by | `docs/testing/search_load.jmx (currently exercises listing searches and /api/health only; attempt, answer, result and analytics API samplers remain to be added or verified for complete PERF-2 load coverage)` – load-test plan. `server/tests/integration/listing-search-performance.test.js` provides a separate synthetic 5,000-listing service-level performance check; it is not a substitute for the 50-user load test. |
| Changes from v1.0 | Explicitly documents PERF-1 and PERF-2 load conditions, percentile targets, API categories and historical-versus-current execution evidence. |

### PERF-3: Placement Dashboard Rendering for 2,000 Students

| Field | Value |
|---|---|
| Requirement(s) | PERF-3 |
| Type | Performance / End-to-end |
| Preconditions | A test environment contains the demo cohort of 2,000 students and the required analytics data. The client production build and API are available. An authorized user can access the placement dashboard. |
| Steps | 1. Prepare the 2,000-student demo data set in an isolated test database. 2. Start the API and production client build. 3. Authenticate as an authorized dashboard user. 4. Open the placement dashboard and measure from navigation until the dashboard finishes rendering. 5. Record the authorized API request, computation and UI rendering time. 6. Repeat the measurement and record cold-cache and warm-cache behavior separately. 7. Check the dashboard's empty-data and API-error states separately. |
| Test data | Demo data generated for 2,000 students, associated profiles, applications and results. |
| Expected result | The complete dashboard renders in less than 3 seconds. Authorized data is displayed correctly. Empty-data and API-error states are handled clearly and do not cause an indefinite loading state. API latency and end-to-end browser rendering time are recorded separately. |
| Actual result | Not run on the Issue #87 branch. Historical release evidence: the 30 October 2026 test report records browser rendering of 0.19–0.29 seconds with 2,000 students. This is not a fresh execution for this issue. |
| Status | Blocked on Render (200 students seeded, 2,000 needed); Pass locally 30-10-2026 (0.19–0.29 s) |
| Automated by | `server/tests/integration/analytics-performance.test.js` covers the API performance portion. Browser rendering requires a client-side measurement; record the actual measurement method and environment when executed. |
| Changes from v1.0 | Separates the full dashboard rendering requirement from API-only performance measurements and explicitly includes empty and error states. |

## 4. Updated Search Test Case

### TC-SRCH-01: Public Listing Search, Filters, Sorting and Pagination

| Field | Value |
|---|---|
| Requirement(s) | SRCH-1, SRCH-2, SRCH-3 |
| Type | Functional / Boundary / Negative |
| Preconditions | The API is running and contains the approved demo listing data. No authentication is required to browse or search public listings. |
| Steps | 1. Send `GET /api/listings` without an authentication token. 2. Search with `search=<keyword>` matching a listing title. 3. Search by a company name and a skill keyword. 4. Filter by location and `mode=REMOTE`. 5. Apply `minStipend` and `maxStipend` together. 6. Apply `deadlineBefore` and `deadlineAfter`. 7. Apply a skill filter. 8. Sort with `sortBy=stipend&order=desc` (supported `sortBy`: `deadline`, `stipend`, `postedAt`, `title`; `order`: `asc` or `desc`). 9. Request subsequent pages and inspect pagination metadata. 10. Submit an invalid mode, invalid sort field and a stipend range where the minimum exceeds the maximum. |
| Test data | Public demo listings; title, company, location and skill keywords; valid mode; minimum and maximum stipend values; ISO date filters; supported sort fields; invalid mode and sort field; minimum stipend greater than maximum stipend. |
| Expected result | Guest requests can browse and search listings without authentication. Only open, unexpired listings are returned. Keyword search matches title, company and skills. Location, mode, skill, minimum stipend, maximum stipend and deadline filters narrow the results correctly. The response is `{listings, pagination}`; sorting returns the requested order and `pagination` has accurate `page`, `limit`, `total` and `totalPages`. Invalid values and an inverted stipend range return HTTP 400 validation errors. |
| Actual result | **Render, 04-11-2026 (#88, SVR 4.4):** search, mode, stipend and skill queries returned the expected results; stipend-descending order monotonic over 50 records; pages 1 and 2 had no duplicate IDs; invalid mode, sort and stipend range gave 400. Newman: 10 requests, 15 assertions, 0 failures. |
| Status | Pass |
| Automated by | `server/tests/integration/listing-search.test.js` – public listing visibility, keyword, location, minimum stipend, skill, sorting, pagination, deadline filters, mode and validation. Guest browsing and positive `maxStipend` filtering are covered by this integration suite; the focused suite passed 13/13 tests. |
| Changes from v1.0 | Adds explicit guest browsing, `maxStipend`, `deadlineBefore` and `deadlineAfter` coverage. Requires verified demo-seed counts rather than legacy expected counts. |

## 5. UI Test Steps

These are manual UI checks. Do not describe them as automated unless a corresponding client test is implemented and executed.

### UI-LST-01: Listing Search Page

1. Open the public listings/search page without signing in.
2. Confirm that listings are visible to a guest.
3. Search using a title or company keyword.
4. Apply location and work-mode filters.
5. Set minimum and maximum stipend values.
6. Apply a skill filter.
7. Apply deadline-before and deadline-after filters.
8. Apply the filters and inspect the result count and listing cards.
9. Change sorting and navigate to another result page.
10. Clear the filters and confirm the default listing results return.
11. Try an invalid stipend range and confirm the UI prevents or explains the invalid input.

**Expected result:** Guest browsing works, filters produce the expected results, pagination and sorting work, and invalid filter combinations are handled clearly.

### UI-LST-02: Recruiter Listing Form

1. Sign in as an approved recruiter.
2. Open the listing creation form.
3. Enter valid company, title, location, mode, stipend, skills and deadline details.
4. Submit the form.
5. Confirm that the listing is created and appears in the recruiter's listings.
6. Open the listing for editing and change permitted fields.
7. Save the changes and confirm they are displayed.
8. Try invalid values, including a negative stipend, missing required fields and a past deadline.
9. Confirm that another recruiter cannot edit or close this listing.

**Expected result:** Valid listings can be created and edited by their owner. Invalid data is rejected with useful validation messages. Another recruiter cannot modify the listing.

**Result (Render, 06-11-2026, Playwright/Edge, `recruiter01` / `recruiter02`): Pass.** Empty submit showed six field errors; a negative stipend gave "Stipend must be 0 or more" and a past deadline "Deadline must be in the future". A valid listing was published, appeared in My listings, and an edited title was saved and shown. `recruiter02` got "You can only manage your own listings". Evidence: `../evidence/ui-render-results.json`, `../evidence/ui-render/lst02-*.png`.

### UI-SRCH-04: Saved Internships

1. Sign in as a student.
2. Open the public listings page.
3. Save an eligible listing using its save control.
4. Open the saved-internships page.
5. Confirm that the listing appears once.
6. Return to the listing and remove it from saved internships.
7. Confirm that it disappears from the saved list.
8. Confirm that the saved count is displayed and that the 100-item limit is communicated when reached.

**Expected result:** Saved listings appear in the student's saved list, duplicate saves do not create duplicates, removal works and the limit is communicated clearly.

**Result (Render, 06-11-2026, `student0003`): Pass.** Saving from the listing page turned the control into "Remove from saved"; the Saved page listed it once with the count "3 of 100 saved"; removing it took it off the list. The 101st-save message was not reached on the shared data. Evidence: `../evidence/ui-render/srch04-*.png`.

### UI-SRCH-05: Student Home Feed

1. Sign in as a student with a completed profile and skills.
2. Open the student home page.
3. Inspect the recommended internships section.
4. Confirm that recommendations display relevant matched skills.
5. Inspect upcoming deadlines.
6. Use the home-page search control to navigate to listing search.
7. Open a recommended listing and inspect its details.
8. Repeat with a student profile that has no skills.

**Expected result:** Recommendations are relevant to the student's profile, matched skills are visible, upcoming deadlines are displayed, search navigation works and an appropriate empty state appears when there are no recommendations.

**Result (Render, 06-11-2026): Pass.** `student0003`'s home showed "Recommended for you" cards with skill chips and a "Deadlines this week" panel; the home search for React opened `/listings?search=React`. A new student with no skills saw "No matches yet. Add skills and your CGPA on your profile to get recommendations." Evidence: `../evidence/ui-render/srch05-home.png`, `../evidence/ui-render/auth06-registered.png`.

## 6. Requirement-to-Test Case Mapping

| Requirement ID | Test case / evidence |
|---|---|
| LST-1 | TC-LST-01 |
| LST-2 | TC-LST-01 |
| LST-3 | LST-3 |
| LST-4 | TC-LST-01 |
| SRCH-1 | TC-SRCH-01 |
| SRCH-2 | TC-SRCH-01 |
| SRCH-3 | TC-SRCH-01 |
| SRCH-4 | SRCH-4 |
| SRCH-5 | SRCH-5 |
| PERF-1 | TC-PERF-01 – listing search load performance |
| PERF-2 | TC-PERF-01 – other API call performance |
| PERF-3 | PERF-3 – end-to-end placement dashboard rendering |

## 7. Execution Notes

1. Record the test date, environment, branch and commit SHA for each execution.
2. Record the Node.js version, database setup, client build mode and relevant configuration for performance runs.
3. Use an isolated test database for demo seeding. Do not run `seed:demo -- --reset` against a database containing personal, shared or otherwise important data.
4. Use `seed:demo` data for listing search expected counts. Record the exact seed command and the resulting counts alongside the test execution.
5. The listing-search performance integration test uses its own synthetic 5,000-listing fixture. Its expected counts must not be substituted for counts from `seed:demo`.
6. Record API response time separately from full browser dashboard rendering time.
7. Do not mark a test as Pass based only on the presence of an automated test in the repository. Execute the relevant test and record its result.
8. The 30 October 2026 release report records historical results from the `dev` working tree. Those results provide context but do not establish a new pass on the Issue #87 branch.
9. Guest browsing and positive `maxStipend` filtering are covered by `server/tests/integration/listing-search.test.js`; the focused suite passed 13/13 tests. Demo-seed count verification is complete; UI execution remains pending.

## 8. Changes Summary

- Updated the listing lifecycle and search test descriptions.
- Added explicit listing ownership and recruiter authorization coverage.
- Added saved-internship behavior, including the 100-bookmark limit.
- Added student recommendation ranking and eligibility checks.
- Added the 2,000-student placement dashboard rendering case for PERF-3.
- Added public guest browsing and the `maxStipend`, `deadlineBefore` and `deadlineAfter` search filters.
- Added UI test steps for listing search, recruiter listing forms, saved internships and the student home feed.
- Added requirement-to-test mapping for all LST, SRCH and PERF IDs.
- Left execution results pending until tests are run on the Issue #87 branch.