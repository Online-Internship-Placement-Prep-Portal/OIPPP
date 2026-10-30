# Applications & Notifications API (Member 3)

Implements SRS 4.5 (APP-1..5), 4.6 (REV-1..4), BR-2, BR-3, BR-5/DOM-2, SEC-6 and SAD 4.3.3. Base path `/api`,
`Authorization: Bearer <token>`, errors in the SAD 4.3 shape `{ error: { code, message, details } }`.

| Method | Endpoint | Role | Request | Response | Errors |
|:--|:--|:--|:--|:--|:--|
| POST | `/applications` | Student | `{ listingId, coverNote? (≤1000) }` | `201 { applicationId, status }` | 404, 409 `LISTING_CLOSED`, 409 `ALREADY_APPLIED` (details carry the existing id), 422 `NOT_ELIGIBLE`, 422 `OFFER_HELD` |
| GET | `/applications/mine` | Student | – | `200 { items[] }` newest first, each with `listing` and `history` (newest first) | – |
| GET | `/listings/:id/applications` | Owning recruiter | `?status&page&limit(≤50)` | `200 { items[], total, page }` with student summary + `resumeUrl` | 403 `NOT_LISTING_OWNER`, 404 |
| PATCH | `/applications/:id/status` | Owning recruiter | `{ status, reasonCode? }` | `200 { status }` | 400 `REASON_REQUIRED`, 403 `NOT_LISTING_OWNER`, 404, 409 `STALE_STATUS`, 422 `INVALID_TRANSITION` |
| GET | `/applications/reject-reasons` | Recruiter | – | `200 { items: [{ code, label }] }` | – |
| GET | `/applications/:id/resume` | Applicant, owning recruiter, admin | – | `200` the PDF sent with the application (inline) | 403, 404 `RESUME_NOT_FOUND` |
| GET | `/notifications` | Any | `?unread=true` | `200 { items[] }` | – |
| PATCH | `/notifications/:id/read` | Owner | – | `200 { notification }` | 404 |

## State machine (REV-2)

```
APPLIED ──► SHORTLISTED ──► INTERVIEW ──► OFFER
   │             │              │
   └─────────────┴──────────────┴──► REJECTED (reasonCode required)
```

Rejection reasons (REV-3): `SKILLS_MISMATCH`, `POSITION_FILLED`, `INTERVIEW_NOT_CLEARED`,
`INCOMPLETE_PROFILE`, `OTHER`.

## One-offer policy (BR-5, DOM-2)

Off by default, so a student holding an offer can keep applying. An admin turns it on with
`PATCH /api/admin/settings { oneOfferPolicy: true }` (audit-logged as `SETTINGS_UPDATED`). While it is on, a student
with any application in `OFFER` gets `422 OFFER_HELD` on `POST /applications`. Existing applications are not touched.

## Collections

- **applications**: `studentId, listingId, resumeFileId, coverNote, status, rejectReason, history[{from,to,by,reasonCode,at}]`.
  Unique index `(studentId, listingId)` guarantees one application per listing, even under concurrent submits.
- **notifications**: `userId, type, title, message, applicationId, read, email{status,attempts,nextAttemptAt,lastError}`.
  The in-app row is always written first; email failures never fail the request.
- **auditlogs**: `actorId, action, entity, entityId, before, after, at`. Mongoose hooks refuse every update/delete.

## Email delivery (REV-4)

The first send happens inline with the status change. On failure the notification stays `PENDING` and the
retry job (`startEmailRetryJob`, every 60 s) retries after 1, 5 and 15 minutes; after the third retry it is
marked `FAILED`. Without `SMTP_HOST` the mailer uses Nodemailer's JSON transport (demo sandbox).

## Contract with other modules

Models owned by other members are looked up by name in `application.deps.js`. Fields relied on:

| Model | Owner | Fields |
|:--|:--|:--|
| `Listing` | Member 2 (#14) | `recruiterId, title, company, status (OPEN/CLOSED), deadline, minCgpa` |
| `Profile` | Member 1 (#6) | `userId, cgpa, branch, gradYear, skills, resumeFileId` |
| `User` | Member 1 (#6) | `name, email`; roles `STUDENT`, `RECRUITER`, `ADMIN` |
