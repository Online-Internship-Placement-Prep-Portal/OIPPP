# Testing documentation

Part-3 testing deliverables for OIPPP. The submitted PDF versions are in
[docs/Part-3_Deliverables](../Part-3_Deliverables/); the Markdown sources below are the editable
originals.

## Reports

| Document | Contents |
|:--|:--|
| [Test Case Document](test-case-document.md) | v2.0 of every test case (functional and non-functional), updated after Sprints 1 and 2. Per-module case files are in [test-cases/](test-cases/). |
| [System Validation Report](system-validation-report.md) | Execution record for all test cases: results, defects, and evidence links. |
| [Unit Test Report](unit-test-report.md) | Jest and Vitest results for the server and client suites. |
| [Code Coverage Report](code-coverage-report.md) | Statement, function and line coverage from the CI runs. |
| [Branch Coverage Report](branch-coverage-report.md) | Branch coverage and the uncovered paths. |
| [Test summary report](test-report.md) | Software Test Plan section 8: results per SRS ID, defects, and pending items. |
| [UAT and device check](uat-and-devices.md) | User acceptance test (QA-1) and device/browser check (QA-5). |
| [Performance rerun](performance-rerun.md) | Load test on the deployed build (#89); the local rerun is in [issue-89-local-load-run-2026-11-06.md](issue-89-local-load-run-2026-11-06.md). |
| [ZAP baseline report](zap-baseline-report.md) | OWASP ZAP baseline scan against the API (JSON and HTML copies alongside). |

## Supporting files

| Path | Purpose |
|:--|:--|
| [evidence/](evidence/) | Raw run outputs, scripts and screenshots referenced from the reports. |
| [fixtures/](fixtures/) | Sample resume files used by the upload tests. |
| [OIPPP.postman_collection.json](OIPPP.postman_collection.json) and [OIPPP.local.postman_environment.json](OIPPP.local.postman_environment.json) | Postman API tests and local environment. |
| [search_load.jmx](search_load.jmx) | JMeter plan for the listing search load test. |
