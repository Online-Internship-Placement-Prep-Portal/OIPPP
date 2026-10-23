# Contributing Guide

**Project:** Online Internship & Placement Preparation Portal (OIPPP)
**Group Number:** `<fill in>`
**Course:** Software Engineering — PES University, Dept. of CSE

This document defines **who owns what**. It exists so that every team member has a clearly
defined role, as required by the *Project Guidelines* (`docs/Project Guidelines.pdf`).

> **Rule from the guidelines:** work is split by **functional feature**, not by layer.
> "User interface, graphic design, database interaction, unit testing" are **not** functional
> features — everyone does those for their own features. Every member is still expected to be
> involved in all project activities (reviews, testing, documentation, demos).

---

## 1. Team Profile

Fill this in before the proposal is submitted — the guidelines require Name + SRN for every member.

| # | Name | SRN | GitHub Handle | Feature Area |
|:-:|:-----|:----|:--------------|:-------------|
| 1 | `Deekshith Gowda G` | `PES1UG24CS142` | `Member 1` | Identity, Profiles & Admin |
| 2 | SHARATH HG  | PES1UG25CS844 | MEMBER 2 | Internship Listings & Discovery |
| 3 | Guru R Bharadwaj | PES1UG24CS177 | MEMBER 3 | Applications & Recruiter Workflow |
| 4 | E S Sukruth | PES1UG25CS160 | MEMBER 4 | Aptitude Tests, Progress & Analytics |

---

## 2. Status Legend

| Symbol | Meaning |
|:------:|:--------|
| ❌ | Not started |
| 🟠 | In progress |
| ✅ | Completed |

Update your own rows in the tables below whenever a task moves. Do not edit another member's rows.

---

## 3. Work Division

Each member owns **3 functional features**, **1 qualitative property**, and an equal share of the
shared deliverables. The load is intentionally balanced across the four areas.

### Member 1 — Identity, Profiles & Admin

| # | Task | Type | Status |
|:-:|:-----|:-----|:------:|
| 1.1 | Student / Recruiter / Admin registration & login (JWT sessions) | Functional | ❌ |
| 1.2 | Role-based access control across every protected route | Functional | ❌ |
| 1.3 | Student profile management — education, skills, resume upload | Functional | ❌ |
| 1.4 | Admin user management — approve recruiters, deactivate accounts | Functional | ❌ |
| 1.5 | **Qualitative:** confidentiality — hashed passwords, no cross-role data leakage, resume files reachable only by owner + applied recruiter | Non-functional | ❌ |
| 1.6 | User / Profile / Role schema design in MongoDB | Supporting | ❌ |
| 1.7 | Unit + integration tests for owned features | Supporting | ❌ |
| 1.8 | SRS sections: 2.3 User Classes, 5.1 Auth feature, 6.4 Security | Documentation | ❌ |

### Member 2 — Internship Listings & Discovery

| # | Task | Type | Status |
|:-:|:-----|:-----|:------:|
| 2.1 | Recruiter posts / edits / closes an internship listing | Functional | ❌ |
| 2.2 | Search, filter & sort listings (role, location, stipend, skills, deadline) | Functional | ❌ |
| 2.3 | Bookmarks / saved internships + automatic deadline expiry | Functional | ❌ |
| 2.4 | Skill-match recommendation of listings on the student home feed | Functional | ❌ |
| 2.5 | **Qualitative:** performance — filtered search returns in < 2 s over a seeded set of 5,000+ listings (indexing + pagination) | Non-functional | ❌ |
| 2.6 | Internship / Company schema design in MongoDB | Supporting | ❌ |
| 2.7 | Unit + integration tests for owned features | Supporting | ❌ |
| 2.8 | SRS sections: 2.2 Product Functions, 5.2 Listings feature, 6.1 Performance | Documentation | ❌ |

### Member 3 (Guru R Bharadwaj) — Applications & Recruiter Workflow

| # | Task | Type | Status |
|:-:|:-----|:-----|:------:|
| 3.1 | Student applies to an internship (resume + cover note, duplicate-safe) | Functional | ❌ |
| 3.2 | Application status lifecycle — Applied → Shortlisted → Interview → Offer / Rejected | Functional | ❌ |
| 3.3 | Recruiter application review — view applicants, shortlist, reject with reason | Functional | ❌ |
| 3.4 | Notifications on every status change (in-app + email) | Functional | ✅ |
| 3.5 | **Qualitative:** reliability — no lost or duplicated applications; every status transition is validated and audit-logged | Non-functional | ✅ |
| 3.6 | Application / Notification schema design in MongoDB | Supporting | ✅ |
| 3.7 | Unit + integration tests for owned features | Supporting | ❌ |
| 3.8 | SRS sections: 5.3 Applications feature, 6.5 Business Rules, Appendix C traceability | Documentation | ❌ |

### Member 4 (E S Sukruth) — Aptitude Tests, Progress & Analytics

| # | Task | Type | Status |
|:-:|:-----|:-----|:------:|
| 4.1 | Question bank + admin-authored aptitude / technical test creation | Functional | ❌ |
| 4.2 | Timed test attempt with auto-save and single-attempt enforcement | Functional | ❌ |
| 4.3 | Auto-evaluation, scoring and per-topic result breakdown | Functional | ❌ |
| 4.4 | Progress tracking + analytics dashboards (student readiness, admin placement stats) | Functional | ❌ |
| 4.5 | **Qualitative:** usability & fairness — an in-progress test survives a refresh or a dropped connection without losing answers or clock state | Non-functional | ❌ |
| 4.6 | Question / Attempt / Result schema design in MongoDB | Supporting | ❌ |
| 4.7 | Unit + integration tests for owned features | Supporting | ❌ |
| 4.8 | SRS sections: 5.4 Aptitude feature, 5.5 Analytics feature, 6.3 Quality Attributes | Documentation | ❌ |

---

## 4. Shared Deliverables

One owner each, so nothing is left ownerless. Everyone reviews all of them.

| # | Deliverable | Owner | Status |
|:-:|:------------|:------|:------:|
| S1 | Project proposal — `docs/PROPOSAL.md` → PDF for submission | Member 1 | 🟠 |
| S2 | SRS document — `docs/SRS.md` → PDF for submission | Member 2 | 🟠 |
| S3 | Repo setup, branching rules, CI, `.env.example` | Member 3 | ✅ |
| S4 | Architecture & ER / use-case diagrams (`docs/diagrams/`) | Member 4 | ❌ |
| S5 | API contract — shared route + payload spec agreed by all four | All | ❌ |
| S6 | Final demo & presentation | All | ❌ |

---

## 5. Milestones

| Phase | Window | Exit Criteria | Status |
|:------|:-------|:--------------|:------:|
| M0 — Proposal | Week 1 | Team profile filled, proposal PDF submitted | 🟠 |
| M1 — SRS | Weeks 2–3 | All feature sections written, diagrams attached | ❌ |
| M2 — Skeleton | Week 4 | Repo scaffolded, schemas agreed, auth working end-to-end | ❌ |
| M3 — Core features | Weeks 5–8 | Listings, applications and tests functional | ❌ |
| M4 — Analytics & polish | Weeks 9–10 | Dashboards live, qualitative targets measured | ❌ |
| M5 — Testing & demo | Week 11 | Test suite green, demo rehearsed | ❌ |

---

## 6. Working Agreement

**Branches**

```
main                    protected — merge only via reviewed PR
dev                     integration branch
feat/<area>-<summary>   e.g. feat/listings-search-filter
fix/<area>-<summary>
docs/<summary>
```

**Commits** — `<type>(<scope>): <summary>`, e.g. `feat(applications): add shortlist endpoint`.
Types: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`.

**Pull requests**

1. Branch off `dev`, never commit directly to `main` or `dev`.
2. Keep PRs scoped to one feature area — your own.
3. At least **one** teammate approves before merge.
4. Update your status cell in this file in the same PR.

**Ground rules**

- Never commit `.env`, credentials, `node_modules/`, or the reference PDFs (see `.gitignore`).
- Anything touching a shared schema or the API contract gets discussed with all four members first.
- If you are blocked for more than a day, say so — reassignment is cheaper than a stalled milestone.
