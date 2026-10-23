const Application = require('./application.model');
const { canTransition } = require('./application.constants');
const deps = require('./application.deps');
const audit = require('../audit/audit.service');
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

// BR-2: only the recruiter who owns the listing
function assertOwner(listing, recruiterId) {
  if (String(listing.recruiterId) !== String(recruiterId)) {
    throw new AppError(403, 'NOT_LISTING_OWNER', 'You can only manage applications for your own listings');
  }
}

// APP-1 .. APP-3
async function apply(studentId, { listingId, coverNote }) {
  const listing = await loadListing(listingId);
  if (listing.status !== 'OPEN' || (listing.deadline && new Date(listing.deadline) < new Date())) {
    throw new AppError(409, 'LISTING_CLOSED', 'Applications for this internship are closed');
  }

  const existing = await Application.findOne({ studentId, listingId }).select('_id status').lean();
  if (existing) throw alreadyApplied(existing);

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
    // two submits at once: the unique index lets exactly one through (SAD 3.7)
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

function alreadyApplied(existing) {
  return new AppError(409, 'ALREADY_APPLIED', 'You have already applied to this internship',
    existing ? [{ applicationId: String(existing._id), status: existing.status }] : undefined);
}

// APP-5
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

// REV-2, REV-4, APP-4
async function updateStatus(recruiterId, applicationId, { status }) {
  const application = await Application.findById(applicationId).lean();
  if (!application) throw new AppError(404, 'NOT_FOUND', 'Application not found');
  const listing = await loadListing(application.listingId);
  assertOwner(listing, recruiterId);

  const from = application.status;
  if (!canTransition(from, status)) {
    throw new AppError(422, 'INVALID_TRANSITION', `Cannot move an application from ${from} to ${status}`);
  }
  const entry = { from, to: status, by: recruiterId, at: new Date() };
  const set = { status };
  // conditional on the old status so two recruiters clicking at once cannot both win
  const updated = await Application.findOneAndUpdate(
    { _id: applicationId, status: from },
    { $set: set, $push: { history: entry } },
    { new: true },
  );
  if (!updated) throw new AppError(409, 'STALE_STATUS', 'The application changed meanwhile, please reload');

  await audit.record(recruiterId, 'APPLICATION_STATUS_CHANGED', 'Application', updated._id,
    { status: from }, { status });

  await notifications.notify(updated.studentId, {
    type: 'APPLICATION_STATUS',
    title: `${listing.title}: ${STATUS_LABEL[status]}`,
    message: `Your application for ${listing.title} at ${listing.company} is now ${STATUS_LABEL[status]}.`,
    applicationId: updated._id,
  }, { email: true });

  return updated;
}

module.exports = { apply, listMine, updateStatus };
