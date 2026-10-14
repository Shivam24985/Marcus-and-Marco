import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { 
  CheckSquare, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Circle, 
  Edit3, 
  Trash2, 
  Tag, 
  Timer, 
  Sparkles 
} from 'lucide-react';
import TaskModal from '../components/ui/TaskModal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import { PageLoader } from '../components/ui/LoadingSpinner';
import { useToast } from '../components/ui/Toast';
import { Link } from 'react-router-dom';

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('today'); // 'today' | 'upcoming' | 'overdue' | 'all'
  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [sortBy, setSortBy] = useState('deadline'); // 'deadline' | 'priority' | 'status'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [deleteTaskId, setDeleteTaskId] = useState(null);
  const toast = useToast();

  const fetchTasks = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (activeTab !== 'all') {
        params.append('view', activeTab);
      }
      if (filterPriority) {
        params.append('priority', filterPriority);
      }
      if (sortBy) {
        params.append('sort', sortBy);
      }
      if (search) {
        params.append('search', search);
      }

      const res = await api.get(`/tasks?${params.toString()}&limit=100`);
      setTasks(res.data.tasks || []);
    } catch (err) {
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [activeTab, filterPriority, sortBy, search, toast]);

  useEffect(() => {
    fetchTasks();

    const handleUpdate = () => fetchTasks();
    window.addEventListener('skilltrack-data-updated', handleUpdate);
    return () => window.removeEventListener('skilltrack-data-updated', handleUpdate);
  }, [fetchTasks]);

  const handleToggleTask = async (task) => {
    try {
      const newStatus = task.status === 'Completed' ? 'To Do' : 'Completed';
      await api.put(`/tasks/${task._id}`, { status: newStatus });
      toast.success(newStatus === 'Completed' ? 'Task completed! Goal progress updated.' : 'Task reopened');
      fetchTasks();
      window.dispatchEvent(new CustomEvent('skilltrack-data-updated'));
    } catch (err) {
      toast.error('Failed to update task status');
    }
  };

  const handleSaveTask = async (data) => {
    try {
      if (editingTask) {
        await api.put(`/tasks/${editingTask._id}`, data);
        toast.success('Task updated successfully!');
      } else {
        await api.post('/tasks', data);
        toast.success('Task created successfully!');
      }
      fetchTasks();
      setEditingTask(null);
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
      fetchTasks();
      setDeleteTaskId(null);
      window.dispatchEvent(new CustomEvent('skilltrack-data-updated'));
    } catch (err) {
      toast.error('Failed to delete task');
    }
  };

  const completedCount = tasks.filter(t => t.status === 'Completed').length;
  const totalMinutesSpent = tasks.reduce((sum, t) => sum + (t.actualTimeSpent || 0), 0);

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-surface-900 dark:text-surface-100">
            Daily Task Management
          </h2>
          <p className="text-xs text-surface-500 mt-0.5">
            Organize daily study tasks, execute focused sessions, and keep streak momentum
          </p>
        </div>

        <button
          onClick={() => { setEditingTask(null); setIsModalOpen(true); }}
          className="btn-primary text-xs sm:text-sm py-2 px-4 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Task</span>
        </button>
      </div>

      {/* Daily Summary Banner (when on 'today' tab) */}
      {activeTab === 'today' && (
        <div className="glass-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-emerald-500/10 via-brand-500/5 to-transparent border-emerald-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-surface-900 dark:text-surface-100">
                Today's Execution Summary
              </h3>
              <p className="text-xs text-surface-600 dark:text-surface-400 mt-0.5">
                {tasks.length === 0 ? (
                  'No tasks scheduled for today. Plan your day by adding one!'
                ) : (
                  <>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {completedCount} of {tasks.length} tasks completed
                    </span>{' '}
                    ({Math.round((completedCount / tasks.length) * 100)}%) • {totalMinutesSpent} mins logged
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="w-full sm:w-48 h-2.5 rounded-full bg-surface-200 dark:bg-surface-700 overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Tabs Row */}
      <div className="flex items-center gap-2 border-b border-surface-200 dark:border-surface-800 pb-2 overflow-x-auto">
        {[
          { id: 'today', label: "Today's Tasks" },
          { id: 'upcoming', label: 'Upcoming' },
          { id: 'overdue', label: 'Overdue' },
          { id: 'all', label: 'All Tasks' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all shrink-0 ${
              activeTab === tab.id
                ? 'bg-brand-600 text-white shadow-xs'
                : 'text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search & Filter Bar */}
      <div className="glass-card p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-surface-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9 py-2 text-xs"
          />
        </div>

        {/* Priority Filter */}
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="input-field py-2 text-xs w-auto"
        >
          <option value="">All Priorities</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="input-field py-2 text-xs w-auto"
        >
          <option value="deadline">Sort by Deadline</option>
          <option value="priority">Sort by Priority</option>
          <option value="status">Sort by Status</option>
        </select>
      </div>

      {/* Tasks List */}
      {tasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title={
            activeTab === 'overdue' 
              ? 'No overdue tasks 🎉' 
              : activeTab === 'today'
              ? 'No tasks scheduled for today'
              : 'No tasks found'
          }
          description={
            activeTab === 'overdue'
              ? 'You are completely caught up with your study schedules. Great job!'
              : 'Add tasks to organize your study hours and stay accountable.'
          }
          action={
            <button
              onClick={() => { setEditingTask(null); setIsModalOpen(true); }}
              className="btn-primary text-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Create Task</span>
            </button>
          }
        />
      ) : (
        <div className="space-y-2.5">
          {tasks.map((task) => {
            const isCompleted = task.status === 'Completed';
            const scheduledDate = new Date(task.scheduledDate);
            const isOverdue = scheduledDate < new Date().setHours(0,0,0,0) && !isCompleted;

            return (
              <div
                key={task._id}
                className={`glass-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-surface-400 dark:hover:border-surface-600 transition-all ${
                  isCompleted ? 'opacity-70 bg-surface-50/50 dark:bg-surface-900/50' : ''
                } ${isOverdue ? 'border-red-500/40 bg-red-500/5' : ''}`}
              >
                {/* Left: Checkbox + details */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
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

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-semibold ${
                        isCompleted ? 'line-through text-surface-400' : 'text-surface-900 dark:text-surface-100'
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
                      <p className="text-xs text-surface-500 mt-1 line-clamp-2">
                        {task.description}
                      </p>
                    )}

                    {/* Metadata row */}
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-surface-500 flex-wrap">
                      <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-500 font-bold' : ''}`}>
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{scheduledDate.toLocaleDateString()}</span>
                        {isOverdue && ' (Overdue)'}
                      </span>

                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Est: {task.estimatedDuration}m</span>
                      </span>

                      {task.actualTimeSpent > 0 && (
                        <span className="font-semibold text-brand-600 dark:text-brand-400">
                          Spent: {task.actualTimeSpent}m
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Badges and actions */}
                <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-surface-200/60 dark:border-surface-800/60">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    task.priority === 'High' ? 'bg-red-500/10 text-red-600 dark:text-red-400' :
                    task.priority === 'Medium' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                    'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                  }`}>
                    {task.priority}
                  </span>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    task.status === 'Completed' ? 'badge-success' :
                    task.status === 'In Progress' ? 'badge-info' : 'badge-neutral'
                  }`}>
                    {task.status}
                  </span>

                  {/* Start Timer Link */}
                  <Link
                    to={`/timer?taskId=${task._id}${task.goal ? `&goalId=${task.goal._id}` : ''}`}
                    className="p-1.5 text-surface-500 hover:text-brand-600 rounded-lg transition-colors"
                    title="Start Timer with this task"
                  >
                    <Timer className="w-4 h-4" />
                  </Link>

                  <button
                    onClick={() => { setEditingTask(task); setIsModalOpen(true); }}
                    className="p-1.5 text-surface-500 hover:text-surface-900 dark:hover:text-surface-100 rounded-lg transition-colors"
                    title="Edit Task"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

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

      {/* Task Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingTask(null); }}
        onSave={handleSaveTask}
        initialData={editingTask}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTaskId}
        onClose={() => setDeleteTaskId(null)}
        onConfirm={handleDeleteTask}
        title="Delete Task"
        message="Are you sure you want to delete this task? This cannot be undone."
      />
    </div>
  );
}
