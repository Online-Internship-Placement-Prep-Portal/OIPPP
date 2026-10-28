const Bookmark = require('./bookmark.model');
const Listing = require('./listing.model');
const AppError = require('../../utils/AppError');

async function addBookmark(studentId, listingId) {
  const listing = await Listing.findById(listingId);

  if (!listing) {
    throw new AppError(404, 'LISTING_NOT_FOUND', 'Listing not found');
  }

  if (listing.status !== 'OPEN' || !listing.deadline || listing.deadline <= new Date()) {
    throw new AppError(400, 'LISTING_NOT_BOOKMARKABLE', 'Only open, non-expired listings can be bookmarked');
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

module.exports = { addBookmark, removeBookmark, listBookmarks };
