# Architecture decision records

Each record states one decision, why it was made and what it costs. SAD 3.5 promised ADR-1 and ADR-2 here; ADR-3 to ADR-5 record decisions taken during the build.

| ADR | Decision | Status | Date |
|:-:|:--|:--|:--|
| [ADR-1](ADR-1-layered-modular-monolith.md) | One Express API split into feature modules | Accepted | 05 Oct 2026 |
| [ADR-2](ADR-2-server-side-test-timer.md) | The server owns the aptitude test timer | Accepted | 05 Oct 2026 |
| [ADR-3](ADR-3-analytics-in-node-api.md) | Analytics runs inside the Node API, not a Python service | Accepted, supersedes part of SAD 3.5 | 30 Oct 2026 |
| [ADR-4](ADR-4-routes-service-model.md) | Routes, service and model per module, no controller layer | Accepted, amends SAD 4.1 | 30 Oct 2026 |
| [ADR-5](ADR-5-gridfs-resumes-per-application.md) | Resumes in GridFS, kept with each application | Accepted | 30 Oct 2026 |

Every difference from the submitted documents is also listed in [DEVIATIONS](../other-docs/DEVIATIONS.md).

## Writing a new record

Copy any record, give it the next number and fill in the five sections: Status, Context, Decision, Consequences, Date. A record is never edited after it is accepted. To change a decision, write a new record and mark the old one "Superseded by ADR-N".
