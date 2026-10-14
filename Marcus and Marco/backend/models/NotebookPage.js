const mongoose = require('mongoose');
const { MemoryNotebookPage } = require('./memoryAdapters');

const dailyGoalSubSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  subject: { type: String, default: '' },
  targetQuantity: { type: Number, default: 1 },
  actualQuantity: { type: Number, default: 0 },
  unit: { type: String, default: 'mins' }, // 'mins' | 'problems' | 'pages' | 'lessons' | 'checkbox'
  progress: { type: Number, default: 0, min: 0, max: 100 },
  completed: { type: Boolean, default: false },
  notes: { type: String, default: '' }
}, { timestamps: true });

const notebookPageSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  date: {
    type: String, // 'YYYY-MM-DD'
    required: true,
    index: true
  },
  dailyHeading: {
    type: String,
    default: "Today's Learning Plan"
  },
  dailyMotivation: {
    type: String,
    default: ""
  },
  mainGoal: {
    type: String,
    default: ""
  },
  dailyGoals: [dailyGoalSubSchema],
  studyNotes: {
    type: String,
    default: ""
  },
  problemsFaced: {
    type: String,
    default: ""
  },
  whatILearned: {
    type: String,
    default: ""
  },
  tomorrowPlan: {
    type: String,
    default: ""
  },
  dailyReflection: {
    type: String,
    default: ""
  }
}, {
  timestamps: true
});

notebookPageSchema.index({ user: 1, date: 1 }, { unique: true });

const MongooseNotebookPage = mongoose.model('NotebookPage', notebookPageSchema);

module.exports = new Proxy(MongooseNotebookPage, {
  get(target, prop) {
    if (global.USE_MEMORY_STORE) {
      return MemoryNotebookPage[prop] || target[prop];
    }
    return target[prop];
  }
});
