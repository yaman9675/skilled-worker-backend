const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// 1. MongoDB Connection Setup
const MONGO_URI = process.env.MONGO_URI || 'YOUR_MONGODB_CONNECTION_STRING_HERE';

mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB Database Successfully!'))
    .catch((err) => console.error('❌ MongoDB Connection Error:', err));

// 2. Worker Schema & Model Definition
const workerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    city: { type: String, required: true },
    pincode: { type: String, required: true },
    address: { type: String, required: true },
    occupations: [{ type: String }],
    avatar: { type: String, default: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80' },
    createdAt: { type: Date, default: Date.now }
});

const Worker = mongoose.model('Worker', workerSchema);


// --- API ROUTES FOR FRONTEND ---

// ROUTE 1: Get All Workers (MongoDB se saare workers fetch karna)
app.get('/api/workers', async (req, res) => {
    try {
        const workers = await Worker.find().sort({ createdAt: -1 });
        res.json(workers);
    } catch (err) {
        res.status(500).json({ error: true, message: 'Failed to fetch workers from database' });
    }
});

// ROUTE 2: Register New Worker (Naya worker MongoDB mein add karna)
app.post('/api/workers/register', async (req, res) => {
    try {
        const { name, phone, city, pincode, address, occupations, avatar } = req.body;

        // Check if worker already exists
        const existingWorker = await Worker.findOne({ phone });
        if (existingWorker) {
            return res.status(400).json({ error: true, message: 'Phone number already registered!' });
        }

        const newWorker = new Worker({
            name,
            phone,
            city,
            pincode,
            address,
            occupations,
            avatar
        });

        await newWorker.save();
        res.status(201).json({ success: true, message: 'Worker registered successfully in MongoDB!', data: newWorker });
    } catch (err) {
        console.error('Registration Error:', err);
        res.status(500).json({ error: true, message: 'Server Error: Unable to save worker details' });
    }
});

// ROUTE 3: Update Worker Profile (Verified phone number se MongoDB record update karna)
app.put('/api/workers/update', async (req, res) => {
    try {
        const { phone, name, city, pincode, address, occupations } = req.body;

        const updatedWorker = await Worker.findOneAndUpdate(
            { phone: phone },
            { name, city, pincode, address, occupations },
            { new: true } // Return updated document
        );

        if (!updatedWorker) {
            return res.status(404).json({ error: true, message: 'Worker not found in database' });
        }

        res.json({ success: true, message: 'Profile updated successfully!', data: updatedWorker });
    } catch (err) {
        console.error('Update Error:', err);
        res.status(500).json({ error: true, message: 'Failed to update profile' });
    }
});

// Serve frontend for root URL
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Server Port Setup (Render automatically assigns process.env.PORT)
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 FixKart Server running on port ${PORT}`);
});