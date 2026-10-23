const mongoose = require('mongoose');

// Listing (#14) and User/Profile (#6) are owned by other modules. They are looked up by model
// name at call time so this module does not depend on their files. Fields relied on:
//   Listing: recruiterId, title, company, status (OPEN|CLOSED), deadline, minCgpa
//   Profile: userId, cgpa, branch, gradYear, skills, resumeFileId
//   User:    name, email
module.exports = {
  Listing: () => mongoose.model('Listing'),
  Profile: () => mongoose.model('Profile'),
  User: () => mongoose.model('User'),
};
