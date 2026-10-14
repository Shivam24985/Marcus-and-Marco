const Task = require('../models/Task');
const Goal = require('../models/Goal');

// @desc    Get tasks for calendar view
// @route   GET /api/calendar
exports.getCalendarData = async (req, res, next) => {
  try {
    const { year, month } = req.query;
    const userId = req.user._id;

    if (!year || !month) {
      return res.status(400).json({ message: 'Year and month are required' });
    }

    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);

    // Extend range to include surrounding days visible in calendar
    const calStart = new Date(startDate);
    calStart.setDate(calStart.getDate() - calStart.getDay());
    const calEnd = new Date(endDate);
    calEnd.setDate(calEnd.getDate() + (6 - calEnd.getDay()));

    const [tasks, goalDeadlines] = await Promise.all([
      Task.find({
        user: userId,
        scheduledDate: { $gte: calStart, $lte: calEnd }
      })
        .populate('goal', 'title subject color')
        .sort({ scheduledDate: 1 }),
      Goal.find({
        user: userId,
        targetDate: { $gte: calStart, $lte: calEnd },
        status: { $ne: 'Completed' }
      }).select('title targetDate subject color priority')
    ]);

    res.json({ tasks, goalDeadlines });
  } catch (error) {
    next(error);
  }
};

// @desc    Get tasks for a specific date
// @route   GET /api/calendar/date
exports.getDateTasks = async (req, res, next) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ message: 'Date is required' });
    }

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const tasks = await Task.find({
      user: req.user._id,
      scheduledDate: { $gte: dayStart, $lt: dayEnd }
    })
      .populate('goal', 'title subject color')
      .sort({ priority: -1, createdAt: 1 });

    // Estimate total study time for the day
    const totalEstimated = tasks.reduce((sum, t) => sum + (t.estimatedDuration || 0), 0);
    const totalActual = tasks.reduce((sum, t) => sum + (t.actualTimeSpent || 0), 0);

    res.json({
      tasks,
      summary: {
        total: tasks.length,
        completed: tasks.filter(t => t.status === 'Completed').length,
        estimatedMinutes: totalEstimated,
        actualMinutes: totalActual
      }
    });
  } catch (error) {
    next(error);
  }
};
