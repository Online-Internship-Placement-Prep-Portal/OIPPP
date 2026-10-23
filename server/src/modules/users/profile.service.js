const Profile = require('./profile.model');
const AppError = require('../../utils/AppError');

async function getMyProfile(userId) {
const profile = await Profile.findOne({ userId }).lean();

if (!profile) {
throw new AppError(404, 'NOT_FOUND', 'Profile not found');
}

return profile;
}

async function updateMyProfile(userId, updates) {
const profile = await Profile.findOneAndUpdate(
{ userId },
{ $set: updates },
{
new: true,
runValidators: true,
},
).lean();

if (!profile) {
throw new AppError(404, 'NOT_FOUND', 'Profile not found');
}

return profile;
}

module.exports = { getMyProfile, updateMyProfile };
