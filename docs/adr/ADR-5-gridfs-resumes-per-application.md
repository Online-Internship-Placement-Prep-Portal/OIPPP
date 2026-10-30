# ADR-5: Resumes in GridFS, kept with each application

**Status:** Accepted

**Date:** 30 Oct 2026

## Context

A student has one current resume (SRS 4.2). A PDF of up to 2 MB is accepted (PROF-2). APP-1 says an application attaches "the current resume". If a student uploads a new resume after applying, the recruiter must still see the file that was actually sent. A resume may be read only by its owner, recruiters of listings the student applied to, and admins (SEC-3). Storage is Atlas M0 with 512 MB in total.

## Decision

- Store resumes in the GridFS bucket `resumes`, in the same database (`users/resume.storage.js`). There is no separate file service.
- Before storing, check both the MIME type and the `%PDF-` file signature, and enforce the 2 MB limit (`users/resume.upload.js`).
- On apply, copy the profile's current `resumeFileId` onto the Application. That file id never changes on the application.
- When a student uploads a new resume, the old file is deleted only if no application references it (`users/profile.service.js`). A sparse index on `Application.resumeFileId` keeps that check cheap.
- Serve each file through a route that checks who is asking:

| Route | Who |
|:--|:--|
| `GET /api/profile/me/resume` | The student |
| `GET /api/applications/:id/resume` | The applicant, the recruiter who owns the listing, an admin |
| `GET /api/admin/users/:id/resume` | An admin |

## Consequences

- Recruiters always review the exact file that came with the application.
- Storage grows only with resumes still in use. At 2 MB and one live file per student, plus files kept for applications, a 2,000-student batch fits within Atlas M0, as SAD 3.7 estimated.
- Backups and transactions cover resumes along with every other record.
- Files are streamed, never loaded whole into memory. If a file is missing, the route returns a JSON `404 RESUME_NOT_FOUND` instead of a broken PDF.
