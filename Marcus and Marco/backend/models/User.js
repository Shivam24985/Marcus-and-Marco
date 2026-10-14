const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { MemoryUser } = require('./memoryAdapters');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  learningPreferences: {
    type: [String],
    default: []
  },
  dailyStudyTarget: {
    type: Number,
    default: 2,
    min: 0,
    max: 24
  },
  streak: {
    current: { type: Number, default: 0 },
    longest: { type: Number, default: 0 },
    lastActiveDate: { type: Date, default: null }
  }
}, {
  timestamps: true
});

// userSchema.index({ email: 1 });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const MongooseUser = mongoose.model('User', userSchema);

module.exports = new Proxy(MongooseUser, {
  get(target, prop) {
    if (global.USE_MEMORY_STORE) {
      return MemoryUser[prop] || target[prop];
    }
    return target[prop];
  }
});
