const express = require('express');
const router = express.Router();
const Ngo = require('../models/Ngo');

router.get('/', async (req, res) => {
  try {
    const ngos = await Ngo.find().limit(200).select('name code needs phone');
    res.json({ ngos });
  } catch (err) {
    res.status(500).json({ error: 'server error' });
  }
});

module.exports = router;
