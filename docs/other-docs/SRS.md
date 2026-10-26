# Software requirements — source map

The submitted release-1.0 [Software Requirements Specification](../Part-1_Deliverables/SRS.pdf) is the complete approved baseline. This page is a navigation and change-integration entry point, **not a replacement SRS or a claim that every section has editable Markdown**. Do not rewrite or renumber the submitted PDF in place.

## Member 1 sections — task 1.8 / issue #8

[Identity, user classes and security](identity-security.md) maps backlog 2.3, 5.1 and 6.4 to submitted SRS 2.3, 4.1–4.2 and 5.3, and records the implementation status of AUTH-1–6, PROF-1–4 and SEC-1–6 with acceptance criteria for the open items. Requirement IDs and text are unchanged.

## Member 4 — task 4.8 / issue #32

The complete editable [Aptitude, Analytics and Quality sections](aptitude-analytics-quality.md) contain the owned requirements, acceptance criteria, actor/data boundaries and requirement traceability. The backlog names use an earlier outline:

| Backlog section | Submitted SRS location | Editable section |
| --- | --- | --- |
| 5.4 Aptitude | 4.7 Aptitude Test Engine | [5.4 Aptitude](aptitude-analytics-quality.md#54-aptitude-test-engine) |
| 5.5 Analytics | 4.8 Progress Tracking and Analytics | [5.5 Analytics](aptitude-analytics-quality.md#55-progress-tracking-and-analytics) |
| 6.3 Quality Attributes | 5.4 Software Quality Attributes; related 5.1 Performance and 5.2 Safety | [6.3 Quality](aptitude-analytics-quality.md#63-quality-attributes-and-related-constraints) |

Existing IDs TST-1–TST-6, ANL-1–ANL-3, PERF-1–PERF-3, SAFE-1–SAFE-2 and QA-1–QA-5 are preserved. Acceptance elaborations are labeled; they are not evidence of implementation or passed release tests. Work outside Member 4 remains owned by the members listed in [README](../../README.md#team).

## Related deliverables

- [Architecture and diagram guide](diagrams/README.md): current design, implementation boundary, diagrams and reproduction commands (issue #36).
- [Aptitude database schema](database/aptitude-schema.md): Question/Test/Attempt/Result models and service obligations (issue #30).
- [Applications and notifications API](applications-api.md): Member 3's delivered module documentation.
- [Recorded deviations](DEVIATIONS.md): differences from submitted documents and numbering reconciliation.
- [Submitted architecture and design](../Part-1_Deliverables/SAD.pdf).
- [Submitted test plan](../Part-1_Deliverables/Test%20Plan.pdf).

Changes to shared contracts require team discussion and the normal reviewed PR process. The submitted PDF retains its original approval history; these Markdown additions remain reviewable development documentation until approved.
