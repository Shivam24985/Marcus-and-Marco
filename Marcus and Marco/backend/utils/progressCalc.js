const Goal = require('../models/Goal');
const Task = require('../models/Task');
const StudySession = require('../models/StudySession');

const getCleanId = (val) => {
  if (!val) return null;
  if (typeof val === 'string') return val;
  if (val._id) return val._id.toString();
  return val.toString();
};

/**
 * Accurately recalculates a learning goal's study hours and progress %
 * starting from 0% and dynamically reflecting real student activity
 */
const recalcGoalProgress = async (rawGoalId, userId) => {
  const goalId = getCleanId(rawGoalId);
  if (!goalId) return null;

  const cleanUserId = getCleanId(userId);
  const goal = await Goal.findOne({ _id: goalId, user: cleanUserId });
  if (!goal) return null;

  // 1. Fetch all tasks assigned to this goal
  const tasks = await Task.find({ goal: goalId, user: cleanUserId });

  // 2. Fetch all study sessions logged for this goal
  const sessions = await StudySession.find({ goal: goalId, user: cleanUserId });

  // 3. Calculate actual focused study minutes
  // Sessions directly tagged to this goal:
  const sessionMinutes = sessions.reduce((sum, s) => sum + (Number(s.duration) || 0), 0);

  // Avoid double-counting: if a session is already linked to a task, that task's time is inside sessionMinutes
  const taskIdsWithSessions = new Set(
    sessions.filter(s => s.task).map(s => getCleanId(s.task))
  );

  // Standalone task minutes logged directly without a timer session
  const standaloneTaskMinutes = tasks
    .filter(t => !taskIdsWithSessions.has(getCleanId(t._id)))
    .reduce((sum, t) => sum + (Number(t.actualTimeSpent) || 0), 0);

  const totalMinutes = sessionMinutes + standaloneTaskMinutes;
  goal.currentStudyHours = Math.round((totalMinutes / 60) * 10) / 10;

  // 4. Calculate progress percentage starting from zero
  const targetHours = Number(goal.targetStudyHours) || 10;
  const hourRatio = targetHours > 0 ? (goal.currentStudyHours / targetHours) : 0;

  let taskRatio = 0;
  if (tasks.length > 0) {
    const completedTasks = tasks.filter(t => t.status === 'Completed').length;
    taskRatio = completedTasks / tasks.length;
  }

  let calculatedProgress = 0;
  if (tasks.length > 0 && targetHours > 0) {
    // 60% weight on completed tasks, 40% on study hours logged
    calculatedProgress = Math.round((taskRatio * 0.6 + Math.min(1, hourRatio) * 0.4) * 100);
  } else if (tasks.length > 0) {
    calculatedProgress = Math.round(taskRatio * 100);
  } else if (targetHours > 0) {
    calculatedProgress = Math.round(Math.min(1, hourRatio) * 100);
  }

  goal.progress = Math.min(100, Math.max(0, calculatedProgress));

  // 5. Update goal status accordingly
  if (goal.progress >= 100) {
    goal.status = 'Completed';
  } else if (goal.progress > 0 && goal.status !== 'Paused') {
    goal.status = 'In Progress';
  } else if (goal.progress === 0 && goal.status !== 'Paused') {
    goal.status = 'Not Started';
  }

  await goal.save();
  return goal;
};

/**
 * Records real-life user activity (completing tasks, study timer, notebook)
 * and increments or maintains the daily streak accurately
 */
const recordUserActivity = async (userId) => {
  if (!userId) return null;
  const cleanId = getCleanId(userId);
  const User = require('../models/User');
  const user = await User.findById(cleanId);
  if (!user) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastActive = user.streak?.lastActiveDate ? new Date(user.streak.lastActiveDate) : null;
  if (lastActive) lastActive.setHours(0, 0, 0, 0);

  if (!user.streak) {
    user.streak = { current: 1, longest: 1, lastActiveDate: today };
  } else if (!lastActive) {
    user.streak.current = 1;
    user.streak.longest = Math.max(1, user.streak.longest || 1);
    user.streak.lastActiveDate = today;
  } else if (lastActive.getTime() === today.getTime()) {
    // Already active today; ensure current streak is at least 1
    if ((user.streak.current || 0) < 1) user.streak.current = 1;
    user.streak.lastActiveDate = today;
  } else {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (lastActive.getTime() === yesterday.getTime()) {
      // Consecutive active day!
      user.streak.current = (user.streak.current || 0) + 1;
    } else {
      // Streak lapsed, restart at 1
      user.streak.current = 1;
    }
    user.streak.lastActiveDate = today;
    if (user.streak.current > (user.streak.longest || 0)) {
      user.streak.longest = user.streak.current;
    }
  }

  await user.save();
  return user.streak;
};

/**
 * Returns current effective streak based on last active date
 */
const getEffectiveStreak = (user) => {
  if (!user || !user.streak) return { current: 0, longest: 0, lastActiveDate: null };
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!user.streak.lastActiveDate) {
    return { current: 0, longest: user.streak.longest || 0, lastActiveDate: null };
  }

  const lastActive = new Date(user.streak.lastActiveDate);
  lastActive.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (lastActive.getTime() < yesterday.getTime()) {
    return {
      current: 0,
      longest: user.streak.longest || 0,
      lastActiveDate: user.streak.lastActiveDate
    };
  }

  return user.streak;
};

module.exports = {
  getCleanId,
  recalcGoalProgress,
  recordUserActivity,
  getEffectiveStreak
};
