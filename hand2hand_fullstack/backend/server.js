require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const authRoutes = require('./routes/auth');
const ngoRoutes = require('./routes/ngos');
const donationRoutes = require('./routes/donations');
const chatRoutes = require('./routes/chat');
const adminRoutes = require('./routes/admin');

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// routes
app.use('/api/auth', authRoutes);
app.use('/api/ngos', ngoRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/admin', adminRoutes);

const PORT = process.env.PORT || 4000;

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log('Server running on port', PORT));
  })
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
  });
