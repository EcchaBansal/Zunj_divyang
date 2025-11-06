const mongoose = require('mongoose');

const AboutSchema = new mongoose.Schema({
  content: { type: String, default: '' },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('About', AboutSchema);
