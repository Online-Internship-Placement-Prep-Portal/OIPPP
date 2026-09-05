# Project Proposal

> Scaffold following `Project Guidelines.pdf`. Every section below is required — a proposal
> missing any of them is **returned without review**. Fill the `<...>` placeholders, then export
> to **PDF** (the only accepted submission format) as a single team document.

---

## 1. Project Title & Group

| Field | Value |
|:------|:------|
| Project Title | Online Internship & Placement Preparation Portal (OIPPP) |
| Group Number | `<fill in>` |
| Course | Software Engineering — PES University, Dept. of CSE |
| Date | `<fill in>` |

## 2. Team Profile

| # | Name | SRN |
|:-:|:-----|:----|
| 1 | `<name>` | `<SRN>` |
| 2 | `<name>` | `<SRN>` |
| 3 | `<name>` | `<SRN>` |
| 4 | `<name>` | `<SRN>` |

*Every team member shall be involved in all project activities.*

## 3. Project Description

### 3.1 Overview

`<Expand into 2–3 paragraphs.>` OIPPP is a **new, self-contained web application** that brings the
two halves of campus placement into one system: **finding internships** and **preparing for them**.
Today students track openings across scattered notice boards, spreadsheets and mail threads, while
practice for aptitude rounds happens on unrelated third-party sites — so nobody, student or
placement officer, can see whether a candidate is actually ready for the roles they are applying to.

OIPPP puts listings, applications, aptitude practice and readiness analytics behind one login, so a
student's preparation history and their application history inform each other.

### 3.2 Customer / Stakeholders

`<State whether you already have a customer.>` Prospective customer: the college **Placement Cell**.
Interested parties: the placement officer (administrator), recruiting companies, and students.

### 3.3 Typical Users

| User Class | Characteristics | Priority |
|:-----------|:----------------|:--------:|
| Student | Pre-final / final year, daily use, low-to-moderate technical expertise. Primary user class. | High |
| Recruiter | Company representative, occasional use, posts listings and reviews applicants. | High |
| Placement Admin | College staff, moderates recruiters and listings, consumes placement analytics. | Medium |

### 3.4 Functional Features

The itemized list referenced by Section 4. **What the user will be able to do:**

| ID | Functional Feature | Primary User |
|:--:|:-------------------|:-------------|
| F1 | Register and log in as student, recruiter or admin | All |
| F2 | Role-based access to permitted screens and data only | All |
| F3 | Create and maintain a student profile — education, skills, resume | Student |
| F4 | Administer users — approve recruiters, deactivate accounts | Admin |
| F5 | Post, edit and close internship listings | Recruiter |
| F6 | Search, filter and sort internship listings | Student |
| F7 | Bookmark listings; listings expire automatically after the deadline | Student |
| F8 | Receive skill-matched internship recommendations | Student |
| F9 | Apply to an internship with resume and cover note | Student |
| F10 | Track application status through its lifecycle | Student |
| F11 | Review applicants — shortlist, reject with reason | Recruiter |
| F12 | Receive notifications on every application status change | Student |
| F13 | Author aptitude / technical tests from a question bank | Admin |
| F14 | Attempt a timed test with answers auto-saved | Student |
| F15 | Receive an auto-evaluated score with a per-topic breakdown | Student |
| F16 | View progress and analytics dashboards | Student, Admin |

### 3.5 Out of Scope (v1)

Mobile applications, payments, video interviews, résumé parsing by ML, and integration with
external job boards.

## 4. Plan of Work and Product Ownership

### 4.1 Short-Term Plan (next few weeks)

| Week | Planned Work |
|:----:|:-------------|
| 1 | Proposal finalised; repository, branching and toolchain set up |
| 2–3 | SRS written; use-case and ER diagrams; API contract agreed |
| 4 | Schemas implemented; authentication working end-to-end; UI shell |
| 5–6 | Listings and applications features built against the agreed contract |

### 4.2 Who Should Do What

Ownership is by **functional feature**, per the guidelines. Full task-level breakdown and live status
live in [`../CONTRIBUTING.md`](../CONTRIBUTING.md).

| Member | Functional Features Owned | Qualitative Property Contributed |
|:-------|:--------------------------|:---------------------------------|
| Member 1 — `<name>` | F1, F2, F3, F4 | **Confidentiality** — passwords stored hashed, role boundaries enforced on every route, a resume readable only by its owner and recruiters they applied to |
| Member 2 — `<name>` | F5, F6, F7, F8 | **Performance** — a filtered listing search returns in under 2 seconds against 5,000+ seeded listings |
| Member 3 — `<name>` | F9, F10, F11, F12 | **Reliability** — no application is lost or duplicated; every status transition is validated and audit-logged |
| Member 4 — `<name>` | F13, F14, F15, F16 | **Usability & fairness** — an in-progress timed test survives a page refresh or dropped connection with answers and clock intact |

Load is balanced at four functional features and one qualitative property per member. User interface,
graphic design, database interaction and unit testing are **not** counted as functional features —
each member performs those for the features they own.

## 5. Technology Stack

| Layer | Choice |
|:------|:-------|
| Frontend | React |
| Backend | Node.js + Express |
| Database | MongoDB |
| Auth | JWT + bcrypt |
| Analytics / scoring service | Python (optional service, per the problem statement's *Python / JavaScript* stack) |
| Testing | Jest + Supertest |

## 6. Evaluation Checklist

- [ ] Project title and group number
- [ ] Team profile with Name + SRN for all members
- [ ] Project description with itemized functional features
- [ ] Plan of work — short-term items
- [ ] "Who should do what" — features mapped per member
- [ ] Qualitative property per member
- [ ] Single team document, exported as **PDF**, submitted by the due date
