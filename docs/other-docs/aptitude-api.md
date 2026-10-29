# Aptitude authoring, timed attempts and scoring — tasks 4.1 / 4.2 / 4.3 / 4.5

## Delivery boundary

Backend implementation for issues #25, #26, #27 (scoring) and #29 (refresh/reconnect). Feature branch changes require team review.
There is no `client/` application in the inspected `dev` baseline: this delivers REST APIs,
not an admin form, test-taking screen, or browser auto-save wiring. The real JWT middleware
is reused unchanged. The current integrated `dev` now provides Member 1's User, auth, profile
and admin modules; the conflict resolution retains those routes alongside aptitude, listings,
applications and notifications. Verify real login and client integration end-to-end; do not add
a permissive development login. Aptitude integration tests use the repository's existing fake-auth
pattern with fixtures satisfying the real User schema. Separate unit checks exercise real JWT
verification and disabled-account denial with a mocked identity-module boundary.

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
| POST | `/attempts/:id/submit` | Empty body; 200 result view; safe to repeat |
| GET | `/attempts/:id/result` | Owner-only result view; 409 ATTEMPT_OPEN before submission |

The public attempt contains `attemptId,testId,status,startedAt,endsAt,questions,answers,version`,
`serverTime`, available save/submission timestamps and `submissionReason` (`MANUAL` or `TIMEOUT`)
once closed. Clients compute remaining time as `endsAt − serverTime`, so a skewed device clock
neither shortens nor extends the test. Each public question contains only
`questionId,text,topic,difficulty,options` — never `answerIdx`. An attempt snapshots its keys
server-side and its original duration/deadline. A unique `(studentId,testId)` index handles
concurrent starts; the losing request resumes the existing attempt rather than creating another.
Submitted attempts are never reopened or deleted by a TTL job.

Saves update only the selected answer-map key, not a stale whole map. They condition on owner,
IN_PROGRESS, current document version, and the database server's current time being before endsAt.
Concurrent changes return 409 ATTEMPT_CHANGED; supplied stale versions return 409 STALE_VERSION.
A save whose answer is already stored is acknowledged with 204 without another write, even with
the old version: this is the retry after a lost response, so it must not look like a conflict.
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

## Auto-evaluation and per-topic breakdown — task 4.3 (TST-6)

Scoring runs on the server inside the same transaction that closes the attempt, for manual
submits and timeouts alike. It reads only the attempt's snapshotted keys, never today's bank or
client totals. One point per correct answer, unanswered = zero, no negative marking; `score` and
each topic `percentage` are `100 × correct / total` (unrounded). Only assessed topics appear,
always in the order Quantitative, Logical, Verbal, Technical. Topic counts sum to the totals, and
the Result model rejects any record where they do not.

```json
{ "resultId": "…", "attemptId": "…", "testId": "…", "totalQuestions": 6, "correctAnswers": 3,
  "score": 50, "submittedAt": "2026-10-29T10:05:00.000Z",
  "topicBreakdown": [
    { "topic": "Quantitative", "totalQuestions": 2, "correctAnswers": 1, "percentage": 50 },
    { "topic": "Technical", "totalQuestions": 4, "correctAnswers": 2, "percentage": 50 } ] }
```

The result view omits the owner ID and internal fields. Per-question review (revealing keys after
submission) is deliberately not offered: bank questions are reused across tests.

## Refresh and dropped-connection verification — task 4.5 (SAFE-1)

| Scenario | Server behavior | Test |
| --- | --- | --- |
| Browser refresh | `GET /attempts/:id` returns every acknowledged answer, the original `endsAt` and `serverTime`. | `aptitude-recovery` › refresh |
| Tab closed and test reopened | `POST /tests/:id/attempts` returns 200 with the same attempt; the clock is not restarted. | › reopening |
| Response lost after a save | Retrying the same answer returns 204 with no new version; a different stale answer is 409. | › dropped connection |
| Deadline passes while offline | On reconnect the attempt is `SUBMITTED` / `TIMEOUT`, scored from saved answers; later saves are 409. | › deadline passes while offline |
| API or database restart | Answers and deadline are persisted; the startup sweep finalizes attempts that expired meanwhile. | › API restart |

An answer that never got its 204 is not promised durable; the client must show it as unsaved.
Browser-level checks (save indicator, reconnect banner, countdown) wait for the client.

## Validation evidence

Tasks 4.3/4.5/4.7 add `tests/unit/aptitude-scoring.test.js` (all-correct, all-wrong, unanswered,
option 0, mixed-topic sums, canonical ordering, DTO) and `tests/integration/aptitude-recovery.test.js`
(the table above), plus sweep-failure retry and version-error mapping. `aptitude.service.js` and
`aptitude.routes.js` reach 100% line coverage.

Earlier (PR #53): `npm run lint`: passed. `npm test`: 17 suites / 181 tests passed after integrating the latest dev and resolving PR #53 conflicts.
49 new cases cover authoring permissions/validation, filtering/archive/publication, key redaction,
concurrent starts, acknowledged saves/reload, stale versions, owner isolation, immutable snapshots,
expiry (including 0–30 seconds), background catch-up, simultaneous finalization, submission/save
races, transactional rollback and retry, worker lifecycle, and real JWT/disabled-account checks.
The remaining 132 cases are the integrated module/schema regression suite. No load-test or browser
acceptance/coverage threshold claim is made. Team review and end-to-end frontend/authentication integration remain.
