const Bookmark = require('./bookmark.model');
const Listing = require('./listing.model');
const AppError = require('../../utils/AppError');

// SRCH-4
const MAX_BOOKMARKS = 100;

async function addBookmark(studentId, listingId) {
  const listing = await Listing.findById(listingId);

  if (!listing) {
    throw new AppError(404, 'NOT_FOUND', 'Listing not found');
  }

  if (listing.status !== 'OPEN' || !listing.deadline || listing.deadline <= new Date()) {
    throw new AppError(400, 'LISTING_NOT_BOOKMARKABLE', 'Only open, non-expired listings can be bookmarked');
  }

  const existing = await Bookmark.findOne({ studentId, listingId });
  if (existing) return existing;

  if (await Bookmark.countDocuments({ studentId }) >= MAX_BOOKMARKS) {
    throw new AppError(422, 'BOOKMARK_LIMIT', `You can save at most ${MAX_BOOKMARKS} internships`);
  }

  try {
    return await Bookmark.create({ studentId, listingId });
  } catch (err) {
    if (err.code === 11000) {
      return Bookmark.findOne({ studentId, listingId });
    }
    throw err;
  }
}

async function removeBookmark(studentId, listingId) {
  await Bookmark.deleteOne({ studentId, listingId });
}

async function listBookmarks(studentId) {
  const bookmarks = await Bookmark.find({ studentId })
    .sort({ createdAt: -1 })
    .populate('listingId')
    .lean();

  return bookmarks.filter(bookmark => bookmark.listingId);
}

module.exports = { addBookmark, removeBookmark, listBookmarks, MAX_BOOKMARKS };
