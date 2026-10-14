const StudySession = require('../models/StudySession');
const Goal = require('../models/Goal');
const Task = require('../models/Task');
const { recalcGoalProgress } = require('../utils/progressCalc');

// @desc    Get study sessions
// @route   GET /api/study-sessions
exports.getSessions = async (req, res, next) => {
  try {
    const { goal, startDate, endDate, page = 1, limit = 30 } = req.query;
    const query = { user: req.user._id };

    if (goal) query.goal = goal;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await StudySession.countDocuments(query);
    const sessions = await StudySession.find(query)
      .populate('goal', 'title subject color')
      .populate('task', 'title')
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      sessions,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create study session
// @route   POST /api/study-sessions
exports.createSession = async (req, res, next) => {
  try {
    const sessionData = {
      ...req.body,
      user: req.user._id
    };

    // Validate goal belongs to user
    if (sessionData.goal) {
      const goal = await Goal.findOne({ _id: sessionData.goal, user: req.user._id });
      if (!goal) {
        return res.status(400).json({ message: 'Invalid goal' });
      }
      // Update goal study hours
      goal.currentStudyHours = (goal.currentStudyHours || 0) + (sessionData.duration / 60);
      if (goal.status === 'Not Started') {
        goal.status = 'In Progress';
      }
      await goal.save();
    }

    // Update task actual time if specified
    if (sessionData.task) {
      const task = await Task.findOne({ _id: sessionData.task, user: req.user._id });
      if (task) {
        task.actualTimeSpent = (task.actualTimeSpent || 0) + sessionData.duration;
        await task.save();
      }
    }

    // Update user streak accurately based on real-life session activity
    const { recordUserActivity } = require('../utils/progressCalc');
    await recordUserActivity(req.user._id);

    const session = await StudySession.create(sessionData);
    
    // Recalculate goal progress & study hours immediately
    if (sessionData.goal) {
      await recalcGoalProgress(sessionData.goal, req.user._id);
    }

    const populated = await session.populate([
      { path: 'goal', select: 'title subject color' },
      { path: 'task', select: 'title' }
    ]);

    res.status(201).json({ session: populated });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete study session
// @route   DELETE /api/study-sessions/:id
exports.deleteSession = async (req, res, next) => {
  try {
    const session = await StudySession.findOneAndDelete({ _id: req.params.id, user: req.user._id });

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Revert and recalculate goal study hours & progress
    if (session.goal) {
      await recalcGoalProgress(session.goal, req.user._id);
    }

    res.json({ message: 'Session deleted' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get today's and this week's study time
// @route   GET /api/study-sessions/summary
exports.getSessionSummary = async (req, res, next) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    const [todaySessions, weekSessions] = await Promise.all([
      StudySession.aggregate([
        { $match: { user: req.user._id, date: { $gte: todayStart } } },
        { $group: { _id: null, totalMinutes: { $sum: '$duration' }, count: { $sum: 1 } } }
      ]),
      StudySession.aggregate([
        { $match: { user: req.user._id, date: { $gte: weekStart } } },
        { $group: { _id: null, totalMinutes: { $sum: '$duration' }, count: { $sum: 1 } } }
      ])
    ]);

    res.json({
      today: {
        totalMinutes: todaySessions[0]?.totalMinutes || 0,
        count: todaySessions[0]?.count || 0
      },
      week: {
        totalMinutes: weekSessions[0]?.totalMinutes || 0,
        count: weekSessions[0]?.count || 0
      }
    });
  } catch (error) {
    next(error);
  }
};
