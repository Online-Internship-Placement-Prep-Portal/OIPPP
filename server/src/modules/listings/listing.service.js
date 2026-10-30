const mongoose = require('mongoose');
const Listing = require('./listing.model');
const AppError = require('../../utils/AppError');

const EDITABLE_FIELDS = [
  'company', 'title', 'location', 'mode', 'stipend',
  'skills', 'minCgpa', 'deadline',
];

async function createListing(recruiterId, input) {
  if (!mongoose.isValidObjectId(recruiterId)) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Invalid recruiter account');
  }

  if (new Date(input.deadline).getTime() <= Date.now()) {
    throw new AppError(400, 'VALIDATION', 'Deadline must be in the future');
  }

  return Listing.create({ ...input, recruiterId, status: 'OPEN' });
}

async function updateListing(recruiterId, listingId, input) {
  if (!mongoose.isValidObjectId(listingId)) {
    throw new AppError(400, 'VALIDATION', 'Invalid listing ID');
  }

  const listing = await Listing.findById(listingId);

  if (!listing) {
    throw new AppError(404, 'NOT_FOUND', 'Listing not found');
  }

  if (String(listing.recruiterId) !== String(recruiterId)) {
    throw new AppError(403, 'NOT_OWNER', 'You can only manage your own listings');
  }

  if (listing.status === 'CLOSED') {
    throw new AppError(409, 'LISTING_CLOSED', 'Listing is already closed');
  }

  if (input.deadline !== undefined && new Date(input.deadline).getTime() <= Date.now()) {
    throw new AppError(400, 'VALIDATION', 'Deadline must be in the future');
  }

  for (const field of EDITABLE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(input, field)) {
      listing.set(field, input[field]);
    }
  }

  if (input.status === 'CLOSED') {
    listing.status = 'CLOSED';
  }

  await listing.save();
  return listing;
}

async function getListing(listingId) {
  const listing = await Listing.findById(listingId).lean();
  if (!listing) throw new AppError(404, 'NOT_FOUND', 'Listing not found');
  return listing;
}

function listMine(recruiterId) {
  return Listing.find({ recruiterId }).sort({ createdAt: -1 }).lean();
}

async function closeExpiredListings() {
  return Listing.updateMany(
    { status: 'OPEN', deadline: { $lte: new Date() } },
    { $set: { status: 'CLOSED' } }
  );
}

module.exports = { createListing, updateListing, getListing, listMine, closeExpiredListings };
