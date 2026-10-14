import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock, 
  CheckCircle2, 
  Circle, 
  AlertTriangle,
  MoveRight,
  BookOpen
} from 'lucide-react';
import TaskModal from '../components/ui/TaskModal';
import { PageLoader } from '../components/ui/LoadingSpinner';
import { useToast } from '../components/ui/Toast';

export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState({ tasks: [], goalDeadlines: [] });
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedDateTasks, setSelectedDateTasks] = useState([]);
  const [dateSummary, setDateSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [reschedulingTask, setReschedulingTask] = useState(null);
  const [newDateValue, setNewDateValue] = useState('');
  const toast = useToast();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const fetchCalendar = useCallback(async () => {
    try {
      const res = await api.get(`/calendar?year=${year}&month=${month}`);
      setCalendarData(res.data);
    } catch (err) {
      toast.error('Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  }, [year, month, toast]);

  const fetchDateTasks = useCallback(async (dateStr) => {
    try {
      const res = await api.get(`/calendar/date?date=${dateStr}`);
      setSelectedDateTasks(res.data.tasks || []);
      setDateSummary(res.data.summary);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  useEffect(() => {
    if (selectedDate) {
      fetchDateTasks(selectedDate);
    }
  }, [selectedDate, fetchDateTasks]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, currentDate.getMonth() + 1, 1));
  };

  const handleReschedule = async (taskId) => {
    if (!newDateValue) return;
    try {
      await api.put(`/tasks/${taskId}`, { scheduledDate: newDateValue });
      toast.success('Task rescheduled successfully!');
      setReschedulingTask(null);
      setNewDateValue('');
      fetchCalendar();
      fetchDateTasks(selectedDate);
      window.dispatchEvent(new CustomEvent('skilltrack-data-updated'));
    } catch (err) {
      toast.error('Failed to reschedule task');
    }
  };

  const handleToggleTaskStatus = async (task) => {
    try {
      const newStatus = task.status === 'Completed' ? 'To Do' : 'Completed';
      await api.put(`/tasks/${task._id}`, { status: newStatus });
      toast.success(newStatus === 'Completed' ? 'Task completed!' : 'Task marked as To Do');
      fetchCalendar();
      fetchDateTasks(selectedDate);
      window.dispatchEvent(new CustomEvent('skilltrack-data-updated'));
    } catch (err) {
      toast.error('Failed to update task');
    }
  };

  if (loading) return <PageLoader />;

  // Build calendar grid days
  const firstDayIndex = new Date(year, month - 1, 1).getDay();
  const totalDaysInMonth = new Date(year, month, 0).getDate();
  const days = [];

  // Previous month trailing days
  const prevMonthTotalDays = new Date(year, month - 1, 0).getDate();
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const d = prevMonthTotalDays - i;
    const m = month - 1 === 0 ? 12 : month - 1;
    const y = month - 1 === 0 ? year - 1 : year;
    const dateStr = `${y}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
    days.push({ dayNumber: d, dateStr, isCurrentMonth: false });
  }

  // Current month days
  for (let i = 1; i <= totalDaysInMonth; i++) {
    const dateStr = `${year}-${month.toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
    days.push({ dayNumber: i, dateStr, isCurrentMonth: true });
  }

  // Next month leading days to complete 35 or 42 grid cells
  const remainingCells = (7 - (days.length % 7)) % 7;
  for (let i = 1; i <= remainingCells; i++) {
    const m = month + 1 === 13 ? 1 : month + 1;
    const y = month + 1 === 13 ? year + 1 : year;
    const dateStr = `${y}-${m.toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
    days.push({ dayNumber: i, dateStr, isCurrentMonth: false });
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-surface-900 dark:text-surface-100">
            Study Planner & Calendar
          </h2>
          <p className="text-xs text-surface-500 mt-0.5">
            Visualize scheduled study loads, manage deadlines, and balance your daily learning roadmap
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsTaskModalOpen(true)}
            className="btn-primary text-xs sm:text-sm py-2 px-3"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule Task</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Calendar on Left (2 cols), Selected Date Agenda on Right (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid (2 cols) */}
        <div className="lg:col-span-2 glass-card p-5 flex flex-col justify-between">
          {/* Month Navigator */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-surface-900 dark:text-surface-100">
              {monthNames[month - 1]} {year}
            </h3>

            <div className="flex items-center gap-1">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg border border-surface-200 dark:border-surface-700 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                aria-label="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-surface-200 dark:border-surface-700 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
              >
                Today
              </button>
              <button
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg border border-surface-200 dark:border-surface-700 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                aria-label="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-surface-500 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="py-1">{d}</div>
            ))}
          </div>

          {/* Day Cells Grid */}
          <div className="grid grid-cols-7 gap-1 flex-1">
            {days.map((cell) => {
              const dateObj = new Date(cell.dateStr);
              const isToday = new Date().toDateString() === dateObj.toDateString();
              const isSelected = selectedDate === cell.dateStr;

              // Filter tasks & goal deadlines for this specific date
              const dayTasks = calendarData.tasks.filter(t => 
                t.scheduledDate && new Date(t.scheduledDate).toISOString().split('T')[0] === cell.dateStr
              );
              const dayDeadlines = calendarData.goalDeadlines.filter(g => 
                g.targetDate && new Date(g.targetDate).toISOString().split('T')[0] === cell.dateStr
              );

              return (
                <div
                  key={cell.dateStr}
                  onClick={() => setSelectedDate(cell.dateStr)}
                  className={`min-h-[75px] sm:min-h-[90px] p-1.5 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'border-brand-500 ring-2 ring-brand-500/20 bg-brand-50/40 dark:bg-brand-950/20'
                      : 'border-surface-200/60 dark:border-surface-800/60 hover:bg-surface-50 dark:hover:bg-surface-800/40'
                  } ${!cell.isCurrentMonth ? 'opacity-40' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                      isToday
                        ? 'bg-brand-600 text-white'
                        : isSelected
                        ? 'text-brand-600 font-black'
                        : 'text-surface-700 dark:text-surface-300'
                    }`}>
                      {cell.dayNumber}
                    </span>

                    {dayDeadlines.length > 0 && (
                      <span className="w-2 h-2 rounded-full bg-red-500" title="Goal Deadline Today" />
                    )}
                  </div>

                  {/* Task Pills */}
                  <div className="space-y-1 mt-1 overflow-hidden">
                    {dayTasks.slice(0, 2).map((t) => (
                      <div
                        key={t._id}
                        className={`text-[9px] font-semibold truncate px-1 py-0.5 rounded ${
                          t.status === 'Completed'
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 line-through'
                            : 'bg-brand-500/15 text-brand-700 dark:text-brand-300'
                        }`}
                      >
                        {t.title}
                      </div>
                    ))}
                    {dayTasks.length > 2 && (
                      <span className="text-[9px] text-surface-400 font-medium pl-1">
                        +{dayTasks.length - 2} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Date Agenda & Daily Study Plan (1 col) */}
        <div className="glass-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-surface-200/80 dark:border-surface-800">
              <div>
                <span className="text-xs font-semibold text-brand-600 dark:text-brand-400 uppercase tracking-wider">
                  Daily Study Plan
                </span>
                <h3 className="text-base font-bold text-surface-900 dark:text-surface-100 mt-0.5">
                  {new Date(selectedDate).toLocaleDateString('en-US', {
                    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
                  })}
                </h3>
              </div>

              <button
                onClick={() => setIsTaskModalOpen(true)}
                className="p-1.5 rounded-lg bg-surface-100 dark:bg-surface-800 text-surface-600 hover:text-surface-900 transition-colors"
                title="Add task for this date"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Daily estimated vs actual time summary */}
            {dateSummary && (
              <div className="grid grid-cols-2 gap-2 my-4 p-3 rounded-xl bg-surface-50 dark:bg-surface-800/60 border border-surface-200/60 dark:border-surface-700/60 text-xs">
                <div>
                  <span className="text-surface-500 block">Planned Load</span>
                  <span className="font-bold text-surface-900 dark:text-surface-100">
                    {dateSummary.estimatedMinutes} mins ({(dateSummary.estimatedMinutes / 60).toFixed(1)}h)
                  </span>
                </div>
                <div>
                  <span className="text-surface-500 block">Actual Logged</span>
                  <span className="font-bold text-brand-600 dark:text-brand-400">
                    {dateSummary.actualMinutes} mins ({(dateSummary.actualMinutes / 60).toFixed(1)}h)
                  </span>
                </div>
              </div>
            )}

            {/* Tasks scheduled on selected date */}
            <div className="space-y-2.5 mt-2">
              <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider">
                Scheduled Tasks ({selectedDateTasks.length})
              </span>

              {selectedDateTasks.length === 0 ? (
                <div className="py-8 text-center text-xs text-surface-500">
                  No tasks scheduled on this date. Click below to plan a task!
                </div>
              ) : (
                <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                  {selectedDateTasks.map((task) => {
                    const isCompleted = task.status === 'Completed';
                    const isOverdue = new Date(task.scheduledDate) < new Date().setHours(0,0,0,0) && !isCompleted;

                    return (
                      <div
                        key={task._id}
                        className={`p-3 rounded-xl border transition-all text-xs ${
                          isCompleted
                            ? 'bg-emerald-500/5 border-emerald-500/20 opacity-80'
                            : 'bg-white dark:bg-surface-900 border-surface-200/80 dark:border-surface-800'
                        } ${isOverdue ? 'border-red-500/40 bg-red-500/5' : ''}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <button
                              onClick={() => handleToggleTaskStatus(task)}
                              className="text-surface-400 hover:text-emerald-500 shrink-0"
                            >
                              {isCompleted ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              ) : (
                                <Circle className="w-4 h-4" />
                              )}
                            </button>
                            <span className={`font-semibold truncate ${
                              isCompleted ? 'line-through text-surface-500' : 'text-surface-900 dark:text-surface-100'
                            }`}>
                              {task.title}
                            </span>
                          </div>

                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            task.priority === 'High' ? 'bg-red-500/10 text-red-600' :
                            task.priority === 'Medium' ? 'bg-amber-500/10 text-amber-600' :
                            'bg-blue-500/10 text-blue-600'
                          }`}>
                            {task.priority}
                          </span>
                        </div>

                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-surface-100 dark:border-surface-800 text-[11px] text-surface-500">
                          <span>Est: {task.estimatedDuration}m</span>

                          {/* Reschedule button */}
                          {reschedulingTask === task._id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="date"
                                value={newDateValue}
                                onChange={(e) => setNewDateValue(e.target.value)}
                                className="px-1.5 py-0.5 text-[10px] rounded border"
                              />
                              <button
                                onClick={() => handleReschedule(task._id)}
                                className="text-brand-600 font-bold hover:underline text-[10px]"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setReschedulingTask(null)}
                                className="text-surface-400 hover:text-surface-600 text-[10px]"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setReschedulingTask(task._id);
                                setNewDateValue(selectedDate);
                              }}
                              className="text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
                            >
                              <span>Reschedule</span>
                              <MoveRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-surface-200/80 dark:border-surface-800">
            <button
              onClick={() => setIsTaskModalOpen(true)}
              className="btn-secondary text-xs w-full py-2.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Schedule New Task for this Date</span>
            </button>
          </div>
        </div>
      </div>

      {/* Task Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        defaultDate={selectedDate}
        onSave={async (values) => {
          await api.post('/tasks', values);
          toast.success('Task scheduled!');
          fetchCalendar();
          fetchDateTasks(selectedDate);
          window.dispatchEvent(new CustomEvent('skilltrack-data-updated'));
        }}
      />
    </div>
  );
}
