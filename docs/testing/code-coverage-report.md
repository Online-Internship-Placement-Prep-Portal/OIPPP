# OIPPP – Code Coverage Report

| | |
|:--|:--|
| Project | Online Internship & Placement Preparation Portal (OIPPP) |
| Issue | #82 (Part-3 deliverable) |
| Measured on | 06-11-2026, final `dev` commit |
| Tools | Server: Jest 29 + Istanbul, mongodb-memory-server. Client: Vitest + @vitest/coverage-v8 |
| Target | QA-4: at least 70% server statement coverage (Test Plan) |

## 1. Summary

| Component | Statements | Branches | Functions | Lines |
|:--|--:|--:|--:|--:|
| Server (server/src) | 96.16% (1254 / 1304) | 94.37% (587 / 622) | 95.29% (243 / 255) | 96.93% (1138 / 1174) |
| Client (client/src) | 43.84% (552 / 1259) | 39.85% (393 / 986) | 36.99% (155 / 419) | 46.57% (462 / 992) |

- Server tests: 509 of 509 pass (43 suites). Client tests: 64 of 64 pass (7 files).
- **QA-4 met:** server statement coverage 96.16% is above the 70% target.
- The client has no coverage target in the SRS or Test Plan; its pages are also covered by the system tests in the System Validation Report.
- `index.js` (server start-up) is not loaded by tests; it is exercised by every deployed run.
- Branch detail and the reasons for the remaining missed branches are in the Branch Coverage Report.

## 2. Server coverage by module

| Module | Statements | Branches | Functions | Lines |
|:--|--:|--:|--:|--:|
| app.js | 100.00% (37 / 37) | 100% (0 / 0) | 100.00% (1 / 1) | 100.00% (36 / 36) |
| config | 80.00% (4 / 5) | 86.36% (19 / 22) | 100% (0 / 0) | 80.00% (4 / 5) |
| index.js | 0.00% (0 / 30) | 100% (0 / 0) | 0.00% (0 / 8) | 0.00% (0 / 27) |
| middleware | 100.00% (85 / 85) | 100.00% (46 / 46) | 100.00% (16 / 16) | 100.00% (72 / 72) |
| modules/analytics | 99.20% (124 / 125) | 98.59% (70 / 71) | 100.00% (33 / 33) | 100.00% (103 / 103) |
| modules/applications | 99.28% (138 / 139) | 93.65% (59 / 63) | 100.00% (26 / 26) | 99.21% (126 / 127) |
| modules/audit | 100.00% (14 / 14) | 100.00% (4 / 4) | 100.00% (5 / 5) | 100.00% (13 / 13) |
| modules/listings | 100.00% (173 / 173) | 94.57% (87 / 92) | 100.00% (29 / 29) | 100.00% (167 / 167) |
| modules/notifications | 96.97% (64 / 66) | 100.00% (27 / 27) | 84.62% (11 / 13) | 98.33% (59 / 60) |
| modules/settings | 100.00% (15 / 15) | 100.00% (4 / 4) | 100.00% (3 / 3) | 100.00% (15 / 15) |
| modules/tests | 97.59% (324 / 332) | 91.71% (166 / 181) | 100.00% (75 / 75) | 100.00% (277 / 277) |
| modules/users | 97.42% (264 / 271) | 93.64% (103 / 110) | 95.24% (40 / 42) | 97.72% (257 / 263) |
| utils | 100.00% (12 / 12) | 100.00% (2 / 2) | 100.00% (4 / 4) | 100.00% (9 / 9) |

## 3. How it was measured

```sh
cd server && npm run test:coverage
cd client && npx vitest run --coverage
```

CI (`.github/workflows/ci.yml`) runs coverage on every pull request.

