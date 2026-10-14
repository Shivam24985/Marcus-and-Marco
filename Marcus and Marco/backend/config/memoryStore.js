const bcrypt = require('bcryptjs');

class MemoryStore {
  constructor() {
    this.users = [];
    this.goals = [];
    this.tasks = [];
    this.sessions = [];
    this.notebookPages = [];
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;

    // Create demo user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    const demoUser = {
      _id: 'user_alex_001',
      name: 'Shivam',
      email: 'shivam@example.com',
      password: hashedPassword,
      learningPreferences: ['JavaScript', 'React', 'Python', 'DSA'],
      dailyStudyTarget: 3,
      streak: { current: 5, longest: 12, lastActiveDate: new Date() },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.push(demoUser);

    // Also alias alex@example.com to the same user credentials for backward compatibility
    this.users.push({
      ...demoUser,
      _id: 'user_alex_alias',
      email: 'alex@example.com'
    });

    // Create goals
    const now = new Date();
    const demoGoals = [
      {
        _id: 'goal_react_001',
        user: demoUser._id,
        title: 'Master React & Next.js',
        description: 'Build production-ready React applications with Next.js and Tailwind',
        subject: 'React',
        startDate: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
        targetDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        priority: 'High',
        targetStudyHours: 50,
        currentStudyHours: 18.5,
        progress: 35,
        status: 'In Progress',
        color: '#6366f1',
        createdAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
      },
      {
        _id: 'goal_python_002',
        user: demoUser._id,
        title: 'Learn Python for Data Science',
        description: 'Cover NumPy, Pandas, and Matplotlib algorithms',
        subject: 'Python',
        startDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        targetDate: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000),
        priority: 'Medium',
        targetStudyHours: 40,
        currentStudyHours: 8,
        progress: 20,
        status: 'In Progress',
        color: '#10b981',
        createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      },
      {
        _id: 'goal_dsa_003',
        user: demoUser._id,
        title: 'DSA Problem Solving',
        description: 'Solve 100 LeetCode problems covering arrays, graphs, DP',
        subject: 'DSA',
        startDate: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000),
        targetDate: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
        priority: 'High',
        targetStudyHours: 80,
        currentStudyHours: 25,
        progress: 30,
        status: 'In Progress',
        color: '#f59e0b',
        createdAt: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000)
      },
      {
        _id: 'goal_js_004',
        user: demoUser._id,
        title: 'JavaScript Advanced Concepts',
        description: 'Deep dive into closures, prototypes, event loop, and async patterns',
        subject: 'JavaScript',
        startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        targetDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // Overdue
        priority: 'Medium',
        targetStudyHours: 30,
        currentStudyHours: 28,
        progress: 90,
        status: 'In Progress',
        color: '#ef4444',
        createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      },
      {
        _id: 'goal_aiml_005',
        user: demoUser._id,
        title: 'Introduction to AI/ML',
        description: 'Understand ML fundamentals and build classification models',
        subject: 'AI/ML',
        startDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        targetDate: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
        priority: 'Low',
        targetStudyHours: 60,
        currentStudyHours: 0,
        progress: 0,
        status: 'Not Started',
        color: '#8b5cf6',
        createdAt: new Date()
      }
    ];
    this.goals.push(...demoGoals);

    // Create Tasks
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Today's tasks
    this.tasks.push(
      {
        _id: 'task_001',
        user: demoUser._id,
        goal: demoGoals[0],
        title: 'Build custom hooks for SkillTrack auth state',
        description: 'Implement useAuth and sync localStorage with state',
        scheduledDate: today,
        estimatedDuration: 60,
        actualTimeSpent: 45,
        priority: 'High',
        status: 'Completed',
        completedAt: new Date(today.getTime() + 4 * 3600 * 1000)
      },
      {
        _id: 'task_002',
        user: demoUser._id,
        goal: demoGoals[2],
        title: 'Solve 3 LeetCode Medium problems (Binary Trees)',
        description: 'Focus on Lowest Common Ancestor and Level Order Traversal',
        scheduledDate: today,
        estimatedDuration: 90,
        actualTimeSpent: 30,
        priority: 'High',
        status: 'In Progress',
        completedAt: null
      },
      {
        _id: 'task_003',
        user: demoUser._id,
        goal: demoGoals[1],
        title: 'Complete Pandas tutorial chapter 5',
        description: 'Data grouping, multi-index aggregation, and pivot tables',
        scheduledDate: today,
        estimatedDuration: 45,
        actualTimeSpent: 0,
        priority: 'Medium',
        status: 'To Do',
        completedAt: null
      }
    );

    // Past completed tasks (for weekly charts and analytics)
    for (let i = 1; i <= 14; i++) {
      const pastDate = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const goal = demoGoals[i % demoGoals.length];
      this.tasks.push({
        _id: `task_past_${i}`,
        user: demoUser._id,
        goal: goal,
        title: `Study session ${i} — ${goal.subject} core exercise`,
        description: `Deliberate practice and review for ${goal.title}`,
        scheduledDate: pastDate,
        estimatedDuration: 30 + (i % 3) * 15,
        actualTimeSpent: 30 + (i % 4) * 10,
        priority: ['Low', 'Medium', 'High'][i % 3],
        status: 'Completed',
        completedAt: pastDate
      });
    }

    // Upcoming tasks
    for (let i = 1; i <= 6; i++) {
      const futureDate = new Date(today.getTime() + i * 24 * 60 * 60 * 1000);
      const goal = demoGoals[i % 3];
      this.tasks.push({
        _id: `task_future_${i}`,
        user: demoUser._id,
        goal: goal,
        title: `Scheduled milestone ${i} — ${goal.subject}`,
        description: `Upcoming milestone for ${goal.title}`,
        scheduledDate: futureDate,
        estimatedDuration: 45,
        actualTimeSpent: 0,
        priority: ['Low', 'Medium', 'High'][i % 3],
        status: 'To Do',
        completedAt: null
      });
    }

    // Overdue task
    const pastOverdueDate = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000);
    this.tasks.push({
      _id: 'task_overdue_001',
      user: demoUser._id,
      goal: demoGoals[3],
      title: 'Review JavaScript prototypes and memory leaks',
      description: 'Crucial for closing the JS goal',
      scheduledDate: pastOverdueDate,
      estimatedDuration: 40,
      actualTimeSpent: 0,
      priority: 'High',
      status: 'To Do',
      completedAt: null
    });

    // Create Study Sessions (Last 14 days)
    for (let i = 0; i < 14; i++) {
      const sessionDate = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const numSessions = (i % 3) + 1;

      for (let j = 0; j < numSessions; j++) {
        const goal = demoGoals[j % 4];
        this.sessions.push({
          _id: `session_${i}_${j}`,
          user: demoUser._id,
          goal: goal,
          task: null,
          duration: 25 + ((i * 5) % 30),
          date: sessionDate,
          type: j === 0 ? 'Pomodoro' : 'Free',
          notes: j === 0 ? 'Pomodoro deep sprint' : 'Problem solving and documentation review'
        });
      }
    }

    // Create Demo Notebook Page for today
    const pad = (n) => String(n).padStart(2, '0');
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    this.notebookPages.push({
      _id: 'page_today_001',
      user: demoUser._id,
      date: todayStr,
      dailyHeading: "Today's Full-Stack & System Mastery",
      dailyMotivation: "Small daily improvements over time lead to stunning results. Focus deeply on one milestone at a time.",
      mainGoal: "Complete the SkillTrack daily task and progress engine with full testing",
      dailyGoals: [
        {
          _id: 'dg_001',
          title: 'Study React State & Hook Architecture',
          subject: 'React',
          targetQuantity: 120,
          actualQuantity: 90,
          unit: 'mins',
          progress: 75,
          completed: false,
          notes: 'Covered useAuth, useTheme, and custom form hooks'
        },
        {
          _id: 'dg_002',
          title: 'Solve 3 LeetCode Binary Tree Problems',
          subject: 'DSA',
          targetQuantity: 3,
          actualQuantity: 3,
          unit: 'problems',
          progress: 100,
          completed: true,
          notes: 'Finished LCA and Level Order Traversal'
        },
        {
          _id: 'dg_003',
          title: 'Complete Pandas Aggregation Lesson',
          subject: 'Python',
          targetQuantity: 1,
          actualQuantity: 1,
          unit: 'lessons',
          progress: 100,
          completed: true,
          notes: 'Covered groupby, transform, and rolling windows'
        }
      ],
      studyNotes: "### Today's Core Discoveries\n- Mastered Recharts ResponsiveContainer dimensions inside flexible grid layouts by giving explicit height baselines.\n- Handled Mongoose connection failure gracefully with fallback in-memory adapters, making the application zero-dependency portable.\n- Clean JWT auth state sync across localStorage and reactive context.",
      problemsFaced: "Encountered a container dimension calculation collision in React 18 with StrictMode; solved by removing double-mount StrictMode and passing height={240} to ResponsiveContainer.",
      whatILearned: "When creating responsive dashboards, always provide a resilient minimum height to visualization components and guard against initial zero-dimension measurements.",
      tomorrowPlan: "Build out the study session timer presets and refine keyboard shortcuts for task completion.",
      dailyReflection: "Solid focus day! Completed 2 of 3 daily targets and cleared major backlog tasks. Need to start earlier tomorrow morning for peak cognitive energy.",
      createdAt: new Date(),
      updatedAt: new Date()
    });

    this.initialized = true;
    console.log('[SkillTrack] Embedded mock database initialized with complete student dataset!');
  }
}

const memoryStore = new MemoryStore();
module.exports = memoryStore;
