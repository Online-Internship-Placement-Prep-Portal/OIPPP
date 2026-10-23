const mongoose = require('mongoose');
const { User, Profile, Listing } = require('./fixtures');

const day = 24 * 3600 * 1000;

// students Asha (CGPA 7.4, has resume) and Ravi (9.1); recruiters R1 (owns L1..L3) and R2.
// L1 open, L2 closed, L3 open with minimum CGPA 8.
async function seed() {
  const [student, other, recruiter, recruiter2] = await User.create([
    { name: 'Asha', email: 'asha@pes.edu', role: 'STUDENT' },
    { name: 'Ravi', email: 'ravi@pes.edu', role: 'STUDENT' },
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
