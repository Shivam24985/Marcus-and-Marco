import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { 
  BookMarked, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  CheckCircle2, 
  Circle, 
  Clock, 
  Sparkles, 
  Target, 
  Check, 
  RotateCcw, 
  ArrowUp, 
  ArrowDown, 
  AlertCircle, 
  Lightbulb, 
  PenTool, 
  CheckSquare,
  Timer,
  Layers,
  HelpCircle,
  TrendingUp,
  X
} from 'lucide-react';
import TaskModal from '../components/ui/TaskModal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import { PageLoader } from '../components/ui/LoadingSpinner';
import { useToast } from '../components/ui/Toast';

// Helper to format local date string YYYY-MM-DD
const getLocalDateString = (d = new Date()) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export default function DailyNotebook() {
  const toast = useToast();

  // Navigation state
  const [selectedDate, setSelectedDate] = useState(() => getLocalDateString());
  const [loading, setLoading] = useState(true);

  // Notebook Page Data
  const [pageData, setPageData] = useState({
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

  // Scheduled tasks for this date
  const [tasks, setTasks] = useState([]);
  const [summary, setSummary] = useState({
    totalTasksPlanned: 0,
    tasksCompleted: 0,
    tasksRemaining: 0,
    totalPlannedStudyTime: 0,
    actualStudyTime: 0,
    totalDailyGoals: 0,
    dailyGoalsCompleted: 0,
    taskCompletionPercentage: 0,
    goalCompletionPercentage: 0,
    overallPercentage: 0
  });

  // Available goals list for quick-add dropdown
  const [goalsList, setGoalsList] = useState([]);

  // Save state: 'saved' | 'saving' | 'unsaved' | 'error'
  const [saveStatus, setSaveStatus] = useState('saved');
  const [lastSavedAt, setLastSavedAt] = useState(null);

  // Quick Task Add State
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [quickTaskPriority, setQuickTaskPriority] = useState('Medium');
  const [quickTaskDuration, setQuickTaskDuration] = useState(30);
  const [quickTaskGoalId, setQuickTaskGoalId] = useState('');
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

  // Task Modal state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [deleteTaskId, setDeleteTaskId] = useState(null);

  // Daily Goal Modal / Creator state
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editingDailyGoal, setEditingDailyGoal] = useState(null);
  const [dailyGoalForm, setDailyGoalForm] = useState({
    title: '',
    subject: '',
    targetQuantity: 60,
    unit: 'mins',
    notes: ''
  });

  // Active Notebook Section Tab
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'notes' | 'problems' | 'learned' | 'tomorrow' | 'reflection'

  // Debounce ref for autosave
  const autosaveTimerRef = useRef(null);
  const isInitialMount = useRef(true);
  const isFetchingRef = useRef(false);

  // Load available goals for assignment
  useEffect(() => {
    api.get('/goals?limit=100').then((res) => {
      setGoalsList(res.data.goals || []);
    }).catch((err) => console.error('Failed to load goals for notebook', err));
  }, []);

  // Fetch Notebook page & tasks for selected date
  const fetchNotebookPage = useCallback(async (dateStr, showLoader = false) => {
    if (showLoader) setLoading(true);
    isFetchingRef.current = true;
    try {
      const res = await api.get(`/notebook?date=${dateStr}`);
      const page = res.data.page || {};
      setPageData({
        dailyHeading: page.dailyHeading || "Today's Learning Plan",
        dailyMotivation: page.dailyMotivation || "",
        mainGoal: page.mainGoal || "",
        dailyGoals: page.dailyGoals || [],
        studyNotes: page.studyNotes || "",
        problemsFaced: page.problemsFaced || "",
        whatILearned: page.whatILearned || "",
        tomorrowPlan: page.tomorrowPlan || "",
        dailyReflection: page.dailyReflection || ""
      });
      setTasks(res.data.tasks || []);
      if (res.data.summary) {
        setSummary(res.data.summary);
      }
      setSaveStatus('saved');
      setLastSavedAt(new Date());
    } catch (err) {
      console.error('Failed to load notebook page', err);
      toast.error('Failed to load notebook for selected date');
    } finally {
      if (showLoader) setLoading(false);
      isFetchingRef.current = false;
    }
  }, [toast]);

  // Fetch on date change
  useEffect(() => {
    fetchNotebookPage(selectedDate, true);
  }, [selectedDate, fetchNotebookPage]);

  // Listen to external task updates (e.g. from Timer or Sidebar)
  useEffect(() => {
    const handleGlobalUpdate = () => {
      fetchNotebookPage(selectedDate, false);
    };
    window.addEventListener('skilltrack-data-updated', handleGlobalUpdate);
    return () => window.removeEventListener('skilltrack-data-updated', handleGlobalUpdate);
  }, [selectedDate, fetchNotebookPage]);

  // Core Save Page API call
  const persistPage = useCallback(async (dataToSave, isManual = false) => {
    setSaveStatus('saving');
    try {
      const payload = {
        date: selectedDate,
        ...dataToSave
      };
      const res = await api.put('/notebook', payload);
      setSaveStatus('saved');
      setLastSavedAt(new Date());
      if (res.data.summary) {
        setSummary(res.data.summary);
      }
      if (isManual) {
        toast.success('Notebook page saved successfully!');
      }
    } catch (err) {
      console.error('Failed to save notebook page', err);
      setSaveStatus('error');
      if (isManual) {
        toast.error('Failed to save notebook changes');
      }
    }
  }, [selectedDate, toast]);

  // Schedule autosave whenever text fields change
  const handleFieldChange = (field, value) => {
    setPageData(prev => {
      const updated = { ...prev, [field]: value };
      setSaveStatus('unsaved');

      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }

      autosaveTimerRef.current = setTimeout(() => {
        persistPage(updated, false);
      }, 900);

      return updated;
    });
  };

  // Keyboard shortcut Ctrl+S / Cmd+S for instant manual save
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
        persistPage(pageData, true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [persistPage, pageData]);

  // Beforeunload warning if unsaved
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (saveStatus === 'unsaved' || saveStatus === 'saving') {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes in your daily notebook.';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveStatus]);

  // Date Navigation handlers
  const handlePrevDay = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const prev = new Date(y, m - 1, d - 1);
    setSelectedDate(getLocalDateString(prev));
  };

  const handleNextDay = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const next = new Date(y, m - 1, d + 1);
    setSelectedDate(getLocalDateString(next));
  };

  const handleGoToToday = () => {
    setSelectedDate(getLocalDateString());
  };

  // Task actions
  const handleToggleTask = async (task) => {
    try {
      const newStatus = task.status === 'Completed' ? 'To Do' : 'Completed';
      await api.put(`/tasks/${task._id}`, { status: newStatus });
      toast.success(newStatus === 'Completed' ? 'Task marked complete! 🎯' : 'Task reopened');
      fetchNotebookPage(selectedDate, false);
      window.dispatchEvent(new CustomEvent('skilltrack-data-updated'));
    } catch (err) {
      toast.error('Failed to update task status');
    }
  };

  const handleStatusChange = async (task, newStatus) => {
    try {
      await api.put(`/tasks/${task._id}`, { status: newStatus });
      fetchNotebookPage(selectedDate, false);
      window.dispatchEvent(new CustomEvent('skilltrack-data-updated'));
    } catch (err) {
      toast.error('Failed to update task');
    }
  };

  const handleQuickAddTask = async (e) => {
    e.preventDefault();
    if (!quickTaskTitle.trim()) return;

    setIsSubmittingTask(true);
    try {
      const payload = {
        title: quickTaskTitle.trim(),
        scheduledDate: selectedDate,
        priority: quickTaskPriority,
        estimatedDuration: Number(quickTaskDuration) || 30,
        goal: quickTaskGoalId || null,
        status: 'To Do'
      };

      await api.post('/tasks', payload);
      toast.success('Task added to today’s plan!');
      setQuickTaskTitle('');
      fetchNotebookPage(selectedDate, false);
      window.dispatchEvent(new CustomEvent('skilltrack-data-updated'));
    } catch (err) {
      toast.error('Failed to add task');
    } finally {
      setIsSubmittingTask(false);
    }
  };

  const handleSaveModalTask = async (taskData) => {
    try {
      if (editingTask) {
        await api.put(`/tasks/${editingTask._id}`, taskData);
        toast.success('Task updated!');
      } else {
        await api.post('/tasks', { ...taskData, scheduledDate: selectedDate });
        toast.success('Task scheduled!');
      }
      fetchNotebookPage(selectedDate, false);
      window.dispatchEvent(new CustomEvent('skilltrack-data-updated'));
    } catch (err) {
      toast.error('Failed to save task');
      throw err;
    }
  };

  const handleDeleteTask = async () => {
    if (!deleteTaskId) return;
    try {
      await api.delete(`/tasks/${deleteTaskId}`);
      toast.success('Task deleted');
      setDeleteTaskId(null);
      fetchNotebookPage(selectedDate, false);
      window.dispatchEvent(new CustomEvent('skilltrack-data-updated'));
    } catch (err) {
      toast.error('Failed to delete task');
    }
  };

  // Reorder task helper (local visual shift)
  const handleMoveTask = (index, direction) => {
    const newTasks = [...tasks];
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= newTasks.length) return;
    const temp = newTasks[index];
    newTasks[index] = newTasks[targetIdx];
    newTasks[targetIdx] = temp;
    setTasks(newTasks);
    toast.success('Task order updated');
  };

  // Quick increment study time logged on task
  const handleQuickLogTime = async (task, mins) => {
    try {
      const newActual = (task.actualTimeSpent || 0) + mins;
      await api.put(`/tasks/${task._id}`, { actualTimeSpent: newActual });
      fetchNotebookPage(selectedDate, false);
      window.dispatchEvent(new CustomEvent('skilltrack-data-updated'));
      toast.success(`Logged +${mins}m to "${task.title}"`);
    } catch (err) {
      toast.error('Failed to log time');
    }
  };

  // Daily Goals CRUD
  const handleOpenGoalModal = (goal = null) => {
    if (goal) {
      setEditingDailyGoal(goal);
      setDailyGoalForm({
        title: goal.title,
        subject: goal.subject || '',
        targetQuantity: goal.targetQuantity || 1,
        unit: goal.unit || 'mins',
        notes: goal.notes || ''
      });
    } else {
      setEditingDailyGoal(null);
      setDailyGoalForm({
        title: '',
        subject: '',
        targetQuantity: 60,
        unit: 'mins',
        notes: ''
      });
    }
    setIsGoalModalOpen(true);
  };

  const handleSaveDailyGoal = async (e) => {
    e.preventDefault();
    if (!dailyGoalForm.title.trim()) return;

    try {
      if (editingDailyGoal) {
        await api.put(`/notebook/daily-goals/${editingDailyGoal._id}`, {
          date: selectedDate,
          ...dailyGoalForm
        });
        toast.success('Daily target updated!');
      } else {
        await api.post('/notebook/daily-goals', {
          date: selectedDate,
          ...dailyGoalForm
        });
        toast.success('Daily target added!');
      }
      setIsGoalModalOpen(false);
      fetchNotebookPage(selectedDate, false);
    } catch (err) {
      toast.error('Failed to save daily goal');
    }
  };

  const handleDeleteDailyGoal = async (goalId) => {
    try {
      await api.delete(`/notebook/daily-goals/${goalId}?date=${selectedDate}`);
      toast.success('Daily target removed');
      fetchNotebookPage(selectedDate, false);
    } catch (err) {
      toast.error('Failed to remove daily target');
    }
  };

  const handleQuickAdjustDailyGoal = async (goal, delta) => {
    try {
      const newActual = Math.max(0, (goal.actualQuantity || 0) + delta);
      const isCompleted = newActual >= goal.targetQuantity;
      await api.put(`/notebook/daily-goals/${goal._id}`, {
        date: selectedDate,
        actualQuantity: newActual,
        completed: isCompleted
      });
      fetchNotebookPage(selectedDate, false);
    } catch (err) {
      toast.error('Failed to adjust target');
    }
  };

  const handleToggleDailyGoal = async (goal) => {
    try {
      const newCompleted = !goal.completed;
      const newActual = newCompleted ? Math.max(goal.actualQuantity || 0, goal.targetQuantity) : 0;
      await api.put(`/notebook/daily-goals/${goal._id}`, {
        date: selectedDate,
        completed: newCompleted,
        actualQuantity: newActual
      });
      fetchNotebookPage(selectedDate, false);
    } catch (err) {
      toast.error('Failed to toggle target');
    }
  };

  // Quick preset goal buttons
  const applyPresetGoal = (preset) => {
    setDailyGoalForm(preset);
    setIsGoalModalOpen(true);
  };

  // Formatted date string display
  const [yearNum, monthNum, dayNum] = selectedDate.split('-').map(Number);
  const displayDateObj = new Date(yearNum, monthNum - 1, dayNum);
  const isToday = selectedDate === getLocalDateString();
  const dayName = displayDateObj.toLocaleDateString(undefined, { weekday: 'long' });
  const fullDateFormatted = displayDateObj.toLocaleDateString(undefined, { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  });

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto pb-16">
      
      {/* 1. TOP NOTEBOOK BAR: Navigation, Date Switcher, Save Status & Manual Save */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 glass-card border-brand-500/20 shadow-sm">
        
        {/* Date Selector Row */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-surface-100 dark:bg-surface-800 rounded-xl p-1 border border-surface-200 dark:border-surface-700">
            <button
              onClick={handlePrevDay}
              className="p-1.5 hover:bg-white dark:hover:bg-surface-700 rounded-lg text-surface-600 dark:text-surface-300 transition-colors"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={handleGoToToday}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                isToday 
                  ? 'bg-brand-600 text-white shadow-xs' 
                  : 'text-surface-700 dark:text-surface-300 hover:bg-white dark:hover:bg-surface-700'
              }`}
            >
              Today
            </button>

            <button
              onClick={handleNextDay}
              className="p-1.5 hover:bg-white dark:hover:bg-surface-700 rounded-lg text-surface-600 dark:text-surface-300 transition-colors"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Native Date Picker */}
          <div className="relative flex items-center">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-surface-800 dark:text-surface-200 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            />
          </div>

          {/* Date & Weekday Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20 text-xs font-semibold">
            <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>{dayName}, {fullDateFormatted}</span>
            {isToday && (
              <span className="bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] uppercase tracking-wider px-1.5 py-0.2 rounded font-bold">
                Today
              </span>
            )}
          </div>
        </div>

        {/* Save Status & Actions */}
        <div className="flex items-center gap-3 self-end md:self-auto">
          {/* Status Indicator Pill */}
          <div className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl border">
            {saveStatus === 'saved' && (
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 rounded-lg">
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Saved</span>
              </span>
            )}
            {saveStatus === 'saving' && (
              <span className="flex items-center gap-1.5 text-brand-600 dark:text-brand-400 border-brand-500/20 bg-brand-500/10 px-2 py-0.5 rounded-lg animate-pulse">
                <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </span>
            )}
            {saveStatus === 'unsaved' && (
              <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 border-amber-500/20 bg-amber-500/10 px-2 py-0.5 rounded-lg">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                <span>Unsaved changes</span>
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="flex items-center gap-1.5 text-red-600 dark:text-red-400 border-red-500/20 bg-red-500/10 px-2 py-0.5 rounded-lg">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Save failed</span>
              </span>
            )}
            
            {lastSavedAt && (
              <span className="text-[11px] text-surface-400 hidden sm:inline ml-1">
                {lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>

          {/* Manual Save Button */}
          <button
            onClick={() => persistPage(pageData, true)}
            disabled={saveStatus === 'saving'}
            className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 shadow-sm"
            title="Manual Save (Ctrl + S)"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Notebook</span>
          </button>
        </div>
      </div>

      {/* 2. DAILY PROGRESS SUMMARY BANNER (Top visual dashboard) */}
      <div className="glass-card p-5 relative overflow-hidden border-surface-200 dark:border-surface-800 bg-gradient-to-br from-brand-50/60 via-white to-amber-50/40 dark:from-surface-900 dark:via-surface-900/90 dark:to-surface-800/80">
        
        {/* Subtle notebook spiral holes motif along the top */}
        <div className="absolute top-2 left-6 right-6 flex justify-between pointer-events-none opacity-20 dark:opacity-10">
          {[...Array(24)].map((_, i) => (
            <div key={i} className="w-2.5 h-2.5 rounded-full bg-surface-900 dark:bg-white shadow-inner" />
          ))}
        </div>

        <div className="pt-2 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          
          {/* Left: Overall Completion Circle & Heading */}
          <div className="flex items-center gap-4">
            {/* Progress Circular Badge */}
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-surface-200 dark:text-surface-800"
                  strokeWidth="3.2"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-brand-600 dark:text-brand-400 transition-all duration-700 ease-out"
                  strokeDasharray={`${summary.overallPercentage || 0}, 100`}
                  strokeLinecap="round"
                  strokeWidth="3.2"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-sm sm:text-base font-extrabold text-surface-900 dark:text-surface-100">
                  {summary.overallPercentage || 0}%
                </span>
                <span className="text-[9px] uppercase tracking-wider font-semibold text-surface-500">
                  Done
                </span>
              </div>
            </div>

            {/* Daily Execution Status Text */}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-surface-900 dark:text-surface-100">
                  Daily Execution Summary
                </h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-700 dark:text-brand-300">
                  {summary.tasksCompleted} of {summary.totalTasksPlanned} Tasks
                </span>
              </div>
              <p className="text-xs text-surface-600 dark:text-surface-400 mt-1 max-w-xl">
                {summary.totalTasksPlanned === 0 && summary.totalDailyGoals === 0 ? (
                  'No items scheduled yet for this date. Write your plan below to jumpstart productivity!'
                ) : (
                  <>
                    <span className="font-semibold text-surface-900 dark:text-surface-200">
                      {summary.tasksCompleted} tasks
                    </span> and <span className="font-semibold text-surface-900 dark:text-surface-200">
                      {summary.dailyGoalsCompleted} targets
                    </span> achieved. Remaining work: {summary.tasksRemaining} task{summary.tasksRemaining === 1 ? '' : 's'}.
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Right: 4 Quick Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
            <div className="p-2.5 rounded-xl bg-white/70 dark:bg-surface-800/60 border border-surface-200/80 dark:border-surface-700/80 flex flex-col">
              <span className="text-[10px] uppercase font-bold text-surface-500 tracking-wider">Planned Tasks</span>
              <span className="text-base font-extrabold text-surface-900 dark:text-surface-100 mt-0.5">
                {summary.totalTasksPlanned}
              </span>
              <span className="text-[10px] text-surface-400">{summary.tasksRemaining} remaining</span>
            </div>

            <div className="p-2.5 rounded-xl bg-white/70 dark:bg-surface-800/60 border border-surface-200/80 dark:border-surface-700/80 flex flex-col">
              <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">Tasks Done</span>
              <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {summary.tasksCompleted}
              </span>
              <span className="text-[10px] text-surface-400">{summary.taskCompletionPercentage}% task rate</span>
            </div>

            <div className="p-2.5 rounded-xl bg-white/70 dark:bg-surface-800/60 border border-surface-200/80 dark:border-surface-700/80 flex flex-col">
              <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 tracking-wider">Daily Targets</span>
              <span className="text-base font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">
                {summary.dailyGoalsCompleted} / {summary.totalDailyGoals}
              </span>
              <span className="text-[10px] text-surface-400">{summary.goalCompletionPercentage}% target rate</span>
            </div>

            <div className="p-2.5 rounded-xl bg-white/70 dark:bg-surface-800/60 border border-surface-200/80 dark:border-surface-700/80 flex flex-col">
              <span className="text-[10px] uppercase font-bold text-brand-600 dark:text-brand-400 tracking-wider">Study Time</span>
              <span className="text-base font-extrabold text-brand-600 dark:text-brand-400 mt-0.5">
                {summary.actualStudyTime}m <span className="text-xs font-normal text-surface-400">/ {summary.totalPlannedStudyTime}m</span>
              </span>
              <span className="text-[10px] text-surface-400">
                {summary.totalPlannedStudyTime > 0 
                  ? `${Math.round((summary.actualStudyTime / summary.totalPlannedStudyTime) * 100)}% logged` 
                  : '0% logged'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. NOTEBOOK SHEET: Paper Styling Container */}
      <div className="notebook-sheet p-5 sm:p-8 space-y-8">
        
        {/* Notebook Top Margin Line & Header */}
        <div className="border-b-2 border-brand-500/20 pb-5 space-y-3">
          
          {/* Editable Daily Heading */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <input
                type="text"
                value={pageData.dailyHeading}
                onChange={(e) => handleFieldChange('dailyHeading', e.target.value)}
                placeholder="Today's Learning Plan (e.g. JavaScript Async Mastery)"
                className="w-full text-xl sm:text-2xl font-bold bg-transparent text-surface-900 dark:text-surface-100 border-b border-transparent hover:border-surface-300 dark:hover:border-surface-600 focus:border-brand-500 focus:outline-none transition-all py-1"
              />
              <p className="text-[11px] text-surface-500">
                Click heading to rename your notebook page for {dayName}
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 px-3 py-1 rounded-xl border border-amber-500/20">
                Notebook Entry #{selectedDate.replace(/-/g, '.')}
              </span>
            </div>
          </div>

          {/* Daily Motivation or Personal Intention Field */}
          <div className="p-3 rounded-2xl bg-amber-500/5 dark:bg-amber-950/20 border border-amber-500/20 flex items-start gap-3">
            <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-1 shrink-0" />
            <div className="flex-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 mb-0.5">
                Daily Motivation & Mindset Intention
              </label>
              <input
                type="text"
                value={pageData.dailyMotivation}
                onChange={(e) => handleFieldChange('dailyMotivation', e.target.value)}
                placeholder="Write a motivating thought or intention for today (e.g. Focus on deep learning, progress over perfection)..."
                className="w-full bg-transparent text-xs text-surface-800 dark:text-surface-200 placeholder-surface-400 focus:outline-none"
              />
            </div>
          </div>

          {/* TODAY'S MAIN GOAL: Prominent Focus Box */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-brand-600/10 via-brand-500/5 to-transparent border border-brand-500/20 flex items-start gap-3">
            <Target className="w-5 h-5 text-brand-600 dark:text-brand-400 mt-1 shrink-0" />
            <div className="flex-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-brand-700 dark:text-brand-300 mb-1">
                ⭐ Today's Main Goal (Single Most Important Objective)
              </label>
              <input
                type="text"
                value={pageData.mainGoal}
                onChange={(e) => handleFieldChange('mainGoal', e.target.value)}
                placeholder="What is the #1 outcome that will make today a resounding victory?"
                className="w-full text-sm font-semibold bg-white/60 dark:bg-surface-800/60 px-3.5 py-2 rounded-xl border border-brand-200/70 dark:border-brand-900/50 text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
            </div>
          </div>
        </div>

        {/* SECTION 1: TODAY'S LEARNING PLAN ("What Do I Need to Do Today?") */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-surface-200/80 dark:border-surface-800">
            <div>
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                <h3 className="text-lg font-bold text-surface-900 dark:text-surface-100">
                  What Do I Need to Do Today?
                </h3>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300">
                  {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
                </span>
              </div>
              <p className="text-xs text-surface-500 mt-0.5">
                All tasks scheduled for {dayName}. Check them off as you execute.
              </p>
            </div>

            <button
              onClick={() => { setEditingTask(null); setIsTaskModalOpen(true); }}
              className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Today's Task</span>
            </button>
          </div>

          {/* Quick-Add Task Input Bar */}
          <form onSubmit={handleQuickAddTask} className="p-3 rounded-2xl bg-surface-100/70 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700 flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={quickTaskTitle}
              onChange={(e) => setQuickTaskTitle(e.target.value)}
              placeholder="Quickly jot down a task for today & press Enter..."
              className="flex-1 min-w-[220px] px-3 py-1.5 text-xs bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-xl text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            />

            {/* Goal Select */}
            <select
              value={quickTaskGoalId}
              onChange={(e) => setQuickTaskGoalId(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-xl text-surface-800 dark:text-surface-200 focus:outline-none"
            >
              <option value="">No goal attached</option>
              {goalsList.map(g => (
                <option key={g._id} value={g._id}>{g.title} ({g.subject})</option>
              ))}
            </select>

            {/* Priority Select */}
            <select
              value={quickTaskPriority}
              onChange={(e) => setQuickTaskPriority(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-xl text-surface-800 dark:text-surface-200 focus:outline-none"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>

            {/* Est Duration */}
            <div className="flex items-center gap-1 bg-white dark:bg-surface-900 px-2 py-1 border border-surface-200 dark:border-surface-700 rounded-xl">
              <Clock className="w-3.5 h-3.5 text-surface-400" />
              <input
                type="number"
                min="5"
                max="480"
                step="5"
                value={quickTaskDuration}
                onChange={(e) => setQuickTaskDuration(e.target.value)}
                className="w-12 text-xs bg-transparent focus:outline-none text-surface-800 dark:text-surface-200 text-center"
                title="Estimated duration in minutes"
              />
              <span className="text-[10px] text-surface-400">m</span>
            </div>

            <button
              type="submit"
              disabled={isSubmittingTask || !quickTaskTitle.trim()}
              className="btn-primary text-xs py-1.5 px-3 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isSubmittingTask ? 'Adding...' : 'Quick Add'}</span>
            </button>
          </form>

          {/* Tasks List */}
          {tasks.length === 0 ? (
            <div className="p-8 rounded-2xl bg-amber-500/5 dark:bg-surface-900/40 border border-dashed border-amber-500/30 text-center space-y-2">
              <CheckSquare className="w-8 h-8 text-amber-500/60 mx-auto" />
              <h4 className="text-sm font-bold text-surface-800 dark:text-surface-200">
                No tasks scheduled for {isToday ? 'today' : fullDateFormatted}
              </h4>
              <p className="text-xs text-surface-500 max-w-sm mx-auto">
                Begin your day intentionally by adding your high-priority study tasks above.
              </p>
              <button
                onClick={() => { setEditingTask(null); setIsTaskModalOpen(true); }}
                className="btn-primary text-xs py-1.5 px-3.5 mt-2"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create First Task</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {tasks.map((task, idx) => {
                const isCompleted = task.status === 'Completed';

                return (
                  <div
                    key={task._id}
                    className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isCompleted 
                        ? 'bg-surface-50/70 dark:bg-surface-900/40 border-surface-200 dark:border-surface-800 opacity-75' 
                        : 'bg-white dark:bg-surface-900 border-surface-200/90 dark:border-surface-700/80 shadow-xs hover:border-brand-400 dark:hover:border-brand-500'
                    }`}
                  >
                    {/* Left: Reorder, Checkbox, Title & Details */}
                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                      
                      {/* Reorder Buttons */}
                      <div className="flex flex-col gap-0.5 shrink-0 pt-0.5">
                        <button
                          onClick={() => handleMoveTask(idx, -1)}
                          disabled={idx === 0}
                          className="text-surface-400 hover:text-surface-800 dark:hover:text-surface-200 disabled:opacity-20 transition-colors"
                          title="Move Up"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleMoveTask(idx, 1)}
                          disabled={idx === tasks.length - 1}
                          className="text-surface-400 hover:text-surface-800 dark:hover:text-surface-200 disabled:opacity-20 transition-colors"
                          title="Move Down"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Complete Checkbox */}
                      <button
                        onClick={() => handleToggleTask(task)}
                        className="mt-0.5 text-surface-400 hover:text-emerald-500 transition-colors shrink-0"
                        title={isCompleted ? 'Mark as Incomplete' : 'Mark as Completed'}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <Circle className="w-5 h-5" />
                        )}
                      </button>

                      {/* Title & Goal Pill */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm font-semibold ${
                            isCompleted ? 'line-through text-surface-400 dark:text-surface-500' : 'text-surface-900 dark:text-surface-100'
                          }`}>
                            {task.title}
                          </span>

                          {task.goal && (
                            <Link
                              to={`/goals/${task.goal._id}`}
                              className="text-[10px] font-bold px-2 py-0.5 rounded-md hover:underline"
                              style={{
                                backgroundColor: `${task.goal.color || '#6366f1'}15`,
                                color: task.goal.color || '#6366f1'
                              }}
                            >
                              {task.goal.title}
                            </Link>
                          )}
                        </div>

                        {task.description && (
                          <p className="text-xs text-surface-500 mt-0.5 line-clamp-1">
                            {task.description}
                          </p>
                        )}

                        {/* Metadata row */}
                        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-surface-500 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>Est: {task.estimatedDuration}m</span>
                          </span>

                          <span className="font-medium text-brand-600 dark:text-brand-400">
                            Spent: {task.actualTimeSpent || 0}m
                          </span>

                          {/* Quick +15m button */}
                          <button
                            onClick={() => handleQuickLogTime(task, 15)}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-700 dark:text-surface-300 transition-colors"
                            title="Add 15 minutes of study time"
                          >
                            +15m
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Right: Status Dropdown, Priority, Timer, Edit, Delete */}
                    <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-surface-200/60 dark:border-surface-800/60">
                      
                      {/* Priority Tag */}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        task.priority === 'High' ? 'bg-red-500/10 text-red-600 dark:text-red-400' :
                        task.priority === 'Medium' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                        'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                      }`}>
                        {task.priority}
                      </span>

                      {/* Status Dropdown */}
                      <select
                        value={task.status}
                        onChange={(e) => handleStatusChange(task, e.target.value)}
                        className={`text-[11px] font-bold px-2 py-1 rounded-lg border focus:outline-none ${
                          task.status === 'Completed' ? 'badge-success border-emerald-500/20' :
                          task.status === 'In Progress' ? 'badge-info border-blue-500/20' :
                          'badge-neutral border-surface-200 dark:border-surface-700'
                        }`}
                      >
                        <option value="To Do">Not Started</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                      </select>

                      {/* Start Focus Timer */}
                      <Link
                        to={`/timer?taskId=${task._id}${task.goal ? `&goalId=${task.goal._id}` : ''}`}
                        className="p-1.5 text-surface-500 hover:text-brand-600 rounded-lg transition-colors"
                        title="Start Timer with this task"
                      >
                        <Timer className="w-4 h-4" />
                      </Link>

                      {/* Edit Task Modal */}
                      <button
                        onClick={() => { setEditingTask(task); setIsTaskModalOpen(true); }}
                        className="p-1.5 text-surface-500 hover:text-surface-900 dark:hover:text-surface-100 rounded-lg transition-colors"
                        title="Edit Task"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      {/* Delete Task */}
                      <button
                        onClick={() => setDeleteTaskId(task._id)}
                        className="p-1.5 text-surface-500 hover:text-red-600 rounded-lg transition-colors"
                        title="Delete Task"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SECTION 2: DAILY GOAL TRACKING ("My Goals for Today") */}
        <div className="space-y-4 pt-4 border-t-2 border-brand-500/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-surface-200/80 dark:border-surface-800">
            <div>
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <h3 className="text-lg font-bold text-surface-900 dark:text-surface-100">
                  My Goals for Today (Measurable Targets)
                </h3>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300">
                  {pageData.dailyGoals?.filter(g => g.completed).length || 0} / {pageData.dailyGoals?.length || 0} Complete
                </span>
              </div>
              <p className="text-xs text-surface-500 mt-0.5">
                Set quantitative targets (e.g. 2 hours coding, 3 problems, 10 pages). Progress bars auto-calculate.
              </p>
            </div>

            <button
              onClick={() => handleOpenGoalModal()}
              className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Daily Target</span>
            </button>
          </div>

          {/* Quick Target Presets Row */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-[11px] font-semibold text-surface-400 shrink-0">Quick Presets:</span>
            {[
              { title: 'Study JavaScript', subject: 'JavaScript', targetQuantity: 120, unit: 'mins' },
              { title: 'Solve 3 Coding Problems', subject: 'DSA', targetQuantity: 3, unit: 'problems' },
              { title: 'Watch 1 Tutorial Lesson', subject: 'Web Dev', targetQuantity: 1, unit: 'lessons' },
              { title: 'Read 10 Pages', subject: 'Reading', targetQuantity: 10, unit: 'pages' },
              { title: 'Practice English Speaking', subject: 'Language', targetQuantity: 20, unit: 'mins' },
            ].map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => applyPresetGoal(preset)}
                className="px-2.5 py-1 rounded-xl bg-surface-100 dark:bg-surface-800 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-950/40 text-surface-700 dark:text-surface-300 font-medium border border-surface-200 dark:border-surface-700 transition-colors shrink-0"
              >
                + {preset.title}
              </button>
            ))}
          </div>

          {/* Daily Goals List */}
          {(!pageData.dailyGoals || pageData.dailyGoals.length === 0) ? (
            <div className="p-6 rounded-2xl bg-surface-100/40 dark:bg-surface-900/40 border border-dashed border-surface-300 dark:border-surface-700 text-center space-y-2">
              <p className="text-xs text-surface-500">
                No measurable daily targets added yet. Use the presets above or click "Add Daily Target".
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {pageData.dailyGoals.map((goal) => {
                const progressPct = Math.min(100, Math.round(((goal.actualQuantity || 0) / (goal.targetQuantity || 1)) * 100));
                const isBinary = goal.unit === 'lessons' || goal.unit === 'checkbox';

                return (
                  <div
                    key={goal._id}
                    className={`p-4 rounded-2xl border transition-all ${
                      goal.completed
                        ? 'bg-emerald-500/5 dark:bg-emerald-950/10 border-emerald-500/20'
                        : 'bg-white dark:bg-surface-900 border-surface-200/80 dark:border-surface-700/80 shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        {/* Checkbox */}
                        <button
                          onClick={() => handleToggleDailyGoal(goal)}
                          className="mt-0.5 text-surface-400 hover:text-emerald-500 transition-colors shrink-0"
                          title={goal.completed ? 'Mark incomplete' : 'Mark completed'}
                        >
                          {goal.completed ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          ) : (
                            <Circle className="w-5 h-5" />
                          )}
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-sm font-bold ${
                              goal.completed ? 'line-through text-surface-400 dark:text-surface-500' : 'text-surface-900 dark:text-surface-100'
                            }`}>
                              {goal.title}
                            </span>
                            {goal.subject && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300">
                                {goal.subject}
                              </span>
                            )}
                          </div>

                          {/* Progress text */}
                          <div className="flex items-center justify-between text-xs font-semibold mt-2 text-surface-600 dark:text-surface-300">
                            <span>
                              {goal.actualQuantity} / {goal.targetQuantity} {goal.unit}
                            </span>
                            <span className={goal.completed ? 'text-emerald-600 dark:text-emerald-400 font-bold' : ''}>
                              {progressPct}%
                            </span>
                          </div>

                          {/* Visual Progress Bar */}
                          <div className="w-full h-2 rounded-full bg-surface-200 dark:bg-surface-700 overflow-hidden mt-1">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                goal.completed ? 'bg-emerald-500' : 'bg-brand-500'
                              }`}
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>

                          {/* Notes if present */}
                          {goal.notes && (
                            <p className="text-[11px] text-surface-500 mt-2 bg-surface-50 dark:bg-surface-800/50 p-1.5 rounded-lg border border-surface-200/50 dark:border-surface-700/50">
                              {goal.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleOpenGoalModal(goal)}
                          className="p-1 text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 rounded"
                          title="Edit Target"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteDailyGoal(goal._id)}
                          className="p-1 text-surface-400 hover:text-red-600 rounded"
                          title="Delete Target"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Quick Increment Buttons */}
                    <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-surface-100 dark:border-surface-800 flex-wrap">
                      <span className="text-[10px] text-surface-400 font-medium">Quick update:</span>
                      {goal.unit === 'mins' ? (
                        <>
                          <button
                            onClick={() => handleQuickAdjustDailyGoal(goal, 15)}
                            className="px-2 py-0.5 text-[11px] font-semibold rounded bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700"
                          >
                            +15m
                          </button>
                          <button
                            onClick={() => handleQuickAdjustDailyGoal(goal, 30)}
                            className="px-2 py-0.5 text-[11px] font-semibold rounded bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700"
                          >
                            +30m
                          </button>
                          <button
                            onClick={() => handleQuickAdjustDailyGoal(goal, 60)}
                            className="px-2 py-0.5 text-[11px] font-semibold rounded bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700"
                          >
                            +60m
                          </button>
                          <button
                            onClick={() => handleQuickAdjustDailyGoal(goal, -15)}
                            className="px-2 py-0.5 text-[11px] font-semibold rounded bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700"
                          >
                            -15m
                          </button>
                        </>
                      ) : isBinary ? (
                        <button
                          onClick={() => handleToggleDailyGoal(goal)}
                          className="px-2.5 py-0.5 text-[11px] font-semibold rounded bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700"
                        >
                          {goal.completed ? 'Mark Incomplete' : 'Complete Target'}
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => handleQuickAdjustDailyGoal(goal, 1)}
                            className="px-2 py-0.5 text-[11px] font-semibold rounded bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700"
                          >
                            +1
                          </button>
                          <button
                            onClick={() => handleQuickAdjustDailyGoal(goal, 2)}
                            className="px-2 py-0.5 text-[11px] font-semibold rounded bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700"
                          >
                            +2
                          </button>
                          <button
                            onClick={() => handleQuickAdjustDailyGoal(goal, -1)}
                            className="px-2 py-0.5 text-[11px] font-semibold rounded bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700"
                          >
                            -1
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SECTION 3: EDITABLE DAILY NOTEBOOK SECTIONS (Paper-Lined Journal Areas) */}
        <div className="space-y-6 pt-4 border-t-2 border-brand-500/20">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-surface-200/80 dark:border-surface-800">
            <div>
              <div className="flex items-center gap-2">
                <PenTool className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-lg font-bold text-surface-900 dark:text-surface-100">
                  Daily Study Journal & Reflection Pages
                </h3>
              </div>
              <p className="text-xs text-surface-500 mt-0.5">
                Every date has its own saved page. Edits automatically autosave with debounce.
              </p>
            </div>

            {/* View Filter Tabs */}
            <div className="flex items-center gap-1 bg-surface-100 dark:bg-surface-800/80 p-1 rounded-xl overflow-x-auto text-xs">
              {[
                { id: 'all', label: 'All Pages' },
                { id: 'notes', label: 'Study Notes' },
                { id: 'problems', label: 'Problems Faced' },
                { id: 'learned', label: 'What I Learned' },
                { id: 'tomorrow', label: "Tomorrow's Plan" },
                { id: 'reflection', label: 'Daily Reflection' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all shrink-0 ${
                    activeTab === tab.id
                      ? 'bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 shadow-xs'
                      : 'text-surface-500 hover:text-surface-800 dark:hover:text-surface-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Grid of Journal Pages */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* 1. Study Notes */}
            {(activeTab === 'all' || activeTab === 'notes') && (
              <div className={`p-4 rounded-2xl bg-white/80 dark:bg-surface-900/80 border border-surface-200 dark:border-surface-800 shadow-xs space-y-2 ${activeTab === 'notes' ? 'md:col-span-2' : ''}`}>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-surface-800 dark:text-surface-200">
                    <BookMarked className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                    <span>Study Notes & Concept Records</span>
                  </label>
                  <span className="text-[10px] text-surface-400">Autosaves</span>
                </div>
                <p className="text-[11px] text-surface-500">
                  Write detailed notes, code snippets, syntax reminders, or formulas learned today.
                </p>
                <textarea
                  rows={activeTab === 'notes' ? 12 : 6}
                  value={pageData.studyNotes}
                  onChange={(e) => handleFieldChange('studyNotes', e.target.value)}
                  placeholder="- Mastered React useEffect dependency rules...&#10;- Algorithm time complexity O(N log N)...&#10;- Key API endpoints and payload shapes..."
                  className="w-full p-3 text-xs notebook-paper-lined bg-transparent text-surface-900 dark:text-surface-100 border border-surface-200 dark:border-surface-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/30 resize-y font-mono"
                />
              </div>
            )}

            {/* 2. Problems I Faced */}
            {(activeTab === 'all' || activeTab === 'problems') && (
              <div className={`p-4 rounded-2xl bg-white/80 dark:bg-surface-900/80 border border-surface-200 dark:border-surface-800 shadow-xs space-y-2 ${activeTab === 'problems' ? 'md:col-span-2' : ''}`}>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <span>Problems I Faced (Bugs & Obstacles)</span>
                  </label>
                  <span className="text-[10px] text-surface-400">Autosaves</span>
                </div>
                <p className="text-[11px] text-surface-500">
                  Record tricky bugs, difficult concepts, runtime errors, and how you solved them.
                </p>
                <textarea
                  rows={activeTab === 'problems' ? 12 : 6}
                  value={pageData.problemsFaced}
                  onChange={(e) => handleFieldChange('problemsFaced', e.target.value)}
                  placeholder="Bugs encountered, blockers, syntax errors, or concepts that felt confusing today..."
                  className="w-full p-3 text-xs notebook-paper-lined bg-transparent text-surface-900 dark:text-surface-100 border border-surface-200 dark:border-surface-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/30 resize-y"
                />
              </div>
            )}

            {/* 3. What I Learned Today */}
            {(activeTab === 'all' || activeTab === 'learned') && (
              <div className={`p-4 rounded-2xl bg-white/80 dark:bg-surface-900/80 border border-surface-200 dark:border-surface-800 shadow-xs space-y-2 ${activeTab === 'learned' ? 'md:col-span-2' : ''}`}>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    <Sparkles className="w-4 h-4 text-emerald-500" />
                    <span>What I Learned Today (Key Takeaways)</span>
                  </label>
                  <span className="text-[10px] text-surface-400">Autosaves</span>
                </div>
                <p className="text-[11px] text-surface-500">
                  Summarize the most impactful lessons, mental models, and breakthroughs.
                </p>
                <textarea
                  rows={activeTab === 'learned' ? 12 : 6}
                  value={pageData.whatILearned}
                  onChange={(e) => handleFieldChange('whatILearned', e.target.value)}
                  placeholder="Summarize the core concepts, patterns, or personal discoveries from today..."
                  className="w-full p-3 text-xs notebook-paper-lined bg-transparent text-surface-900 dark:text-surface-100 border border-surface-200 dark:border-surface-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-y"
                />
              </div>
            )}

            {/* 4. Tomorrow's Plan */}
            {(activeTab === 'all' || activeTab === 'tomorrow') && (
              <div className={`p-4 rounded-2xl bg-white/80 dark:bg-surface-900/80 border border-surface-200 dark:border-surface-800 shadow-xs space-y-2 ${activeTab === 'tomorrow' ? 'md:col-span-2' : ''}`}>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    <Calendar className="w-4 h-4 text-indigo-500" />
                    <span>Tomorrow's Plan & Priorities</span>
                  </label>
                  <span className="text-[10px] text-surface-400">Autosaves</span>
                </div>
                <p className="text-[11px] text-surface-500">
                  Offload tomorrow's priorities so you wake up ready with absolute clarity.
                </p>
                <textarea
                  rows={activeTab === 'tomorrow' ? 12 : 6}
                  value={pageData.tomorrowPlan}
                  onChange={(e) => handleFieldChange('tomorrowPlan', e.target.value)}
                  placeholder="1. Build study timer presets&#10;2. Complete 3 DSA problems&#10;3. Review flashcards..."
                  className="w-full p-3 text-xs notebook-paper-lined bg-transparent text-surface-900 dark:text-surface-100 border border-surface-200 dark:border-surface-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 resize-y"
                />
              </div>
            )}

            {/* 5. Daily Reflection */}
            {(activeTab === 'all' || activeTab === 'reflection') && (
              <div className={`p-4 rounded-2xl bg-white/80 dark:bg-surface-900/80 border border-surface-200 dark:border-surface-800 shadow-xs space-y-2 md:col-span-2`}>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    <TrendingUp className="w-4 h-4 text-amber-500" />
                    <span>Daily Reflection (Wins & Improvements)</span>
                  </label>
                  <span className="text-[10px] text-surface-400">Autosaves</span>
                </div>
                <p className="text-[11px] text-surface-500">
                  What went well today? What could be improved? What will you do differently tomorrow?
                </p>
                <textarea
                  rows={5}
                  value={pageData.dailyReflection}
                  onChange={(e) => handleFieldChange('dailyReflection', e.target.value)}
                  placeholder="Honest review: Started with great focus, had a slight energy dip in afternoon. Hit 100% of LeetCode targets. Tomorrow will tackle hard tasks before noon..."
                  className="w-full p-3 text-xs notebook-paper-lined bg-transparent text-surface-900 dark:text-surface-100 border border-surface-200 dark:border-surface-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 resize-y"
                />
              </div>
            )}

          </div>
        </div>

      </div>

      {/* MODAL: Task Creator / Editor Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => { setIsTaskModalOpen(false); setEditingTask(null); }}
        onSave={handleSaveModalTask}
        initialData={editingTask}
        defaultDate={selectedDate}
      />

      {/* MODAL: Daily Measurable Goal Creator / Editor */}
      {isGoalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="glass-card max-w-md w-full p-6 space-y-4 shadow-xl border-surface-200 dark:border-surface-700">
            <div className="flex items-center justify-between pb-3 border-b border-surface-200 dark:border-surface-800">
              <h3 className="text-base font-bold text-surface-900 dark:text-surface-100 flex items-center gap-2">
                <Target className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                <span>{editingDailyGoal ? 'Edit Daily Target' : 'Add Daily Target'}</span>
              </h3>
              <button
                onClick={() => setIsGoalModalOpen(false)}
                className="p-1 text-surface-400 hover:text-surface-800 dark:hover:text-surface-200 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDailyGoal} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider mb-1">
                  Target Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Study React Hooks for 2 hours"
                  value={dailyGoalForm.title}
                  onChange={(e) => setDailyGoalForm(prev => ({ ...prev, title: e.target.value }))}
                  className="input-field text-xs py-2"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider mb-1">
                  Subject or Skill
                </label>
                <input
                  type="text"
                  placeholder="e.g. React, DSA, Python, Math"
                  value={dailyGoalForm.subject}
                  onChange={(e) => setDailyGoalForm(prev => ({ ...prev, subject: e.target.value }))}
                  className="input-field text-xs py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider mb-1">
                    Target Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    required
                    value={dailyGoalForm.targetQuantity}
                    onChange={(e) => setDailyGoalForm(prev => ({ ...prev, targetQuantity: Number(e.target.value) || 1 }))}
                    className="input-field text-xs py-2"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider mb-1">
                    Metric Unit
                  </label>
                  <select
                    value={dailyGoalForm.unit}
                    onChange={(e) => setDailyGoalForm(prev => ({ ...prev, unit: e.target.value }))}
                    className="input-field text-xs py-2"
                  >
                    <option value="mins">Minutes (mins)</option>
                    <option value="problems">Problems</option>
                    <option value="pages">Pages</option>
                    <option value="lessons">Lessons</option>
                    <option value="checkbox">Completion Checkbox</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Specific chapters, problems or links..."
                  value={dailyGoalForm.notes}
                  onChange={(e) => setDailyGoalForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="input-field text-xs py-2 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-200 dark:border-surface-800">
                <button
                  type="button"
                  onClick={() => setIsGoalModalOpen(false)}
                  className="btn-secondary text-xs py-2 px-3"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary text-xs py-2 px-4"
                >
                  {editingDailyGoal ? 'Update Target' : 'Add Target'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE TASK DIALOG */}
      <ConfirmDialog
        isOpen={!!deleteTaskId}
        onClose={() => setDeleteTaskId(null)}
        onConfirm={handleDeleteTask}
        title="Delete Task from Notebook"
        message="Are you sure you want to remove this task? It will be deleted from your daily schedule."
      />

    </div>
  );
}
