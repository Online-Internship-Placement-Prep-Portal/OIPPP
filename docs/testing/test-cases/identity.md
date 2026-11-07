# Identity and Security Test Cases

**Project:** OIPPP
**Version:** Part-3 Testing
**Environment:** Local / Render (where applicable)
**Date:** 3 November 2026
**Issue:** #83 – Update identity & security test cases

## 1. Purpose

This document contains the updated identity, authentication, profile and security test cases for OIPPP.

The test cases cover the requirements listed in `docs/other-docs/identity-security.md`.

Actual results and execution status must be updated only after the tests are performed.

## 2. Updated Existing Test Cases

### TC-AUTH-01: Duplicate Email Registration

| Field             | Value                                                                                         |
| ----------------- | --------------------------------------------------------------------------------------------- |
| Requirement(s)    | AUTH-2                                                                                        |
| Type              | Negative                                                                                      |
| Preconditions     | An account already exists with the email address being tested.                                |
| Steps             | 1. Open registration. 2. Enter an already registered email. 3. Submit the registration form.  |
| Test data         | Existing registered email address.                                                            |
| Expected result   | HTTP 409 with error code `DUPLICATE` and message `An account with this email already exists`. |
| Actual result | **Render, 06-11-2026:** registering `student0001@students.example.com` again returned 409 `DUPLICATE`, "An account with this email already exists". Evidence: `docs/testing/evidence/identity-render-results.json`. |
| Status | Pass |
| Automated by      | `server/tests/integration/auth.test.js` – duplicate registration test.                        |
| Changes from v1.0 | Updated to specify HTTP 409, `DUPLICATE`, and the exact error message.                        |

### TC-AUTH-02: Password Validation

| Field             | Value                                                                                                                                                               |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Requirement(s)    | AUTH-3                                                                                                                                                              |
| Type              | Negative                                                                                                                                                            |
| Preconditions     | Registration page is available.                                                                                                                                     |
| Steps             | 1. Open registration. 2. Enter a password shorter than 8 characters. 3. Try a password without a letter. 4. Try a password without a digit. 5. Submit each request. |
| Test data         | `abc`, `abcdefgh`, `12345678`                                                                                                                                       |
| Expected result   | Each invalid password is rejected with HTTP 400 and an appropriate validation error.                                                                                |
| Actual result | **Render, 06-11-2026:** `abc` → 400 `VALIDATION` "length must be at least 8 characters long"; `abcdefgh` → 400 "Password must contain at least one digit"; `12345678` → 400 "Password must contain at least one letter". Evidence: `docs/testing/evidence/identity-render-results.json`. |
| Status | Pass |
| Automated by      | `server/tests/integration/auth.test.js` and `server/tests/unit/auth-validation.test.js`.                                                                            |
| Changes from v1.0 | Added explicit password validation scenarios.                                                                                                                       |

### TC-AUTH-03: Account Lockout After Failed Login Attempts

| Field             | Value                                                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------------------------ |
| Requirement(s)    | AUTH-5                                                                                                             |
| Type              | Security / Negative                                                                                                |
| Preconditions     | An active user account exists.                                                                                     |
| Steps             | 1. Submit five incorrect passwords. 2. Attempt another login. 3. Check the response and retry timestamp.           |
| Test data         | Valid account email and five incorrect passwords.                                                                  |
| Expected result   | The account is locked for 15 minutes. The next login returns HTTP 423 with `ACCOUNT_LOCKED` and a `retryAt` field. |
| Actual result | **Render, 06-11-2026:** on a fresh student account, wrong passwords 1–5 returned 401; the 6th attempt returned 423 `ACCOUNT_LOCKED` with `retryAt` 18:30:11Z (15 minutes after the 5th failure), and the correct password was also refused with 423 while locked. After `retryAt` (18:30:33Z) the correct password logged in with 200. Evidence: `docs/testing/evidence/identity-render-results.json`, `identity-render-results-3.json`. |
| Status | Pass |
| Automated by      | `server/tests/integration/auth.test.js` and `server/tests/unit/auth-service.test.js`.                              |
| Changes from v1.0 | Updated to specify HTTP 423, `ACCOUNT_LOCKED`, and `retryAt`.                                                      |

### TC-AUTH-04: Resume Download Authorization

| Field             | Value                                                                                                                                                                                                                               |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Requirement(s)    | AUTH-6, SEC-3                                                                                                                                                                                                                       |
| Type              | Security / Negative                                                                                                                                                                                                                 |
| Preconditions     | A student who owns a resume, a recruiter who has an application for that resume, an admin, and an unrelated user exist.                                                                                                             |
| Steps             | 1. Authenticate as an unrelated user and request `GET /applications/:id/resume`. 2. Repeat as the student who owns the resume. 3. Repeat as a recruiter associated with the relevant application. 4. Repeat as an authorized admin. |
| Test data         | Application ID, resume belonging to another user, and authorized user accounts with different roles.                                                                                                                                |
| Expected result   | Unrelated users receive HTTP 403. The owner, permitted recruiter and authorized admin can access the resume according to the access policy.                                                                                         |
| Actual result | **Render, 06-11-2026:** on an application by `student0003`: another student 403 `FORBIDDEN` "You cannot access this application"; another recruiter 403 `NOT_LISTING_OWNER`; no token 401. On an application sent with a resume (`6aee18d7…`), the owning student and the listing's recruiter both got 200 `application/pdf` (20,016 bytes). The admin path was not run (admin password not available to the tester). Evidence: `docs/testing/evidence/identity-render-results-2.json`, `identity-render-results-3.json`. |
| Status | Pass for student, recruiter and unrelated users; admin path not run |
| Automated by      | `server/tests/integration/rbac.test.js`, `server/tests/integration/resume.test.js`, and `server/tests/integration/status.test.js`.                                                                                                  |
| Changes from v1.0 | Updated to identify `GET /applications/:id/resume` and cover the permitted access roles.                                                                                                                                            |

### TC-PROF-01: Resume Upload Validation

| Field             | Value                                                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Requirement(s)    | PROF-2                                                                                                                   |
| Type              | Boundary / Negative                                                                                                      |
| Preconditions     | An authenticated student account exists.                                                                                 |
| Steps             | 1. Upload a valid PDF. 2. Upload a PDF larger than 2 MB. 3. Upload a DOCX file.                                          |
| Test data         | Valid PDF, 2.1 MB PDF, and DOCX file.                                                                                    |
| Expected result   | Valid PDF is accepted. A 2.1 MB PDF returns HTTP 413 `FILE_TOO_LARGE`. A DOCX file returns HTTP 400 `INVALID_FILE_TYPE`. |
| Actual result | **Render, 06-11-2026 (new student account):** a 20 KB PDF returned 200 "Resume uploaded successfully"; a 2.1 MB PDF 413 `FILE_TOO_LARGE` "Resume must not exceed 2 MB"; a `.docx` 400 `INVALID_FILE_TYPE` "Only PDF resumes are allowed". Evidence: `docs/testing/evidence/identity-render-results.json`. |
| Status | Pass |
| Automated by      | `server/tests/integration/resume.test.js`.                                                                               |
| Changes from v1.0 | Updated to distinguish the 413 size error from the 400 file-type error.                                                  |

### TC-SEC-01: Password Hashing Using bcrypt

| Field             | Value                                                                                                                                                     |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Requirement(s)    | SEC-1                                                                                                                                                     |
| Type              | Security                                                                                                                                                  |
| Preconditions     | User registration or password creation is available.                                                                                                      |
| Steps             | 1. Create a user account. 2. Inspect the stored password hash in the test environment. 3. Verify the bcrypt cost.                                         |
| Test data         | Test user password.                                                                                                                                       |
| Expected result   | Password is stored as a bcrypt hash using cost 12. The hash begins with `$2b$12$`. Plain-text passwords must not be stored.                               |
| Actual result | **Render, 07-11-2026:** new test account's stored hash starts `$2b$12$`, is 60 characters and does not contain the plain password. Evidence: `docs/testing/evidence/admin-render-results.json` (script `admin-render-run.mjs`). |
| Status | Pass |
| Automated by      | `server/tests/unit/auth-service.test.js` and `server/tests/unit/validate-middleware.test.js`; cost configuration is also documented in `auth.service.js`. |
| Changes from v1.0 | Updated to specify bcrypt cost 12 and the expected hash prefix.                                                                                           |

### TC-SEC-02: Login Rate Limiting

| Field             | Value                                                                                                                         |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Requirement(s)    | SEC-5                                                                                                                         |
| Type              | Security / Boundary                                                                                                           |
| Preconditions     | Login endpoint is available and rate limiting is enabled.                                                                     |
| Steps             | 1. Send ten login requests within the configured rate-limit window. 2. Send an eleventh request. 3. Inspect the response.     |
| Test data         | Eleven login requests from the same IP address.                                                                               |
| Expected result   | The first ten requests are processed according to authentication rules. The eleventh request returns HTTP 429 `RATE_LIMITED`. |
| Actual result | **Render, 06-11-2026: 11 failed logins in under a minute from one machine all returned 401; no 429.** A rerun with `curl` showed `ratelimit-remaining` going 9, 8, 7, 8, 8, 7, 7, 5, 6, 6, 5, 5, i.e. the requests were counted in several separate buckets, so the limit of 10 was never reached. The likely cause is the client IP the API sees behind Render's proxy changing between requests (`TRUST_PROXY=1`); not confirmed. The SVR 4.6 run on 02-11-2026 did get 429 on the 11th login. The limiter passes in the automated suite. Evidence: `docs/testing/evidence/identity-render-results.json`, `docs/testing/evidence/sec02-rerun.txt`. **Retest, Render 07-11-2026, after PR #125 (limiter keyed on the email): the 11th bad login returned 429 `RATE_LIMITED`.** |
| Status | Pass (Render retest 07-11-2026; failed on 06-11, bug #124, fixed) |
| Automated by      | `server/tests/integration/auth.test.js` – authentication rate-limit test.                                                     |
| Changes from v1.0 | Updated to specify the eleventh request and HTTP 429 `RATE_LIMITED`.                                                          |

## 3. New Test Cases

### PROF-1: Student Profile Editing

| Field             | Value                                                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Requirement(s)    | PROF-1                                                                                                                    |
| Type              | Functional                                                                                                                |
| Preconditions     | A student account is registered and authenticated.                                                                        |
| Steps             | 1. Log in as a student. 2. Open the profile page. 3. Edit branch, CGPA, graduation year, and skills. 4. Save the changes. |
| Test data         | Valid branch, CGPA between 0 and 10, graduation year, and skills.                                                         |
| Expected result   | Profile changes are saved and displayed correctly. CGPA must remain within the allowed range.                             |
| Actual result     | Changes saved and persisted on the deployed UI (SVR section 4.3).                                                         |
| Status            | Pass (deployed UI)                                                                                                        |
| Automated by      | Automation mapping to be confirmed from the relevant profile test files.                                                  |
| Changes from v1.0 | New test case for student profile editing.                                                                                |

### PROF-3: Admin Recruiter Approval and Rejection

| Field             | Value                                                                                                                                                                                         |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Requirement(s)    | PROF-3                                                                                                                                                                                        |
| Type              | Functional / Security                                                                                                                                                                         |
| Preconditions     | An admin account and a pending recruiter account exist.                                                                                                                                       |
| Steps             | 1. Log in as admin. 2. Open recruiter management. 3. Approve one pending recruiter. 4. Reject another pending recruiter with a valid reason code. 5. Inspect notifications and audit records. |
| Test data         | Pending recruiters and valid rejection reason codes.                                                                                                                                          |
| Expected result   | Approval and rejection update recruiter status. Rejection requires a reason. Both decisions are audit-logged and generate in-app and email notifications.                                     |
| Actual result | **Render, 07-11-2026:** two new recruiters registered as PENDING. Reject without a reason 400; approve 200 → ACTIVE; reject with `INVALID_COMPANY` 200 → REJECTED; 2 audit entries written. Evidence: `docs/testing/evidence/admin-render-results.json` (script `admin-render-run.mjs`). |
| Status | Pass |
| Automated by      | `server/tests/integration/admin.test.js` – recruiter approval/rejection tests.                                                                                                                |
| Changes from v1.0 | New test case for admin recruiter decisions with reason codes.                                                                                                                                |

### PROF-4: Deactivated Account Token Revocation

| Field             | Value                                                                                                                       |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Requirement(s)    | PROF-4                                                                                                                      |
| Type              | Security / Negative                                                                                                         |
| Preconditions     | A user account has a valid issued authentication token.                                                                     |
| Steps             | 1. Log in and obtain a token. 2. Deactivate the account. 3. Use the previously issued token to access a protected endpoint. |
| Test data         | Previously valid authentication token belonging to the deactivated account.                                                 |
| Expected result   | The previously issued token is rejected because the account is deactivated.                                                 |
| Actual result | **Render, 07-11-2026:** new test student logged in (`/auth/me` 200); admin deactivated it (200, DISABLED); the same token then got 401 `UNAUTHENTICATED`; a fresh login was refused (403). Evidence: `docs/testing/evidence/admin-render-results.json` (script `admin-render-run.mjs`). |
| Status | Pass |
| Automated by      | Automation mapping to be confirmed from the account-status integration tests.                                               |
| Changes from v1.0 | New test case for token revocation after account deactivation.                                                              |

### DOM-2: One-Offer Policy

| Field             | Value                                                                                            |
| ----------------- | ------------------------------------------------------------------------------------------------ |
| Requirement(s)    | Offer policy / one-offer restriction                                                             |
| Type              | Functional / Negative                                                                            |
| Preconditions     | A student already holds an accepted offer.                                                       |
| Steps             | 1. Authenticate as the student. 2. Attempt to accept another offer. 3. Inspect the API response. |
| Test data         | Student account holding one accepted offer and another offer to accept.                          |
| Expected result   | The second offer acceptance is rejected with HTTP 422 `OFFER_HELD`.                              |
| Actual result | **Render, 06-11-2026:** `recruiter01` moved `student0003`'s application to INTERVIEW then OFFER (200 both); `student0003` then applied to another listing and got **201**, not 422. This matches the code: the one-offer policy is an admin setting that defaults to off (`settings.service.js`), and the deployed setting could not be switched on without the admin account. **Rerun 07-11-2026 with admin:** policy switched on, `student0003` (holds the OFFER) applied again and got **422 `OFFER_HELD`**; policy switched back off. Evidence: `identity-render-results-2.json`, `admin-render-results.json`. |
| Status | Pass |
| Automated by      | API run recorded in the test report; matching Postman collection request.                        |
| Changes from v1.0 | New test case for the one-offer policy.                                                          |

### SEC-6: Audit Log Integrity

| Field             | Value                                                                                                                                                                         |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Requirement(s)    | SEC-6                                                                                                                                                                         |
| Type              | Security                                                                                                                                                                      |
| Preconditions     | Admin account and audit records exist.                                                                                                                                        |
| Steps             | 1. Perform an admin account action or status change. 2. Inspect the generated audit entry. 3. Attempt to edit or delete the audit entry through available application routes. |
| Test data         | Existing audit record and an admin action.                                                                                                                                    |
| Expected result   | Audit entries are created for applicable actions. Application routes do not allow audit entries to be edited or deleted.                                                      |
| Actual result | **Render, 07-11-2026:** the deactivation wrote a `USER_DEACTIVATED` audit entry; PATCH/DELETE probes on audit paths all return 404 (no route edits or deletes entries); the model refuses an update. Evidence: `docs/testing/evidence/admin-render-results.json` (script `admin-render-run.mjs`). |
| Status | Pass |
| Automated by      | Automation mapping to be confirmed from audit-related tests.                                                                                                                  |
| Changes from v1.0 | New test case for audit-log integrity.                                                                                                                                        |

## 4. UI Test Steps

### 4.1 Student Registration

1. Open the registration page.
2. Select the student role.
3. Enter name, email, password, and a valid SRN.
4. Submit the form.
5. Verify successful registration.
6. Try registering again with the same email.
7. Verify the duplicate-email error.

### 4.2 Login

1. Open the login page.
2. Enter valid credentials.
3. Verify successful login and redirection.
4. Log out.
5. Enter an incorrect password and verify the error response.
6. Perform the configured failed-login attempts and check the account-lockout behavior.

### 4.3 Profile Management

1. Log in as a student.
2. Open the profile page.
3. Edit branch, CGPA, graduation year, and skills.
4. Save the profile.
5. Verify that the updated information is displayed.
6. Test resume upload with valid and invalid files.

### 4.4 Admin Screens

1. Log in using an authorized admin account.
2. Open recruiter management.
3. View pending recruiter accounts.
4. Approve a pending recruiter.
5. Reject another pending recruiter with a valid reason.
6. Verify status changes and available audit/notification information.
7. Verify that a non-admin user cannot access admin-only screens.

## 5. Additional Automated Test Case – TC-AUTH-05

### TC-AUTH-05: Verify JWT Expiration

| Field             | Value                                                                                                                                                                                                                                                    |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Requirement(s)    | AUTH-4                                                                                                                                                                                                                                                   |
| Type              | Unit                                                                                                                                                                                                                                                     |
| Preconditions     | JWT configuration is set to 60 minutes.                                                                                                                                                                                                                  |
| Steps             | 1. Log in using valid user credentials through the authentication service. 2. Verify the returned JWT using the configured JWT secret. 3. Check the token's `iat` and `exp` values. 4. Verify that the difference between `exp` and `iat` is 60 minutes. |
| Test data         | Valid user login credentials.                                                                                                                                                                                                                            |
| Expected result   | The JWT should expire exactly 60 minutes after it is issued.                                                                                                                                                                                             |
| Actual result     | The automated test verified the 60-minute expiration successfully.                                                                                                                                                                                       |
| Status            | PASS (local unit test)                                                                                                                                                                                                                                   |
| Automated by      | `server/tests/unit/auth-service.test.js`                                                                                                                                                                                                                 |
| Changes from v1.0 | Added explicit verification of the 60-minute JWT expiration.                                                                                                                                                                                             |

### TC-AUTH-06: Successful Student Registration

| Field             | Value                                                                                                                             |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Requirement(s)    | AUTH-1                                                                                                                            |
| Type              | Positive / Functional                                                                                                             |
| Preconditions     | The student registration page is available. The email and SRN are not already registered.                                         |
| Steps             | 1. Open registration. 2. Select the student role. 3. Enter valid name, email, password, and SRN. 4. Submit the registration form. |
| Test data         | Valid student details with a unique email and SRN.                                                                                |
| Expected result   | Registration succeeds and the student account is created.                                                                         |
| Actual result | **Render, 06-11-2026:** API registration of a new student returned 201 with role STUDENT, status ACTIVE and the SRN. **UI (Playwright/Edge):** the Register form with name, institutional email, SRN and password created the account and opened `/home` ("Welcome, TC"). Evidence: `docs/testing/evidence/identity-render-results.json`, `ui-register-results.json`, `ui-render/auth06-registered.png`. |
| Status | Pass (API and UI) |
| Automated by      | UI manual test; automated mapping to be confirmed.                                                                                |
| Changes from v1.0 | Added a separate positive registration test case.                                                                                 |

## 6. Requirement-to-Test Case Mapping

| Requirement ID | Test Case                                                                            |
| -------------- | ------------------------------------------------------------------------------------ |
| AUTH-1         | TC-AUTH-06 – Successful student registration                                         |
| AUTH-2         | TC-AUTH-01 – Duplicate email registration                                            |
| AUTH-3         | TC-AUTH-02 – Password validation                                                     |
| AUTH-4         | TC-AUTH-05 – JWT expires after 60 minutes (`server/tests/unit/auth-service.test.js`) |
| AUTH-5         | TC-AUTH-03 – Account lockout                                                         |
| AUTH-6         | TC-AUTH-04 – Role-based resume authorization                                         |
| PROF-1         | `server/tests/integration/profile.test.js`, `server/tests/unit/profile-model.test.js`|
| PROF-2         | TC-PROF-01 – Resume upload validation                                                |
| PROF-3         | `server/tests/integration/admin.test.js`                                             |
| PROF-4         | `server/tests/integration/identity-edge-cases.test.js`                               |
| DOM-2          | DOM-2 – One-offer policy                                                             |
| SEC-1          | TC-SEC-01 – Password hashing using bcrypt                                            |
| SEC-2          | Deployment HTTPS verification – pending live execution                               |
| SEC-3          | TC-AUTH-04 – Resume download authorization                                           |
| SEC-4          | `server/tests/integration/identity-flow.test.js`, `server/tests/integration/reliability.test.js`, `server/tests/unit/validate-middleware.test.js` |
| SEC-5          | TC-SEC-02 – Login rate limiting                                                      |
| SEC-6          | `server/tests/integration/audit.test.js`                                             |

### 7. Execution Notes

MongoDB Test Retry

* **Test file:** `tests/unit/user-profile-schema.test.js`
* **Environment:** Local Windows development environment.
* **Execution date:** 3 November 2026.
* **Command:** `npm test -- --runInBand tests/unit/user-profile-schema.test.js`
* **Result:** PASS.
* **Test suites:** 1 passed.
* **Individual tests:** 17 passed, 0 failed.
* **Execution time:** 9.64 seconds.
* **Observation:** The test suite passed independently after the initial full-suite run encountered a MongoMemoryServer startup timeout.


## 8. Changes Summary

* Updated the six requested existing identity and security test cases.
* Retained the existing password-validation test case.
* Added the five requested new test cases: PROF-1, PROF-3, PROF-4, DOM-2, and SEC-6.
* Added TC-AUTH-05 for JWT expiration verification.
* Added TC-AUTH-06 for successful student registration.
* Added UI testing steps for registration, login, profile management, and admin screens.
* Updated requirement-to-test-case mapping.
* Added automation references based on `docs/testing/test-report.md`, Section 3.
* 06-11-2026: executed the remaining cases against the Render build (API scripts and Playwright/Edge UI runs in `docs/testing/evidence/identity-render-run*.mjs`, `ui-register-run.mjs`). TC-SEC-02 failed on Render (no 429).
* 07-11-2026: after the admin password was reset, PROF-3, PROF-4, DOM-2, SEC-6 and TC-SEC-01 were run on Render and pass (`evidence/admin-render-run.mjs`). TC-SEC-02 retested on Render after the #124 fix and passes.
