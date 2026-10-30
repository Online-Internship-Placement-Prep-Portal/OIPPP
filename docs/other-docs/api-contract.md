# API contract (S5)

The shared route and payload spec for every module, taken from the routes in `server/src` on `dev`. The client is built against this page. Each module's own page goes into more detail:
[applications](applications-api.md), [aptitude](aptitude-api.md) and [analytics](analytics-api.md).

Any change to a route, field or error code here must be agreed by all four members in a reviewed PR before code changes, per the README [ground rules](../../README.md#working-agreement).

## Conventions

| Item | Rule |
|:--|:--|
| Base path | `/api` |
| Format | JSON request and response bodies; request body limit 100 kB. Resume upload is `multipart/form-data` |
| Auth | `Authorization: Bearer <token>`, token from `POST /api/auth/login` (JWT, `sub` = user id, `role`, expires after 60 minutes) |
| Roles | `STUDENT`, `RECRUITER`, `ADMIN`. Admins are created with `npm run seed`, never self-registered |
| IDs | 24-character hex MongoDB ObjectIds |
| Validation | Joi; unknown fields are stripped; any key starting with `$` is rejected (SEC-4) |
| Pagination | `page` (≥ 1, default 1) and `limit` (default 20; max 50, or 100 on listing search) |
| Rate limit | 300 requests per minute per client on `/api`; 10 per minute on login and registration (SEC-5). Standard `RateLimit-*` headers |
| Concurrency | Aptitude documents carry `version`; a stale write returns `409 STALE_VERSION` |
| Request id | Every response has an `X-Request-Id` header. The server logs one line per request with that id, method, path, status and duration; a `500` body carries the same id |

### Error shape

Every error, from every module, uses one shape:

```json
{ "error": { "code": "VALIDATION", "message": "\"title\" is required", "details": [{ "field": "title", "message": "..." }] } }
```

`details` is present only when there is more to say: validation errors, the existing application on `ALREADY_APPLIED`, `retryAt` on `ACCOUNT_LOCKED`, and the submitted `attemptId` on `ATTEMPT_EXISTS`. A `500` carries `requestId` instead, the same value as the `X-Request-Id` header, so it can be matched to the server log.

| Status | Codes |
|:-:|:--|
| 400 | `VALIDATION` (including malformed JSON), `REASON_REQUIRED`, `RESUME_REQUIRED`, `INVALID_FILE_TYPE`, `INVALID_FILE_CONTENT`, `INVALID_RESUME_ID`, `LISTING_NOT_BOOKMARKABLE`, `INVALID_QUESTIONS`, `INVALID_ANSWER` |
| 401 | `UNAUTHENTICATED`: no token, a bad or expired token, wrong credentials, or a disabled account |
| 403 | `FORBIDDEN` (wrong role or inactive account), `NOT_APPROVED`, `NOT_OWNER`, `NOT_LISTING_OWNER` |
| 404 | `NOT_FOUND`, `RESUME_NOT_FOUND` |
| 409 | `DUPLICATE`, `CONFLICT`, `ALREADY_APPLIED`, `LISTING_CLOSED`, `STALE_STATUS`, `STALE_VERSION`, `TEST_LOCKED`, `ATTEMPT_EXISTS`, `ATTEMPT_CLOSED`, `ATTEMPT_CHANGED`, `ATTEMPT_OPEN` |
| 413 | `FILE_TOO_LARGE` (resume over 2 MB), `PAYLOAD_TOO_LARGE` (JSON body over 100 kB) |
| 422 | `INVALID_TRANSITION`, `NOT_ELIGIBLE`, `OFFER_HELD` (one-offer policy), `BOOKMARK_LIMIT` (100 saved listings) |
| 423 | `ACCOUNT_LOCKED`: 5 failed logins in a row lock the account for 15 minutes (AUTH-5) |
| 429 | `RATE_LIMITED` |
| 500 | `INTERNAL` |
| 503 | `DATABASE_UNAVAILABLE`, `RESULT_UNAVAILABLE` |

## Routes

Auth column: **public**, or the roles allowed. Every non-public route also requires a valid token.

### Health and identity (Member 1)

| Method | Path | Auth | Request | Success |
|:--|:--|:--|:--|:--|
| GET | `/health` | public | | `200 { status: "ok" }` |
| POST | `/auth/register` | public | `name` (2–100), `email`, `password` (8–72, at least one letter and one digit), `role?` `STUDENT` \| `RECRUITER`, `srn` (students only, required: `PES[1-2]UG` + 2 digits + 2 letters + 3 digits, case-insensitive) | `201 { user }`. A recruiter starts as `PENDING` until an admin approves them. A duplicate email or SRN is `409 DUPLICATE` |
| POST | `/auth/login` | public | `email`, `password` | `200 { token, user: { id, name, email, role, status, srn? } }` |
| GET | `/auth/me` | any role | | `200 { user }`, the caller's public user |
| GET | `/profile/me` | STUDENT | | `200 { profile }` |
| PUT | `/profile/me` | STUDENT | at least one of `cgpa` (0–10), `branch` (≤ 100), `gradYear` (2000–2100), `skills[]` (≤ 20, each ≤ 30) | `200 { profile }` |
| POST | `/profile/me/resume` | STUDENT | multipart field `resume`: one PDF, ≤ 2 MB | `200 { message, resumeFileId }`. Replaces the profile resume; applications keep the one they were sent with |
| GET | `/profile/me/resume` | STUDENT | | `200 application/pdf` attachment |
| GET | `/admin/users` | ADMIN | query: `role?`, `status?`, `search?` (name, email or SRN), `page`, `limit` ≤ 50 | `200 { items, total, page }`, newest first. `?role=RECRUITER&status=PENDING` is the approval queue |
| PATCH | `/admin/recruiters/:id/approve` | ADMIN | | `200 { user }`; the recruiter is notified |
| PATCH | `/admin/recruiters/:id/reject` | ADMIN | `reasonCode` (required): `INCOMPLETE_PROFILE` \| `INVALID_COMPANY` \| `OTHER` | `200 { user }`, status becomes `REJECTED`; the recruiter is notified |
| PATCH | `/admin/users/:id/deactivate` | ADMIN | | `200 { user: { id, role, status } }`. The user's tokens stop working at once |
| GET | `/admin/users/:id/resume` | ADMIN | | `200 application/pdf` attachment of the student's current resume |
| GET | `/admin/settings` | ADMIN | | `200 { settings: { oneOfferPolicy } }`; the policy is off by default |
| PATCH | `/admin/settings` | ADMIN | `oneOfferPolicy` (boolean, required) | `200 { settings }`; audit-logged (DOM-2) |

### Listings (Member 2)

| Method | Path | Auth | Request | Success |
|:--|:--|:--|:--|:--|
| GET | `/listings` | public | query: `search` (title, company or skill), `location`, `mode` (`ONSITE` \| `REMOTE` \| `HYBRID`, any case), `minStipend`, `maxStipend`, `skill`, `deadlineBefore`, `deadlineAfter`, `sortBy` (`deadline` \| `stipend` \| `postedAt` \| `title`), `order` (`asc` \| `desc`), `page`, `limit` ≤ 100 | `200 { listings, pagination: { page, limit, total, totalPages } }`. Only open listings before their deadline. `minStipend > maxStipend` returns `400` |
| GET | `/listings/recommendations` | STUDENT | | `200 { listings }`: open listings sharing a skill with the profile and within its CGPA, each with `matchedSkills` and `matchCount`, best match first |
| GET | `/listings/mine` | RECRUITER | | `200 { listings }`: the caller's listings, open and closed, newest first |
| GET | `/listings/:id` | public | | `200 { listing }`, any status |
| POST | `/listings` | approved RECRUITER | `company`, `title`, `location`, `mode` (`ONSITE` \| `REMOTE` \| `HYBRID`), `stipend`, `skills[]` (1–10), `deadline` (ISO, future), `minCgpa?` | `201 { listing }` |
| PATCH | `/listings/:id` | approved RECRUITER, owner | any create field, or `status: "CLOSED"` | `200 { listing }` |
| POST | `/listings/:id/bookmark` | STUDENT | | `201 { bookmark }`. Repeating it returns the same bookmark. A 101st bookmark is `422 BOOKMARK_LIMIT` (SRCH-4) |
| DELETE | `/listings/:id/bookmark` | STUDENT | | `204` |
| GET | `/bookmarks/mine` | STUDENT | | `200 { items }` newest first, each with the listing populated |

Listings close automatically once their deadline passes.

### Applications and notifications (Member 3)

| Method | Path | Auth | Request | Success |
|:--|:--|:--|:--|:--|
| POST | `/applications` | STUDENT | `listingId`, `coverNote?` (≤ 1000) | `201 { applicationId, status: "APPLIED" }`. With the one-offer policy on, a student holding an `OFFER` gets `422 OFFER_HELD` |
| GET | `/applications/mine` | STUDENT | | `200 { items }` |
| GET | `/listings/:id/applications` | RECRUITER, listing owner | query: `status?`, `page`, `limit` ≤ 50 | `200 { items, total, page }` |
| PATCH | `/applications/:id/status` | RECRUITER, listing owner | `status`, `reasonCode` (required for `REJECTED`) | `200 { status }` |
| GET | `/applications/reject-reasons` | RECRUITER | | `200 { items: [{ code, label }] }` |
| GET | `/applications/:id/resume` | STUDENT owner, RECRUITER listing owner, ADMIN | | `200 application/pdf` (inline): the resume sent with the application |
| GET | `/notifications` | any role | query: `unread?` | `200 { items }`, newest 50 |
| PATCH | `/notifications/:id/read` | any role, owner | | `200 { notification }` |

Status moves allowed (REV-2): `APPLIED → SHORTLISTED | REJECTED`, `SHORTLISTED → INTERVIEW | REJECTED`, `INTERVIEW → OFFER | REJECTED`. `OFFER` and `REJECTED` are final. Any other move returns `422 INVALID_TRANSITION`. If two moves race on the same application, the second gets `409 STALE_STATUS`.

Reject reasons: `SKILLS_MISMATCH`, `POSITION_FILLED`, `INTERVIEW_NOT_CLEARED`, `INCOMPLETE_PROFILE`, `OTHER`.

### Aptitude tests (Member 4)

| Method | Path | Auth | Request | Success |
|:--|:--|:--|:--|:--|
| POST | `/questions` | ADMIN | `text`, `topic`, `difficulty`, `options[]` (2–6, unique), `answerIdx` | `201` question |
| GET | `/questions` | ADMIN | query: `topic?`, `difficulty?`, `archived` (default false), `page`, `limit` | `200 { items, page, total }` |
| PATCH | `/questions/:id` | ADMIN | any question field or `archived`, plus `version` | `200` question |
| POST | `/tests` | ADMIN | `title`, `durationMin` (10–120), `questionIds[]` (5–60, unique) | `201` test (`DRAFT`) |
| GET | `/tests` | ADMIN, STUDENT | query: `status?`, `page`, `limit`. Students only see `PUBLISHED` tests | `200 { items, page, total }`. For students each item also has `myAttempt: { attemptId, status }` or `null` |
| GET | `/tests/:id` | ADMIN, STUDENT | | `200` test. Students get it without `questionIds`, and an unpublished test returns `404` for them |
| PATCH | `/tests/:id` | ADMIN | any test field or `status`, plus `version` | `200` test |
| POST | `/tests/:id/attempts` | STUDENT | empty body | `201` new attempt, or `200` the existing in-progress one. A submitted one is `409 ATTEMPT_EXISTS` with its `attemptId` |
| GET | `/attempts/:id` | STUDENT, owner | | `200` attempt with saved answers, `endsAt` and `serverTime` |
| PATCH | `/attempts/:id/answers` | STUDENT, owner | `questionId`, `optionIdx` (0–5), `version?` | `204` |
| POST | `/attempts/:id/submit` | STUDENT, owner | empty body | `200` result |
| GET | `/attempts/:id/result` | STUDENT, owner | | `200` score and per-topic breakdown |

### Progress and analytics (Member 4)

| Method | Path | Auth | Request | Success |
|:--|:--|:--|:--|:--|
| GET | `/analytics/me` | STUDENT | | `200 { testsTaken, averageScore, trend, topics, weakestTopics, applications: { total, byStatus } }` for the caller only |
| GET | `/analytics/placements` | ADMIN | query: `branch?`, `gradYear?` (2000–2100) | `200 { filters, students, placedStudents, offersPerCompany, applicationsPerListing, averageScoreByBranch }`. Figures are cached per filter for 5 minutes (SAD 3.4) |
| GET | `/analytics/placements/export` | ADMIN | same query | `200 text/csv` attachment `placement-report.csv`, same figures as the dashboard |
