const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// 1. MONGODB CONNECTION
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/skilled_worker_db';

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected Successfully'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

// 2. MONGOOSE SCHEMA (Pincode Added)
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  city: { type: String, required: true },
  pincode: { type: String, required: true }, // 👈 Added Pincode
  address: { type: String, required: true },
  occupations: { type: [String], required: true },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

const otpStore = {}; 

function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

// 3. API ROUTES

// API Status
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Skilled Worker API is Running...' });
});

// API 1: Register Worker
app.post('/api/register', async (req, res) => {
  try {
    const { name, phone, city, pincode, address, occupations } = req.body;

    if (!name || !phone || !city || !pincode || !address || !occupations || !Array.isArray(occupations) || occupations.length === 0) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Phone number already registered. Please use Edit Profile.' });
    }

    const newUser = new User({ name, phone, city, pincode, address, occupations });
    await newUser.save();

    res.status(201).json({ success: true, message: 'Worker Profile Created!', data: newUser });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API 2: Search Workers (City, Service, or Pincode)
app.get('/api/workers', async (req, res) => {
  try {
    const { city, service, pincode } = req.query;
    let query = {};

    if (city && city.trim() !== '') {
      query.city = { $regex: new RegExp(escapeRegex(city.trim()), 'i') };
    }

    if (pincode && pincode.trim() !== '') {
      query.pincode = pincode.trim(); // 👈 Exact match for pincode
    }

    if (service && service.trim() !== '') {
      query.occupations = { $in: [new RegExp(escapeRegex(service.trim()), 'i')] };
    }

    const workers = await User.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: workers.length,
      data: workers
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API 3: Send OTP
app.post('/api/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ success: false, message: 'Phone number is required.' });

    const worker = await User.findOne({ phone });
    if (!worker) return res.status(404).json({ success: false, message: 'Phone number not registered!' });

    const generatedOtp = '1234'; 
    otpStore[phone] = generatedOtp;

    console.log(`[OTP Sent] Phone: ${phone}, OTP: ${generatedOtp}`);
    res.status(200).json({ success: true, message: 'OTP sent successfully! (Use 1234 for testing)' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API 4: Verify OTP
app.post('/api/verify-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!otpStore[phone] || otpStore[phone] !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP!' });
    }

    const worker = await User.findOne({ phone });
    delete otpStore[phone];

    res.status(200).json({ success: true, message: 'OTP Verified successfully!', data: worker });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API 5: Update Profile
app.put('/api/update-profile', async (req, res) => {
  try {
    const { phone, name, city, pincode, address, occupations } = req.body;

    const updatedWorker = await User.findOneAndUpdate(
      { phone },
      { name, city, pincode, address, occupations },
      { new: true, runValidators: true }
    );

    if (!updatedWorker) return res.status(404).json({ success: false, message: 'Worker not found!' });

    res.status(200).json({ success: true, message: 'Profile updated successfully!', data: updatedWorker });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});