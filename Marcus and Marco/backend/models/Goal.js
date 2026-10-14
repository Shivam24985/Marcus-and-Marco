const mongoose = require('mongoose');
const { MemoryGoal } = require('./memoryAdapters');

const goalSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: [true, 'Goal title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    default: ''
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required'],
    default: Date.now
  },
  targetDate: {
    type: Date,
    required: [true, 'Target completion date is required']
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium'
  },
  targetStudyHours: {
    type: Number,
    default: 10,
    min: 0
  },
  currentStudyHours: {
    type: Number,
    default: 0,
    min: 0
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  status: {
    type: String,
    enum: ['Not Started', 'In Progress', 'Completed', 'Paused'],
    default: 'Not Started'
  },
  color: {
    type: String,
    default: '#6366f1'
  }
}, {
  timestamps: true
});

goalSchema.index({ user: 1, status: 1 });
goalSchema.index({ user: 1, targetDate: 1 });
goalSchema.index({ user: 1, subject: 1 });

const MongooseGoal = mongoose.model('Goal', goalSchema);

module.exports = new Proxy(MongooseGoal, {
  get(target, prop) {
    if (global.USE_MEMORY_STORE) {
      return MemoryGoal[prop] || target[prop];
    }
    return target[prop];
  }
});
