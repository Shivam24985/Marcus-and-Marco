import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import { BookOpen, Lock, Mail, User, ArrowRight, Clock, Tag } from 'lucide-react';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  dailyStudyTarget: z.coerce.number().min(1, 'Target must be at least 1 hr').max(24).default(3),
});

const POPULAR_SKILLS = ['JavaScript', 'React', 'Python', 'DSA', 'AI/ML', 'Node.js', 'System Design'];

export default function Register() {
  const { register: registerAuth } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedSkills, setSelectedSkills] = useState(['React', 'JavaScript']);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      dailyStudyTarget: 3,
    }
  });

  const toggleSkill = (skill) => {
    setSelectedSkills(prev => 
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  };

  const onSubmit = async (values) => {
    try {
      setLoading(true);
      setError('');
      await registerAuth(values.name, values.email, values.password);
      toast.success('Account created! Welcome to Marcus.');
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-surface-50 dark:bg-surface-950 py-12">
      <div className="w-full max-w-md">
        {/* Logo and header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white shadow-lg shadow-brand-500/25 mb-4 animate-scale-in">
            <BookOpen className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-surface-900 dark:text-surface-100">
            Create your Marcus & Marco account
          </h1>
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
            New Version of Shivam • Build discipline, master skills, and achieve your learning targets
          </p>
        </div>

        {/* Card */}
        <div className="glass-card p-6 sm:p-8 animate-fade-in">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider mb-1.5">
                Full Name *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-surface-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  {...register('name')}
                  placeholder="e.g. Jordan Lee"
                  className="input-field pl-10"
                />
              </div>
              {errors.name && (
                <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider mb-1.5">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-surface-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  {...register('email')}
                  placeholder="jordan@example.com"
                  className="input-field pl-10"
                />
              </div>
              {errors.email && (
                <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider mb-1.5">
                Password *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-surface-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  {...register('password')}
                  placeholder="Minimum 6 characters"
                  className="input-field pl-10"
                />
              </div>
              {errors.password && (
                <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>
              )}
            </div>

            {/* Daily study target */}
            <div>
              <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider mb-1.5">
                Daily Study Target (Hours)
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-surface-400 absolute left-3.5 top-3.5" />
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="24"
                  {...register('dailyStudyTarget')}
                  className="input-field pl-10"
                />
              </div>
            </div>

            {/* Topics of interest tags */}
            <div>
              <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider mb-1.5">
                Skills you want to master
              </label>
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_SKILLS.map((skill) => {
                  const isSelected = selectedSkills.includes(skill);
                  return (
                    <button
                      type="button"
                      key={skill}
                      onClick={() => toggleSkill(skill)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                        isSelected
                          ? 'bg-brand-500/10 border-brand-500/40 text-brand-700 dark:text-brand-300 font-semibold'
                          : 'bg-surface-100 dark:bg-surface-800 border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400'
                      }`}
                    >
                      {skill}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 text-sm font-semibold mt-4"
            >
              {loading ? 'Creating Account...' : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-surface-500 dark:text-surface-400 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand-600 dark:text-brand-400 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
