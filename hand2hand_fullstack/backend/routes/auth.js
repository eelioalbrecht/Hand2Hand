const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/User');
const Ngo = require('../models/Ngo');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

function sendOtpEmail(to, code) {
  const mail = {
    from: process.env.FROM_EMAIL,
    to,
    subject: 'Your Hand2Hand OTP',
    text: `Your Hand2Hand OTP is: ${code}\nIt expires in 10 minutes.`
  };
  return transporter.sendMail(mail);
}

router.post('/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  try {
    let user = await User.findOne({ email });
    if (!user) user = await User.create({ email, name: email.split('@')[0] });
    user.otp = { code, expiresAt };
    await user.save();

    try {
      await sendOtpEmail(email, code);
      return res.json({ ok: true, message: 'OTP sent to email' });
    } catch (err) {
      console.warn('Email send failed:', err.message);
      return res.json({ ok: true, message: 'OTP send failed (dev). Demo OTP: ' + code, demoOtp: code });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server error' });
  }
});

router.post('/verify-otp', async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ error: 'email and code required' });

  try {
    const user = await User.findOne({ email });
    if (!user || !user.otp || user.otp.code !== code) return res.status(400).json({ error: 'invalid otp' });
    if (new Date() > new Date(user.otp.expiresAt)) return res.status(400).json({ error: 'otp expired' });

    user.otp = undefined;
    await user.save();
    const token = jwt.sign({ id: user._id, type: 'user' }, process.env.JWT_SECRET, { expiresIn: '7d' });
    return res.json({ ok: true, token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

router.post('/signup', async (req, res) => {
  try {
    const { name, username, email, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'username and password required' });
    const existing = await User.findOne({ $or: [{ username }, { email }] });
    if (existing) return res.status(400).json({ error: 'username/email taken' });
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, username, email, passwordHash: hash });
    const token = jwt.sign({ id: user._id, type: 'user' }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ ok: true, token, user: { id: user._id, name: user.name } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { usernameOrEmail, password } = req.body;
    if (!usernameOrEmail || !password) return res.status(400).json({ error: 'required' });
    const user = await User.findOne({ $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }, { phone: usernameOrEmail }] });
    if (!user) return res.status(400).json({ error: 'invalid credentials' });
    const ok = await bcrypt.compare(password, user.passwordHash || '');
    if (!ok) return res.status(400).json({ error: 'invalid credentials' });
    const token = jwt.sign({ id: user._id, type: 'user' }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ ok: true, token, user: { id: user._id, name: user.name } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server' });
  }
});

router.post('/ngo/signup', async (req, res) => {
  try {
    const { name, phone, password, code } = req.body;
    if (!name || !password) return res.status(400).json({ error: 'required' });
    const existing = await Ngo.findOne({ $or: [{ name }, { code }] });
    if (existing) return res.status(400).json({ error: 'name/code taken' });
    const hash = await bcrypt.hash(password, 10);
    const assignedCode = code || 'NGO-' + Math.random().toString(36).slice(2, 7).toUpperCase();
    const ngo = await Ngo.create({ name, phone, code: assignedCode, passwordHash: hash });
    const token = jwt.sign({ id: ngo._id, type: 'ngo' }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ ok: true, token, ngo: { id: ngo._id, name: ngo.name, code: ngo.code } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server' });
  }
});

router.post('/ngo/login', async (req, res) => {
  try {
    const { nameOrCode, password } = req.body;
    if (!nameOrCode || !password) return res.status(400).json({ error: 'required' });
    const ngo = await Ngo.findOne({ $or: [{ name: nameOrCode }, { code: nameOrCode }] });
    if (!ngo) return res.status(400).json({ error: 'invalid credentials' });
    const ok = await bcrypt.compare(password, ngo.passwordHash || '');
    if (!ok) return res.status(400).json({ error: 'invalid credentials' });
    const token = jwt.sign({ id: ngo._id, type: 'ngo' }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ ok: true, token, ngo: { id: ngo._id, name: ngo.name, code: ngo.code } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server' });
  }
});

module.exports = router;
