const mongoose = require('mongoose');

// Minimal stand-ins for models owned by other modules (#6, #14), with only the fields
// application.deps.js relies on. Real models win if they are already registered.
function define(name, fields) {
  return mongoose.models[name] || mongoose.model(name, new mongoose.Schema(fields));
}

const User = define('User', { name: String, email: String, role: String, status: { type: String, default: 'ACTIVE' } });
const Profile = define('Profile', {
  userId: mongoose.Schema.Types.ObjectId, cgpa: Number, branch: String, gradYear: Number,
  skills: [String], resumeFileId: mongoose.Schema.Types.ObjectId,
});
const Listing = define('Listing', {
  recruiterId: mongoose.Schema.Types.ObjectId, title: String, company: String,
  status: { type: String, default: 'OPEN' }, deadline: Date, minCgpa: Number,
});

module.exports = { User, Profile, Listing };
