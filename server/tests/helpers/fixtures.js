const mongoose = require('mongoose');

// Stand-ins for other modules' models; the real ones win if already registered.
function define(name, fields) {
  return mongoose.models[name] || mongoose.model(name, new mongoose.Schema(fields));
}

const User = define('User', { name: String, email: String, role: String, status: { type: String, default: 'ACTIVE' } });
const Profile = define('Profile', {
  userId: mongoose.Schema.Types.ObjectId, cgpa: Number, branch: String, gradYear: Number,
  skills: [String], resumeFileId: mongoose.Schema.Types.ObjectId,
});
const Listing = define('Listing', {
  recruiterId: mongoose.Schema.Types.ObjectId,
  title: String,
  company: String,
  location: String,
  mode: String,
  stipend: Number,
  skills: [String],
  status: { type: String, default: 'OPEN' },
  deadline: Date,
  minCgpa: Number,
});

module.exports = { User, Profile, Listing };
