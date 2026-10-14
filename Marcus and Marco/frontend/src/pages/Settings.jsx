import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../api/axios';
import { useToast } from '../components/ui/Toast';
import { 
  User, 
  Lock, 
  Clock, 
  Tag, 
  Sun, 
  Moon, 
  Flame, 
  ShieldCheck, 
  Sparkles,
  Save
} from 'lucide-react';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
  dailyStudyTarget: z.coerce.number().min(0.5, 'Minimum 0.5 hr').max(24),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(6, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Confirm password is required'),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const POPULAR_SKILLS = ['JavaScript', 'React', 'Python', 'DSA', 'AI/ML', 'Node.js', 'System Design', 'Databases', 'TypeScript', 'Docker'];

export default function Settings() {
  const { user, updateUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const toast = useToast();

  const [skills, setSkills] = useState(user?.learningPreferences || ['React', 'JavaScript']);
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: profileErrors }
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      dailyStudyTarget: user?.dailyStudyTarget || 3,
    }
  });

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    reset: resetPassword,
    formState: { errors: passwordErrors }
  } = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    }
  });

  const toggleSkill = (skill) => {
    setSkills(prev => 
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  };

  const onUpdateProfile = async (values) => {
    try {
      setProfileLoading(true);
      const res = await api.put('/auth/profile', {
        name: values.name,
        dailyStudyTarget: values.dailyStudyTarget,
        learningPreferences: skills
      });
      updateUser(res.data.user);
      toast.success('Profile preferences updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const onChangePassword = async (values) => {
    try {
      setPasswordLoading(true);
      await api.put('/auth/password', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword
      });
      toast.success('Password changed successfully!');
      resetPassword();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-surface-900 dark:text-surface-100">
          Account & Learning Settings
        </h2>
        <p className="text-xs text-surface-500 mt-0.5">
          Customize your profile, daily target parameters, learning preferences, and security
        </p>
      </div>

      {/* Account Overview Header */}
      <div className="glass-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white font-bold text-2xl flex items-center justify-center shadow-md shadow-brand-500/20 shrink-0">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'S'}
          </div>

          <div>
            <h3 className="text-lg font-bold text-surface-900 dark:text-surface-100">
              {user?.name}
            </h3>
            <p className="text-xs text-surface-500">{user?.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="badge-info text-[10px]">Student Account</span>
              <span className="badge-warning text-[10px] flex items-center gap-1">
                <Flame className="w-3 h-3 fill-amber-500" />
                <span>{user?.streak?.current || 0} Day Streak</span>
              </span>
            </div>
          </div>
        </div>

        {/* Theme button */}
        <button
          onClick={toggleTheme}
          className="btn-secondary text-xs py-2 px-3 self-start sm:self-auto flex items-center gap-2"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-surface-600" />}
          <span>{theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}</span>
        </button>
      </div>

      {/* Profile & Target Form */}
      <div className="glass-card p-6 md:p-8">
        <div className="flex items-center gap-2 mb-6">
          <User className="w-5 h-5 text-brand-600" />
          <h3 className="text-base font-bold text-surface-900 dark:text-surface-100">
            Learning Profile & Daily Target
          </h3>
        </div>

        <form onSubmit={handleSubmitProfile(onUpdateProfile)} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                {...registerProfile('name')}
                className="input-field"
              />
              {profileErrors.name && (
                <p className="text-xs text-red-500 mt-1">{profileErrors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider mb-1.5">
                Daily Study Target (Hours)
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="24"
                {...registerProfile('dailyStudyTarget')}
                className="input-field"
              />
              {profileErrors.dailyStudyTarget && (
                <p className="text-xs text-red-500 mt-1">{profileErrors.dailyStudyTarget.message}</p>
              )}
            </div>
          </div>

          {/* Learning Preferences */}
          <div>
            <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider mb-2">
              Primary Learning Domains
            </label>
            <div className="flex flex-wrap gap-2">
              {POPULAR_SKILLS.map((skill) => {
                const isSelected = skills.includes(skill);
                return (
                  <button
                    type="button"
                    key={skill}
                    onClick={() => toggleSkill(skill)}
                    className={`text-xs px-3 py-1.5 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-brand-500/15 border-brand-500/50 text-brand-700 dark:text-brand-300 font-semibold'
                        : 'bg-surface-100 dark:bg-surface-800 border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400'
                    }`}
                  >
                    {skill}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-surface-200/80 dark:border-surface-800 flex justify-end">
            <button
              type="submit"
              disabled={profileLoading}
              className="btn-primary text-xs py-2.5 px-5 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{profileLoading ? 'Saving...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Change Password Form */}
      <div className="glass-card p-6 md:p-8">
        <div className="flex items-center gap-2 mb-6">
          <Lock className="w-5 h-5 text-purple-600" />
          <h3 className="text-base font-bold text-surface-900 dark:text-surface-100">
            Change Password
          </h3>
        </div>

        <form onSubmit={handleSubmitPassword(onChangePassword)} className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider mb-1.5">
              Current Password
            </label>
            <input
              type="password"
              {...registerPassword('currentPassword')}
              placeholder="••••••••"
              className="input-field"
            />
            {passwordErrors.currentPassword && (
              <p className="text-xs text-red-500 mt-1">{passwordErrors.currentPassword.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider mb-1.5">
              New Password
            </label>
            <input
              type="password"
              {...registerPassword('newPassword')}
              placeholder="Minimum 6 characters"
              className="input-field"
            />
            {passwordErrors.newPassword && (
              <p className="text-xs text-red-500 mt-1">{passwordErrors.newPassword.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider mb-1.5">
              Confirm New Password
            </label>
            <input
              type="password"
              {...registerPassword('confirmPassword')}
              placeholder="Re-enter new password"
              className="input-field"
            />
            {passwordErrors.confirmPassword && (
              <p className="text-xs text-red-500 mt-1">{passwordErrors.confirmPassword.message}</p>
            )}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={passwordLoading}
              className="btn-primary text-xs py-2.5 px-5"
            >
              {passwordLoading ? 'Updating Password...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
