const mongoose = require('mongoose');
const Listing = require('../../src/modules/listings/listing.model');

const validListing = () => ({
  recruiterId: new mongoose.Types.ObjectId(),
  company: 'Acme Technologies',
  title: 'Software Engineering Intern',
  location: 'Bengaluru',
  mode: 'HYBRID',
  stipend: 25000,
  skills: ['JavaScript', 'Node.js'],
  deadline: new Date('2030-12-31T00:00:00Z'),
});

describe('Listing model - Issue #14', () => {
  test('accepts a valid listing and applies defaults', async () => {
    const listing = new Listing(validListing());

    await expect(listing.validate()).resolves.toBeUndefined();
    expect(listing.status).toBe('OPEN');
    expect(listing.minCgpa).toBeNull();
    expect(Listing.schema.options.timestamps).toBe(true);
    expect(Listing.schema.options.timestamps).toBe(true);
  });

  test.each([
    'recruiterId',
    'company',
    'title',
    'location',
    'mode',
    'stipend',
    'skills',
    'deadline',
  ])('requires %s', async (field) => {
    const data = validListing();
    delete data[field];

    await expect(new Listing(data).validate()).rejects.toThrow();
  });

  test.each(['OFFICE', 'ONLINE', 'FLEXIBLE'])(
    'rejects invalid work mode %s',
    async (mode) => {
      await expect(
        new Listing({ ...validListing(), mode }).validate()
      ).rejects.toThrow();
    }
  );

  test.each([-1, 10.1])('rejects invalid minimum CGPA %s', async (minCgpa) => {
    await expect(
      new Listing({ ...validListing(), minCgpa }).validate()
    ).rejects.toThrow();
  });

  test.each([0, 11])('rejects skill lists of length %i', async (count) => {
    await expect(
      new Listing({
        ...validListing(),
        skills: Array.from({ length: count }, () => 'JavaScript'),
      }).validate()
    ).rejects.toThrow();
  });

  test('rejects invalid status', async () => {
    await expect(
      new Listing({ ...validListing(), status: 'PENDING' }).validate()
    ).rejects.toThrow();
  });

  test('declares the expected search and deadline indexes', () => {
    const indexes = Listing.schema.indexes().map(([fields]) => fields);

    expect(indexes).toContainEqual({
      title: 'text',
      company: 'text',
      skills: 'text',
    });

    expect(indexes).toContainEqual({
      status: 1,
      deadline: 1,
    });
  });
});

