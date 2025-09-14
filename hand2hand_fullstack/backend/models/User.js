const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String },
  username: { type: String, unique: true, sparse: true },
  phone: { type: String, unique: true, sparse: true },
  email: { type: String, unique: true, sparse: true },
  passwordHash: { type: String },
  otp: { code: String, expiresAt: Date },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
