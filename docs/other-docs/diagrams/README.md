# Architecture and diagram guide

**Owner:** E S Sukruth — shared deliverable S4 / issue #36.  
**State:** complete diagram update proposed for team review, based on the current `dev` contracts and submitted SRS/SAD. These are design views, **not proof that all pictured components are implemented or deployed**.

## Start here

| Diagram | Rendered image | Editable source | Purpose |
| --- | --- | --- | --- |
| Component architecture | [component.png](component.png) | [component.puml](component.puml) | React → authorized Express modular monolith → MongoDB/GridFS; SMTP and private read-only Python analytics; planned server timeout coordinator. |
| Logical ER | [er.png](er.png) | [er.puml](er.puml) | Cross-member User/Profile/Listing contracts, existing Application/Notification/AuditLog models, and Question/Test/Attempt/Result relationships. |
| Actor/use-case view | [use_case.png](use_case.png) | [use_case.puml](use_case.puml) | Student, Recruiter and Placement Admin privileges, test save/evaluation, admin-only CSV and account administration. SMTP integration is shown in the component view. |
| Aptitude attempt sequence | [seq_test_attempt.png](seq_test_attempt.png) | [seq_test_attempt.puml](seq_test_attempt.puml) | Intended start/resume, per-answer acknowledgement, refresh recovery, server timeout and canonical Result finalization. |

The existing `seq_apply.puml/.png` and `seq_status_update.puml/.png` belong to the already-delivered Member 3 flows and are deliberately unchanged. The previous scoped [aptitude schema design](../database/aptitude-schema.md) remains valid as the detailed model reference. Shared styling is local in [diagram-style.puml](diagram-style.puml); there are no remote includes.

## Architecture decisions and responsibilities

- **Modular monolith:** one Node/Express API process, with each feature separated into routes/controller, service and Mongoose model layers. Controllers do not bypass service rules. This follows SAD 3.5; it does not introduce per-feature microservices.
- **Trust boundaries:** the browser holds only its user session, not database credentials. API middleware/services authenticate, check the active account, authorize role/ownership and validate bodies. Only the API may mutate operational records. SMTP uses STARTTLS; analytics calls stay on the private network.
- **Analytics:** the intended Python/Flask engine reads MongoDB with read-only credentials. The API controls authorized requests and cache ownership. The old test-attempt sequence's Python-to-database write was inconsistent with that design and is removed; no new readiness persistence contract is imposed here.
- **Timer:** the UI countdown is a display, not the authority. A future server coordinator must finalize overdue attempts and recover after restart/sleep without extending deadlines. The middle 30-second grace-window rule remains the baseline ambiguity documented in the [owned SRS decision register](../srs/aptitude-analytics-quality.md#decision-register-for-implementation-hand-off).
- **Results:** the current Member 4 model is a separate canonical Result linked one-to-zero-or-one from Attempt, not a second unsynchronized score field on Attempt. Snapshot answer keys stay private.
- **Other members:** Profile/User and Listing in the ER are intended integration contracts, not new models added by this change. `Profile` matches the model name expected by Member 3's dependency adapter; the older drawing's display name `StudentProfile` is reconciled to that contract. AuditLog.entityId is polymorphic, so the drawing does not pretend it is a fixed Application foreign key.

## Inspected implementation boundary

| Area | Current dev evidence | Not claimed by these diagrams |
| --- | --- | --- |
| API shell | `server/src/app.js` mounts application and notification routes; middleware/config scaffolding exists. | Completed end-to-end identity/listing flow or production configuration. |
| Applications / notifications / audit | Member 3 modules and [API documentation](../applications-api.md) exist. | New implementation or revalidation of their feature tests in this documentation-only change. |
| Aptitude | Question/Test/Attempt/Result Mongoose models exist under `server/src/modules/tests/`. | Aptitude routes, scoring service, browser test screen or timeout worker. |
| User/Profile and Listing | Named contracts in Member 3's dependency adapter and the submitted documents. | Current `users`/`listings` modules; none were present in the inspected dev tree. |
| UI / analytics | Planned in the submitted SRS/SAD. | A built React client, Python deployment, live dashboards or CSV exporter. |

Implementation status can evolve; diagrams label the inspected boundary so reviewers do not confuse intended architecture with a release-completion claim. These diagrams do not modify any shared model or runtime API.

## Requirement traceability

| View | Source / requirement coverage |
| --- | --- |
| Component | SAD 3.3–3.9; SRS role/security boundaries, TST-3–TST-6, ANL-1–ANL-3, SAFE-1. |
| ER | SAD 4.1, current Member 3 model contracts and Member 4 schema implementation; TST-1–TST-6, BR-3, SAFE-2. |
| Use case | SRS 2.2–2.3, feature groups 4.1–4.8, BR-4 and ANL-3; admins are seeded, not publicly registered. |
| Attempt sequence | SRS TST-3–TST-6/SAFE-1; replaces the older SAD-derived sequence's missing server trigger and duplicated Attempt.score. |

Read the full [Member 4 SRS sections](../srs/aptitude-analytics-quality.md) for acceptance criteria and the [SRS source map](../SRS.md) for old/new numbering. Submitted [SRS](../../Deliverables_Part-1/SRS.pdf), [SAD](../../Deliverables_Part-1/SAD.pdf), and [Test Plan](../../Deliverables_Part-1/Test%20Plan.pdf) remain unchanged. The [deviations register](../DEVIATIONS.md) distinguishes numbering/design reconciliation from implemented behavior.

## Reproduce and validate

Use Java with **PlantUML 1.2025.2** and Graphviz. Obtain the renderer yourself from the official PlantUML distribution or Maven Central; do not commit its JAR. The diagrams render locally without sending private source to an online renderer.

From the repository root:

```sh
# Set this to the local PlantUML 1.2025.2 JAR.
export PLANTUML_JAR=/absolute/path/to/plantuml-1.2025.2.jar
bash docs/diagrams/render.sh
python3 scripts/check-member4-docs.py
```

The render script compiles only the four owned/updated views, fails on syntax errors and checks each PNG exists. The Python check uses only the standard library and verifies local documentation links/anchors, all owned requirement IDs, paired diagram sources/PNGs and local style includes. It is a focused documentation check, not an application test or a claim that global CI has been configured. Open every generated PNG and inspect labels, arrows, overlap and readability before committing; a successful renderer is not visual QA.

## Review acceptance

- All four updated `.puml` sources render and their matching PNGs are committed.
- Actor access matches the SRS; no public Admin registration is implied.
- Result/snapshot relationships match current models; external contracts are labeled.
- The read-only analytics boundary and planned server timer are explicit.
- Other members review shared boundaries before the normal approved merge into `dev`.
