import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { 
  Target, 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  PauseCircle, 
  PlayCircle, 
  MoreVertical, 
  Trash2, 
  Edit3,
  ExternalLink
} from 'lucide-react';
import GoalModal from '../components/ui/GoalModal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import { PageLoader } from '../components/ui/LoadingSpinner';
import { useToast } from '../components/ui/Toast';

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterSubject, setFilterSubject] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [deleteGoalId, setDeleteGoalId] = useState(null);
  const toast = useToast();
  const navigate = useNavigate();

  const fetchGoals = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);
      if (filterPriority) params.append('priority', filterPriority);
      if (filterSubject) params.append('subject', filterSubject);

      const res = await api.get(`/goals?${params.toString()}`);
      setGoals(res.data.goals || []);
    } catch (err) {
      toast.error('Failed to load goals');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterPriority, filterSubject, toast]);

  useEffect(() => {
    fetchGoals();

    const handleUpdate = () => fetchGoals();
    window.addEventListener('skilltrack-data-updated', handleUpdate);
    return () => window.removeEventListener('skilltrack-data-updated', handleUpdate);
  }, [fetchGoals]);

  const handleSaveGoal = async (data) => {
    try {
      if (editingGoal) {
        await api.put(`/goals/${editingGoal._id}`, data);
        toast.success('Goal updated successfully!');
      } else {
        await api.post('/goals', data);
        toast.success('Goal created successfully!');
      }
      fetchGoals();
      setEditingGoal(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save goal');
      throw err;
    }
  };

  const handleDeleteGoal = async () => {
    if (!deleteGoalId) return;
    try {
      await api.delete(`/goals/${deleteGoalId}`);
      toast.success('Goal and associated tasks deleted');
      fetchGoals();
      setDeleteGoalId(null);
    } catch (err) {
      toast.error('Failed to delete goal');
    }
  };

  const handleStatusToggle = async (goal, newStatus) => {
    try {
      await api.put(`/goals/${goal._id}`, { status: newStatus });
      toast.success(`Goal marked as ${newStatus}`);
      fetchGoals();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const filteredGoals = goals.filter(g => 
    search === '' || 
    g.title.toLowerCase().includes(search.toLowerCase()) || 
    g.subject.toLowerCase().includes(search.toLowerCase())
  );

  const subjects = Array.from(new Set(goals.map(g => g.subject)));

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-surface-900 dark:text-surface-100">
            Learning Goals
          </h2>
          <p className="text-xs text-surface-500 mt-0.5">
            Set deliberate milestones, track required study hours, and monitor syllabus completion
          </p>
        </div>

        <button
          onClick={() => { setEditingGoal(null); setIsModalOpen(true); }}
          className="btn-primary text-xs sm:text-sm py-2 px-4 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Goal</span>
        </button>
      </div>

      {/* Filter and Search Row */}
      <div className="glass-card p-4 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-surface-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search goals or skills..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9 py-2 text-xs"
          />
        </div>

        {/* Filter: Status */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="input-field py-2 text-xs w-auto"
        >
          <option value="">All Statuses</option>
          <option value="In Progress">In Progress</option>
          <option value="Not Started">Not Started</option>
          <option value="Completed">Completed</option>
          <option value="Paused">Paused</option>
        </select>

        {/* Filter: Priority */}
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="input-field py-2 text-xs w-auto"
        >
          <option value="">All Priorities</option>
          <option value="High">High Priority</option>
          <option value="Medium">Medium Priority</option>
          <option value="Low">Low Priority</option>
        </select>

        {/* Filter: Subject */}
        {subjects.length > 0 && (
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="input-field py-2 text-xs w-auto"
          >
            <option value="">All Subjects</option>
            {subjects.map(sub => (
              <option key={sub} value={sub}>{sub}</option>
            ))}
          </select>
        )}
      </div>

      {/* Goals Grid */}
      {filteredGoals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No learning goals found"
          description={
            goals.length === 0
              ? "You haven't defined any learning goals yet. Create your first goal to start tracking progress!"
              : "No goals match your current search and filter criteria."
          }
          action={
            <button
              onClick={() => { setEditingGoal(null); setIsModalOpen(true); }}
              className="btn-primary text-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Create Goal</span>
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredGoals.map((goal) => {
            const isOverdue = new Date(goal.targetDate) < new Date() && goal.status !== 'Completed';
            const daysLeft = Math.ceil((new Date(goal.targetDate) - new Date()) / (1000 * 60 * 60 * 24));

            return (
              <div
                key={goal._id}
                className="glass-card p-5 flex flex-col justify-between hover:border-brand-500/40 transition-all duration-200 relative group"
                style={{ borderTop: `4px solid ${goal.color || '#6366f1'}` }}
              >
                <div>
                  {/* Top tags */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span 
                      className="px-2 py-0.5 rounded-md text-[11px] font-bold tracking-wide"
                      style={{ backgroundColor: `${goal.color || '#6366f1'}15`, color: goal.color || '#6366f1' }}
                    >
                      {goal.subject}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        goal.priority === 'High' ? 'bg-red-500/10 text-red-600 dark:text-red-400' :
                        goal.priority === 'Medium' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                        'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                      }`}>
                        {goal.priority}
                      </span>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        goal.status === 'Completed' ? 'badge-success' :
                        goal.status === 'In Progress' ? 'badge-info' :
                        goal.status === 'Paused' ? 'badge-warning' : 'badge-neutral'
                      }`}>
                        {goal.status}
                      </span>
                    </div>
                  </div>

                  {/* Goal Title & Description */}
                  <Link
                    to={`/goals/${goal._id}`}
                    className="block group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors"
                  >
                    <h3 className="font-bold text-base text-surface-900 dark:text-surface-100 line-clamp-1">
                      {goal.title}
                    </h3>
                  </Link>

                  {goal.description && (
                    <p className="text-xs text-surface-500 dark:text-surface-400 mt-1 line-clamp-2 leading-relaxed">
                      {goal.description}
                    </p>
                  )}

                  {/* Overdue Warning */}
                  {isOverdue && (
                    <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-500/10 p-2 rounded-lg">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Target date passed ({Math.abs(daysLeft)} days overdue)</span>
                    </div>
                  )}
                </div>

                {/* Progress bar and metrics */}
                <div className="mt-5 pt-4 border-t border-surface-200/80 dark:border-surface-800 space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold mb-1">
                      <span className="text-surface-600 dark:text-surface-400">Progress</span>
                      <span className="text-surface-900 dark:text-surface-100">{goal.progress}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-surface-200 dark:bg-surface-700 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${goal.progress}%`,
                          backgroundColor: goal.color || '#6366f1'
                        }}
                      />
                    </div>
                  </div>

                  {/* Hours and dates */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-surface-500">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{goal.currentStudyHours || 0} / {goal.targetStudyHours} hrs</span>
                    </div>
                    <div className="flex items-center gap-1.5 justify-end">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>
                        {daysLeft > 0 ? `${daysLeft}d left` : isOverdue ? 'Overdue' : 'Due today'}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2">
                    <Link
                      to={`/goals/${goal._id}`}
                      className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
                    >
                      <span>View Tasks</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>

                    <div className="flex items-center gap-1">
                      {goal.status === 'In Progress' ? (
                        <button
                          onClick={() => handleStatusToggle(goal, 'Paused')}
                          className="p-1.5 text-surface-500 hover:text-amber-600 rounded-lg transition-colors"
                          title="Pause Goal"
                        >
                          <PauseCircle className="w-4 h-4" />
                        </button>
                      ) : goal.status === 'Paused' ? (
                        <button
                          onClick={() => handleStatusToggle(goal, 'In Progress')}
                          className="p-1.5 text-surface-500 hover:text-emerald-600 rounded-lg transition-colors"
                          title="Resume Goal"
                        >
                          <PlayCircle className="w-4 h-4" />
                        </button>
                      ) : null}

                      <button
                        onClick={() => { setEditingGoal(goal); setIsModalOpen(true); }}
                        className="p-1.5 text-surface-500 hover:text-surface-900 dark:hover:text-surface-100 rounded-lg transition-colors"
                        title="Edit Goal"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setDeleteGoalId(goal._id)}
                        className="p-1.5 text-surface-500 hover:text-red-600 rounded-lg transition-colors"
                        title="Delete Goal"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Goal Modal */}
      <GoalModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingGoal(null); }}
        onSave={handleSaveGoal}
        initialData={editingGoal}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={!!deleteGoalId}
        onClose={() => setDeleteGoalId(null)}
        onConfirm={handleDeleteGoal}
        title="Delete Learning Goal"
        message="Are you sure you want to delete this goal? All associated tasks will also be deleted. This action cannot be undone."
      />
    </div>
  );
}
