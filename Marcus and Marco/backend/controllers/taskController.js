const Task = require('../models/Task');
const Goal = require('../models/Goal');
const { recalcGoalProgress, getCleanId } = require('../utils/progressCalc');

// @desc    Get tasks for user
// @route   GET /api/tasks
exports.getTasks = async (req, res, next) => {
  try {
    const { status, priority, goal, view, search, sort, page = 1, limit = 50 } = req.query;
    const query = { user: req.user._id };

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (goal) query.goal = goal;

    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    // View-based filtering
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    if (view === 'today') {
      query.scheduledDate = { $gte: todayStart, $lt: todayEnd };
    } else if (view === 'upcoming') {
      query.scheduledDate = { $gte: todayEnd };
    } else if (view === 'overdue') {
      query.scheduledDate = { $lt: todayStart };
      query.status = { $ne: 'Completed' };
    }

    let sortOption = { scheduledDate: 1 };
    if (sort === 'priority') {
      sortOption = { priority: -1, scheduledDate: 1 };
    } else if (sort === 'status') {
      sortOption = { status: 1, scheduledDate: 1 };
    } else if (sort === 'deadline') {
      sortOption = { scheduledDate: 1 };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Task.countDocuments(query);
    const tasks = await Task.find(query)
      .populate('goal', 'title subject color')
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      tasks,
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

// @desc    Get single task
// @route   GET /api/tasks/:id
exports.getTask = async (req, res, next) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user._id })
      .populate('goal', 'title subject color');

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json({ task });
  } catch (error) {
    next(error);
  }
};

// @desc    Create task
// @route   POST /api/tasks
exports.createTask = async (req, res, next) => {
  try {
    const taskData = {
      ...req.body,
      user: req.user._id
    };

    // Validate goal belongs to user
    if (taskData.goal) {
      const goal = await Goal.findOne({ _id: taskData.goal, user: req.user._id });
      if (!goal) {
        return res.status(400).json({ message: 'Invalid goal' });
      }
    }

    const task = await Task.create(taskData);
    const populated = await task.populate('goal', 'title subject color');

    // Recalculate goal progress
    if (task.goal) {
      await recalcGoalProgress(task.goal, req.user._id);
    }

    res.status(201).json({ task: populated });
  } catch (error) {
    next(error);
  }
};

// @desc    Update task
// @route   PUT /api/tasks/:id
exports.updateTask = async (req, res, next) => {
  try {
    const existingTask = await Task.findOne({ _id: req.params.id, user: req.user._id });
    if (!existingTask) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const oldGoalId = existingTask.goal;

    // If completing the task, set completedAt
    if (req.body.status === 'Completed' && existingTask.status !== 'Completed') {
      req.body.completedAt = new Date();
    } else if (req.body.status && req.body.status !== 'Completed') {
      req.body.completedAt = null;
    }

    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true, runValidators: true }
    ).populate('goal', 'title subject color');

    // Recalculate progress for old and current goal
    if (oldGoalId) await recalcGoalProgress(oldGoalId, req.user._id);
    if (task.goal) await recalcGoalProgress(task.goal, req.user._id);

    // Record activity and update streak if completed
    if (req.body.status === 'Completed') {
      const { recordUserActivity } = require('../utils/progressCalc');
      await recordUserActivity(req.user._id);
    }

    res.json({ task });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
exports.deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, user: req.user._id });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Recalculate goal progress
    if (task.goal) {
      await recalcGoalProgress(task.goal, req.user._id);
    }

    res.json({ message: 'Task deleted' });
  } catch (error) {
    next(error);
  }
};
