import { Menu, Sun, Moon, Flame, Target, CheckSquare, Plus } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

export default function Header({ onMenuClick, onQuickAddGoal, onQuickAddTask, title = 'Marcus & Marco' }) {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-8 border-b bg-white/80 dark:bg-surface-900/80 backdrop-blur-md border-surface-200/80 dark:border-surface-800 transition-colors">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="p-2 -ml-2 rounded-xl text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 lg:hidden focus:outline-none"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg md:text-xl font-bold tracking-tight text-surface-900 dark:text-surface-100">
            {title}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        {/* Streak indicator badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-semibold shadow-xs">
          <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
          <span className="hidden sm:inline">Streak:</span>
          <span className="font-bold">{user?.streak?.current || 0}d</span>
        </div>

        {/* Quick Add Dropdown or Action Buttons */}
        <div className="hidden sm:flex items-center gap-1.5">
          <button
            onClick={onQuickAddGoal}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/50 dark:hover:bg-brand-900/50 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800/80 transition-all shadow-xs"
          >
            <Target className="w-3.5 h-3.5" />
            <span>New Goal</span>
          </button>
          <button
            onClick={onQuickAddTask}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl bg-brand-600 hover:bg-brand-700 text-white transition-all shadow-sm shadow-brand-600/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Task</span>
          </button>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 border border-surface-200/80 dark:border-surface-800 transition-colors shadow-xs"
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-surface-600" />
          )}
        </button>

        {/* User initials bubble */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-500 text-white text-xs font-bold flex items-center justify-center shadow-xs">
          {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
        </div>
      </div>
    </header>
  );
}
