const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Ngo = require('../models/Ngo');
const Donation = require('../models/Donation');
const { Parser } = require('json2csv');

// admin login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (email === process.env.ADMIN_EMAIL) {
    const ok = await bcrypt.compare(password, process.env.ADMIN_PASS_HASH || '');
    if (ok) {
      const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1d' });
      return res.json({ ok: true, token });
    }
  }
  res.status(401).json({ error: 'Invalid admin credentials' });
});

function adminAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1] || req.query.token;
  if (!token) return res.status(401).json({ error: 'missing token' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.role !== 'admin') throw new Error();
    req.admin = true;
    next();
  } catch {
    res.status(401).json({ error: 'invalid admin token' });
  }
}

router.get('/users', adminAuth, async (req, res) => {
  const users = await User.find().select('name email phone createdAt');
  res.json({ users });
});

router.get('/ngos', adminAuth, async (req, res) => {
  const ngos = await Ngo.find().select('name code phone needs createdAt');
  res.json({ ngos });
});

router.get('/donations', adminAuth, async (req, res) => {
  const donations = await Donation.find().populate('donorId', 'name email').populate('ngoId', 'name code');
  res.json({ donations });
});

router.get('/export/donations', adminAuth, async (req, res) => {
  const donations = await Donation.find().populate('donorId', 'name email').populate('ngoId', 'name code');
  const data = donations.map(d => ({
    item: d.item,
    condition: d.condition,
    donor: d.donorId?.name || '',
    donorEmail: d.donorId?.email || '',
    ngo: d.ngoId?.name || '',
    ngoCode: d.ngoId?.code || '',
    status: d.status,
    createdAt: d.createdAt
  }));
  const parser = new Parser();
  const csv = parser.parse(data);
  res.header('Content-Type', 'text/csv');
  res.attachment('donations.csv');
  return res.send(csv);
});

module.exports = router;
