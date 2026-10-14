const memoryStore = require('../config/memoryStore');
const bcrypt = require('bcryptjs');

const toCleanId = (val) => {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (val._id) return val._id.toString();
  return val.toString();
};

// Mock User Model
const MemoryUser = {
  findOne(query) {
    const chain = {
      select() { return this; },
      then(resolve, reject) {
        if (query.email) {
          const user = memoryStore.users.find(u => u.email.toLowerCase() === query.email.toLowerCase());
          if (!user) return resolve(null);
          return resolve({
            ...user,
            select() { return this; },
            async comparePassword(candidate) {
              return await bcrypt.compare(candidate, user.password);
            },
            async save() {
              const idx = memoryStore.users.findIndex(u => toCleanId(u._id) === toCleanId(this._id));
              if (idx !== -1) memoryStore.users[idx] = { ...this };
              return this;
            }
          });
        }
        return resolve(null);
      }
    };
    return chain;
  },

  findById(id) {
    const chain = {
      select() { return this; },
      then(resolve, reject) {
        const cleanId = toCleanId(id);
        const user = memoryStore.users.find(u => toCleanId(u._id) === cleanId);
        if (!user) return resolve(null);
        return resolve({
          ...user,
          select() { return this; },
          async comparePassword(candidate) {
            return await bcrypt.compare(candidate, user.password);
          },
          async save() {
            const idx = memoryStore.users.findIndex(u => toCleanId(u._id) === toCleanId(this._id));
            if (idx !== -1) memoryStore.users[idx] = { ...this };
            return this;
          }
        });
      }
    };
    return chain;
  },

  async create(data) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.password, salt);
    const newUser = {
      _id: `user_${Date.now()}`,
      name: data.name,
      email: data.email.toLowerCase(),
      password: hashedPassword,
      learningPreferences: data.learningPreferences || [],
      dailyStudyTarget: data.dailyStudyTarget || 3,
      streak: { current: 1, longest: 1, lastActiveDate: new Date() },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    memoryStore.users.push(newUser);
    return newUser;
  },

  async findByIdAndUpdate(id, updateData) {
    const cleanId = toCleanId(id);
    const idx = memoryStore.users.findIndex(u => toCleanId(u._id) === cleanId);
    if (idx === -1) return null;
    memoryStore.users[idx] = { ...memoryStore.users[idx], ...updateData, updatedAt: new Date() };
    return memoryStore.users[idx];
  }
};

// Mock Goal Model
const MemoryGoal = {
  find(query = {}) {
    let result = [...memoryStore.goals];
    if (query._id) {
      const qid = toCleanId(query._id);
      result = result.filter(g => toCleanId(g._id) === qid);
    }
    if (query.user) {
      const targetUser = toCleanId(query.user);
      result = result.filter(g => toCleanId(g.user) === targetUser);
    }
    if (query.status) {
      if (query.status.$in) {
        result = result.filter(g => query.status.$in.includes(g.status));
      } else if (query.status.$ne) {
        result = result.filter(g => g.status !== query.status.$ne);
      } else {
        result = result.filter(g => g.status === query.status);
      }
    }
    if (query.priority) {
      result = result.filter(g => g.priority === query.priority);
    }
    if (query.subject && query.subject.$regex) {
      const reg = new RegExp(query.subject.$regex, query.subject.$options || 'i');
      result = result.filter(g => reg.test(g.subject));
    }
    if (query.targetDate) {
      if (query.targetDate.$gte) result = result.filter(g => new Date(g.targetDate) >= query.targetDate.$gte);
      if (query.targetDate.$lte) result = result.filter(g => new Date(g.targetDate) <= query.targetDate.$lte);
    }

    const chain = {
      _data: result,
      sort(sortOpt) {
        if (sortOpt.targetDate) this._data.sort((a,b) => new Date(a.targetDate) - new Date(b.targetDate));
        else if (sortOpt.createdAt) this._data.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
        else if (sortOpt.progress) this._data.sort((a,b) => (b.progress || 0) - (a.progress || 0));
        return this;
      },
      skip(n) {
        this._data = this._data.slice(n);
        return this;
      },
      limit(n) {
        this._data = this._data.slice(0, n);
        return this;
      },
      select() {
        return this;
      },
      then(resolve, reject) {
        return Promise.resolve(this._data).then(resolve, reject);
      }
    };
    return chain;
  },

  async findOne(query) {
    const goals = await this.find(query);
    const goal = goals[0];
    if (!goal) return null;
    return {
      ...goal,
      populate() { return this; },
      select() { return this; },
      async save() {
        const idx = memoryStore.goals.findIndex(g => toCleanId(g._id) === toCleanId(this._id));
        if (idx !== -1) memoryStore.goals[idx] = { ...this };
        return this;
      }
    };
  },

  async findById(id) {
    if (!id) return null;
    const cleanId = toCleanId(id);
    const goal = memoryStore.goals.find(g => toCleanId(g._id) === cleanId);
    if (!goal) return null;
    return {
      ...goal,
      populate() { return this; },
      select() { return this; },
      async save() {
        const idx = memoryStore.goals.findIndex(g => toCleanId(g._id) === toCleanId(this._id));
        if (idx !== -1) memoryStore.goals[idx] = { ...this };
        return this;
      }
    };
  },

  async countDocuments(query = {}) {
    const goals = await this.find(query);
    return goals.length;
  },

  async create(data) {
    const newGoal = {
      _id: `goal_${Date.now()}`,
      user: toCleanId(data.user),
      title: data.title,
      description: data.description || '',
      subject: data.subject,
      startDate: new Date(data.startDate || Date.now()),
      targetDate: new Date(data.targetDate),
      priority: data.priority || 'Medium',
      targetStudyHours: Number(data.targetStudyHours) || 10,
      currentStudyHours: 0,
      progress: 0,
      status: data.status || 'Not Started',
      color: data.color || '#6366f1',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    memoryStore.goals.push(newGoal);
    return {
      ...newGoal,
      populate() { return this; },
      select() { return this; },
      async save() {
        const idx = memoryStore.goals.findIndex(g => toCleanId(g._id) === toCleanId(this._id));
        if (idx !== -1) memoryStore.goals[idx] = { ...this };
        return this;
      }
    };
  },

  findOneAndUpdate(query, updateData) {
    const exec = async () => {
      const goal = await this.findOne(query);
      if (!goal) return null;
      const idx = memoryStore.goals.findIndex(g => toCleanId(g._id) === toCleanId(goal._id));
      if (idx !== -1) {
        memoryStore.goals[idx] = { ...memoryStore.goals[idx], ...updateData, updatedAt: new Date() };
        return {
          ...memoryStore.goals[idx],
          populate() { return this; },
          select() { return this; },
          async save() {
            const i = memoryStore.goals.findIndex(g => toCleanId(g._id) === toCleanId(this._id));
            if (i !== -1) memoryStore.goals[i] = { ...this };
            return this;
          }
        };
      }
      return null;
    };

    return {
      populate() { return this; },
      select() { return this; },
      then(resolve, reject) {
        return exec().then(resolve, reject);
      },
      catch(reject) {
        return exec().catch(reject);
      }
    };
  },

  async findOneAndDelete(query) {
    const goal = await this.findOne(query);
    if (!goal) return null;
    memoryStore.goals = memoryStore.goals.filter(g => toCleanId(g._id) !== toCleanId(goal._id));
    return goal;
  },

  async aggregate(pipeline) {
    const match = pipeline.find(p => p.$match)?.$match || {};
    let filtered = memoryStore.goals.filter(g => {
      if (match.user && toCleanId(g.user) !== toCleanId(match.user)) return false;
      return true;
    });

    const group = pipeline.find(p => p.$group)?.$group;
    if (group && group._id === '$subject') {
      const subjectMap = {};
      filtered.forEach(g => {
        if (!subjectMap[g.subject]) {
          subjectMap[g.subject] = {
            _id: g.subject,
            totalGoals: 0,
            completedGoals: 0,
            totalHours: 0,
            avgProgress: 0,
            totalProgress: 0
          };
        }
        subjectMap[g.subject].totalGoals += 1;
        if (g.status === 'Completed') subjectMap[g.subject].completedGoals += 1;
        subjectMap[g.subject].totalHours += (g.currentStudyHours || 0);
        subjectMap[g.subject].totalProgress += (g.progress || 0);
      });
      return Object.values(subjectMap).map(s => ({
        ...s,
        avgProgress: s.totalGoals > 0 ? s.totalProgress / s.totalGoals : 0
      }));
    }
    return [];
  }
};

// Mock Task Model
const MemoryTask = {
  find(query = {}) {
    let result = [...memoryStore.tasks];
    if (query._id) {
      const tid = toCleanId(query._id);
      result = result.filter(t => toCleanId(t._id) === tid);
    }
    if (query.user) {
      const targetUser = toCleanId(query.user);
      result = result.filter(t => toCleanId(t.user) === targetUser);
    }
    if (query.goal) {
      const targetGoalId = toCleanId(query.goal);
      result = result.filter(t => toCleanId(t.goal) === targetGoalId);
    }
    if (query.status) {
      if (query.status.$ne) {
        result = result.filter(t => t.status !== query.status.$ne);
      } else {
        result = result.filter(t => t.status === query.status);
      }
    }
    if (query.priority) {
      result = result.filter(t => t.priority === query.priority);
    }
    if (query.title && query.title.$regex) {
      const reg = new RegExp(query.title.$regex, query.title.$options || 'i');
      result = result.filter(t => reg.test(t.title));
    }
    if (query.scheduledDate) {
      if (query.scheduledDate.$gte) result = result.filter(t => new Date(t.scheduledDate) >= query.scheduledDate.$gte);
      if (query.scheduledDate.$lte) result = result.filter(t => new Date(t.scheduledDate) <= query.scheduledDate.$lte);
      if (query.scheduledDate.$lt) result = result.filter(t => new Date(t.scheduledDate) < query.scheduledDate.$lt);
    }
    if (query.completedAt) {
      if (query.completedAt.$gte) result = result.filter(t => t.completedAt && new Date(t.completedAt) >= query.completedAt.$gte);
      if (query.completedAt.$lt) result = result.filter(t => t.completedAt && new Date(t.completedAt) < query.completedAt.$lt);
    }

    const chain = {
      _data: result,
      populate() {
        // Resolve goal reference
        this._data = this._data.map(t => {
          let g = t.goal;
          if (g && typeof g === 'string') {
            g = memoryStore.goals.find(x => toCleanId(x._id) === toCleanId(g)) || null;
          }
          return { ...t, goal: g };
        });
        return this;
      },
      sort(sortOpt) {
        if (sortOpt.scheduledDate) this._data.sort((a,b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));
        else if (sortOpt.completedAt) this._data.sort((a,b) => (new Date(b.completedAt || 0)) - (new Date(a.completedAt || 0)));
        return this;
      },
      skip(n) {
        this._data = this._data.slice(n);
        return this;
      },
      limit(n) {
        this._data = this._data.slice(0, n);
        return this;
      },
      select() {
        return this;
      },
      then(resolve, reject) {
        return Promise.resolve(this._data).then(resolve, reject);
      }
    };
    return chain;
  },

  async findOne(query) {
    const tasks = await this.find(query).populate();
    const task = tasks[0];
    if (!task) return null;
    return {
      ...task,
      populate() { return this; },
      select() { return this; },
      async save() {
        const idx = memoryStore.tasks.findIndex(t => toCleanId(t._id) === toCleanId(this._id));
        if (idx !== -1) memoryStore.tasks[idx] = { ...this };
        return this;
      }
    };
  },

  async findById(id) {
    if (!id) return null;
    const tid = toCleanId(id);
    const task = memoryStore.tasks.find(t => toCleanId(t._id) === tid);
    if (!task) return null;
    let goalObj = task.goal;
    if (goalObj && typeof goalObj === 'string') {
      goalObj = memoryStore.goals.find(x => toCleanId(x._id) === goalObj) || null;
    }
    return {
      ...task,
      goal: goalObj,
      populate() { return this; },
      select() { return this; },
      async save() {
        const idx = memoryStore.tasks.findIndex(t => toCleanId(t._id) === toCleanId(this._id));
        if (idx !== -1) memoryStore.tasks[idx] = { ...this };
        return this;
      }
    };
  },

  async countDocuments(query = {}) {
    const tasks = await this.find(query);
    return tasks.length;
  },

  async create(data) {
    let goalObj = null;
    if (data.goal) {
      const cleanGid = toCleanId(data.goal);
      goalObj = memoryStore.goals.find(g => toCleanId(g._id) === cleanGid) || null;
    }

    const newTask = {
      _id: `task_${Date.now()}`,
      user: toCleanId(data.user),
      goal: goalObj,
      title: data.title,
      description: data.description || '',
      scheduledDate: new Date(data.scheduledDate || Date.now()),
      estimatedDuration: Number(data.estimatedDuration) || 30,
      actualTimeSpent: Number(data.actualTimeSpent) || 0,
      priority: data.priority || 'Medium',
      status: data.status || 'To Do',
      completedAt: data.status === 'Completed' ? new Date() : null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    memoryStore.tasks.push(newTask);
    return {
      ...newTask,
      populate() { return this; },
      select() { return this; },
      async save() {
        const idx = memoryStore.tasks.findIndex(t => toCleanId(t._id) === toCleanId(this._id));
        if (idx !== -1) memoryStore.tasks[idx] = { ...this };
        return this;
      }
    };
  },

  findOneAndUpdate(query, updateData) {
    const exec = async () => {
      const task = await this.findOne(query);
      if (!task) return null;
      const idx = memoryStore.tasks.findIndex(t => toCleanId(t._id) === toCleanId(task._id));
      let goalObj = task.goal;
      if (updateData.goal !== undefined) {
        const cleanGid = toCleanId(updateData.goal);
        goalObj = cleanGid ? (memoryStore.goals.find(g => toCleanId(g._id) === cleanGid) || null) : null;
      }

      memoryStore.tasks[idx] = {
        ...memoryStore.tasks[idx],
        ...updateData,
        goal: goalObj,
        updatedAt: new Date()
      };

      const resObj = {
        ...memoryStore.tasks[idx],
        populate() { return this; },
        select() { return this; },
        async save() {
          const i = memoryStore.tasks.findIndex(t => toCleanId(t._id) === toCleanId(this._id));
          if (i !== -1) memoryStore.tasks[i] = { ...this };
          return this;
        }
      };
      return resObj;
    };

    return {
      populate() { return this; },
      select() { return this; },
      then(resolve, reject) {
        return exec().then(resolve, reject);
      },
      catch(reject) {
        return exec().catch(reject);
      }
    };
  },

  async findOneAndDelete(query) {
    const task = await this.findOne(query);
    if (!task) return null;
    memoryStore.tasks = memoryStore.tasks.filter(t => toCleanId(t._id) !== toCleanId(task._id));
    return task;
  },

  async deleteMany(query) {
    if (query.goal) {
      const gid = toCleanId(query.goal);
      memoryStore.tasks = memoryStore.tasks.filter(t => toCleanId(t.goal) !== gid);
    }
    return { acknowledged: true };
  }
};

// Mock StudySession Model
const MemoryStudySession = {
  find(query = {}) {
    let result = [...memoryStore.sessions];
    if (query._id) {
      const sid = toCleanId(query._id);
      result = result.filter(s => toCleanId(s._id) === sid);
    }
    if (query.user) {
      const targetUser = toCleanId(query.user);
      result = result.filter(s => toCleanId(s.user) === targetUser);
    }
    if (query.goal) {
      const targetGoalId = toCleanId(query.goal);
      result = result.filter(s => toCleanId(s.goal) === targetGoalId);
    }
    if (query.date) {
      if (query.date.$gte) result = result.filter(s => new Date(s.date) >= query.date.$gte);
      if (query.date.$lte) result = result.filter(s => new Date(s.date) <= query.date.$lte);
    }

    const chain = {
      _data: result,
      populate() {
        this._data = this._data.map(s => {
          let g = s.goal;
          if (g && typeof g === 'string') {
            g = memoryStore.goals.find(x => toCleanId(x._id) === toCleanId(g)) || null;
          }
          let t = s.task;
          if (t && typeof t === 'string') {
            t = memoryStore.tasks.find(x => toCleanId(x._id) === toCleanId(t)) || null;
          }
          return { ...s, goal: g, task: t };
        });
        return this;
      },
      sort(sortOpt) {
        if (sortOpt.date) this._data.sort((a,b) => new Date(b.date) - new Date(a.date));
        return this;
      },
      skip(n) {
        this._data = this._data.slice(n);
        return this;
      },
      limit(n) {
        this._data = this._data.slice(0, n);
        return this;
      },
      select() {
        return this;
      },
      then(resolve, reject) {
        return Promise.resolve(this._data).then(resolve, reject);
      }
    };
    return chain;
  },

  async countDocuments(query = {}) {
    const sessions = await this.find(query);
    return sessions.length;
  },

  async create(data) {
    let goalObj = null;
    if (data.goal) {
      const cleanGid = toCleanId(data.goal);
      goalObj = memoryStore.goals.find(g => toCleanId(g._id) === cleanGid) || null;
    }
    let taskObj = null;
    if (data.task) {
      const cleanTid = toCleanId(data.task);
      taskObj = memoryStore.tasks.find(t => toCleanId(t._id) === cleanTid) || null;
    }

    const newSession = {
      _id: `session_${Date.now()}`,
      user: toCleanId(data.user),
      goal: goalObj,
      task: taskObj,
      duration: Number(data.duration) || 25,
      date: new Date(data.date || Date.now()),
      type: data.type || 'Pomodoro',
      notes: data.notes || '',
      createdAt: new Date()
    };
    memoryStore.sessions.unshift(newSession);

    return {
      ...newSession,
      populate() { return this; },
      select() { return this; },
      async save() {
        const idx = memoryStore.sessions.findIndex(s => toCleanId(s._id) === toCleanId(this._id));
        if (idx !== -1) memoryStore.sessions[idx] = { ...this };
        return this;
      }
    };
  },

  async findOneAndDelete(query) {
    const cleanId = toCleanId(query._id);
    const cleanUser = toCleanId(query.user);
    const session = memoryStore.sessions.find(s => toCleanId(s._id) === cleanId && toCleanId(s.user) === cleanUser);
    if (!session) return null;
    memoryStore.sessions = memoryStore.sessions.filter(s => toCleanId(s._id) !== cleanId);
    return session;
  },

  async aggregate(pipeline) {
    const match = pipeline.find(p => p.$match)?.$match || {};
    let filtered = memoryStore.sessions.filter(s => {
      if (match.user && toCleanId(s.user) !== toCleanId(match.user)) return false;
      if (match.date) {
        if (match.date.$gte && new Date(s.date) < match.date.$gte) return false;
        if (match.date.$lt && new Date(s.date) >= match.date.$lt) return false;
        if (match.date.$lte && new Date(s.date) > match.date.$lte) return false;
      }
      return true;
    });

    const group = pipeline.find(p => p.$group)?.$group;
    if (group && group._id === null) {
      const total = filtered.reduce((sum, s) => sum + (s.duration || 0), 0);
      return [{ _id: null, total, totalMinutes: total, count: filtered.length }];
    }
    return [];
  }
};

// Mock NotebookPage Model
const MemoryNotebookPage = {
  async findOne(query = {}) {
    const cleanUser = toCleanId(query.user);
    const page = memoryStore.notebookPages.find(p => {
      if (cleanUser && toCleanId(p.user) !== cleanUser) return false;
      if (query.date && p.date !== query.date) return false;
      return true;
    });

    if (!page) return null;

    return {
      ...page,
      async save() {
        const idx = memoryStore.notebookPages.findIndex(p => toCleanId(p._id) === toCleanId(this._id));
        if (idx !== -1) {
          memoryStore.notebookPages[idx] = { ...this, updatedAt: new Date() };
        }
        return this;
      }
    };
  },

  async create(data) {
    const newPage = {
      _id: `page_${Date.now()}`,
      user: toCleanId(data.user),
      date: data.date,
      dailyHeading: data.dailyHeading || "Today's Learning Plan",
      dailyMotivation: data.dailyMotivation || "",
      mainGoal: data.mainGoal || "",
      dailyGoals: data.dailyGoals || [],
      studyNotes: data.studyNotes || "",
      problemsFaced: data.problemsFaced || "",
      whatILearned: data.whatILearned || "",
      tomorrowPlan: data.tomorrowPlan || "",
      dailyReflection: data.dailyReflection || "",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    memoryStore.notebookPages.push(newPage);
    return {
      ...newPage,
      async save() {
        const idx = memoryStore.notebookPages.findIndex(p => toCleanId(p._id) === toCleanId(this._id));
        if (idx !== -1) {
          memoryStore.notebookPages[idx] = { ...this, updatedAt: new Date() };
        }
        return this;
      }
    };
  },

  async findOneAndUpdate(query, updateData, options = {}) {
    let page = await this.findOne(query);
    if (!page && options.upsert) {
      return await this.create({ ...query, ...updateData });
    }
    if (!page) return null;

    const idx = memoryStore.notebookPages.findIndex(p => toCleanId(p._id) === toCleanId(page._id));
    if (idx !== -1) {
      memoryStore.notebookPages[idx] = {
        ...memoryStore.notebookPages[idx],
        ...updateData,
        updatedAt: new Date()
      };
      return {
        ...memoryStore.notebookPages[idx],
        async save() {
          const i = memoryStore.notebookPages.findIndex(p => toCleanId(p._id) === toCleanId(this._id));
          if (i !== -1) memoryStore.notebookPages[i] = { ...this, updatedAt: new Date() };
          return this;
        }
      };
    }
    return page;
  }
};

module.exports = {
  toCleanId,
  MemoryUser,
  MemoryGoal,
  MemoryTask,
  MemoryStudySession,
  MemoryNotebookPage
};
