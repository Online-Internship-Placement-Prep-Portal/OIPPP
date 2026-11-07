const Profile = require('../users/profile.model');
const Listing = require('./listing.model');
const AppError = require('../../utils/AppError');

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const DEFAULT_LIMIT = 20;

// Returns the best matches only; the home page shows the top 10.
async function getRecommendations(studentId, limit = DEFAULT_LIMIT) {
  const profile = await Profile.findOne({ userId: studentId }).lean();

  if (!profile) {
    throw new AppError(404, 'NOT_FOUND', 'Student profile not found');
  }

  const skills = new Set(
    (profile.skills || [])
      .map(skill => skill.trim().toLowerCase())
      .filter(Boolean),
  );

  if (skills.size === 0) {
    return [];
  }

  const now = new Date();
  const eligibility = {
    status: 'OPEN',
    deadline: { $gt: now },
  };

  if (Number.isFinite(profile.cgpa)) {
    eligibility.$or = [
      { minCgpa: null },
      { minCgpa: { $exists: false } },
      { minCgpa: { $lte: profile.cgpa } },
    ];
  } else {
    eligibility.$or = [
      { minCgpa: null },
      { minCgpa: { $exists: false } },
    ];
  }

  // Match skills in the query so only candidate listings leave the database (#123).
  // Skills are stored trimmed, so an anchored case-insensitive regex is an exact match.
  const listings = await Listing.find({
    ...eligibility,
    skills: { $in: [...skills].map(skill => new RegExp(`^${escapeRegex(skill)}$`, 'i')) },
  }).lean();

  return listings
    .map(listing => {
      const matchedSkills = (listing.skills || []).filter(skill =>
        skills.has(skill.trim().toLowerCase()),
      );

      return {
        ...listing,
        matchedSkills: [...new Set(matchedSkills)],
        matchCount: new Set(
          matchedSkills.map(skill => skill.trim().toLowerCase()),
        ).size,
      };
    })
    .filter(listing => listing.matchCount > 0)
    .sort((a, b) =>
      b.matchCount - a.matchCount
      || new Date(a.deadline) - new Date(b.deadline)
      || String(a._id).localeCompare(String(b._id)),
    )
    .slice(0, limit);
}

module.exports = { getRecommendations };
