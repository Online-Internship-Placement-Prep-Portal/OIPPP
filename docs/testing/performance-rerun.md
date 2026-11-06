# Performance rerun on the deployed build (#89)

Run on 06-11-2026 (finished 18:28 UTC) against `https://oippp-api.onrender.com/api` (Render free instance, Singapore; Atlas M0, Mumbai) with the `seed:demo` data (200 students, 5,000 listings). The client was one laptop on a home connection.

## Method

- Cold start: the instance had spun down. The first `GET /api/health` took **32.5 s**. Warm health calls after that took 0.19–0.30 s, and a warm search took 0.30 s.
- Load: 50 student users for 300 s, run with [perf-render-run.mjs](evidence/perf-render-run.mjs). Half the calls were the six mixed searches from `load-test.js`, and the other half were the seven student calls (recommendations, my applications, bookmarks, notifications, `/analytics/me`, tests, profile).
- Deviation from the local run: Render forwards the real client IP, so all 50 users share one address and the per-IP limits apply (auth 10/min, API 300/min). `load-test.js` fails at login with HTTP 429. The rerun therefore spaces logins 7 s apart, and each user waits 11 s between calls (about 250 requests/min in total), against 250 ms locally. This is 50 concurrent sessions at a low request rate, not the local run's throughput.

## Results

| Requirement | Run | Requests | p50 | p95 | Max | Errors | Target (p95) | Result |
|:--|:--|--:|--:|--:|--:|--:|:--|:--|
| PERF-1 listing search | Local, 30-10-2026 | 27,721 | 15 ms | 37 ms | 88 ms | 0.00% | < 2 s | Pass |
| PERF-1 listing search | Render, 06-11-2026 | 650 | 192 ms | 1,370 ms | 5,569 ms | 0.00% | < 2 s | **Pass** |
| PERF-2 other API calls | Local, 30-10-2026 | 27,699 | 7 ms | 62 ms | 256 ms | 0.00% | < 1 s | Pass |
| PERF-2 other API calls | Render, 06-11-2026 | 615 | 733 ms | 3,584 ms | 8,246 ms | 0.00% | < 1 s | **Fail** |
| PERF-3 placement dashboard | Local, 30-10-2026 | 10 | 3 ms | 62 ms | 62 ms | 0.00% | < 3 s | Pass |
| PERF-3 placement dashboard | Render, 06-11-2026 | 0 | – | – | – | – | < 3 s | **Not run** |

All 1,265 load requests returned 200, with no 429 responses.

## Findings

- PERF-1 passes on Render, but p95 is about 37 times the local figure, and single searches reached 5.6 s.
- PERF-2 fails on Render: p95 is 3.6 s against a 1 s target. The run did not record per-endpoint timings, so this rerun does not show which calls are slow. The likely causes are the shared free-tier CPU and the Singapore–Mumbai network hop between API and database. This fits the STP risk that free-tier numbers will differ. A bug issue should be raised under M6.
- PERF-3 was not run. The admin password is not stored in the repo, so the admin step was skipped. Run `ADMIN_PASSWORD=... node docs/testing/evidence/perf-render-run.mjs` to fill it in. The Render data also has 200 students, not the 2,000 the requirement names, so even that run would not fully test PERF-3. The raw JSON shows `"pass": true` for PERF-3 only because it has 0 samples. Ignore it.

## Raw output

- [evidence/perf-render-results.json](evidence/perf-render-results.json): summary rows and status counts
- [evidence/perf-render-stderr.txt](evidence/perf-render-stderr.txt): run log
- [evidence/perf-render-run.mjs](evidence/perf-render-run.mjs): script used
