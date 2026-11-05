# User Acceptance Test (QA-1) and Device Check (QA-5)

| | |
|:--|:--|
| Project | Online Internship & Placement Preparation Portal (OIPPP) |
| Issue | #97 |
| Owner | E S Sukruth (test engineer, reliability and UAT) |
| Build | https://oippp-client.onrender.com, API https://oippp-api.onrender.com/api ([deployment.md section 6](../other-docs/deployment.md#6-part-3-test-build-26-nov-2026)) |
| Session | Thu 05-11-2026, about 30 minutes per participant |
| Test Plan | Section 5 (acceptance tests), QA-1 and QA-5 in [aptitude-analytics-quality.md](../other-docs/aptitude-analytics-quality.md#63-quality-attributes-and-related-constraints) |

The session was planned for 19–21 Nov 2026 and moved into the Part-3 test week (DEVIATIONS row 27).

## 1. Participants and data

| ID | Role in the session | Account used | First time on OIPPP? |
|:--|:--|:--|:--|
| P1 | Student | Registers a new account (task S1) | |
| P2 | Student | Registers a new account | |
| P3 | Student | Registers a new account | |
| P4 | Student | Registers a new account | |
| P5 | Student | Registers a new account | |
| R1 | Recruiter | `recruiter01@example.com` (seeded, already approved) | |

- Participants are classmates who did not build OIPPP. Record them only as P1–P5 and R1; their names stay out of the repository.
- **No real student data.** Participants register with a made-up name, an email of the form `uat-p1-0511@example.com`, a made-up SRN in the right format (for example `PES1UG24CS901`) and made-up CGPA and skills. The resume is `docs/testing/fixtures/resume.pdf`.
- Before starting, read out: *"We are testing the website, not you. Think aloud. If you get stuck for a minute, tell us and we'll move on. Nothing you enter is real or kept."*
- The free Render server sleeps when idle. Open https://oippp-api.onrender.com/api/health about two minutes before each participant so the first page load does not count against them.

## 2. Task script: students (P1–P5)

The observer starts a stopwatch when the participant starts reading the task and stops it when the success condition is met. Do not help. If the participant asks, say "What would you try?". After 2× the target time, mark the task failed and show the way.

| Task | What to say to the participant | Success condition | Target |
|:--|:--|:--|:--|
| S1 Register | "Create a student account and fill in your profile with branch CSE, graduation year 2027, CGPA 8.0, skills Node and React, and upload this resume." | Profile saved; resume shows as uploaded | 4 min |
| S2 Find and apply (**QA-1**) | "Find a remote internship that pays at least ₹10,000 a month and apply for it." (start the clock when they land on the home page after logging in) | Application shows in *My applications* with status *Applied* | **3 min** |
| S3 Save for later | "Save another internship to look at later, then find it again." | The listing appears in *Saved internships* | 2 min |
| S4 Take a test | "Take *Placement Practice Test 1*. Answer at least 5 questions. Halfway through, press F5, then carry on and submit." | Answers are still there after F5; the result page opens | 6 min (not the test length) |
| S5 See results | "How did you do in Logical reasoning? What is your weakest topic overall?" | Participant reads the topic score on the result page and the weakest topic on *My progress* | 2 min |

## 3. Task script: recruiter (R1)

| Task | What to say | Success condition | Target |
|:--|:--|:--|:--|
| R1 Log in | "Log in as this recruiter." | *My listings* opens | 1 min |
| R2 Review | "Open the applicants of the listing the students just applied to and look at one applicant's resume." | Resume opens in the viewer | 3 min |
| R3 Shortlist | "Shortlist one applicant." | Status shows *Shortlisted*; the student sees it in *My applications* | 2 min |
| R4 Reject with a reason | "Reject another applicant, giving a reason." | Status shows *Rejected* with the reason; the reason was required | 2 min |

## 4. Questionnaire (after the tasks)

Each participant rates 1 (strongly disagree) to 5 (strongly agree).

| # | Statement |
|:-:|:--|
| Q1 | It was easy to find an internship that matched what I wanted. |
| Q2 | Applying took less effort than I expected. |
| Q3 | During the test I always knew how much time I had left and whether my answers were saved. |
| Q4 | The results and progress pages told me something useful about my preparation. |
| Q5 | I would use this portal during placement season. |
| R-Q | (recruiter) Reviewing and updating applicants was straightforward. |

Plus two open questions: *What was the most confusing moment?* and *What one change would help most?*

## 5. Results

### 5.1 Task times and success

Fill in time as mm:ss, success as Y or N, and a short note on any problem seen.

| Participant | Browser / device | S1 | S2 (QA-1, ≤ 3:00) | S3 | S4 | S5 | Problems seen |
|:--|:--|:--|:--|:--|:--|:--|:--|
| P1 | | | | | | | |
| P2 | | | | | | | |
| P3 | | | | | | | |
| P4 | | | | | | | |
| P5 | | | | | | | |

| Participant | Browser | R1 | R2 | R3 | R4 | Problems seen |
|:--|:--|:--|:--|:--|:--|:--|
| R1 | | | | | | |

**QA-1 verdict:** Pass if all five students complete S2 without help within 3 minutes. Result: ___ of 5 within 3:00, median ___.

### 5.2 Questionnaire scores

| Participant | Q1 | Q2 | Q3 | Q4 | Q5 | R-Q | Most confusing moment | Suggested change |
|:--|:-:|:-:|:-:|:-:|:-:|:-:|:--|:--|
| P1 | | | | | | – | | |
| P2 | | | | | | – | | |
| P3 | | | | | | – | | |
| P4 | | | | | | – | | |
| P5 | | | | | | – | | |
| R1 | – | – | – | – | – | | | |
| **Mean** | | | | | | | | |

### 5.3 Usability defects raised

Every problem seen by two or more participants, or that stopped one participant, becomes a GitHub issue (label `bug` or `type:usability`, the area label, milestone M6, assigned to the module owner).

| Issue | Seen by | Task | Description | Severity |
|:--|:--|:--|:--|:--|
| | | | | |

## 6. Device and browser check (QA-5)

QA-5: the client supports the latest two versions of Chrome, Firefox and Edge, and screens at least 360 px wide. Run the same student flow on each: log in → search with a filter → open a listing → apply → *Start or resume* a test → answer → F5 → submit → result → *My progress*. Then run TC-SAFE-01 (refresh, close the tab, go offline mid-test).

| # | Browser and version | OS / device | Width | Flow completes | Timer visible at all times | No clipped content or horizontal scroll | SAFE-1 (refresh / close / offline) | Notes |
|:-:|:--|:--|:--|:--|:--|:--|:--|:--|
| D1 | Chrome ___ (latest) | Windows 11 laptop | 1366+ | | | | | |
| D2 | Chrome ___ (previous) | | 1366+ | | | | | |
| D3 | Firefox ___ (latest) | Windows 11 laptop | 1366+ | | | | | |
| D4 | Firefox ___ (previous) | | 1366+ | | | | | |
| D5 | Edge ___ (latest) | Windows 11 laptop | 1366+ | | | | | |
| D6 | Edge ___ (previous) | | 1366+ | | | | | |
| D7 | Chrome ___ for Android | Real Android phone, model ___ | 360 px CSS width | | | | | |
| D8 | Chrome DevTools device mode | Desktop | 360 × 740 | | | | | |

How to record each row:

- **Version:** `chrome://version`, `about:support` (Firefox), `edge://version`. For the "previous" versions use the portable or Beta-minus-one build, or note that only the latest was available.
- **Width on Android:** open the client and check that `window.innerWidth` is 360 (or the phone's CSS width) in remote debugging, or pick a phone whose CSS width is 360 px. Turn the phone to portrait.
- **Screenshot** the attempt screen and *My progress* on each device into `docs/testing/evidence/devices/` (file name `D7-attempt.png` and so on).

**QA-5 verdict:** Pass if every row completes the flow, the timer stays visible and nothing required is clipped at 360 px.

## 7. Summary for the System Validation Report (#94)

| Requirement | Result | Evidence |
|:--|:--|:--|
| QA-1 | ___ of 5 students applied within 3 minutes, median ___ | Section 5.1 |
| QA-5 | ___ of 8 browser/device rows pass | Section 6 |
| SAFE-1 in real browsers | ___ | Section 6, TC-SAFE-01 |
| Satisfaction | Mean Q1–Q5: ___ / 5; recruiter ___ / 5 | Section 5.2 |
| Usability defects | ___ issues raised | Section 5.3 |

Environment: Render test build, commit ___ (from Render Events), date ___, observer ___.
