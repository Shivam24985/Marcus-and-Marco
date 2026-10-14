const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config();

const User = require('../models/User');
const Goal = require('../models/Goal');
const Task = require('../models/Task');
const StudySession = require('../models/StudySession');

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Goal.deleteMany({}),
      Task.deleteMany({}),
      StudySession.deleteMany({})
    ]);
    console.log('Cleared existing data');

    // Create demo user
    const user = await User.create({
      name: 'Alex Johnson',
      email: 'alex@example.com',
      password: 'password123',
      learningPreferences: ['JavaScript', 'React', 'Python'],
      dailyStudyTarget: 3,
      streak: { current: 5, longest: 12, lastActiveDate: new Date() }
    });
    console.log('Created demo user: alex@example.com / password123');

    // Create goals
    const goals = await Goal.insertMany([
      {
        user: user._id,
        title: 'Master React & Next.js',
        description: 'Build production-ready React applications with Next.js',
        subject: 'React',
        startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        priority: 'High',
        targetStudyHours: 50,
        currentStudyHours: 18,
        progress: 35,
        status: 'In Progress',
        color: '#6366f1'
      },
      {
        user: user._id,
        title: 'Learn Python for Data Science',
        description: 'Cover NumPy, Pandas, and Matplotlib',
        subject: 'Python',
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        targetDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        priority: 'Medium',
        targetStudyHours: 40,
        currentStudyHours: 8,
        progress: 20,
        status: 'In Progress',
        color: '#10b981'
      },
      {
        user: user._id,
        title: 'DSA Problem Solving',
        description: 'Solve 100 LeetCode problems covering all major topics',
        subject: 'DSA',
        startDate: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
        targetDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        priority: 'High',
        targetStudyHours: 80,
        currentStudyHours: 25,
        progress: 30,
        status: 'In Progress',
        color: '#f59e0b'
      },
      {
        user: user._id,
        title: 'JavaScript Advanced Concepts',
        description: 'Deep dive into closures, prototypes, async patterns',
        subject: 'JavaScript',
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        targetDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        priority: 'Medium',
        targetStudyHours: 30,
        currentStudyHours: 28,
        progress: 90,
        status: 'In Progress',
        color: '#ef4444'
      },
      {
        user: user._id,
        title: 'Introduction to AI/ML',
        description: 'Understand ML fundamentals and build basic models',
        subject: 'AI/ML',
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        priority: 'Low',
        targetStudyHours: 60,
        currentStudyHours: 0,
        progress: 0,
        status: 'Not Started',
        color: '#8b5cf6'
      }
    ]);
    console.log(`Created ${goals.length} goals`);

    // Create tasks
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tasks = [];

    // Today's tasks
    tasks.push(
      { user: user._id, goal: goals[0]._id, title: 'Build a todo app with React hooks', description: 'Practice useState, useEffect, useContext', scheduledDate: today, estimatedDuration: 60, priority: 'High', status: 'To Do' },
      { user: user._id, goal: goals[2]._id, title: 'Solve 3 LeetCode medium problems', description: 'Focus on arrays and hash maps', scheduledDate: today, estimatedDuration: 90, priority: 'High', status: 'In Progress', actualTimeSpent: 30 },
      { user: user._id, goal: goals[1]._id, title: 'Complete Pandas tutorial chapter 5', description: 'Data grouping and aggregation', scheduledDate: today, estimatedDuration: 45, priority: 'Medium', status: 'To Do' }
    );

    // Past completed tasks
    for (let i = 1; i <= 10; i++) {
      const pastDate = new Date(today);
      pastDate.setDate(pastDate.getDate() - i);
      const goalIdx = i % goals.length;

      tasks.push({
        user: user._id,
        goal: goals[goalIdx < 4 ? goalIdx : 0]._id,
        title: `Study session ${i} - ${goals[goalIdx < 4 ? goalIdx : 0].subject}`,
        description: `Completed study task for ${goals[goalIdx < 4 ? goalIdx : 0].title}`,
        scheduledDate: pastDate,
        estimatedDuration: 30 + (i % 4) * 15,
        actualTimeSpent: 25 + (i % 5) * 10,
        priority: ['Low', 'Medium', 'High'][i % 3],
        status: 'Completed',
        completedAt: pastDate
      });
    }

    // Upcoming tasks
    for (let i = 1; i <= 5; i++) {
      const futureDate = new Date(today);
      futureDate.setDate(futureDate.getDate() + i);

      tasks.push({
        user: user._id,
        goal: goals[i % 3]._id,
        title: `Upcoming task ${i} - ${goals[i % 3].subject}`,
        scheduledDate: futureDate,
        estimatedDuration: 45,
        priority: ['Low', 'Medium', 'High'][i % 3],
        status: 'To Do'
      });
    }

    await Task.insertMany(tasks);
    console.log(`Created ${tasks.length} tasks`);

    // Create study sessions (last 14 days)
    const sessions = [];
    for (let i = 0; i < 14; i++) {
      const sessionDate = new Date(today);
      sessionDate.setDate(sessionDate.getDate() - i);
      const numSessions = Math.floor(Math.random() * 3) + 1;

      for (let j = 0; j < numSessions; j++) {
        sessions.push({
          user: user._id,
          goal: goals[Math.floor(Math.random() * 4)]._id,
          duration: 15 + Math.floor(Math.random() * 45),
          date: sessionDate,
          type: j === 0 ? 'Pomodoro' : 'Free',
          notes: ''
        });
      }
    }

    await StudySession.insertMany(sessions);
    console.log(`Created ${sessions.length} study sessions`);

    console.log('\n✅ Seed completed successfully!');
    console.log('Login with: alex@example.com / password123');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seed();
