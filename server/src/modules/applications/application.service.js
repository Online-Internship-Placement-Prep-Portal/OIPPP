const Application = require('./application.model');
const deps = require('./application.deps');
const audit = require('../audit/audit.service');
const notifications = require('../notifications/notification.service');
const AppError = require('../../utils/AppError');

async function loadListing(listingId) {
  const listing = await deps.Listing().findById(listingId).lean();
  if (!listing) throw new AppError(404, 'NOT_FOUND', 'Listing not found');
  return listing;
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

module.exports = { apply, listMine };
