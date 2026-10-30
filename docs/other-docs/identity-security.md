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

Status key: **Met**: the code on `dev` satisfies the requirement. **Partial**: part of it is built. **Open**: not built yet. **Pending deployment**: built, and can only be checked on the live URL.

| ID | Requirement (short form) | Status | Evidence or gap |
|:--|:--|:--|:--|
| AUTH-1 | Register as Student or Recruiter with name, email and password; a Student also gives a valid SRN | Met | `auth.validation.js` requires `srn` for students (`PES[1-2]UG` pattern, upper-cased) and refuses it for recruiters; `User.srn` has a unique sparse index and a duplicate is `409 DUPLICATE` |
| AUTH-2 | Reject a duplicate email with "An account with this email already exists" | Met | `auth.service.js` returns `409 DUPLICATE` with that message |
| AUTH-3 | Passwords of at least 8 characters with at least one letter and one digit | Met | `auth.validation.js` enforces length, a letter and a digit on registration |
| AUTH-4 | A signed JWT that expires 60 minutes after issue | Met | `jwtExpiresIn` defaults to `60m` in `config/env.js` |
| AUTH-5 | Lock the account for 15 minutes after 5 consecutive failed logins | Met | `auth.service.js` counts failures on the user; the sixth try returns `423 ACCOUNT_LOCKED` with `retryAt`, and a successful login resets the count |
| AUTH-6 | Check the role on every protected route; 403 if not allowed | Met | `authenticate` plus `allow()` on every protected router |
| PROF-1 | Edit branch, CGPA (0.00–10.00), graduation year and up to 20 skills | Met | `PUT /profile/me`; the route and the Profile model both cap skills at 20 |
| PROF-2 | Resume upload: PDF only, up to 2 MB | Met | `resume.upload.js` checks the MIME type and the `%PDF-` signature and returns `413` above 2 MB; files go to GridFS |
| PROF-3 | Admin approves or rejects a PENDING recruiter, with a reason code on rejection | Met | `admin.service.js`: both are audit-logged and notify the recruiter in-app and by email |
| PROF-4 | A disabled account's tokens are refused | Met | `authenticate` re-reads the user's status on every request |

### AUTH-1 acceptance

Registering a student with SRN `PES1UG24CS177` succeeds; `PES3UG24CS177` returns `400 VALIDATION` naming the `srn` field. Covered by `tests/integration/auth.test.js` ("Student SRN (AUTH-1)").

## 6.4 Security

| ID | Requirement (short form) | Status | Evidence or gap |
|:--|:--|:--|:--|
| SEC-1 | Passwords stored only as bcrypt hashes, cost ≥ 10; never logged | Met | `bcrypt.hash(password, 12)`; `passwordHash` is excluded from queries by default |
| SEC-2 | HTTPS with TLS 1.2 or higher | Pending deployment | Handled by the hosting platform's TLS. The API itself doesn't terminate TLS. The check is in [deployment.md section 5](deployment.md#5-post-deploy-checks) |
| SEC-3 | Resume served only to the owner, recruiters of listings applied to, and admins | Met | `/profile/me/resume` (owner), `/applications/:id/resume` (applicant, listing owner, admin), `/admin/users/:id/resume` (admin) |
| SEC-4 | Validate every body against a schema; reject `$` operator keys | Met | `middleware/validate.js` (`hasOperatorKey`) on every route that takes input |
| SEC-5 | Login and registration limited to 10 requests per minute per IP | Met | `authLimiter` in `middleware/rate-limit.js`; set `TRUST_PROXY` behind a proxy so the real client IP is used |
| SEC-6 | Every status change and every admin account action written to an audit log the API can't edit | Met | `audit.service.js` from the applications and admin services; no route writes or edits audit entries |

Security objectives SO-1 to SO-3 and the note on the Digital Personal Data Protection Act, 2023 are unchanged from the submitted SRS 5.3.

## Open items

SEC-2 stays pending until the deployed URL can be checked. Every other requirement in 5.1 and 6.4 is met.
