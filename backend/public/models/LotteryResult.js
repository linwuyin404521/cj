const mongoose = require('mongoose');

const lotteryResultSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  prizeLevel: {
    type: String,
    required: true
  },
  prizeName: {
    type: String,
    required: true
  },
  prizeValue: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['unclaimed', 'claimed'],
    default: 'unclaimed'
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('LotteryResult', lotteryResultSchema);