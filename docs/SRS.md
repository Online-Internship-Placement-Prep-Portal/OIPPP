# Software Requirements Specification

**Online Internship & Placement Preparation Portal (OIPPP)**
Version 0.1 (draft) — PES University, Bangalore, Dept. of Computer Science and Engineering

> Scaffold mirroring the section structure of `SRS-Document.pdf`. Each heading carries a short note
> on what belongs there and **who writes it** (see [`../CONTRIBUTING.md`](../CONTRIBUTING.md)).
> Replace every `TBD` before submission and export as PDF.

## Revision History

| Name | Date | Reason for Changes | Version |
|:-----|:-----|:-------------------|:--------|
| `<author>` | `<date>` | Initial draft | 0.1 |

---

## 1. Introduction

### 1.1 Purpose
Specifies the requirements for OIPPP v1.0 — a web portal for internship listings, applications,
aptitude preparation, progress tracking and placement analytics. This SRS covers the whole system.
*Owner: Member 2.*

### 1.2 Intended Audience
Developers (the four team members), the course instructor as evaluator, the placement cell as
prospective customer, and testers. *Owner: Member 2.*

### 1.3 Product Scope
See `PROPOSAL.md` §3.1 — summarize, do not duplicate. *Owner: Member 2.*

### 1.4 References
Project Guidelines (course handout); IEEE 830 SRS template; React / Express / MongoDB
documentation. *Owner: Member 2.*

### 1.5 Definitions, Acronyms and Abbreviations
Listing, Application, Attempt, SRN, JWT, RBAC — full definitions in Appendix A. *Owner: Member 3.*

---

## 2. Overall Description

### 2.1 Product Perspective
A new, self-contained product; not a replacement for an existing system. Include the component
diagram (client → API → database, plus the Python analytics service). *Owner: Member 2.*

### 2.2 Product Functions
High-level bullet summary of F1–F16 from `PROPOSAL.md` §3.4, grouped by module. *Owner: Member 2.*

### 2.3 User Classes and Characteristics
Student, Recruiter, Placement Admin — frequency of use, technical expertise, privilege level.
*Owner: Member 1.*

### 2.4 Operating Environment
Modern desktop/mobile browsers; Node.js LTS server; MongoDB; deployed on `TBD`. *Owner: Member 3.*

### 2.5 Design and Implementation Constraints
MERN stack mandated by the problem statement; academic semester timeline; no paid third-party
services; REST over HTTPS. *Owner: Member 3.*

### 2.6 Assumptions and Dependencies
Reliable internet during a timed test attempt; recruiters supply genuine listings; email delivery via
a free-tier provider. *Owner: Member 3.*

---

## 3. External Interface Requirements

### 3.1 User Interfaces
Screen inventory and layout constraints — login, student home feed, listing detail, application
tracker, recruiter applicant view, test attempt screen, analytics dashboard. Standard error-message
and navigation conventions. *Owner: split — each member specifies the screens for their own features.*

### 3.2 Software Interfaces
MongoDB driver, JWT library, mail service, Python analytics service — name the data items crossing
each boundary. *Owner: Member 4.*

### 3.3 Communications Interfaces
HTTPS/REST, JSON payloads, email notifications, session token handling. *Owner: Member 3.*

### 3.4 Analysis Models
Use-case diagram and ER diagram → place source files in `docs/diagrams/`. *Owner: Member 4.*

---

## 4. System Features

One subsection per feature, each with **4.x.1 Description and Priority**, **4.x.2 Stimulus/Response
Sequences**, and **4.x.3 Functional Requirements** (uniquely tagged `REQ-n`, including behaviour on
invalid input).

| § | Feature | Features Covered | Priority | Owner |
|:-:|:--------|:-----------------|:--------:|:------|
| 4.1 | Authentication & Role-Based Access | F1, F2 | High | Member 1 |
| 4.2 | Profile & User Administration | F3, F4 | High | Member 1 |
| 4.3 | Internship Listing Management | F5 | High | Member 2 |
| 4.4 | Search, Filtering & Recommendations | F6, F7, F8 | High | Member 2 |
| 4.5 | Application Submission & Tracking | F9, F10 | High | Member 3 |
| 4.6 | Recruiter Review & Notifications | F11, F12 | Medium | Member 3 |
| 4.7 | Aptitude Test Engine | F13, F14, F15 | High | Member 4 |
| 4.8 | Progress Tracking & Analytics | F16 | Medium | Member 4 |

**Worked example — 4.5 Application Submission & Tracking**

- *Description and Priority:* a student submits an application to an open listing and follows its
  status. Priority High (benefit 9, penalty 9, cost 5, risk 4).
- *Stimulus/Response:* student opens a listing → presses **Apply** → system checks the deadline and
  any prior application → stores the application as `Applied` → notifies the recruiter.
- *Functional Requirements:*
  - `REQ-1`: The system shall let an authenticated student submit exactly one application per listing.
  - `REQ-2`: The system shall reject an application to a listing past its deadline and display the reason.
  - `REQ-3`: The system shall record every status transition with actor and timestamp.

---

## 5. Other Nonfunctional Requirements

### 5.1 Performance Requirements
State each as measurable — e.g. filtered listing search under 2 s over 5,000+ listings; test answer
auto-save within 1 s. *Owner: Member 2.*

### 5.2 Safety Requirements
Data loss during a timed attempt; safeguards on account deactivation. *Owner: Member 4.*

### 5.3 Security Requirements
Password hashing, JWT expiry, RBAC on every route, resume access restricted to owner and applied
recruiter, transport over HTTPS. *Owner: Member 1.*

### 5.4 Software Quality Attributes
Usability, reliability, maintainability, testability — stated quantitatively and verifiably.
*Owner: Member 4.*

### 5.5 Business Rules
Who may do what, and when: only approved recruiters post listings; only the owning recruiter changes
an application's status; a student attempts a given test once. *Owner: Member 3.*

### 5.6 Domain Requirements
Placement-cycle rules — eligibility criteria, offer caps, blacklisting. *Owner: Member 3.*

---

## 6. Other Requirements
Database, internationalization, legal and reuse requirements. *Owner: Member 4.*

---

## Appendix A: Glossary
*Owner: Member 3.*

## Appendix B: Field Layouts
Per the template, an accompanying sheet of field layouts and report requirements. Adapt the PDF's
banking example to this domain — e.g. the student-registration fields below — and list the report
fields for a **Placement Report** and an **Application Report**. *Owner: Member 1.*

| Field | Length | Data Type | Description | Mandatory |
|:------|:------:|:----------|:------------|:---------:|
| SRN | 13 | Alphanumeric | Student registration number | Y |
| Full Name | 60 | String | | Y |
| Email | 60 | String | Institutional email | Y |
| Branch | 30 | String | | Y |
| CGPA | 4 | Numeric | | Y |
| Graduation Year | 4 | Numeric | | Y |
| Resume File ID | 24 | Alphanumeric | Reference to stored resume | N |
| Account Status | 25 | Alphanumeric | Active / Pending / Disabled | Y |
| Reject Reason Code | 4 | String | Set when a recruiter account is rejected | N |

## Appendix C: Requirement Traceability Matrix
*Owner: Member 3.* Fill one row per `REQ-n` as implementation proceeds.

| Sl. No | Requirement ID | Brief Description | Architecture Reference | Design Reference | Code File Reference | Test Case ID | System Test Case ID |
|:------:|:---------------|:------------------|:-----------------------|:-----------------|:--------------------|:-------------|:--------------------|
| 1 | REQ-1 | One application per listing | TBD | TBD | TBD | TBD | TBD |
