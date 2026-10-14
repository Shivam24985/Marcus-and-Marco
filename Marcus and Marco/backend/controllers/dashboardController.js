const Goal = require('../models/Goal');
const Task = require('../models/Task');
const StudySession = require('../models/StudySession');
const { getEffectiveStreak } = require('../utils/progressCalc');

// @desc    Get dashboard statistics
// @route   GET /api/dashboard
exports.getDashboardStats = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    // Run all queries in parallel
    const [
      activeGoals,
      totalGoals,
      completedGoals,
      todayTasks,
      todayCompletedTasks,
      allTasks,
      completedTasks,
      weekStudy,
      upcomingDeadlines,
      recentTasks,
      weeklyData
    ] = await Promise.all([
      // Active goals count
      Goal.countDocuments({ user: userId, status: { $in: ['In Progress', 'Not Started'] } }),
      // Total goals
      Goal.countDocuments({ user: userId }),
      // Completed goals
      Goal.countDocuments({ user: userId, status: 'Completed' }),
      // Today's total tasks
      Task.countDocuments({ user: userId, scheduledDate: { $gte: todayStart, $lt: todayEnd } }),
      // Today's completed tasks
      Task.countDocuments({ user: userId, scheduledDate: { $gte: todayStart, $lt: todayEnd }, status: 'Completed' }),
      // All tasks
      Task.countDocuments({ user: userId }),
      // All completed tasks
      Task.countDocuments({ user: userId, status: 'Completed' }),
      // Week study time
      StudySession.aggregate([
        { $match: { user: userId, date: { $gte: weekStart } } },
        { $group: { _id: null, totalMinutes: { $sum: '$duration' } } }
      ]),
      // Upcoming deadlines (goals due in next 7 days)
      Goal.find({
        user: userId,
        status: { $in: ['In Progress', 'Not Started'] },
        targetDate: { $gte: todayStart, $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }
      }).sort({ targetDate: 1 }).limit(5).select('title targetDate progress subject status'),
      // Recent completed tasks
      Task.find({ user: userId, status: 'Completed' })
        .sort({ completedAt: -1 })
        .limit(5)
        .populate('goal', 'title subject color')
        .select('title completedAt goal'),
      // Weekly data for chart (last 7 days)
      (async () => {
        const days = [];
        for (let i = 6; i >= 0; i--) {
          const dayStart = new Date(todayStart);
          dayStart.setDate(dayStart.getDate() - i);
          const dayEnd = new Date(dayStart);
          dayEnd.setDate(dayEnd.getDate() + 1);

          const [tasksCompleted, studyMins] = await Promise.all([
            Task.countDocuments({
              user: userId,
              completedAt: { $gte: dayStart, $lt: dayEnd }
            }),
            StudySession.aggregate([
              { $match: { user: userId, date: { $gte: dayStart, $lt: dayEnd } } },
              { $group: { _id: null, total: { $sum: '$duration' } } }
            ])
          ]);

          days.push({
            date: dayStart.toISOString().split('T')[0],
            dayName: dayStart.toLocaleDateString('en-US', { weekday: 'short' }),
            tasksCompleted,
            studyMinutes: studyMins[0]?.total || 0
          });
        }
        return days;
      })()
    ]);

    // Overdue tasks
    const overdueTasks = await Task.countDocuments({
      user: userId,
      scheduledDate: { $lt: todayStart },
      status: { $ne: 'Completed' }
    });

    res.json({
      activeGoals,
      totalGoals,
      completedGoals,
      todayTasks,
      todayCompletedTasks,
      totalTasks: allTasks,
      completedTasks,
      completionPercentage: allTasks > 0 ? Math.round((completedTasks / allTasks) * 100) : 0,
      weekStudyMinutes: weekStudy[0]?.totalMinutes || 0,
      streak: getEffectiveStreak(req.user),
      overdueTasks,
      upcomingDeadlines,
      recentActivities: recentTasks,
      weeklyData
    });
  } catch (error) {
    next(error);
  }
};
