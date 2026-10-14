const Goal = require('../models/Goal');
const Task = require('../models/Task');
const { recalcGoalProgress } = require('../utils/progressCalc');

// @desc    Get all goals for user
// @route   GET /api/goals
exports.getGoals = async (req, res, next) => {
  try {
    const { status, priority, subject, sort, page = 1, limit = 20 } = req.query;
    const query = { user: req.user._id };

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (subject) query.subject = { $regex: subject, $options: 'i' };

    let sortOption = { createdAt: -1 };
    if (sort === 'deadline') sortOption = { targetDate: 1 };
    if (sort === 'priority') sortOption = { priority: -1, createdAt: -1 };
    if (sort === 'progress') sortOption = { progress: -1 };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Goal.countDocuments(query);
    const goals = await Goal.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      goals,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single goal
// @route   GET /api/goals/:id
exports.getGoal = async (req, res, next) => {
  try {
    const goal = await Goal.findOne({ _id: req.params.id, user: req.user._id });

    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }

    // Get related tasks
    const tasks = await Task.find({ goal: goal._id, user: req.user._id })
      .sort({ scheduledDate: 1 });

    res.json({ goal, tasks });
  } catch (error) {
    next(error);
  }
};

// @desc    Create goal
// @route   POST /api/goals
exports.createGoal = async (req, res, next) => {
  try {
    const goalData = {
      ...req.body,
      user: req.user._id
    };

    const goal = await Goal.create(goalData);
    res.status(201).json({ goal });
  } catch (error) {
    next(error);
  }
};

// @desc    Update goal
// @route   PUT /api/goals/:id
exports.updateGoal = async (req, res, next) => {
  try {
    const goal = await Goal.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }

    res.json({ goal });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete goal
// @route   DELETE /api/goals/:id
exports.deleteGoal = async (req, res, next) => {
  try {
    const goal = await Goal.findOneAndDelete({ _id: req.params.id, user: req.user._id });

    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }

    // Remove associated tasks
    await Task.deleteMany({ goal: goal._id, user: req.user._id });

    res.json({ message: 'Goal and associated tasks deleted' });
  } catch (error) {
    next(error);
  }
};

// @desc    Recalculate goal progress from tasks
// @route   PUT /api/goals/:id/recalculate
exports.recalculateProgress = async (req, res, next) => {
  try {
    const goal = await recalcGoalProgress(req.params.id, req.user._id);
    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }
    res.json({ goal });
  } catch (error) {
    next(error);
  }
};
