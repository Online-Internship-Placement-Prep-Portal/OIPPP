# Aptitude, analytics and quality requirements

**Owner:** E S Sukruth — Member 4. **Deliverable:** task 4.8 / issue #32.  
**Review state:** complete documentation proposal; teammate approval required before merge.  
**Baseline:** submitted [SRS v1.0](../Part-1_Deliverables/SRS.pdf), [SAD v1.0](../Part-1_Deliverables/SAD.pdf), and [Test Plan](../Part-1_Deliverables/Test%20Plan.pdf).

## Reading and numbering rules

This document completes only Member 4's three backlog sections. Backlog 5.4 maps to submitted SRS 4.7, backlog 5.5 maps to SRS 4.8, and backlog 6.3 maps to SRS 5.4 with related performance/safety requirements in 5.1/5.2. Existing requirement IDs are retained; no other member's section or approval record is replaced. A statement labeled **Baseline requirement** preserves the submitted requirement. Acceptance/design notes make verification concrete but must not silently change that baseline. The system requirements below describe the intended product, not an assertion that its routes, UI, worker or analytics service already exist.

## 5.4 Aptitude Test Engine

### Purpose, priority and actors

Students practise aptitude and technical questions under a server-controlled timer, then see total and topic-wise performance. Priority is **High** (submitted SRS: benefit 8, penalty 7, cost 6, risk 6). Admins author the bank and tests. Students start/resume their own attempt, select answers, submit and read their own result. Recruiters have no aptitude-authoring or student-test-data privilege. Authentication and active-account enforcement are shared Member 1 dependencies; an untrusted browser never supplies the owner or answer key.

### Main flow

1. An active Admin creates a multiple-choice question with text, allowed topic, difficulty, options and one correct index.
2. The Admin assembles a test, selecting questions and a duration.
3. An authenticated Student starts an available test. The service returns an existing active attempt, rejects an already submitted attempt, or creates a new unique student/test record and question snapshot.
4. The server establishes `startedAt` and `endsAt`. The UI displays remaining time from the server deadline; browser refresh cannot restart the clock.
5. Each answer selection is persisted and acknowledged; the UI distinguishes saving, saved and failed/offline states. A refresh/resume retrieves acknowledged answers and the original deadline.
6. A manual submit or server timeout closes the attempt. Server-side scoring uses the snapshot's private correct answers; a canonical Result carries total and topic percentages. Retries must not produce duplicate attempts/results.

Steps 3–6 describe intended service behavior. The existing schema implementation stores this data but does not implement a timed-test service or worker.

### Functional requirements and acceptance

| ID | Baseline requirement (SRS 4.7.3) | Acceptance elaboration / verification |
| --- | --- | --- |
| TST-1 | An admin can create multiple-choice questions with 2–6 options, exactly one correct option, topic Quantitative/Logical/Verbal/Technical and a difficulty level. | Accept valid 2- and 6-option questions. Reject 1/7 options, an out-of-range/fractional answer index and an unknown topic. Check admin-only authorization and absence of answer keys in student payloads. Model validation is covered; API/RBAC tests remain future work. |
| TST-2 | An admin can assemble a test from 5–60 questions with a duration between 10 and 120 minutes. | Accept both question-count and duration boundaries; reject 4/61 questions and 9/121 minutes. Distinct IDs and integer minutes are current model conventions. The service must verify each referenced Question exists before publishing/starting. |
| TST-3 | Allow a student exactly one submitted attempt per test and return the in-progress attempt if the same test is started again. | Repeated/concurrent starts resolve to one student/test Attempt. Resume returns its ID, saved answers and unchanged endsAt. A submitted attempt cannot be replaced by a new attempt. Verify unique-index enforcement and service handling of duplicate-key races. |
| TST-4 | Save each answer to the server within 1 second of selection while an attempt is in progress. | With the test-plan load, measure selection-to-server-acknowledgement, not just local storage or a 1-second debounce. Test option 0, changed answers, rejected saves and concurrent/stale clients. A save indicator must not report success before acknowledgement. |
| TST-5 | Auto-submit an attempt when its server-side end time passes and reject answers received more than 30 seconds after that time. | An overdue attempt is finalized without relying on the browser remaining open. After endsAt + 30 seconds, answer writes are rejected. Resume never grants extra time. **The policy for the intermediate 0–30-second window is unresolved in the baseline; see the decision record below.** |
| TST-6 | Score immediately on submission and show total score and per-topic percentage. | Score on the server from snapshotted question data, not client totals. Compare all-correct, all-wrong, unanswered and mixed-topic examples to expected counts; totals equal topic sums. Check retries return the same result. Actual request latency and full scoring behavior require future service tests. |

### Data, API and error boundaries

The implemented schema proposal is documented in [aptitude-schema.md](database/aptitude-schema.md). It uses `Question`, `Test`, `Attempt`, and `Result`; one point per correct answer, no negative marking, Easy/Medium/Hard difficulty and percentage score are **current design conventions requiring team agreement**, not additional statements from the submitted SRS. Retain historical attempt snapshots when a bank question changes. The Result collection is the canonical score source; do not also keep an unsynchronized Attempt.score.

SAD 4.3.4 specifies the following intended `/api` routes; this table is traceability, not a new API implementation or unilateral contract revision:

| Method and route | Actor | Payload / response shape |
| --- | --- | --- |
| `POST /questions` | Admin | `{ topic, text, options[], answerIdx, difficulty }` → 201 |
| `POST /tests` | Admin | `{ title, durationMin, questionIds[] }` → 201 |
| `POST /tests/:id/attempts` | Student | Start/resume → 201 new or 200 existing; `{ attemptId, questions, answers, endsAt }`; submitted attempt → 409 ATTEMPT_EXISTS |
| `PATCH /attempts/:id/answers` | Owning Student | `{ questionId, optionIdx }` → 204; closed attempt → 409 ATTEMPT_CLOSED |
| `POST /attempts/:id/submit` | Owning Student | Server finalization → `{ score, topicBreakdown }` |

Detailed start/resume availability, question publication and retry responses remain part of the shared S5 contract. Validate request bodies, derive studentId from the verified session, check ownership and never return `answerIdx`. A minimal resumed payload needs the snapshotted public question fields, saved answers and original endsAt. Result reads need an owner-checked route agreed in S5; none is invented here. Reject unrecognized or unauthorized records without exposing another student's answers.

### Alternate and failure paths

- **Refresh/closed tab/reconnect:** recover acknowledged server answers; compute remaining time from the unchanged deadline. An answer never acknowledged before disconnection is not promised durable; show a clear warning and do not mislabel it saved.
- **Save failure/offline:** show an unsaved state and retry only while permitted by the agreed deadline/status policy. Local buffering may improve UX but never overrides server state or revives a closed attempt.
- **Concurrent start/submit:** unique indexes prevent duplicate records, but services still need idempotency, conflict handling and cross-collection consistency. Use an agreed transactional/recovery strategy; model hooks alone do not provide it.
- **Bank edit:** preserve the attempt snapshot for both display and scoring. Do not read today's answer key for an old attempt.
- **Disabled account:** deny further authenticated access according to the shared security module; retain its attempts/results (SAFE-2).
- **API/worker outage:** report failure honestly and recover overdue attempts after restart; no extra time or data deletion is silently granted. Hosting sleep/restart risk is not solved by a client countdown.

## 5.5 Progress Tracking and Analytics

### Purpose, priority and actors

Students see their own preparation trend, weakest topics and application outcomes. Placement Admins see batch-wide statistics and CSV exports. Priority is **Medium** (benefit 7, penalty 5, cost 6, risk 5). Student analytics are owner-scoped. Batch-wide statistics/exports are Admin-only; Recruiters do not gain batch or student aptitude access through this module.

### Functional requirements and acceptance

| ID | Baseline requirement (SRS 4.8.3) | Acceptance elaboration / verification |
| --- | --- | --- |
| ANL-1 | Show each student a readiness view with test score trend, weakest two topics and counts of applications per status. | Use only the authenticated student's submitted Results and Applications. Trend points carry submission time and score. Show up to two assessed topics; distinguish no assessed topics from 0% performance. Counts match persisted application states. A combined readiness formula is not defined by the baseline and must be agreed before implementation. |
| ANL-2 | Admin statistics include students with at least one offer, offers per company, applications per listing and average test score per branch; filterable by branch and graduation year. | Use a seeded multi-branch/multi-year fixture. Count distinct students with an OFFER once in the placed-student metric even if several offers exist. Group offers by company, applications by listing, and submitted test scores by branch using the agreed cohort semantics. Exclude draft/in-progress attempts from average scores. Apply selected branch/year filters consistently to every metric. |
| ANL-3 | Allow an admin to export the placement report as CSV. | The CSV reflects the same selected cohort and metric values as the dashboard. Check a non-admin is denied, fields with commas/quotes/newlines are escaped, and empty data produces a clear result rather than misleading zeroes. Formula-injection-safe text export is a derived security recommendation. |

### Data provenance and presentation

| Output | Intended source | Boundary / unresolved convention |
| --- | --- | --- |
| Score trend | Result.studentId, submittedAt, score | Chronological submitted results; no answer keys or other students' raw records. |
| Weak topics | Result.topicBreakdown | The aggregation/weighting and tie-break rule require shared agreement. Unassessed topics are not automatically classified weak. |
| Application counts | Application.studentId and status | Include each application exactly once in its current status; preserve the official state names. |
| Offer/student/company metrics | Applications with OFFER joined to Listing | Distinct offered students differs from number of offers. Do not treat an application status as an accepted-offer field absent from the model. |
| Cohort/branch statistics | User ↔ Profile.userId with branch/gradYear, joined to Results/Applications | `Profile` is Member 1's integration model name expected by Member 3. Missing profiles, later branch changes and unknown cohort values must not be silently assigned to a real branch. |
| CSV report | Same authorized aggregate/filter contract as dashboard | Export role/cohort checks apply even when a result is cached. |

SAD 4.3.5 defines intended `GET /analytics/me` and `GET /analytics/placements?branch&gradYear`; the final CSV route, response schema, readiness formula, weak-topic aggregation and cohort-history semantics belong to S5/team review. A dashboard must distinguish loading, failed, empty and populated states; no invented readiness score should appear for a student without data.

The submitted architecture uses an API Analytics Gateway and a private Python/Flask engine with **read-only** MongoDB credentials. The API controls authorization and any cache/persistence. A five-minute cache is an SAD design choice, not an implemented freshness guarantee; a later design must specify invalidation or label stale data after new results/status changes. Do not let a read-only Python component write a readiness snapshot (the older test sequence incorrectly suggested this; the updated sequence removes it).

## 6.3 Quality Attributes and Related Constraints

The numbered quality targets below are the submitted requirements, not measured achievements. Member 4 owns attempt recovery/fairness and contributes to shared quality verification; the owners of auth, listings and applications keep their respective implementation responsibility.

| ID / submitted location | Baseline target | Verification / responsibility |
| --- | --- | --- |
| SAFE-1 / 5.2 | No answer saved during a test attempt is lost after browser refresh, closure or disconnection; resume with saved answers and remaining time. | Save/acknowledge several answers, refresh/close/reopen/disconnect/reconnect, and compare answers plus original endsAt. Test deadline passing while offline. Member 4; end-to-end tests required. |
| SAFE-2 / 5.2 | Disabling an account does not delete its applications or attempts. | Disable a seeded account; assert attempts, results and application records remain while access is denied. Shared account integration; do not cascade-delete history. |
| QA-1 / 5.4 | A first-time student finds a listing and applies within 3 minutes without help, checked with 5 classmates. | Run the submitted acceptance task with five first-time participants and record times. This is a shared listing/application usability test, not replaced with an aptitude-only test. |
| QA-2 / 5.4 | Availability is 99% during the placement season excluding announced maintenance. | Record an agreed observation window, downtime and maintenance exclusions; calculate measured uptime. Free-host sleeping and missing server workers are deployment risks, not proof of meeting this target. |
| QA-3 / 5.4 | No application is lost or duplicated under concurrent submission, using the student/listing unique index. | Keep Member 3's concurrency verification intact. Separately test unique student/test attempts and consistent results for Member 4; do not relabel that test as evidence for QA-3. |
| QA-4 / 5.4 | Server statement coverage is at least 70%; each module keeps routes, service and model in its own folder. | Run the agreed server coverage command and inspect statement coverage plus module boundaries. The 49 schema tests are not a coverage measurement or completion of task 4.7. |
| QA-5 / 5.4 | Client supports latest two Chrome, Firefox and Edge versions and screens at least 360 px wide. | Execute the same start/save/resume/submit/result tasks on the supported browsers and 360 px/mobile + desktop widths; confirm visible timer, usable controls and no clipped required content. |
| PERF-1 / 5.1 | First filtered-listing page <2 seconds at p95 with 5,000 listings and 50 concurrent users. | Shared Member 2 load test; retained as the load context for PERF-2. |
| PERF-2 / 5.1 | Other API calls except file upload <1 second at p95 under the same load. | Exercise intended attempt/answer/result/analytics calls with 50 concurrent users; distinguish API latency from TST-4's selection-to-save requirement. Capture environment and cold/warm behavior. |
| PERF-3 / 5.1 | Analytics dashboards render in <3 seconds for a batch of 2,000 students. | Seed the cohort and measure end-to-end dashboard rendering, including authorized fetch, computation and UI; test empty/error states separately. |

Derived UI checks for Member 4 include an always-visible countdown, answered/unanswered palette, non-color-only save status, a clear reconnect warning and a confirmation before manual submission (SAD 4.4). These checks operationalize usability; they do not invent a new approved numbered requirement. Reliability of applications/test attempts takes priority over speed, and ease of use over feature count (SRS 5.4).

Security dependencies remain SRS SO-1–SO-3, SEC-2/SEC-4 and BR-3/BR-4: role/ownership-scoped access, HTTPS, validated bodies, one test attempt and admin-only authoring/statistics. This document does not take ownership of Member 1's security section.

## Requirement-to-design-and-test traceability

| IDs | Design / data responsibility | Verification target; current evidence |
| --- | --- | --- |
| TST-1–TST-2 | Question/Test models; [ER](diagrams/er.png); admin test authoring | Existing model boundary tests; future endpoint/RBAC/existence tests. |
| TST-3 | Attempt unique student/test index; [attempt sequence](diagrams/seq_test_attempt.png) | Existing real-MongoDB duplicate-start test; resume/service behavior not implemented. |
| TST-4, SAFE-1 | Answer map, immutable deadline/snapshot, save/recovery flow | Existing persistence/stale-save tests; future network, timing and browser-recovery tests. |
| TST-5 | Server-side timeout coordinator, deadline/status guards | Planned worker/service tests around endsAt and 30-second boundary; policy decision still required. |
| TST-6 | Canonical Result, snapshotted answer key, consistent per-topic counts | Existing result-validation tests; future score/submit/idempotency integration tests. |
| ANL-1–ANL-3, PERF-3 | [Component diagram](diagrams/component.png), Result/Application/Profile aggregation, admin export — [analytics API](analytics-api.md) | `analytics.test.js` covers owner scoping, RBAC, cohort filters and CSV escaping. `analytics-performance.test.js` checks the API share of PERF-3 with 2,000 students. Dashboard rendering awaits the client. |
| SAFE-2, QA-1–QA-5, PERF-1–PERF-2 | Shared modules and the quality verification matrix above | Record results with fixtures, environment, timing/coverage and reviewer, rather than infer success from a diagram. |

## Decision register for implementation hand-off

| Decision | Current evidence / discrepancy | Owner / next action |
| --- | --- | --- |
| D1 — Late answers and automatic timeout | TST-5 requires auto-submit at endsAt but only mandates rejection beyond endsAt +30 seconds; the old SAD sequence checked late submission instead of late answer writes. | All four members agree the intermediate-window/closure rule before task 4.2/4.5 implementation. Preserve both baseline statements; never silently reopen a submitted attempt. |
| D2 — Combined readiness and weak-topic ranking | ANL-1/glossary describe outputs, not weights, history window or tie handling. | Proposed in [analytics-api.md](analytics-api.md#decisions-proposed-for-review): no combined score; weak topics pooled across Results. Awaiting team approval. |
| D3 — Score and schema conventions | Current models choose separate Result, equal-weight percentages and Easy/Medium/Hard. | Team reviews these with #30; this documentation does not change model code or force approval. |
| D4 — Cohort and cache semantics | Profile changes, missing cohorts, invalidation and CSV response are unspecified. | Proposed in [analytics-api.md](analytics-api.md#decisions-proposed-for-review): current Profile cohort, no cache; routes added to the [S5 contract](api-contract.md). Awaiting team approval. |

These are transparent implementation hand-off decisions, not unfilled SRS prose or a claim that the referenced features have passed acceptance. Submitted PDFs and other members' requirements remain unchanged.
