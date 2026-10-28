# SRS Sections for Backlog Item 2.8 / Issue #16

## Purpose and source

This document provides an editable reference to the approved release-1.0 Software Requirements Specification (SRS). The approved PDF remains the authoritative baseline and is not modified by this document.

Source: `docs/Part-1_Deliverables/SRS.pdf`, version 1.0, approved 02 October 2026.

## Backlog-to-SRS mapping

| Requested backlog section | Approved SRS location | PDF page |
| --- | --- | --- |
| 2.2 | 2.2 Product Functions | 4 |
| 5.2 | 5.2 Safety Requirements | 12 |
| 6.1 | No subsection 6.1 appears in the approved SRS. Section 6 is titled Other Requirements. | 13 |

**Numbering discrepancy:** The issue requests section 6.1, but the approved SRS contains only section 6, "Other Requirements", with no numbered 6.1 subsection. This document records the discrepancy without inventing a subsection or changing the approved numbering. Confirm the intended mapping with the project team if a distinct 6.1 section is required.

## 2.2 Product Functions

### Identity and administration

- Register and log in as Student or Recruiter; admins are created by seed script.
- Student profile with academic details, skills and one resume.
- Admin approves recruiters and disables accounts.

### Listings and discovery

- Recruiters post, edit and close internship listings; listings close on their deadline.
- Students search, filter, sort and bookmark listings and get a skill-matched home feed.

### Applications

- Students apply once per listing and follow status from Applied to Offer or Rejected.
- Recruiters review applicants and change status; students are notified in-app and by email.

### Preparation and analytics

- Admins build aptitude tests from a question bank.
- Students take timed tests with auto-save and see per-topic results.
- Students see their progress; the admin sees placement statistics and exports a CSV report.

## 5.2 Safety Requirements

No physical harm is possible. The losses that matter are a student losing a test attempt and the college losing placement records.

SAFE-1: No answer saved during a test attempt shall be lost if the browser is refreshed, closed or disconnected; the attempt resumes with saved answers and the remaining time.

SAFE-2: Disabling an account shall not delete its applications or attempts, so placement records stay complete.

## 6. Other Requirements

The approved SRS specifies:

- Database: every collection has a schema in Mongoose; unique indexes on user email, (studentId, listingId) in applications and (studentId, testId) in attempts; text index on listing title, company and skills.
- Backups: Atlas daily snapshot, kept 7 days.
- Internationalization: English only for 1.0; dates shown as DD-MM-YYYY and money in INR.
- Reuse: no code is copied from other projects; open-source libraries are listed in package.json with their licences (all MIT or Apache 2.0).
- Legal: the project is released under the MIT licence.

## Change control

This Markdown document is an editable reference and does not replace the approved SRS PDF. Requirement changes must follow team review and the normal pull-request process.
