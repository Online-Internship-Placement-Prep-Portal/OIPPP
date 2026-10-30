# Architecture and diagram guide

**Owner:** E S Sukruth — shared deliverable S4 / issue #36.
**State:** matches release 1.0 as built. Every box and arrow is in the code; the [implementation boundary](#implementation-boundary) says where.

## Start here

| Diagram | Rendered image | Editable source | Purpose |
| --- | --- | --- | --- |
| Component architecture | [component.png](component.png) | [component.puml](component.puml) | React client → one Express API (middleware, feature modules, in-process jobs) → MongoDB/GridFS, plus the SMTP provider. |
| Logical ER | [er.png](er.png) | [er.puml](er.puml) | Every collection: User (with SRN and lockout fields), Profile, GridFS resume, Settings, Listing, Bookmark, Application, Notification, AuditLog, Question, Test, Attempt, Result. |
| Actor/use-case view | [use_case.png](use_case.png) | [use_case.puml](use_case.puml) | What Students, Recruiters and the Placement Admin can do, including the one-offer policy and notifications. |
| Aptitude attempt sequence | [seq_test_attempt.png](seq_test_attempt.png) | [seq_test_attempt.puml](seq_test_attempt.puml) | Start or resume, per-answer save, refresh recovery, server timeout and the transactional Result. |
| Apply sequence | [seq_apply.png](seq_apply.png) | [seq_apply.puml](seq_apply.puml) | Apply checks in code order: closed listing, duplicate, one-offer policy, CGPA; then insert, audit and notify. |
| Status update sequence | [seq_status_update.png](seq_status_update.png) | [seq_status_update.puml](seq_status_update.puml) | Ownership, state machine, reason code, conditional update, audit, notification and email retry. |

Shared styling is local in [diagram-style.puml](diagram-style.puml); there are no remote includes. The [aptitude schema design](../database/aptitude-schema.md) has the detailed aptitude model reference.

## Architecture decisions and responsibilities

The decisions are recorded in the [architecture decision records](../../adr/README.md).

- **Modular monolith ([ADR-1](../../adr/ADR-1-layered-modular-monolith.md)):** one Node/Express API process with one folder per feature under `server/src/modules/`. The React client in `client/` is a separate static site that calls `/api`.
- **Layers ([ADR-4](../../adr/ADR-4-routes-service-model.md)):** each module has routes, service and model. There is no controller file; route handlers only call a service and shape the response.
- **Trust boundaries:** the browser holds only its JWT. Middleware checks the token, re-reads the account status on every request, checks the role and validates the body. Only the API holds database credentials. SMTP uses STARTTLS.
- **Timer ([ADR-2](../../adr/ADR-2-server-side-test-timer.md)):** the server owns `endsAt`. `attempt-timeout.job.js` submits overdue attempts every second and catches up after a restart. Answers at or after `endsAt` are refused (decision D1 in the [decision register](../aptitude-analytics-quality.md#decision-register-for-implementation-hand-off)).
- **Results:** a separate Result is written in the same transaction that closes the Attempt. Snapshot answer keys never leave the server.
- **Analytics ([ADR-3](../../adr/ADR-3-analytics-in-node-api.md)):** MongoDB aggregations in `modules/analytics`, inside the API. Placement statistics are cached for 5 minutes. There is no Python service ([DEVIATIONS](../DEVIATIONS.md) row 12).
- **Resumes ([ADR-5](../../adr/ADR-5-gridfs-resumes-per-application.md)):** GridFS bucket `resumes`. Each application keeps the file it was sent with.
- **Jobs:** three in-process intervals run next to the API: the attempt timeout sweep (1 s), the listing deadline closer (60 s) and the email retry (1, 5 and 15 minutes).

## Implementation boundary

| Area | Code | Not covered by these diagrams |
| --- | --- | --- |
| Client | `client/`: React 18, Vite, React Router, axios, Recharts | Visual design details |
| API | `server/src/app.js` mounts every module; see the [API contract](../api-contract.md) | |
| Identity, profiles, admin | `server/src/modules/users/`, including GridFS resume storage and SRN | |
| Policy settings | `server/src/modules/settings/` (one-offer policy, DOM-2) | |
| Listings, bookmarks, recommendations | `server/src/modules/listings/` | |
| Applications, notifications, audit | `server/src/modules/applications/`, `notifications/`, `audit/`; [API documentation](../applications-api.md) | |
| Aptitude | `server/src/modules/tests/`, including the timeout job | |
| Analytics | `server/src/modules/analytics/` | Python engine (not built, ADR-3) |
| Deployment | `render.yaml` and the deployment guide in `docs/other-docs/deployment.md` | Hosting provider internals |

## Requirement traceability

| View | Source / requirement coverage |
| --- | --- |
| Component | SAD 3.3–3.9; SRS role and security boundaries, TST-3–TST-6, ANL-1–ANL-3, SAFE-1, SEC-1–SEC-6. |
| ER | SAD 4.1, SRS section 6 indexes; AUTH-1, AUTH-5, APP-1, TST-1–TST-6, BR-3, DOM-2, SAFE-2. |
| Use case | SRS 2.2–2.3, feature groups 4.1–4.8, BR-1, BR-4, DOM-2 and ANL-3; admins are seeded, not publicly registered. |
| Attempt sequence | TST-3–TST-6, SAFE-1. |
| Apply sequence | APP-1–APP-4, BR-3, DOM-1, DOM-2, QA-3. |
| Status update sequence | REV-2–REV-4, APP-4, SEC-6. |

Read the full [Member 4 SRS sections](../aptitude-analytics-quality.md) for acceptance criteria and the [SRS source map](../SRS.md) for old/new numbering. Submitted [SRS](../../Part-1_Deliverables/SRS.pdf), [SAD](../../Part-1_Deliverables/SAD.pdf), and [Test Plan](../../Part-1_Deliverables/Test%20Plan.pdf) remain unchanged. The [deviations register](../DEVIATIONS.md) lists every difference between them and the build.

## Reproduce and validate

The PNGs are rendered locally with **PlantUML 1.2025.2**. Either set `PLANTUML_JAR` to a local JAR (needs Java and Graphviz), or leave it unset and the script uses the official `plantuml/plantuml:1.2025.2` Docker image. Don't commit the JAR.

From the repository root:

```sh
bash docs/other-docs/diagrams/render.sh
python3 server/scripts/check-member4-docs.py
```

The render script compiles all six views, fails on syntax errors and checks each PNG exists. The Python check verifies local links and anchors, the owned requirement IDs, the paired sources and PNGs, and the local style include. Open every PNG after rendering and check labels, arrows and overlap; a successful render is not visual QA.

## Review acceptance

- All six `.puml` sources render and their PNGs are committed.
- Actor access matches the SRS; no public Admin registration is implied.
- Every component, entity and endpoint shown exists in the code.
- Changes to shared boundaries are reviewed by the other members before merging into `dev`.
