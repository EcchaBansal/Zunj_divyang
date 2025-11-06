require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const About = require('./models/About');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10kb' }));

// Serve static files (your HTML/CSS)
app.use(express.static(path.join(__dirname)));

// MongoDB connection (optional fallback to in-memory)
const MONGO_URI = process.env.MONGO_URI;
console.log('MongoDB URI configured:', MONGO_URI ? 'Yes (URI found in env)' : 'No (missing)');
let dbConnected = false;

// Add mongoose debug logging
mongoose.set('debug', true);

if (MONGO_URI) {
  console.log('Attempting to connect to MongoDB...');
  
  // Listen for mongoose connection events
  mongoose.connection.on('connecting', () => {
    console.log('MongoDB: Establishing connection...');
  });
  
  mongoose.connection.on('connected', () => {
    console.log('MongoDB: Connected to database');
  });
  
  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
  });

  mongoose
    .connect(MONGO_URI, { 
      useNewUrlParser: true, 
      useUnifiedTopology: true
    })
    .then(() => {
      dbConnected = true;
      console.log('Successfully connected to MongoDB');
      // Test the connection by checking we can query
      return About.findOne().then(doc => {
        console.log('Test query successful. Existing content:', doc ? 'Found' : 'None');
      });
    })
    .catch((err) => {
      console.error('MongoDB connection error:', err.message);
      if (err.message.includes('ENOTFOUND')) {
        console.error('Could not resolve MongoDB host. Check MONGO_URI is correct.');
      } else if (err.message.includes('Authentication failed')) {
        console.error('MongoDB authentication failed. Check username/password in MONGO_URI.');
      }
    });
} else {
  console.warn('MONGO_URI not set — server will run with in-memory fallback.');
}

// GET /api/about - return latest about content
app.get('/api/about', async (req, res) => {
  try {
    if (dbConnected) {
      // Return the most recently updated document (or empty content)
      const doc = await About.findOne().sort({ updatedAt: -1 }).lean();
      return res.json({ content: (doc && doc.content) || '' });
    }

    // In-memory fallback: return empty string
    return res.json({ content: '' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load about content' });
  }
});

// POST /api/about - create or update the about content
app.post('/api/about', async (req, res) => {
  try {
    console.log('\n=== New Message Received ===');
    console.log('Time:', new Date().toLocaleString());
    console.log('Content:', req.body.content);
    console.log('Database Connected:', dbConnected ? 'Yes' : 'No');
    console.log('Content-Type:', req.headers['content-type']);
    console.log('========================\n');
    
    const { content } = req.body;
    if (typeof content !== 'string') {
      console.error('Invalid content type:', typeof content);
      return res.status(400).json({ error: 'Invalid content' });
    }

    if (dbConnected) {
      console.log('Attempting to save to MongoDB...');
      // Upsert: update the single About document or create if missing
      const doc = await About.findOneAndUpdate(
        {},
        { content, updatedAt: new Date() },
        { upsert: true, new: true }
      ).lean();
      console.log('MongoDB save successful:', doc);
      return res.json({ content: doc.content });
    }

    console.log('Using in-memory fallback (not saved to DB)');
    // In-memory fallback: just echo content back
    return res.json({ content });
  } catch (err) {
    console.error('Error saving content:', err);
    res.status(500).json({ error: 'Failed to save about content' });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
