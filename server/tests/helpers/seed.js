const mongoose = require('mongoose');
const { User, Profile, Listing } = require('./fixtures');

const day = 24 * 3600 * 1000;

// Asha (CGPA 7.4, resume), Ravi (9.1). R1 owns L1 (open), L2 (closed), L3 (min CGPA 8); R2 owns none.
async function seed() {
  const [student, other, recruiter, recruiter2] = await User.create([
    { name: 'Asha', email: 'asha@pes.edu', srn: 'PES1UG24CS001', role: 'STUDENT' },
    { name: 'Ravi', email: 'ravi@pes.edu', srn: 'PES1UG24EC002', role: 'STUDENT' },
    { name: 'Rec One', email: 'r1@acme.io', role: 'RECRUITER' },
    { name: 'Rec Two', email: 'r2@acme.io', role: 'RECRUITER' },
  ]);
  await Profile.create([
    { userId: student._id, cgpa: 7.4, branch: 'CSE', gradYear: 2027, skills: ['node'], resumeFileId: new mongoose.Types.ObjectId() },
    { userId: other._id, cgpa: 9.1, branch: 'ECE', gradYear: 2027 },
  ]);
  const deadline = new Date(Date.now() + 7 * day);
  const [L1, L2, L3] = await Listing.create([
    { recruiterId: recruiter._id, title: 'Backend Intern', company: 'Acme', deadline },
    { recruiterId: recruiter._id, title: 'Closed Intern', company: 'Acme', status: 'CLOSED', deadline },
    { recruiterId: recruiter._id, title: 'ML Intern', company: 'Acme', minCgpa: 8, deadline },
  ]);
  return { student, other, recruiter, recruiter2, L1, L2, L3 };
}

module.exports = { seed, day };
