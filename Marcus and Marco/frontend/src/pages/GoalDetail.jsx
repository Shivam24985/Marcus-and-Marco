import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import { 
  ArrowLeft, 
  Target, 
  Plus, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  Circle, 
  Edit3, 
  Trash2, 
  Timer, 
  RotateCw,
  AlertTriangle
} from 'lucide-react';
import TaskModal from '../components/ui/TaskModal';
import GoalModal from '../components/ui/GoalModal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { PageLoader } from '../components/ui/LoadingSpinner';
import { useToast } from '../components/ui/Toast';

export default function GoalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [goal, setGoal] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const fetchGoalData = useCallback(async () => {
    try {
      const res = await api.get(`/goals/${id}`);
      setGoal(res.data.goal);
      setTasks(res.data.tasks || []);
    } catch (err) {
      toast.error('Failed to load goal details');
      navigate('/goals');
    } finally {
      setLoading(false);
    }
  }, [id, navigate, toast]);

  useEffect(() => {
    fetchGoalData();
  }, [fetchGoalData]);

  const handleToggleTaskStatus = async (task) => {
    try {
      const newStatus = task.status === 'Completed' ? 'To Do' : 'Completed';
      await api.put(`/tasks/${task._id}`, { status: newStatus });
      toast.success(newStatus === 'Completed' ? 'Task completed!' : 'Task marked as To Do');
      fetchGoalData();
    } catch (err) {
      toast.error('Failed to update task');
    }
  };

  const handleRecalculate = async () => {
    try {
      const res = await api.put(`/goals/${id}/recalculate`);
      setGoal(res.data.goal);
      toast.success('Goal progress recalculated!');
    } catch (err) {
      toast.error('Failed to recalculate');
    }
  };

  const handleDeleteGoal = async () => {
    try {
      await api.delete(`/goals/${id}`);
      toast.success('Goal deleted');
      navigate('/goals');
    } catch (err) {
      toast.error('Failed to delete goal');
    }
  };

  const handleSaveTask = async (data) => {
    try {
      if (editingTask) {
        await api.put(`/tasks/${editingTask._id}`, data);
        toast.success('Task updated!');
      } else {
        await api.post('/tasks', { ...data, goal: id });
        toast.success('Task created!');
      }
      fetchGoalData();
      setEditingTask(null);
    } catch (err) {
      toast.error('Failed to save task');
      throw err;
    }
  };

  if (loading) return <PageLoader />;
  if (!goal) return null;

  const completedTasks = tasks.filter(t => t.status === 'Completed');
  const pendingTasks = tasks.filter(t => t.status !== 'Completed');
  const isOverdue = new Date(goal.targetDate) < new Date() && goal.status !== 'Completed';

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/goals"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-surface-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Goals</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRecalculate}
            className="btn-secondary text-xs py-1.5 px-3"
            title="Recalculate progress from completed tasks"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Recalculate</span>
          </button>
          <button
            onClick={() => setIsGoalModalOpen(true)}
            className="btn-secondary text-xs py-1.5 px-3"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button>
          <button
            onClick={() => setIsConfirmDeleteOpen(true)}
            className="btn-danger text-xs py-1.5 px-3"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Goal Header Card */}
      <div 
        className="glass-card p-6 md:p-8 space-y-6"
        style={{ borderTop: `6px solid ${goal.color || '#6366f1'}` }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span
                className="px-2.5 py-0.5 rounded-md text-xs font-bold"
                style={{ backgroundColor: `${goal.color || '#6366f1'}20`, color: goal.color || '#6366f1' }}
              >
                {goal.subject}
              </span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                goal.priority === 'High' ? 'bg-red-500/10 text-red-600 dark:text-red-400' :
                goal.priority === 'Medium' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                'bg-blue-500/10 text-blue-600 dark:text-blue-400'
              }`}>
                {goal.priority} Priority
              </span>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md ${
                goal.status === 'Completed' ? 'badge-success' :
                goal.status === 'In Progress' ? 'badge-info' :
                goal.status === 'Paused' ? 'badge-warning' : 'badge-neutral'
              }`}>
                {goal.status}
              </span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-surface-900 dark:text-surface-100">
              {goal.title}
            </h1>
            {goal.description && (
              <p className="text-sm text-surface-600 dark:text-surface-400 mt-2 max-w-2xl leading-relaxed">
                {goal.description}
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end gap-2 shrink-0">
            <Link
              to={`/timer?goalId=${goal._id}`}
              className="btn-primary text-xs py-2 px-4 w-full sm:w-auto"
            >
              <Timer className="w-4 h-4" />
              <span>Study Session Timer</span>
            </Link>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-surface-600 dark:text-surface-400">Milestone Progress</span>
            <span className="text-surface-900 dark:text-surface-100 text-sm">{goal.progress}%</span>
          </div>
          <div className="w-full h-3 rounded-full bg-surface-200 dark:bg-surface-700 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${goal.progress}%`,
                backgroundColor: goal.color || '#6366f1'
              }}
            />
          </div>
        </div>

        {/* Goal Meta Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-surface-200/80 dark:border-surface-800 text-xs">
          <div>
            <span className="text-surface-500 block">Start Date</span>
            <span className="font-semibold text-surface-900 dark:text-surface-100">
              {new Date(goal.startDate).toLocaleDateString()}
            </span>
          </div>
          <div>
            <span className="text-surface-500 block">Target Deadline</span>
            <span className={`font-semibold ${isOverdue ? 'text-red-500 font-bold' : 'text-surface-900 dark:text-surface-100'}`}>
              {new Date(goal.targetDate).toLocaleDateString()}
              {isOverdue && ' (Overdue)'}
            </span>
          </div>
          <div>
            <span className="text-surface-500 block">Study Time Spent</span>
            <span className="font-semibold text-surface-900 dark:text-surface-100">
              {goal.currentStudyHours || 0} / {goal.targetStudyHours} hrs
            </span>
          </div>
          <div>
            <span className="text-surface-500 block">Tasks Completed</span>
            <span className="font-semibold text-surface-900 dark:text-surface-100">
              {completedTasks.length} / {tasks.length}
            </span>
          </div>
        </div>
      </div>

      {/* Related Tasks Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight text-surface-900 dark:text-surface-100 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-brand-600" />
            <span>Associated Tasks ({tasks.length})</span>
          </h2>

          <button
            onClick={() => { setEditingTask(null); setIsTaskModalOpen(true); }}
            className="btn-primary text-xs py-2 px-3"
          >
            <Plus className="w-4 h-4" />
            <span>Add Task for this Goal</span>
          </button>
        </div>

        {tasks.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <p className="text-xs text-surface-500 mb-3">
              No tasks have been associated with this goal yet. Add tasks to break down your goal into actionable daily milestones!
            </p>
            <button
              onClick={() => { setEditingTask(null); setIsTaskModalOpen(true); }}
              className="btn-secondary text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create First Task</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => {
              const isCompleted = task.status === 'Completed';
              return (
                <div
                  key={task._id}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                    isCompleted
                      ? 'bg-emerald-500/5 border-emerald-500/20 opacity-80'
                      : 'bg-white dark:bg-surface-900 border-surface-200 dark:border-surface-800'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0 mr-4">
                    <button
                      onClick={() => handleToggleTaskStatus(task)}
                      className="text-surface-400 hover:text-emerald-500 shrink-0 transition-colors"
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                    </button>

                    <div className="min-w-0">
                      <p className={`text-sm font-semibold truncate ${
                        isCompleted ? 'line-through text-surface-500' : 'text-surface-900 dark:text-surface-100'
                      }`}>
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-surface-500">
                        <span>Due {new Date(task.scheduledDate).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>Est: {task.estimatedDuration}m</span>
                        {task.actualTimeSpent > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-brand-600 dark:text-brand-400 font-medium">
                              Spent: {task.actualTimeSpent}m
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      task.priority === 'High' ? 'bg-red-500/10 text-red-600 dark:text-red-400' :
                      task.priority === 'Medium' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                      'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                    }`}>
                      {task.priority}
                    </span>

                    <button
                      onClick={() => { setEditingTask(task); setIsTaskModalOpen(true); }}
                      className="p-1.5 text-surface-400 hover:text-surface-800 dark:hover:text-surface-200 rounded-lg"
                      title="Edit Task"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Goal Modal */}
      <GoalModal
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
        initialData={goal}
        onSave={async (values) => {
          const res = await api.put(`/goals/${id}`, values);
          setGoal(res.data.goal);
          toast.success('Goal updated!');
        }}
      />

      {/* Add / Edit Task Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => { setIsTaskModalOpen(false); setEditingTask(null); }}
        initialData={editingTask}
        defaultGoalId={id}
        onSave={handleSaveTask}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={isConfirmDeleteOpen}
        onClose={() => setIsConfirmDeleteOpen(false)}
        onConfirm={handleDeleteGoal}
        title="Delete Learning Goal"
        message="Are you sure you want to delete this goal and all its associated tasks?"
      />
    </div>
  );
}
