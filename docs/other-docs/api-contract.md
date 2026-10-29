# API contract (S5)

The shared route and payload spec for every module, taken from the routes in `server/src` on `dev`. The client is built against this page. Each module's own page goes into more detail:
[applications](applications-api.md), [aptitude](aptitude-api.md) and [analytics](analytics-api.md).

Any change to a route, field or error code here must be agreed by all four members in a reviewed PR before code changes, per the README [ground rules](../../README.md#working-agreement).

## Conventions

| Item | Rule |
|:--|:--|
| Base path | `/api` |
| Format | JSON request and response bodies; request body limit 100 kB |
| Auth | `Authorization: Bearer <token>`, token from `POST /api/auth/login` (JWT, `sub` = user id, `role`) |
| Roles | `STUDENT`, `RECRUITER`, `ADMIN`. Admins are seeded, never self-registered |
| IDs | 24-character hex MongoDB ObjectIds |
| Validation | Joi; unknown fields are stripped; any key starting with `$` is rejected (SEC-4) |
| Pagination | `page` (≥ 1, default 1) and `limit` (default 20; max 50, or 100 on listing search) |
| Rate limit | 300 requests per minute per client on `/api`, with standard `RateLimit-*` headers |
| Concurrency | Aptitude documents carry `version`; a stale write returns `409 STALE_VERSION` |

### Error shape

Every error, from every module, uses one shape:

```json
{ "error": { "code": "VALIDATION", "message": "\"title\" is required", "details": [{ "field": "title", "message": "..." }] } }
```

`details` is only present for validation errors. A `500` carries `requestId` instead, so it can be matched to the server log.

| Status | Codes |
|:-:|:--|
| 400 | `VALIDATION`, `REASON_REQUIRED` |
| 401 | `UNAUTHENTICATED`: no token, a bad or expired token, or a disabled account |
| 403 | `FORBIDDEN` (wrong role or inactive account), `NOT_APPROVED`, `NOT_OWNER`, `NOT_LISTING_OWNER` |
| 404 | `NOT_FOUND` |
| 409 | `DUPLICATE`, `CONFLICT`, `ALREADY_APPLIED`, `LISTING_CLOSED`, `STALE_STATUS`, `STALE_VERSION` |
| 422 | `INVALID_TRANSITION`, `NOT_ELIGIBLE` |
| 500 | `INTERNAL` |

## Routes

Auth column: **public**, or the roles allowed. Every non-public route also requires a valid token.

### Health and identity (Member 1)

| Method | Path | Auth | Request | Success |
|:--|:--|:--|:--|:--|
| GET | `/health` | public | | `200 { status: "ok" }` |
| POST | `/auth/register` | public | `name` (2–100), `email`, `password` (8–72), `role?` `STUDENT` \| `RECRUITER` | `201 { user }`. A recruiter starts as pending until an admin approves them |
| POST | `/auth/login` | public | `email`, `password` | `200 { token, user: { id, name, email, role, status } }` |
| GET | `/profile/me` | STUDENT | | `200 { profile }` |
| PUT | `/profile/me` | STUDENT | at least one of `cgpa` (0–10), `branch`, `gradYear`, `skills[]` (≤ 100) | `200 { profile }` |
| PATCH | `/admin/recruiters/:id/approve` | ADMIN | | `200 { user }` |
| PATCH | `/admin/recruiters/:id/reject` | ADMIN | `reasonCode` (required): `INCOMPLETE_PROFILE` \| `INVALID_COMPANY` \| `OTHER` | `200 { user }`, status becomes `REJECTED` |
| PATCH | `/admin/users/:id/deactivate` | ADMIN | | `200 { user }` |

### Listings (Member 2)

| Method | Path | Auth | Request | Success |
|:--|:--|:--|:--|:--|
| GET | `/listings` | public | query: `search`, `location`, `minStipend`, `maxStipend`, `skill`, `deadlineBefore`, `deadlineAfter`, `sortBy` (`deadline` \| `stipend` \| `postedAt` \| `title`), `order`, `page`, `limit` ≤ 100 | `200 { listings, pagination: { page, limit, total, totalPages } }`. `minStipend > maxStipend` returns `400` |
| POST | `/listings` | approved RECRUITER | `company`, `title`, `location`, `mode` (`ONSITE` \| `REMOTE` \| `HYBRID`), `stipend`, `skills[]` (1–10), `deadline` (ISO), `minCgpa?` | `201 { listing }` |
| PATCH | `/listings/:id` | approved RECRUITER, owner | any create field, or `status: "CLOSED"` | `200 { listing }` |

### Applications and notifications (Member 3)

| Method | Path | Auth | Request | Success |
|:--|:--|:--|:--|:--|
| POST | `/applications` | STUDENT | `listingId`, `coverNote?` (≤ 1000) | `201 { applicationId, status: "APPLIED" }` |
| GET | `/applications/mine` | STUDENT | | `200 { items }` |
| GET | `/listings/:id/applications` | RECRUITER, listing owner | query: `status?`, `page`, `limit` ≤ 50 | `200` paginated applicants |
| PATCH | `/applications/:id/status` | RECRUITER, listing owner | `status`, `reasonCode` (required for `REJECTED`) | `200 { status }` |
| GET | `/applications/reject-reasons` | RECRUITER | | `200 { items: [{ code, label }] }` |
| GET | `/notifications` | any role | query: `unread?` | `200 { items }` |
| PATCH | `/notifications/:id/read` | any role, owner | | `200 { notification }` |

Status moves allowed (REV-2): `APPLIED → SHORTLISTED | REJECTED`, `SHORTLISTED → INTERVIEW | REJECTED`, `INTERVIEW → OFFER | REJECTED`. `OFFER` and `REJECTED` are final. Any other move returns `422 INVALID_TRANSITION`. If two moves race on the same application, the second gets `409 STALE_STATUS`.

Reject reasons: `SKILLS_MISMATCH`, `POSITION_FILLED`, `INTERVIEW_NOT_CLEARED`, `INCOMPLETE_PROFILE`, `OTHER`.

### Aptitude tests (Member 4)

| Method | Path | Auth | Request | Success |
|:--|:--|:--|:--|:--|
| POST | `/questions` | ADMIN | `text`, `topic`, `difficulty`, `options[]` (2–6, unique), `answerIdx` | `201` question |
| GET | `/questions` | ADMIN | query: `topic?`, `difficulty?`, `archived` (default false), `page`, `limit` | `200` paginated questions |
| PATCH | `/questions/:id` | ADMIN | any question field or `archived`, plus `version` | `200` question |
| POST | `/tests` | ADMIN | `title`, `durationMin` (10–120), `questionIds[]` (5–60, unique) | `201` test (`DRAFT`) |
| GET | `/tests` | ADMIN, STUDENT | query: `status?`, `page`, `limit`. Students only see `PUBLISHED` tests | `200` paginated tests |
| GET | `/tests/:id` | ADMIN, STUDENT | | `200` test. Students get it without `questionIds`, and an unpublished test returns `404` for them |
| PATCH | `/tests/:id` | ADMIN | any test field or `status`, plus `version` | `200` test |
| POST | `/tests/:id/attempts` | STUDENT | empty body | `201` new attempt, or `200` the existing in-progress one |
| GET | `/attempts/:id` | STUDENT, owner | | `200` attempt with saved answers and `endsAt` |
| PATCH | `/attempts/:id/answers` | STUDENT, owner | `questionId`, `optionIdx` (0–5), `version?` | `204` |
| POST | `/attempts/:id/submit` | STUDENT, owner | empty body | `200` result |
| GET | `/attempts/:id/result` | STUDENT, owner | | `200` score and per-topic breakdown |

### Progress and analytics (Member 4)

| Method | Path | Auth | Request | Success |
|:--|:--|:--|:--|:--|
| GET | `/analytics/me` | STUDENT | | `200 { testsTaken, averageScore, trend, topics, weakestTopics, applications: { total, byStatus } }` for the caller only |
| GET | `/analytics/placements` | ADMIN | query: `branch?`, `gradYear?` (2000–2100) | `200 { filters, students, placedStudents, offersPerCompany, applicationsPerListing, averageScoreByBranch }` |
| GET | `/analytics/placements/export` | ADMIN | same query | `200 text/csv` attachment `placement-report.csv`, same figures as the dashboard |

## Not yet in the contract

These features are in the backlog but have no route yet. Their owners add them here in the same PR that adds the route:

- Resume upload (1.3, #3) and the extra fields on the student profile
- Bookmarks and deadline expiry (2.3, #11), and skill-match recommendations (2.4, #12)