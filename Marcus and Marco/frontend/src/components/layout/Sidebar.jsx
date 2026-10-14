import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Target, 
  CheckSquare, 
  Timer, 
  Calendar, 
  TrendingUp, 
  Settings, 
  LogOut, 
  ChevronLeft, 
  ChevronRight,
  Flame,
  BookOpen,
  BookMarked,
  Plus
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Daily Notebook', href: '/notebook', icon: BookMarked },
  { name: 'Goals', href: '/goals', icon: Target },
  { name: 'Tasks', href: '/tasks', icon: CheckSquare },
  { name: 'Study Timer', href: '/timer', icon: Timer },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Progress & Analytics', href: '/progress', icon: TrendingUp },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar({ isOpen, setIsOpen, onQuickAddGoal, onQuickAddTask }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar container */}
      <aside 
        className={`fixed top-0 bottom-0 left-0 z-40 flex flex-col transition-all duration-300 ease-in-out border-r
          bg-white/95 dark:bg-surface-900/95 backdrop-blur-md border-surface-200 dark:border-surface-800
          ${isOpen ? 'w-64' : 'w-20'} 
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Brand header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-surface-200/80 dark:border-surface-800">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            {isOpen && (
              <div className="flex flex-col truncate">
                <span className="font-bold text-base tracking-tight bg-gradient-to-r from-surface-900 to-surface-700 dark:from-white dark:to-surface-300 bg-clip-text text-transparent">
                  Marcus & Marco
                </span>
                <span className="text-[10px] font-semibold text-brand-600 dark:text-brand-400 tracking-wider">
                  New Version of Shivam
                </span>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg text-surface-500 hover:text-surface-800 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
            title={isOpen ? "Collapse Sidebar" : "Expand Sidebar"}
          >
            {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {/* Quick action buttons */}
        {isOpen ? (
          <div className="px-3 pt-4 pb-2 grid grid-cols-2 gap-2">
            <button
              onClick={onQuickAddGoal}
              className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/40 dark:hover:bg-brand-900/40 text-brand-700 dark:text-brand-300 text-xs font-semibold border border-brand-200/60 dark:border-brand-800/60 transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Goal</span>
            </button>
            <button
              onClick={onQuickAddTask}
              className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-surface-100 hover:bg-surface-200/80 dark:bg-surface-800 dark:hover:bg-surface-700 text-surface-800 dark:text-surface-200 text-xs font-semibold border border-surface-200 dark:border-surface-700 transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Task</span>
            </button>
          </div>
        ) : (
          <div className="px-2 pt-3 pb-1 flex flex-col gap-2 items-center">
            <button
              onClick={onQuickAddTask}
              className="w-10 h-10 rounded-xl bg-brand-500 hover:bg-brand-600 text-white flex items-center justify-center shadow-sm"
              title="Quick Add Task"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Navigation list */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/30 font-semibold'
                    : 'text-surface-600 hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-100 hover:bg-surface-100 dark:hover:bg-surface-800/70'
                } ${!isOpen ? 'justify-center px-0' : ''}`
              }
              title={!isOpen ? item.name : undefined}
            >
              <item.icon className="w-5 h-5 shrink-0 transition-transform group-hover:scale-105" />
              {isOpen && <span className="truncate">{item.name}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Streak & User Profile Box */}
        <div className="p-3 border-t border-surface-200/80 dark:border-surface-800 space-y-2">
          {isOpen && user?.streak?.current > 0 && (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-500 fill-amber-500 animate-pulse" />
                <span className="text-xs font-semibold">Active Streak</span>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-500/20">
                {user?.streak?.current || 0} {user?.streak?.current === 1 ? 'day' : 'days'}
              </span>
            </div>
          )}

          <div className={`flex items-center ${isOpen ? 'justify-between' : 'justify-center'} p-2 rounded-xl bg-surface-100/70 dark:bg-surface-800/50`}>
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-500 to-purple-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'S'}
              </div>
              {isOpen && (
                <div className="flex flex-col truncate">
                  <span className="text-xs font-semibold text-surface-900 dark:text-surface-100 truncate">
                    {user?.name || 'Student'}
                  </span>
                  <span className="text-[10px] text-surface-500 dark:text-surface-400 truncate">
                    {user?.email || ''}
                  </span>
                </div>
              )}
            </div>

            {isOpen && (
              <button
                onClick={handleLogout}
                className="p-1.5 text-surface-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-white dark:hover:bg-surface-700 rounded-lg transition-colors"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
