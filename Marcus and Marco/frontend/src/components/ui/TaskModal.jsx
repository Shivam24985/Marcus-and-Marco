import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Modal from './Modal';
import api from '../../api/axios';
import { AlertCircle, Clock, Calendar, CheckSquare } from 'lucide-react';

const taskSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(200),
  description: z.string().max(500).optional().default(''),
  goal: z.string().nullable().optional(),
  scheduledDate: z.string().min(1, 'Date is required'),
  estimatedDuration: z.coerce.number().min(1, 'Must be at least 1 minute').default(30),
  priority: z.enum(['Low', 'Medium', 'High']).default('Medium'),
  status: z.enum(['To Do', 'In Progress', 'Completed']).default('To Do'),
});

export default function TaskModal({ isOpen, onClose, onSave, initialData = null, defaultGoalId = null, defaultDate = null }) {
  const [goals, setGoals] = useState([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '',
      goal: defaultGoalId || '',
      scheduledDate: defaultDate || new Date().toISOString().split('T')[0],
      estimatedDuration: 30,
      priority: 'Medium',
      status: 'To Do',
    }
  });

  useEffect(() => {
    if (isOpen) {
      // Fetch available goals for dropdown
      api.get('/goals?limit=100').then((res) => {
        setGoals(res.data.goals || []);
      }).catch((err) => console.error('Failed to load goals for task modal', err));
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialData) {
      reset({
        title: initialData.title || '',
        description: initialData.description || '',
        goal: initialData.goal?._id || initialData.goal || '',
        scheduledDate: initialData.scheduledDate ? new Date(initialData.scheduledDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        estimatedDuration: initialData.estimatedDuration || 30,
        priority: initialData.priority || 'Medium',
        status: initialData.status || 'To Do',
      });
    } else {
      reset({
        title: '',
        description: '',
        goal: defaultGoalId || '',
        scheduledDate: defaultDate || new Date().toISOString().split('T')[0],
        estimatedDuration: 30,
        priority: 'Medium',
        status: 'To Do',
      });
    }
  }, [initialData, defaultGoalId, defaultDate, reset, isOpen]);

  const onSubmit = async (values) => {
    const payload = {
      ...values,
      goal: values.goal === '' ? null : values.goal,
    };
    await onSave(payload);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Daily Task' : 'Add Daily Task'}
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider mb-1">
            Task Title *
          </label>
          <input
            {...register('title')}
            placeholder="e.g. Implement user authentication controller"
            className="input-field"
          />
          {errors.title && (
            <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.title.message}
            </p>
          )}
        </div>

        {/* Learning Goal Association */}
        <div>
          <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider mb-1">
            Associated Goal (Optional)
          </label>
          <select {...register('goal')} className="input-field">
            <option value="">-- No specific goal --</option>
            {goals.map((g) => (
              <option key={g._id} value={g._id}>
                {g.title} ({g.subject})
              </option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider mb-1">
            Description / Checklist Notes
          </label>
          <textarea
            {...register('description')}
            rows={2}
            placeholder="Steps, links or notes for this task..."
            className="input-field resize-none"
          />
        </div>

        {/* Scheduled Date & Duration */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider mb-1">
              Scheduled Date *
            </label>
            <input
              type="date"
              {...register('scheduledDate')}
              className="input-field"
            />
            {errors.scheduledDate && (
              <p className="text-xs text-red-500 mt-1">{errors.scheduledDate.message}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider mb-1">
              Estimated Duration (Mins)
            </label>
            <input
              type="number"
              step="5"
              min="5"
              max="600"
              {...register('estimatedDuration')}
              className="input-field"
            />
            {errors.estimatedDuration && (
              <p className="text-xs text-red-500 mt-1">{errors.estimatedDuration.message}</p>
            )}
          </div>
        </div>

        {/* Priority & Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider mb-1">
              Priority
            </label>
            <select {...register('priority')} className="input-field">
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider mb-1">
              Status
            </label>
            <select {...register('status')} className="input-field">
              <option value="To Do">To Do</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-200 dark:border-surface-800">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary text-sm"
          >
            {isSubmitting ? 'Saving...' : initialData ? 'Update Task' : 'Add Task'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
