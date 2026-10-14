const mongoose = require('mongoose');
const { MemoryTask } = require('./memoryAdapters');

const taskSchema = new mongoose.Schema({
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
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    default: ''
  },
  scheduledDate: {
    type: Date,
    required: [true, 'Scheduled date is required'],
    default: Date.now
  },
  estimatedDuration: {
    type: Number, // in minutes
    default: 30,
    min: 1
  },
  actualTimeSpent: {
    type: Number, // in minutes
    default: 0,
    min: 0
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium'
  },
  status: {
    type: String,
    enum: ['To Do', 'In Progress', 'Completed'],
    default: 'To Do'
  },
  completedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

taskSchema.index({ user: 1, scheduledDate: 1 });
taskSchema.index({ user: 1, status: 1 });
taskSchema.index({ user: 1, goal: 1 });
taskSchema.index({ goal: 1, status: 1 });

const MongooseTask = mongoose.model('Task', taskSchema);

module.exports = new Proxy(MongooseTask, {
  get(target, prop) {
    if (global.USE_MEMORY_STORE) {
      return MemoryTask[prop] || target[prop];
    }
    return target[prop];
  }
});
