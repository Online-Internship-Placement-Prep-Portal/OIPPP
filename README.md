# OIPPP — Online Internship & Placement Preparation Portal

<p align="center">
  <a href="Sprint%201%20Demo.mp4">
    <img src="docs/sprints/Sprint%201%20Demo%20thumbnail.png" alt="Watch the Sprint 1 demo video" width="720">
  </a>
  <br>
  <sub>▶ <b><a href="Sprint%201%20Demo.mp4">Watch the Sprint 1 demo</a></b> (74 s): board, issues, PRs, CI and the live API</sub>
</p>

> Software Engineering project — PES University, Dept. of Computer Science and Engineering
> **Status:** backend modules are under development. Identity/profile/admin, listings, applications/notifications and aptitude models exist; aptitude authoring/timed-attempt APIs are pending review. Frontend and end-to-end integration remain incomplete.

Campus placement is currently split across two disconnected halves: students hunt for internships on
scattered notice boards and mail threads, and practise for aptitude rounds on unrelated third-party
sites. Nobody — student or placement officer — can see whether a candidate is actually ready for the
roles they are applying to.

OIPPP puts both halves behind one login, so preparation history and application history inform each
other.

## What the portal does

| Area | Capability |
|:-----|:-----------|
| Internship listings | Recruiters post, edit and close listings; students search, filter, bookmark and receive skill-matched recommendations |
| Applications | Apply with resume and cover note; track status through Applied → Shortlisted → Interview → Offer / Rejected; recruiters shortlist and reject with reasons |
| Aptitude tests | Admin-authored tests from a question bank; timed attempts with auto-save; auto-evaluated scores with a per-topic breakdown |
| Progress tracking | Per-student readiness view combining test performance and application outcomes |
| Analytics | Placement statistics for the admin; personal progress dashboards for students |

The full itemized feature list (F1–F16) is in [docs/PROPOSAL.md](docs/PROPOSAL.md#34-functional-features).

## Tech stack

**MERN + Python**, as specified by the problem statement.

| Layer | Choice |
|:------|:-------|
| Frontend | React |
| Backend | Node.js + Express |
| Database | MongoDB |
| Auth | JWT + bcrypt |
| Analytics / scoring | Python service (optional, for aptitude evaluation and placement statistics) |
| Testing | Jest + Supertest |

## Repository layout

```
OIPPP/
├── README.md                  you are here
├── .github/                   CI, PR automation and the PR template
├── server/                    Node.js + Express API — src/, tests/, scripts/
└── docs/
    ├── Part-1_Deliverables/   submitted SRS, SAD and Test Plan (PDF)
    ├── other-docs/            SRS map, API references, schemas, diagrams, deviations log
    └── sprints/               sprint completion and workload charts
```

Only the submitted deliverables in `docs/Part-*_Deliverables/` are committed as PDFs. Course-supplied
templates and guidelines are listed in `.gitignore` — pull them from the course page if you don't
have them.

## Documentation

| Document | Purpose |
|:---------|:--------|
| [docs/PROPOSAL.md](docs/PROPOSAL.md) | Project proposal — title, team profile, description, functional features, plan of work, product ownership. Export to PDF for submission. |
| [Identity and security SRS sections](docs/other-docs/identity-security.md) | Member 1 sections 2.3, 5.1 and 6.4 (task 1.8): requirement-by-requirement status and acceptance criteria. |
| [docs/other-docs/SRS.md](docs/other-docs/SRS.md) | Submitted SRS source map and completed Member 4 aptitude, analytics and quality sections with acceptance criteria and traceability. |
| [Architecture and diagrams](docs/other-docs/diagrams/README.md) | Component, ER, use-case and aptitude-sequence views; editable PlantUML, rendered PNGs and local verification commands. |
| [Aptitude authoring and attempts](docs/other-docs/aptitude-api.md) | Backend endpoints, transaction-capable MongoDB setup, save/recovery behavior and pending client integration (tasks 4.1/4.2). |
| [Aptitude database schema](docs/other-docs/database/aptitude-schema.md) | Proposed Question, Test, Attempt and Result models, indexes, lifecycle rules and schema tests (task 4.6). |
| [docs/other-docs/applications-api.md](docs/other-docs/applications-api.md) | Applications, recruiter review and notifications: endpoints, state machine, collections. |
| [docs/other-docs/DEVIATIONS.md](docs/other-docs/DEVIATIONS.md) | Deviations from the submitted SRS / SAD / Test Plan, to be explained at the final demo. |

## Getting started

The backend lives in `server/`; there is not yet a `client/` application. Before integrating features:

1. Read the [Team](#team) and [Working agreement](#working-agreement) sections below.
2. Fill the `<...>` placeholders in [docs/PROPOSAL.md](docs/PROPOSAL.md) — the proposal is returned
   without review if any required section is missing.
3. Agree the **API contract** and the **MongoDB schemas** as a team (shared deliverable S5). Feature
   work in parallel only works if the boundaries are settled first.
4. For backend setup run `npm ci`, `npm run lint` and `npm test` inside `server/`. See [aptitude setup](docs/other-docs/aptitude-api.md#run-and-verify) for the replica-set requirement. Production login uses the shared User module and JWT middleware; verify end-to-end integration and do not bypass authentication.
5. Build the shared `client/` and connect it to the approved APIs with the team.


## Team

Work is split by **functional feature**, not by layer, as the *Project Guidelines* require. Each
member owns their features end to end (UI, database, tests, docs) and reviews everyone else's.
Live task status is tracked in the [GitHub issues](https://github.com/Online-Internship-Placement-Prep-Portal/OIPPP/issues)
and on the [project board](https://github.com/orgs/Online-Internship-Placement-Prep-Portal/projects/2).

| # | Name | SRN | GitHub | Feature area |
|:-:|:-----|:----|:-------|:-------------|
| 1 | Deekshith Gowda G | PES1UG24CS142 | [@deekshithgowdag](https://github.com/deekshithgowdag) | Identity, Profiles & Admin |
| 2 | Sharath HG | PES1UG25CS844 | [@Sharathhg123](https://github.com/Sharathhg123) | Internship Listings & Discovery |
| 3 | Guru R Bharadwaj | PES1UG24CS177 | [@guru-bharadwaj20](https://github.com/guru-bharadwaj20) | Applications & Recruiter Workflow |
| 4 | E S Sukruth | PES1UG25CS160 | [@SUKRUTH-ES](https://github.com/SUKRUTH-ES) | Aptitude Tests, Progress & Analytics |

### Work division

Task numbers (e.g. 3.8) match the issue titles and are cited in [docs/other-docs/DEVIATIONS.md](docs/other-docs/DEVIATIONS.md).

**Member 1 — [Deekshith Gowda G](https://github.com/deekshithgowdag): Identity, Profiles & Admin**

| # | Task | Type |
|:-:|:-----|:-----|
| 1.1 | Student / Recruiter / Admin registration & login (JWT sessions) | Functional |
| 1.2 | Role-based access control across every protected route | Functional |
| 1.3 | Student profile management — education, skills, resume upload | Functional |
| 1.4 | Admin user management — approve recruiters, deactivate accounts | Functional |
| 1.5 | **Qualitative:** confidentiality — hashed passwords, no cross-role data leakage, resume files reachable only by owner + applied recruiter | Non-functional |
| 1.6 | User / Profile / Role schema design in MongoDB | Supporting |
| 1.7 | Unit + integration tests for owned features | Supporting |
| 1.8 | SRS sections: 2.3 User Classes, 5.1 Auth feature, 6.4 Security | Documentation |

**Member 2 — [Sharath HG](https://github.com/Sharathhg123): Internship Listings & Discovery**

| # | Task | Type |
|:-:|:-----|:-----|
| 2.1 | Recruiter posts / edits / closes an internship listing | Functional |
| 2.2 | Search, filter & sort listings (role, location, stipend, skills, deadline) | Functional |
| 2.3 | Bookmarks / saved internships + automatic deadline expiry | Functional |
| 2.4 | Skill-match recommendation of listings on the student home feed | Functional |
| 2.5 | **Qualitative:** performance — filtered search returns in < 2 s over a seeded set of 5,000+ listings (indexing + pagination) | Non-functional |
| 2.6 | Internship / Company schema design in MongoDB | Supporting |
| 2.7 | Unit + integration tests for owned features | Supporting |
| 2.8 | SRS sections: 2.2 Product Functions, 5.2 Listings feature, 6.1 Performance | Documentation |

**Member 3 — [Guru R Bharadwaj](https://github.com/guru-bharadwaj20): Applications & Recruiter Workflow**

| # | Task | Type |
|:-:|:-----|:-----|
| 3.1 | Student applies to an internship (resume + cover note, duplicate-safe) | Functional |
| 3.2 | Application status lifecycle — Applied → Shortlisted → Interview → Offer / Rejected | Functional |
| 3.3 | Recruiter application review — view applicants, shortlist, reject with reason | Functional |
| 3.4 | Notifications on every status change (in-app + email) | Functional |
| 3.5 | **Qualitative:** reliability — no lost or duplicated applications; every status transition is validated and audit-logged | Non-functional |
| 3.6 | Application / Notification schema design in MongoDB | Supporting |
| 3.7 | Unit + integration tests for owned features | Supporting |
| 3.8 | SRS sections: 5.3 Applications feature, 6.5 Business Rules, Appendix C traceability | Documentation |

**Member 4 — [E S Sukruth](https://github.com/SUKRUTH-ES): Aptitude Tests, Progress & Analytics**

| # | Task | Type |
|:-:|:-----|:-----|
| 4.1 | Question bank + admin-authored aptitude / technical test creation — [backend APIs](docs/other-docs/aptitude-api.md) | Functional |
| 4.2 | Timed test attempt with auto-save and single-attempt enforcement — [backend APIs + recovery](docs/other-docs/aptitude-api.md) | Functional |
| 4.3 | Auto-evaluation, scoring and per-topic result breakdown | Functional |
| 4.4 | Progress tracking + analytics dashboards (student readiness, admin placement stats) | Functional |
| 4.5 | **Qualitative:** usability & fairness — an in-progress test survives a refresh or a dropped connection without losing answers or clock state | Non-functional |
| 4.6 | Question / Attempt / Result schema design in MongoDB — [design + models](docs/other-docs/database/aptitude-schema.md) | Supporting |
| 4.7 | Unit + integration tests for owned features | Supporting |
| 4.8 | SRS sections: 5.4 Aptitude, 5.5 Analytics, 6.3 Quality — [sections + traceability](docs/other-docs/aptitude-analytics-quality.md) | Documentation |

### Shared deliverables

One owner each; everyone reviews all of them.

| # | Deliverable | Owner |
|:-:|:------------|:------|
| S1 | Project proposal — `docs/PROPOSAL.md` → PDF | [@deekshithgowdag](https://github.com/deekshithgowdag) |
| S2 | SRS document — `docs/other-docs/SRS.md` → PDF | [@Sharathhg123](https://github.com/Sharathhg123) |
| S3 | Repo setup, branching rules, CI, `.env.example` | [@guru-bharadwaj20](https://github.com/guru-bharadwaj20) |
| S4 | Architecture & ER / use-case diagrams — [sources and guide](docs/other-docs/diagrams/README.md) | [@SUKRUTH-ES](https://github.com/SUKRUTH-ES) |
| S5 | API contract — shared route + payload spec agreed by all four | All |
| S6 | Final demo & presentation | All |

## Working agreement

**Branches**

```
main                    merge only via reviewed PR from dev
dev                     integration branch — every feature PR targets this
feat/<area>-<summary>   e.g. feat/listings-search-filter
fix/<area>-<summary>
docs/<summary>
```

**Commits** — `<type>(<scope>): <summary>`, e.g. `feat(applications): add shortlist endpoint`.
Types: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`.

**Pull requests**

1. Branch off `dev`; never commit directly to `main` or `dev`.
2. Target `dev` — never another feature branch.
3. One issue per PR, with `Closes #<issue>` in the description.
4. A teammate approves and **merges**; never merge your own PR.

**Ground rules**

- Never commit `.env`, credentials, `node_modules/`, or the reference PDFs (see `.gitignore`).
- Anything touching a shared schema or the API contract gets discussed with all four members first.
- If you are blocked for more than a day, say so — reassignment is cheaper than a stalled milestone.
