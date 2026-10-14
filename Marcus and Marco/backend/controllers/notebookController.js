const NotebookPage = require('../models/NotebookPage');
const Task = require('../models/Task');

// Helper to compute summary from tasks and daily goals
const computeDailySummary = (tasks, dailyGoals = []) => {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'Completed').length;
  const remainingTasks = totalTasks - completedTasks;
  const plannedMinutes = tasks.reduce((sum, t) => sum + (Number(t.estimatedDuration) || 0), 0);
  const actualMinutes = tasks.reduce((sum, t) => sum + (Number(t.actualTimeSpent) || 0), 0);

  const totalDailyGoals = dailyGoals.length;
  const completedDailyGoals = dailyGoals.filter(g => g.completed).length;

  const taskCompletionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const goalCompletionPercentage = totalDailyGoals > 0 ? Math.round((completedDailyGoals / totalDailyGoals) * 100) : 0;

  // Overall combined completion percentage
  let overallPercentage = 0;
  if (totalTasks > 0 && totalDailyGoals > 0) {
    overallPercentage = Math.round((taskCompletionPercentage + goalCompletionPercentage) / 2);
  } else if (totalTasks > 0) {
    overallPercentage = taskCompletionPercentage;
  } else if (totalDailyGoals > 0) {
    overallPercentage = goalCompletionPercentage;
  }

  return {
    totalTasksPlanned: totalTasks,
    tasksCompleted: completedTasks,
    tasksRemaining: remainingTasks,
    totalPlannedStudyTime: plannedMinutes,
    actualStudyTime: actualMinutes,
    totalDailyGoals,
    dailyGoalsCompleted: completedDailyGoals,
    taskCompletionPercentage,
    goalCompletionPercentage,
    overallPercentage
  };
};

const getTodayStr = () => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

const getDateRange = (dateStr) => {
  const parts = (dateStr || getTodayStr()).split('-');
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  const dayStart = new Date(y, m, d, 0, 0, 0, 0);
  const dayEnd = new Date(y, m, d + 1, 0, 0, 0, 0);
  return { dayStart, dayEnd };
};

// @desc    Get or initialize notebook page for a date
// @route   GET /api/notebook
exports.getPageByDate = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const dateStr = req.query.date || getTodayStr();

    // Find or create default page
    let page = await NotebookPage.findOne({ user: userId, date: dateStr });
    if (!page) {
      page = await NotebookPage.create({
        user: userId,
        date: dateStr,
        dailyHeading: "Today's Learning Plan",
        dailyMotivation: "",
        mainGoal: "",
        dailyGoals: [],
        studyNotes: "",
        problemsFaced: "",
        whatILearned: "",
        tomorrowPlan: "",
        dailyReflection: ""
      });
    }

    // Retrieve scheduled tasks for this date
    const { dayStart, dayEnd } = getDateRange(dateStr);

    const tasks = await Task.find({
      user: userId,
      scheduledDate: { $gte: dayStart, $lt: dayEnd }
    }).populate('goal', 'title subject color');

    const summary = computeDailySummary(tasks, page.dailyGoals || []);

    res.json({
      page,
      tasks,
      summary
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update notebook page contents (autosave or manual)
// @route   PUT /api/notebook
exports.savePage = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const {
      date,
      dailyHeading,
      dailyMotivation,
      mainGoal,
      dailyGoals,
      studyNotes,
      problemsFaced,
      whatILearned,
      tomorrowPlan,
      dailyReflection
    } = req.body;

    if (!date) {
      return res.status(400).json({ message: 'Date is required' });
    }

    const updateFields = {};
    if (dailyHeading !== undefined) updateFields.dailyHeading = dailyHeading;
    if (dailyMotivation !== undefined) updateFields.dailyMotivation = dailyMotivation;
    if (mainGoal !== undefined) updateFields.mainGoal = mainGoal;
    if (dailyGoals !== undefined) updateFields.dailyGoals = dailyGoals;
    if (studyNotes !== undefined) updateFields.studyNotes = studyNotes;
    if (problemsFaced !== undefined) updateFields.problemsFaced = problemsFaced;
    if (whatILearned !== undefined) updateFields.whatILearned = whatILearned;
    if (tomorrowPlan !== undefined) updateFields.tomorrowPlan = tomorrowPlan;
    if (dailyReflection !== undefined) updateFields.dailyReflection = dailyReflection;

    let page = await NotebookPage.findOneAndUpdate(
      { user: userId, date },
      updateFields,
      { new: true, upsert: true }
    );

    // Retrieve tasks for refreshed summary
    const { dayStart, dayEnd } = getDateRange(date);

    const tasks = await Task.find({
      user: userId,
      scheduledDate: { $gte: dayStart, $lt: dayEnd }
    }).populate('goal', 'title subject color');

    const summary = computeDailySummary(tasks, page.dailyGoals || []);

    res.json({
      message: 'Page saved successfully',
      page,
      summary
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add a daily goal item to date's notebook page
// @route   POST /api/notebook/daily-goals
exports.addDailyGoal = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { date, title, subject, targetQuantity, actualQuantity, unit, notes } = req.body;

    if (!date || !title) {
      return res.status(400).json({ message: 'Date and Title are required' });
    }

    let page = await NotebookPage.findOne({ user: userId, date });
    if (!page) {
      page = await NotebookPage.create({ user: userId, date, dailyGoals: [] });
    }

    const target = Number(targetQuantity) || 1;
    const actual = Number(actualQuantity) || 0;
    const progress = Math.min(100, Math.round((actual / target) * 100));
    const completed = actual >= target;

    const newDailyGoal = {
      _id: `dg_${Date.now()}`,
      title: title.trim(),
      subject: (subject || '').trim(),
      targetQuantity: target,
      actualQuantity: actual,
      unit: unit || 'mins',
      progress,
      completed,
      notes: (notes || '').trim()
    };

    page.dailyGoals = page.dailyGoals || [];
    page.dailyGoals.push(newDailyGoal);
    await page.save();

    res.status(201).json({
      dailyGoal: newDailyGoal,
      dailyGoals: page.dailyGoals
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a daily goal
// @route   PUT /api/notebook/daily-goals/:goalId
exports.updateDailyGoal = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { goalId } = req.params;
    const { date, title, subject, targetQuantity, actualQuantity, unit, completed, notes } = req.body;

    if (!date) {
      return res.status(400).json({ message: 'Date is required' });
    }

    const page = await NotebookPage.findOne({ user: userId, date });
    if (!page) {
      return res.status(404).json({ message: 'Notebook page not found' });
    }

    const goalIndex = page.dailyGoals.findIndex(g => g._id.toString() === goalId.toString());
    if (goalIndex === -1) {
      return res.status(404).json({ message: 'Daily goal not found' });
    }

    const currentGoal = page.dailyGoals[goalIndex];
    if (title !== undefined) currentGoal.title = title.trim();
    if (subject !== undefined) currentGoal.subject = subject.trim();
    if (unit !== undefined) currentGoal.unit = unit;
    if (notes !== undefined) currentGoal.notes = notes;

    if (targetQuantity !== undefined) currentGoal.targetQuantity = Number(targetQuantity) || 1;
    if (actualQuantity !== undefined) currentGoal.actualQuantity = Number(actualQuantity) || 0;

    // Recalculate progress
    currentGoal.progress = Math.min(100, Math.round((currentGoal.actualQuantity / currentGoal.targetQuantity) * 100));

    if (completed !== undefined) {
      currentGoal.completed = completed;
      if (completed && currentGoal.actualQuantity < currentGoal.targetQuantity) {
        currentGoal.actualQuantity = currentGoal.targetQuantity;
        currentGoal.progress = 100;
      }
    } else {
      currentGoal.completed = currentGoal.actualQuantity >= currentGoal.targetQuantity;
    }

    page.dailyGoals[goalIndex] = currentGoal;
    await page.save();

    if (currentGoal.completed) {
      const { recordUserActivity } = require('../utils/progressCalc');
      await recordUserActivity(userId);
    }

    res.json({
      dailyGoal: currentGoal,
      dailyGoals: page.dailyGoals
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a daily goal
// @route   DELETE /api/notebook/daily-goals/:goalId
exports.deleteDailyGoal = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { goalId } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ message: 'Date is required' });
    }

    const page = await NotebookPage.findOne({ user: userId, date });
    if (!page) {
      return res.status(404).json({ message: 'Notebook page not found' });
    }

    page.dailyGoals = page.dailyGoals.filter(g => g._id.toString() !== goalId.toString());
    await page.save();

    res.json({
      message: 'Daily goal removed',
      dailyGoals: page.dailyGoals
    });
  } catch (error) {
    next(error);
  }
};
