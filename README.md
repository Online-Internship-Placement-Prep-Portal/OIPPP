# OIPPP — Online Internship & Placement Preparation Portal

> Software Engineering project — PES University, Dept. of Computer Science and Engineering
> **Status:** planning. No application code yet — start from the direction set out in the docs below.

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
├── README.md              you are here
├── CONTRIBUTING.md        work division, ownership, status tables, working agreement
├── .gitignore
└── docs/
    ├── PROPOSAL.md        project proposal (per Project Guidelines.pdf)
    ├── SRS.md             SRS scaffold (per SRS-Document.pdf template)
    ├── Project Guidelines.pdf   reference — git-ignored, kept locally
    └── SRS-Document.pdf         reference — git-ignored, kept locally
```

The two reference PDFs are course-supplied templates. They live in `docs/` for convenience but are
listed in `.gitignore`, so they are **not** committed — pull them from the course page if you don't
have them.

## Documentation

| Document | Purpose |
|:---------|:--------|
| [docs/PROPOSAL.md](docs/PROPOSAL.md) | Project proposal — title, team profile, description, functional features, plan of work, product ownership. Export to PDF for submission. |
| [docs/SRS.md](docs/SRS.md) | Software Requirements Specification scaffold, section-by-section, with an owner marked on each. |
| [Aptitude database schema](docs/database/aptitude-schema.md) | Proposed Question, Test, Attempt and Result models, indexes, lifecycle rules and schema tests (task 4.6). |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Who owns which functional features, task status tables, branching and PR rules. |
| [docs/applications-api.md](docs/applications-api.md) | Applications, recruiter review and notifications: endpoints, state machine, collections. |
| [docs/DEVIATIONS.md](docs/DEVIATIONS.md) | Deviations from the submitted SRS / SAD / Test Plan, to be explained at the final demo. |

## Getting started

Nothing is scaffolded yet. Before writing code :

1. Read [CONTRIBUTING.md](CONTRIBUTING.md) and fill in your name, SRN and GitHub handle.
2. Fill the `<...>` placeholders in [docs/PROPOSAL.md](docs/PROPOSAL.md) — the proposal is returned
   without review if any required section is missing.
3. Agree the **API contract** and the **MongoDB schemas** as a team (shared deliverable S5). Feature
   work in parallel only works if the boundaries are settled first.
4. Then scaffold `client/` and `server/`, and start on the features you own.

## Team

Four members, each owning four functional features plus one qualitative property — see the
[work division](CONTRIBUTING.md#3-work-division).

| Symbol | Meaning |
|:------:|:--------|
| ❌ | Not started |
| 🟠 | In progress |
| ✅ | Completed |
