const mongoose = require('mongoose');

// Models owned by other modules, looked up by name at call time.
module.exports = {
  Listing: () => mongoose.model('Listing'),
  Profile: () => mongoose.model('Profile'),
  User: () => mongoose.model('User'),
};
