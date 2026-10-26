# Identity, user classes and security: SRS sections (task 1.8)

These are the editable versions of the identity sections for issue #8. The submitted [SRS](../Part-1_Deliverables/SRS.pdf) stays the approved baseline. This page doesn't change any requirement text or ID. It maps the backlog section numbers to the submitted ones and records, for each requirement, what the code on `dev` does today.

| Backlog section | Submitted SRS location |
|:--|:--|
| 2.3 User Classes | 2.3 User Classes and Characteristics |
| 5.1 Auth feature | 4.1 Authentication and Role-Based Access; 4.2 Profile and User Administration |
| 6.4 Security | 5.3 Security Requirements |

The numbering was reconciled the same way as in [DEVIATIONS](DEVIATIONS.md) rows 5 and 8.

## 2.3 User classes and characteristics

| Class | Who | Frequency | Privilege | `role` / starting `status` |
|:--|:--|:--|:--|:--|
| Student (most important) | UG/PG students in their placement year, about 2,000 per batch | Daily during the season | Own profile, applications and attempts | `STUDENT` / `ACTIVE` |
| Recruiter | HR staff or engineers from visiting companies | Weekly, heavier near deadlines | Own listings and their applicants | `RECRUITER` / `PENDING` until an admin approves |
| Placement Admin | Placement office staff, 2 to 4 people | Daily | Full access: approvals, tests, statistics | `ADMIN`, seeded and never self-registered |

The roles are enforced by `allow(...roles)` in [`middleware/auth.js`](../../server/src/middleware/auth.js). The full role-to-route matrix is in the [API contract](api-contract.md#routes).

## 5.1 Authentication, profile and user administration

Status key: **Met**: the code on `dev` satisfies the requirement. **Partial**: part of it is built. **Open**: not built yet.

| ID | Requirement (short form) | Status | Evidence or gap |
|:--|:--|:--|:--|
| AUTH-1 | Register as Student or Recruiter with name, email and password; a Student also gives a valid SRN | Partial | Registration is in `auth.routes.js` / `auth.validation.js`. No SRN field or pattern check yet |
| AUTH-2 | Reject a duplicate email with "An account with this email already exists" | Met | `auth.service.js` returns `409 DUPLICATE` with that message |
| AUTH-3 | Passwords of at least 8 characters with at least one letter and one digit | Partial | The minimum length is enforced; the letter-and-digit rule isn't |
| AUTH-4 | A signed JWT that expires 60 minutes after issue | Met | `jwtExpiresIn` defaults to `60m` in `config/env.js` |
| AUTH-5 | Lock the account for 15 minutes after 5 consecutive failed logins | Open | No failed-login counter yet |
| AUTH-6 | Check the role on every protected route; 403 if not allowed | Met | `authenticate` plus `allow()` on every protected router |
| PROF-1 | Edit branch, CGPA (0.00–10.00), graduation year and up to 20 skills | Partial | `PUT /profile/me` exists, but the skill limit is 100, not 20 |
| PROF-2 | Resume upload: PDF only, up to 2 MB | Open | Planned under 1.3 (#3) |
| PROF-3 | Admin approves or rejects a PENDING recruiter, with a reason code on rejection | Partial | Approve is built and audit-logged; reject isn't |
| PROF-4 | A disabled account's tokens are refused | Met | `authenticate` re-reads the user's status on every request |

### Acceptance criteria for the open and partial items

These are elaborations of the requirements, not new requirements. They give the owner of #3 and #4 a test to write against.

- **AUTH-1:** registering a student with SRN `PES1UG24CS177` succeeds. `PES3UG24CS177` returns `400 VALIDATION` naming the `srn` field.
- **AUTH-3:** `password1` is accepted. `password` and `12345678` each return `400` with the rule that failed.
- **AUTH-5:** five wrong passwords in a row followed by the correct one returns `423` (or `403`) with a retry time. Logging in correctly after 15 minutes succeeds.
- **PROF-1:** saving 21 skills returns `400`.
- **PROF-2:** a 2 MB PDF is saved. A 2.1 MB PDF, or a `.docx` renamed to `.pdf`, is rejected with the reason.
- **PROF-3:** rejecting a recruiter without a reason code returns `400`. A rejection sets the status to `REJECTED`, writes an audit entry and sends the decision email.

## 6.4 Security

| ID | Requirement (short form) | Status | Evidence or gap |
|:--|:--|:--|:--|
| SEC-1 | Passwords stored only as bcrypt hashes, cost ≥ 10; never logged | Met | `bcrypt.hash(password, 12)`; `passwordHash` is excluded from queries by default |
| SEC-2 | HTTPS with TLS 1.2 or higher | Met at deploy | Handled by the hosting platform's TLS. The API itself doesn't terminate TLS |
| SEC-3 | Resume served only to the owner, recruiters of listings applied to, and admins | Open | Depends on PROF-2 |
| SEC-4 | Validate every body against a schema; reject `$` operator keys | Met | `middleware/validate.js` (`hasOperatorKey`) on every route that takes input |
| SEC-5 | Login and registration limited to 10 requests per minute per IP | Partial | Only the global limit of 300 per minute on `/api` exists; no stricter auth limiter |
| SEC-6 | Every status change and every admin account action written to an audit log the API can't edit | Met | `audit.service.js` from the applications and admin services; no route writes or edits audit entries |

Security objectives SO-1 to SO-3 and the note on the Digital Personal Data Protection Act, 2023 are unchanged from the submitted SRS 5.3.

## Open items handed to the owners

| Gap | Backlog item | Owner |
|:--|:--|:--|
| SRN on registration, the password rule and the 20-skill limit (AUTH-1, AUTH-3, PROF-1) | 1.3 (#3) | @deekshithgowdag |
| Resume upload and access control (PROF-2, SEC-3) | 1.3 (#3), 1.5 (#5) | @deekshithgowdag |
| Rejecting a recruiter with a reason (PROF-3) | 1.4 (#4) | @deekshithgowdag |
| Login lockout and the auth rate limit (AUTH-5, SEC-5) | 1.5 (#5) | @deekshithgowdag |
