# Deviations from submitted SRS / SAD / Test Plan

Part-2 rule 2i: every deviation from the submitted documents is recorded here and explained in the final demo.
Each member adds rows for their own area.

| # | Area | Document | What the document says | What was built | Why |
|:-:|:--|:--|:--|:--|:--|
| 1 | Applications | SAD 4.3.3 | Five endpoints | Adds `GET /applications/reject-reasons` and `PATCH /notifications/:id/read` | Client needs the fixed reason list (REV-3) and a way to clear the bell |
| 2 | Applications | SAD 4.3.3 | Errors 403/409/422/400 for status change | Adds `409 STALE_STATUS` | Status update is conditional on the old status so two concurrent clicks cannot both write (SO-2) |
| 3 | Applications | SAD 3.4 | Application and audit writes in one transaction | Sequential writes; the unique index and conditional update give the integrity guarantees | Keeps the module testable on a standalone in-memory MongoDB; revisit if moved to a replica set |
| 4 | Applications | SAD 4.4 | Email retry queue | Retry runs as an in-process 60 s interval job over `notifications` | No separate worker on the free Render tier |
| 5 | Applications | CONTRIBUTING 3.8 | SRS sections 5.3, 6.5, Appendix C | Delivered as SRS 4.5, 4.6, 5.5 and Appendix C rows APP-1..REV-4 | SRS was renumbered during writing; content unchanged |
| 6 | Process | Test Plan 5 | Jira stories / bugs | GitHub Projects board with Sprint iterations and story-point estimates | Part-2 instructions require GitHub Projects |
| 7 | Process | Test Plan 6 | Three sprints | Two sprints: 19–23 Oct and 26–30 Oct 2026 | Part-2 instructions fix two sprints |
| 8 | Aptitude / Analytics documentation | CONTRIBUTING 4.8 | Backlog sections 5.4 Aptitude, 5.5 Analytics, 6.3 Quality | Delivered as editable Member 4 sections with mapping to submitted SRS 4.7, 4.8 and 5.4 (related 5.1/5.2) | Reconciles numbering without changing the approved PDF or requirement IDs; follows the same approach as row 5 |

## Member 4 design reconciliation — review notes, not new runtime behavior

- The updated ER uses the current separate `Result` model rather than the old diagram's `Attempt.score`; `Profile` names the existing cross-member dependency contract instead of the older display name `StudentProfile`. No shared schema code is changed here.
- The updated aptitude sequence shows the intended server timeout trigger, canonical Result and acknowledged saves. It no longer shows a read-only Python analytics component writing a readiness snapshot or treats a 1-second debounce as proof of the 1-second save target.
- TST-5's automatic deadline submission versus the intermediate 30-second late-answer window still requires team agreement before services; the submitted requirement is preserved rather than silently changed. Readiness/weak-topic aggregation and cohort/cache semantics also remain explicit implementation decisions.
- See the [owned SRS decision register](srs/aptitude-analytics-quality.md#decision-register-for-implementation-hand-off) and [diagram guide](diagrams/README.md). These are documentation/design changes, not claims that aptitude/analytics endpoints or a worker have shipped.
