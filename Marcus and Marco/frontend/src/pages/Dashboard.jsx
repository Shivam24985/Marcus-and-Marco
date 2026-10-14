import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { PageLoader } from '../components/ui/LoadingSpinner';
import { 
  Target, 
  CheckCircle2, 
  Clock, 
  Flame, 
  Calendar, 
  TrendingUp, 
  AlertTriangle, 
  Plus, 
  ArrowRight, 
  Sparkles, 
  BarChart3,
  RotateCw
} from 'lucide-react';
import {
  ResponsiveContainer,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Line,
  ComposedChart
} from 'recharts';
import GoalModal from '../components/ui/GoalModal';
import TaskModal from '../components/ui/TaskModal';
import { useToast } from '../components/ui/Toast';

export default function Dashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      setFetchError(false);
      const res = await api.get('/dashboard');
      setData(res.data);
    } catch (err) {
      console.error('Error fetching dashboard', err);
      setFetchError(true);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDashboardData();

    const handleUpdate = () => fetchDashboardData();
    window.addEventListener('skilltrack-data-updated', handleUpdate);
    return () => window.removeEventListener('skilltrack-data-updated', handleUpdate);
  }, [fetchDashboardData]);

  if (loading) return <PageLoader />;

  if (fetchError || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-3">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-surface-900 dark:text-surface-100">
          Unable to Load Dashboard
        </h3>
        <p className="text-xs text-surface-500 max-w-sm mt-1 mb-4">
          There was an issue retrieving your study metrics. Click retry to refresh.
        </p>
        <button
          onClick={() => {
            setLoading(true);
            fetchDashboardData();
          }}
          className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  const formatHours = (mins) => {
    const hrs = (mins || 0) / 60;
    return hrs >= 10 ? Math.round(hrs) : hrs.toFixed(1);
  };

  const safeFormatDate = (dateVal) => {
    try {
      if (!dateVal) return '';
      const d = new Date(dateVal);
      return isNaN(d.getTime()) ? '' : d.toLocaleDateString();
    } catch {
      return '';
    }
  };

  const safeFormatTime = (dateVal) => {
    try {
      if (!dateVal) return 'Today';
      const d = new Date(dateVal);
      return isNaN(d.getTime()) ? 'Today' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Today';
    }
  };

  const weeklyChartData = data?.weeklyData?.map(d => ({
    name: d.dayName || '',
    date: d.date || '',
    Tasks: Number(d.tasksCompleted) || 0,
    StudyHours: parseFloat(((Number(d.studyMinutes) || 0) / 60).toFixed(1))
  })) || [];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Welcome Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 glass-card bg-gradient-to-r from-brand-500/10 via-indigo-500/5 to-transparent border-brand-500/20">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-surface-900 dark:text-surface-100">
              Welcome back, {user?.name || 'Student'}! 👋
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-surface-600 dark:text-surface-400">
            {data.overdueTasks > 0 ? (
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                You have {data.overdueTasks} overdue {data.overdueTasks === 1 ? 'task' : 'tasks'}. Let's get focused today!
              </span>
            ) : (
              <span>You're on track! Ready to make progress on your learning goals?</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsGoalModalOpen(true)}
            className="btn-secondary text-xs sm:text-sm py-2 px-3 sm:px-4"
          >
            <Plus className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            <span>New Goal</span>
          </button>
          <button
            onClick={() => setIsTaskModalOpen(true)}
            className="btn-primary text-xs sm:text-sm py-2 px-3 sm:px-4"
          >
            <Plus className="w-4 h-4" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Overview Stat Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Active Goals */}
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Active Goals</span>
            <div className="p-2 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-bold text-surface-900 dark:text-surface-100 mt-2">
            {data.activeGoals ?? 0}
          </span>
          <span className="text-[11px] text-surface-500">
            {data.totalGoals ?? 0} total enrolled
          </span>
        </div>

        {/* Tasks Completed Today */}
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Today's Tasks</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-bold text-surface-900 dark:text-surface-100 mt-2">
            {data.todayCompletedTasks ?? 0} <span className="text-base text-surface-400 font-normal">/ {data.todayTasks ?? 0}</span>
          </span>
          <span className="text-[11px] text-surface-500">
            {data.todayTasks > 0 ? `${Math.round(((data.todayCompletedTasks || 0) / data.todayTasks) * 100)}% done today` : 'No tasks scheduled'}
          </span>
        </div>

        {/* Study Hours This Week */}
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Week Study</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-bold text-surface-900 dark:text-surface-100 mt-2">
            {formatHours(data.weekStudyMinutes || 0)} <span className="text-sm font-normal text-surface-500">hrs</span>
          </span>
          <span className="text-[11px] text-surface-500">
            Target: ~{(user?.dailyStudyTarget || 3) * 7}h/week
          </span>
        </div>

        {/* Task Completion Rate */}
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Overall Rate</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-bold text-surface-900 dark:text-surface-100 mt-2">
            {data.completionPercentage ?? 0}%
          </span>
          <span className="text-[11px] text-surface-500">
            {data.completedTasks ?? 0} of {data.totalTasks ?? 0} tasks
          </span>
        </div>

        {/* Learning Streak */}
        <div className="stat-card col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Streak</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Flame className="w-4 h-4 fill-amber-500" />
            </div>
          </div>
          <span className="text-2xl font-bold text-surface-900 dark:text-surface-100 mt-2">
            {user?.streak?.current ?? 0} <span className="text-sm font-normal text-surface-500">days</span>
          </span>
          <span className="text-[11px] text-surface-500">
            Best streak: {user?.streak?.longest ?? 0} days
          </span>
        </div>
      </div>

      {/* Main Charts and Action Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Activity Chart (2 columns) */}
        <div className="lg:col-span-2 glass-card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-surface-900 dark:text-surface-100 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-brand-600" />
                <span>Weekly Study & Task Momentum</span>
              </h2>
              <p className="text-xs text-surface-500 mt-0.5">
                Daily task completions and study hours over the past 7 days
              </p>
            </div>
            <Link
              to="/progress"
              className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
            >
              <span>Full Analytics</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="w-full pt-2 min-h-[240px]">
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={weeklyChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(156, 163, 175, 0.2)" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis yAxisId="left" stroke="#94a3b8" fontSize={12} tickLine={false} allowDecimals={false} domain={[0, 'auto']} />
                <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={12} tickLine={false} domain={[0, 'auto']} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    borderRadius: '0.75rem',
                    border: 'none',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
                <Bar yAxisId="left" dataKey="Tasks" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={24} name="Tasks Completed" />
                <Line yAxisId="right" type="monotone" dataKey="StudyHours" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} name="Study Hours" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Launch Study Timer card */}
        <div className="glass-card p-6 flex flex-col justify-between bg-gradient-to-br from-brand-600/10 via-purple-600/5 to-transparent border-brand-500/30">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="badge-info">Focus Hub</span>
              <Clock className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            </div>
            <h3 className="text-lg font-bold text-surface-900 dark:text-surface-100">
              Ready for a Study Sprint?
            </h3>
            <p className="text-xs text-surface-600 dark:text-surface-400 mt-2 leading-relaxed">
              Use the built-in Pomodoro timer to track deep work sessions. Completed study sessions automatically contribute to your goal study hours and analytics.
            </p>
          </div>

          <div className="mt-6 pt-6 border-t border-surface-200/60 dark:border-surface-800/60 flex flex-col gap-2.5">
            <Link
              to="/timer"
              className="btn-primary py-2.5 text-xs font-semibold w-full"
            >
              <Clock className="w-4 h-4" />
              <span>Launch Study Timer</span>
            </Link>
            <Link
              to="/tasks"
              className="btn-secondary py-2.5 text-xs font-semibold w-full"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>View Today's Tasks</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Upcoming Deadlines & Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Deadlines */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-surface-900 dark:text-surface-100 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand-600" />
              <span>Upcoming Goal Deadlines</span>
            </h3>
            <Link to="/goals" className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline">
              View All
            </Link>
          </div>

          {(!data.upcomingDeadlines || data.upcomingDeadlines.length === 0) ? (
            <div className="py-8 text-center text-xs text-surface-500">
              No upcoming goal deadlines in the next 7 days.
            </div>
          ) : (
            <div className="space-y-3">
              {data.upcomingDeadlines.map((goal) => {
                const targetDateObj = goal.targetDate ? new Date(goal.targetDate) : null;
                const isOverdue = targetDateObj && targetDateObj < new Date();
                return (
                  <div
                    key={goal._id}
                    className="flex items-center justify-between p-3 rounded-xl bg-surface-50 dark:bg-surface-800/60 border border-surface-200/60 dark:border-surface-700/60"
                  >
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-surface-900 dark:text-surface-100">
                        {goal.title}
                      </span>
                      <span className="text-[11px] text-surface-500">
                        {goal.subject} • Due {safeFormatDate(goal.targetDate)}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-xs font-bold text-surface-800 dark:text-surface-200">
                          {goal.progress || 0}%
                        </span>
                      </div>
                      <div className="w-16 h-2 rounded-full bg-surface-200 dark:bg-surface-700 overflow-hidden">
                        <div
                          className="h-full bg-brand-500 rounded-full"
                          style={{ width: `${goal.progress || 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Completed Activities */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-surface-900 dark:text-surface-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              <span>Recent Completed Tasks</span>
            </h3>
            <Link to="/tasks" className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline">
              Task Center
            </Link>
          </div>

          {(!data.recentActivities || data.recentActivities.length === 0) ? (
            <div className="py-8 text-center text-xs text-surface-500">
              No tasks completed yet. Complete a task to see your momentum here!
            </div>
          ) : (
            <div className="space-y-2.5">
              {data.recentActivities.map((task) => (
                <div
                  key={task._id}
                  className="flex items-center justify-between p-3 rounded-xl bg-surface-50 dark:bg-surface-800/60 border border-surface-200/60 dark:border-surface-700/60"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-surface-900 dark:text-surface-100">
                        {task.title}
                      </p>
                      {task.goal && (
                        <p className="text-[10px] text-surface-500">
                          {task.goal.title} ({task.goal.subject})
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-[11px] text-surface-400 shrink-0">
                    {safeFormatTime(task.completedAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals for dashboard quick adds */}
      <GoalModal
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
        onSave={async (values) => {
          await api.post('/goals', values);
          toast.success('Goal created!');
          fetchDashboardData();
        }}
      />

      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSave={async (values) => {
          await api.post('/tasks', values);
          toast.success('Task created!');
          fetchDashboardData();
        }}
      />
    </div>
  );
}
