const Task = require('../models/Task');
const StudySession = require('../models/StudySession');
const Goal = require('../models/Goal');
const { getEffectiveStreak, recalcGoalProgress } = require('../utils/progressCalc');

// @desc    Get progress analytics
// @route   GET /api/progress
exports.getProgressAnalytics = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Daily task completion (last 30 days)
    const dailyTaskCompletion = [];
    for (let i = 29; i >= 0; i--) {
      const dayStart = new Date(todayStart);
      dayStart.setDate(dayStart.getDate() - i);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const count = await Task.countDocuments({
        user: userId,
        completedAt: { $gte: dayStart, $lt: dayEnd }
      });

      dailyTaskCompletion.push({
        date: dayStart.toISOString().split('T')[0],
        label: dayStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count
      });
    }

    // Weekly study hours (last 12 weeks)
    const weeklyStudyHours = [];
    for (let i = 11; i >= 0; i--) {
      const wStart = new Date(weekStart);
      wStart.setDate(wStart.getDate() - i * 7);
      const wEnd = new Date(wStart);
      wEnd.setDate(wEnd.getDate() + 7);

      const result = await StudySession.aggregate([
        { $match: { user: userId, date: { $gte: wStart, $lt: wEnd } } },
        { $group: { _id: null, total: { $sum: '$duration' } } }
      ]);

      weeklyStudyHours.push({
        weekStart: wStart.toISOString().split('T')[0],
        label: `W${12 - i}`,
        hours: Math.round(((result[0]?.total || 0) / 60) * 10) / 10
      });
    }

    // Monthly study hours (last 6 months)
    const monthlyStudyHours = [];
    for (let i = 5; i >= 0; i--) {
      const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

      const result = await StudySession.aggregate([
        { $match: { user: userId, date: { $gte: mStart, $lt: mEnd } } },
        { $group: { _id: null, total: { $sum: '$duration' } } }
      ]);

      monthlyStudyHours.push({
        month: mStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        hours: Math.round(((result[0]?.total || 0) / 60) * 10) / 10
      });
    }

    // Goal completion
    const [totalGoals, completedGoals] = await Promise.all([
      Goal.countDocuments({ user: userId }),
      Goal.countDocuments({ user: userId, status: 'Completed' })
    ]);

    // Tasks stats
    const [totalTasks, completedTasks, pendingTasks] = await Promise.all([
      Task.countDocuments({ user: userId }),
      Task.countDocuments({ user: userId, status: 'Completed' }),
      Task.countDocuments({ user: userId, status: { $ne: 'Completed' } })
    ]);

    // Study by subject
    const goalsBySubject = await Goal.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: '$subject',
          totalGoals: { $sum: 1 },
          completedGoals: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } },
          totalHours: { $sum: '$currentStudyHours' },
          avgProgress: { $avg: '$progress' }
        }
      },
      { $sort: { totalHours: -1 } }
    ]);

    // This week vs last week comparison
    const [thisWeekTasks, lastWeekTasks, thisWeekStudy, lastWeekStudy] = await Promise.all([
      Task.countDocuments({ user: userId, completedAt: { $gte: weekStart } }),
      Task.countDocuments({ user: userId, completedAt: { $gte: lastWeekStart, $lt: weekStart } }),
      StudySession.aggregate([
        { $match: { user: userId, date: { $gte: weekStart } } },
        { $group: { _id: null, total: { $sum: '$duration' } } }
      ]),
      StudySession.aggregate([
        { $match: { user: userId, date: { $gte: lastWeekStart, $lt: weekStart } } },
        { $group: { _id: null, total: { $sum: '$duration' } } }
      ])
    ]);

    const thisWeekMinutes = thisWeekStudy[0]?.total || 0;
    const lastWeekMinutes = lastWeekStudy[0]?.total || 0;

    // Study heatmap (last 90 days)
    const heatmapData = [];
    for (let i = 89; i >= 0; i--) {
      const dayStart = new Date(todayStart);
      dayStart.setDate(dayStart.getDate() - i);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const result = await StudySession.aggregate([
        { $match: { user: userId, date: { $gte: dayStart, $lt: dayEnd } } },
        { $group: { _id: null, total: { $sum: '$duration' } } }
      ]);

      heatmapData.push({
        date: dayStart.toISOString().split('T')[0],
        minutes: result[0]?.total || 0
      });
    }

    // Planned vs actual study hours per goal
    const plannedVsActual = await Goal.find({ user: userId })
      .select('title targetStudyHours currentStudyHours subject')
      .sort({ createdAt: -1 })
      .limit(10);

    // Overdue tasks count
    const overdueTasks = await Task.countDocuments({
      user: userId,
      scheduledDate: { $lt: todayStart },
      status: { $ne: 'Completed' }
    });

    // Generate insights
    const insights = [];

    if (thisWeekTasks > 0) {
      insights.push({ type: 'info', text: `You completed ${thisWeekTasks} task${thisWeekTasks !== 1 ? 's' : ''} this week.` });
    }

    const studyDiffHours = Math.round(((thisWeekMinutes - lastWeekMinutes) / 60) * 10) / 10;
    if (studyDiffHours > 0) {
      insights.push({ type: 'success', text: `You studied ${studyDiffHours} hours more than last week. Keep it up!` });
    } else if (studyDiffHours < 0) {
      insights.push({ type: 'warning', text: `You studied ${Math.abs(studyDiffHours)} hours less than last week.` });
    }

    if (goalsBySubject.length > 0) {
      const topSubject = goalsBySubject[0];
      insights.push({ type: 'info', text: `You are most consistent with ${topSubject._id} (${Math.round(topSubject.totalHours * 10) / 10} hours).` });
    }

    if (overdueTasks > 0) {
      insights.push({ type: 'warning', text: `You have ${overdueTasks} overdue task${overdueTasks !== 1 ? 's' : ''}.` });
    }

    if (req.user.streak.current >= 3) {
      insights.push({ type: 'success', text: `Amazing! You're on a ${req.user.streak.current}-day learning streak! 🔥` });
    }

    // Total lifetime study minutes
    const totalStudyResult = await StudySession.aggregate([
      { $match: { user: userId } },
      { $group: { _id: null, total: { $sum: '$duration' } } }
    ]);
    const totalLifetimeMinutes = totalStudyResult[0]?.total || 0;

    // Day of week distribution (Monday to Sunday)
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayDistribution = dayNames.map((name, i) => ({ day: name, index: i, minutes: 0, hours: 0, tasks: 0 }));

    const recentSessions = await StudySession.find({
      user: userId,
      date: { $gte: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000) }
    });
    recentSessions.forEach(s => {
      const d = new Date(s.date).getDay();
      dayDistribution[d].minutes += (s.duration || 0);
    });

    const recentTasks = await Task.find({
      user: userId,
      completedAt: { $gte: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000) }
    });
    recentTasks.forEach(t => {
      const d = new Date(t.completedAt).getDay();
      dayDistribution[d].tasks += 1;
    });

    dayDistribution.forEach(d => {
      d.hours = parseFloat((d.minutes / 60).toFixed(1));
    });

    // Reorder Monday through Sunday
    const sortedDayDistribution = [
      dayDistribution[1], dayDistribution[2], dayDistribution[3],
      dayDistribution[4], dayDistribution[5], dayDistribution[6], dayDistribution[0]
    ];

    // Effective streak based on real activity
    const effectiveStreak = getEffectiveStreak(req.user);

    // Compute productivity momentum score (0-100)
    const taskRate = totalTasks > 0 ? (completedTasks / totalTasks) : 0;
    const streakBonus = Math.min(25, (effectiveStreak.current || 0) * 5);
    const studyScore = Math.min(40, (thisWeekMinutes / 300) * 40);
    const taskScore = Math.min(35, taskRate * 35);
    const productivityScore = Math.min(100, Math.round(streakBonus + studyScore + taskScore));

    // Consistency score (Active days in the last 7 days)
    const last7DaysHeatmap = (heatmapData || []).slice(-7);
    const last7DaysTasks = (dailyTaskCompletion || []).slice(-7);
    let activeDaysThisWeek = 0;
    for (let i = 0; i < 7; i++) {
      const heatMins = last7DaysHeatmap[i]?.minutes || 0;
      const tasksDone = last7DaysTasks[i]?.count || 0;
      if (heatMins > 0 || tasksDone > 0) {
        activeDaysThisWeek += 1;
      }
    }
    const consistencyScore = Math.round((activeDaysThisWeek / 7) * 100);

    // Full goals list for interactive radar / milestone tracking
    const allGoals = await Goal.find({ user: userId }).sort({ progress: -1 });

    res.json({
      dailyTaskCompletion,
      weeklyStudyHours,
      monthlyStudyHours,
      goalCompletion: { total: totalGoals, completed: completedGoals },
      taskStats: { total: totalTasks, completed: completedTasks, pending: pendingTasks },
      subjectBreakdown: goalsBySubject,
      weekComparison: {
        thisWeek: { tasks: thisWeekTasks, studyMinutes: thisWeekMinutes },
        lastWeek: { tasks: lastWeekTasks, studyMinutes: lastWeekMinutes }
      },
      heatmapData,
      plannedVsActual,
      streak: effectiveStreak,
      activeDaysThisWeek,
      consistencyScore,
      insights,
      dayDistribution: sortedDayDistribution,
      productivityScore,
      totalLifetimeMinutes,
      allGoals
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset progress to a clean zero baseline for 100% genuine real-life tracking
// @route   POST /api/progress/reset-baseline
exports.resetBaseline = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // 1. Clear all past study sessions
    if (global.USE_MEMORY_STORE) {
      const memoryStore = require('../config/memoryStore');
      memoryStore.sessions = memoryStore.sessions.filter(s => s.user.toString() !== userId.toString());
      
      // Filter out past tasks (keep today's tasks and upcoming tasks)
      memoryStore.tasks = memoryStore.tasks.filter(t => {
        if (t.user.toString() !== userId.toString()) return true;
        return new Date(t.scheduledDate) >= todayStart;
      });

      // Reset today's tasks actualTimeSpent to 0 if not completed
      memoryStore.tasks.forEach(t => {
        if (t.user.toString() === userId.toString()) {
          t.actualTimeSpent = 0;
          t.status = 'To Do';
          t.completedAt = null;
        }
      });

      // Reset all goals to zero baseline
      memoryStore.goals.forEach(g => {
        if (g.user.toString() === userId.toString()) {
          g.currentStudyHours = 0;
          g.progress = 0;
          g.status = 'Not Started';
        }
      });

      // Reset notebook pages daily goals
      memoryStore.notebookPages.forEach(p => {
        if (p.user.toString() === userId.toString()) {
          if (p.dailyGoals) {
            p.dailyGoals.forEach(dg => {
              dg.actualQuantity = 0;
              dg.progress = 0;
              dg.completed = false;
            });
          }
        }
      });

      // Reset streak starting today
      const user = memoryStore.users.find(u => u._id.toString() === userId.toString());
      if (user) {
        user.streak = { current: 1, longest: 1, lastActiveDate: now };
      }
    } else {
      await StudySession.deleteMany({ user: userId });
      await Task.deleteMany({ user: userId, scheduledDate: { $lt: todayStart } });
      await Task.updateMany(
        { user: userId },
        { actualTimeSpent: 0, status: 'To Do', completedAt: null }
      );
      await Goal.updateMany(
        { user: userId },
        { currentStudyHours: 0, progress: 0, status: 'Not Started' }
      );
      const User = require('../models/User');
      await User.findByIdAndUpdate(userId, {
        streak: { current: 1, longest: 1, lastActiveDate: now }
      });
    }

    res.json({
      message: 'Zero baseline established! All progress reports will now trace your real-life consistency from Day 1.'
    });
  } catch (error) {
    next(error);
  }
};
