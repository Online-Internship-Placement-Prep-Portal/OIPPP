const Application = require('./application.model');
const { canTransition, REJECT_REASONS } = require('./application.constants');
const deps = require('./application.deps');
const audit = require('../audit/audit.service');
const settings = require('../settings/settings.service');
const notifications = require('../notifications/notification.service');
const AppError = require('../../utils/AppError');

const STATUS_LABEL = {
  APPLIED: 'Applied', SHORTLISTED: 'Shortlisted', INTERVIEW: 'Interview', OFFER: 'Offer', REJECTED: 'Rejected',
};

async function loadListing(listingId) {
  const listing = await deps.Listing().findById(listingId).lean();
  if (!listing) throw new AppError(404, 'NOT_FOUND', 'Listing not found');
  return listing;
}

function assertOwner(listing, recruiterId) {
  if (String(listing.recruiterId) !== String(recruiterId)) {
    throw new AppError(403, 'NOT_LISTING_OWNER', 'You can only manage applications for your own listings');
  }
}

function alreadyApplied(existing) {
  return new AppError(409, 'ALREADY_APPLIED', 'You have already applied to this internship',
    existing ? [{ applicationId: String(existing._id), status: existing.status }] : undefined);
}

async function apply(studentId, { listingId, coverNote }) {
  const listing = await loadListing(listingId);
  if (listing.status !== 'OPEN' || (listing.deadline && new Date(listing.deadline) <= new Date())) {
    throw new AppError(409, 'LISTING_CLOSED', 'Applications for this internship are closed');
  }

  const existing = await Application.findOne({ studentId, listingId }).select('_id status').lean();
  if (existing) throw alreadyApplied(existing);

  // DOM-2: with the one-offer policy on, an offer holder cannot apply again.
  if ((await settings.getSettings()).oneOfferPolicy
    && await Application.exists({ studentId, status: 'OFFER' })) {
    throw new AppError(422, 'OFFER_HELD', 'You already hold an offer; the one-offer policy is on');
  }

  const profile = await deps.Profile().findOne({ userId: studentId }).lean();
  if (listing.minCgpa != null && (!profile || profile.cgpa == null || profile.cgpa < listing.minCgpa)) {
    throw new AppError(422, 'NOT_ELIGIBLE', `Minimum CGPA required is ${Number(listing.minCgpa).toFixed(1)}`,
      [{ field: 'cgpa', message: `required ${listing.minCgpa}` }]);
  }

  let application;
  try {
    application = await Application.create({
      studentId, listingId, coverNote,
      resumeFileId: profile && profile.resumeFileId,
      history: [{ from: null, to: 'APPLIED', by: studentId }],
    });
  } catch (err) {
    // Concurrent submits: the unique index lets exactly one through.
    if (err.code === 11000) {
      throw alreadyApplied(await Application.findOne({ studentId, listingId }).select('_id status').lean());
    }
    throw err;
  }

  await audit.record(studentId, 'APPLICATION_CREATED', 'Application', application._id, null, { status: 'APPLIED' });
  await notifications.notify(listing.recruiterId, {
    type: 'APPLICATION_RECEIVED',
    title: `New application for ${listing.title}`,
    message: `A student applied to ${listing.title}.`,
    applicationId: application._id,
  });
  return application;
}

async function listMine(studentId) {
  const items = await Application.find({ studentId }).sort({ createdAt: -1 }).lean();
  const listings = await deps.Listing().find({ _id: { $in: items.map((a) => a.listingId) } })
    .select('title company status deadline').lean();
  const byId = new Map(listings.map((l) => [String(l._id), l]));
  return items.map((a) => ({
    ...a,
    listing: byId.get(String(a.listingId)) || null,
    history: [...a.history].reverse(),
  }));
}

async function listForListing(recruiterId, listingId, { status, page = 1, limit = 20 }) {
  const listing = await loadListing(listingId);
  assertOwner(listing, recruiterId);

  const filter = { listingId };
  if (status) filter.status = status;
  const [items, total] = await Promise.all([
    Application.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Application.countDocuments(filter),
  ]);

  const studentIds = items.map((a) => a.studentId);
  const [profiles, users] = await Promise.all([
    deps.Profile().find({ userId: { $in: studentIds } }).select('userId branch gradYear cgpa skills').lean(),
    deps.User().find({ _id: { $in: studentIds } }).select('name').lean(),
  ]);
  const profileOf = new Map(profiles.map((p) => [String(p.userId), p]));
  const nameOf = new Map(users.map((u) => [String(u._id), u.name]));

  return {
    items: items.map((a) => {
      const p = profileOf.get(String(a.studentId)) || {};
      return {
        _id: a._id,
        status: a.status,
        rejectReason: a.rejectReason,
        coverNote: a.coverNote,
        appliedAt: a.createdAt,
        student: {
          id: a.studentId, name: nameOf.get(String(a.studentId)),
          branch: p.branch, gradYear: p.gradYear, cgpa: p.cgpa, skills: p.skills,
        },
        resumeUrl: `/api/applications/${a._id}/resume`,
      };
    }),
    total,
    page,
  };
}

async function updateStatus(recruiterId, applicationId, { status, reasonCode }) {
  const application = await Application.findById(applicationId).lean();
  if (!application) throw new AppError(404, 'NOT_FOUND', 'Application not found');
  const listing = await loadListing(application.listingId);
  assertOwner(listing, recruiterId);

  const from = application.status;
  if (!canTransition(from, status)) {
    throw new AppError(422, 'INVALID_TRANSITION', `Cannot move an application from ${from} to ${status}`);
  }
  if (status === 'REJECTED' && !REJECT_REASONS[reasonCode]) {
    throw new AppError(400, 'REASON_REQUIRED', 'Choose a rejection reason',
      [{ field: 'reasonCode', message: `one of ${Object.keys(REJECT_REASONS).join(', ')}` }]);
  }

  const entry = { from, to: status, by: recruiterId, at: new Date() };
  const set = { status };
  if (status === 'REJECTED') {
    entry.reasonCode = reasonCode;
    set.rejectReason = reasonCode;
  }
  // Conditional on the old status so two concurrent updates cannot both win.
  const updated = await Application.findOneAndUpdate(
    { _id: applicationId, status: from },
    { $set: set, $push: { history: entry } },
    { new: true },
  );
  if (!updated) throw new AppError(409, 'STALE_STATUS', 'The application changed meanwhile, please reload');

  await audit.record(recruiterId, 'APPLICATION_STATUS_CHANGED', 'Application', updated._id,
    { status: from }, { status, reasonCode: set.rejectReason });

  const reasonText = status === 'REJECTED' ? ` Reason: ${REJECT_REASONS[reasonCode]}.` : '';
  await notifications.notify(updated.studentId, {
    type: 'APPLICATION_STATUS',
    title: `${listing.title}: ${STATUS_LABEL[status]}`,
    message: `Your application for ${listing.title} at ${listing.company} is now ${STATUS_LABEL[status]}.${reasonText}`,
    applicationId: updated._id,
  }, { email: true });

  return updated;
}

async function getResumeForApplication(userId, role, applicationId) {
  const application = await Application.findById(applicationId).lean();

  if (!application) {
    throw new AppError(404, 'NOT_FOUND', 'Application not found');
  }

  if (role === 'STUDENT' && String(application.studentId) !== String(userId)) {
    throw new AppError(403, 'FORBIDDEN', 'You cannot access this application');
  }

  if (role === 'RECRUITER') {
    assertOwner(await loadListing(application.listingId), userId);
  }

  if (!application.resumeFileId) {
    throw new AppError(404, 'RESUME_NOT_FOUND', 'No resume was submitted with this application');
  }

  return application.resumeFileId;
}

module.exports = {
  apply,
  listMine,
  listForListing,
  updateStatus,
  getResumeForApplication,
};
