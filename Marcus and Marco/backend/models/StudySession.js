const mongoose = require('mongoose');
const { MemoryStudySession } = require('./memoryAdapters');

const studySessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  goal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Goal',
    default: null
  },
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    default: null
  },
  duration: {
    type: Number, // in minutes
    required: [true, 'Duration is required'],
    min: 1
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  type: {
    type: String,
    enum: ['Pomodoro', 'Free', 'Timed'],
    default: 'Free'
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [300, 'Notes cannot exceed 300 characters'],
    default: ''
  }
}, {
  timestamps: true
});

studySessionSchema.index({ user: 1, date: -1 });
studySessionSchema.index({ user: 1, goal: 1 });

const MongooseStudySession = mongoose.model('StudySession', studySessionSchema);

module.exports = new Proxy(MongooseStudySession, {
  get(target, prop) {
    if (global.USE_MEMORY_STORE) {
      return MemoryStudySession[prop] || target[prop];
    }
    return target[prop];
  }
});
