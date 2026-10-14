import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import GoalModal from '../ui/GoalModal';
import TaskModal from '../ui/TaskModal';
import api from '../../api/axios';
import { useToast } from '../ui/Toast';

const pageTitles = {
  '/dashboard': 'Student Dashboard',
  '/notebook': 'Daily Learning Notebook',
  '/goals': 'Learning Goals',
  '/tasks': 'Daily Tasks',
  '/timer': 'Study Session Timer',
  '/calendar': 'Study Planner & Calendar',
  '/progress': 'Progress & Analytics',
  '/settings': 'Account Settings',
};

export default function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const location = useLocation();
  const toast = useToast();

  const currentTitle = pageTitles[location.pathname] || 
    (location.pathname.startsWith('/goals/') ? 'Goal Details' : 'Marcus & Marco');

  const handleCreateGoal = async (data) => {
    try {
      await api.post('/goals', data);
      toast.success('Goal created successfully!');
      window.dispatchEvent(new CustomEvent('skilltrack-data-updated'));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create goal');
      throw err;
    }
  };

  const handleCreateTask = async (data) => {
    try {
      await api.post('/tasks', data);
      toast.success('Task created successfully!');
      window.dispatchEvent(new CustomEvent('skilltrack-data-updated'));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create task');
      throw err;
    }
  };

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 text-surface-900 dark:text-surface-100 flex transition-colors">
      {/* Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        onQuickAddGoal={() => setIsGoalModalOpen(true)}
        onQuickAddTask={() => setIsTaskModalOpen(true)}
      />

      {/* Main Content Area */}
      <div 
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          isSidebarOpen ? 'lg:pl-64' : 'lg:pl-20'
        }`}
      >
        <Header
          title={currentTitle}
          onMenuClick={() => setIsSidebarOpen(true)}
          onQuickAddGoal={() => setIsGoalModalOpen(true)}
          onQuickAddTask={() => setIsTaskModalOpen(true)}
        />

        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>

      {/* Global Quick Add Modals */}
      <GoalModal
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
        onSave={handleCreateGoal}
      />

      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSave={handleCreateTask}
      />
    </div>
  );
}
