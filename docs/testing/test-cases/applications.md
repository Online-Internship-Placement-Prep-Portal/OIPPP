# Test cases: applications, review and notifications (v2.0)

Owner: Guru R Bharadwaj (Member 3). Requirements: SRS 4.5 (APP-1 to APP-5), SRS 4.6 (REV-1 to REV-4) and DOM-1.

These are the Test Plan v1.0 section 13 cases, updated to match what was built, and new cases for requirements that v1.0 covered only through the automated suites. The changes rely on [DEVIATIONS.md](../../other-docs/DEVIATIONS.md) and the [applications API](../../other-docs/applications-api.md).

## How to run

- **Environment:** the Part-3 test build in [deployment.md section 6](../../other-docs/deployment.md#6-part-3-test-build-26-nov-2026). API base `https://oippp-api.onrender.com/api`, client `https://oippp-client.onrender.com`.
- **Accounts:** `recruiter01@example.com` (R1), `recruiter02@example.com` (R2), `student0001@students.example.com` (S1), `student0002@students.example.com` (S2). The password for all of them is `Demo12345`.
- **Resume:** before the run, S1 and S2 upload [fixtures/resume.pdf](../fixtures/resume.pdf) on **My profile**. The seeded students have no resume.
- **Listings:** R1 creates these on the **Post a listing** form at the start of the run:

  | Name | Settings |
  |:--|:--|
  | L1 | Open, no minimum CGPA, deadline in 30 days |
  | L2 | Open, deadline in 30 days, then closed by R1 with **Close** in **My listings** (or `PATCH /listings/:id` with `{"status":"CLOSED"}`) |
  | L3 | Open, minimum CGPA 8.0, deadline in 30 days |

  The seeded listings have random CGPA limits, so the run uses its own.
- **Email:** the API sends to the team's Mailtrap sandbox inbox. Open the inbox before steps that check email.
- **Recording:** fill in Actual result and Status for each case, with the environment, date and commit. The build commit is in deployment.md section 6.

"Automated by" names the Jest file and test under `server/tests/` that cover the same behaviour. All 486 server tests passed locally on 2 Nov 2026 at commit `f044d21`.

## Summary

| TC | Title | Requirements | v1.0 → v2.0 |
|:--|:--|:--|:--|
| TC-APP-01 | Apply once and record history | APP-1, APP-4 | Updated |
| TC-APP-02 | Reject applying to a closed listing or when not eligible | APP-2, APP-3, DOM-1 | Updated |
| TC-APP-03 | My Applications: status and history, newest first | APP-5 | New |
| TC-APP-04 | Eligibility boundary: CGPA equal to the minimum | APP-3, DOM-1 | New |
| TC-REV-01 | Status transitions and notification | REV-2, REV-3, REV-4 | Updated |
| TC-REV-02 | Recruiter sees applicants of own listings only | REV-1 | New |
| TC-REV-03 | Full lifecycle to Offer, and rejection with a reason | REV-2, REV-3, APP-4 | New |
| TC-REV-04 | Two recruiters' tabs change the same application at once | REV-2, APP-4 | New |
| TC-REV-05 | Notification bell: list and mark read | REV-4 | New |

---

### TC-APP-01: Apply once and record history
| Field | Value |
|:--|:--|
| Requirement(s) | APP-1, APP-4 |
| Type | Functional |
| Preconditions | S1 has a resume and no application to L1. L1 is open. |
| Steps | **API:** 1. As S1, `POST /applications` with `{listingId: L1, coverNote}`. 2. Send the same request again. 3. `GET /applications/mine`. 4. As R1, open the bell or `GET /notifications`.<br>**UI:** 1. As S1, open L1 from Search, write the cover note and press **Submit application**. 2. Reload L1. 3. Open **My applications** and press **History**. |
| Test data | L1; a 200-character cover note. For the boundary, a 1,000-character note is accepted and a 1,001-character note is refused. |
| Expected result | Step 1: 201 `{applicationId, status: "APPLIED"}`. Step 2: 409 `ALREADY_APPLIED`, "You have already applied to this internship", and `details` carries the existing `applicationId`. Step 3: one item for L1 whose history has one entry, `null → APPLIED`, with the actor and time. Step 4: R1 has an `APPLICATION_RECEIVED` notification, "New application for <L1 title>". UI: after applying, the page says "You have applied to this internship" instead of showing the form, and the counter under the cover note shows `n/1000`. The application stores the resume, and **Resume sent** in My applications opens it. A 1,001-character note disables **Submit application** and the API returns 400. |
| Actual result | |
| Status | Not run |
| Automated by | `integration/apply.test.js`: "first apply is 201 APPLIED, second is 409, list shows one entry", "stores the current resume and notifies the recruiter in-app"; `integration/reliability.test.js`: "concurrent submits create exactly one application" |
| Changes from v1.0 | Response body and the `ALREADY_APPLIED` details now match the API contract (DEVIATIONS row 18 for the shared error table). Added: recruiter notification, stored resume, the 1,000-character limit (APP-1) and UI steps. |

### TC-APP-02: Reject applying to a closed listing or when not eligible
| Field | Value |
|:--|:--|
| Requirement(s) | APP-2, APP-3, DOM-1 |
| Type | Functional (negative) |
| Preconditions | L2 is closed. L3 has minimum CGPA 8.0. S2's profile CGPA is set to 7.4 on **My profile**. |
| Steps | **API:** 1. As S2, `POST /applications` for L2. 2. As S2, apply to L3. 3. As R1, apply to L1.<br>**UI:** 1. As S2, open L2. 2. Open L3 and press **Submit application**. |
| Test data | L2, L3; S2 with CGPA 7.4 |
| Expected result | Step 1: 409 `LISTING_CLOSED`, "Applications for this internship are closed". Step 2: 422 `NOT_ELIGIBLE`, "Minimum CGPA required is 8.0". Step 3: 403, because only students can apply. UI: L2 shows Status **Closed** and the warning "Applications for this internship are closed." with no form. L3 shows the error banner naming 8.0. No application is created in either case. |
| Actual result | |
| Status | Not run |
| Automated by | `integration/apply.test.js`: "closed listing is 409 LISTING_CLOSED with the SRS message", "past deadline counts as closed", "CGPA below minimum is 422 naming 8.0", "recruiters cannot apply" |
| Changes from v1.0 | Error code `NOT_ELIGIBLE` and the exact messages added. A listing past its deadline counts as closed even before the deadline job runs. DOM-1 is now traced here. |

### TC-APP-03: My Applications: status and history, newest first
| Field | Value |
|:--|:--|
| Requirement(s) | APP-5 |
| Type | Functional |
| Preconditions | S1 applied to L1 (TC-APP-01), then to L3, with CGPA 8.0 or more (TC-APP-04). R1 has shortlisted S1 on L1. |
| Steps | **API:** 1. As S1, `GET /applications/mine`. 2. As S2, `GET /applications/mine`.<br>**UI:** 1. As S1, open **My applications**. 2. Press **History** on L1. |
| Test data | S1, S2 |
| Expected result | Step 1: the L3 application comes before L1 (newest first). Each item has `listing` (title, company, status, deadline) and `history` newest first: L1 shows `APPLIED → SHORTLISTED`, then `null → APPLIED`. Step 2: S2 sees none of S1's applications. UI: the table shows Internship, Company, Applied and Status, and the History dialog lists each change with its time. |
| Actual result | |
| Status | Not run |
| Automated by | `integration/apply.test.js`: "my applications are newest first", "a student can see only their own applications" |
| Changes from v1.0 | New. v1.0 covered APP-5 only in the automated suite. |

### TC-APP-04: Eligibility boundary: CGPA equal to the minimum
| Field | Value |
|:--|:--|
| Requirement(s) | APP-3, DOM-1 |
| Type | Boundary |
| Preconditions | L3 has minimum CGPA 8.0. |
| Steps | 1. Set S1's profile CGPA to 7.99 and apply to L3. 2. Set it to 8.0 and apply to L3 again. |
| Test data | CGPA 7.99, 8.0 |
| Expected result | Step 1: 422 `NOT_ELIGIBLE`. Step 2: 201 `APPLIED`. A CGPA equal to the minimum is eligible. |
| Actual result | |
| Status | Not run |
| Automated by | `integration/apply.test.js`: "eligible student can apply to the CGPA-gated listing" (above the minimum; the equal case is checked only here) |
| Changes from v1.0 | New |

### TC-REV-01: Status transitions and notification
| Field | Value |
|:--|:--|
| Requirement(s) | REV-2, REV-3, REV-4 |
| Type | Functional |
| Preconditions | Application A1 (S1 on L1) is APPLIED. R1 owns L1. The Mailtrap inbox is open. |
| Steps | **API:** 1. As R1, `PATCH /applications/A1/status` `{status: "SHORTLISTED"}`. 2. `{status: "APPLIED"}`. 3. `{status: "REJECTED"}` with no `reasonCode`. 4. As S1, `GET /notifications`. Check the Mailtrap inbox.<br>**UI:** 1. As R1, open **My listings → Applicants** for L1 and press **Move to Shortlisted** on S1. 2. Press **Reject**, leave the reason empty and confirm. 3. As S1, open the bell. |
| Test data | A1 |
| Expected result | Step 1: 200 `{status: "SHORTLISTED"}`. Step 2: 422 `INVALID_TRANSITION`, "Cannot move an application from SHORTLISTED to APPLIED". Step 3: 400 `REASON_REQUIRED`, with `details` listing the five reason codes; A1 stays SHORTLISTED. Step 4: one `APPLICATION_STATUS` notification, "<L1 title>: Shortlisted". Within 2 minutes, one email to `student0001@students.example.com` with the same subject arrives in Mailtrap. Nothing is sent for the refused steps. UI: the reject dialog shows "Choose a reason" and does not submit. |
| Actual result | |
| Status | Not run |
| Automated by | `integration/status.test.js`: "shortlist 200, back to APPLIED 422 INVALID_TRANSITION, one notification + one email"; `integration/review.test.js`: "reject without a reason is 400 REASON_REQUIRED"; `integration/notifications.test.js`: "writes the in-app row and sends one email", "failed email keeps the row and retries 3 times (1, 5, 15 min), then FAILED", "a retry succeeds once mail is back" |
| Changes from v1.0 | The email check now uses the Mailtrap sandbox (the v1.0 run used a local inbox). Error codes `INVALID_TRANSITION` and `REASON_REQUIRED` added. Retry rule: a failed email is retried after 1, 5 and 15 minutes, then marked FAILED, by the in-process job (DEVIATIONS row 4). Retries are proven by the Jest test only, because Mailtrap does not fail on request. |

### TC-REV-02: Recruiter sees applicants of own listings only
| Field | Value |
|:--|:--|
| Requirement(s) | REV-1 |
| Type | Functional, Security |
| Preconditions | S1 and S2 have applied to L1 (S2 can apply to L1 because it has no minimum CGPA). |
| Steps | **API:** 1. As R1, `GET /listings/L1/applications`. 2. Add `?status=SHORTLISTED`. 3. Add `?limit=51`. 4. As R1, `GET /applications/<id>/resume` using a `resumeUrl` from step 1. 5. As R2, repeat steps 1 and 4.<br>**UI:** 1. As R1, open **Applicants** for L1, filter Status to Shortlisted, and press **Resume**. |
| Test data | L1, R1, R2 |
| Expected result | Step 1: 200 `{items, total, page}`. Each item has the student's name, branch, graduation year, CGPA, skills, cover note, status and `resumeUrl`. Step 2: only shortlisted applicants. Step 3: 400 (the page size is at most 50). Step 4: 200 `application/pdf`, the resume sent with the application. Step 5: 403 `NOT_LISTING_OWNER` for both. UI: the table shows Student, Profile, Applied and Status, and the resume opens in the viewer. |
| Actual result | |
| Status | Not run |
| Automated by | `integration/review.test.js`: "owner sees applicants with profile summary and resume link, filterable by status", "another recruiter is refused", "page size is capped at 50"; `integration/resume.test.js`: "listing owner can download the application resume", "another recruiter cannot download the application resume" |
| Changes from v1.0 | New. v1.0 covered REV-1 only in the automated suite. The resume route is `GET /applications/:id/resume` (DEVIATIONS row 16). |

### TC-REV-03: Full lifecycle to Offer, and rejection with a reason
| Field | Value |
|:--|:--|
| Requirement(s) | REV-2, REV-3, APP-4 |
| Type | Functional |
| Preconditions | A1 is SHORTLISTED (after TC-REV-01). A2 (S2 on L1) is APPLIED. |
| Steps | **API:** 1. As R1, `GET /applications/reject-reasons`. 2. Move A1 to INTERVIEW, then OFFER. 3. Try A1 → REJECTED and A1 → INTERVIEW. 4. Try A2 → INTERVIEW (skipping a stage). 5. A2 → REJECTED with `reasonCode: "NOT_A_CODE"`. 6. A2 → REJECTED with `reasonCode: "SKILLS_MISMATCH"`. 7. Try A2 → SHORTLISTED. 8. As S1 and S2, `GET /applications/mine`.<br>**UI:** in Applicants, the buttons offered for each status are only the allowed next steps; **Reject** opens a dialog with the five reasons. |
| Test data | A1, A2 |
| Expected result | Step 1: five reasons: `SKILLS_MISMATCH`, `POSITION_FILLED`, `INTERVIEW_NOT_CLEARED`, `INCOMPLETE_PROFILE`, `OTHER`, each with a label. Step 2: 200 twice. Step 3: 422 for both (OFFER is final). Step 4: 422. Step 5: 400. Step 6: 200; A2 stores `rejectReason`, and S2's notification and email end with "Reason: Skills do not match the role." Step 7: 422 (REJECTED is final). Step 8: A1's history is APPLIED → SHORTLISTED → INTERVIEW → OFFER, and A2's is APPLIED → REJECTED with the reason; every entry has `from`, `to`, `by` and `at`. |
| Actual result | |
| Status | Not run |
| Automated by | `integration/status.test.js`: "skipping a stage is refused", "full path to OFFER is in history and the audit log; OFFER is final"; `integration/review.test.js`: "a reason outside the list is refused", "reject with a reason stores it and tells the student why", "the reason list is served to the client"; `unit/application-transitions.test.js` |
| Changes from v1.0 | New. The reason list endpoint is an addition (DEVIATIONS row 1). |

### TC-REV-04: Two recruiters' tabs change the same application at once
| Field | Value |
|:--|:--|
| Requirement(s) | REV-2, APP-4 |
| Type | Reliability |
| Preconditions | A new application A3 (S2 on L3, after setting S2's CGPA to 8.0 or more) is APPLIED. R1 has a token. |
| Steps | Send two `PATCH /applications/A3/status` `{status: "SHORTLISTED"}` requests at the same moment, for example two `curl` commands started together with `&` in one shell. Then `GET /listings/L3/applications`. |
| Test data | A3 |
| Expected result | One request returns 200. The other returns 409 `STALE_STATUS`, "The application changed meanwhile, please reload" if the two overlapped, or 422 `INVALID_TRANSITION` if it ran second. A3's history has exactly one `APPLIED → SHORTLISTED` entry and S2 gets one notification. Record which response the second request returned. |
| Actual result | |
| Status | Not run |
| Automated by | None; the conditional update is covered only by code review. Add a test if this case fails. |
| Changes from v1.0 | New. `409 STALE_STATUS` is an addition (DEVIATIONS row 2). |

### TC-REV-05: Notification bell: list and mark read
| Field | Value |
|:--|:--|
| Requirement(s) | REV-4 |
| Type | Functional, UI |
| Preconditions | S1 has at least two unread notifications (after TC-REV-01 and TC-REV-03). |
| Steps | **API:** 1. As S1, `GET /notifications?unread=true`. 2. `PATCH /notifications/<id>/read` for one of them. 3. Repeat step 1. 4. As S2, `PATCH /notifications/<S1's id>/read`. 5. `GET /notifications` with no token.<br>**UI:** 1. As S1, check the bell badge. 2. Open the bell and press **Mark read** on one item. |
| Test data | S1, S2 |
| Expected result | Step 1: S1's unread notifications only, newest first, without the `email` delivery fields. Step 2: 200 with `read: true`. Step 3: one fewer. Step 4: 404, because users can only mark their own. Step 5: 401. UI: the badge count falls by one, and the item changes from unread to read without a reload. |
| Actual result | |
| Status | Not run |
| Automated by | `integration/notifications.test.js`: "lists only my own, filters unread, marks read, hides email state", "requires login" |
| Changes from v1.0 | New. `PATCH /notifications/:id/read` is an addition (DEVIATIONS row 1). |

## Requirement coverage

| Requirement | Test cases |
|:--|:--|
| APP-1 | TC-APP-01 |
| APP-2 | TC-APP-02 |
| APP-3 | TC-APP-02, TC-APP-04 |
| APP-4 | TC-APP-01, TC-REV-03, TC-REV-04 |
| APP-5 | TC-APP-03 |
| REV-1 | TC-REV-02 |
| REV-2 | TC-REV-01, TC-REV-03, TC-REV-04 |
| REV-3 | TC-REV-01, TC-REV-03 |
| REV-4 | TC-REV-01, TC-REV-05 |
| DOM-1 | TC-APP-02, TC-APP-04 |

DOM-2 (one-offer policy) and SEC-6 (audit log) are in [identity.md](identity.md) (#83).
