import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { PageLoader } from '../components/ui/LoadingSpinner';
import { 
  TrendingUp, 
  BarChart3, 
  PieChart as PieChartIcon, 
  Clock, 
  Flame, 
  CheckCircle2, 
  Calendar, 
  Sparkles, 
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  Target,
  Award,
  Zap,
  Filter,
  Download,
  ChevronRight,
  Check,
  RotateCcw,
  ShieldCheck
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import { useToast } from '../components/ui/Toast';
import ConfirmDialog from '../components/ui/ConfirmDialog';

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export default function ProgressAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('weekly'); // 'weekly' | 'monthly'
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const toast = useToast();

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await api.get('/progress');
      setData(res.data);
    } catch (err) {
      toast.error('Failed to load progress analytics');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const handleResetBaseline = async () => {
    setIsResetting(true);
    try {
      const res = await api.post('/progress/reset-baseline');
      toast.success(res.data.message || 'Zero baseline established! Now tracking your real consistency from Day 1.');
      setIsResetConfirmOpen(false);
      fetchAnalytics();
      window.dispatchEvent(new CustomEvent('skilltrack-data-updated'));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to establish zero baseline');
    } finally {
      setIsResetting(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();

    const handleUpdate = () => fetchAnalytics();
    window.addEventListener('skilltrack-data-updated', handleUpdate);
    return () => window.removeEventListener('skilltrack-data-updated', handleUpdate);
  }, [fetchAnalytics]);

  // Available subjects for filtering
  const availableSubjects = useMemo(() => {
    if (!data?.subjectBreakdown) return [];
    return data.subjectBreakdown.map(s => s._id);
  }, [data]);

  // Filtered Subject breakdown
  const subjectChartData = useMemo(() => {
    if (!data?.subjectBreakdown) return [];
    return data.subjectBreakdown.map((s, idx) => ({
      name: s._id,
      hours: parseFloat((s.totalHours || 0).toFixed(1)),
      progress: Math.round(s.avgProgress || 0),
      color: PIE_COLORS[idx % PIE_COLORS.length]
    }));
  }, [data]);

  // Filtered Goals
  const filteredGoals = useMemo(() => {
    if (!data?.allGoals) return [];
    if (selectedSubject === 'all') return data.allGoals;
    return data.allGoals.filter(g => g.subject?.toLowerCase() === selectedSubject.toLowerCase());
  }, [data, selectedSubject]);

  // Planned vs Actual hours for Bar Chart (filtered if subject selected)
  const plannedVsActualData = useMemo(() => {
    const list = filteredGoals.length > 0 ? filteredGoals : (data?.plannedVsActual || []);
    return list.map(g => ({
      name: g.title.length > 16 ? g.title.substring(0, 16) + '...' : g.title,
      Planned: g.targetStudyHours || 0,
      Actual: g.currentStudyHours || 0,
      subject: g.subject
    }));
  }, [filteredGoals, data]);

  // Study Hours Trend Data (Weekly / Monthly)
  const studyHoursData = useMemo(() => {
    if (timeframe === 'weekly') {
      return (data?.weeklyStudyHours || []).map(w => ({
        label: w.label,
        hours: w.hours,
        displayLabel: w.label
      }));
    }
    return (data?.monthlyStudyHours || []).map(m => ({
      label: m.month,
      hours: m.hours,
      displayLabel: m.month
    }));
  }, [data, timeframe]);

  // Day of Week Distribution
  const dayDistributionData = useMemo(() => {
    return data?.dayDistribution || [];
  }, [data]);

  // Highest study day
  const peakDay = useMemo(() => {
    if (!data?.dayDistribution || data.dayDistribution.length === 0) return null;
    return [...data.dayDistribution].sort((a, b) => (b.minutes || 0) - (a.minutes || 0))[0];
  }, [data]);

  // Export Progress Report JSON
  const handleExportReport = () => {
    if (!data) return;
    const reportPayload = {
      app: 'Marcus & Marco — Learning & Progress Tracker',
      student: 'Shivam',
      exportDate: new Date().toISOString(),
      productivityScore: data.productivityScore,
      streak: data.streak,
      totalStudyMinutes: data.totalLifetimeMinutes,
      totalStudyHours: parseFloat(((data.totalLifetimeMinutes || 0) / 60).toFixed(1)),
      taskStats: data.taskStats,
      goalsCompletion: data.goalCompletion,
      subjectBreakdown: data.subjectBreakdown,
      insights: data.insights
    };

    const blob = new Blob([JSON.stringify(reportPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Marcus_Marco_Progress_Report_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Progress report exported successfully!');
  };

  if (loading) return <PageLoader />;

  const weekDiffStudy = (data?.weekComparison?.thisWeek?.studyMinutes || 0) - (data?.weekComparison?.lastWeek?.studyMinutes || 0);
  const weekDiffTasks = (data?.weekComparison?.thisWeek?.tasks || 0) - (data?.weekComparison?.lastWeek?.tasks || 0);
  const totalLifetimeHours = parseFloat(((data?.totalLifetimeMinutes || 0) / 60).toFixed(1));
  const activeDaysInQuarter = data?.heatmapData ? data.heatmapData.filter(d => (d.minutes || 0) > 0).length : 0;
  const heatmapConsistencyRate = data?.heatmapData?.length > 0 
    ? Math.round((activeDaysInQuarter / data.heatmapData.length) * 100) 
    : 0;

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto pb-16">
      
      {/* 1. PAGE HEADER & INTERACTIVE CONTROLS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-card p-6 border-brand-500/20 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-brand-600 dark:text-brand-400" />
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-surface-900 dark:text-surface-100">
              Progress & Learning Analytics
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-surface-500 mt-1">
            Data-driven intelligence for Marcus & Marco • Measure study momentum, consistency, and mastery velocity
          </p>
        </div>

        {/* Action Buttons: Subject Filter, Zero Baseline & Export Report */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Subject Filter Dropdown */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-xs font-semibold">
            <Filter className="w-3.5 h-3.5 text-surface-500" />
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="bg-transparent text-surface-800 dark:text-surface-200 focus:outline-none cursor-pointer"
            >
              <option value="all">All Subjects</option>
              {availableSubjects.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Start Fresh (Zero Baseline) Button */}
          <button
            onClick={() => setIsResetConfirmOpen(true)}
            className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10 shadow-xs"
            title="Start from 0% to trace genuine real-life consistency"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Start Fresh (Zero Baseline)</span>
          </button>

          {/* Export Report Button */}
          <button
            onClick={handleExportReport}
            className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 shadow-xs"
            title="Export full analytics report JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* 2. TOP MOMENTUM & CONSISTENCY KPI CARDS (6 Real-Life Scorecards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5">
        
        {/* Card 1: Productivity Momentum Score */}
        <div className="stat-card relative overflow-hidden bg-gradient-to-br from-brand-500/10 via-white to-transparent dark:from-brand-950/30 dark:via-surface-900 dark:to-transparent border-brand-500/30">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-brand-700 dark:text-brand-300 uppercase tracking-wider">
              Momentum
            </span>
            <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
          </div>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="text-3xl font-extrabold text-surface-900 dark:text-surface-100">
              {data?.productivityScore ?? 0}
            </span>
            <span className="text-xs font-semibold text-surface-400">/ 100</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-surface-200 dark:bg-surface-700 overflow-hidden mt-2">
            <div 
              className="h-full bg-gradient-to-r from-amber-500 to-brand-500 rounded-full"
              style={{ width: `${Math.min(100, data?.productivityScore || 0)}%` }}
            />
          </div>
          <span className="text-[10px] text-surface-500 mt-1.5">
            {data?.productivityScore >= 80 ? '🔥 High velocity flow' : (data?.productivityScore >= 40 ? '⚡ Steady momentum' : '🌱 Starting baseline')}
          </span>
        </div>

        {/* Card 2: Real-Life Weekly Consistency */}
        <div className="stat-card bg-gradient-to-br from-emerald-500/10 via-white to-transparent dark:from-emerald-950/20 dark:via-surface-900 dark:to-transparent border-emerald-500/30">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
              Consistency
            </span>
            <Award className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {data?.consistencyScore ?? 0}%
            </span>
            <span className="text-xs font-semibold text-surface-500">
              {data?.activeDaysThisWeek ?? 0}/7 days
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-surface-200 dark:bg-surface-700 overflow-hidden mt-2">
            <div 
              className="h-full bg-emerald-500 rounded-full"
              style={{ width: `${Math.min(100, data?.consistencyScore || 0)}%` }}
            />
          </div>
          <span className="text-[10px] text-surface-500 mt-1.5">
            {data?.consistencyScore >= 70 ? '🌟 Highly consistent' : '📈 Daily effort builds routine'}
          </span>
        </div>

        {/* Card 3: Active & Longest Streak */}
        <div className="stat-card bg-gradient-to-br from-amber-500/10 via-white to-transparent dark:from-amber-950/20 dark:via-surface-900 dark:to-transparent border-amber-500/30">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
              Study Streak
            </span>
            <Flame className="w-4 h-4 text-amber-500 fill-amber-500 animate-pulse" />
          </div>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">
              {data?.streak?.current || 0}
            </span>
            <span className="text-xs font-semibold text-surface-500">days active</span>
          </div>
          <span className="text-[10px] text-surface-500 mt-2">
            Best streak: <strong className="text-surface-700 dark:text-surface-300">{data?.streak?.longest || 0} days</strong>
          </span>
        </div>

        {/* Card 4: Total Focus Study Hours */}
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-surface-500 uppercase tracking-wider">
              Focus Hours
            </span>
            <Clock className="w-4 h-4 text-brand-600 dark:text-brand-400" />
          </div>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="text-3xl font-extrabold text-surface-900 dark:text-surface-100">
              {totalLifetimeHours}
            </span>
            <span className="text-xs font-semibold text-surface-500">hrs</span>
          </div>
          <span className="text-[10px] text-surface-500 mt-2">
            This week: <strong className="text-brand-600 dark:text-brand-400">{((data?.weekComparison?.thisWeek?.studyMinutes || 0) / 60).toFixed(1)} hrs</strong>
          </span>
        </div>

        {/* Card 5: Task Velocity */}
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-surface-500 uppercase tracking-wider">
              Task Velocity
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="text-3xl font-extrabold text-surface-900 dark:text-surface-100">
              {data?.taskStats?.completed || 0}
            </span>
            <div className={`flex items-center text-xs font-semibold ${weekDiffTasks >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {weekDiffTasks >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              <span>{Math.abs(weekDiffTasks)} this wk</span>
            </div>
          </div>
          <span className="text-[10px] text-surface-500 mt-2">
            {data?.taskStats?.pending || 0} tasks pending
          </span>
        </div>

        {/* Card 6: Goals Completed Ratio */}
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-surface-500 uppercase tracking-wider">
              Goal Progress
            </span>
            <Target className="w-4 h-4 text-purple-500" />
          </div>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="text-3xl font-extrabold text-purple-600 dark:text-purple-400">
              {data?.goalCompletion?.completed || 0}
            </span>
            <span className="text-xs font-semibold text-surface-500">/ {data?.goalCompletion?.total || 0} goals</span>
          </div>
          <span className="text-[10px] text-surface-500 mt-2">
            Completion: <strong className="text-surface-700 dark:text-surface-300">
              {data?.goalCompletion?.total > 0 ? Math.round((data.goalCompletion.completed / data.goalCompletion.total) * 100) : 0}%
            </strong>
          </span>
        </div>
      </div>

      {/* 3. DYNAMIC INTELLIGENCE BANNER: Marcus & Marco Personalized Insights */}
      {data?.insights && data.insights.length > 0 && (
        <div className="glass-card p-5 bg-gradient-to-r from-brand-500/10 via-indigo-500/5 to-purple-500/5 border-brand-500/20">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-600 dark:text-brand-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-brand-700 dark:text-brand-300">
                Marcus & Marco Growth Engine • Personalized Study Feedback
              </h3>
            </div>
            {peakDay && (
              <span className="text-[11px] font-semibold text-surface-500 hidden sm:inline">
                Peak study day: <span className="text-brand-600 dark:text-brand-400 font-bold">{peakDay.day}</span> ({peakDay.hours} hrs)
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.insights.map((insight, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-white/80 dark:bg-surface-800/80 border border-surface-200/60 dark:border-surface-700/60 flex items-start gap-2.5 text-xs font-medium text-surface-800 dark:text-surface-200 shadow-xs"
              >
                <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                  insight.type === 'success' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                  insight.type === 'warning' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                  'bg-brand-500/10 text-brand-600 dark:text-brand-400'
                }`}>
                  <Info className="w-3.5 h-3.5" />
                </div>
                <span>{insight.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. PRIMARY CHARTS ROW: Focus Momentum Area Chart + Day-of-Week Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left (2 Cols): Study Hours Momentum Area Chart */}
        <div className="lg:col-span-2 glass-card p-6 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-base font-bold text-surface-900 dark:text-surface-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                <span>Study Hours Momentum & Trajectory</span>
              </h3>
              <p className="text-xs text-surface-500 mt-0.5">
                Total focused learning hours over time with smooth area velocity
              </p>
            </div>

            <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-100 dark:bg-surface-800 text-xs self-start sm:self-auto">
              <button
                onClick={() => setTimeframe('weekly')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  timeframe === 'weekly' ? 'bg-brand-600 text-white shadow-xs' : 'text-surface-500 hover:text-surface-800'
                }`}
              >
                Last 12 Weeks
              </button>
              <button
                onClick={() => setTimeframe('monthly')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  timeframe === 'monthly' ? 'bg-brand-600 text-white shadow-xs' : 'text-surface-500 hover:text-surface-800'
                }`}
              >
                Last 6 Months
              </button>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={studyHoursData}>
                <defs>
                  <linearGradient id="studyGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(156, 163, 175, 0.2)" />
                <XAxis dataKey="displayLabel" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip
                  formatter={(val) => [`${val} hrs`, 'Study Hours']}
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    borderRadius: '0.75rem',
                    border: 'none',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="hours" 
                  stroke="#6366f1" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#studyGradient)" 
                  name="Study Hours"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right (1 Col): Day-of-Week Focus Pattern */}
        <div className="glass-card p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-surface-900 dark:text-surface-100 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-500" />
              <span>Weekly Rhythm</span>
            </h3>
            <p className="text-xs text-surface-500 mt-0.5">
              Study hours logged by day of the week
            </p>
          </div>

          <div className="h-64 w-full mt-2">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={dayDistributionData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(156, 163, 175, 0.2)" />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip
                  formatter={(val, name) => [`${val} hrs`, 'Hours Logged']}
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    borderRadius: '0.75rem',
                    border: 'none',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
                <Bar 
                  dataKey="hours" 
                  fill="#10b981" 
                  radius={[4, 4, 0, 0]} 
                  name="Hours"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 5. SECOND CHARTS ROW: Subject Mastery Donut & Planned vs Actual Target Hours */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Subject Mastery Donut Chart + List */}
        <div className="glass-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-surface-900 dark:text-surface-100 flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>Subject Focus & Time Allocation</span>
                </h3>
                <p className="text-xs text-surface-500 mt-0.5">
                  Breakdown of hours invested by subject domain
                </p>
              </div>
            </div>

            {subjectChartData.length === 0 ? (
              <div className="py-12 text-center text-xs text-surface-500">
                No subjects registered yet. Create learning goals to see domain breakdowns.
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                {/* Donut Chart */}
                <div className="w-48 h-48 shrink-0">
                  <ResponsiveContainer width="100%" height={190}>
                    <PieChart>
                      <Pie
                        data={subjectChartData}
                        dataKey="hours"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={3}
                      >
                        {subjectChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val) => [`${val} hrs`, 'Logged']}
                        contentStyle={{
                          backgroundColor: 'rgba(15, 23, 42, 0.95)',
                          borderRadius: '0.75rem',
                          border: 'none',
                          color: '#fff',
                          fontSize: '12px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Ranked Subjects List */}
                <div className="flex-1 space-y-2 w-full">
                  {subjectChartData.map((subj, idx) => (
                    <div 
                      key={idx}
                      className="p-2 rounded-xl bg-surface-100/60 dark:bg-surface-800/50 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: subj.color }} />
                        <span className="font-semibold text-surface-800 dark:text-surface-200 truncate">
                          {subj.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-bold text-surface-900 dark:text-surface-100">
                          {subj.hours} hrs
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-200 dark:bg-surface-700 text-surface-600 dark:text-surface-300 font-semibold">
                          {subj.progress}% avg
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Planned vs Actual Study Hours */}
        <div className="glass-card p-6 flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-base font-bold text-surface-900 dark:text-surface-100 flex items-center gap-2">
              <Target className="w-4 h-4 text-amber-500" />
              <span>Target vs Actual Study Hours per Goal</span>
            </h3>
            <p className="text-xs text-surface-500 mt-0.5">
              Compare target hours planned against completed study time
            </p>
          </div>

          {plannedVsActualData.length === 0 ? (
            <div className="py-12 text-center text-xs text-surface-500">
              No goal data available.
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={plannedVsActualData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(156, 163, 175, 0.2)" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      borderRadius: '0.75rem',
                      border: 'none',
                      color: '#fff',
                      fontSize: '12px'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar dataKey="Planned" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Actual" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* 6. DAILY TASK COMPLETION BAR (Last 30 Days) */}
      <div className="glass-card p-6">
        <div className="mb-4">
          <h3 className="text-base font-bold text-surface-900 dark:text-surface-100 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Daily Task Completion Velocity (Last 30 Days)</span>
          </h3>
          <p className="text-xs text-surface-500 mt-0.5">
            Volume of daily study milestones checked off day-by-day
          </p>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data?.dailyTaskCompletion || []}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(156, 163, 175, 0.2)" />
              <XAxis dataKey="label" stroke="#94a3b8" fontSize={10} interval={4} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(15, 23, 42, 0.95)',
                  borderRadius: '0.75rem',
                  border: 'none',
                  color: '#fff',
                  fontSize: '12px'
                }}
              />
              <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} name="Tasks Completed" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 7. GITHUB-STYLE 90-DAY ACTIVITY HEATMAP */}
      <div className="glass-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-surface-900 dark:text-surface-100 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-500" />
              <span>90-Day Learning Consistency Heatmap</span>
            </h3>
            <p className="text-xs text-surface-500 mt-0.5">
              Your daily study activity footprint over the last quarter
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs font-semibold">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
              {activeDaysInQuarter} of 90 Days Active ({heatmapConsistencyRate}%)
            </span>
          </div>
        </div>

        <div className="overflow-x-auto pb-2">
          <div className="flex gap-1.5 min-w-[700px]">
            {data?.heatmapData?.map((day, idx) => {
              const minutes = day.minutes || 0;
              let bg = 'bg-surface-200 dark:bg-surface-800';
              if (minutes >= 120) bg = 'bg-emerald-600 text-white';
              else if (minutes >= 60) bg = 'bg-emerald-500 text-white';
              else if (minutes >= 30) bg = 'bg-emerald-400 text-white';
              else if (minutes > 0) bg = 'bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200';

              return (
                <div
                  key={idx}
                  className={`w-3.5 h-3.5 rounded-sm transition-transform hover:scale-125 cursor-pointer ${bg}`}
                  title={`${day.date}: ${minutes} mins studied`}
                />
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-4 text-[11px] text-surface-500">
            <span>90 days ago</span>
            <div className="flex items-center gap-2">
              <span>Less</span>
              <div className="w-3 h-3 rounded-sm bg-surface-200 dark:bg-surface-800" title="0 mins" />
              <div className="w-3 h-3 rounded-sm bg-emerald-200 dark:bg-emerald-900" title="1-29 mins" />
              <div className="w-3 h-3 rounded-sm bg-emerald-400" title="30-59 mins" />
              <div className="w-3 h-3 rounded-sm bg-emerald-500" title="60-119 mins" />
              <div className="w-3 h-3 rounded-sm bg-emerald-600" title="120+ mins" />
              <span>More</span>
            </div>
            <span>Today</span>
          </div>
        </div>
      </div>

      {/* 8. ACTIVE GOALS MASTERY MATRIX (Detailed Target Progress) */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-surface-200 dark:border-surface-800">
          <div>
            <h3 className="text-base font-bold text-surface-900 dark:text-surface-100 flex items-center gap-2">
              <Award className="w-4 h-4 text-brand-600 dark:text-brand-400" />
              <span>Active Goals Mastery Matrix</span>
            </h3>
            <p className="text-xs text-surface-500 mt-0.5">
              Real-time completion percentage, target study hours, and milestone status for each learning track
            </p>
          </div>

          <Link
            to="/goals"
            className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 self-start sm:self-auto"
          >
            <span>Manage All Goals</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {filteredGoals.length === 0 ? (
          <div className="py-8 text-center text-xs text-surface-500">
            No goals found for selected subject.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredGoals.map((goal) => {
              const targetDate = new Date(goal.targetDate);
              const daysRemaining = Math.ceil((targetDate - new Date()) / (1000 * 60 * 60 * 24));
              const isOverdue = daysRemaining < 0 && goal.status !== 'Completed';

              return (
                <div
                  key={goal._id}
                  className="p-4 rounded-2xl bg-white dark:bg-surface-900 border border-surface-200/80 dark:border-surface-800 shadow-xs hover:border-brand-400 transition-all flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span 
                        className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                        style={{
                          backgroundColor: `${goal.color || '#6366f1'}15`,
                          color: goal.color || '#6366f1'
                        }}
                      >
                        {goal.subject}
                      </span>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        goal.status === 'Completed' ? 'badge-success' :
                        goal.status === 'In Progress' ? 'badge-info' : 'badge-neutral'
                      }`}>
                        {goal.status}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-surface-900 dark:text-surface-100 mt-2 line-clamp-1">
                      {goal.title}
                    </h4>

                    {goal.description && (
                      <p className="text-xs text-surface-500 mt-1 line-clamp-2">
                        {goal.description}
                      </p>
                    )}
                  </div>

                  <div>
                    {/* Progress Bar & Hours */}
                    <div className="flex items-center justify-between text-xs font-semibold text-surface-600 dark:text-surface-400 mb-1">
                      <span>{goal.currentStudyHours || 0} / {goal.targetStudyHours} hrs</span>
                      <span className="font-bold text-surface-900 dark:text-surface-100">
                        {goal.progress || 0}%
                      </span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-surface-200 dark:bg-surface-700 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${goal.progress || 0}%`,
                          backgroundColor: goal.color || '#6366f1'
                        }}
                      />
                    </div>

                    {/* Deadline Footer */}
                    <div className="flex items-center justify-between text-[11px] text-surface-500 mt-3 pt-2 border-t border-surface-100 dark:border-surface-800">
                      <span className={isOverdue ? 'text-red-500 font-bold' : ''}>
                        {goal.status === 'Completed' ? 'Completed 🎯' :
                         isOverdue ? `${Math.abs(daysRemaining)}d overdue` :
                         `${daysRemaining}d remaining`}
                      </span>

                      <Link
                        to={`/goals/${goal._id}`}
                        className="font-semibold text-brand-600 dark:text-brand-400 hover:underline"
                      >
                        View Goal →
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 8. CONFIRM ZERO BASELINE DIALOG */}
      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={handleResetBaseline}
        title="Start Fresh (Zero Baseline)"
        message="This will clear past mock study sessions and reset all learning goals to 0% progress and 0.0 hours. Today's and upcoming tasks will be set to 'To Do'. This allows Marcus & Marco to track your 100% genuine real-life study effort and consistency starting from Day 1. Are you sure you want to proceed?"
        confirmText={isResetting ? "Establishing Baseline..." : "Reset to Zero Baseline"}
        variant="danger"
      />

    </div>
  );
}
