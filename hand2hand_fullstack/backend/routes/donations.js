const express = require('express');
const router = express.Router();
const multer = require('multer');
const Donation = require('../models/Donation');
const User = require('../models/User');
const Ngo = require('../models/Ngo');
const auth = require('../middleware/auth');
const path = require('path');
const fs = require('fs');

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'))
});
const upload = multer({ storage });

router.post('/create', auth, upload.single('donorImage'), async (req, res) => {
  try {
    if (req.user.type !== 'user') return res.status(403).json({ error: 'only users can create donations' });
    const { item, condition, pickupAddress, ngoId } = req.body;
    if (!item || !ngoId) return res.status(400).json({ error: 'item and ngoId required' });
    const user = await User.findById(req.user.id);
    const ngo = await Ngo.findById(ngoId);
    if (!ngo) return res.status(404).json({ error: 'ngo not found' });

    const donation = await Donation.create({
      donorId: user._id,
      ngoId: ngo._id,
      item,
      condition,
      pickupAddress,
      donorPhone: user.phone || '',
      donorName: user.name || '',
      donorImagePath: req.file ? '/uploads/' + path.basename(req.file.path) : null
    });
    res.json({ ok: true, donation });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server' });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const q = {};
    if (req.user.type === 'ngo') q.ngoId = req.user.id;
    const donations = await Donation.find(q).populate('donorId', 'name phone email').populate('ngoId', 'name code');
    res.json({ donations });
  } catch (err) {
    res.status(500).json({ error: 'server' });
  }
});

router.post('/usage/:donationId', auth, upload.single('usageImage'), async (req, res) => {
  try {
    if (req.user.type !== 'ngo') return res.status(403).json({ error: 'only ngos can upload proof' });
    const donation = await Donation.findById(req.params.donationId);
    if (!donation) return res.status(404).json({ error: 'donation not found' });
    if (!req.file) return res.status(400).json({ error: 'file required' });
    donation.ngoUsageImagePath = '/uploads/' + path.basename(req.file.path);
    donation.status = 'used';
    await donation.save();
    res.json({ ok: true, donation });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server' });
  }
});

module.exports = router;
