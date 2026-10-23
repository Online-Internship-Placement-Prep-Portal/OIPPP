const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

async function main() {
  const mongo = await MongoMemoryServer.create();

  try {
    await mongoose.connect(mongo.getUri());

    const Listing = require('../src/modules/listings/listing.model');
    const { searchListings } = require('../src/modules/listings/listing.search.service');

    await Listing.init();

    const recruiterId = new mongoose.Types.ObjectId();
    const now = Date.now();
    const batchSize = 500;
    const totalListings = 5000;

    for (let start = 0; start < totalListings; start += batchSize) {
      const docs = Array.from(
        { length: Math.min(batchSize, totalListings - start) },
        (_, offset) => {
          const i = start + offset;

          return {
            recruiterId,
            company: `Company ${i % 100}`,
            title: i % 2 === 0 ? `Backend Intern ${i}` : `Frontend Intern ${i}`,
            location: i % 3 === 0 ? 'Bengaluru' : 'Chennai',
            mode: 'HYBRID',
            stipend: 5000 + (i % 10) * 2500,
            skills: i % 2 === 0 ? ['Node.js', 'MongoDB'] : ['React', 'CSS'],
            deadline: new Date(now + (i % 30 + 1) * 86400000),
            status: i % 5 === 0 ? 'CLOSED' : 'OPEN',
          };
        }
      );

      await Listing.insertMany(docs, { ordered: true });
    }

    console.log(`Seeded ${await Listing.countDocuments()} listings.`);
    console.log('Warming up search...');

    const filters = {
      search: 'Backend',
      location: 'Bengaluru',
      minStipend: 10000,
      skill: 'Node.js',
      sortBy: 'deadline',
      order: 'asc',
      page: 1,
      limit: 20,
    };

    await searchListings(filters);

    const start = performance.now();
    const result = await searchListings(filters);
    const elapsed = performance.now() - start;

    console.log(`Search + count time: ${elapsed.toFixed(2)} ms`);
    console.log(`Results on page: ${result.listings.length}`);
    console.log(`Total matching listings: ${result.pagination.total}`);
    console.log(`Page size: ${result.pagination.limit}`);
    console.log(`Under 2 seconds: ${elapsed < 2000 ? 'YES' : 'NO'}`);
  } finally {
    await mongoose.disconnect();
    await mongo.stop();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
