import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Modal from './Modal';
import { Target, Calendar, Clock, AlertCircle } from 'lucide-react';

const goalSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(100),
  description: z.string().max(500).optional().default(''),
  subject: z.string().min(1, 'Subject is required'),
  startDate: z.string().min(1, 'Start date is required'),
  targetDate: z.string().min(1, 'Target date is required'),
  priority: z.enum(['Low', 'Medium', 'High']),
  targetStudyHours: z.coerce.number().min(0, 'Must be positive').default(10),
  status: z.enum(['Not Started', 'In Progress', 'Completed', 'Paused']).default('Not Started'),
  color: z.string().default('#6366f1'),
});

const DEFAULT_SUBJECTS = ['JavaScript', 'React', 'Python', 'DSA', 'AI/ML', 'Node.js', 'System Design', 'Databases'];
const COLOR_OPTIONS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function GoalModal({ isOpen, onClose, onSave, initialData = null }) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      title: '',
      description: '',
      subject: 'React',
      startDate: new Date().toISOString().split('T')[0],
      targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      priority: 'Medium',
      targetStudyHours: 20,
      status: 'Not Started',
      color: '#6366f1'
    }
  });

  const selectedColor = watch('color');

  useEffect(() => {
    if (initialData) {
      reset({
        title: initialData.title || '',
        description: initialData.description || '',
        subject: initialData.subject || 'React',
        startDate: initialData.startDate ? new Date(initialData.startDate).toISOString().split('T')[0] : '',
        targetDate: initialData.targetDate ? new Date(initialData.targetDate).toISOString().split('T')[0] : '',
        priority: initialData.priority || 'Medium',
        targetStudyHours: initialData.targetStudyHours ?? 10,
        status: initialData.status || 'Not Started',
        color: initialData.color || '#6366f1'
      });
    } else {
      reset({
        title: '',
        description: '',
        subject: 'React',
        startDate: new Date().toISOString().split('T')[0],
        targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        priority: 'Medium',
        targetStudyHours: 20,
        status: 'Not Started',
        color: '#6366f1'
      });
    }
  }, [initialData, reset, isOpen]);

  const onSubmit = async (values) => {
    await onSave(values);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Learning Goal' : 'Create Learning Goal'}
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider mb-1">
            Goal Title *
          </label>
          <input
            {...register('title')}
            placeholder="e.g. Master React & Next.js"
            className="input-field"
          />
          {errors.title && (
            <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.title.message}
            </p>
          )}
        </div>

        {/* Subject & Preset Buttons */}
        <div>
          <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider mb-1">
            Skill / Subject *
          </label>
          <input
            {...register('subject')}
            placeholder="e.g. Python, DSA, React"
            className="input-field mb-2"
          />
          <div className="flex flex-wrap gap-1.5">
            {DEFAULT_SUBJECTS.map((sub) => (
              <button
                type="button"
                key={sub}
                onClick={() => setValue('subject', sub)}
                className="text-[11px] px-2 py-0.5 rounded-lg bg-surface-100 hover:bg-surface-200 dark:bg-surface-800 dark:hover:bg-surface-700 text-surface-600 dark:text-surface-300 transition-colors"
              >
                {sub}
              </button>
            ))}
          </div>
          {errors.subject && (
            <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.subject.message}
            </p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider mb-1">
            Description
          </label>
          <textarea
            {...register('description')}
            rows={2}
            placeholder="What key skills or milestones do you want to achieve?"
            className="input-field resize-none"
          />
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider mb-1">
              Start Date
            </label>
            <input
              type="date"
              {...register('startDate')}
              className="input-field"
            />
            {errors.startDate && (
              <p className="text-xs text-red-500 mt-1">{errors.startDate.message}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider mb-1">
              Target Completion Date *
            </label>
            <input
              type="date"
              {...register('targetDate')}
              className="input-field"
            />
            {errors.targetDate && (
              <p className="text-xs text-red-500 mt-1">{errors.targetDate.message}</p>
            )}
          </div>
        </div>

        {/* Priority & Target Hours */}
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
              Target Study Hours
            </label>
            <input
              type="number"
              step="1"
              min="1"
              {...register('targetStudyHours')}
              className="input-field"
            />
          </div>
        </div>

        {/* Status (if editing) & Color Accent */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider mb-1">
              Status
            </label>
            <select {...register('status')} className="input-field">
              <option value="Not Started">Not Started</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Paused">Paused</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider mb-1">
              Color Tag
            </label>
            <div className="flex items-center gap-2 pt-1.5">
              {COLOR_OPTIONS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setValue('color', c)}
                  style={{ backgroundColor: c }}
                  className={`w-6 h-6 rounded-full transition-transform ${
                    selectedColor === c ? 'scale-125 ring-2 ring-offset-2 ring-brand-500' : 'hover:scale-110 opacity-80'
                  }`}
                  aria-label={`Select color ${c}`}
                />
              ))}
            </div>
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
            {isSubmitting ? 'Saving...' : initialData ? 'Update Goal' : 'Create Goal'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
