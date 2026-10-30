const Settings = require('./settings.model');
const audit = require('../audit/audit.service');

const DEFAULTS = Object.freeze({ oneOfferPolicy: false });

function toPublic(doc) {
  return { oneOfferPolicy: doc ? doc.oneOfferPolicy : DEFAULTS.oneOfferPolicy };
}

async function getSettings() {
  return toPublic(await Settings.findOne({ key: 'global' }).lean());
}

async function updateSettings(adminId, changes) {
  const before = await getSettings();
  const doc = await Settings.findOneAndUpdate(
    { key: 'global' },
    { $set: changes },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  const after = toPublic(doc);

  await audit.record(adminId, 'SETTINGS_UPDATED', 'Settings', doc._id, before, after);
  return after;
}

module.exports = { getSettings, updateSettings };
