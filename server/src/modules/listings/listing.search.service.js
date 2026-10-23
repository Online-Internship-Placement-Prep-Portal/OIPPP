const Listing = require('./listing.model');

const SORT_FIELDS = {
  deadline: 'deadline',
  stipend: 'stipend',
  postedAt: 'createdAt',
  title: 'title',
};

async function searchListings(filters) {
  const {
    search,
    location,
    minStipend,
    maxStipend,
    skill,
    deadlineBefore,
    deadlineAfter,
    sortBy = 'deadline',
    order = 'asc',
    page = 1,
    limit = 20,
  } = filters;

  const now = new Date();
  const query = {
    status: 'OPEN',
    deadline: { $gt: now },
  };

  if (search) {
    query.title = { $regex: escapeRegex(search), $options: 'i' };
  }

  if (location) {
    query.location = { $regex: escapeRegex(location), $options: 'i' };
  }

  if (minStipend !== undefined || maxStipend !== undefined) {
    query.stipend = {};
    if (minStipend !== undefined) query.stipend.$gte = minStipend;
    if (maxStipend !== undefined) query.stipend.$lte = maxStipend;
  }

  if (skill) {
    query.skills = { $in: [new RegExp(`^${escapeRegex(skill)}$`, 'i')] };
  }

  // Keep the expiry rule and user-selected deadline bounds together.
  if (deadlineBefore) {
    query.deadline.$lte = new Date(deadlineBefore);
  }

  if (deadlineAfter) {
    const requestedStart = new Date(deadlineAfter);
    query.deadline.$gt = requestedStart > now ? requestedStart : now;
  }

  const sortField = SORT_FIELDS[sortBy] || 'deadline';
  const sortDirection = order === 'desc' ? -1 : 1;
  const skip = (page - 1) * limit;

  const [listings, total] = await Promise.all([
    Listing.find(query)
      .sort({ [sortField]: sortDirection, _id: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Listing.countDocuments(query),
  ]);

  return {
    listings,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { searchListings };
