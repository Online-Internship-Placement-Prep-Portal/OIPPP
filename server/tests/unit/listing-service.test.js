const mongoose = require('mongoose');

jest.mock('../../src/modules/listings/listing.model', () => ({
  create: jest.fn(),
  findById: jest.fn(),
  updateMany: jest.fn(),
}));

const Listing = require('../../src/modules/listings/listing.model');
const service = require('../../src/modules/listings/listing.service');

const recruiterId = new mongoose.Types.ObjectId().toString();
const otherRecruiterId = new mongoose.Types.ObjectId().toString();
const listingId = new mongoose.Types.ObjectId().toString();

function makeListing(overrides = {}) {
  const listing = {
    _id: listingId,
    recruiterId,
    company: 'Example Technologies',
    title: 'Backend Intern',
    location: 'Bengaluru',
    mode: 'HYBRID',
    stipend: 15000,
    skills: ['Node.js'],
    minCgpa: null,
    deadline: new Date(Date.now() + 86400000),
    status: 'OPEN',
    set: jest.fn(function (field, value) {
      this[field] = value;
    }),
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };

  return listing;
}

function validInput(overrides = {}) {
  return {
    company: 'Example Technologies',
    title: 'Backend Intern',
    location: 'Bengaluru',
    mode: 'HYBRID',
    stipend: 15000,
    skills: ['Node.js'],
    deadline: new Date(Date.now() + 86400000).toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Listing service unit tests - Issue #15', () => {
  describe('createListing', () => {
    test('creates an open listing for a valid recruiter', async () => {
      const input = validInput();
      Listing.create.mockResolvedValue({ ...input, recruiterId, status: 'OPEN' });

      const result = await service.createListing(recruiterId, input);

      expect(Listing.create).toHaveBeenCalledWith({
        ...input,
        recruiterId,
        status: 'OPEN',
      });
      expect(result.status).toBe('OPEN');
    });

    test('rejects an invalid recruiter ID', async () => {
      await expect(
        service.createListing('invalid-id', validInput())
      ).rejects.toThrow('Invalid recruiter account');

      expect(Listing.create).not.toHaveBeenCalled();
    });

    test('rejects a deadline in the past', async () => {
      const input = validInput({
        deadline: new Date(Date.now() - 60000).toISOString(),
      });

      await expect(
        service.createListing(recruiterId, input)
      ).rejects.toThrow('Deadline must be in the future');

      expect(Listing.create).not.toHaveBeenCalled();
    });
  });

  describe('updateListing', () => {
    test('rejects an invalid listing ID', async () => {
      await expect(
        service.updateListing(recruiterId, 'invalid-id', { title: 'Updated' })
      ).rejects.toThrow('Invalid listing ID');

      expect(Listing.findById).not.toHaveBeenCalled();
    });

    test('rejects when the listing does not exist', async () => {
      Listing.findById.mockResolvedValue(null);

      await expect(
        service.updateListing(recruiterId, listingId, { title: 'Updated' })
      ).rejects.toThrow('Listing not found');
    });

    test('rejects updates by a recruiter who does not own the listing', async () => {
      Listing.findById.mockResolvedValue(makeListing());

      await expect(
        service.updateListing(otherRecruiterId, listingId, { title: 'Updated' })
      ).rejects.toThrow('You can only manage your own listings');
    });

    test('rejects updates to a closed listing', async () => {
      Listing.findById.mockResolvedValue(makeListing({ status: 'CLOSED' }));

      await expect(
        service.updateListing(recruiterId, listingId, { title: 'Updated' })
      ).rejects.toThrow('Listing is already closed');
    });

    test('rejects an update with a deadline in the past', async () => {
      Listing.findById.mockResolvedValue(makeListing());

      await expect(
        service.updateListing(recruiterId, listingId, {
          deadline: new Date(Date.now() - 60000).toISOString(),
        })
      ).rejects.toThrow('Deadline must be in the future');
    });

    test('updates editable fields and saves the listing', async () => {
      const listing = makeListing();
      Listing.findById.mockResolvedValue(listing);

      const result = await service.updateListing(recruiterId, listingId, {
        title: 'Updated Backend Intern',
        stipend: 25000,
        recruiterId: otherRecruiterId,
      });

      expect(listing.set).toHaveBeenCalledWith('title', 'Updated Backend Intern');
      expect(listing.set).toHaveBeenCalledWith('stipend', 25000);
      expect(listing.set).not.toHaveBeenCalledWith('recruiterId', otherRecruiterId);
      expect(listing.save).toHaveBeenCalledTimes(1);
      expect(result.title).toBe('Updated Backend Intern');
      expect(result.stipend).toBe(25000);
    });

    test('closes a listing when status is CLOSED', async () => {
      const listing = makeListing();
      Listing.findById.mockResolvedValue(listing);

      const result = await service.updateListing(recruiterId, listingId, {
        status: 'CLOSED',
      });

      expect(result.status).toBe('CLOSED');
      expect(listing.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('closeExpiredListings', () => {
    test('closes open listings whose deadlines have passed', async () => {
      const updateResult = { modifiedCount: 2 };
      Listing.updateMany.mockResolvedValue(updateResult);

      const result = await service.closeExpiredListings();

      expect(Listing.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'OPEN',
          deadline: expect.objectContaining({ $lte: expect.any(Date) }),
        }),
        { $set: { status: 'CLOSED' } }
      );
      expect(result).toEqual(updateResult);
    });
  });
});
