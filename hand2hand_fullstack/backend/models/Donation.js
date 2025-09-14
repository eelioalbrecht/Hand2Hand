const mongoose = require('mongoose');

const DonationSchema = new mongoose.Schema({
  donorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  ngoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ngo' },
  item: String,
  condition: String,
  pickupAddress: String,
  donorPhone: String,
  donorName: String,
  donorImagePath: String,
  ngoUsageImagePath: String,
  status: { type: String, enum: ['available','claimed','delivered','used'], default: 'available' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Donation', DonationSchema);
