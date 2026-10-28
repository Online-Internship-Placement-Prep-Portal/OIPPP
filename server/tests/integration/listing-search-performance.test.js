const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const Listing = require('../../src/modules/listings/listing.model');
const { searchListings } = require('../../src/modules/listings/listing.search.service');

jest.setTimeout(120000);

let mongo;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());

  const recruiterId = new mongoose.Types.ObjectId();
  const now = Date.now();
  const batchSize = 500;

  for (let batch = 0; batch < 10; batch += 1) {
    const documents = Array.from({ length: batchSize }, (_, i) => {
      const number = batch * batchSize + i;

      return {
        recruiterId,
        company: `Company ${number}`,
        title: number % 10 === 0
          ? `Backend Performance Intern ${number}`
          : `Software Internship ${number}`,
        location: number % 3 === 0 ? 'Bengaluru' : 'Chennai',
        mode: 'HYBRID',
        stipend: 10000 + (number % 20) * 1000,
        skills: number % 2 === 0 ? ['Node.js', 'MongoDB'] : ['Java', 'SQL'],
        status: 'OPEN',
        deadline: new Date(now + (30 + number % 30) * 24 * 60 * 60 * 1000),
      };
    });

    await Listing.insertMany(documents, { ordered: false });
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

describe('Issue #13: listing search performance over 5000 listings', () => {
  const scenarios = [
    {
      name: 'title search',
      filters: { search: 'Backend' },
      expectedTotal: 500,
    },
    {
      name: 'location filter',
      filters: { location: 'Bengaluru' },
      expectedTotal: 1667,
    },
    {
      name: 'skill filter',
      filters: { skill: 'Node.js' },
      expectedTotal: 2500,
    },
    {
      name: 'combined title, location and stipend filters',
      filters: {
        search: 'Backend',
        location: 'Bengaluru',
        minStipend: 15000,
        maxStipend: 25000,
      },
      expectedTotal: 83,
    },
  ];

  test.each(scenarios)('$name stays under the 2-second target', async ({ filters, expectedTotal }) => {
    const timings = [];

    // Warm up the query once before measuring repeated runs.
    await searchListings({ ...filters, page: 1, limit: 20 });

    let result;

    for (let run = 0; run < 3; run += 1) {
      const start = process.hrtime.bigint();

      result = await searchListings({
        ...filters,
        sortBy: 'deadline',
        order: 'asc',
        page: 1,
        limit: 20,
      });

      timings.push(Number(process.hrtime.bigint() - start) / 1e6);
    }

    const averageMs = timings.reduce((sum, value) => sum + value, 0) / timings.length;
    console.log(`${filters.search || filters.skill || filters.location}: ${timings.map(value => value.toFixed(2)).join(', ')} ms; average ${averageMs.toFixed(2)} ms`);

    expect(result.pagination.total).toBe(expectedTotal);
    expect(result.listings).toHaveLength(20);
    expect(averageMs).toBeLessThan(2000);
  });
});

