# Aptitude authoring and timed attempts — tasks 4.1 / 4.2

## Delivery boundary

Backend implementation for issues #25 and #26. Feature branch changes require team review.
There is no `client/` application in the inspected `dev` baseline: this delivers REST APIs,
not an admin form, test-taking screen, or browser auto-save wiring. The real JWT middleware
is reused unchanged. It still depends on Member 1's missing
`server/src/modules/users/user.model.js`; do not replace it with a permissive development
login. Integration tests use the repository's existing fake-auth pattern; separate unit
checks exercise real JWT verification and disabled-account denial with a virtual identity model.

## Run and verify

```sh
cd server
npm ci
cp .env.example .env
# Configure a real JWT secret and a transaction-capable MONGO_URI.
npm run lint
npm test
npm start
```

Use MongoDB Atlas or a replica set. Standalone MongoDB is intentionally rejected at startup:
closing an Attempt and creating its Result must commit atomically. For local development,
with Docker installed, initialize a single-node development replica set:

```sh
docker run -d --name oippp-mongo -p 27017:27017 mongo:7 --replSet rs0 --bind_ip_all
docker exec oippp-mongo mongosh --quiet --eval 'rs.initiate({_id:"rs0",members:[{_id:0,host:"localhost:27017"}]})'
# In server/.env (local only):
# MONGO_URI=mongodb://localhost:27017/oippp?replicaSet=rs0
```

This example is not a production deployment recipe. Containerized API deployments must use
replica-set member hostnames reachable by that API. The API initializes Question, Test,
Attempt and Result indexes before listening. Repair pre-existing duplicates before deployment;
do not drop the unique student/test or attempt/result indexes. Integration tests provision a
MongoMemoryReplSet and do not require your development database. The first run downloads MongoDB.

## API contract

All paths below have `/api` prefix and require `Authorization: Bearer <session JWT>`.
Recruiters cannot access aptitude authoring or student attempts. Identity supplies ADMIN / STUDENT
and checks current account status on every request. Object IDs must be 24-character hexadecimal.
Bodies and filters pass Joi/operator-key validation. IDs and server timestamps come from the
server; clients cannot choose an attempt owner, start time, deadline or score.

### Admin question bank

| Method | Path | Input / behavior |
| --- | --- | --- |
| POST | `/questions` | `{text,topic,difficulty,options,answerIdx}`; 201 admin question DTO |
| GET | `/questions` | Optional `topic`, `difficulty`, `archived` (default false), `page` (1), `limit` (20, max 50); `{items,page,total}` |
| PATCH | `/questions/:id` | `version` and at least one changed question field or `archived`; 200 updated DTO |

Topics: Quantitative, Logical, Verbal, Technical. Difficulties: Easy, Medium, Hard.
Provide 2–6 distinct nonblank options and one zero-based correct `answerIdx` within their range.
Text is limited to 4,000 characters, each option to 1,000. Admin DTOs deliberately include keys
so admins can edit them; only admin routes use these DTOs. Students never get question-bank
access. Archiving is soft deletion. Changing a bank question affects future snapshots only;
previous attempts retain the original question, options and scoring key.

### Admin test creation and publication

| Method | Path | Input / behavior |
| --- | --- | --- |
| POST | `/tests` | `{title,durationMin,questionIds}`; 201 DRAFT, title max 200, duration 10–120 integer minutes, 5–60 distinct active questions |
| GET | `/tests` | Pagination; admin may filter `status`; students see only PUBLISHED metadata regardless of status filter |
| GET | `/tests/:id` | Admin sees metadata + questionIds; student sees only published metadata |
| PATCH | `/tests/:id` | `version` + changed draft fields and/or `status` |

Publish with `{ "version": 0, "status": "PUBLISHED" }` after draft creation. Publication
revalidates all referenced questions. Only DRAFT content is editable. PUBLISHED can only become
ARCHIVED; archived tests cannot be republished (create a new test instead). Published/archived
content changes return `409 TEST_LOCKED`. Existing attempts can resume after a test is archived;
new attempts require a published test and active questions. This is a bank-reference model,
not a frozen published-test revision: review bank edits to avoid changing future students' versions.
Admin edits require the current DTO `version`; stale writes return `409 STALE_VERSION`.

### Student timed attempts

| Method | Path | Behavior |
| --- | --- | --- |
| POST | `/tests/:id/attempts` | Empty body; 201 new or 200 existing in-progress attempt; 409 ATTEMPT_EXISTS after submission |
| GET | `/attempts/:id` | Owner-only persisted attempt view, including after refresh/reconnect |
| PATCH | `/attempts/:id/answers` | `{questionId,optionIdx,version?}`; 204 only after database acknowledgement |
| POST | `/attempts/:id/submit` | Empty body; 200 canonical Result; safe to repeat |
| GET | `/attempts/:id/result` | Owner-only canonical Result; 409 ATTEMPT_OPEN before submission |

The public attempt contains `attemptId,testId,status,startedAt,endsAt,questions,answers,version`
and available save/submission timestamps. Each public question contains only
`questionId,text,topic,difficulty,options` — never `answerIdx`. An attempt snapshots its keys
server-side and its original duration/deadline. A unique `(studentId,testId)` index handles
concurrent starts; the losing request resumes the existing attempt rather than creating another.
Submitted attempts are never reopened or deleted by a TTL job.

Saves update only the selected answer-map key, not a stale whole map. They condition on owner,
IN_PROGRESS, current document version, and the database server's current time being before endsAt.
Concurrent changes return 409 ATTEMPT_CHANGED; supplied stale versions return 409 STALE_VERSION.
Sequential saves without a client version are last-accepted-write-wins for the same question.
Unknown snapshot questions and out-of-range options return 400 INVALID_ANSWER. Another student's
attempt or result returns 404, without disclosing its contents. Missing records return 404;
invalid IDs/bodies return 400; unauthenticated/unauthorized roles return 401/403.

## Required client integration (not implemented in this backend-only repository)

1. Start/resume, render public questions and restore saved selections from the returned answers.
2. Send a PATCH immediately on selection (the requirement is within one second). Serialize
   pending saves per attempt, show Saving until 204, and only then show Saved. A 204 contains no
   body: refresh the attempt/version when needed. Use the optional version for stale-screen detection.
3. On a 409 change/version conflict, reload, reconcile the pending selection, and retry only while
   the returned attempt is IN_PROGRESS and before the original deadline. Do not blindly replay
   conflicting writes from multiple tabs. Do not show unsaved offline choices as durable.
4. On reconnect/refresh fetch the existing attempt; never reset the clock or create a second attempt.
5. On submit wait for pending acknowledged saves, then POST submit. Render score/topicBreakdown;
   recover an uncertain submit response with the same endpoint or GET result.
6. On terminal/expired responses stop editing. Browser timers are presentation only.

There is no claim that end-to-end UI auto-save, selection-to-save timing, or p95 performance has
been verified. Only server acknowledgement and persistence are implemented and tested here.

## Deadline policy — explicit proposal requiring team review

The submitted TST-5 requires server expiry at endsAt and rejects answers more than 30 seconds
late, but leaves the intervening 0–30 seconds ambiguous. This implementation chooses a **hard
cutoff at endsAt**: no additional answer grace window. All answers at/after the server deadline
are rejected, including those within 30 seconds. A request admitted to HTTP before the deadline
but reaching the guarded database update after it is also rejected. Synchronize API/database
clocks operationally. This policy is not asserted to be team-approved; resolve it in PR review.
Do not implement a 30-second client clock extension.

The timeout job runs immediately on startup and every second, scans oldest overdue active
attempts in batches of 100, and does not overlap itself. Errors are logged and retried on later
sweeps; one failed finalization does not abort the other attempts in that batch. Every resume,
read, late save, and submit also checks expiry. Expiry blocks writes at the deadline even if the
periodic job is delayed; Result materialization is eventually caught up, not guaranteed exactly
at the deadline under outages or a large backlog. Attempt data is never discarded on failure.
The job uses the same finalization path as manual submission; replica-set transactions retry
write conflicts and produce one canonical Result. Closing and result insertion roll back together.
A legacy submitted attempt missing its result returns 503 RESULT_UNAVAILABLE for explicit recovery,
not a fabricated score or silent reopening.

Minimal synchronous evaluation is included because submit/expiry must produce a durable Result:
one point per correct answer, unanswered = zero, no negative marking, percentage score and topic
breakdown from snapshot keys. This does not mark the separate scoring/analytics/backlog tasks
complete and does not add readiness dashboards, cohort analytics or a Python service.

## Validation evidence

`npm run lint`: passed. `npm test`: 13 suites / 143 tests passed at implementation handoff.
49 new cases cover authoring permissions/validation, filtering/archive/publication, key redaction,
concurrent starts, acknowledged saves/reload, stale versions, owner isolation, immutable snapshots,
expiry (including 0–30 seconds), background catch-up, simultaneous finalization, submission/save
races, transactional rollback and retry, worker lifecycle, and real JWT/disabled-account checks.
The remaining 94 cases are the existing module/schema regression suite. No load-test or browser
acceptance/coverage threshold claim is made. Team review and Member 1/frontend integration remain.
