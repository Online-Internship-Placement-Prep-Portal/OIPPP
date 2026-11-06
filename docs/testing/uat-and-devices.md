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
| P1 | Student | Registered a new account on their own phone | Yes |
| P2 | Student | Registered a new account on their own phone | Yes |
| P3 | Student | Registered a new account on their own phone | Yes |
| P4 | Student | Registered a new account on their own phone | Yes |
| P5 | Student | Registered a new account on their own phone | Yes |
| R1 | Recruiter | `recruiter01@example.com` (seeded, already approved) | Yes |

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
| P1 | Samsung phone (model not given), Chrome for Android | – | 2:33, Y | – | – | – | None reported |
| P2 | iPhone 16, Safari | – | 3:44, Y (over 3:00) | – | – | – | Not reported |
| P3 | Motorola phone, Chrome for Android | – | 4:08, Y (over 3:00) | – | – | – | Not reported |
| P4 | Samsung Galaxy M55s, Chrome for Android | – | 2:56, Y | – | – | – | Not reported |
| P5 | Nothing Phone, Brave | – | 4:10, Y (over 3:00) | – | – | – | Not reported |

| Participant | Browser | R1 | R2 | R3 | R4 | Problems seen |
|:--|:--|:--|:--|:--|:--|:--|
| R1 | Not recorded | Y (logged in) | Opened the applicants of a listing (resume not reported) | Y: shortlisted one applicant, then moved them to Interview | Y: rejected one applicant (a reason is required by the form) | None reported. Times not recorded |

**QA-1 verdict: Partial.** Pass needs all five students to complete S2 without help within 3 minutes. Run 1 (06-11-2026, first visit, timed span also included profile and resume entry): all 5 completed, **2 of 5 within 3:00** (P1 2:33, P4 2:56); P2 3:44, P3 4:08, P5 4:10; median 3:44. Run 2 (search and apply only, second visit): **5 of 5 within 3:00**, median 1:55. Searching and applying meets the target; a first-time student who must also complete the profile does not.

**Second run, search and apply only (06-11-2026).** The same five participants logged in to the accounts they had made (profile and resume already saved), found a *different* remote internship paying at least ₹10,000 and applied, timing themselves from the home page after login until *Applied*. This isolates S2 from the profile work in S1. It was each person's second time on the site, so they knew it a little.

| Participant | Run 1 (S2, incl. profile work) | Run 2 (S2 only) | Run 2 within 3:00 |
|:--|:--|:--|:--|
| P1 | 2:33 | 1:22 | Yes |
| P2 | 3:44 | 1:55 | Yes |
| P3 | 4:08 | 2:47 | Yes |
| P4 | 2:56 | 1:55 | Yes |
| P5 | 4:10 | 2:20 | Yes |

Run 2: **5 of 5 within 3:00**, median 1:55, range 1:22–2:47.

**How the session was run.** Because the session moved into the test week, P1–P5 took part remotely on 06-11-2026: each opened the deployed client on their own phone, registered with made-up details, and timed S2 themselves from landing on the home page until the application showed *Applied*. Only S2 and Q1 were asked, so S1 and S3–S5 have no times. Self-timing is less exact than an observer's stopwatch. P1 reported no confusion. According to the coordinator, the participants who took longer spent part of the time entering their profile details and uploading a resume before applying. That belongs to S1, so those S2 times include S1 work and overstate S2; how much was not measured. The times are recorded as reported. A classmate who did not build OIPPP took the recruiter role (R1) late on 06-11-2026 on the Render build: logged in as `recruiter01`, shortlisted one applicant and moved them to Interview, and rejected another. Times and the R-Q rating were not recorded. Environment: Render test build (`main`).

### 5.2 Questionnaire scores

| Participant | Q1 | Q2 | Q3 | Q4 | Q5 | R-Q | Most confusing moment | Suggested change |
|:--|:-:|:-:|:-:|:-:|:-:|:-:|:--|:--|
| P1 | 4 | – | – | – | – | – | – | – |
| P2 | 4 | – | – | – | – | – | – | – |
| P3 | 3 | – | – | – | – | – | – | – |
| P4 | 4 | – | – | – | – | – | – | – |
| P5 | 5 | – | – | – | – | – | – | – |
| R1 | – | – | – | – | – | Not run | | |
| **Mean** | 4.0 | – | – | – | – | – | | |

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
| D7 | Chrome, Brave for Android (versions not recorded) | Real Android phones: Samsung (P1), Motorola (P3), Samsung Galaxy M55s (P4), Nothing Phone (P5) | Phone width | S2 only: register, search, apply, all 4 completed | Not checked | Not checked | Not run | Real phones also used: iPhone 16 and an iPhone with Safari (P2). Only the UAT task S2 was run |
| D8 | Chromium-based browser built into the Claude desktop app, viewport set to 360 × 740 | Windows 11 laptop, **local build** (`dev` @ `8cb16a0`), not Render | 360 × 740 | Yes: test, result, progress | Yes (sticky, visible after scrolling) | Yes (no horizontal scroll, nothing overflowing) | Pass: refresh, closed tab, simulated offline (TC-SAFE-01) | From #96 |

How to record each row:

- **Version:** `chrome://version`, `about:support` (Firefox), `edge://version`. For the "previous" versions use the portable or Beta-minus-one build, or note that only the latest was available.
- **Width on Android:** open the client and check that `window.innerWidth` is 360 (or the phone's CSS width) in remote debugging, or pick a phone whose CSS width is 360 px. Turn the phone to portrait.
- **Screenshot** the attempt screen and *My progress* on each device into `docs/testing/evidence/devices/` (file name `D7-attempt.png` and so on).

**QA-5 verdict:** Pass if every row completes the flow, the timer stays visible and nothing required is clipped at 360 px.

## 7. Summary for the System Validation Report (#94)

| Requirement | Result | Evidence |
|:--|:--|:--|
| QA-1 | **Partial**. Run 1, first visit including profile work: 2 of 5 within 3:00, median 3:44. Run 2, search and apply only, second visit: 5 of 5 within 3:00, median 1:55. All five completed both runs without help | Section 5.1 |
| QA-5 | **Partial**: real phones on Android (Chrome, Brave) and iOS (Safari) completed the apply task; full flow at 360 px passes on the local build (D8). Desktop Chrome, Firefox and Edge (D1–D6) not run | Section 6 |
| SAFE-1 in real browsers | Pass in Chromium on the local build (TC-SAFE-01); not run on other browsers | Section 6, TC-SAFE-01 |
| Satisfaction | Q1 "easy to find an internship": mean 4.0 / 5 (P1–P5: 4, 4, 3, 4, 5). Q2–Q5 and the recruiter question not asked | Section 5.2 |
| Usability defects | None raised: no participant reported a specific problem. The QA-1 failure itself is listed in the System Validation Report | Section 5.3 |

Environment: Render test build (`main`, deployed SHA not re-checked on Render Events), 06-11-2026, remote self-timed sessions coordinated by E S Sukruth. D8: local build.
