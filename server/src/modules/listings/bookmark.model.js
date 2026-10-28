const mongoose = require('mongoose');

const bookmarkSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    immutable: true,
  },
  listingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Listing',
    required: true,
    immutable: true,
  },
}, { timestamps: true });

bookmarkSchema.index({ studentId: 1, listingId: 1 }, { unique: true });
bookmarkSchema.index({ studentId: 1, createdAt: -1 });

module.exports = mongoose.models.Bookmark
  || mongoose.model('Bookmark', bookmarkSchema);
