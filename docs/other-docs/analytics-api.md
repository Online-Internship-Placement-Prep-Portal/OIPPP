# Progress tracking and analytics — task 4.4

## Delivery boundary

Backend implementation for issue #28 (SRS ANL-1 to ANL-3). It adds REST APIs only: there is still no
`client/` dashboard. The module lives in `server/src/modules/analytics` and reads the aptitude `Result`
and `Test` models, the applications `Application` model, and Member 1/2's `User`, `Profile` and
`Listing` models. It looks those up by model name, the same way `application.deps.js` does. It never
writes to another module's collections.

Aggregation runs in the Node API, not in a separate Python service. See [DEVIATIONS](DEVIATIONS.md) row 12.

## Routes

All paths have the `/api` prefix and require `Authorization: Bearer <session JWT>`.

| Method | Path | Auth | Request | Success |
|:--|:--|:--|:--|:--|
| GET | `/analytics/me` | STUDENT | | `200` readiness view for the caller only |
| GET | `/analytics/placements` | ADMIN | query: `branch?` (≤ 100 chars), `gradYear?` (2000–2100) | `200` batch statistics |
| GET | `/analytics/placements/export` | ADMIN | same query as above | `200 text/csv`, `attachment; filename="placement-report.csv"` |

Recruiters get `403` on every analytics route. Unauthenticated calls get `401`. An invalid query value
or a `$` key returns `400 VALIDATION`.

### `GET /analytics/me` (ANL-1)

```json
{
  "testsTaken": 2,
  "averageScore": 60,
  "trend": [{ "attemptId": "…", "testId": "…", "testTitle": "Mock 1", "score": 70, "submittedAt": "…" }],
  "topics": [{ "topic": "Logical", "totalQuestions": 5, "correctAnswers": 1, "percentage": 20 }],
  "weakestTopics": [{ "topic": "Logical", "totalQuestions": 5, "correctAnswers": 1, "percentage": 20 }],
  "applications": { "total": 2, "byStatus": { "APPLIED": 1, "SHORTLISTED": 0, "INTERVIEW": 0, "OFFER": 1, "REJECTED": 0 } }
}
```

- `trend` lists submitted Results oldest first. In-progress attempts have no Result, so they never appear.
- `topics` holds only topics the student has been assessed on, weakest first. `weakestTopics` is its
  first two entries: empty with no tests, one entry if only one topic was assessed.
- With no submitted tests, `averageScore` is `null`, not `0`. That way the client can show
  "no tests yet" instead of a 0% score.
- `byStatus` always lists all five official statuses, so a missing status reads as 0, not unknown.

### `GET /analytics/placements` (ANL-2)

```json
{
  "filters": { "branch": "CSE", "gradYear": 2027 },
  "students": 120,
  "placedStudents": 41,
  "offersPerCompany": [{ "company": "Globex", "offers": 12 }],
  "applicationsPerListing": [{ "listingId": "…", "title": "Data Intern", "company": "Globex", "applications": 30, "offers": 12 }],
  "averageScoreByBranch": [{ "branch": "CSE", "results": 210, "students": 98, "averageScore": 71.4 }]
}
```

- `students` is the cohort size and `placedStudents` the number of distinct students with at least one
  `OFFER` application. A student with two offers counts once there, and twice in `offersPerCompany`.
- Every metric uses the same cohort, so a branch/year filter changes all of them consistently.
- `averageScoreByBranch.averageScore` is the mean of submitted Result scores, so in-progress attempts
  are excluded. `results` and `students` say how much data each average rests on.
- `branch` matching ignores case (`cse` matches `CSE`). The response echoes the filter as sent.
- A listing that no longer exists is reported with `title` and `company` set to `null`, not dropped.

### `GET /analytics/placements/export` (ANL-3)

The CSV is built from the same `placementStats` call as the dashboard, so the numbers always match.
It is one table with the columns `section,group,detail,value`: the filters, the summary counts, then one
row per company, listing and branch. Lines end with CRLF. The export:

- quotes fields containing commas, quotes or newlines, and doubles embedded quotes (RFC 4180);
- prefixes text starting with `=`, `+`, `-`, `@`, tab or CR with `'`, so a spreadsheet does not run it as a formula;
- adds a `note,No students match the selected cohort` row for an empty cohort, so the report does not show bare zeroes.

## Decisions proposed for review

The submitted SRS leaves D2 and D4 of the [decision register](aptitude-analytics-quality.md#decision-register-for-implementation-hand-off)
open. This implementation proposes the following. **None of it is team-approved yet**; resolve it in PR review.

| Decision | Proposal |
|:--|:--|
| D2: combined readiness score | Not produced. The baseline defines no formula, and the SRS says not to invent one. The view returns its components: trend, average, weak topics, application counts. |
| D2: weak-topic aggregation | Pool `correctAnswers / totalQuestions` per topic across all of the student's Results, so a topic asked more often carries more weight. Ties go to the topic with more questions, then to the order Quantitative, Logical, Verbal, Technical. Unassessed topics are never reported as weak. |
| D4: cohort | A student's **current** Profile `branch` and `gradYear`. There is no history, so a branch change moves past results too. Students without a Profile or branch are reported under `branch: null`, and only in the unfiltered view. They are never assigned to a real branch. |
| D4: caching | None. Every request reads live data, so a new Result or status change appears immediately. Add a cache only together with an invalidation rule. |

## Verification

```sh
cd server
npx jest tests/integration/analytics.test.js tests/integration/analytics-performance.test.js
```

`analytics.test.js` (17 cases) covers owner scoping, empty states, trend order, pooled weak topics and
tie-breaks, application counts, RBAC on all three routes, distinct placed students, offers per company,
applications per listing, branch averages, case-insensitive cohort filters, empty cohorts, query
validation, and CSV quoting and formula escaping.

`analytics-performance.test.js` seeds 2,000 students with profiles, 6,000 applications across 50 listings
and 4,000 results. It then asserts the unfiltered and filtered statistics calls each return in under
3 s. That covers only the API part of PERF-3. Full dashboard rendering cannot be measured until a client
exists. On a development laptop with in-memory MongoDB the unfiltered call took about 0.7–1.1 s.
