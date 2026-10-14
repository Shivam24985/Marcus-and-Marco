const mongoose = require('mongoose');

const progressRecordSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: true
  },
  tasksCompleted: {
    type: Number,
    default: 0
  },
  studyMinutes: {
    type: Number,
    default: 0
  },
  goalsWorkedOn: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Goal'
  }]
}, {
  timestamps: true
});

progressRecordSchema.index({ user: 1, date: -1 }, { unique: true });

module.exports = mongoose.model('ProgressRecord', progressRecordSchema);
