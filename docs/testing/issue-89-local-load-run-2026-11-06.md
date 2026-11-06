# Issue #89 — Local performance rerun (6 November 2026)

## Environment
- API: local production-mode process (`NODE_ENV=production`, `TRUST_PROXY=1`)
- Database: isolated Docker MongoDB replica set, database `oippp_issue89`
- Seed: 2,000 students, 5,000 listings, 6,000 applications, 1,999 results
- Load: `npm run test:load -- --users=50 --seconds=300`
- API base: `http://localhost:5000`

## Results

| Test | Requests | p50 | p95 | Max | Errors | p95 target | Script result |
|:--|--:|--:|--:|--:|--:|:--|:--|
| PERF-1 listing search | 12,434 | 67 ms | 292 ms | 107,372 ms | 0.00% | < 2,000 ms | Pass |
| PERF-2 other API calls | 12,417 | 101 ms | 673 ms | 108,922 ms | 0.06% | < 1,000 ms | Pass |
| PERF-3 placement dashboard API | 10 | 17 ms | 238 ms | 238 ms | 0.00% | < 3,000 ms | Pass |

## Scope and limitations
- This was a local run; the API, load generator and database shared the same machine.
- PERF-3 measures the placement dashboard API endpoint, not browser rendering.
- This run does not establish performance on the dedicated 4-vCPU test VM or the deployed service.
- The existing JMeter plan was not executed, and this record is not a raw JMeter CSV/HTML report.
- A deployed/test-VM rerun and the required JMeter evidence remain outstanding.
