const mongoose = require('mongoose');

// One document holds the portal-wide policy switches.
const settingsSchema = new mongoose.Schema({
  key: { type: String, default: 'global', immutable: true },
  oneOfferPolicy: { type: Boolean, default: false },
}, { timestamps: true });

settingsSchema.index({ key: 1 }, { unique: true });

module.exports = mongoose.models.Settings || mongoose.model('Settings', settingsSchema);
