const mongoose = require('mongoose');

const NgoSchema = new mongoose.Schema({
  name: String,
  phone: { type: String, unique: true, sparse: true },
  code: { type: String, unique: true },
  passwordHash: String,
  needs: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Ngo', NgoSchema);
